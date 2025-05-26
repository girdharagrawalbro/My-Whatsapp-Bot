const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  date: { type: Date },
  time: String,
  address: String,
  organizer: String,
  contactPhone: String,
  mediaUrls: String,
  extractedText: String,
  mediaType: { type: String, enum: ['image', 'pdf', 'video'], required: true, default: 'image' },
  createdAt: { type: Date, default: Date.now },
  sourcePhone: String,
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed' },
  reminderSent: { type: Boolean, default: false },
  reminderTime: { type: Number, default: 24 },
  eventIndex: { type: Number, unique: true }
});

module.exports = mongoose.model('Event', EventSchema);
