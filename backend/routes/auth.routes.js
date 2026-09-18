const express = require('express');
const {
  register,
  requestPhoneOtp,
  verifyPhoneOtp,
  login,
  me,
} = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/signup', register);
router.post('/login', login);
router.post('/phone/request-otp', requestPhoneOtp);
router.post('/phone/verify-otp', verifyPhoneOtp);
router.get('/me', authenticate, me);

module.exports = router;
