// src/pages/Login.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Login สำหรับ PPOS System (Premium UI Version)
// - ใช้ apiFetch แทน fetch ตรงๆ
// - บันทึก token + user ลง localStorage
// - Redirect ไป /dashboard เมื่อ login สำเร็จ
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

      console.log('Login Response:', data);

      if (data?.success && data?.token) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.data));

        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ!',
          timer: 1000,
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a',
        });

        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          confirmButtonColor: '#4f46e5',
          background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f8fafc' : '#0f172a',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        confirmButtonColor: '#4f46e5',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden selection:bg-indigo-500/30 transition-colors duration-500">
      
      {/* Background Decorative Elements (แสงวงกลมฟุ้งๆ ดูกระจายตัวแบบล้ำๆ) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/30 dark:bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/30 dark:bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '10s' }} />

      {/* Login Card (Glassmorphism) */}
      <div className="relative w-full max-w-md p-8 sm:p-10 mx-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-white/50 dark:border-slate-800/50 z-10 transform transition-all hover:-translate-y-1 hover:shadow-2xl duration-500">

        {/* Header Section */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 transform -rotate-3 transition-transform hover:rotate-0 duration-300">
            <i className="fas fa-layer-group text-3xl text-white"></i>
          </div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 tracking-tight mb-2">
            WW_Report
          </h1>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            ระบบจัดการคลังและวิเคราะห์ข้อมูลระดับองค์กร
          </p>
        </div>

        {/* Form Section */}
        <form onSubmit={handleLogin} className="space-y-6">

          {/* Username Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-user text-sm"></i>
            </div>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all duration-300 placeholder:text-slate-400"
              placeholder="ชื่อผู้ใช้งาน (Username)"
            />
          </div>

          {/* Password Input */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
              <i className="fas fa-lock text-sm"></i>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 dark:focus:border-indigo-400 text-slate-700 dark:text-slate-200 text-sm font-medium transition-all duration-300 placeholder:text-slate-400"
              placeholder="รหัสผ่าน (Password)"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-4 px-4 mt-2 border border-transparent rounded-2xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed overflow-hidden"
          >
            {/* Hover Glare Effect */}
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[glare_1s_ease-in-out]" />
            
            {loading ? (
              <span className="flex items-center gap-2">
                <i className="fas fa-circle-notch fa-spin"></i>
                กำลังยืนยันตัวตน...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                เข้าสู่ระบบ
                <i className="fas fa-arrow-right transition-transform group-hover:translate-x-1"></i>
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 tracking-wide">
            POWERED BY <span className="text-indigo-500 dark:text-indigo-400">AI</span> & MODERN WEB TECH
          </p>
        </div>

      </div>

      {/* CSS สำหรับ Glare Animation ของปุ่ม */}
      <style>{`
        @keyframes glare {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}