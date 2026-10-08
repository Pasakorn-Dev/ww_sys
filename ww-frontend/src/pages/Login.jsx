// src/pages/Login.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Login สำหรับ WW_Report (Enterprise UI Version - Green Theme)
// - ดีไซน์แบบ Corporate เน้นความน่าเชื่อถือ สะอาดตา
// - โครงสร้างแบบ Split Screen สำหรับ Desktop
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

export default function Login() {
  const navigate = useNavigate();

  // ─── State ────────────────────────────────────────────────
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Effect: ถ้ามี token อยู่แล้ว → ข้ามไป dashboard ──────
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  // ─── Handler: Submit Login ────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (data?.success && data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.data));

        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ',
          timer: 1000,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#111827',
        });

        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ไม่สามารถเข้าสู่ระบบได้',
          text: data?.message || 'ชื่อผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง',
          confirmButtonColor: '#16a34a', // เปลี่ยนสีปุ่มแจ้งเตือนเป็นสีเขียว
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#111827',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาดของระบบ',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ในขณะนี้',
        confirmButtonColor: '#16a34a', // เปลี่ยนสีปุ่มแจ้งเตือนเป็นสีเขียว
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">
      
      {/* ─── ฝั่งซ้าย: Corporate Branding (แสดงเฉพาะจอใหญ่) ─── */}
      <div className="hidden lg:flex lg:w-1/2 bg-green-900 relative items-center justify-center overflow-hidden">
        {/* Pattern Background เบาๆ สำหรับองค์กร */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px]"></div>
        
        <div className="relative z-10 px-12 lg:px-20 text-white max-w-2xl">
          <div className="w-16 h-16 bg-white/10 rounded-lg flex items-center justify-center mb-8 border border-white/20">
            <i className="fas fa-chart-line text-3xl text-green-300"></i>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
            ระบบจัดการคลัง <br/>และวิเคราะห์ข้อมูล
          </h1>
          <p className="text-lg text-green-200 mb-8 font-light">
            WW_Report Enterprise System 
            ยกระดับการตัดสินใจทางธุรกิจด้วยข้อมูลที่แม่นยำและรายงานแบบเรียลไทม์
          </p>
          <div className="flex items-center text-sm text-green-300/80 font-medium">
            <i className="fas fa-shield-alt mr-2"></i>
            Secure & Encrypted Connection
          </div>
        </div>
      </div>

      {/* ─── ฝั่งขวา: Login Form ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 sm:p-10">
          
          {/* Header Mobile (กรณีจอเล็กที่มองไม่เห็นฝั่งซ้าย) */}
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center mx-auto mb-4 text-green-700 dark:text-green-400">
              <i className="fas fa-chart-line text-xl"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">WW_Report</h2>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">เข้าสู่ระบบ</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              กรุณากรอกข้อมูลประจำตัวองค์กรเพื่อเข้าใช้งาน
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                ชื่อผู้ใช้งาน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <i className="fas fa-user text-sm"></i>
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 dark:focus:ring-green-500 text-gray-900 dark:text-white text-sm transition-all"
                  placeholder="Employee ID หรือ Username"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                รหัสผ่าน
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-400">
                  <i className="fas fa-lock text-sm"></i>
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-md outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 dark:focus:ring-green-500 text-gray-900 dark:text-white text-sm transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Remember & Forgot Password */}
            <div className="flex items-center justify-between mt-2">
              <label className="flex items-center">
                <input type="checkbox" className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-600" />
                <span className="ml-2 text-sm text-gray-600 dark:text-slate-400">จดจำฉันไว้</span>
              </label>
              <a href="#" className="text-sm font-medium text-green-600 hover:text-green-500 dark:text-green-400">
                ลืมรหัสผ่าน?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 mt-6 border border-transparent rounded-md text-sm font-semibold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <i className="fas fa-circle-notch fa-spin"></i>
                  กำลังตรวจสอบ...
                </span>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </button>
          </form>

        </div>
        
        {/* Footer ด้านล่างฟอร์ม (Mobile & Desktop) */}
        <div className="absolute bottom-6 text-center lg:w-1/2">
          <p className="text-xs text-gray-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} WW Corporation. All rights reserved.
          </p>
        </div>
      </div>

    </div>
  );
}