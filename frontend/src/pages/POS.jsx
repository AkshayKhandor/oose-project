import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { ShoppingCart, Plus, Minus, Trash2, UtensilsCrossed, CheckCircle2 } from 'lucide-react';

// Broadcast order events to Analytics page
const broadcast = (type) => {
  try { new BroadcastChannel('tablepulse').postMessage({ type }); } catch (_) {}
};

// Veg indicator dot
const VegDot = () => (
  <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm border-2 border-green-500 shrink-0">
    <span className="w-2 h-2 rounded-full bg-green-500" />
  </span>
);

const PAYMENT_METHODS = [
  { key: 'cash', label: '💵 Cash'  },
  { key: 'upi',  label: '📱 UPI'   },
  { key: 'card', label: '💳 Card'  },
];

const POS = () => {
  const [menuItems,     setMenuItems]     = useState([]);
  const [cart,          setCart]          = useState([]);
  const [tableNumber,   setTableNumber]   = useState('');
  const [categoryFilter,setCategoryFilter]= useState('All');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkoutDone,  setCheckoutDone]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const successTimer = useRef(null);

  useEffect(() => {
    api.get('/menu').then(({ data }) => setMenuItems(data)).catch(console.error);
  }, []);

  /* ── Cart helpers ──────────────────────────────────────────────── */
  const addToCart = (item) => {
    setCart(prev => {
      const found = prev.find(c => c.menuItem._id === item._id);
      return found
        ? prev.map(c => c.menuItem._id === item._id ? { ...c, quantity: c.quantity + 1 } : c)
        : [...prev, { menuItem: item, quantity: 1, price: item.price }];
    });
  };

  const updateQuantity = (id, delta) =>
    setCart(prev => prev.map(c =>
      c.menuItem._id === id
        ? { ...c, quantity: Math.max(1, c.quantity + delta) }
        : c
    ));

  const removeFromCart = (id) => setCart(prev => prev.filter(c => c.menuItem._id !== id));

  const subTotal    = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const taxAmount   = subTotal * 0.05;
  const totalAmount = subTotal + taxAmount;
  const cartCount   = cart.reduce((s, c) => s + c.quantity, 0);

  /* ── Checkout ──────────────────────────────────────────────────── */
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/orders', {
        items: cart.map(c => ({ menuItem: c.menuItem._id, quantity: c.quantity, price: c.price })),
        tableNumber, subTotal, taxAmount, totalAmount, paymentMethod,
      });

      // Notify Analytics to refresh immediately
      broadcast('order_created');

      // Print receipt
      const pw = window.open('', '', 'height=600,width=480');
      pw.document.write(`<html><head><title>TablePulse – Bill</title>
        <style>
          *{margin:0;padding:0;box-sizing:border-box;}
          body{font-family:'Segoe UI',sans-serif;padding:24px;color:#111;background:#fff;}
          .logo{font-size:22px;font-weight:900;letter-spacing:-0.5px;color:#2563eb;margin-bottom:2px;}
          .sub{font-size:11px;color:#6b7280;margin-bottom:16px;}
          .meta{font-size:12px;color:#374151;margin-bottom:12px;line-height:1.7;}
          hr{border:none;border-top:1px dashed #d1d5db;margin:12px 0;}
          .row{display:flex;justify-content:space-between;padding:6px 0;font-size:13px;color:#374151;}
          .row .name{flex:1;}
          .total-row{display:flex;justify-content:space-between;padding:8px 0;font-size:15px;font-weight:700;color:#111;}
          .badge{display:inline-block;background:#eff6ff;color:#1d4ed8;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-bottom:14px;}
          .footer{margin-top:20px;text-align:center;font-size:10px;color:#9ca3af;}
        </style></head><body>
        <div class="logo">TablePulse</div>
        <div class="sub">Smart Restaurant Management</div>
        <div class="badge">Bill #${data.billId}</div>
        <div class="meta">
          <strong>Table:</strong> ${tableNumber || 'Takeaway'}<br/>
          <strong>Payment:</strong> ${paymentMethod.toUpperCase()}<br/>
          <strong>Date:</strong> ${new Date().toLocaleString('en-IN')}
        </div>
        <hr/>
        ${cart.map(c => `<div class="row"><span class="name">${c.menuItem.name} × ${c.quantity}</span><span>₹${(c.price * c.quantity).toFixed(2)}</span></div>`).join('')}
        <hr/>
        <div class="row"><span>Subtotal</span><span>₹${subTotal.toFixed(2)}</span></div>
        <div class="row"><span>GST (5%)</span><span>₹${taxAmount.toFixed(2)}</span></div>
        <hr/>
        <div class="total-row"><span>Total</span><span>₹${totalAmount.toFixed(2)}</span></div>
        <div class="footer">Thank you for dining with us · TablePulse</div>
      </body></html>`);
      pw.document.close(); pw.print();

      setCart([]); setTableNumber('');
      setCheckoutDone(true);
      clearTimeout(successTimer.current);
      successTimer.current = setTimeout(() => setCheckoutDone(false), 3000);
    } catch (err) {
      console.error('Checkout failed', err);
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const categories   = ['All', ...new Set(menuItems.map(i => i.category))];
  const filteredItems = categoryFilter === 'All' ? menuItems : menuItems.filter(i => i.category === categoryFilter);

  /* ── Render ────────────────────────────────────────────────────── */
  return (
    <div className="h-full flex flex-col md:flex-row gap-4 animate-in fade-in duration-500">

      {/* ── Menu panel ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Category tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 shrink-0">
          {categories.map(cat => (
            <button key={cat} onClick={() => setCategoryFilter(cat)}
              className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 ${
                categoryFilter === cat
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filteredItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-3">
            <UtensilsCrossed size={40} />
            <p className="font-semibold">No items in this category</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pb-8">
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pr-1">
              {filteredItems.map(item => {
                const inCart = cart.find(c => c.menuItem._id === item._id);
                return (
                  <div key={item._id} onClick={() => addToCart(item)}
                    className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40 flex flex-col">

                    {/* Image */}
                    <div className="relative h-36 overflow-hidden bg-zinc-800 shrink-0">
                      {item.image
                        ? <img src={item.image} alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        : <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed size={32} className="text-zinc-600" />
                          </div>
                      }
                      {/* Gradient overlay bottom */}
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 via-transparent to-transparent" />

                      {/* In-cart badge */}
                      {inCart && (
                        <div className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow">
                          {inCart.quantity} in cart
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3 flex flex-col flex-1 gap-1">
                      <div className="flex items-start gap-1.5">
                        <VegDot />
                        <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 flex-1">{item.name}</h4>
                      </div>
                      <p className="text-[10px] text-zinc-500 font-medium">{item.category}</p>
                      {item.description && (
                        <p className="text-[10px] text-zinc-600 line-clamp-2 leading-relaxed">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-auto pt-2 border-t border-zinc-800">
                        <span className="text-blue-400 font-extrabold text-sm">₹{item.price.toFixed(2)}</span>
                        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full group-hover:bg-blue-600/20 group-hover:text-blue-400 transition-colors">
                          + Add
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Cart panel ─────────────────────────────────────────────── */}
      <div className="w-full md:w-[360px] shrink-0 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden sticky top-0 self-start md:h-[calc(100vh-5rem)]">

        {/* Header */}
        <div className="px-5 py-4 bg-zinc-800/80 border-b border-zinc-700/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-blue-400" />
            <span className="text-sm font-extrabold text-white">Current Order</span>
          </div>
          {cartCount > 0 && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{cartCount}</span>
          )}
        </div>

        {/* Table + payment */}
        <div className="px-4 py-3 border-b border-zinc-800 space-y-2.5 shrink-0">
          <input type="text" placeholder="Table / Section (optional)"
            value={tableNumber} onChange={e => setTableNumber(e.target.value)}
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm rounded-xl focus:outline-none focus:border-blue-500 transition-colors" />
          <div className="flex gap-2">
            {PAYMENT_METHODS.map(pm => (
              <button key={pm.key} onClick={() => setPaymentMethod(pm.key)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                  paymentMethod === pm.key
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                }`}>
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-700 py-12 gap-3">
              <ShoppingCart size={36} />
              <p className="text-sm font-semibold text-zinc-600">Your cart is empty</p>
              <p className="text-xs text-zinc-700">Tap any item to add it</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menuItem._id}
                className="flex items-center gap-3 p-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl">
                {item.menuItem.image && (
                  <img src={item.menuItem.image} alt={item.menuItem.name}
                    className="w-10 h-10 rounded-lg object-cover shrink-0 border border-zinc-700" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{item.menuItem.name}</p>
                  <p className="text-xs text-blue-400 font-bold mt-0.5">₹{(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => updateQuantity(item.menuItem._id, -1)}
                    className="w-6 h-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center">
                    <Minus size={11} />
                  </button>
                  <span className="w-6 text-center text-sm font-bold text-white">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItem._id, 1)}
                    className="w-6 h-6 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center">
                    <Plus size={11} />
                  </button>
                  <button onClick={() => removeFromCart(item.menuItem._id)}
                    className="w-6 h-6 rounded-lg bg-zinc-700 text-red-400 hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center ml-1">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill summary + checkout */}
        <div className="px-4 py-4 border-t border-zinc-800 bg-zinc-900 shrink-0 space-y-3">
          <div className="space-y-1.5 text-xs text-zinc-500">
            <div className="flex justify-between">
              <span>Subtotal</span><span className="text-zinc-300">₹{subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST 5%</span><span className="text-zinc-300">₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800 text-base font-extrabold text-white">
              <span>Total</span><span className="text-blue-400">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <button onClick={handleCheckout} disabled={cart.length === 0 || loading}
            className={`w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
              checkoutDone
                ? 'bg-green-600 text-white'
                : cart.length === 0
                  ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700'
                  : 'bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 hover:-translate-y-0.5'
            }`}>
            {checkoutDone
              ? <><CheckCircle2 size={16} /> Bill Generated!</>
              : loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : '🖨️  Print Bill & Checkout'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default POS;
