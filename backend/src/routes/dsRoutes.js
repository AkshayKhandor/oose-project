const express = require('express');
const router  = express.Router();
const { getDsInsights } = require('../controllers/dsController');
const { protect }       = require('../middleware/authMiddleware');

router.get('/insights', protect, getDsInsights);

module.exports = router;
