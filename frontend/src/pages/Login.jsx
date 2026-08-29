import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ArrowRight, Zap, BarChart2, UtensilsCrossed } from 'lucide-react';

const FEATURES = [
  { icon: Zap,           label: 'Instant Billing',     desc: 'Generate bills in seconds with smart POS' },
  { icon: BarChart2,     label: 'Live Analytics',       desc: 'Real-time revenue & order insights'       },
  { icon: UtensilsCrossed, label: 'Menu Management',   desc: 'Update your menu on the fly'               },
];

const Login = () => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { login }   = useContext(AuthContext);
  const navigate    = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-zinc-950">

      {/* ── LEFT PANEL — hero imagery ─────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between overflow-hidden">
        {/* Hero background photo */}
        <img
          src="/images/hero.png"
          alt="TablePulse restaurant"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/80 via-zinc-950/50 to-blue-950/60" />

        {/* Top brand badge */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white">TablePulse</span>
          </div>
        </div>

        {/* Centre quote */}
        <div className="relative z-10 px-10">
          <p className="text-4xl font-extrabold text-white leading-snug">
            The smarter way to<br />
            <span className="text-shimmer">run your restaurant.</span>
          </p>
          <p className="mt-4 text-zinc-400 text-sm leading-relaxed max-w-sm">
            From orders to analytics — everything you need to keep your tables turning and your numbers growing.
          </p>
        </div>

        {/* Food photo strip */}
        <div className="relative z-10 p-10 space-y-6">
          <img
            src="/images/food.png"
            alt="Fine dining dishes"
            className="w-full h-40 object-cover rounded-2xl border border-white/10 shadow-2xl"
          />

          {/* Feature pills */}
          <div className="grid grid-cols-1 gap-3">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-blue-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-bold">{label}</p>
                  <p className="text-zinc-500 text-[10px] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL — login form ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12 relative">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Analytics-bg decorative image (top-right corner) */}
        <img
          src="/images/analytics-bg.png"
          alt=""
          className="absolute top-0 right-0 w-56 h-56 object-cover opacity-[0.07] rounded-bl-3xl pointer-events-none"
        />

        <div className="relative z-10 w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
              <UtensilsCrossed size={17} className="text-white" />
            </div>
            <span className="text-xl font-black text-white">TablePulse</span>
          </div>

          {/* Heading */}
          <h2 className="text-3xl font-extrabold text-white mb-1">Welcome back</h2>
          <p className="text-zinc-500 text-sm mb-8">Sign in to your TablePulse dashboard</p>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@resto.com"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/70 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-zinc-800/70 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 group mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </span>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Hint */}
          <p className="mt-8 text-center text-xs text-zinc-600">
            Default credentials: <span className="text-zinc-400 font-medium">admin@resto.com</span> / <span className="text-zinc-400 font-medium">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
