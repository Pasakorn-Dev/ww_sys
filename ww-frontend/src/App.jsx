// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout'; // นำเข้า Layout ที่เราเพิ่งสร้าง
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
import Products from './pages/Products'; // นำเข้าหน้า Products

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* ครอบหน้าเว็บที่มีเมนูซ้ายด้วย Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/products" element={<Products />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;