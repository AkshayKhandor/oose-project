import React, { useContext } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, UtensilsCrossed, Receipt, LogOut, LineChart, Brain } from 'lucide-react';

const Layout = () => {
  const { user, logout } = useContext(AuthContext);
  const location         = useLocation();
  const navigate         = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard',    path: '/',          icon: <LayoutDashboard size={19} /> },
    { name: 'POS & Billing',path: '/pos',       icon: <Receipt size={19} />         },
    { name: 'Analytics',    path: '/analytics',    icon: <LineChart size={19} />      },
    { name: 'Data Science',  path: '/data-science', icon: <Brain size={19} />          },
    { name: 'Menu',         path: '/menu',      icon: <UtensilsCrossed size={19} /> },
  ];

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="w-64 hidden md:flex flex-col bg-zinc-900/80 border-r border-zinc-800/60 backdrop-blur-xl relative z-20">
        {/* Top accent line */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-blue-500 via-violet-500 to-transparent" />

        {/* Brand */}
        <div className="p-7 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-blue-500/30 shrink-0">
            <UtensilsCrossed size={17} className="text-white" />
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">TablePulse</h1>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 mt-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-semibold text-sm ${
                      active
                        ? 'bg-gradient-to-r from-blue-600/30 to-violet-600/20 text-white border border-blue-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={active ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-300'}>
                      {item.icon}
                    </span>
                    {item.name}
                    {active && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User + Logout */}
        <div className="p-4 border-t border-zinc-800/60 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] font-medium text-blue-400 uppercase tracking-wider">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full gap-2 py-2.5 px-4 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 rounded-xl transition-all duration-200 text-sm font-semibold"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Subtle radial glow behind content */}
        <div className="absolute top-0 right-0 w-[600px] h-[400px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative max-w-7xl mx-auto h-full p-4 md:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
