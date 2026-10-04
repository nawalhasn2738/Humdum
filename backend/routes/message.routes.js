const express = require('express');
const {
  createMessage,
  getMessageThreads,
  getMessages,
} = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');
const { messageRateLimit } = require('../middleware/message-rate-limit');

const router = express.Router();

router.post('/', authenticate, messageRateLimit, createMessage);
router.get('/', authenticate, getMessageThreads);
router.get('/:listingId', authenticate, getMessages);

module.exports = router;
