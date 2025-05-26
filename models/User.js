const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now },
  type: { type: String, enum: ['invitation', 'contact'], default: 'contact' },
  optOut: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
