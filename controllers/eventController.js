const Event = require('../models/Event');

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find().sort({ date: 1 });
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      organizer,
      contactPhone,
      address,
      mediaUrls
    } = req.body;

    // Basic validation
    if (!title || !description || !date) {
      return res.status(400).json({ error: 'Title, description and date are required' });
    }

    const event = new Event({
      title,
      description,
      date,
      time: time || '',
      organizer: organizer || '',
      contactPhone: contactPhone || '',
      address: address || '',
    });

    await event.save();
    res.status(201).json(event);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Event already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

exports.updateEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      organizer,
      contactPhone,
      address,
      mediaUrls,
      isAttended, // ✅ include this
    } = req.body;

    // Basic validation
    if (!title || !description || !date) {
      return res.status(400).json({ error: 'Title, description and date are required' });
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        date,
        time,
        organizer,
        contactPhone,
        address,
        mediaUrls,
        isAttended, // ✅ include this in update
      },
      { new: true }
    );

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(updatedEvent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.deleteEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};