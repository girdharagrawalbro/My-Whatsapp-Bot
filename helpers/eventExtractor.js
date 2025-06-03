const fs = require('fs');
const xlsx = require('xlsx');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get MIME type
function getMimeType(mediaType) {
  const types = {
    'image': 'image/jpeg',
    'pdf': 'application/pdf',
    'video': 'video/mp4',
    'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  };
  return types[mediaType] || 'application/octet-stream';
}

// Main extractor function that handles all media types
async function extractEventDetailsFromMedia(filePath, mediaType) {
  try {
    // Handle Excel files differently
    if (mediaType === 'excel') {
      return await extractFromExcel(filePath);
    }

    // Handle text extraction from images/PDFs/videos using AI
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

    // const timeoutPromise = new Promise((_, reject) =>
    //   setTimeout(() => reject(new Error('Processing timeout after 2 minutes')), 120000)
    // );

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
5. तारीख में साल नी दिए होने पर 2025 ले |
6. यदि कोई स्पष्ट कार्यक्रम नहीं मिले: खाली ऑब्जेक्ट लौटाएं।
7. यदि विवाह/सगाई/आशीर्वाद/सुरुचि भोज कार्ड है, तो केवल "सुरुचि भोज", "आशीर्वाद समारोह", या "Reception" जैसे कार्यक्रमों से ही तिथि और समय लें — "पाणिग्रहण" या अन्य रस्मों की तिथि और समय न लें।`;


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
    let events = JSON.parse(jsonText);
    console.log('Successfully parsed events:', events);

    return Array.isArray(events) ? events.map(validateEvent) : [validateEvent(events)];
  } catch (error) {
    console.error(`Error processing ${mediaType}:`, error);
    return {
      error: `Failed to process ${mediaType}: ${error.message}`,
      details: error.stack
    };
  }
}

// Excel-specific extraction
async function extractFromExcel(filePath) {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    const events = [];
    for (const row of data) {
      const event = {
        title: row['Event Title'] || row['Title'] || row['कार्यक्रम'] || '',
        description: row['Description'] || row['Names'] || row['नाम'] || '',
        date: formatDate(row['Date'] || row['Event Date'] || row['तारीख'] || ''),
        time: formatTime(row['Time'] || row['Event Time'] || row['समय'] || ''),
        address: row['Address'] || row['Location'] || row['पता'] || '',
        organizer: row['Organizer'] || row['Host'] || row['आयोजक'] || '',
        contactPhone: row['Contact'] || row['Phone'] || row['फोन'] || ''
      };

      if (event.title && event.date) {
        events.push(validateEvent(event));
      }
    }
    return events;
  } catch (error) {
    console.error('Error processing Excel file:', error);
    throw error;
  }
}

// Common event validation
function validateEvent(event) {
  const required = ['title', 'date'];
  const missing = required.filter(field => !event[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Normalize for marriage-related events
  const marriageKeywords = ['विवाह', 'आशीर्वाद', 'सगाई', 'सुरुचि', 'भोज', 'marriage', 'wedding'];
  if (marriageKeywords.some(word => (event.title || '').toLowerCase().includes(word.toLowerCase()))) {
    event.title = 'विवाह';

    // Extract only names from description if possible
    if (event.description) {
      const nameMatch = event.description.match(/([^\s,]+)\s+(और|and)\s+([^\s,]+)/i);
      if (nameMatch) {
        event.description = `${nameMatch[1]} और ${nameMatch[3]}`;
      }
    }
  }

  return event;
}

// Helper functions for date/time formatting
function formatDate(dateStr) {
  if (!dateStr) return '';
  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('en-IN');
  }
  return dateStr; // return as-is if parsing fails
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  // Try to parse various time formats
  const time = new Date(`1970-01-01T${timeStr}`);
  if (!isNaN(time.getTime())) {
    return time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }
  return timeStr; // return as-is if parsing fails
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
  extractEventDetailsFromText: async (text) => {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `इस ${text} से कार्यक्रम का विवरण निकालें। केवल एक मुख्य कार्यक्रम का विवरण इस JSON प्रारूप में दें:
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
5. यदि कोई स्पष्ट कार्यक्रम नहीं मिले: खाली ऑब्जेक्ट लौटाएं।
6. यदि विवाह/सगाई/आशीर्वाद/सुरुचि भोज कार्ड है, तो केवल "सुरुचि भोज", "आशीर्वाद समारोह", या "Reception" जैसे कार्यक्रमों से ही तिथि और समय लें — "पाणिग्रहण" या अन्य रस्मों की तिथि और समय न लें।`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textResponse = response.text();
      const jsonText = textResponse.replace(/```json|```/g, '').trim();
      let events;
      try {
        events = JSON.parse(jsonText);
      } catch (e) {
        events = null; // or keep as raw text
      }
      return Array.isArray(events) ? events.map(validateEvent) : [validateEvent(events)];
    } catch (error) {
      console.error('Error extracting from text:', error);
      return [];
    }
  },
  formatEventList
};