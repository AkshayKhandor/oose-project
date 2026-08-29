const Order = require('../models/Order');

// ─── Math Utilities ──────────────────────────────────────────────────────────

/** Simple linear regression: returns { slope, intercept, r2, predict(x) } */
const linearRegression = (xs, ys) => {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, r2: 0, predict: (x) => ys[0] || 0 };
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  const ssXX  = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const ssXY  = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const ssYY  = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const slope     = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;
  const r2        = ssYY !== 0 ? (ssXY ** 2) / (ssXX * ssYY) : 0;
  return { slope, intercept, r2: parseFloat(r2.toFixed(4)), predict: (x) => slope * x + intercept };
};

/** Standard deviation */
const stdDev = (arr) => {
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  return Math.sqrt(arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length);
};

/** Pearson correlation between two arrays */
const pearson = (xs, ys) => {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
  const den = Math.sqrt(
    xs.reduce((s, x) => s + (x - mx) ** 2, 0) *
    ys.reduce((s, y) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? 0 : parseFloat((num / den).toFixed(4));
};

// ─── DS Insights Controller ──────────────────────────────────────────────────

// @desc  Get data science insights: forecasting, segmentation, association, anomalies
// @route GET /api/orders/ds-insights
// @access Private
const getDsInsights = async (req, res) => {
  try {
    // Fetch all orders with item details
    const orders = await Order.find({})
      .populate('items.menuItem', 'name category price')
      .sort({ createdAt: 1 });

    if (orders.length === 0) {
      return res.json({ empty: true, message: 'No order data available yet.' });
    }

    // ── 1. Demand Forecasting (Revenue) via Linear Regression ────────────────
    //    Aggregate daily revenue, fit OLS on day-index, forecast next 7 days
    const dailyMap = {};
    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      dailyMap[key] = (dailyMap[key] || 0) + o.totalAmount;
    });
    const sortedDays = Object.keys(dailyMap).sort();
    const revenueXs  = sortedDays.map((_, i) => i);
    const revenueYs  = sortedDays.map(d => dailyMap[d]);
    const revModel   = linearRegression(revenueXs, revenueYs);

    // Historical actuals (last 30 days for chart)
    const last30 = sortedDays.slice(-30);
    const revHistorical = last30.map((date, idx) => {
      const x = sortedDays.indexOf(date);
      return {
        date,
        actual:    parseFloat(dailyMap[date].toFixed(2)),
        predicted: parseFloat(Math.max(0, revModel.predict(x)).toFixed(2)),
      };
    });

    // Forecast next 7 days
    const lastIdx = revenueXs[revenueXs.length - 1];
    const lastDate = new Date(sortedDays[sortedDays.length - 1]);
    const revForecast = Array.from({ length: 7 }, (_, i) => {
      const futureDate = new Date(lastDate.getTime() + (i + 1) * 86400000);
      const predicted  = Math.max(0, revModel.predict(lastIdx + i + 1));
      // 80% confidence interval ≈ ±1.28 * residual std
      const residuals  = revenueYs.map((y, j) => y - revModel.predict(j));
      const resStd     = stdDev(residuals.length > 1 ? residuals : [0]);
      const ci         = 1.28 * resStd;
      return {
        date:  futureDate.toISOString().slice(0, 10),
        predicted: parseFloat(predicted.toFixed(2)),
        lower:     parseFloat(Math.max(0, predicted - ci).toFixed(2)),
        upper:     parseFloat((predicted + ci).toFixed(2)),
      };
    });

    // ── 2. Order Volume Forecast (count) ─────────────────────────────────────
    const dailyCountMap = {};
    orders.forEach(o => {
      const key = new Date(o.createdAt).toISOString().slice(0, 10);
      dailyCountMap[key] = (dailyCountMap[key] || 0) + 1;
    });
    const countYs  = sortedDays.map(d => dailyCountMap[d] || 0);
    const cntModel = linearRegression(revenueXs, countYs);
    const cntForecast = Array.from({ length: 7 }, (_, i) => {
      const futureDate = new Date(lastDate.getTime() + (i + 1) * 86400000);
      const predicted  = Math.max(0, cntModel.predict(lastIdx + i + 1));
      return {
        date:      futureDate.toISOString().slice(0, 10),
        predicted: parseFloat(predicted.toFixed(1)),
      };
    });

    // ── 3. Menu Item Association Rules (Market Basket) ───────────────────────
    //    Compute co-occurrence counts for top item pairs
    const itemSets = orders.map(o =>
      [...new Set(o.items.map(i => i.menuItem?.name).filter(Boolean))]
    );
    const pairCount   = {};
    const singleCount = {};
    itemSets.forEach(set => {
      set.forEach(a => { singleCount[a] = (singleCount[a] || 0) + 1; });
      for (let i = 0; i < set.length; i++) {
        for (let j = i + 1; j < set.length; j++) {
          const key = [set[i], set[j]].sort().join(' ↔ ');
          pairCount[key] = (pairCount[key] || 0) + 1;
        }
      }
    });
    const totalOrders = orders.length;
    const associations = Object.entries(pairCount)
      .map(([pair, count]) => {
        const [a, b] = pair.split(' ↔ ');
        const suppA   = (singleCount[a] || 0) / totalOrders;
        const suppB   = (singleCount[b] || 0) / totalOrders;
        const support = count / totalOrders;
        const confidence = suppA > 0 ? support / suppA : 0;
        const lift       = suppB > 0 ? confidence / suppB : 0;
        return {
          pair,
          itemA: a, itemB: b,
          support:    parseFloat((support * 100).toFixed(1)),
          confidence: parseFloat((confidence * 100).toFixed(1)),
          lift:       parseFloat(lift.toFixed(2)),
          count,
        };
      })
      .filter(r => r.count >= 2)
      .sort((a, b) => b.lift - a.lift)
      .slice(0, 8);

    // ── 4. RFM Segmentation ───────────────────────────────────────────────────
    //    Group orders by table number as proxy for "customer" (or treat day as session)
    //    Recency: days since last order, Frequency: order count, Monetary: total spend
    const tableRFM = {};
    const now = new Date();
    orders.forEach(o => {
      const tbl = o.tableNumber || 'Takeaway';
      if (!tableRFM[tbl]) tableRFM[tbl] = { lastDate: null, frequency: 0, monetary: 0 };
      const d = new Date(o.createdAt);
      if (!tableRFM[tbl].lastDate || d > tableRFM[tbl].lastDate) tableRFM[tbl].lastDate = d;
      tableRFM[tbl].frequency++;
      tableRFM[tbl].monetary += o.totalAmount;
    });

    const rfmRaw = Object.entries(tableRFM).map(([table, v]) => ({
      table,
      recency:   Math.floor((now - v.lastDate) / 86400000),
      frequency: v.frequency,
      monetary:  parseFloat(v.monetary.toFixed(2)),
    }));

    // Score each dimension 1-5
    const score = (val, arr, invert = false) => {
      const sorted = [...arr].sort((a, b) => a - b);
      const idx    = sorted.indexOf(val);
      const pct    = arr.length > 1 ? idx / (arr.length - 1) : 0.5;
      const s      = Math.round(1 + pct * 4);
      return invert ? 6 - s : s;
    };
    const recArr  = rfmRaw.map(r => r.recency);
    const freqArr = rfmRaw.map(r => r.frequency);
    const monArr  = rfmRaw.map(r => r.monetary);

    const rfmSegments = rfmRaw.map(r => {
      const R = score(r.recency, recArr, true); // lower recency = better
      const F = score(r.frequency, freqArr);
      const M = score(r.monetary, monArr);
      const total = R + F + M;
      const segment =
        total >= 12 ? 'Champions' :
        total >= 9  ? 'Loyal'     :
        total >= 6  ? 'Potential' :
        total >= 3  ? 'At Risk'   : 'Lost';
      return { ...r, R, F, M, total, segment };
    }).sort((a, b) => b.total - a.total).slice(0, 10);

    // Segment distribution
    const segDist = {};
    rfmRaw.forEach(r => {
      const R = score(r.recency, recArr, true);
      const F = score(r.frequency, freqArr);
      const M = score(r.monetary, monArr);
      const total = R + F + M;
      const seg =
        total >= 12 ? 'Champions' :
        total >= 9  ? 'Loyal'     :
        total >= 6  ? 'Potential' :
        total >= 3  ? 'At Risk'   : 'Lost';
      segDist[seg] = (segDist[seg] || 0) + 1;
    });
    const segmentDistribution = Object.entries(segDist)
      .map(([segment, count]) => ({ segment, count }))
      .sort((a, b) => b.count - a.count);

    // ── 5. Anomaly Detection (Z-score on daily revenue) ──────────────────────
    const revValues  = sortedDays.map(d => dailyMap[d]);
    const revMean    = revValues.reduce((a, b) => a + b, 0) / revValues.length;
    const revStd     = stdDev(revValues) || 1;
    const anomalies  = sortedDays
      .map((date, i) => {
        const z = (revValues[i] - revMean) / revStd;
        return { date, revenue: parseFloat(revValues[i].toFixed(2)), zScore: parseFloat(z.toFixed(2)), isAnomaly: Math.abs(z) > 2 };
      })
      .filter(a => a.isAnomaly)
      .slice(-10);

    // ── 6. Feature Importance Proxy (correlation with revenue) ────────────────
    //    Features: hour, day-of-week, item_count, table_number (encoded), payment_method
    const featureData = orders.map(o => ({
      hour:       new Date(o.createdAt).getHours(),
      dow:        new Date(o.createdAt).getDay(),
      itemCount:  o.items.reduce((s, i) => s + i.quantity, 0),
      revenue:    o.totalAmount,
      isCash:     o.paymentMethod === 'cash' ? 1 : 0,
      isUpi:      o.paymentMethod === 'upi'  ? 1 : 0,
      isCard:     o.paymentMethod === 'card' ? 1 : 0,
    }));

    const revCol   = featureData.map(d => d.revenue);
    const features = [
      { name: 'Item Quantity',    values: featureData.map(d => d.itemCount) },
      { name: 'Hour of Day',      values: featureData.map(d => d.hour) },
      { name: 'Day of Week',      values: featureData.map(d => d.dow) },
      { name: 'Cash Payment',     values: featureData.map(d => d.isCash) },
      { name: 'UPI Payment',      values: featureData.map(d => d.isUpi) },
      { name: 'Card Payment',     values: featureData.map(d => d.isCard) },
    ];
    const featureImportance = features.map(f => ({
      name:        f.name,
      correlation: pearson(f.values, revCol),
      importance:  parseFloat(Math.abs(pearson(f.values, revCol)).toFixed(4)),
    })).sort((a, b) => b.importance - a.importance);

    // ── 7. Revenue vs Order Count Scatter (correlation) ──────────────────────
    const scatterData = sortedDays.slice(-60).map(date => ({
      date,
      revenue:    parseFloat((dailyMap[date] || 0).toFixed(2)),
      orderCount: dailyCountMap[date] || 0,
    }));
    const scatterCorr = pearson(
      scatterData.map(d => d.orderCount),
      scatterData.map(d => d.revenue)
    );

    // ── 8. Average Order Value trend ──────────────────────────────────────────
    const aovByDay = sortedDays.slice(-30).map(date => ({
      date,
      aov: dailyCountMap[date] > 0
        ? parseFloat((dailyMap[date] / dailyCountMap[date]).toFixed(2))
        : 0,
    }));
    const aovXs   = aovByDay.map((_, i) => i);
    const aovYs   = aovByDay.map(d => d.aov);
    const aovModel = linearRegression(aovXs, aovYs);

    // ── 9. Model Summary Card ─────────────────────────────────────────────────
    const modelSummary = {
      revenueModel: {
        algorithm:  'Ordinary Least Squares (Linear Regression)',
        r2:          revModel.r2,
        slope:       parseFloat(revModel.slope.toFixed(4)),
        intercept:   parseFloat(revModel.intercept.toFixed(2)),
        dataPoints:  sortedDays.length,
        mse:         parseFloat(
          (revenueYs.reduce((s, y, i) => s + (y - revModel.predict(i)) ** 2, 0) / revenueYs.length).toFixed(2)
        ),
      },
      aovModel: {
        algorithm: 'OLS Trend',
        r2:        aovModel.r2,
        slope:     parseFloat(aovModel.slope.toFixed(4)),
        dataPoints: aovByDay.length,
      },
      associationModel: {
        algorithm: 'Apriori (co-occurrence)',
        rulesFound: associations.length,
        transactions: totalOrders,
      },
      rfmModel: {
        algorithm: 'RFM Scoring (1-5 quantile bins)',
        entitiesSegmented: rfmRaw.length,
        segments: Object.keys(segDist).length,
      },
    };

    res.json({
      modelSummary,
      revHistorical,
      revForecast,
      cntForecast,
      associations,
      rfmSegments,
      segmentDistribution,
      anomalies,
      featureImportance,
      scatterData,
      scatterCorr,
      aovByDay,
    });
  } catch (error) {
    console.error('[DS] Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getDsInsights };
