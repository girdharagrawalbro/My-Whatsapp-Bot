const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: String,
  lastInteraction: { type: Date, default: Date.now },
  isSupporter: { type: Boolean, default: false },
  optOut: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', UserSchema);
