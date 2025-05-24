const express = require('express');
const router = express.Router();
const { getAllEvents } = require('../controllers/eventController');

router.get('/events', getAllEvents);

module.exports = router;
