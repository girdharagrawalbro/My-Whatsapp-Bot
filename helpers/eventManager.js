const Event = require('../models/Event');

/**
 * Fetches the next eventIndex by finding the highest current index.
 * @returns {Promise<number>} - The next available event index.
 */
async function getNextEventIndex() {
  try {
    const lastEvent = await Event.findOne({}, {}, { sort: { eventIndex: -1 } });
    const nextIndex = lastEvent ? lastEvent.eventIndex + 1 : 1;
    console.log('\x1b[36m%s\x1b[0m', `Next event index will be: ${nextIndex}`);
    return nextIndex;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error getting next event index:', error);
    return 1; // fallback
  }
}

/**
 * Saves an event with the next available eventIndex.
 * @param {Object} eventData - The event data to save.
 * @returns {Promise<Object>} - The saved event.
 */
function parseDate(dateString) {
  const [day, month, year] = dateString.split('/');
  return new Date(Date.UTC(year, month - 1, day));
}

async function saveEvent(eventData) {
  try {
    const eventIndex = await getNextEventIndex();
    console.log('\x1b[36m%s\x1b[0m', `Creating event with index: ${eventIndex}`);
    console.log(eventData)

    const newEvent = new Event({
      title: eventData.eventData.title,
      description: eventData.eventData.description,
      date: parseDate(eventData.eventData.date),
      time: eventData.eventData.time,
      address: eventData.eventData.address,
      organizer: eventData.eventData.organizer,
      contactPhone: eventData.eventData.contactPhone,
      mediaUrls: eventData.imageBBUrl,
      mediaType: eventData.mediaType,
      extractedText: JSON.stringify(eventData),
      status: 'confirmed',
      sourcePhone: eventData.from,
      eventIndex: eventIndex
    });

    const event = await newEvent.save();
    console.log(`saved event ${event}`)
    console.log('\x1b[32m%s\x1b[0m', `✓ कार्यक्रम सहेजा गया, अनुक्रमांक ${eventIndex}: ${eventData.eventData.title}`);
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
