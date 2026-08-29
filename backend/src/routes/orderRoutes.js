const express = require('express');
const router = express.Router();
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getDashboardSummary,
  getAnalytics,
} = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createOrder)
  .get(protect, getOrders);

router.get('/dashboard/summary', protect, getDashboardSummary);
router.get('/analytics', protect, getAnalytics);

router.route('/:id')
  .get(protect, getOrderById);

router.put('/:id/status', protect, updateOrderStatus);

module.exports = router;
