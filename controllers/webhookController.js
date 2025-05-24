const { MessagingResponse } = require('twilio').twiml;
const fs = require('fs');
const path = require('path');
const Event = require('../models/Event');
const User = require('../models/User');
const { extractEventDetailsFromMedia
} = require('../helpers/eventExtractor');

const { downloadMediaFile } = require('../helpers/mediaHandler')
const { getNextEventIndex, saveEvent } = require('../helpers/eventManager');
const { sendWhatsAppMessage } = require('../helpers/whatsappSender');
const { queryEvents } = require('../helpers/eventQuery');

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

          const extension = mediaType === 'pdf' ? 'pdf' : mediaType === 'video' ? 'mp4' : 'jpg';
          const filePath = path.join(tempDir, `event-${Date.now()}.${extension}`);
          const { imageBBUrl } = await downloadMediaFile(mediaUrl, filePath);

          const eventDetails = await extractEventDetailsFromMedia(filePath, mediaType);
          fs.unlinkSync(filePath);

          console.log(eventDetails)

          for (const eventData of eventDetails) {
            const index = await getNextEventIndex();
            await saveEvent({ eventData, imageBBUrl, mediaType, from, index });
          }
        }

        await sendWhatsAppMessage(from, `✅ आपकी फाइल प्रोसेस कर ली गई है!`);
        twiml.message(`✓ फ़ाइल प्रोसेस हो गई।`);
      } else if (text.trim()) {
        const result = await queryEvents(text, from, isAdmin, req.session?.followUpContext);
        if (result.error) {
          twiml.message(result.error);
        }
        else {
          twiml.message(result.message || 'कोई परिणाम नहीं मिला');
        }
      } else {
        twiml.message('कृपया कोई फ़ाइल या क्वेरी भेजें।');
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

      const greeting = isNewUser ? 'नमस्ते! आपका स्वागत है. \n' : '';
      const reply = greeting;
      const result = await queryEvents(text, from, isAdmin, req.session?.followUpContext);

      if (result.error) twiml.message(result.error);
      else twiml.message(result.message || reply);
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
  return null;
}