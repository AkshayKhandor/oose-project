import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import {
  TrendingUp, ShoppingBag, IndianRupee, Percent,
  BarChart2, PieChart, Activity, Clock, Download,
  Calendar, XCircle, Tag, Repeat2,
} from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n) =>
  `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const todayStr   = () => new Date().toISOString().slice(0, 10);
const daysAgoStr = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const STATUS_COLORS = { completed: '#22c55e', pending: '#f59e0b', cancelled: '#ef4444' };
const PM_COLORS     = { cash: '#22c55e', upi: '#3b82f6', card: '#8b5cf6', other: '#f59e0b' };
const PM_ICONS      = { cash: '💵', upi: '📱', card: '💳', other: '🔄' };
const BAR_COLORS    = ['#3b82f6','#06b6d4','#8b5cf6','#ec4899','#f59e0b','#22c55e'];
const DOW_COLORS    = ['#ef4444','#f59e0b','#22c55e','#3b82f6','#8b5cf6','#ec4899','#06b6d4'];

// ─── Sub-components ─────────────────────────────────────────────────────────

/** Delta badge (↑ / ↓) shown on KPI cards */
const DeltaBadge = ({ delta }) => {
  if (delta === null || delta === undefined) return null;
  const pos = delta >= 0;
  return (
    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
      pos ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400'
    }`}>
      {pos ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% vs prev
    </span>
  );
};

/** KPI card */
const KpiCard = ({ icon: Icon, label, value, color, sub, delta }) => (
  <div className="glass p-5 rounded-3xl relative overflow-hidden group hover:scale-[1.03] transition-all duration-300 cursor-default">
    <div className="absolute -right-4 -top-4 w-20 h-20 rounded-full mix-blend-multiply filter blur-xl opacity-60 group-hover:opacity-80 transition-all"
         style={{ background: color }} />
    <div className="flex items-start space-x-4 relative z-10">
      <div className="p-3 rounded-2xl shadow-sm shrink-0" style={{ background: `${color}22` }}>
        <Icon size={22} style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-[10px] text-zinc-500 mt-0.5">{sub}</p>}
        <div className="mt-1.5"><DeltaBadge delta={delta} /></div>
      </div>
    </div>
  </div>
);

/** Line chart — variable length */
const LineChart = ({ data }) => {
  const W = 560, H = 180, PAD = 40;
  if (!data || data.length === 0) return <EmptyChart />;
  const maxVal = Math.max(...data.map(d => d.revenue), 1);
  const showLabels = data.length <= 10;

  const pts = data.map((d, i) => {
    const x = PAD + (data.length === 1 ? (W - PAD * 2) / 2 : (i / (data.length - 1)) * (W - PAD * 2));
    const y = H - PAD - (d.revenue / maxVal) * (H - PAD * 2);
    return { x, y, ...d };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = pts.length > 1
    ? `M${pts[0].x},${H - PAD} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${H-PAD} Z`
    : '';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {[0,0.25,0.5,0.75,1].map((t,i) => (
        <line key={i} x1={PAD} x2={W-PAD}
          y1={H-PAD-t*(H-PAD*2)} y2={H-PAD-t*(H-PAD*2)}
          stroke="#3f3f46" strokeWidth="1" />
      ))}
      {area && <path d={area} fill="url(#lineGrad)" />}
      {pts.length > 1 && (
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2.5"
          strokeLinejoin="round" strokeLinecap="round" />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={showLabels ? 4 : 3} fill="#3b82f6" stroke="white" strokeWidth="2" />
          {showLabels && (
            <text x={p.x} y={H-8} textAnchor="middle" fontSize="9" fill="#71717a">
              {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            </text>
          )}
          {showLabels && p.revenue > 0 && (
            <text x={p.x} y={p.y-10} textAnchor="middle" fontSize="8" fill="#3b82f6" fontWeight="700">
              {fmt(p.revenue)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
};

/** Horizontal bar chart */
const HBarChart = ({ data, colorKey = 'revenue', colors = BAR_COLORS }) => {
  if (!data || data.length === 0) return <EmptyChart />;
  const maxVal = Math.max(...data.map(d => d[colorKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((item, i) => {
        const pct = (item[colorKey] / maxVal) * 100;
        const col = colors[i % colors.length];
        const label = item.name || item.category || item.day || item.method || '';
        return (
          <div key={i}>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-semibold text-zinc-300 truncate max-w-[60%]">{label}</span>
              <span className="text-sm font-bold" style={{ color: col }}>
                {colorKey === 'revenue' ? fmt(item[colorKey]) : `×${item[colorKey]}`}
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: col }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Vertical bar chart (day-of-week) */
const DayOfWeekChart = ({ data }) => {
  if (!data || data.every(d => d.count === 0)) return <EmptyChart />;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const MAX_H = 100;
  return (
    <div className="flex items-end justify-between gap-2" style={{ height: MAX_H + 36 }}>
      {data.map((d, i) => {
        const barH = d.count > 0 ? Math.max((d.count / maxCount) * MAX_H, 6) : 2;
        return (
          <div key={i} className="flex flex-col items-center flex-1 group relative">
            <div
              className="absolute -top-6 bg-zinc-700 text-white text-[9px] font-bold rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none"
            >
              {d.count} orders
            </div>
            <div
              className="w-full rounded-t-lg transition-all duration-700"
              style={{ height: barH, background: DOW_COLORS[i] }}
            />
            <span className="text-[10px] font-semibold text-zinc-500 mt-1.5">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
};

/** Donut chart */
const DonutChart = ({ data }) => {
  if (!data || data.every(d => d.count === 0)) return <EmptyChart />;
  const total = data.reduce((s, d) => s + d.count, 0);
  const R = 60, cx = 80, cy = 80;
  const circumference = 2 * Math.PI * R;
  let offset = 0;
  const slices = data.filter(d => d.count > 0).map(d => {
    const dash = (d.count / total) * circumference;
    const slice = { ...d, dash, offset, pct: ((d.count / total) * 100).toFixed(1) };
    offset += dash;
    return slice;
  });
  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg viewBox="0 0 160 160" style={{ width: 130, height: 130, flexShrink: 0 }}>
        {slices.map((s, i) => (
          <circle key={i} cx={cx} cy={cy} r={R} fill="none"
            stroke={STATUS_COLORS[s.status] || '#94a3b8'}
            strokeWidth="28"
            strokeDasharray={`${s.dash} ${circumference - s.dash}`}
            strokeDashoffset={-s.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        ))}
        <text x={cx} y={cy-6} textAnchor="middle" fontSize="22" fontWeight="800" fill="#ffffff">{total}</text>
        <text x={cx} y={cy+14} textAnchor="middle" fontSize="10" fill="#71717a">Orders</text>
      </svg>
      <div className="space-y-2 flex-1">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ background: STATUS_COLORS[s.status] || '#52525b' }} />
              <span className="text-sm font-semibold text-zinc-300 capitalize">{s.status}</span>
            </div>
            <span className="text-sm font-bold text-zinc-500">{s.count} ({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Payment method chart */
const PaymentChart = ({ data }) => {
  if (!data || data.length === 0) return <EmptyChart />;
  const total = data.reduce((s, d) => s + d.revenue, 0);
  return (
    <div className="space-y-4">
      {data.map((item, i) => {
        const pct = total > 0 ? (item.revenue / total) * 100 : 0;
        const color = PM_COLORS[item.method] || '#94a3b8';
        return (
          <div key={i}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{PM_ICONS[item.method] || '🔄'}</span>
                <span className="text-sm font-semibold capitalize text-zinc-300">{item.method}</span>
                <span className="text-xs text-zinc-500">({item.count} orders)</span>
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color }}>{fmt(item.revenue)}</span>
                <span className="text-xs text-zinc-500 ml-1">({pct.toFixed(1)}%)</span>
              </div>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
              <div className="h-2.5 rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

/** Hourly heatmap */
const HourlyHeatmap = ({ data }) => {
  if (!data || data.length === 0) return <EmptyChart />;
  const maxCount = Math.max(...data.map(d => d.count), 1);
  const MEAL_LABELS = { 6: 'Morning', 12: 'Noon', 18: 'Evening', 22: 'Night' };
  return (
    <div>
      <div className="flex gap-1 flex-wrap">
        {data.map(({ hour, count }) => {
          const alpha = 0.08 + (count / maxCount) * 0.92;
          return (
            <div key={hour} className="relative group">
              <div className="w-9 h-9 rounded-lg transition-all duration-300 group-hover:scale-110 cursor-default flex items-end justify-center pb-1"
                style={{ background: `rgba(59,130,246,${alpha})` }}>
                {count > 0 && <span className="text-[8px] font-bold text-white">{count}</span>}
              </div>
              <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-zinc-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-20 transition-opacity">
                {hour}:00 — {count} order{count !== 1 ? 's' : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-1">
        {Object.entries(MEAL_LABELS).map(([h, label]) => (
          <span key={h} className="text-[10px] text-zinc-500">{label}</span>
        ))}
      </div>
    </div>
  );
};

const EmptyChart = () => (
  <div className="flex flex-col items-center justify-center py-8 text-zinc-600">
    <BarChart2 size={36} />
    <p className="text-sm mt-2">No data yet — place some orders first!</p>
  </div>
);

const Section = ({ title, icon: Icon, children, className = '', action }) => (
  <div className={`glass rounded-2xl overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-blue-400" />
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Date Preset Buttons ──────────────────────────────────────────────────────

const PRESETS = [
  { key: 'today', label: 'Today',   from: () => todayStr(),     to: () => todayStr() },
  { key: '7d',    label: 'Last 7d', from: () => daysAgoStr(6),  to: () => todayStr() },
  { key: '30d',   label: 'Last 30d',from: () => daysAgoStr(29), to: () => todayStr() },
  { key: 'all',   label: 'All Time',from: () => '2000-01-01',   to: () => todayStr() },
  { key: 'custom',label: 'Custom',  from: null, to: null },
];

// ─── CSV Export Helper ────────────────────────────────────────────────────────

const downloadCSV = (rows, from, to) => {
  if (!rows || rows.length === 0) return alert('No data to export for this period.');
  const headers = ['Bill ID','Date','Table','Items','Subtotal','Tax','Total','Status','Payment'];
  const escape = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const csvRows = [
    headers.join(','),
    ...rows.map(r => [
      r.billId,
      new Date(r.date).toLocaleString('en-IN'),
      r.tableNumber,
      escape(r.items),
      r.subTotal.toFixed(2),
      r.taxAmount.toFixed(2),
      r.totalAmount.toFixed(2),
      r.status,
      r.paymentMethod,
    ].join(',')),
  ];
  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `orders_${from}_to_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Main Page ────────────────────────────────────────────────────────────────

const Analytics = () => {
  const [data,        setData]        = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activePreset,setActivePreset]= useState('30d');
  const [from,        setFrom]        = useState(daysAgoStr(29));
  const [to,          setTo]          = useState(todayStr());
  const [customFrom,  setCustomFrom]  = useState('');
  const [customTo,    setCustomTo]    = useState('');
  const [activeItemKey,setActiveItemKey]=useState('revenue');

  const fetchData = useCallback((f, t) => {
    setLoading(true);
    api.get('/orders/analytics', { params: { from: f, to: t } })
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(from, to); }, [from, to, fetchData]);

  // ── Live refresh: re-fetch when POS generates a bill ──────────────
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel('tablepulse');
      bc.onmessage = (e) => {
        if (e.data?.type === 'order_created') fetchData(from, to);
      };
    } catch (_) {}
    return () => { try { bc?.close(); } catch (_) {} };
  }, [from, to, fetchData]);

  const applyPreset = (preset) => {
    setActivePreset(preset.key);
    if (preset.key !== 'custom') {
      setFrom(preset.from());
      setTo(preset.to());
    }
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    setFrom(customFrom);
    setTo(customTo);
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="p-2 md:p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400 tracking-tight">
            Analytics &amp; Insights
          </h2>
          <p className="text-sm text-zinc-500 mt-1">
            {data ? `Showing ${new Date(data.meta.from).toLocaleDateString('en-IN')} → ${new Date(data.meta.to).toLocaleDateString('en-IN')}` : 'Real-time restaurant data'}
          </p>
        </div>
        {data && (
          <button
            onClick={() => downloadCSV(data.exportRows, from, to)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200"
          >
            <Download size={15} /> Export CSV
          </button>
        )}
      </div>

      {/* Date Range Filter */}
      <div className="glass rounded-xl p-3.5 flex flex-wrap items-center gap-3">
        <Calendar size={15} className="text-blue-400 shrink-0" />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => applyPreset(p)}
              className={`px-4 py-1.5 text-xs font-bold rounded-full border transition-all ${
                activePreset === p.key
                  ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                  : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {activePreset === 'custom' && (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" />
            <span className="text-zinc-500 text-xs">→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="text-xs bg-zinc-800 border border-zinc-700 text-white rounded-lg px-3 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" />
            <button onClick={applyCustom}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500 animate-pulse gap-3">
          <Activity size={36} className="text-blue-400" />
          <p className="font-semibold">Crunching the numbers…</p>
        </div>
      )}
      {!loading && !data && (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-600 gap-3">
          <p>Failed to load analytics. Please try again.</p>
        </div>
      )}

      {!loading && data && (() => {
        const { kpi, dailyRevenue, hourlyOrders, dayOfWeek, topItems,
                categoryBreakdown, statusBreakdown, paymentBreakdown, revenueByTable } = data;
        return (
          <>
            {/* KPI Row — 5 cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
              <KpiCard icon={IndianRupee} label="Total Revenue"     value={fmt(kpi.totalRevenue)}   color="#22c55e" delta={kpi.delta.revenue} />
              <KpiCard icon={ShoppingBag} label="Total Orders"      value={kpi.totalOrders}          color="#3b82f6" delta={kpi.delta.orders} />
              <KpiCard icon={TrendingUp}  label="Avg. Order Value"  value={fmt(kpi.avgOrderValue)}   color="#8b5cf6" delta={kpi.delta.avgOrderValue} />
              <KpiCard icon={Percent}     label="Tax Collected"     value={fmt(kpi.totalTax)}         color="#f59e0b" />
              <KpiCard icon={XCircle}     label="Cancellation Rate" value={`${kpi.cancellationRate}%`} color="#ef4444" delta={kpi.delta.cancellationRate} sub="lower is better" />
            </div>

            {/* Row 1: Revenue trend + Status donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Section title="Revenue Trend" icon={TrendingUp} className="lg:col-span-2">
                <LineChart data={dailyRevenue} />
              </Section>
              <Section title="Order Status Breakdown" icon={PieChart}>
                <DonutChart data={statusBreakdown} />
              </Section>
            </div>

            {/* Row 2: Top items + Category breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Top Selling Items" icon={BarChart2}
                action={
                  <div className="flex gap-1.5">
                    {['revenue','quantity'].map(key => (
                      <button key={key} onClick={() => setActiveItemKey(key)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-full border transition-all ${
                          activeItemKey === key ? 'bg-blue-600 text-white border-blue-600 shadow' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
                        }`}>
                        By {key.charAt(0).toUpperCase() + key.slice(1)}
                      </button>
                    ))}
                  </div>
                }
              >
                <HBarChart data={topItems} colorKey={activeItemKey} />
              </Section>
              <Section title="Revenue by Category" icon={Tag}>
                <HBarChart
                  data={categoryBreakdown.map(d => ({ ...d, name: d.category }))}
                  colorKey="revenue"
                />
              </Section>
            </div>

            {/* Row 3: Day-of-week + Payment method */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Section title="Busiest Day of Week" icon={Repeat2}>
                <p className="text-xs text-zinc-600 mb-4">Order volume per day — useful for staffing decisions.</p>
                <DayOfWeekChart data={dayOfWeek} />
              </Section>
              <Section title="Payment Method Breakdown" icon={IndianRupee}>
                <PaymentChart data={paymentBreakdown} />
              </Section>
            </div>

            {/* Row 4: Revenue by table */}
            <Section title="Revenue by Table" icon={BarChart2}>
              <HBarChart
                data={revenueByTable.map(d => ({ name: `Table ${d.table}`, revenue: d.revenue }))}
                colorKey="revenue"
              />
            </Section>

            {/* Row 5: Hourly heatmap */}
            <Section title="Hourly Order Distribution (24h)" icon={Clock}>
              <p className="text-xs text-zinc-600 mb-4">Darker cells = more orders at that hour. Hover for details.</p>
              <HourlyHeatmap data={hourlyOrders} />
            </Section>
          </>
        );
      })()}
    </div>
  );
};

export default Analytics;
