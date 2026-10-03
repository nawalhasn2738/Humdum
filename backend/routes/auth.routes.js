const express = require('express');
const {
  register,
  requestPhoneOtp,
  verifyPhoneOtp,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', authenticate, register);
router.post('/phone/request-otp', requestPhoneOtp);
router.post('/phone/verify-otp', verifyPhoneOtp);

module.exports = router;
