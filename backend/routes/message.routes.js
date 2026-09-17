const express = require('express');
const { createMessage, getMessages } = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, createMessage);
router.get('/:listingId', authenticate, getMessages);

module.exports = router;
