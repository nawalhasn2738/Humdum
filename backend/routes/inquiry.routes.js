const express = require('express');
const { create, landlord, mine, updateStatus } = require('../controllers/inquiry.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorizeRoles(['tenant']), create);
router.get('/mine', authenticate, authorizeRoles(['tenant']), mine);
router.get('/landlord', authenticate, authorizeRoles(['landlord']), landlord);
router.patch('/:id/status', authenticate, authorizeRoles(['tenant', 'landlord']), updateStatus);

module.exports = router;
