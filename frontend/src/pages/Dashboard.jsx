import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { IndianRupee, ShoppingBag, TrendingUp, Clock } from 'lucide-react';

const Dashboard = () => {
  const [summary, setSummary] = useState({ totalSales: 0, totalOrders: 0, recentOrders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const { data } = await api.get('/orders/dashboard/summary');
        setSummary(data);
      } catch (error) {
        console.error("Error fetching summary", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchSummary, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-center text-zinc-400 animate-pulse">Loading dashboard...</div>;

  return (
    <div className="p-2 md:p-6 animate-in fade-in duration-500">
      <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-400 mb-8 tracking-tight">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:scale-105 transition-all duration-300 cursor-default">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-green-500/20 rounded-full blur-xl opacity-70 transition-all"></div>
          <div className="flex items-center space-x-6 relative z-10">
            <div className="p-4 bg-green-500/10 text-green-400 rounded-2xl border border-green-500/20">
              <IndianRupee size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Revenue</p>
              <p className="text-4xl font-extrabold text-white mt-1">&#x20B9;{summary.totalSales.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:scale-105 transition-all duration-300 cursor-default">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl opacity-70 transition-all"></div>
          <div className="flex items-center space-x-6 relative z-10">
            <div className="p-4 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20">
              <ShoppingBag size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Total Orders</p>
              <p className="text-4xl font-extrabold text-white mt-1">{summary.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="glass p-8 rounded-3xl relative overflow-hidden group hover:scale-105 transition-all duration-300 cursor-default">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-violet-500/20 rounded-full blur-xl opacity-70 transition-all"></div>
          <div className="flex items-center space-x-6 relative z-10">
            <div className="p-4 bg-violet-500/10 text-violet-400 rounded-2xl border border-violet-500/20">
              <TrendingUp size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Avg. Order Value</p>
              <p className="text-4xl font-extrabold text-white mt-1">
                &#x20B9;{summary.totalOrders > 0 ? (summary.totalSales / summary.totalOrders).toFixed(2) : '0.00'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="px-8 py-6 border-b border-zinc-800/60 bg-zinc-900/40">
          <h3 className="text-xl font-bold text-white">Recent Transactions</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-800/60">
            <thead className="bg-zinc-900/50">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Bill ID</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Items</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Date</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-4 text-left text-xs font-bold text-zinc-500 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40 bg-transparent">
              {summary.recentOrders.map((order) => {
                const itemNames = order.items?.map(i => i.menuItem?.name).join(', ') || 'N/A';
                return (
                <tr key={order._id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-blue-400">{order.billId}</td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-zinc-400 max-w-[200px] truncate cursor-help" title={itemNames}>
                    {itemNames}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-zinc-400">
                    <div className="flex items-center space-x-2">
                      <Clock size={16} className="text-zinc-600" />
                      <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-white font-extrabold">&#x20B9;{order.totalAmount.toFixed(2)}</td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      order.status === 'completed' ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                </tr>
                );
              })}
              {summary.recentOrders.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-8 py-8 text-center text-sm font-medium text-zinc-600">No recent transactions found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
