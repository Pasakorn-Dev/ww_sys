// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Layout from './components/Layout'; // นำเข้า Layout ที่เราเพิ่งสร้าง
import Dashboard from './pages/Dashboard';
import Branches from './pages/Branches';
// import Products from './pages/Products'; // นำเข้าหน้า Products
import SyncMaster from './pages/SyncMaster'; // 1. นำเข้าไฟล์ใหม่

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
          <Route path="/sync-master" element={<SyncMaster />} /> {/* 2. เพิ่ม Route ใหม่ */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;