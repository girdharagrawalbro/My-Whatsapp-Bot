const { MessagingResponse } = require('twilio').twiml;
const fs = require('fs');
const path = require('path');
const Event = require('../models/Event');
const User = require('../models/User');
const { extractEventDetailsFromMedia, extractEventDetailsFromText, extractEventDetailsFromExcel } = require('../helpers/eventExtractor');
const { downloadMediaFile } = require('../helpers/mediaHandler');
const { getNextEventIndex, saveEvent } = require('../helpers/eventManager');
const { sendWhatsAppMessage } = require('../helpers/whatsappSender');
const { queryEvents } = require('../helpers/eventQuery');
const { generateEventPDF } = require('../helpers/generatePdf');

const adminPhone = process.env.ADMIN_PHONE_NUMBER;

exports.handleWebhook = async (req, res) => {
  const from = req.body.WaId || req.body.From;
  const text = req.body.Body || '';
  const twiml = new MessagingResponse();

  if (!from) return res.type('text/xml').send(twiml.toString());

  try {
    const normalizedPhone = from.replace(/\D/g, '');
    const isAdmin = normalizedPhone === process.env.ADMIN_PHONE_NUMBER.replace(/\D/g, '');

    // Admin flow
    if (isAdmin) {
      if (req.body.NumMedia > 0) {
        const tempDir = path.join(__dirname, '../temp');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

        for (let i = 0; i < req.body.NumMedia; i++) {
          const mediaUrl = req.body[`MediaUrl${i}`];
          const contentType = req.body[`MediaContentType${i}`];
          const mediaType = getMediaType(contentType);
          if (!mediaType) continue;

          const extension = getFileExtension(contentType);
          const filePath = path.join(tempDir, `event-${Date.now()}.${extension}`);
          const { mediaUrls } = await downloadMediaFile(mediaUrl, filePath);

          let eventDetails;

          eventDetails = await extractEventDetailsFromMedia(filePath, mediaType);

          fs.unlinkSync(filePath);

          for (const eventData of eventDetails) {
            const index = await getNextEventIndex();
            await saveEvent({ eventData, mediaUrls, mediaType, from, index });
          }
        }

        // twiml.message(`✅ ${req.body.NumMedia}कार्यक्रम सफलतापूर्वक जोड़े गए !`);
      } else if (text.trim()) {
        // Check if text contains event details
        const eventDetails = await extractEventDetailsFromText(text);
        if (eventDetails.length > 0) {
          for (const eventData of eventDetails) {
            const index = await getNextEventIndex();
            await saveEvent({ eventData, from, index });
          }
          twiml.message(`✅ ${eventDetails.length} कार्यक्रम सफलतापूर्वक जोड़े गए !`);
        } else {
          // Fall back to query if no events found in text
          const result = await queryEvents(text, from, isAdmin, req.session?.followUpContext);

          if (result.error) {
            twiml.message(result.error);
          } else if (result.events.length > 0) {
            const { longUrl } = await generateEventPDF(result.events, today = false);
            console.log(longUrl)
            await sendWhatsAppMessage(adminPhone, result.message, longUrl);
          }
          else {
            twiml.message(result.message || 'कोई परिणाम नहीं मिला');
          }
        }
      } else {
        twiml.message('कृपया कार्यक्रम विवरण के साथ एक फ़ाइल (छवि/पीडीएफ/वीडियो/एक्सेल) या text भेजें।');
      }
    }
    // User flow
    else {
      let user = await User.findOne({ phone: normalizedPhone });
      let isNewUser = false;

      if (!user) {
        user = await User.create({ phone: normalizedPhone, lastInteraction: new Date() });
        isNewUser = true;
      } else {
        await User.findByIdAndUpdate(user._id, { lastInteraction: new Date() });
      }

      const greeting = isNewUser ? 'नमस्ते! आपका स्वागत है. \n' : 'नमस्ते! आपका स्वागत है';

      twiml.message(greeting);
    }

  } catch (err) {
    console.error('Webhook Error:', err);
    twiml.message('⚠️ एक त्रुटि हुई। कृपया पुनः प्रयास करें।');
  }

  res.type('text/xml').send(twiml.toString());
};


function getMediaType(contentType) {
  if (contentType.startsWith('image/')) return 'image';
  if (contentType === 'application/pdf') return 'pdf';
  if (contentType.startsWith('video/')) return 'video';
  if (contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'excel';
  return null;
}

function getFileExtension(contentType) {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx'
  };
  return extensions[contentType] || 'bin';
}