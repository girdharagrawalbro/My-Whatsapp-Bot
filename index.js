require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { MessagingResponse } = require('twilio').twiml;
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID, 
  process.env.TWILIO_AUTH_TOKEN
);
const bodyParser = require('body-parser');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.urlencoded({ extended: false })); // Twilio sends form data
app.use(bodyParser.json());
app.use(cors());

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// User Schema
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Message Schema
const MessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  aiReply: String,
  timestamp: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['replied', 'failed'],
    default: ''
  }
});

const Message = mongoose.model('Message', MessageSchema);

// Scheduled Message Schema
const ScheduledMessageSchema = new mongoose.Schema({
  message: String,
  users: [{ type: String }], // Array of phone numbers
  scheduledTime: Date,
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  },
  timestamp: { type: Date, default: Date.now },
  results: [{
    phone: String,
    status: String,
    error: String
  }]
});

const ScheduledMessage = mongoose.model('ScheduledMessage', ScheduledMessageSchema);

// CSV logger
function logToCSV(phone, message, aiReply) {
  const csvFilePath = path.join(__dirname, 'contacts.csv');
  const timestamp = new Date().toISOString();
  const row = `"${timestamp}","${phone}","${message.replace(/"/g, '""')}","${aiReply.replace(/"/g, '""')}"\n`;
  const header = '"Timestamp","Phone Number","Message","Reply"\n';

  if (!fs.existsSync(csvFilePath)) {
    fs.writeFileSync(csvFilePath, header + row);
    console.log('📄 CSV created and first row written');
  } else {
    fs.appendFileSync(csvFilePath, row);
    console.log(`✅ Data added to CSV: ${phone}`);
  }
}

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function getGeminiReply(chatHistory, newMessage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  let prompt = `
Tum ek political aur social leader ke WhatsApp assistant ho.
Neeche diye gaye pehle ke conversation ko samajhkar, naye message ka samajhdari se Hinglish mein jawab do.

Chat history:
`;

  chatHistory.forEach((msg) => {
    prompt += `User: ${msg.text}\nBot: ${msg.aiReply || '(no reply)'}\n`;
  });

  prompt += `\nNew message: "${newMessage}"\nReply:`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return text.replace(/\*\*/g, '').trim();
  } catch (err) {
    console.error('Gemini Error:', err.message);
    return 'Kuch error aaya AI mein, please thodi der baad try karo.';
  }
}

// WhatsApp webhook endpoint
app.post('/webhook', async (req, res) => {
  const from = req.body.WaId || req.body.From;
  const text = req.body.Body;
  
  console.log('📩 Message received from:', from);
  console.log('📝 Message text:', text);

  const twiml = new MessagingResponse();

  if (!from || !text) {
    return res.type('text/xml').send(twiml.toString());
  }

  try {
    // Normalize phone number (remove non-digit characters)
    const normalizedPhone = from.replace(/\D/g, '');
    
    let user = await User.findOneAndUpdate(
      { phone: normalizedPhone },
      { $set: { lastInteraction: new Date() } },
      { upsert: true, new: true }
    );

    const newMsg = await Message.create({
      user: user._id,
      text,
      status: 'failed'
    });

    const pastMessages = await Message.find({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    let aiReply = '';

    if (text.toLowerCase().includes('address') || text.toLowerCase().includes('location')) {
      aiReply = 'Hamare office yaha hai: 123 Main Road, Raipur, Chhattisgarh.';
    } else if (text.toLowerCase().includes('phone') || text.toLowerCase().includes('contact')) {
      aiReply = 'Aap parshad ji se is number par sampark kar sakte hain: 9876543210.';
    } else if (text.toLowerCase().includes('event') || text.toLowerCase().includes('program')) {
      aiReply = 'Agle samajik karyakram ki jankari ke liye kripya Facebook ya website par check karein.';
    } else {
      aiReply = await getGeminiReply(pastMessages.reverse(), text);
    }

    twiml.message(aiReply);

    await Message.findByIdAndUpdate(newMsg._id, {
      aiReply,
      status: 'replied'
    });

    logToCSV(normalizedPhone, text, aiReply);
  } catch (error) {
    console.error('❌ Error in processing message:', error);
    twiml.message('Kuch error aaya, please thodi der baad try karo.');
  }

  res.type('text/xml').send(twiml.toString());
});

// API to get message history
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('user', 'phone name')
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// API to get scheduled messages
app.get('/api/scheduled-messages', async (req, res) => {
  try {
    const messages = await ScheduledMessage.find().sort({ scheduledTime: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
});

// API to send scheduled messages
app.post('/api/messages/send', async (req, res) => {
  const { message, users, scheduledTime } = req.body;

  if (!message || !users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  try {
    const scheduledMessage = new ScheduledMessage({
      message,
      users,
      scheduledTime: scheduledTime || new Date(),
      status: 'scheduled'
    });

    await scheduledMessage.save();

    const sendMessages = async () => {
      const results = [];
      let allSuccessful = true;

      for (const phone of users) {
        try {
          await twilioClient.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${phone}`
          });
          results.push({ phone, status: 'sent' });
          console.log(`✅ Message sent to ${phone}`);
        } catch (err) {
          console.error(`❌ Error sending to ${phone}:`, err.message);
          results.push({ phone, status: 'failed', error: err.message });
          allSuccessful = false;
        }
      }

      await ScheduledMessage.findByIdAndUpdate(scheduledMessage._id, {
        status: allSuccessful ? 'sent' : 'failed',
        results,
        completedAt: new Date()
      });
    };

    if (scheduledTime && new Date(scheduledTime) > new Date()) {
      const delay = new Date(scheduledTime) - Date.now();
      setTimeout(sendMessages, delay);
      return res.json({ 
        status: 'scheduled', 
        scheduledAt: scheduledTime,
        messageId: scheduledMessage._id 
      });
    }

    await sendMessages();
    const updated = await ScheduledMessage.findById(scheduledMessage._id);
    res.json(updated);
  } catch (error) {
    console.error('Error scheduling messages:', error);
    res.status(500).json({ error: 'Failed to schedule messages' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});