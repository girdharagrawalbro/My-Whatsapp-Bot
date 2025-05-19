require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const { MessagingResponse } = require('twilio').twiml
const twilioClient = require('twilio')(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)
const bodyParser = require('body-parser')
const cors = require('cors')
const { GoogleGenerativeAI } = require('@google/generative-ai')

// Initialize Express app
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())

// --- DATABASE CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err))

// --- SCHEMAS & MODELS ---
/**
 * User Schema - Stores citizen information
 */
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now }
})

/**
 * Employee Schema - Stores team member information
 */
const EmployeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, required: true }, // 'manager', 'volunteer', etc.
  phone: { type: String, required: true },
  assignedArea: String,
  permissions: [String] // e.g., ['send_broadcasts', 'manage_users']
})

/**
 * Party Schema - Stores political party information (single document)
 */
const PartySchema = new mongoose.Schema({
  name: { type: String, required: true },
  leader: { type: String, required: true },
  headquarters: String,
  contact: String,
  keyPromises: [String]
})

/**
 * Message Schema - Stores conversation history
 */
const MessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  aiReply: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['replied', 'failed'], default: '' },
  hidden: { type: Boolean, default: false }
})

/**
 * ScheduledMessage Schema - Stores broadcast messages
 */
const ScheduledMessageSchema = new mongoose.Schema({
  message: String,
  users: [{ type: String }],
  scheduledTime: Date,
  status: {
    type: String,
    enum: ['scheduled', 'sent', 'failed'],
    default: 'scheduled'
  },
  hidden: { type: Boolean, default: false },
  campaign: String,
  audience: {
    type: String,
    enum: ['all', 'supporters', 'new'],
    default: 'all'
  },
  results: [
    {
      phone: String,
      status: String,
      error: String
    }
  ]
})

// Create models from schemas
const User = mongoose.model('User', UserSchema)
const Employee = mongoose.model('Employee', EmployeeSchema)
const Party = mongoose.model('Party', PartySchema)
const Message = mongoose.model('Message', MessageSchema)
const ScheduledMessage = mongoose.model(
  'ScheduledMessage',
  ScheduledMessageSchema
)

// --- AI CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Standard replies for common queries
const STANDARD_REPLIES = {
  address:
    'Hamara office: Samta Colony, Raipur, Chhattisgarh. Aap kabhi bhi milne aa sakte hain!',
  contact:
    'Aap humein 📞 xxxxx-xxxxx par call kar sakte hain. Office hours: 10AM-5PM, Mon-Sat.',
  scheme:
    'Yojana ki jaankari ke liye, kripya hamari official website [URL] visit karein.',
  default:
    'Dhanyavaad! Aapka message hum tak pahunch gaya hai. Hum jald hi aapko reply karenge.'
}

// --- HELPER FUNCTIONS ---
/**
 * Checks if message matches any standard queries and returns predefined reply if found
 * @param {string} message - Incoming message text
 * @returns {string|null} Predefined reply or null if no match found
 */
function getPredefinedReply (message) {
  const lowerMsg = message.toLowerCase()
  if (/address|location|kahan/i.test(lowerMsg)) return STANDARD_REPLIES.address
  if (/contact|number|phone/i.test(lowerMsg)) return STANDARD_REPLIES.contact
  if (/scheme|yojana|program/i.test(lowerMsg)) return STANDARD_REPLIES.scheme
  return null
}

/**
 * Generates AI response using Gemini API
 * @param {Array} chatHistory - Previous messages in conversation
 * @param {string} newMessage - Latest message from user
 * @returns {string} Generated response
 */
async function getGeminiReply (chatHistory, newMessage) {
  const predefinedReply = getPredefinedReply(newMessage)
  if (predefinedReply) return predefinedReply

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  const prompt = `
  You are the official WhatsApp assistant for Mr. Amar Bansal (Parshad of Samta Colony). Minimal respond in Hinglish:
  - Be respectful but approachable
  - For complaints, say: "Hum aapki samasya ko sambhalenge"
  - Redirect to phone/office when needed

  Chat History:
  ${chatHistory
    .map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`)
    .join('\n')}

  New Message: "${newMessage}"

  Response (2-3 sentences):
  `

  const result = await model.generateContent(prompt)
  return result.response.text()
}

// --- ROUTES ---

// WhatsApp Webhook Handler
app.post('/webhook', async (req, res) => {
  const from = req.body.WaId || req.body.From
  const text = req.body.Body
  const twiml = new MessagingResponse()

  if (!from || !text) {
    return res.type('text/xml').send(twiml.toString())
  }

  try {
    // Normalize phone number
    const normalizedPhone = from.replace(/\D/g, '')

    // Find or create user
    let user = await User.findOne({ phone: normalizedPhone })
    let isNewUser = false

    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        lastInteraction: new Date()
      })
      isNewUser = true
    } else {
      await User.updateOne(
        { _id: user._id },
        { $set: { lastInteraction: new Date() } }
      )
    }

    // Store incoming message
    const newMsg = await Message.create({
      user: user._id,
      text,
      status: 'failed'
    })

    // Get conversation history
    const pastMessages = await Message.find({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean()

    // Generate AI response
    let aiReply
    try {
      aiReply = await getGeminiReply(pastMessages.reverse(), text)
    } catch (aiError) {
      console.error('❌ Error getting AI reply:', aiError)
      aiReply = STANDARD_REPLIES.default
    }

    // Add welcome message for new users
    if (isNewUser) {
      aiReply =
        'Namaste! Aapka swagat hai. Aapne pehli baar message kiya hai. Kaise madad kar sakte hain?\n' +
        aiReply
    }

    // Send response
    twiml.message(aiReply)

    // Update message record with AI response
    await Message.findByIdAndUpdate(newMsg._id, {
      aiReply,
      status: 'replied'
    })
  } catch (error) {
    console.error('❌ Error in processing message:', error)
    twiml.message('Kuch error aaya, please thodi der baad try karo.')
  }

  res.type('text/xml').send(twiml.toString())
})

// --- USER MANAGEMENT ROUTES ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find()
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/users', async (req, res) => {
  try {
    const { phone, name } = req.body

    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' })
    }

    const user = new User({ phone, name, lastInteraction: new Date() })
    await user.save()
    res.status(201).json(user)
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Phone number already exists' })
    } else {
      res.status(500).json({ error: err.message })
    }
  }
})

app.put('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ error: 'User not found' })
    await Message.deleteMany({ user: user._id })
    res.status(204).send()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- EMPLOYEE MANAGEMENT ROUTES ---
app.get('/api/employees', async (req, res) => {
  try {
    const employees = await Employee.find().sort({ priority: -1 })
    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

app.post('/api/employees', async (req, res) => {
  try {
    const employee = new Employee(req.body)
    await employee.save()
    res.status(201).json(employee)
  } catch (error) {
    res.status(400).json({ error: 'Invalid data' })
  }
})

app.put('/api/employees/:id', async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, {
      new: true
    })
    res.json(employee)
  } catch (error) {
    res.status(404).json({ error: 'Employee not found' })
  }
})

app.delete('/api/employees/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id)
    res.json({ message: 'Employee deleted' })
  } catch (error) {
    res.status(404).json({ error: 'Employee not found' })
  }
})

// --- PARTY INFORMATION ROUTES ---
app.get('/api/party', async (req, res) => {
  try {
    const data = await Party.findOne()
    res.json(data || {})
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/party', async (req, res) => {
  try {
    await Party.deleteMany() // Maintain single party record
    const party = new Party(req.body)
    await party.save()
    res.status(201).json(party)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// --- MESSAGE MANAGEMENT ROUTES ---
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find({ hidden: false })
      .populate('user', 'phone name')
      .sort({ timestamp: -1 })
      .limit(100)
    res.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

app.post('/api/messages/visibility', async (req, res) => {
  try {
    const { ids, hidden } = req.body

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    await Message.updateMany({ _id: { $in: ids } }, { $set: { hidden } })

    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update visibility' })
  }
})

app.post('/api/scheduled-messages/visibility', async (req, res) => {
  try {
    const { ids, hidden } = req.body

    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'invalid request body' })
    }

    await ScheduledMessage.updateMany(
      { _id: { $in: ids } },
      { $set: { hidden } }
    )

    res.json({ success: true })
  } catch (error) {
    res.ststus(500).json({ error: 'failed to update visiblity' })
  }
})

// --- SCHEDULED MESSAGES ROUTES ---
app.get('/api/scheduled-messages', async (req, res) => {
  try {
    const messages = await ScheduledMessage.find({ hidden: false }).sort({
      scheduledTime: -1
    })
    res.json(messages)
  } catch (error) {
    console.error('Error fetching scheduled messages:', error)
    res.status(500).json({ error: 'Failed to fetch scheduled messages' })
  }
})

app.post('/api/messages/send', async (req, res) => {
  const { message, users, scheduledTime } = req.body

  if (!message || !users || !Array.isArray(users)) {
    return res.status(400).json({ error: 'Invalid request body' })
  }

  try {
    const scheduledMessage = new ScheduledMessage({
      message,
      users,
      scheduledTime: scheduledTime || new Date(),
      status: 'scheduled'
    })

    await scheduledMessage.save()

    // Function to actually send the messages
    const sendMessages = async () => {
      const results = []
      let allSuccessful = true

      for (const phone of users) {
        try {
          await twilioClient.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${phone}`
          })
          results.push({ phone, status: 'sent' })
        } catch (err) {
          results.push({ phone, status: 'failed', error: err.message })
          allSuccessful = false
        }
      }

      await ScheduledMessage.findByIdAndUpdate(scheduledMessage._id, {
        status: allSuccessful ? 'sent' : 'failed',
        results,
        completedAt: new Date()
      })
    }

    // Schedule or send immediately
    if (scheduledTime && new Date(scheduledTime) > new Date()) {
      const delay = new Date(scheduledTime) - Date.now()
      setTimeout(sendMessages, delay)
      return res.json({
        status: 'scheduled',
        scheduledAt: scheduledTime,
        messageId: scheduledMessage._id
      })
    }

    await sendMessages()
    const updated = await ScheduledMessage.findById(scheduledMessage._id)
    res.json(updated)
  } catch (error) {
    console.error('Error scheduling messages:', error)
    res.status(500).json({ error: 'Failed to schedule messages' })
  }
})

// --- ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
})
