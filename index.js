require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { MessagingResponse } = require('twilio').twiml;
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mongoose = require('mongoose');
const nodeCron = require('node-cron');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Initialize MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Event Schema
const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date, required: true },
  time: String,
  address: String,
  organizer: String,
  contactPhone: String,
  mediaUrls: [String],
  extractedText: String,
  mediaType: { type: String, enum: ['image', 'pdf', 'video'], required: true },
  createdAt: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'confirmed'
  },
  sourcePhone: String
});

const Event = mongoose.model('Event', EventSchema);

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Function to send WhatsApp message
async function sendWhatsAppMessage(to, body) {
  try {
    await twilio.messages.create({
      body: body,
      from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
      to: `whatsapp:${to}`
    });
    console.log(`Message sent to ${to}`);
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

async function extractEventDetailsFromMedia(filePath, mediaType) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const fileData = fs.readFileSync(filePath);
    const base64Data = fileData.toString('base64');

    let mimeType;
    switch(mediaType) {
      case 'image': mimeType = 'image/jpeg'; break;
      case 'pdf': mimeType = 'application/pdf'; break;
      case 'video': mimeType = 'video/mp4'; break;
      default: mimeType = 'application/octet-stream';
    }

    // Enhanced prompt for better video processing
    const prompt = `Extract ALL event details from this ${mediaType}. Return as JSON array if multiple events exist.
    Each event should have:
    {
      "title": "Event title (in original language)",
      "description": "Event description",
      "date": "DD/MM/YYYY",
      "time": "HH:MM (AM/PM)",
      "address": "Event address",
      "organizer": "Organizer name",
      "contactPhone": "Phone number"
    }
    Include ALL events found, even if partially complete.`;

    const result = await model.generateContent([
      { 
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      },
      prompt
    ]);

    const response = await result.response;
    let text = response.text();
    
    // Clean and parse response
    text = text.replace(/```json|```/g, '').trim();
    const events = JSON.parse(text);
    return Array.isArray(events) ? events : [events];

  } catch (error) {
    console.error(`Error processing ${mediaType}:`, error);
    return { error: `Failed to process ${mediaType}` };
  }
}

// Updated queryEvents function with proper date handling
async function queryEvents(query, phone) {
  try {
    // Case 1: Today's events
    if (query.match(/today|aaj|आज/i)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const events = await Event.find({
        date: { $gte: today, $lt: tomorrow },
      }).sort({ time: 1 });

      return { 
        type: 'today',
        events,
        message: events.length > 0 
          ? `आज के कार्यक्रम (${today.toLocaleDateString('en-IN')}):`
          : 'आज के लिए कोई कार्यक्रम निर्धारित नहीं है।'
      };
    }
    
    // Case 2: Upcoming events (today and future)
    if (query.match(/upcoming|all events|future events|coming events|आगामी/i)) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const events = await Event.find({
        date: { $gte: today },
      }).sort({ date: 1, time: 1 });

      return {
        type: 'upcoming',
        events,
        message: events.length > 0
          ? `आगामी कार्यक्रम (${today.toLocaleDateString('en-IN')} से):`
          : 'कोई आगामी कार्यक्रम नहीं मिला।'
      };
    }
    
    // Case 3: Specific date (DD/MM/YYYY)
    if (query.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      const [day, month, year] = query.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)[0].split('/');
      
      const startDate = new Date(Date.UTC(year, month-1, day, 0, 0, 0));
      const endDate = new Date(Date.UTC(year, month-1, day, 23, 59, 59));
      
      const events = await Event.find({
        date: { $gte: startDate, $lte: endDate },
      }).sort({ time: 1 });

      return {
        type: 'date',
        date: `${day}/${month}/${year}`,
        events,
        message: events.length > 0
          ? `${day}/${month}/${year} के कार्यक्रम:`
          : `${day}/${month}/${year} को कोई कार्यक्रम नहीं मिला।`
      };
    }

    // Case 4: Search by event name or description
    const searchEvents = await Event.find({
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } }
      ],
    }).sort({ date: 1 });

    return {
      type: 'search',
      query,
      events: searchEvents,
      message: searchEvents.length > 0
        ? `"${query}" से मिलते-जुलते कार्यक्रम:`
        : `"${query}" से कोई कार्यक्रम नहीं मिला।`
    };

  } catch (error) {
    console.error('Error querying events:', error);
    return { error: 'कार्यक्रम खोजने में त्रुटि। कृपया पुनः प्रयास करें।' };
  }
}

// Scheduled daily message at 6 AM
function scheduleDailyNotifications() {
  nodeCron.schedule('0 6 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const events = await Event.find({
        date: { $gte: today, $lt: tomorrow },
      }).sort({ time: 1 });

      const adminPhone = process.env.ADMIN_PHONE_NUMBER;
      if (events.length > 0) {
        
        let message = `🌞 सुप्रभात! आज के कार्यक्रम:\n\n`;
        events.forEach((event, i) => {
          message += `📌 ${i+1}. ${event.title}\n`;
          message += `   🕒 ${event.time || 'समय निर्धारित नहीं'}\n`;
          message += `   📍 ${event.address || 'स्थान निर्धारित नहीं'}\n\n`;
        });
        message += `धन्यवाद!`;

        // Send only to admin
        if (adminPhone) {
          await sendWhatsAppMessage(adminPhone, message);
        } else {
          console.error('ADMIN_PHONE not set in environment variables');
        }
      }
      else{
        let message = `🌞 सुप्रभात! आज के लिए कोई कार्यक्रम नहीं है| \n\n`;
          await sendWhatsAppMessage(adminPhone, message);

      }
    } catch (error) {
      console.error('Error in daily notification:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
}

function parseDate(dateString) {
  if (!dateString) return new Date();
  
  // Try DD/MM/YYYY format
  const parts = dateString.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  
  // Fallback to current date if parsing fails
  return new Date();
}

function getMediaType(contentType) {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('video/')) return 'video';
  return null;
}

// Updated webhook handler
app.post('/webhook', async (req, res) => {
  const from = req.body.WaId || req.body.From;
  const text = req.body.Body || '';
  const twiml = new MessagingResponse();

  if (!from) return res.type('text/xml').send(twiml.toString());

  try {
    console.log('Message from:', from, 'Content:', text);

    // Handle media messages
    if (req.body.NumMedia > 0) {
      const tempDir = path.join(__dirname, 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

      for (let i = 0; i < req.body.NumMedia; i++) {
        const mediaUrl = req.body[`MediaUrl${i}`];
        const contentType = req.body[`MediaContentType${i}`];
        const mediaType = getMediaType(contentType);

        if (!mediaType) {
          twiml.message(`Unsupported file type: ${contentType}`);
          continue;
        }

        const extension = mediaType === 'pdf' ? 'pdf' : mediaType === 'video' ? 'mp4' : 'jpg';
        const filePath = path.join(tempDir, `event-${Date.now()}.${extension}`);

        // Download and process media
        await downloadMediaFile(mediaUrl, filePath);
        const eventDetails = await extractEventDetailsFromMedia(filePath, mediaType);
        fs.unlinkSync(filePath);

        if (eventDetails.error) {
          twiml.message(`Failed to process ${mediaType}: ${eventDetails.error}`);
          continue;
        }

        // Save all extracted events
        for (const eventData of eventDetails) {
          const newEvent = new Event({
            title: eventData.title || 'Untitled Event',
            description: eventData.description,
            date: parseDate(eventData.date),
            time: eventData.time,
            address: eventData.address,
            organizer: eventData.organizer,
            contactPhone: eventData.contactPhone,
            mediaUrls: [mediaUrl],
            mediaType,
            extractedText: JSON.stringify(eventData),
            status: from === process.env.ADMIN_PHONE ? 'confirmed' : 'pending',
            sourcePhone: from
          });
          await newEvent.save();
        }

        const confirmMsg = `✅ Saved ${eventDetails.length} event(s) from your ${mediaType}!\n` +
          `First event: ${eventDetails[0].title}\n` +
          `Date: ${eventDetails[0].date}`;
        
        await sendWhatsAppMessage(from, confirmMsg);
        twiml.message(`We processed your ${mediaType} successfully!`);
      }
    } 
    // Handle text queries
    else if (text.trim()) {
      const result = await queryEvents(text, from);
      
      if (result.error) {
        twiml.message(result.error);
      } else if (result.events.length === 0) {
        twiml.message(result.message);
      } else {
        let response = `${result.message}\n\n`;
        result.events.forEach((event, i) => {
          response += `📌 ${i+1}. ${event.title}\n`;
          response += `   📅 ${event.date.toLocaleDateString()}\n`;
          if (event.time) response += `   ⏰ ${event.time}\n`;
          if (event.address) response += `   📍 ${event.address}\n`;
          if (i < result.events.length - 1) response += '\n';
        });

        // Truncate if too long for WhatsApp (max 4096 chars)
        if (response.length > 4000) {
          response = response.substring(0, 4000) + '...\n(Message truncated)';
        }

        twiml.message(response);
        console.log('Query Response:', response);
      }
    } else {
      twiml.message('Please send an event image/pdf/video or text query like:\n' +
        '"Today\'s events"\n"Events on 25/12/2023"\n"Search wedding"');
    }

  } catch (error) {
    console.error('Webhook error:', error);
    twiml.message('⚠️ An error occurred. Please try again.');
  }

  res.type('text/xml').send(twiml.toString());
});

// API endpoint to get events
app.get('/api/events', async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Ready to process events with Gemini AI and MongoDB');
    scheduleDailyNotifications(); // Start the scheduler
});