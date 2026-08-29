import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Brain, TrendingUp, Users, AlertTriangle, Zap, BarChart2, GitBranch, Activity } from 'lucide-react';

const fmt = n => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const SEG_COLORS = { Champions: '#22c55e', Loyal: '#3b82f6', Potential: '#8b5cf6', 'At Risk': '#f59e0b', Lost: '#ef4444' };

// ── Tiny SVG line chart ───────────────────────────────────────────────────────
const MiniLine = ({ points, color = '#3b82f6', width = 400, height = 100 }) => {
  if (!points || points.length < 2) return null;
  const maxY = Math.max(...points.map(p => p.y), 1);
  const minY = Math.min(...points.map(p => p.y), 0);
  const range = maxY - minY || 1;
  const scaleX = i => (i / (points.length - 1)) * width;
  const scaleY = v => height - ((v - minY) / range) * height * 0.85 - 8;
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i)},${scaleY(p.y)}`).join(' ');
  const area = `M${scaleX(0)},${height} ${points.map((p, i) => `L${scaleX(i)},${scaleY(p.y)}`).join(' ')} L${scaleX(points.length - 1)},${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`g${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => p.isAnomaly && (
        <circle key={i} cx={scaleX(i)} cy={scaleY(p.y)} r="5" fill="#ef4444" stroke="white" strokeWidth="1.5" />
      ))}
    </svg>
  );
};

// ── Forecast chart with CI band ───────────────────────────────────────────────
const ForecastChart = ({ historical, forecast }) => {
  const all = [...(historical || []), ...(forecast || [])];
  if (all.length < 2) return <p className="text-zinc-600 text-sm py-8 text-center">Not enough data</p>;
  const W = 560, H = 160, PAD = 8;
  const allVals = all.map(d => d.actual ?? d.predicted ?? 0);
  const upper = forecast?.map(d => d.upper) || [];
  const maxY = Math.max(...allVals, ...upper, 1);
  const sx = i => PAD + (i / (all.length - 1)) * (W - PAD * 2);
  const sy = v => H - PAD - (v / maxY) * (H - PAD * 2);
  const histLen = (historical || []).length;
  const actPts = (historical || []).map((d, i) => ({ x: sx(i), y: sy(d.actual), py: sy(d.predicted) }));
  const forPts = (forecast || []).map((d, i) => ({ x: sx(histLen + i), y: sy(d.predicted), lo: sy(d.lower), hi: sy(d.upper) }));
  const ciPath = forPts.length > 1
    ? `M${forPts[0].x},${forPts[0].hi} ${forPts.map(p => `L${p.x},${p.hi}`).join(' ')} L${forPts[forPts.length-1].x},${forPts[forPts.length-1].lo} ${[...forPts].reverse().map(p => `L${p.x},${p.lo}`).join(' ')} Z`
    : '';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      {[0,0.25,0.5,0.75,1].map((t, i) => (
        <line key={i} x1={PAD} x2={W-PAD} y1={H-PAD-t*(H-PAD*2)} y2={H-PAD-t*(H-PAD*2)} stroke="#27272a" strokeWidth="1" />
      ))}
      {ciPath && <path d={ciPath} fill="#8b5cf688" />}
      {actPts.length > 1 && <>
        <polyline points={actPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
        <polyline points={actPts.map(p => `${p.x},${p.py}`).join(' ')} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 3" />
      </>}
      {forPts.length > 0 && (
        <polyline points={forPts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeDasharray="6 3" strokeLinejoin="round" />
      )}
      {actPts.length > 0 && histLen > 0 && (
        <line x1={actPts[actPts.length-1].x} y1={PAD} x2={actPts[actPts.length-1].x} y2={H-PAD} stroke="#52525b" strokeWidth="1" strokeDasharray="3 3" />
      )}
      <text x={W-70} y={14} fill="#8b5cf6" fontSize="9" fontWeight="700">── Forecast</text>
      <text x={W-70} y={26} fill="#3b82f6" fontSize="9">── Actual</text>
      <text x={W-70} y={38} fill="#06b6d4" fontSize="9">╌ Model fit</text>
    </svg>
  );
};

// ── Horizontal bar ────────────────────────────────────────────────────────────
const HBar = ({ label, value, max, color, sub }) => (
  <div className="mb-3">
    <div className="flex justify-between mb-1">
      <span className="text-sm font-semibold text-zinc-300 truncate max-w-[65%]">{label}</span>
      <span className="text-sm font-bold" style={{ color }}>{sub || value}</span>
    </div>
    <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
      <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }} />
    </div>
  </div>
);

// ── Section card ──────────────────────────────────────────────────────────────
const Card = ({ title, icon: Icon, iconColor = '#3b82f6', badge, children, className = '' }) => (
  <div className={`glass rounded-2xl overflow-hidden ${className}`}>
    <div className="px-5 py-3.5 border-b border-zinc-800/60 bg-zinc-900/50 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg" style={{ background: `${iconColor}22` }}>
          <Icon size={15} style={{ color: iconColor }} />
        </div>
        <h3 className="text-sm font-bold text-white">{title}</h3>
      </div>
      {badge && <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400">{badge}</span>}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ── Metric pill ───────────────────────────────────────────────────────────────
const Pill = ({ label, value, color }) => (
  <div className="flex flex-col items-center p-3 bg-zinc-800/60 rounded-xl">
    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{label}</span>
    <span className="text-lg font-extrabold" style={{ color }}>{value}</span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
const DataScience = () => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    api.get('/ds/insights')
      .then(r => setData(r.data))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 text-zinc-500 gap-4 animate-pulse">
      <Brain size={48} className="text-violet-400" />
      <p className="font-semibold text-lg">Running models…</p>
      <p className="text-sm text-zinc-600">Crunching your restaurant data with ML</p>
    </div>
  );

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-96 text-zinc-600 gap-3">
      <AlertTriangle size={40} className="text-red-400" />
      <p>{error || 'Failed to load insights.'}</p>
    </div>
  );

  if (data.empty) return (
    <div className="flex flex-col items-center justify-center h-96 text-zinc-600 gap-3">
      <BarChart2 size={40} />
      <p>No order data yet — place some orders first!</p>
    </div>
  );

  const { modelSummary, revHistorical, revForecast, associations, rfmSegments, segmentDistribution, anomalies, featureImportance, scatterData, scatterCorr, aovByDay, cntForecast } = data;

  const maxFeat = Math.max(...featureImportance.map(f => f.importance), 0.001);
  const maxAssoc = Math.max(...associations.map(a => a.lift), 0.001);
  const maxSeg   = Math.max(...segmentDistribution.map(s => s.count), 1);

  const aovPoints = aovByDay.map(d => ({ y: d.aov }));
  const anomalyPoints = revHistorical.map(d => ({ y: d.actual, isAnomaly: false }));

  return (
    <div className="p-2 md:p-6 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 shadow-lg shadow-violet-500/30">
              <Brain size={22} className="text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 tracking-tight">
              Data Science Studio
            </h2>
          </div>
          <p className="text-sm text-zinc-500 ml-14">ML-powered insights • {modelSummary.revenueModel.dataPoints} days of data</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'R² Score', value: modelSummary.revenueModel.r2.toFixed(3), color: '#22c55e' },
            { label: 'Rules Found', value: modelSummary.associationModel.rulesFound, color: '#8b5cf6' },
            { label: 'Segments', value: modelSummary.rfmModel.entitiesSegmented, color: '#3b82f6' },
            { label: 'Anomalies', value: anomalies.length, color: '#ef4444' },
          ].map(m => (
            <div key={m.label} className="glass px-4 py-2 rounded-xl text-center">
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{m.label}</p>
              <p className="text-xl font-extrabold" style={{ color: m.color }}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Model Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Revenue Forecast', algo: modelSummary.revenueModel.algorithm, r2: modelSummary.revenueModel.r2, color: '#3b82f6' },
          { icon: Activity, label: 'AOV Trend', algo: modelSummary.aovModel.algorithm, r2: modelSummary.aovModel.r2, color: '#06b6d4' },
          { icon: GitBranch, label: 'Market Basket', algo: modelSummary.associationModel.algorithm, r2: null, extra: `${modelSummary.associationModel.rulesFound} rules`, color: '#8b5cf6' },
          { icon: Users, label: 'RFM Segmentation', algo: modelSummary.rfmModel.algorithm, r2: null, extra: `${modelSummary.rfmModel.segments} segments`, color: '#22c55e' },
        ].map(m => (
          <div key={m.label} className="glass p-5 rounded-2xl relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="absolute -right-5 -top-5 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: m.color }} />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl" style={{ background: `${m.color}22` }}>
                  <m.icon size={16} style={{ color: m.color }} />
                </div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{m.label}</p>
              </div>
              <p className="text-[10px] text-zinc-600 mb-2 font-mono">{m.algo}</p>
              {m.r2 !== null ? (
                <div>
                  <p className="text-[10px] text-zinc-500 mb-0.5">R² (fit quality)</p>
                  <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${Math.max(m.r2 * 100, 2)}%`, background: m.color }} />
                  </div>
                  <p className="text-right text-[10px] font-bold mt-0.5" style={{ color: m.color }}>{m.r2.toFixed(3)}</p>
                </div>
              ) : (
                <p className="text-sm font-bold" style={{ color: m.color }}>{m.extra}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Forecast */}
      <Card title="Revenue Forecast — OLS Linear Regression" icon={TrendingUp} iconColor="#3b82f6"
        badge={`Next 7 days • R²=${modelSummary.revenueModel.r2}`}>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Pill label="Slope (₹/day)" value={modelSummary.revenueModel.slope >= 0 ? `+${modelSummary.revenueModel.slope}` : modelSummary.revenueModel.slope} color="#3b82f6" />
          <Pill label="Intercept" value={fmt(modelSummary.revenueModel.intercept)} color="#06b6d4" />
          <Pill label="MSE" value={fmt(modelSummary.revenueModel.mse)} color="#f59e0b" />
        </div>
        <ForecastChart historical={revHistorical} forecast={revForecast} />
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {revForecast.map((d, i) => (
            <div key={i} className="text-center p-2 bg-zinc-800/60 rounded-xl border border-violet-500/20">
              <p className="text-[9px] text-zinc-500">{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
              <p className="text-sm font-extrabold text-violet-400">{fmt(d.predicted)}</p>
              <p className="text-[9px] text-zinc-600">{fmt(d.lower)}–{fmt(d.upper)}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Feature Importance + Association Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Feature Importance (Pearson Correlation)" icon={Zap} iconColor="#f59e0b" badge="vs Revenue">
          <p className="text-xs text-zinc-600 mb-4">Correlation of each feature with order revenue. |r| closer to 1 = stronger signal.</p>
          {featureImportance.map((f, i) => (
            <HBar key={i} label={f.name}
              value={f.importance} max={maxFeat}
              color={f.correlation >= 0 ? '#22c55e' : '#ef4444'}
              sub={`r = ${f.correlation >= 0 ? '+' : ''}${f.correlation.toFixed(3)}`} />
          ))}
        </Card>

        <Card title="Market Basket Analysis" icon={GitBranch} iconColor="#8b5cf6" badge="Association Rules">
          <p className="text-xs text-zinc-600 mb-4">Items frequently ordered together. Lift &gt; 1 = positive association.</p>
          {associations.length === 0
            ? <p className="text-sm text-zinc-600 py-4 text-center">Need more varied orders for rules.</p>
            : associations.map((a, i) => (
              <div key={i} className="mb-3 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-semibold text-zinc-200 truncate max-w-[70%]">{a.pair}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${a.lift >= 1.5 ? 'bg-green-500/20 text-green-400' : a.lift >= 1 ? 'bg-blue-500/20 text-blue-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    Lift {a.lift}×
                  </span>
                </div>
                <div className="flex gap-3 text-[10px] text-zinc-500">
                  <span>Support: {a.support}%</span>
                  <span>Confidence: {a.confidence}%</span>
                  <span>Count: {a.count}</span>
                </div>
              </div>
            ))
          }
        </Card>
      </div>

      {/* RFM Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Customer Segments" icon={Users} iconColor="#22c55e" badge="RFM Scoring">
          <p className="text-xs text-zinc-600 mb-4">Tables scored on Recency, Frequency &amp; Monetary value (1–5 scale).</p>
          {segmentDistribution.map((s, i) => (
            <HBar key={i} label={s.segment} value={s.count} max={maxSeg}
              color={SEG_COLORS[s.segment] || '#94a3b8'} sub={`${s.count} table${s.count !== 1 ? 's' : ''}`} />
          ))}
        </Card>

        <Card title="RFM Top Tables" icon={Users} iconColor="#3b82f6" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  {['Table', 'Recency', 'Frequency', 'Monetary', 'R', 'F', 'M', 'Segment'].map(h => (
                    <th key={h} className="pb-3 pr-4 text-[10px] font-bold text-zinc-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rfmSegments.map((r, i) => (
                  <tr key={i} className="border-t border-zinc-800/60">
                    <td className="py-2.5 pr-4 font-semibold text-white whitespace-nowrap">{r.table}</td>
                    <td className="pr-4 text-zinc-400">{r.recency}d</td>
                    <td className="pr-4 text-zinc-400">{r.frequency}</td>
                    <td className="pr-4 text-zinc-400">{fmt(r.monetary)}</td>
                    {[r.R, r.F, r.M].map((score, j) => (
                      <td key={j} className="pr-4">
                        <span className="inline-block w-6 h-6 rounded-md text-center text-xs font-bold leading-6"
                          style={{ background: `hsl(${score * 24}, 70%, 35%)`, color: 'white' }}>{score}</span>
                      </td>
                    ))}
                    <td>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: `${SEG_COLORS[r.segment] || '#52525b'}22`, color: SEG_COLORS[r.segment] || '#94a3b8' }}>
                        {r.segment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Anomaly Detection + AOV Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Anomaly Detection (Z-Score)" icon={AlertTriangle} iconColor="#ef4444" badge="|z| > 2σ">
          <p className="text-xs text-zinc-600 mb-4">Days where revenue deviated more than 2 standard deviations from the mean.</p>
          {anomalies.length === 0
            ? <p className="text-sm text-zinc-600 py-4 text-center">No anomalies detected — data looks stable ✓</p>
            : anomalies.map((a, i) => (
              <div key={i} className="flex items-center justify-between mb-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div>
                  <p className="text-sm font-bold text-white">{new Date(a.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                  <p className="text-xs text-zinc-500">Revenue: {fmt(a.revenue)}</p>
                </div>
                <span className={`text-sm font-extrabold px-3 py-1 rounded-full ${a.zScore > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  z = {a.zScore > 0 ? '+' : ''}{a.zScore}
                </span>
              </div>
            ))
          }
        </Card>

        <Card title="Average Order Value Trend" icon={Activity} iconColor="#06b6d4" badge={`R²=${modelSummary.aovModel.r2}`}>
          <p className="text-xs text-zinc-600 mb-2">30-day AOV with OLS trend line (slope: {modelSummary.aovModel.slope >= 0 ? '+' : ''}{modelSummary.aovModel.slope} ₹/day).</p>
          <MiniLine points={aovPoints} color="#06b6d4" height={120} />
          <div className="flex justify-between mt-2">
            {aovByDay.filter((_, i) => i % 7 === 0).map((d, i) => (
              <span key={i} className="text-[9px] text-zinc-600">{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            ))}
          </div>
        </Card>
      </div>

      {/* Order Count Forecast */}
      <Card title="Order Volume Forecast — Next 7 Days" icon={BarChart2} iconColor="#22c55e">
        <div className="grid grid-cols-7 gap-2">
          {cntForecast.map((d, i) => (
            <div key={i} className="text-center p-3 bg-zinc-800/60 rounded-xl border border-green-500/20">
              <p className="text-[9px] text-zinc-500 mb-1">{new Date(d.date).toLocaleDateString('en-IN', { weekday: 'short' })}</p>
              <p className="text-[9px] text-zinc-600">{new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
              <div className="my-2 h-12 flex items-end justify-center">
                <div className="w-6 rounded-t-md bg-gradient-to-t from-green-600 to-green-400"
                  style={{ height: `${Math.max((d.predicted / Math.max(...cntForecast.map(x => x.predicted), 1)) * 100, 10)}%` }} />
              </div>
              <p className="text-sm font-extrabold text-green-400">{Math.round(d.predicted)}</p>
              <p className="text-[9px] text-zinc-600">orders</p>
            </div>
          ))}
        </div>
      </Card>

    </div>
  );
};

export default DataScience;
