const Event = require('../models/Event');
const { classifyQueryWithAI } = require('./classifier');
const sitelink = "https://rb.gy/wgxwt0";


async function queryEvents(query, phone, isAdmin = false) {
  console.log('\x1b[35m%s\x1b[0m', '🔍 Event Query Process Started:');
  console.log('\x1b[33m%s\x1b[0m', `Query: "${query}"`);
  console.log('\x1b[33m%s\x1b[0m', `Phone: ${phone}`);
  console.log('\x1b[33m%s\x1b[0m', `Is Admin: ${isAdmin}`);

  try {
    const aiCategory = await classifyQueryWithAI(query);
    console.log('\x1b[36m%s\x1b[0m', `AI Classification: ${aiCategory}`);

    // Numeric event index lookup
    const indexNumber = parseInt(query);
    if (!isNaN(indexNumber)) {
      const event = await Event.findOne({ eventIndex: indexNumber });
      if (event) {
        return {
          type: 'single_event',
          event,
          message: formatSingleEvent(event),
        };
      } else {

        return {
          type: 'error',
          message: `कार्यक्रम #${indexNumber} नहीं मिला।`
        };
      }
    }

    if (aiCategory === 'today') {
      return await getTodayEvents();
    }
    else if (aiCategory === 'upcoming') {
      return await getUpcomingEvents();
    }
    else if (aiCategory === 'date') {
      return await getEventsByDate(query);
    }
    else if (aiCategory === 'search') {
      return await searchEventsByKeyword(query);
    }


  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error in queryEvents:', error);
    return { error: 'कार्यक्रम खोजने में त्रुटि। कृपया पुनः प्रयास करें।' };
  }
}

// Helpers:

function formatSingleEvent(event) {
  return `#  ${event.title} \n ( ${event.date.toLocaleDateString('en-IN')} - ${event.time} )\n \n{event.address} \n आयोजक: ${event.organizer}\n संपर्क: ${event.contactPhone ? event.contactPhone
    : ""
    }\n Link: ${event.mediaUrls}\n 
    
    all - ${sitelink}`
}

async function getTodayEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const events = await Event.find({
    date: { $gte: today, $lt: tomorrow },
  }).sort({ time: 1 });

  return {
    type: 'today',
    events,
    message: events.length > 0
      ? `आज के कार्यक्रम:\n\n${formatEventList(events)}\n all- ${sitelink}`
      : 'आज के लिए कोई कार्यक्रम निर्धारित नहीं है।'
  };
}

async function getUpcomingEvents() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const events = await Event.find({
    date: { $gte: today },
  })
    .sort({ date: 1, time: 1 })
    .limit(5);
  return {
    type: 'upcoming',
    events,
    message: events.length > 0
      ? `आगामी कार्यक्रमों की सूची:\n\n${formatEventList(events)} \n all- ${sitelink}`
      : 'कोई आगामी कार्यक्रम नहीं मिला।'
  };
}

async function getEventsByDate(query) {
  const dateMatch = query.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (dateMatch) {
    const [day, month, year] = dateMatch[0].split('/');
    const startDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));

    const events = await Event.find({
      date: { $gte: startDate, $lte: endDate },
    }).sort({ time: 1 });

    return {
      type: 'date',
      date: `${day}/${month}/${year}`,
      events,
      message: events.length > 0
        ? `${day}/${month}/${year} के कार्यक्रम:\n\n${formatEventList(events)}  \n all- ${sitelink}`
        : `${day}/${month}/${year} को कोई कार्यक्रम नहीं मिला।`
    };
  }
  return { type: 'error', message: 'दिनांक का प्रारूप सही नहीं है।' };
}

async function searchEventsByKeyword(query) {
  const searchEvents = await Event.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { description: { $regex: query, $options: 'i' } },
      { address: { $regex: query, $options: 'i' } },
      { organizer: { $regex: query, $options: 'i' } }
    ]
  }).sort({ date: 1 });

  return {
    type: 'search',
    query,
    events: searchEvents,
    message: searchEvents.length > 0
      ? `"${query}" से मिलते-जुलते कार्यक्रम:\n\n${formatEventList(searchEvents)}  \n all- ${sitelink}`
      : `"${query}" से कोई कार्यक्रम नहीं मिला।`
  };
}

// Format events list (example)
function formatEventList(events) {
  return events.map(event =>
    `# ${event.title} \n ( ${event.date.toLocaleDateString('en-IN')} - ${event.time} )\n \n${event.address} \n आयोजक: ${event.organizer}\n संपर्क: ${event.contactPhone ? event.contactPhone
      : ""
    }\n Link: ${event.mediaUrls}\n \n`
  ).join('\n');
}

module.exports = {
  queryEvents,
  classifyQueryWithAI,
  formatEventList  // export if you want to test/mock separately
};
