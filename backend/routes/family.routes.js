const express = require('express');
const {
  confirmCheckIn,
  getFamilyProfileByUser,
  getCurrentSafetyState,
  getOwnFamilyProfile,
  listCheckIns,
  saveFamilyProfile,
  triggerSos,
} = require('../controllers/family.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorizeRoles(['tenant']), saveFamilyProfile);
router.get('/me', authenticate, authorizeRoles(['tenant']), getOwnFamilyProfile);
router.get('/safety-state', authenticate, authorizeRoles(['tenant']), getCurrentSafetyState);
router.get('/check-ins', authenticate, authorizeRoles(['tenant']), listCheckIns);
router.post('/check-ins', authenticate, authorizeRoles(['tenant']), confirmCheckIn);
router.post('/sos', authenticate, authorizeRoles(['tenant']), triggerSos);
router.get('/:userId', authenticate, getFamilyProfileByUser);

module.exports = router;
