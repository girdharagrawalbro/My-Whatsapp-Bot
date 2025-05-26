const nodeCron = require('node-cron');
const Event = require('../models/Event');
const { formatEventList } = require('./eventQuery'); // reuse your formatter

// Schedule daily 6 AM notification with today's events
const { sendWhatsAppMessage } = require('./whatsappSender');
const { generateEventPDF } = require('./generatePdf');

function scheduleDailyNotifications() {
  nodeCron.schedule('31 16 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const events = await Event.find({ date: { $gte: today, $lt: tomorrow }, status: 'confirmed' }).sort({ time: 1 });
      const adminPhone = process.env.ADMIN_PHONE_NUMBER;

      if (!adminPhone) {
        console.error('ADMIN_PHONE_NUMBER not set in environment variables');
        return;
      }

      if (events.length > 0) {
        const { longUrl } = await generateEventPDF(events);
        await sendWhatsAppMessage(adminPhone, '🌞 सुप्रभात! आज के कार्यक्रम ।', longUrl);

      } else {
        await sendWhatsAppMessage(adminPhone, '🌞 सुप्रभात! आज के लिए कोई कार्यक्रम नहीं है।');
      }

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
