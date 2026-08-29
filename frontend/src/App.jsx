import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Menu from './pages/Menu';
import POS from './pages/POS';
import Analytics from './pages/Analytics';
import DataScience from './pages/DataScience';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans antialiased">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="menu" element={<Menu />} />
            <Route path="pos" element={<POS />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="data-science" element={<DataScience />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
};

export default App;
