// src/components/Layout.jsx
import { useEffect, useRef, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import apiFetch from '../services/apiFetch';
import Swal from 'sweetalert2';
import { clearSession, getUser, setUser as saveUser } from '../utils/session';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State ────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const verifiedRef = useRef(false); // ยืนยัน session กับเซิร์ฟเวอร์ครั้งเดียวต่อการเปิดหน้า
  const [menus, setMenus] = useState([]);
  const [loadError, setLoadError] = useState(''); // ปัญหาที่ไม่ใช่ "หมดอายุ" เช่น server/DB ล่ม — แจ้งผู้ใช้แทนการเด้งไป login
  const [expandedMenu, setExpandedMenu] = useState(null);
  
  // State สำหรับควบคุม Sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // สำหรับ Mobile (เปิด/ปิด)
  const [isCollapsed, setIsCollapsed] = useState(false);     // 🌟 สำหรับ Desktop (ย่อ/ขยาย)
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // ─── Effect: จัดการ Dark mode ─────────────────────────────
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // ─── Effect: ตรวจสอบ session (cookie) + โหลดเมนู ─────────────────────
  useEffect(() => {
    // แสดงข้อมูลที่ cache ไว้ก่อนเพื่อไม่ให้หน้ากะพริบ แล้วยืนยันกับเซิร์ฟเวอร์ด้านล่าง
    const cached = getUser();
    if (cached) setUser(cached);

    let isMounted = true;

    (async () => {
      try {
        // 1) ยืนยันตัวตนกับเซิร์ฟเวอร์ (อ่านจาก httpOnly cookie) — เป็นแหล่งข้อมูลจริงของ user
        if (!verifiedRef.current) {
          const me = await apiFetch('/auth/me');
          if (!isMounted) return;
          if (!me) return; // 401: apiFetch เคลียร์ session และพาไปหน้า login ให้แล้ว
          if (!me.success) {
            // 5xx / 403 ฯลฯ: ไม่ใช่ session หมดอายุ → แจ้งปัญหา ไม่เตะไป login วนซ้ำ
            setLoadError(me.message || 'ระบบไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง');
            return;
          }
          setLoadError('');
          verifiedRef.current = true;
          setUser(me.data);
          saveUser(me.data);
        }

        // 2) โหลดเมนูตามสิทธิ์
        const data = await apiFetch('/menus');
        if (!isMounted) return;
        if (!data) return; // 401: apiFetch จัดการแล้ว

        if (data.success) {
          setMenus(data.data);
          const currentMenu = data.data.find((m) => m.link === location.pathname);
          if (currentMenu && currentMenu.parent_id !== 0) {
            setExpandedMenu(currentMenu.parent_id);
          }

          // 🌟 2. เพิ่มระบบ Route Guard ป้องกันการพิมพ์ URL ตรงนี้ 🌟
          // ยกเว้นหน้า /dashboard ให้เข้าได้เสมอ (หน้าแรกสุดหลังจาก Login)
          if (location.pathname !== '/dashboard' && location.pathname !== '/') {
            
            // เช็คว่า path ปัจจุบัน มีอยู่ในรายการเมนูที่ User มีสิทธิ์หรือไม่
            const hasPermission = data.data.some((menu) => menu.link === location.pathname);
            
            if (!hasPermission) {
              // ถ้าตรวจสอบแล้วไม่มีสิทธิ์ ให้แจ้งเตือนและเตะกลับหน้า Dashboard ทันที
              Swal.fire({
                icon: 'error',
                title: 'ไม่มีสิทธิ์เข้าถึง',
                text: 'คุณไม่มีสิทธิ์เข้าใช้งานเมนูนี้',
                confirmButtonColor: '#3b82f6'
              });
              navigate('/dashboard', { replace: true });
              return; // หยุดการทำงานของฟังก์ชัน
            }
          }
        } else {
          setLoadError(data.message || 'โหลดเมนูไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
      } catch (err) {
        // เช่น backend ปิดอยู่ / เครือข่ายหลุด — ไม่ใช่เรื่องสิทธิ์ จึงไม่ล้าง session
        console.error('Error fetching menus:', err);
        if (isMounted) setLoadError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่อีกครั้ง');
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

  // ─── Handler: Logout ──────────────────────────────────────
  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' }); // ให้เซิร์ฟเวอร์ล้าง httpOnly cookie
    } catch { /* ออกจากระบบฝั่ง client ต่อให้เรียกไม่สำเร็จ */ }
    clearSession();
    navigate('/login', { replace: true });
  };

  // ─── Error state (server/DB ไม่พร้อม) ──────────────────────
  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-100 dark:bg-gray-900 dark:text-white">
        <p>{loadError}</p>
        <div className="flex gap-3">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded bg-green-600 text-white">ลองใหม่</button>
          <button onClick={handleLogout} className="px-4 py-2 rounded border border-gray-400">กลับหน้าเข้าสู่ระบบ</button>
        </div>
      </div>
    );
  }

  // ─── Loading state ────────────────────────────────────────
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 dark:text-white">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  const mainMenus = menus.filter((m) => m.parent_id === 0 || !m.parent_id);

  // ─── Render ───────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">

      {/* Overlay สำหรับมือถือ */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* 🌟 Sidebar 🌟 */}
      {/* เพิ่ม Transition width และเช็ค isCollapsed */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shadow-xl transform transition-all duration-300 ease-in-out md:static 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Header / Logo ของ Sidebar */}
        <div className={`p-4 h-16 text-xl font-bold border-b border-gray-700 dark:border-gray-800 bg-gray-900 dark:bg-black text-blue-400 flex items-center transition-all ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && <span className="truncate">WW_Report</span>}
          
          {/* ปุ่มเปิด-ปิด Sidebar (เฉพาะหน้าจอคอม) */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:block text-gray-400 hover:text-white transition-colors"
            title={isCollapsed ? 'ขยายเมนู' : 'ยุบเมนู'}
          >
            <i className={`fas fa-bars ${isCollapsed ? 'text-xl' : ''}`}></i>
          </button>

          {/* ปุ่มปิด Sidebar (เฉพาะมือถือ) */}
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Menu list */}
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {mainMenus.map((menu) => {
            const subMenus = menus.filter((m) => m.parent_id === menu.id);
            const isExpanded = expandedMenu === menu.id;

            // ─── เมนูที่มี sub-menu ─────────────────────────
            if (subMenus.length > 0) {
              return (
                <div key={menu.id} className="space-y-1">
                  <button
                    onClick={() => {
                      if (isCollapsed) setIsCollapsed(false); // ถ้าเมนูยุบอยู่ ให้ขยายออกมาก่อน
                      setExpandedMenu(isExpanded ? null : menu.id);
                    }}
                    title={isCollapsed ? menu.menu_name : ''}
                    className={`w-full flex items-center py-3 px-4 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg text-gray-300 transition-colors focus:outline-none ${isCollapsed ? 'justify-center' : 'justify-between'}`}
                  >
                    <div className="flex items-center">
                      <i className={`${menu.icon} ${isCollapsed ? 'text-xl mx-auto' : 'mr-3 w-5 text-center'}`}></i>
                      {!isCollapsed && <span className="font-medium truncate">{menu.menu_name}</span>}
                    </div>
                    {!isCollapsed && (
                      <svg
                        className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>

                  {/* ซับเมนู (ซ่อนอัตโนมัติถ้ายุบ Sidebar) */}
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded && !isCollapsed ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="pl-6 pr-2 py-2 space-y-1 mt-1 bg-gray-900/50 dark:bg-black/30 rounded-lg">
                      {subMenus.map((sub) => (
                        <Link
                          key={sub.id}
                          to={sub.link}
                          onClick={() => setIsSidebarOpen(false)}
                          className={`flex items-center py-2 px-4 rounded-md transition-colors text-sm ${
                            location.pathname === sub.link
                              ? 'bg-blue-600 text-white'
                              : 'text-gray-400 hover:bg-blue-600 hover:text-white'
                          }`}
                        >
                          <i className={`${sub.icon || 'fas fa-angle-right'} mr-3 w-4 text-center text-xs`}></i>
                          <span className="truncate">{sub.menu_name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            // ─── เมนูเดี่ยว ────────────────────────────────
            return (
              <Link
                key={menu.id}
                to={menu.link}
                title={isCollapsed ? menu.menu_name : ''}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center py-3 px-4 rounded-lg transition-colors ${
                  isCollapsed ? 'justify-center' : ''
                } ${
                  location.pathname === menu.link
                    ? 'bg-gray-700 dark:bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <i className={`${menu.icon} ${isCollapsed ? 'text-xl mx-auto' : 'mr-3 w-5 text-center'}`}></i>
                {!isCollapsed && <span className="font-medium truncate">{menu.menu_name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-transparent dark:border-gray-700 p-4 flex justify-between items-center z-10 transition-colors duration-300 h-16">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 p-2 -ml-2"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">
              ระบบรายงานการผลิต
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Dark mode toggle */}
            <button
              onClick={toggleTheme}
              className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 transform bg-white rounded-full shadow-md transition-transform duration-300 ${
                  theme === 'dark' ? 'translate-x-9' : 'translate-x-1'
                }`}
              >
                {theme === 'dark' ? (
                  <i className="fas fa-moon text-blue-600 text-xs"></i>
                ) : (
                  <i className="fas fa-sun text-yellow-500 text-xs"></i>
                )}
              </span>
            </button>

            {/* User greeting */}
            <span className="text-gray-600 dark:text-gray-300 hidden md:block">
              สวัสดี,{' '}
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {user.fullname || user.username}
              </span>
            </span>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg shadow-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center gap-2"
            >
              <i className="fas fa-sign-out-alt"></i>
              <span className="hidden md:inline">ออก</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}