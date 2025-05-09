require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const axios = require('axios')
const bodyParser = require('body-parser')
const cors = require('cors')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const app = express()
app.use(bodyParser.json())
app.use(cors())

const fs = require('fs')
const path = require('path')

// Mongoose Database Setup
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err))

// Mongoose Schema
const MessageSchema = new mongoose.Schema({
  from: String,
  text: String,
  aiReply: String,
  timestamp: { type: Date, default: Date.now }
})

const Message = mongoose.model('Message', MessageSchema)

// Local CSV management
function logToCSV (phone, message) {
  const csvFilePath = path.join(__dirname, 'contacts.csv')
  const timestamp = new Date().toISOString()
  const row = `"${timestamp}","${phone}","${message.replace(/"/g, '""')}"\n`

  const fileExists = fs.existsSync(csvFilePath)

  if (!fileExists) {
    const header = `"Timestamp","Phone Number","Message"\n`
    fs.writeFileSync(csvFilePath, header + row)
    console.log('📄 CSV created and first row written')
  } else {
    fs.appendFileSync(csvFilePath, row)
    console.log(`✅ Data added to CSV: ${phone} - ${message}`)
  }
}

// Gemini setup for AI Response
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

async function getGeminiReply (userMessage) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  const prompt = `
 Aap ek political aur social leader ke WhatsApp assistant bot ho. 
    Jab koi message bheje, to uska jawab Hinglish me polite aur samajhdari se do. 
    Message: "${userMessage}"
`

  try {
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = response.text()
    return text.replace(/\*\*/g, '').trim() // Clean markdown if any
  } catch (err) {
    console.error('Gemini Error:', err.message)
    return 'Kuch error aaya AI mein, please thodi der baad try karo.'
  }
}

// webhook
app.post('/webhook', async (req, res) => {
  const msg = req.body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
  const from = msg?.from
  const text = msg?.text?.body

  console.log('📩 Message received from:', from)
  console.log('📝 Message text:', text)

  if (from && text) {
    let aiReply = ''
    console.log('🤖 Gemini reply:', aiReply)

    // Simple command recognition
    if (
      text.includes('address') ||
      text.includes('location') ||
      text.includes('Address') ||
      text.includes('Location')
    ) {
      aiReply = 'Hamare office yaha hai: 123 Main Road, Raipur, Chhattisgarh.'
    } else if (text.includes('phone') || text.includes('contact')) {
      aiReply =
        'Aap parshad ji se is number par sampark kar sakte hain: 9876543210.'
    } else if (text.includes('event') || text.includes('program')) {
      aiReply =
        'Agle samajik karyakram ki jankari ke liye kripya Facebook ya website par check karein.'
    } else {
      // Gemini AI response (mocked for now)
      aiReply = await getGeminiReply(text);
    }

    try {
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
      logToCSV(from, text)

      // Save to MongoDB
      await Message.create({ from, text, aiReply })
    } catch (error) {
      console.error('❌ WhatsApp reply failed:', error.message)
    }
  }

  res.sendStatus(200)
})

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
  const messages = await Message.find().sort({ timestamp: -1 })
  res.json(messages)
})

app.listen(process.env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${process.env.PORT}`)
})
