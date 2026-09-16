// src/pages/Login.jsx
// ─────────────────────────────────────────────────────────────
// หน้า Login สำหรับ PPOS System
// - ใช้ apiFetch แทน fetch ตรงๆ (ไม่มี hardcode URL)
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
      // เรียก API ผ่าน apiFetch (ไม่ต้องใส่ http://localhost:5000/api เอง)
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      console.log('Login Response:', data);

      // ─── สำเร็จ ─────────────────────────────────────────
      // Backend ส่ง: { success, token, data: { id, username, fullname, ... } }
      if (data?.success && data?.token) {
        // 1. เก็บ token
        localStorage.setItem('token', data.token);

        // 2. เก็บข้อมูล user (ใช้ key "data" ให้ตรงกับ backend)
        localStorage.setItem('user', JSON.stringify(data.data));

        // 3. แจ้งเตือนสำเร็จ
        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ!',
          timer: 1000,
          showConfirmButton: false,
        });

        // 4. Redirect ไป dashboard
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1000);
      }
      // ─── ไม่สำเร็จ ──────────────────────────────────────
      else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: data?.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          confirmButtonColor: '#3b82f6',
        });
      }
    } catch (error) {
      // ─── Error: เชื่อมต่อไม่ได้ ─────────────────────────
      console.error('Login error:', error);
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้',
        confirmButtonColor: '#3b82f6',
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
            PPOS System
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            กรุณาเข้าสู่ระบบเพื่อจัดการหลังบ้าน
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5">

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ชื่อผู้ใช้งาน (Username)
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              placeholder="กรอกชื่อผู้ใช้งาน"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              รหัสผ่าน (Password)
            </label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              placeholder="••••••••"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                กำลังตรวจสอบสิทธิ์...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i>
                เข้าสู่ระบบ
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}