const express = require('express');
const {
  getFamilyProfileByUser,
  saveFamilyProfile,
} = require('../controllers/family.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorizeRoles(['tenant']), saveFamilyProfile);
router.get('/:userId', authenticate, getFamilyProfileByUser);

module.exports = router;
