const User = require('../models/User');

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createUser = async (req, res) => {
  try {
    const { phone, name } = req.body;
    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return res.status(400).json({ error: 'Invalid phone number' });
    }

    const user = new User({ phone, name, lastInteraction: new Date(), type });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Phone number already exists' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
};

exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await Message.deleteMany({ user: user._id });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
