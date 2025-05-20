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
const tf = require('@tensorflow/tfjs');
const { KMeans } = require('ml-kmeans')

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
 * User Schema - Stores citizen information with engagement metrics
 */
const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now },
  engagementScore: { type: Number, default: 0 }, // 0-100 scale
  sentimentScore: { type: Number, default: 0 }, // -1 (negative) to 1 (positive)
  preferredLanguage: { type: String, default: 'hinglish' },
  interests: [String], // Political topics of interest
  messageCount: { type: Number, default: 0 },
  responseTimes: [Number], // Array of response times in seconds
  clusterId: { type: Number, default: -1 } // For user segmentation
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
  keyPromises: [String],
  performanceMetrics: {
    averageResponseTime: Number,
    satisfactionScore: Number,
    commonIssues: [String]
  }
})

/**
 * Message Schema - Stores conversation history with sentiment analysis
 */
const MessageSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  aiReply: String,
  timestamp: { type: Date, default: Date.now },
  status: { type: String, enum: ['replied', 'failed'], default: '' },
  hidden: { type: Boolean, default: false },
  sentiment: {
    score: Number,
    label: String // 'positive', 'negative', 'neutral'
  },
  intent: String, // Categorized intent of the message
  responseTime: Number, // Seconds to respond
  feedbackScore: Number // 1-5 if user provides feedback
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
    enum: ['all', 'supporters', 'new', 'segment'],
    default: 'all'
  },
  segmentCriteria: Object, // Criteria for segmented audiences
  results: [
    {
      phone: String,
      status: String,
      error: String,
      engagement: Number // How user engaged with this message
    }
  ],
  performanceMetrics: {
    openRate: Number,
    responseRate: Number,
    positiveResponseRate: Number
  }
})

/**
 * TrainingData Schema - Stores labeled data for ML model training
 */
const TrainingDataSchema = new mongoose.Schema({
  text: String,
  intent: String,
  response: String,
  sentiment: String,
  entities: [{
    type: String,
    value: String
  }],
  source: { 
    type: String, 
    enum: ['manual', 'auto-labeled', 'user-feedback', 'system'], // Added 'system'
    default: 'auto-labeled'
  },
  createdAt: { type: Date, default: Date.now }
})

// Create models from schemas
const User = mongoose.model('User', UserSchema)
const Employee = mongoose.model('Employee', EmployeeSchema)
const Party = mongoose.model('Party', PartySchema)
const Message = mongoose.model('Message', MessageSchema)
const ScheduledMessage = mongoose.model('ScheduledMessage', ScheduledMessageSchema)
const TrainingData = mongoose.model('TrainingData', TrainingDataSchema)

// --- ML & NLP CONFIGURATION ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

// Initialize NLP tools
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const tfidf = new natural.TfIdf();  // Correct initialization
const stemmer = natural.PorterStemmer;
let intentClassifier;
let sentimentAnalyzer = {
  getSentiment: (tokens, stemmer) => {
    const analyzer = new natural.SentimentAnalyzer('English', stemmer, 'afinn');
    return analyzer.getSentiment(tokens);
  }
};
let userClusteringModel;

// Initialize ML models
// Add some basic training data in your initialization
async function initializeModels() {
  try {
    // Add minimal training examples
    const basicIntents = [
      { text: "complaint about water", intent: "complaint" },
      { text: "scheme information", intent: "scheme" },
      { text: "thank you", intent: "thanks" }
    ];

    await TrainingData.deleteMany({});
    await TrainingData.insertMany(basicIntents.map(data => ({
      ...data,
      source: 'system'
    })));

    // Now train
    const trainingData = await TrainingData.find();
    trainingData.forEach(data => {
      tfidf.addDocument(tokenizer.tokenize(data.text), data.intent);
    });
    
    console.log(`Intent classifier trained with ${trainingData.length} samples`);
  } catch (err) {
    console.error('Model initialization error:', err);
  }
}
 
initializeModels()

// --- HELPER FUNCTIONS ---

/**
 * Analyzes text sentiment using a hybrid approach
 * @param {string} text - Input text to analyze
 * @returns {Object} {score: number, label: string}
 */
function analyzeSentiment(text) {
  // Simple rule-based sentiment analysis as fallback
  const analyzer = new natural.SentimentAnalyzer()
  const stemmer = natural.PorterStemmer
  const tokens = tokenizer.tokenize(text)
  
  try {
    const score = analyzer.getSentiment(tokens, stemmer)
    return {
      score,
      label: score > 0.2 ? 'positive' : score < -0.2 ? 'negative' : 'neutral'
    }
  } catch (err) {
    console.error('Sentiment analysis error:', err)
    return {
      score: 0,
      label: 'neutral'
    }
  }
}

/**
 * Classifies message intent using ML model
 * @param {string} text - Message text
 * @returns {string} Intent category
 */
function classifyIntent(text) {
  if (!tfidf.documents || tfidf.documents.length === 0) {
    return 'general' // Fallback if model not trained
  }

  const tokens = tokenizer.tokenize(text)
  const scores = {}
  
  tfidf.tfidfs(tokens, (i, measure) => {
    const intent = tfidf.documents[i].__key
    scores[intent] = (scores[intent] || 0) + measure
  })

  // Return intent with highest score
  return Object.keys(scores).length > 0 
    ? Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b)
    : 'general'
}

/**
 * Updates user engagement metrics
 * @param {Object} user - User document
 * @param {Object} message - Message document
 */
async function updateUserMetrics(user, message) {
  try {
    const updateData = {
      $inc: { messageCount: 1 },
      lastInteraction: new Date()
    }

    // Update sentiment rolling average
    if (message.sentiment) {
      const newScore = (user.sentimentScore * 0.7) + (message.sentiment.score * 0.3)
      updateData.$set = {
        ...updateData.$set,
        sentimentScore: newScore
      }
    }

    // Update engagement score (formula can be refined)
    const responseEngagement = message.responseTime 
      ? Math.max(0, 1 - (message.responseTime / 120)) // 2 minute max response
      : 0.5
    const sentimentEngagement = message.sentiment 
      ? (message.sentiment.score + 1) / 2 // Convert -1..1 to 0..1
      : 0.5
    const newEngagement = (user.engagementScore * 0.6) + 
      (responseEngagement * 0.2) + 
      (sentimentEngagement * 0.2)

    updateData.$set = {
      ...updateData.$set,
      engagementScore: Math.min(100, Math.max(0, newEngagement * 100)) // Convert to 0-100 scale
    }

    // Update user interests based on message intent
    if (message.intent && !user.interests.includes(message.intent)) {
      updateData.$push = {
        interests: message.intent
      }
    }

    await User.findByIdAndUpdate(user._id, updateData)
  } catch (err) {
    console.error('Error updating user metrics:', err)
  }
}

/**
 * Performs user segmentation using clustering
 */
async function performUserSegmentation() {
  try {
    const users = await User.find({
      messageCount: { $gt: 3 } // Only segment users with sufficient interactions
    }).select('engagementScore sentimentScore messageCount interests')

    if (users.length < 10) {
      console.log('Not enough users for segmentation')
      return
    }

    // Prepare data for clustering
    const data = users.map(user => [
      user.engagementScore,
      user.sentimentScore,
      user.messageCount
    ])

    // Perform k-means clustering
    const result = KMeans(data, userClusteringModel.k, { initialization: 'kmeans++' })
    
    // Update users with their cluster IDs
    const bulkOps = users.map((user, index) => ({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { clusterId: result.clusters[index] } }
      }
    }))

    await User.bulkWrite(bulkOps)
    userClusteringModel.trained = true
    console.log(`User segmentation completed with ${userClusteringModel.k} clusters`)
  } catch (err) {
    console.error('Error performing user segmentation:', err)
  }
}

// Schedule user segmentation weekly
setInterval(performUserSegmentation, 7 * 24 * 60 * 60 * 1000)

/**
 * Generates AI response using Gemini API with context learning
 * @param {Array} chatHistory - Previous messages in conversation
 * @param {string} newMessage - Latest message from user
 * @param {Object} user - User document
 * @returns {string} Generated response
 */
async function getGeminiReply(chatHistory, newMessage, user) {
  // First check for standard replies
  const predefinedReply = getPredefinedReply(newMessage)
  if (predefinedReply) return predefinedReply

  // Prepare context for the AI
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  
  // Create user context string
  const userContext = `
  User Profile:
  - Engagement Level: ${user.engagementScore}/100
  - Sentiment Trend: ${user.sentimentScore > 0.3 ? 'Positive' : user.sentimentScore < -0.3 ? 'Negative' : 'Neutral'}
  - Preferred Language: ${user.preferredLanguage}
  - Interests: ${user.interests.join(', ') || 'Not specified'}
  - Message Count: ${user.messageCount}
  ${user.clusterId >= 0 ? `- User Segment: Cluster ${user.clusterId}` : ''}
  `

  // Analyze current message
  const sentiment = analyzeSentiment(newMessage)
  const intent = classifyIntent(newMessage)

  // Store this interaction as training data
  try {
    const trainingDoc = new TrainingData({
      text: newMessage,
      intent,
      sentiment: sentiment.label,
      source: 'auto-labeled'
    })
    await trainingDoc.save()
  } catch (err) {
    console.error('Error saving training data:', err)
  }

  // Create prompt with dynamic instructions based on user profile
  let prompt = `
  You are the official WhatsApp assistant for Mr. Amar Bansal (Parshad of Samta Colony). Follow these guidelines:

  User Context:
  ${userContext}

  Message Analysis:
  - Intent: ${intent}
  - Sentiment: ${sentiment.label} (${sentiment.score.toFixed(2)})

  Response Guidelines:
  ${user.engagementScore > 70 ? '- This is a highly engaged user, provide detailed responses' : ''}
  ${user.sentimentScore < -0.2 ? '- User has been negative recently, be extra polite and helpful' : ''}
  ${user.preferredLanguage === 'hinglish' ? '- Respond in Hinglish (Hindi+English mix)' : '- Respond in formal Hindi'}
  ${user.interests.includes(intent) ? `- User is interested in ${intent}, provide relevant details` : ''}

  Chat History (last 5 messages):
  ${chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'You'}: ${m.text}`).join('\n')}

  New Message: "${newMessage}"

  Craft a personalized response (2-3 sentences) that:
  - Addresses the user's intent (${intent})
  - Matches their sentiment (current: ${sentiment.label})
  - Considers their engagement level
  - Provides value based on their interests
  `

  try {
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    // If response is too generic, fall back to intent-based response
    if (response.length < 20 || response.includes("I don't know")) {
      return getIntentBasedResponse(intent, user)
    }

    return response
  } catch (aiError) {
    console.error('❌ Error getting AI reply:', aiError)
    return getIntentBasedResponse(intent, user)
  }
}

/**
 * Gets intent-based response when AI fails or for common intents
 * @param {string} intent - Message intent
 * @param {Object} user - User document
 * @returns {string} Appropriate response
 */
function getIntentBasedResponse(intent, user) {
  const responses = {
    complaint: `Hum aapki samasya ko sambhalenge. Kripya hamare office mein milne aa sakte hain ya ${process.env.OFFICE_PHONE} par call karein.`,
    inquiry: `Aapke sawaal ka jawab hum jald de denge. Kripya thodi der intezaar karein.`,
    greeting: `Namaste ${user.name ? 'Shri/Smt ' + user.name.split(' ')[0] : ''}! Kaise madad kar sakte hain?`,
    thanks: `Dhanyavaad! Aapka feedback humein aur behtar kaam karne ki prerana deta hai.`,
    general: STANDARD_REPLIES.default
  }

  return responses[intent] || responses.general
}

// Standard replies for common queries
const STANDARD_REPLIES = {
  address: 'Hamara office: Samta Colony, Raipur, Chhattisgarh. Aap kabhi bhi milne aa sakte hain!',
  contact: `Aap humein 📞 ${process.env.OFFICE_PHONE} par call kar sakte hain. Office hours: 10AM-5PM, Mon-Sat.`,
  scheme: 'Yojana ki jaankari ke liye, kripya hamari official website [URL] visit karein.',
  default: 'Dhanyavaad! Aapka message hum tak pahunch gaya hai. Hum jald hi aapko reply karenge.'
}

function getPredefinedReply(message) {
  const lowerMsg = message.toLowerCase()
  if (/address|location|kahan/i.test(lowerMsg)) return STANDARD_REPLIES.address
  if (/contact|number|phone/i.test(lowerMsg)) return STANDARD_REPLIES.contact
  if (/scheme|yojana|program/i.test(lowerMsg)) return STANDARD_REPLIES.scheme
  return null
}

// --- ROUTES ---

// WhatsApp Webhook Handler (Enhanced with ML)
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

    // Find or create user with enhanced metrics
    let user = await User.findOne({ phone: normalizedPhone })
    let isNewUser = false

    if (!user) {
      user = await User.create({
        phone: normalizedPhone,
        lastInteraction: new Date(),
        engagementScore: 50, // Default score for new users
        sentimentScore: 0
      })
      isNewUser = true
    }

    // Analyze message before processing
    const sentiment = analyzeSentiment(text)
    const intent = classifyIntent(text)

    // Store incoming message with analysis
    const newMsg = await Message.create({
      user: user._id,
      text,
      status: 'failed',
      sentiment,
      intent,
      timestamp: new Date()
    })

    // Get conversation history with additional context
    const pastMessages = await Message.find({ user: user._id })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean()

    // Calculate response time (if this is a reply to previous message)
    if (pastMessages.length > 0 && pastMessages[0].status === 'replied') {
      const lastMessageTime = new Date(pastMessages[0].timestamp)
      newMsg.responseTime = (new Date() - lastMessageTime) / 1000
      await newMsg.save()
    }

    // Generate AI response with user context
    let aiReply
    try {
      aiReply = await getGeminiReply(
        pastMessages.reverse().map(m => ({
          role: m.user ? 'user' : 'assistant',
          text: m.user ? m.text : m.aiReply
        })),
        text,
        user
      )
    } catch (aiError) {
      console.error('❌ Error getting AI reply:', aiError)
      aiReply = getIntentBasedResponse(intent, user)
    }

    // Add welcome message for new users with personalized touch
    if (isNewUser) {
      aiReply = `Namaste! Aapka swagat hai Samta Colony ke official WhatsApp channel mein. ${aiReply}`
      
      // Schedule a follow-up message for new users
      setTimeout(async () => {
        try {
          await twilioClient.messages.create({
            body: 'Aapko humse koi aur madad chahiye? Humein aapki feedback ki bahut kadar hai.',
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${normalizedPhone}`
          })
        } catch (err) {
          console.error('Error sending follow-up:', err)
        }
      }, 6 * 60 * 60 * 1000) // 6 hours later
    }

    // Send response
    twiml.message(aiReply)

    // Update message record with AI response and metrics
    await Message.findByIdAndUpdate(newMsg._id, {
      aiReply,
      status: 'replied'
    })

    // Update user metrics in background
    updateUserMetrics(user, newMsg)
  } catch (error) {
    console.error('❌ Error in processing message:', error)
    twiml.message('Kuch error aaya, please thodi der baad try karo.')
  }

  res.type('text/xml').send(twiml.toString())
})

// --- ANALYTICS ROUTES ---
app.get('/api/analytics/engagement', async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $group: {
          _id: null,
          avgEngagement: { $avg: '$engagementScore' },
          avgSentiment: { $avg: '$sentimentScore' },
          totalUsers: { $sum: 1 },
          engagedUsers: { $sum: { $cond: [{ $gt: ['$engagementScore', 70] }, 1, 0] } },
          negativeUsers: { $sum: { $cond: [{ $lt: ['$sentimentScore', -0.3] }, 1, 0] } }
        }
      }
    ])

    const messages = await Message.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
      count: { $sum: 1 },
      avgResponseTime: { $avg: '$responseTime' },
      positive: { $sum: { $cond: [{ $gt: ['$sentiment.score', 0.3] }, 1, 0] } },
      negative: { $sum: { $cond: [{ $lt: ['$sentiment.score', -0.3] }, 1, 0] } } // Added missing closing brace
    }
  },
  { $sort: { _id: 1 } },
  { $limit: 30 }
])
    const intents = await Message.aggregate([
      { $group: { _id: '$intent', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ])

    res.json({
      userMetrics: users[0] || {},
      messageTrends: messages,
      commonIntents: intents
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/analytics/user-segments', async (req, res) => {
  try {
    if (!userClusteringModel.trained) {
      await performUserSegmentation()
    }

    const segments = await User.aggregate([
      { $match: { clusterId: { $gte: 0 } } },
      { $group: { 
        _id: '$clusterId',
        count: { $sum: 1 },
        avgEngagement: { $avg: '$engagementScore' },
        avgSentiment: { $avg: '$sentimentScore' },
        commonInterests: { $push: '$interests' }
      } },
      { $sort: { _id: 1 } }
    ])

    // Process common interests for each segment
    segments.forEach(segment => {
      const allInterests = segment.commonInterests.flat()
      const interestCounts = allInterests.reduce((acc, interest) => {
        acc[interest] = (acc[interest] || 0) + 1
        return acc
      }, {})
      
      segment.topInterests = Object.entries(interestCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([interest]) => interest)
      
      delete segment.commonInterests
    })

    res.json(segments)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- TRAINING DATA MANAGEMENT ---
app.post('/api/train', async (req, res) => {
  try {
    const { text, intent, response, sentiment, entities } = req.body

    if (!text || !intent) {
      return res.status(400).json({ error: 'Text and intent are required' })
    }

    const trainingDoc = new TrainingData({
      text,
      intent,
      response,
      sentiment,
      entities,
      source: 'manual'
    })

    await trainingDoc.save()

    // Retrain the intent classifier
    const allTrainingData = await TrainingData.find()
    tfidf = new Tfidf() // Reset TF-IDF
    
    allTrainingData.forEach(data => {
      tfidf.addDocument(tokenizer.tokenize(data.text), data.intent)
    })

    res.json({ success: true, trainedSamples: allTrainingData.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- REST OF THE ROUTES (same as before) ---

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
    res.json({ message: 'User deleted successfully' })
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

// only for testing remove it later 
// Add this temporary test route
// app.get('/test-intent', async (req, res) => {
//   const testPhrases = [
//     "The water supply is bad",
//     "Tell me about housing scheme",
//     "Thanks for your help"
//   ];
  
//   const results = testPhrases.map(phrase => {
//     const intent = classifyIntent(phrase);
//     return { phrase, intent };
//   });
  
//   res.json(results);
// });


// Start server
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  initializeModels().then(() => {
    performUserSegmentation();
  });
});