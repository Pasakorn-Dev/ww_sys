// src/components/Layout.jsx
// ─────────────────────────────────────────────────────────────
// Layout หลักของระบบ PPOS
// - Sidebar ที่โหลดเมนูตามสิทธิ์ (RBAC)
// - Header + Dark mode toggle
// - ตรวจสอบ token ก่อนเข้าใช้งานทุกครั้ง
// - ใช้ apiFetch แทน fetch ตรงๆ (ไม่มี hardcode URL)
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';
import apiFetch from '../services/apiFetch';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ─── State ────────────────────────────────────────────────
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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

  // ─── Effect: ตรวจสอบ token + โหลดเมนู ─────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // 1. ถ้าไม่มี token/user → กลับไป login
    if (!token || !storedUser || storedUser === 'undefined' || storedUser === 'null') {
      localStorage.clear();
      navigate('/login', { replace: true });
      return;
    }

    // 2. Parse user (ถ้า parse ไม่ได้ → session เสีย → login ใหม่)
    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Invalid user session', error);
      localStorage.clear();
      navigate('/login', { replace: true });
      return;
    }

    // 3. โหลดเมนูตามสิทธิ์
    let isMounted = true;

    (async () => {
      try {
        const data = await apiFetch('/menus');

        // ถ้า component unmount แล้ว → ไม่ต้อง setState
        if (!isMounted) return;

        if (data?.success) {
          setMenus(data.data);

          // Auto-expand parent menu ของหน้าที่กำลังเปิดอยู่
          const currentMenu = data.data.find((m) => m.link === location.pathname);
          if (currentMenu && currentMenu.parent_id !== 0) {
            setExpandedMenu(currentMenu.parent_id);
          }
        } else {
          // backend ตอบ success:false → token ไม่ valid
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Error fetching menus:', err);
        if (isMounted) {
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [navigate, location.pathname]);

  // ─── Handler: Logout ──────────────────────────────────────
  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  // ─── Loading state ────────────────────────────────────────
  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 dark:text-white">
        กำลังโหลดข้อมูล...
      </div>
    );
  }

  // ─── Filter เมนูหลัก (parent_id = 0 หรือ null) ────────────
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

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-6 text-2xl font-bold border-b border-gray-700 dark:border-gray-800 bg-gray-900 dark:bg-black text-blue-400 flex justify-between items-center">
          <span>WW_Report</span>
          <button
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Menu list */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {mainMenus.map((menu) => {
            const subMenus = menus.filter((m) => m.parent_id === menu.id);
            const isExpanded = expandedMenu === menu.id;

            // ─── เมนูที่มี sub-menu ─────────────────────────
            if (subMenus.length > 0) {
              return (
                <div key={menu.id} className="space-y-1">
                  <button
                    onClick={() => setExpandedMenu(isExpanded ? null : menu.id)}
                    className="w-full flex items-center justify-between py-2 px-4 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg text-gray-300 transition-colors focus:outline-none"
                  >
                    <div className="flex items-center">
                      <i className={`${menu.icon} mr-3 w-5 text-center`}></i>
                      <span className="font-medium">{menu.menu_name}</span>
                    </div>
                    <svg
                      className={`w-4 h-4 transition-transform duration-300 ${
                        isExpanded ? 'rotate-180 text-blue-400' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
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
                          <i
                            className={`${sub.icon || 'fas fa-angle-right'} mr-3 w-4 text-center text-xs`}
                          ></i>
                          {sub.menu_name}
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
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center py-2 px-4 rounded-lg transition-colors ${
                  location.pathname === menu.link
                    ? 'bg-gray-700 dark:bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <i className={`${menu.icon} mr-3 w-5 text-center`}></i>
                <span className="font-medium">{menu.menu_name}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-transparent dark:border-gray-700 p-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 p-2 -ml-2"
            >
              <i className="fas fa-bars text-xl"></i>
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">
              ระบบจัดการหลังบ้าน
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