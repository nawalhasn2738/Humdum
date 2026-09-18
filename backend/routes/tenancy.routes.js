const express = require('express');
const { bookTenancy } = require('../controllers/tenancy.controller');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.post('/', authenticate, authorizeRoles(['tenant']), bookTenancy);

module.exports = router;
