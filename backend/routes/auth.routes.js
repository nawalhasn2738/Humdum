const express = require('express');
const {
  register,
  requestPhoneOtp,
  verifyPhoneOtp,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/register', register);
router.post('/phone/request-otp', requestPhoneOtp);
router.post('/phone/verify-otp', verifyPhoneOtp);

module.exports = router;
