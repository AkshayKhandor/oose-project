const Order = require('../models/Order');

// @desc    Create new order/bill
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { items, tableNumber, subTotal, taxAmount, totalAmount, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No order items' });
    }

    const count = await Order.countDocuments();
    const billId = `BILL-${(count + 1).toString().padStart(4, '0')}`;

    const order = new Order({
      billId,
      items,
      tableNumber,
      subTotal,
      taxAmount,
      totalAmount,
      paymentMethod: paymentMethod || 'cash',
      createdBy: req.user._id,
    });

    const createdOrder = await order.save();
    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate('createdBy', 'name').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('items.menuItem', 'name price');

    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (order) {
      order.status = status;
      const updatedOrder = await order.save();
      res.json(updatedOrder);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard summary
// @route   GET /api/orders/dashboard/summary
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const orders = await Order.find({});
    const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const totalOrders = orders.length;

    const recentOrders = await Order.find({})
      .populate('createdBy', 'name')
      .populate('items.menuItem', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ totalSales, totalOrders, recentOrders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const pctChange = (curr, prev) =>
  prev > 0 ? parseFloat((((curr - prev) / prev) * 100).toFixed(1)) : null;

const buildDateFilter = (from, to) => {
  const filter = {};
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }
  return filter;
};

// @desc    Get analytics data (date-range aware, period comparison)
// @route   GET /api/orders/analytics?from=YYYY-MM-DD&to=YYYY-MM-DD
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const { from, to } = req.query;

    // ── Effective date range (default: last 30 days) ──────────────────────
    const effectiveTo = to ? (() => { const d = new Date(to); d.setHours(23,59,59,999); return d; })()
                           : new Date();
    const effectiveFrom = from ? new Date(from)
                               : new Date(effectiveTo.getTime() - 29 * 24 * 60 * 60 * 1000);

    const duration = effectiveTo - effectiveFrom; // ms

    // Previous period (same length, immediately before current)
    const prevTo   = new Date(effectiveFrom.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - duration);

    const [orders, prevOrders] = await Promise.all([
      Order.find({ createdAt: { $gte: effectiveFrom, $lte: effectiveTo } })
           .populate('items.menuItem', 'name category'),
      Order.find({ createdAt: { $gte: prevFrom, $lte: prevTo } })
           .populate('items.menuItem', 'name category'),
    ]);

    // ── KPIs ──────────────────────────────────────────────────────────────
    const totalRevenue    = orders.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders     = orders.length;
    const avgOrderValue   = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const totalTax        = orders.reduce((s, o) => s + o.taxAmount, 0);
    const cancelledCount  = orders.filter(o => o.status === 'cancelled').length;
    const cancellationRate = totalOrders > 0 ? parseFloat(((cancelledCount / totalOrders) * 100).toFixed(1)) : 0;

    const prevRevenue    = prevOrders.reduce((s, o) => s + o.totalAmount, 0);
    const prevCount      = prevOrders.length;
    const prevAOV        = prevCount > 0 ? prevRevenue / prevCount : 0;
    const prevCancelled  = prevOrders.filter(o => o.status === 'cancelled').length;
    const prevCancelRate = prevCount > 0 ? (prevCancelled / prevCount) * 100 : 0;

    const kpi = {
      totalRevenue, totalOrders, avgOrderValue, totalTax, cancellationRate,
      delta: {
        revenue:          pctChange(totalRevenue, prevRevenue),
        orders:           pctChange(totalOrders, prevCount),
        avgOrderValue:    pctChange(avgOrderValue, prevAOV),
        cancellationRate: pctChange(cancellationRate, prevCancelRate),
      },
    };

    // ── Daily revenue over selected range ─────────────────────────────────
    const dayCount = Math.max(Math.ceil(duration / 86400000) + 1, 1);
    const dailyMap = {};
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(effectiveFrom.getTime() + i * 86400000);
      dailyMap[d.toISOString().slice(0, 10)] = 0;
    }
    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      if (dailyMap[key] !== undefined) dailyMap[key] += o.totalAmount;
    });
    const dailyRevenue = Object.entries(dailyMap).map(([date, revenue]) => ({ date, revenue }));

    // ── Hourly distribution (0-23) ────────────────────────────────────────
    const hourlyCount = Array(24).fill(0);
    orders.forEach(o => { hourlyCount[new Date(o.createdAt).getHours()]++; });
    const hourlyOrders = hourlyCount.map((count, hour) => ({ hour, count }));

    // ── Day-of-week distribution ──────────────────────────────────────────
    const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dowCount = Array(7).fill(0);
    orders.forEach(o => { dowCount[new Date(o.createdAt).getDay()]++; });
    const dayOfWeek = dowCount.map((count, i) => ({ day: DAYS[i], count }));

    // ── Top items ─────────────────────────────────────────────────────────
    const itemMap = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        const name = i.menuItem?.name || 'Unknown';
        if (!itemMap[name]) itemMap[name] = { name, quantity: 0, revenue: 0 };
        itemMap[name].quantity += i.quantity;
        itemMap[name].revenue += i.price * i.quantity;
      });
    });
    const topItems = Object.values(itemMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6);

    // ── Category breakdown ────────────────────────────────────────────────
    const catMap = {};
    orders.forEach(o => {
      o.items.forEach(i => {
        const cat = i.menuItem?.category || 'Unknown';
        if (!catMap[cat]) catMap[cat] = { category: cat, revenue: 0, quantity: 0 };
        catMap[cat].revenue  += i.price * i.quantity;
        catMap[cat].quantity += i.quantity;
      });
    });
    const categoryBreakdown = Object.values(catMap)
      .sort((a, b) => b.revenue - a.revenue);

    // ── Order status breakdown ────────────────────────────────────────────
    const statusMap = { completed: 0, pending: 0, cancelled: 0 };
    orders.forEach(o => { if (statusMap[o.status] !== undefined) statusMap[o.status]++; });
    const statusBreakdown = Object.entries(statusMap).map(([status, count]) => ({ status, count }));

    // ── Payment method breakdown ──────────────────────────────────────────
    const paymentMap = {};
    orders.forEach(o => {
      const pm = o.paymentMethod || 'cash';
      if (!paymentMap[pm]) paymentMap[pm] = { method: pm, count: 0, revenue: 0 };
      paymentMap[pm].count++;
      paymentMap[pm].revenue += o.totalAmount;
    });
    const paymentBreakdown = Object.values(paymentMap).sort((a, b) => b.revenue - a.revenue);

    // ── Revenue by table ──────────────────────────────────────────────────
    const tableMap = {};
    orders.forEach(o => {
      const t = o.tableNumber || 'Takeaway';
      if (!tableMap[t]) tableMap[t] = 0;
      tableMap[t] += o.totalAmount;
    });
    const revenueByTable = Object.entries(tableMap)
      .map(([table, revenue]) => ({ table, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);

    // ── Export rows (lightweight, for CSV) ───────────────────────────────
    const exportRows = orders.map(o => ({
      billId:        o.billId,
      date:          o.createdAt,
      tableNumber:   o.tableNumber || 'Takeaway',
      items:         o.items.map(i => `${i.menuItem?.name || 'Unknown'} x${i.quantity}`).join('; '),
      subTotal:      o.subTotal,
      taxAmount:     o.taxAmount,
      totalAmount:   o.totalAmount,
      status:        o.status,
      paymentMethod: o.paymentMethod || 'cash',
    }));

    res.json({
      kpi,
      dailyRevenue,
      hourlyOrders,
      dayOfWeek,
      topItems,
      categoryBreakdown,
      statusBreakdown,
      paymentBreakdown,
      revenueByTable,
      exportRows,
      meta: {
        from:    effectiveFrom.toISOString(),
        to:      effectiveTo.toISOString(),
        prevFrom: prevFrom.toISOString(),
        prevTo:   prevTo.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getDashboardSummary,
  getAnalytics,
};
