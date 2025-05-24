const nodeCron = require('node-cron');
const Event = require('../models/Event');
const { sendWhatsAppMessage } = require('./whatsappSender');
const { formatEventList } = require('./eventQuery'); // reuse your formatter

// Schedule daily 6 AM notification with today's events
function scheduleDailyNotifications() {
  nodeCron.schedule('0 6 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = await Event.find({ date: { $gte: today, $lt: tomorrow } }).sort({ time: 1 });
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;

      if (!adminPhone) {
        console.error('ADMIN_PHONE_NUMBER not set in environment variables');
        return;
      }

      let message;
      if (events.length > 0) {
        message = `🌞 सुप्रभात! आज के कार्यक्रम:\n\n${formatEventList(events)}\n\nधन्यवाद!`;
      } else {
        message = `🌞 सुप्रभात! आज के लिए कोई कार्यक्रम नहीं है।`;
      }
      await sendWhatsAppMessage(adminPhone, message);

    } catch (error) {
      console.error('Error in daily notification:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });
}

// Send reminder message for one event
async function sendReminder(event) {
  try {
    const ADMIN_PHONE = process.env.ADMIN_PHONE_NUMBER;
    if (!ADMIN_PHONE) throw new Error('Admin phone not configured');

    const reminderMessage = `🔔 Reminder: \n\n${formatEventList([event])}\n\n`;
    await sendWhatsAppMessage(ADMIN_PHONE, reminderMessage);

    await Event.findByIdAndUpdate(event._id, { reminderSent: true });

    console.log(`[${new Date().toISOString()}] Sent reminder for event: ${event._id}`);
  } catch (error) {
    console.error(`[ERROR] Failed to send reminder for event ${event._id}:`, error.message);
  }
}

// Schedule reminders for events one hour before they start
async function scheduleEventReminders() {
  const now = new Date();
  const nextHourMark = new Date(now.getTime() + 60 * 60 * 1000);

  // Find the next event needing a reminder
  const nextEvent = await Event.findOne({
    date: { $gte: nextHourMark },
    reminderSent: false,
    status: 'confirmed',
  }).sort({ date: 1 });

  if (nextEvent) {
    const delay = nextEvent.date.getTime() - now.getTime() - 60 * 60 * 1000;
    setTimeout(async () => {
      await sendReminder(nextEvent);
      scheduleEventReminders(); // Recursively schedule next reminder
    }, delay);
  }
}

module.exports = {
  scheduleDailyNotifications,
  scheduleEventReminders,
  sendReminder,
};
