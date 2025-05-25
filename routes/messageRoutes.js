const express = require('express');
const router = express.Router();
const {
  getScheduledMessages,
  updateMessageVisibility,
  runCronJob,
  sendMessage,
  getMessageStatus,
  cancelMessage
} = require('../controllers/messageController');

router.post('/send', sendMessage);
router.get('/:id/status', getMessageStatus);
router.post('/:id/cancel', cancelMessage);

router.get('/scheduled-messages', getScheduledMessages);
router.post('/scheduled-messages/visibility', updateMessageVisibility);
router.get('/cron-job', runCronJob);

module.exports = router;
