const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send WhatsApp message via Twilio
 * @param {string} to - Recipient phone number in E.164 format
 * @param {string} body - Message text
 */
async function sendWhatsAppMessage(to, body) {
  try {
    if (!process.env.TWILIO_WHATSAPP_NUMBER) {
      throw new Error('TWILIO_WHATSAPP_NUMBER environment variable is not set');
    }
    if (!to) {
      throw new Error('Recipient phone number is required');
    }
    
    console.log('\x1b[36m%s\x1b[0m', `📱 Sending message to ${to} from ${process.env.TWILIO_WHATSAPP_NUMBER}`);
    await twilio.messages.create({
      body,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`,
    });
    console.log('\x1b[32m%s\x1b[0m', `✓ Message sent successfully. SID: ${result.sid}`);
    return result;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error sending WhatsApp message:', error);
    throw error;
  }
}

module.exports = { sendWhatsAppMessage };
