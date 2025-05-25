const ScheduledMessage = require('../models/ScheduledMessage');
const MessageTemplate = require('../models/MessageTemplate');
const User = require('../models/User');
const { processTemplate } = require('../helpers/templateProcessor');
const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

// POST /api/messages/send
exports.sendMessage = async (req, res) => {
  const { message, users, scheduledTime, campaign, audience, templateId, templateVariables } = req.body;
  if (!message && !templateId) {
    return res.status(400).json({ error: 'या तो संदेश या टेम्पलेट आईडी आवश्यक है' });
  }

  try {
    let finalMessage = message;

    if (templateId) {
      const template = await MessageTemplate.findById(templateId);
      if (!template) return res.status(404).json({ error: 'टेम्पलेट नहीं मिला' });
      if (!template.isActive) return res.status(400).json({ error: 'टेम्पलेट सक्रिय नहीं है' });

      const requiredVars = template.variables.filter(v => v.required);
      const missingVars = requiredVars.filter(v => !templateVariables?.[v.name]);

      if (missingVars.length > 0) {
        return res.status(400).json({
          error: 'आवश्यक चर गायब हैं',
          missing: missingVars.map(v => v.name)
        });
      }

      finalMessage = processTemplate(template, templateVariables);
    }

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
      for (const user of users) {
        try {
          if (user.optOut) {
            results.push({ phone: user, status: 'skipped', error: 'User has opted out' });
            continue;
          }

          await twilio.messages.create({
            body: finalMessage,
            from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
            to: `whatsapp:${user}`
          });

          results.push({ phone: user.phone, status: 'sent' });
          await User.findByIdAndUpdate(user._id, { lastInteraction: new Date() });

        } catch (err) {
          console.error(`Error sending message to ${user.phone}:`, err);
          results.push({ phone: user.phone, status: 'failed', error: err.message });
          allSuccessful = false;
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await ScheduledMessage.findByIdAndUpdate(scheduledMessage._id, {
        status: allSuccessful ? 'sent' : 'failed',
        results,
        completedAt: new Date()
      });

      console.log(`Campaign ${campaign || 'general'} completed with ${results.length} messages`);
    };

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

    await sendMessages();
    const updated = await ScheduledMessage.findById(scheduledMessage._id);
    res.json({ ...updated.toObject(), message: 'संदेश सफलतापूर्वक भेजा गया' });

  } catch (error) {
    console.error('संदेश निर्धारित करने में त्रुटि:', error);
    res.status(500).json({ error: 'संदेश निर्धारित करने में विफल' });
  }
};

// GET /api/messages/:id/status
exports.getMessageStatus = async (req, res) => {
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
};

// POST /api/messages/:id/cancel
exports.cancelMessage = async (req, res) => {
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
};


exports.getScheduledMessages = async (req, res) => {
  try {
    const messages = await ScheduledMessage.find({ hidden: false }).sort({ scheduledTime: -1 });
    res.json(messages);
  } catch (error) {
    console.error('Error fetching scheduled messages:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled messages' });
  }
};

exports.updateMessageVisibility = async (req, res) => {
  try {
    const { ids, hidden } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ error: 'invalid request body' });
    }

    await ScheduledMessage.updateMany({ _id: { $in: ids } }, { $set: { hidden } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'failed to update visibility' });
  }
};

exports.runCronJob = async (req, res) => {
  try {
    const message = "Hello from My WhatsApp Bot Backend";
    res.json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send messages' });
  }
};
