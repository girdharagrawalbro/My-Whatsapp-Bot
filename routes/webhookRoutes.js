const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

router.post('/webhook', handleWebhook);

module.exports = router;
