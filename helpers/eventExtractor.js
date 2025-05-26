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

    const fileData = await fs.promises.readFile(filePath);
    const base64Data = fileData.toString('base64');

    let mimeType;
    try {
      switch (mediaType) {
        case 'image':
        case 'video':
          const { fileTypeFromBuffer } = await import('file-type');
          const detectedType = await fileTypeFromBuffer(fileData);
          mimeType = detectedType ? detectedType.mime : getMimeType(mediaType);
          break;
        case 'pdf':
          mimeType = 'application/pdf';
          break;
        default:
          throw new Error(`Unsupported media type: ${mediaType}`);
      }
    } catch (error) {
      console.error('Error detecting file type:', error);
      mimeType = getMimeType(mediaType);
    }

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Processing timeout after 2 minutes')), 120000)
    );

    const prompt = `इस ${mediaType} से कार्यक्रम का विवरण निकालें। केवल एक मुख्य कार्यक्रम का विवरण इस JSON प्रारूप में दें:
{
  "title": "कार्यक्रम का शीर्षक (यदि यह शादी, सगाई, आशीर्वाद या सुरुचि भोज है तो हमेशा 'विवाह' लिखें, अन्यथा कार्यक्रम के प्रकार जैसे 'जन्मदिन', 'मुंडन', 'गृह प्रवेश', 'नामकरण', 'सेवानिवृत्ति' आदि लिखें)",
  "description": "कार्यक्रम से संबंधित व्यक्ति/व्यक्तियों का नाम स्पष्ट रूप से लिखें, नीचे दिए गए नियमों के अनुसार",
  "date": "DD/MM/YYYY",
  "time": "HH:MM (AM/PM)",
  "address": "कार्यक्रम का पता",
  "organizer": "आयोजक का नाम",
  "contactPhone": "संपर्क फोन नंबर"
}

विशेष नियम:
1. यदि कार्ड विवाह/सगाई/आशीर्वाद/सुरुचि भोज से संबंधित है तो 'title' हमेशा 'विवाह' होना चाहिए।
2. 'description' में केवल वर और वधु का नाम हो, केवल 'और' से जुड़ा हो। कोई अन्य विवरण न हो। जैसे: "राहुल और प्रिया"
3. अन्य कार्यक्रमों के लिए 'title' कार्यक्रम के प्रकार के अनुसार हो और 'description' में निम्न स्वरूप अपनाएं:
   - जन्मदिन: "नाम का जन्मदिन"
   - मुंडन: "नाम का मुंडन"
   - गृह प्रवेश: "नाम/परिवार का गृह प्रवेश"
   - नामकरण: "नाम का नामकरण"
   - सेवानिवृत्ति: "नाम की सेवानिवृत्ति"
4. एकाधिक कार्यक्रम होने पर: केवल अंतिम (latest) कार्यक्रम का विवरण दें।
5. यदि कोई स्पष्ट कार्यक्रम नहीं मिले: खाली ऑब्जेक्ट लौटाएं।`;

    const result = await Promise.race([
      model.generateContent([
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType
          }
        },
        prompt
      ]),
      timeoutPromise
    ]);

    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json|```/g, '').trim();

    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}') + 1;

    if (startIndex === -1 || endIndex === 0) {
      console.error('No JSON object found in response:', text);
      throw new Error('No valid JSON object found in AI response');
    }

    const jsonText = text.substring(startIndex, endIndex);

    let events;
    try {
      events = JSON.parse(jsonText);
      console.log('Successfully parsed events:', events);
    } catch (e) {
      console.error('Failed to parse AI response:', jsonText);
      throw new Error('Failed to parse AI response as JSON');
    }

    const validateEvent = (event) => {
      const required = ['title', 'date'];
      const missing = required.filter(field => !event[field]);
      if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
      }

      // Normalize for marriage-related events
      const marriageKeywords = ['विवाह', 'आशीर्वाद', 'सगाई', 'सुरुचि', 'भोज'];
      if (marriageKeywords.some(word => (event.title || '').includes(word))) {
        event.title = 'विवाह';

        // Extract only names from description if possible
        if (event.description) {
          const nameMatch = event.description.match(/([^\s,]+)\s+और\s+([^\s,]+)/); // e.g., "राज और राधा"
          if (nameMatch) {
            event.description = `${nameMatch[1]} और ${nameMatch[2]}`;
          }
        }
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

// Utility to format extracted events
function formatEventList(events, withIndex = true) {
  let response = '';
  events.forEach((event, index) => {
    if (withIndex) response += ` ${index + 1}. `;
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
