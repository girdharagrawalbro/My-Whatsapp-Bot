const Event = require('../models/Event');
const User = require('../models/User');

function parseDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(Date.UTC(year, month - 1, day));
}

async function getNextEventIndex() {
  try {
    const lastEvent = await Event.findOne({}, {}, { sort: { eventIndex: -1 } });
    const nextIndex = lastEvent ? lastEvent.eventIndex + 1 : 1;
    console.log('\x1b[36m%s\x1b[0m', `Next event index will be: ${nextIndex}`);
    return nextIndex;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error getting next event index:', error);
    return 1;
  }
}

async function saveEvent(eventData) {
  try {
    const parsedDate = parseDate(eventData.eventData.date);

    // 🔍 Check for duplicate event
    const duplicateEvent = await Event.findOne({
      date: parsedDate,
      time: eventData.eventData.time,
      description: eventData.eventData.description
    });

    if (duplicateEvent) {
      console.log('\x1b[33m%s\x1b[0m', `⚠ डुप्लीकेट कार्यक्रम मौजूद है: ${duplicateEvent.title} (${eventData.eventData.date} @ ${eventData.eventData.time})`);
      return { message: 'Duplicate event already exists', event: duplicateEvent };
    }

    const eventIndex = await getNextEventIndex();
    console.log('\x1b[36m%s\x1b[0m', `Creating event with index: ${eventIndex}`);
    console.log(eventData);

    const newEvent = new Event({
      title: eventData.eventData.title,
      description: eventData.eventData.description,
      date: parsedDate,
      time: eventData.eventData.time,
      address: eventData.eventData.address,
      organizer: eventData.eventData.organizer,
      contactPhone: eventData.eventData.contactPhone,
      mediaUrls: eventData.mediaUrls,
      mediaType: eventData.mediaType,
      extractedText: JSON.stringify(eventData),
      status: 'confirmed',
      sourcePhone: eventData.from,
      eventIndex: eventIndex
    });

    const event = await newEvent.save();
    console.log(`saved event ${event}`);
    console.log('\x1b[32m%s\x1b[0m', `✓ कार्यक्रम सहेजा गया, अनुक्रमांक ${eventIndex}: ${eventData.eventData.title}`);

    // ✅ Insert user if not already created
    if (eventData.eventData.contactPhone) {
      // Split on commas, semicolons, or other delimiters
      const phoneList = eventData.eventData.contactPhone.split(/[,;]+/);

      for (let phone of phoneList) {
        let rawPhone = phone.toString().trim();
        let normalizedPhone = rawPhone.replace(/\D/g, ''); // Remove all non-digit characters

        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = normalizedPhone.substring(1);
        }

        if (normalizedPhone.length === 10) {
          normalizedPhone = '91' + normalizedPhone;
        }

        if (/^91\d{10}$/.test(normalizedPhone)) {
          const existingUser = await User.findOne({ phone: normalizedPhone });

          if (!existingUser) {
            const newUser = new User({
              phone: normalizedPhone,
              name: eventData.eventData.organizer,
              type: 'invitation'
            });
            await newUser.save();
            console.log('\x1b[36m%s\x1b[0m', `✓ नया उपयोगकर्ता जोड़ा गया: ${newUser.name} (${newUser.phone})`);
          } else {
            console.log('\x1b[33m%s\x1b[0m', `ℹ उपयोगकर्ता पहले से मौजूद है: ${existingUser.phone}`);
          }
        } else {
          console.log('\x1b[31m%s\x1b[0m', `✗ अमान्य फ़ोन नंबर: ${rawPhone}`);
        }
      }
    }
    return event;

  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error saving event:', error);
    throw error;
  }
}


module.exports = {
  getNextEventIndex,
  saveEvent
};
