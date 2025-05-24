const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get MIME type
function getMimeType(mediaType) {
  const types = {
    'image': 'image/jpeg',
    'pdf': 'application/pdf',
    'video': 'video/mp4'
  };
  return types[mediaType] || 'application/octet-stream';
}

// Main extractor function
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
      console.log('Successfully parsed events:', events);
      // console.log('Successfully parsed events');
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

// Utility to format extracted events
function formatEventList(events, withIndex = true) {
  let response = '';
  events.forEach((event) => {
    if (withIndex && event.eventIndex) {
      response += ` ${event.eventIndex}. `;
    }
    response += `${event.title}\n( ${event.date}`;
    if (event.time) response += ` - ${event.time} )\n`;
    if (event.address) response += `${event.address}\n`;
    if (event.organizer) response += `आयोजक: ${event.organizer}\n`;
    if (event.contactPhone) response += `संपर्क: ${event.contactPhone}\n`;
    if (event.mediaUrls) response += `Link: ${event.mediaUrls}\n`;
    response += '\n';
  });
  return response;
}

module.exports = {
  extractEventDetailsFromMedia,
  formatEventList
};
