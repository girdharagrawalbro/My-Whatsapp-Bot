const mongoose = require('mongoose');

const MessageTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  content: { type: String, required: true },
  category: { type: String, enum: ['event', 'reminder', 'announcement', 'general'], default: 'general' },
  variables: [
    {
      name: String,
      description: String,
      required: Boolean,
      defaultValue: String
    }
  ],
  isActive: { type: Boolean, default: true },
  createdBy: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('MessageTemplate', MessageTemplateSchema);
