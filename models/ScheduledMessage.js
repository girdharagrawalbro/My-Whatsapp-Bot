const mongoose = require('mongoose');

const ScheduledMessageSchema = new mongoose.Schema({
  message: String,
  users: [{ type: String }],
  scheduledTime: Date,
  status: { type: String, enum: ['scheduled', 'sent', 'failed'], default: 'scheduled' },
  hidden: { type: Boolean, default: false },
  campaign: String,
  audience: { type: String, enum: ['all', 'supporters', 'new'], default: 'all' },
  results: [
    {
      phone: String,
      status: String,
      error: String
    }
  ],
  completedAt: Date
});

module.exports = mongoose.model('ScheduledMessage', ScheduledMessageSchema);
