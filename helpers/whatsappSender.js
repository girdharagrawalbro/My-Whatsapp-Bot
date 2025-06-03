const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send WhatsApp message via Twilio (supports text, media, and buttons)
 * @param {string} to - Recipient phone number in E.164 format
 * @param {string} body - Message text
 * @param {string|null} mediaUrl - Optional media URL
 * @param {object|null} buttons - Optional buttons (quickReply + link)
 */
async function sendWhatsAppMessage(to, body, mediaUrl = null, buttons = null) {
  try {
    if (!process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is not set');
    }
    if (!to) {
      throw new Error('Recipient phone number is required');
    }

    const messageOptions = {
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    };

    if (buttons) {
      messageOptions.contentSid = buttons.templateSid; // Use your approved template SID
      messageOptions.contentVariables = JSON.stringify({
        1: body,
        2: buttons.quickReplyTitle,
        3: buttons.linkTitle,
        4: buttons.linkUrl,
      });
    } else if (mediaUrl) {
      messageOptions.body = body;
      messageOptions.mediaUrl = [mediaUrl];
    } else {
      messageOptions.body = body;
    }

    console.log('\x1b[36m%s\x1b[0m', `📱 Sending message to ${to}`);
    const result = await twilio.messages.create(messageOptions);
    console.log('\x1b[32m%s\x1b[0m', `✓ Message sent successfully. SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error sending WhatsApp message:', error.message);
    throw error;
  }
}

module.exports = { sendWhatsAppMessage };
