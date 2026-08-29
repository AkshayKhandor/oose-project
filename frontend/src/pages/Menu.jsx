import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Plus, Edit2, Trash2 } from 'lucide-react';

const Menu = () => {
  const [items, setItems] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', price: '', category: '', image: '' });

  const fetchMenu = async () => {
    try {
      const { data } = await api.get('/menu');
      setItems(data);
    } catch (error) {
      console.error('Error fetching menu', error);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/menu', formData);
      setShowAddForm(false);
      setFormData({ name: '', price: '', category: '', image: '' });
      fetchMenu();
    } catch (error) {
      console.error('Error adding item', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await api.delete(`/menu/${id}`);
        fetchMenu();
      } catch (error) {
        console.error('Error deleting item', error);
      }
    }
  };

  return (
    <div className="p-2 md:p-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-gray-800 to-blue-800 tracking-tight">Menu Management</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-sky-600 text-white px-5 py-3 rounded-2xl hover:from-blue-700 hover:to-sky-700 transition-all duration-300 shadow-lg shadow-blue-200 transform hover:-translate-y-0.5 font-bold"
        >
          <Plus size={20} />
          <span>Add Item</span>
        </button>
      </div>

      {showAddForm && (
        <div className="glass p-8 rounded-3xl shadow-xl border border-white/60 mb-10 animate-in slide-in-from-top-4 duration-300">
          <h3 className="text-xl font-bold mb-6 text-gray-800">Add New Menu Item</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Name</label>
              <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full border-gray-200 rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="e.g. Garlic Bread" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹)</label>
              <input type="number" step="0.01" required value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} className="w-full border-gray-200 rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="5.99" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category</label>
              <select required value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})} className="w-full border-gray-200 rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white">
                <option value="">Select Category</option>
                <option value="Starters">Starters</option>
                <option value="Main Course">Main Course</option>
                <option value="Beverages">Beverages</option>
                <option value="Desserts">Desserts</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Image URL</label>
              <input type="text" value={formData.image} onChange={(e) => setFormData({...formData, image: e.target.value})} className="w-full border-gray-200 rounded-xl p-3 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" placeholder="https://..." />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 font-bold transition-colors">Cancel</button>
              <button type="submit" className="px-6 py-3 bg-gradient-to-r from-blue-600 to-sky-600 text-white rounded-xl hover:from-blue-700 hover:to-sky-700 shadow-md font-bold transition-all">Save Item</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {items.map((item) => (
          <div key={item._id} className="glass rounded-3xl overflow-hidden flex flex-col group hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-white/50">
            <div className="h-56 bg-gray-100 overflow-hidden relative">
              {item.image ? (
                <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">No Image</div>
              )}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-sm font-extrabold text-blue-700 shadow-sm">
                ${item.price.toFixed(2)}
              </div>
            </div>
            <div className="p-6 flex-1 flex flex-col bg-white/40">
              <h3 className="font-extrabold text-xl text-gray-800 mb-1 leading-tight">{item.name}</h3>
              <p className="text-sm font-medium text-blue-500 mb-6 uppercase tracking-wider">{item.category}</p>
              
              <div className="mt-auto flex justify-end space-x-2 pt-4 border-t border-gray-200/50">
                <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(item._id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Menu;
