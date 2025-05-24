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
  const cors = require('cors');
  const FormData = require('form-data');
  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors());

  // Initialize MongoDB connection
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('\x1b[32m%s\x1b[0m', '✓ MongoDB Connected Successfully'))
    .catch(err => console.error('\x1b[31m%s\x1b[0m', '✗ MongoDB Connection Error:', err));

  // --- SCHEMAS & MODELS ---
  const UserSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    name: String,
    lastInteraction: { type: Date, default: Date.now },
    isSupporter: { type: Boolean, default: false },
    optOut: { type: Boolean, default: false }
  });

  const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    date: { type: Date, required: true },
    time: String,
    address: String,
    organizer: String,
    contactPhone: String,
    mediaUrls: String,
    extractedText: String,
    mediaType: { type: String, enum: ['image', 'pdf', 'video'], required: true, default: 'image' },
    createdAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'cancelled'],
      default: 'confirmed'
    },
    sourcePhone: String,
    reminderSent: { type: Boolean, default: false },
    reminderTime: { type: Number, default: 24 }, // hours before event
    eventIndex: { type: Number, unique: true } // New field for indexing
  });


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
    ],
    completedAt: Date
  });

  const MessageTemplateSchema = new mongoose.Schema({
    name: { type: String, required: true },
    content: { type: String, required: true },
    category: {
      type: String,
      enum: ['event', 'reminder', 'announcement', 'general'],
      default: 'general'
    },
    variables: [{
      name: String,
      description: String,
      required: Boolean,
      defaultValue: String
    }],
    isActive: { type: Boolean, default: true },
    createdBy: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });

  const Event = mongoose.model('Event', EventSchema);
  const User = mongoose.model('User', UserSchema);
  const ScheduledMessage = mongoose.model('ScheduledMessage', ScheduledMessageSchema);
  const MessageTemplate = mongoose.model('MessageTemplate', MessageTemplateSchema);

  // Initialize Google Gemini AI
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  // Standard replies for common queries
  const STANDARD_REPLIES = {
    address: 'हमारा कार्यालय: समता कॉलोनी, रायपुर, छत्तीसगढ़। आप कभी भी मिल सकते हैं!',
    contact: 'आप हमें 7909905038 पर कॉल कर सकते हैं। कार्यालय समय: सुबह 10 बजे से शाम 5 बजे तक, सोम-शनिवार।',
    scheme: 'योजना की जानकारी के लिए, कृपा हमारी आधिकारिक वेबसाइट [यूआरएल] पर जाएं।',
    default: 'धन्यवाद! आपका मैसेज हम तक पहुंच गया है। हम जल्दी ही आपको रिप्लाई करेंगे।'
  };

  // Helper Functions
  function getPredefinedReply(message) {
    const lowerMsg = message.toLowerCase();
    if (/address|location|kahan/i.test(lowerMsg)) return STANDARD_REPLIES.address;
    if (/contact|number|phone/i.test(lowerMsg)) return STANDARD_REPLIES.contact;
    if (/scheme|yojana|program/i.test(lowerMsg)) return STANDARD_REPLIES.scheme;
    return null;
  }


  // Add this function to upload to ImageBB
  async function uploadToImageBB(filePath) {
    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(filePath));

      const response = await axios.post('https://api.imgbb.com/1/upload', form, {
        params: {
          key: process.env.IMGBB_API_KEY
        },
        headers: form.getHeaders()
      });

      return response.data.data.url; // Returns the direct image URL
    } catch (error) {
      console.error('ImageBB upload failed:', error);
      throw error;
    }
  }

  // Modified downloadMediaFile function
  async function downloadMediaFile(mediaUrl, localFilePath) {
    try {
      const response = await axios({
        method: 'get',
        url: mediaUrl,
        responseType: 'stream',
        auth: {
          username: process.env.TWILIO_ACCOUNT_SID,
          password: process.env.TWILIO_AUTH_TOKEN
        }
      });

      const writer = fs.createWriteStream(localFilePath);
      response.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // Upload to ImageBB after download
      const imageBBUrl = await uploadToImageBB(localFilePath);

      return {
        localPath: localFilePath,
        imageBBUrl // This is the new URL you'll use
      };
    } catch (error) {
      console.error('Error processing media file:', error);
      throw error;
    }
  }

  // Extract text from Image, Pdf and Video(limitation in duration)
  async function extractEventDetailsFromMedia(filePath, mediaType) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Read file in chunks for better memory handling
      const fileData = await fs.promises.readFile(filePath);
      const base64Data = fileData.toString('base64');

      // Enhanced MIME type handling
      let mimeType;
      try {
        switch (mediaType) {
          case 'image':
            // Use file-type for all media types
            const { fileTypeFromBuffer } = await import('file-type');
            const detectedType = await fileTypeFromBuffer(fileData);
            mimeType = detectedType ? detectedType.mime : 'image/jpeg';
            break;
          case 'pdf':
            mimeType = 'application/pdf';
            break;
          case 'video':
            const { fileTypeFromBuffer: videoTypeFromBuffer } = await import('file-type');
            const videoDetectedType = await videoTypeFromBuffer(fileData);
            mimeType = videoDetectedType ? videoDetectedType.mime : 'video/mp4';
            break;
          default:
            throw new Error(`Unsupported media type: ${mediaType}`);
        }
      } catch (error) {
        console.error('Error detecting file type:', error);
        // Fallback to default MIME types
        mimeType = mediaType === 'image' ? 'image/jpeg' :
          mediaType === 'pdf' ? 'application/pdf' :
            mediaType === 'video' ? 'video/mp4' : null;
      }

      // Set timeout for AI processing (increased to 2 minutes for larger files)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout after 2 minutes')), 120000);
      });

      const prompt = `इस ${mediaType} से कार्यक्रम का विवरण निकालें। केवल एक मुख्य कार्यक्रम का विवरण इस JSON प्रारूप में दें:
    
      {
    "title": "कार्यक्रम का शीर्षक (मूल भाषा में)",
    "description": "कार्यक्रम का विवरण दर्ज करें (यदि यह शादी, सगाई या आशीर्वाद समारोह है, तो कृपया लड़के और लड़की का नाम लिखें)।",
    "date": "DD/MM/YYYY",
    "time": "HH:MM (AM/PM)",
    "address": "कार्यक्रम का पता",
    "organizer": "आयोजक का नाम",
    "contactPhone": "संपर्क फोन नंबर"
  }

      विशेष नियम:
      1. विवाह कार्ड के लिए: केवल रिसेप्शन या आशीर्वाद समारोह की तारीख/समय निकालें (अन्य समारोहों को नजरअंदाज करें)
      2. एकाधिक कार्यक्रम होने पर: कालानुक्रमिक रूप से अंतिम वाले को चुनें
      3. यदि कोई स्पष्ट कार्यक्रम नहीं मिले: खाली ऑब्जेक्ट लौटाएं
  `;

      const result = await Promise.race([
        model.generateContent([
          {
            inlineData: {
              data: base64Data,
              mimeType: getMimeType(mediaType)
            }
          },
          prompt
        ]),
        timeoutPromise
      ]);

      const response = await result.response;
      let text = response.text();

      // Clean and extract JSON from the response
      text = text.replace(/```json|```/g, '').trim();

      // Find the first occurrence of '[' and last occurrence of ']'
      const startIndex = text.indexOf('{');
      const endIndex = text.lastIndexOf('}') + 1;

      if (startIndex === -1 || endIndex === 0) {
        console.error('No JSON array found in response:', text);
        throw new Error('No valid JSON array found in AI response');
      }

      // Extract just the JSON array
      const jsonText = text.substring(startIndex, endIndex);

      let events;
      try {
        events = JSON.parse(jsonText);
        // console.log('Successfully parsed events:', events);
        console.log('Successfully parsed events');
      } catch (e) {
        console.error('Failed to parse AI response:', jsonText);
        throw new Error('Failed to parse AI response as JSON');
      }

      // Validate event data structure
      const validateEvent = (event) => {
        const required = ['title', 'date'];
        const missing = required.filter(field => !event[field]);
        if (missing.length > 0) {
          throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }
        return event;
      };

      return Array.isArray(events) ? events.map(validateEvent) : [validateEvent(events)];
    } catch (error) {
      console.error(`Error processing ${mediaType}:`, error);
      return {
        error: `Failed to process ${mediaType}: ${error.message}`,
        details: error.stack
      };
    }
  }

  // Helper functions
  function getMimeType(mediaType) {
    const types = {
      'image': 'image/jpeg',
      'pdf': 'application/pdf',
      'video': 'video/mp4'
    };
    return types[mediaType] || 'application/octet-stream';
  }

  // Format the event list as required for the client
  function formatEventList(events, withIndex = true) {
    let response = '';
    events.forEach((event) => {
      if (withIndex) {
        response += ` ${event.eventIndex}. `;
      }
      response += `${event.title}\n`;
      response += `( ${event.date.toLocaleDateString('en-IN')}`;
      if (event.time) response += ` - ${event.time} )\n`;
      if (event.address) response += `${event.address}\n`;
      if (event.organizer) response += `आयोजक: ${event.organizer}\n`;
      if (event.contactPhone) response += `संपर्क: ${event.contactPhone}\n`;
      if (event.mediaUrls) response += `Link: ${event.mediaUrls}\n`;
      response += '\n';
    });
    return response;
  }

  // Process query with AI to get intended Keyword according to user input
  async function classifyQueryWithAI(query) {
    try {
      const prompt = `
      Analyze this user query about events and classify it into exactly one of these standard categories:
      - "today": For queries about today's events (e.g., "aaj ke karyakram", "आज क्या है")
      - "upcoming": For queries about future events (e.g., "aane wale programs", "भविष्य के कार्यक्रम")
      - "search": For general search queries (e.g., "bhajan sandhya khoje", "भजन संध्या के बारे में जानकारी")
      - "update": For requests to modify events 
      - "delete": For requests to remove events 
      - "event_index": When query is just a number (event index)
      - "date": When query contains a specific date (e.g., "15/08/2024 ko kya hai")
      - "confirm": For positive confirmations (yes, haan, हाँ, सही है)
      - "cancel": For negative responses (no, nahi, नहीं, रद्द करो)
      - "unknown": If none of the above match

      Respond ONLY with the category keyword from the list above. No other text or explanation.

      Query: "${query}"
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response.text();
      return response.trim().toLowerCase();
    } catch (error) {
      console.error('AI classification error:', error);
      return 'unknown';
    }
  }

  // Fetch the type of Query for Events
async function queryEvents(query, phone, isAdmin = false, followUpContext = null) {
    console.log('\x1b[35m%s\x1b[0m', '🔍 Event Query Process Started:');
    console.log('\x1b[33m%s\x1b[0m', `Query: "${query}"`);
    console.log('\x1b[33m%s\x1b[0m', `Phone: ${phone}`);
    console.log('\x1b[33m%s\x1b[0m', `Is Admin: ${isAdmin}`);

    try {
        // First get AI classification
        const aiCategory = await classifyQueryWithAI(query);
        console.log('\x1b[36m%s\x1b[0m', `AI Classification: ${aiCategory}`);

        // ===== CRITICAL FIX: Handle follow-up context BEFORE numeric checks =====
        if (followUpContext) {
            console.log('\x1b[36m%s\x1b[0m', '📝 Processing follow-up context:', followUpContext);

            if (aiCategory === 'confirm' || query.match(/yes|haan|हाँ|confirm|पक्का/i)) {
                if (followUpContext.action === 'update') {
                    const updatedEvent = await Event.findByIdAndUpdate(
                        followUpContext.eventId,
                        followUpContext.updates,
                        { new: true }
                    );
                    return {
                        type: 'update',
                        event: updatedEvent,
                        message: `कार्यक्रम #${updatedEvent.eventIndex} अपडेट हो गया:\n` +
                            `नया नाम: ${updatedEvent.title}\n` +
                            `तारीख: ${updatedEvent.date.toLocaleDateString('en-IN')}\n` +
                            `समय: ${updatedEvent.time || 'निर्धारित नहीं'}\n` +
                            `स्थान: ${updatedEvent.address || 'निर्धारित नहीं'}`
                    };
                }
                else if (followUpContext.action === 'delete') {
                    const deletedEvent = await Event.findByIdAndDelete(followUpContext.eventId);
                    return {
                        type: 'delete',
                        message: `कार्यक्रम हटा दिया गया:\n${deletedEvent.title} (${deletedEvent.date.toLocaleDateString('en-IN')})`
                    };
                }
            }
            else if (aiCategory === 'cancel' || query.match(/no|nahi|नहीं|cancel|रद्द/i)) {
                return { message: 'कार्यवाही रद्द कर दी गई है।' };
            }
            else if (followUpContext.action === 'select_event') {
                const selectedIndex = parseInt(query) - 1;
                if (isNaN(selectedIndex)) {
                    return {
                        error: 'कृपया एक वैध संख्या दर्ज करें।',
                        events: followUpContext.events,
                        showIndexes: true,
                        followUpContext // Maintain context for retry
                    };
                }

                if (selectedIndex < 0 || selectedIndex >= followUpContext.events.length) {
                    return {
                        error: `अमान्य क्रमांक। कृपया 1 से ${followUpContext.events.length} के बीच चुनें।`,
                        events: followUpContext.events,
                        showIndexes: true,
                        followUpContext
                    };
                }

                const selectedEvent = followUpContext.events[selectedIndex];

                if (followUpContext.nextAction === 'update') {
                    return {
                        type: 'update_prompt',
                        event: selectedEvent,
                        message: `आपने चुना: ${selectedEvent.title}\n\n` +
                            `क्या अपडेट करना चाहते हैं?\n` +
                            `1. तारीख (वर्तमान: ${selectedEvent.date.toLocaleDateString('en-IN')})\n` +
                            `2. समय (वर्तमान: ${selectedEvent.time || 'निर्धारित नहीं'})\n` +
                            `3. स्थान (वर्तमान: ${selectedEvent.address || 'निर्धारित नहीं'})\n\n` +
                            `अपना विकल्प भेजें (1, 2, या 3) या "रद्द" भेजें।`,
                        followUpContext: {
                            action: 'update_field',
                            eventId: selectedEvent._id
                        }
                    };
                }
                else if (followUpContext.nextAction === 'delete') {
                    return {
                        type: 'confirmation',
                        followUpContext: {
                            action: 'delete',
                            eventId: selectedEvent._id
                        },
                        message: `क्या आप वाकई इस कार्यक्रम को हटाना चाहते हैं?\n\n` +
                            `${selectedEvent.title} (${selectedEvent.date.toLocaleDateString('en-IN')})\n\n` +
                            `पुष्टि के लिए "हाँ" या रद्द करने के लिए "नहीं" भेजें।`
                    };
                }
            }

            else if (followUpContext.action === 'update_field') {
                const event = await Event.findById(followUpContext.eventId);
                if (!event) {
                    return { error: 'कार्यक्रम नहीं मिला। कृपया पुनः प्रयास करें।' };
                }

                if (query === '1') {
                    return {
                        type: 'update_prompt',
                        followUpContext: {
                            ...followUpContext,
                            field: 'date'
                        },
                        message: 'नई तारीख भेजें (DD/MM/YYYY):'
                    };
                }
                else if (query === '2') {
                    return {
                        type: 'update_prompt',
                        followUpContext: {
                            ...followUpContext,
                            field: 'time'
                        },
                        message: 'नया समय भेजें (HH:MM AM/PM):'
                    };
                }
                else if (query === '3') {
                    return {
                        type: 'update_prompt',
                        followUpContext: {
                            ...followUpContext,
                            field: 'address'
                        },
                        message: 'नया स्थान भेजें:'
                    };
                }
                else if (aiCategory === 'cancel') {
                    return { message: 'अपडेट रद्द कर दिया गया।' };
                }
                else {
                    // Handle actual field updates
                    const updates = {};
                    let validationError = null;

                    if (followUpContext.field === 'date') {
                        const dateMatch = query.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
                        if (!dateMatch) {
                            validationError = 'अमान्य तारीख प्रारूप। कृपया DD/MM/YYYY प्रारूप में भेजें।';
                        } else {
                            updates.date = parseDate(dateMatch[1]);
                        }
                    }
                    else if (followUpContext.field === 'time') {
                        updates.time = query;
                    }
                    else if (followUpContext.field === 'address') {
                        updates.address = query;
                    }

                    if (validationError) {
                        return {
                            error: validationError,
                            followUpContext
                        };
                    }

                    const updatedEvent = await Event.findByIdAndUpdate(
                        followUpContext.eventId,
                        updates,
                        { new: true }
                    );

                    return {
                        type: 'update',
                        event: updatedEvent,
                        message: `${followUpContext.field === 'date' ? 'तारीख' :
                            followUpContext.field === 'time' ? 'समय' : 'स्थान'} अपडेट हो गया!\n\n` +
                            `नया विवरण:\n` +
                            `कार्यक्रम - ${updatedEvent.title}\n` +
                            `तारीख - ${updatedEvent.date.toLocaleDateString('en-IN')}\n` +
                            `समय - ${updatedEvent.time || 'निर्धारित नहीं'}\n` +
                            `स्थान - ${updatedEvent.address || 'निर्धारित नहीं'}`
                    };
                }
            }
        }

        // ===== Numeric event index lookup (only if no follow-up context) =====
        const indexNumber = parseInt(query);
        if (!isNaN(indexNumber)) {
            console.log('\x1b[36m%s\x1b[0m', `🔍 Searching for event with index: ${indexNumber}`);
            const event = await Event.findOne({ eventIndex: indexNumber });

            if (event) {
                return {
                    type: 'single_event',
                    event,
                    message: ` # ${event.eventIndex}:\n\n` +
                        `कार्यक्रम: ${event.title}\n` +
                        `तारीख: ${event.date.toLocaleDateString('en-IN')}\n` +
                        `समय: ${event.time || 'निर्धारित नहीं'}\n` +
                        `स्थान: ${event.address || 'निर्धारित नहीं'}\n` +
                        `आयोजक: ${event.organizer || 'निर्धारित नहीं'}\n` +
                        `संपर्क: ${event.contactPhone || 'निर्धारित नहीं'}`
                };
            } else {
                return {
                    type: 'error',
                    message: `कार्यक्रम #${indexNumber} नहीं मिला।`
                };
            }
        }

        // ===== Admin Commands =====
        if (isAdmin) {
            if (aiCategory === 'update') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const events = await Event.find({
                    date: { $gte: today }
                }).sort({ date: 1, time: 1 });

                if (events.length === 0) {
                    return { error: 'कोई आगामी कार्यक्रम नहीं मिला जिसे अपडेट किया जा सके।' };
                }

                return {
                    type: 'event_selection',
                    events,
                    message: `किस कार्यक्रम को अपडेट करना चाहते हैं? क्रमांक भेजें:\n\n` +
                        `${formatEventList(events)}\n\n` +
                        `या "रद्द" भेजें।`,
                    followUpContext: {
                        action: 'select_event',
                        events,
                        nextAction: 'update'
                    },
                    showIndexes: true
                };
            }
            else if (aiCategory === 'delete') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const events = await Event.find({
                    date: { $gte: today }
                }).sort({ date: 1, time: 1 });

                if (events.length === 0) {
                    return { error: 'कोई आगामी कार्यक्रम नहीं मिला जिसे हटाया जा सके।' };
                }

                return {
                    type: 'event_selection',
                    events,
                    message: `किस कार्यक्रम को हटाना चाहते हैं? क्रमांक भेजें:\n\n` +
                        `${formatEventList(events)}\n\n` +
                        `या "रद्द" भेजें।`,
                    followUpContext: {
                        action: 'select_event',
                        events,
                        nextAction: 'delete'
                    },
                    showIndexes: true
                };
            }
        }

        // ===== Event Queries =====
        if (aiCategory === 'today') {
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
                    ? `आज के कार्यक्रम:\n\n${formatEventList(events)}`
                    : 'आज के लिए कोई कार्यक्रम निर्धारित नहीं है।'
            };
        }
        else if (aiCategory === 'upcoming') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const events = await Event.find({
                date: { $gte: today },
            })
                .sort({ date: 1, time: 1 })
                .limit(10);

            return {
                type: 'upcoming',
                events,
                message: events.length > 0
                    ? `आगामी कार्यक्रम:\n\n${formatEventList(events)}`
                    : 'कोई आगामी कार्यक्रम नहीं मिला।'
            };
        }
        else if (aiCategory === 'date') {
            const dateMatch = query.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            if (dateMatch) {
                const [day, month, year] = dateMatch[0].split('/');
                const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
                const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

                const events = await Event.find({
                    date: { $gte: startDate, $lte: endDate },
                }).sort({ time: 1 });

                return {
                    type: 'date',
                    date: `${day}/${month}/${year}`,
                    events,
                    message: events.length > 0
                        ? `${day}/${month}/${year} के कार्यक्रम:\n\n${formatEventList(events)}`
                        : `${day}/${month}/${year} को कोई कार्यक्रम नहीं मिला।`
                };
            }
        }
        else if (aiCategory === 'search') {
            return {
                type: 'search_prompt',
                message: 'किस प्रकार के कार्यक्रम खोज रहे हैं? कीवर्ड भेजें:',
            };
        }

        // ===== General Search Fallback =====
        const searchEvents = await Event.find({
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { description: { $regex: query, $options: 'i' } },
                { address: { $regex: query, $options: 'i' } },
                { organizer: { $regex: query, $options: 'i' } }
            ]
        }).sort({ date: 1 });

        return {
            type: 'search',
            query,
            events: searchEvents,
            message: searchEvents.length > 0
                ? `"${query}" से मिलते-जुलते कार्यक्रम:\n\n${formatEventList(searchEvents)}`
                : `"${query}" से कोई कार्यक्रम नहीं मिला।`
        };

    } catch (error) {
        console.error('\x1b[31m%s\x1b[0m', '❌ Error in queryEvents:', error);
        return { error: 'कार्यक्रम खोजने में त्रुटि। कृपया पुनः प्रयास करें।' };
    }
}
  // Helper function to parse date strings
  function parseDate(dateString) {
    const [day, month, year] = dateString.split('/');
    return new Date(Date.UTC(year, month - 1, day));
  }

    function getMediaType(contentType) {
    if (contentType.startsWith('image/')) return 'image';
    if (contentType === 'application/pdf') return 'pdf';
    if (contentType.startsWith('video/')) return 'video';
    return null;
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
        if (!adminPhone) {
          console.error('ADMIN_PHONE_NUMBER not set in environment variables');
          return;
        }

        if (events.length > 0) {
          let message = `🌞 सुप्रभात! आज के कार्यक्रम:\n\n${formatEventList(events)}\n\nधन्यवाद!`;
          await sendWhatsAppMessage(adminPhone, message);
        } else {
          let message = `🌞 सुप्रभात! आज के लिए कोई कार्यक्रम नहीं है।`;
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


  async function sendWhatsAppMessage(to, body, quickReplies = null) {
    try {
      if (!process.env.TWILIO_WHATSAPP_NUMBER) {
        throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is not set');
      }

      if (!to) {
        throw new Error('Recipient phone number is required');
      }

      const messagePayload = {
        body: body,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${to}`
      };

      if (quickReplies) {
        messagePayload.persistentAction = quickReplies.actions.map(action => `reply:${action.reply}`);
      }

      console.log('\x1b[36m%s\x1b[0m', `📱 Sending message to ${to} from ${process.env.TWILIO_WHATSAPP_NUMBER}`);
      const result = await twilio.messages.create(messagePayload);
      console.log('\x1b[32m%s\x1b[0m', `✓ Message sent successfully. SID: ${result.sid}`);
      return result;
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', '❌ Error sending WhatsApp message:', error);
      throw error; // Re-throw to handle it in the calling function
    }
  }

  async function sendReminder(event) {
    try {
      const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER;
      if (!ADMIN_PHONE) throw new Error('Admin phone not configured');

      const reminderMessage = `🔔 Reminder: \n\n` + `${formatEventList(event)}\n\n`;
      await sendWhatsAppMessage(ADMIN_PHONE, reminderMessage);
      await Event.findByIdAndUpdate(event._id, { reminderSent: true });
      
      console.log(`[${new Date().toISOString()}] Sent reminder for: ${event._id}`);
    } catch (error) {
      console.error(`[ERROR] Failed to send reminder for ${event._id}:`, error.message);
    }
  }

  // Scheduled Remider before one hour of each event
  async function scheduleEventReminders() {
    const now = new Date();
    const nextHourMark = new Date(now.getTime() + 60 * 60 * 1000);

    // Find the next event needing a reminder
    const nextEvent = await Event.findOne({
      date: { $gte: nextHourMark },
      reminderSent: false,
      status: 'confirmed'
    }).sort({ date: 1 });

    if (nextEvent) {
      const delay = nextEvent.date.getTime() - now.getTime() - 60 * 60 * 1000;
      setTimeout(async () => {
        await sendReminder(nextEvent);
        scheduleEventReminders(); // Schedule the next one
      }, delay);
    }
  }

  // Template CRUD Operations
  app.post('/api/templates', async (req, res) => {
    try {
      const { name, content, category, variables, createdBy } = req.body;

      if (!name || !content) {
        return res.status(400).json({ error: 'टेम्पलेट का नाम और सामग्री आवश्यक है' });
      }

      const template = new MessageTemplate({
        name,
        content,
        category,
        variables,
        createdBy,
        updatedAt: new Date()
      });

      await template.save();
      res.status(201).json({
        ...template.toObject(),
        message: 'टेम्पलेट सफलतापूर्वक बनाया गया'
      });
    } catch (error) {
      console.error('टेम्पलेट बनाने में त्रुटि:', error);
      res.status(500).json({ error: 'टेम्पलेट बनाने में विफल' });
    }
  });

  app.get('/api/templates', async (req, res) => {
    try {
      const { category, isActive } = req.query;
      const query = {};

      if (category) query.category = category;
      if (isActive !== undefined) query.isActive = isActive === 'true';

      const templates = await MessageTemplate.find(query)
        .sort({ updatedAt: -1 });
      res.json({
        templates,
        message: 'टेम्पलेट सफलतापूर्वक प्राप्त किए गए'
      });
    } catch (error) {
      console.error('टेम्पलेट प्राप्त करने में त्रुटि:', error);
      res.status(500).json({ error: 'टेम्पलेट प्राप्त करने में विफल' });
    }
  });

  app.get('/api/templates/:id', async (req, res) => {
    try {
      const template = await MessageTemplate.findById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
      }
      res.json({
        template,
        message: 'टेम्पलेट सफलतापूर्वक प्राप्त किया गया'
      });
    } catch (error) {
      console.error('टेम्पलेट प्राप्त करने में त्रुटि:', error);
      res.status(500).json({ error: 'टेम्पलेट प्राप्त करने में विफल' });
    }
  });

  app.put('/api/templates/:id', async (req, res) => {
    try {
      const { name, content, category, variables, isActive } = req.body;
      const updateData = {
        ...(name && { name }),
        ...(content && { content }),
        ...(category && { category }),
        ...(variables && { variables }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      };

      const template = await MessageTemplate.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true }
      );

      if (!template) {
        return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
      }

      res.json({
        template,
        message: 'टेम्पलेट सफलतापूर्वक अपडेट किया गया'
      });
    } catch (error) {
      console.error('टेम्पलेट अपडेट करने में त्रुटि:', error);
      res.status(500).json({ error: 'टेम्पलेट अपडेट करने में विफल' });
    }
  });

  app.delete('/api/templates/:id', async (req, res) => {
    try {
      const template = await MessageTemplate.findByIdAndDelete(req.params.id);
      if (!template) {
        return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
      }
      res.status(204).json({ message: 'टेम्पलेट सफलतापूर्वक हटा दिया गया' });
    } catch (error) {
      console.error('टेम्पलेट हटाने में त्रुटि:', error);
      res.status(500).json({ error: 'टेम्पलेट हटाने में विफल' });
    }
  });

  // Helper function to process template with variables
  function processTemplate(template, variables) {
    let processedContent = template.content;

    // Replace variables in the template
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedContent = processedContent.replace(regex, value);
    }

    return processedContent;
  }

  // Modify the message scheduling endpoint to support templates with Hindi messages
  app.post('/api/messages/send', async (req, res) => {
    const { message, users, scheduledTime, campaign, audience, templateId, templateVariables } = req.body;

    if (!message && !templateId) {
      return res.status(400).json({ error: 'या तो संदेश या टेम्पलेट आईडी आवश्यक है' });
    }

    try {
      let finalMessage = message;

      // If template is provided, process it
      if (templateId) {
        const template = await MessageTemplate.findById(templateId);
        if (!template) {
          return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
        }

        if (!template.isActive) {
          return res.status(400).json({ error: 'टेम्पलेट सक्रिय नहीं है' });
        }

        // Validate required variables
        const requiredVars = template.variables.filter(v => v.required);
        const missingVars = requiredVars.filter(v => !templateVariables?.[v.name]);

        if (missingVars.length > 0) {
          return res.status(400).json({
            error: 'आवश्यक चर गायब हैं',
            missing: missingVars.map(v => v.name)
          });
        }

        // Process template with variables
        finalMessage = processTemplate(template, templateVariables);
      }

      // Continue with existing message scheduling logic...
      const scheduleDate = scheduledTime ? new Date(scheduledTime) : new Date();
      if (isNaN(scheduleDate.getTime())) {
        return res.status(400).json({ error: 'अमान्य निर्धारित समय' });
      }

      const scheduledMessage = new ScheduledMessage({
        message: finalMessage,
        users,
        scheduledTime: scheduleDate,
        status: 'scheduled',
        campaign: campaign || 'general',
        audience: audience || 'all',
        results: [],
        templateId: templateId || null
      });

      await scheduledMessage.save();

      const sendMessages = async () => {
        const results = [];
        let allSuccessful = true;

        // Get all users based on audience type
        let targetUsers = [];
        if (audience === 'all') {
          targetUsers = await User.find();
        } else if (audience === 'supporters') {
          targetUsers = await User.find({ isSupporter: true });
        } else if (audience === 'new') {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          targetUsers = await User.find({ lastInteraction: { $gte: thirtyDaysAgo } });
        }

        // Send messages to each user
        for (const user of targetUsers) {
          try {
            // Check if user has opted out
            if (user.optOut) {
              results.push({
                phone: user.phone,
                status: 'skipped',
                error: 'User has opted out'
              });
              continue;
            }

            // Send message
            await twilio.messages.create({
              body: finalMessage,
              from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
              to: `whatsapp:${user.phone}`
            });

            // Log successful message
            results.push({ phone: user.phone, status: 'sent' });

            // Update user's last interaction
            await User.findByIdAndUpdate(user._id, {
              lastInteraction: new Date()
            });

          } catch (err) {
            console.error(`Error sending message to ${user.phone}:`, err);
            results.push({
              phone: user.phone,
              status: 'failed',
              error: err.message
            });
            allSuccessful = false;
          }

          // Add delay between messages to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Update scheduled message status
        await ScheduledMessage.findByIdAndUpdate(scheduledMessage._id, {
          status: allSuccessful ? 'sent' : 'failed',
          results,
          completedAt: new Date()
        });

        // Log completion
        console.log(`Campaign ${campaign || 'general'} completed with ${results.length} messages`);
      };

      // Schedule or send immediately
      if (scheduleDate > new Date()) {
        const delay = scheduleDate.getTime() - Date.now();
        console.log(`संदेश निर्धारित किया गया: ${scheduleDate.toISOString()}`);
        setTimeout(sendMessages, delay);
        return res.json({
          status: 'scheduled',
          scheduledAt: scheduleDate,
          messageId: scheduledMessage._id,
          targetAudience: audience || 'all',
          estimatedRecipients: users.length,
          message: 'संदेश सफलतापूर्वक निर्धारित किया गया'
        });
      }

      // Send immediately
      await sendMessages();
      const updated = await ScheduledMessage.findById(scheduledMessage._id);
      res.json({
        ...updated.toObject(),
        message: 'संदेश सफलतापूर्वक भेजा गया'
      });

    } catch (error) {
      console.error('संदेश निर्धारित करने में त्रुटि:', error);
      res.status(500).json({ error: 'संदेश निर्धारित करने में विफल' });
    }
  });

  // Update message status endpoint with Hindi messages
  app.get('/api/messages/:id/status', async (req, res) => {
    try {
      const message = await ScheduledMessage.findById(req.params.id);
      if (!message) {
        return res.status(404).json({ error: 'संदेश नहीं मिला' });
      }
      res.json({
        status: message.status,
        scheduledTime: message.scheduledTime,
        completedAt: message.completedAt,
        results: message.results,
        campaign: message.campaign,
        audience: message.audience,
        message: 'संदेश स्थिति सफलतापूर्वक प्राप्त की गई'
      });
    } catch (error) {
      res.status(500).json({ error: 'संदेश स्थिति प्राप्त करने में विफल' });
    }
  });

  // Update cancel message endpoint with Hindi messages
  app.post('/api/messages/:id/cancel', async (req, res) => {
    try {
      const message = await ScheduledMessage.findById(req.params.id);
      if (!message) {
        return res.status(404).json({ error: 'संदेश नहीं मिला' });
      }
      if (message.status !== 'scheduled') {
        return res.status(400).json({ error: 'केवल निर्धारित संदेशों को रद्द किया जा सकता है' });
      }

      message.status = 'cancelled';
      message.results.push({
        status: 'cancelled',
        error: 'उपयोगकर्ता द्वारा रद्द किया गया',
        timestamp: new Date()
      });

      await message.save();
      res.json({
        status: 'cancelled',
        messageId: message._id,
        message: 'संदेश सफलतापूर्वक रद्द किया गया'
      });
    } catch (error) {
      console.error('संदेश रद्द करने में त्रुटि:', error);
      res.status(500).json({ error: 'संदेश रद्द करने में विफल' });
    }
  });

  app.post('/webhook', async (req, res) => {
    const from = req.body.WaId || req.body.From;
    const text = req.body.Body || '';
    const twiml = new MessagingResponse();

    if (!from) return res.type('text/xml').send(twiml.toString());


    try {
      console.log('\x1b[35m%s\x1b[0m', '📨 Incoming Message:');
      console.log('\x1b[33m%s\x1b[0m', `From: ${from}`);
      console.log('\x1b[33m%s\x1b[0m', `Content: ${text}`);

      const normalizedPhone = from.replace(/\D/g, '');
      const isAdmin = normalizedPhone === process.env.ADMIN_PHONE_NUMBER.replace(/\D/g, '');

      if (isAdmin) {
        console.log('\x1b[32m%s\x1b[0m', '👤 Admin Message Detected');

        if (req.body.NumMedia > 0) {
          console.log('\x1b[36m%s\x1b[0m', `📎 Processing ${req.body.NumMedia} media file(s)`);

          const tempDir = path.join(__dirname, 'temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

          for (let i = 0; i < req.body.NumMedia; i++) {
            const mediaUrl = req.body[`MediaUrl${i}`];
            const contentType = req.body[`MediaContentType${i}`];
            const mediaType = getMediaType(contentType);

            console.log('\x1b[36m%s\x1b[0m', `📁 Processing ${mediaType} file...`);

            if (!mediaType) {
              console.error('\x1b[31m%s\x1b[0m', `❌ Unsupported file type: ${contentType}`);
              twiml.message(`Unsupported file type: ${contentType}`);
              continue;
            }

            const extension = mediaType === 'pdf' ? 'pdf' : mediaType === 'video' ? 'mp4' : 'jpg';
            const filePath = path.join(tempDir, `event-${Date.now()}.${extension}`);

            const { imageBBUrl } = await downloadMediaFile(mediaUrl, filePath);
            console.log('\x1b[32m%s\x1b[0m', '✓ File downloaded successfully');

            const eventDetails = await extractEventDetailsFromMedia(filePath, mediaType);
            fs.unlinkSync(filePath);
            console.log('\x1b[32m%s\x1b[0m', '✓ Temporary file cleaned up');

            if (eventDetails.error) {
              console.error('\x1b[31m%s\x1b[0m', `❌ Failed to process ${mediaType}:`, eventDetails.error);
              twiml.message(`Failed to process ${mediaType}: ${eventDetails.error}`);
              continue;
            }

            console.log('\x1b[32m%s\x1b[0m', `✓ Successfully extracted ${eventDetails.length} event(s)`);

            for (const eventData of eventDetails) {
              try {
                const eventIndex = await getNextEventIndex();
                console.log('\x1b[36m%s\x1b[0m', `Creating event with index: ${eventIndex}`);

                const newEvent = new Event({
                  title: eventData.title || 'Untitled Event',
                  description: eventData.description,
                  date: parseDate(eventData.date),
                  time: eventData.time,
                  address: eventData.address,
                  organizer: eventData.organizer,
                  contactPhone: eventData.contactPhone,
                  mediaUrls: imageBBUrl,
                  mediaType,
                  extractedText: JSON.stringify(eventData),
                  status: 'confirmed',
                  sourcePhone: from,
                  eventIndex: eventIndex
                });

                await newEvent.save();
                console.log('\x1b[32m%s\x1b[0m', `✓ कार्यक्रम सहेजा गया, अनुक्रमांक ${eventIndex}: ${eventData.title}`);
              } catch (error) {
                console.error('\x1b[31m%s\x1b[0m', '❌ कार्यक्रम सहेजने में त्रुटि:', error);
                twiml.message(`कार्यक्रम सहेजने में त्रुटि: ${error.message}`);
              }
            }
          }

          const confirmMsg = `✅ आपकी कार्यक्रम सेव किए गए हैं!\n`;

          await sendWhatsAppMessage(from, confirmMsg);

          twiml.message(`आपकी File को सफलतापूर्वक प्रोसेस किया गया है!`);
        } else if (text.trim()) {
          console.log(text);
          const result = await queryEvents(text, from, isAdmin, req.session?.followUpContext);
          if (result.error) {
            twiml.message(result.error);
          }
          else if (result.type === 'event_selection' || result.type === 'update_prompt') {
            // Store follow-up context in session
            req.session = req.session || {};
            req.session.followUpContext = result.followUpContext;

            // Create message
            const message = twiml.message(result.message);

            // Add quick replies if available (using Twilio's proper method)
            if (result.quickReplies) {
              const quickReplies = result.quickReplies.actions.map(action => action.reply);
              message.persistentAction(quickReplies.map(reply => `reply:${reply}`));
            }
          } else if (result.events) {
            let response = result.message;

            if (result.showIndexes) {
              response += `\n\nक्रमांक भेजकर चुनें या "रद्द" भेजें।`;
            }

            // Create message with the formatted event list
            twiml.message(response);
            // Store follow-up context if present
            if (result.followUpContext) {
              req.session = req.session || {};
              req.session.followUpContext = result.followUpContext;
            }
          } else {
            // Send the result message directly
            twiml.message(result.message || 'कोई परिणाम नहीं मिला');

            // Clear follow-up context if action is complete
            if (req.session?.followUpContext &&
              ['update', 'delete'].includes(result.type)) {
              delete req.session.followUpContext;
            }
          }
        } else {
          twiml.message('कृपया कोई कार्यक्रम की छवि/पीडीएफ/वीडियो या टेक्स्ट क्वेरी भेजें');
        }
      } else {
        let user = await User.findOne({ phone: normalizedPhone });
        let isNewUser = false;

        if (!user) {
          user = await User.create({
            phone: normalizedPhone,
            lastInteraction: new Date()
          });
          isNewUser = true;
        } else {
          await User.updateOne(
            { _id: user._id },
            { $set: { lastInteraction: new Date() } }
          );
        }

        let reply = '';
        if (isNewUser) {
          reply = 'नमस्ते! आपका स्वागत है. \n';
        }

        reply = getPredefinedReply(text);

        const result = await queryEvents(text, from, isAdmin, req.session?.followUpContext);

        if (result.error) {
          twiml.message(result.error);
        } else {
          // Send the result message directly for non-admin users
          twiml.message(result.message || 'कोई परिणाम नहीं मिला');
        }
      }
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', '❌ Webhook Error:', error);
      twiml.message('⚠️ एक त्रुटि हुई। कृपया पुनः प्रयास करें।');
    }

    // Send the TwiML response
    res.type('text/xml').send(twiml.toString());
  });

  // API Routes (remain the same as before)
  app.get('/api/events', async (req, res) => {
    try {
      const events = await Event.find().sort({ date: 1 });
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch events' });
    }
  });

  app.get('/api/users', async (req, res) => {
    try {
      const users = await User.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { phone, name } = req.body;

      if (!phone || !/^\d{10,15}$/.test(phone)) {
        return res.status(400).json({ error: 'Invalid phone number' });
      }

      const user = new User({ phone, name, lastInteraction: new Date() });
      await user.save();
      res.status(201).json(user);
    } catch (err) {
      if (err.code === 11000) {
        res.status(400).json({ error: 'Phone number already exists' });
      } else {
        res.status(500).json({ error: err.message });
      }
    }
  });

  app.put('/api/users/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndUpdate(req.params.id, req.body, {
        new: true
      });
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(user);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/users/:id', async (req, res) => {
    try {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      await Message.deleteMany({ user: user._id });
      res.status(204).send();
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/scheduled-messages', async (req, res) => {
    try {
      const messages = await ScheduledMessage.find({ hidden: false }).sort({
        scheduledTime: -1
      });
      res.json(messages);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      res.status(500).json({ error: 'Failed to fetch scheduled messages' });
    }
  });

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

  app.get('/api/cron-job', async (req, res) => {
    try {
      const message = "Hello from My Whataapp Bot Backend";
      res.json(message);
    }
    catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send messages' });
    }
  })

  // Add this helper function after the EventSchema definition
  async function getNextEventIndex() {
    try {
      const lastEvent = await Event.findOne({}, {}, { sort: { 'eventIndex': -1 } });
      const nextIndex = lastEvent ? lastEvent.eventIndex + 1 : 1;
      console.log('\x1b[36m%s\x1b[0m', `Next event index will be: ${nextIndex}`);
      return nextIndex;
    } catch (error) {
      console.error('\x1b[31m%s\x1b[0m', 'Error getting next event index:', error);
      return 1; // Fallback to 1 if there's an error
    }
  }

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', `📡 Server running on port ${PORT}`);
    console.log('\x1b[32m%s\x1b[0m', '✓ All systems operational');
    scheduleDailyNotifications();
    scheduleEventReminders();
  });