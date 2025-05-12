require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const axios = require('axios')
const bodyParser = require('body-parser')
const cors = require('cors')
const { GoogleGenerativeAI } = require('@google/generative-ai')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(bodyParser.json())
app.use(cors())

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err))

// User Schema
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now }
})

const User = mongoose.model('User', UserSchema)

// Message Schema
const MessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  aiReply: String,
  timestamp: { type: Date, default: Date.now }
})

const Message = mongoose.model('Message', MessageSchema)

// CSV logger
function logToCSV (phone, message, aiReply) {
  const csvFilePath = path.join(__dirname, 'contacts.csv')
  const timestamp = new Date().toISOString()
  const row = `"${timestamp}","${phone}","${message.replace(
    /"/g,
    '""'
  )}","${aiReply}"\n`

  const fileExists = fs.existsSync(csvFilePath)
  const header = `"Timestamp","Phone Number","Message", "Reply"\n`

  if (!fileExists) {
    fs.writeFileSync(csvFilePath, header + row)
    console.log('📄 CSV created and first row written')
  } else {
    fs.appendFileSync(csvFilePath, row)
    console.log(`✅ Data added to CSV: ${phone} - ${message}`)
  }
}

// Gemini AI setup
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function getGeminiReply (chatHistory, newMessage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  let prompt = `
Tum ek political aur social leader ke WhatsApp assistant ho.
Neeche diye gaye pehle ke conversation ko samajhkar, naye message ka samajhdari se Hinglish mein jawab do.

Chat history:
`

  chatHistory.forEach((msg, index) => {
    prompt += `User: ${msg.text}\nBot: ${msg.aiReply || '(no reply)'}\n`
  })

  prompt += `\nNew message: "${newMessage}"\nReply:`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    return text.replace(/\*\*/g, '').trim()
  } catch (err) {
    console.error('Gemini Error:', err.message)
    return 'Kuch error aaya AI mein, please thodi der baad try karo.'
  }
}

// WhatsApp webhook
app.post('/webhook', async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const from = msg?.from
  const text = msg?.text?.body

  console.log('📩 Message received from:', from)
  console.log('📝 Message text:', text)

  if (from && text) {
    try {
      // Get or create user
      let user = await User.findOne({ phone: from })
      if (!user) {
        user = await User.create({ phone: from })
      } else {
        user.lastInteraction = new Date()
        await user.save()
      }

      // Fetch last 5 messages from this user
      const pastMessages = await Message.find({ user: user._id })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean()
        .then(docs => docs.reverse()) // maintain oldest to newest

      let aiReply = ''

      // Predefined reply
      if (
        text.toLowerCase().includes('address') ||
        text.toLowerCase().includes('location')
      ) {
        aiReply = 'Hamare office yaha hai: 123 Main Road, Raipur, Chhattisgarh.'
      } else if (
        text.toLowerCase().includes('phone') ||
        text.toLowerCase().includes('contact')
      ) {
        aiReply =
          'Aap parshad ji se is number par sampark kar sakte hain: 9876543210.'
      } else if (
        text.toLowerCase().includes('event') ||
        text.toLowerCase().includes('program')
      ) {
        aiReply =
          'Agle samajik karyakram ki jankari ke liye kripya Facebook ya website par check karein.'
      } else {
        aiReply = await getGeminiReply(pastMessages, text)
      }

      // Send reply to user via WhatsApp
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: from,
          text: { body: aiReply }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log('✅ Reply sent to user.')

      // Save to DB
      await Message.create({
        user: user._id,
        text,
        aiReply
      })

      logToCSV(from, text, aiReply)
    } catch (error) {
      console.error('❌ Error in processing message:', error.message)
    }
  }

  res.sendStatus(200)
})

// Webhook verification
app.get('/webhook', (req, res) => {
  const verify_token = 'my_custom_token'
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  if (mode === 'subscribe' && token === verify_token) {
    console.log('✅ Webhook verified.')
    res.status(200).send(challenge)
  } else {
    res.sendStatus(403)
  }
})

// API to get message history
app.get('/api/messages', async (req, res) => {
  const messages = await Message.find()
    .populate('user', 'phone')
    .sort({ timestamp: -1 })
  res.json(messages)
})

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
})
