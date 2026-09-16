This file is a merged representation of a subset of the codebase, containing specifically included files, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.jsx
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
src/
  components/
    BranchPriceModal.jsx
    Layout.jsx
  pages/
    Branches.jsx
    Dashboard.jsx
    Login.jsx
    Products.jsx
  App.jsx
  main.jsx
```

# Files

## File: src/components/BranchPriceModal.jsx
```javascript
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function BranchPriceModal({ product, isOpen, onClose, onSaved }) {
  const [branchPrices, setBranchPrices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      fetchBranchPrices();
    }
  }, [isOpen, product]);

  const fetchBranchPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${product.id}/branch-prices`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setBranchPrices(data.data);
      } else {
        Swal.fire('ข้อผิดพลาด', data.message || 'ไม่สามารถโหลดข้อมูลราคาสาขาได้', 'error');
      }
    } catch (err) {
      console.error('Fetch branch prices error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (branchId, field, value) => {
    setBranchPrices(prev =>
      prev.map(item =>
        item.branch_id === branchId ? { ...item, [field]: value } : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5000/api/products/${product.id}/branch-prices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ prices: branchPrices })
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกราคาสาขาสำเร็จ',
          timer: 1500,
          showConfirmButton: false
        });
        if (onSaved) onSaved();
        onClose();
      } else {
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (err) {
      console.error('Save branch prices error:', err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transform transition-all">
        
        {/* Header */}
        <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <i className="fas fa-tags text-purple-600 dark:text-purple-400"></i>
              กำหนดราคาขายตามสาขา
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              สินค้า: <span className="font-semibold text-blue-600 dark:text-blue-400">{product?.name}</span> 
              <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-mono">
                ราคากลาง: ฿{Number(product?.price || 0).toFixed(2)}
              </span>
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-lg transition-colors"
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4 custom-scrollbar">
          {loading ? (
            <div className="text-center py-10 text-gray-500 dark:text-gray-400 flex flex-col items-center gap-2">
              <i className="fas fa-circle-notch fa-spin text-2xl text-blue-500"></i>
              <span>กำลังดึงข้อมูลสาขาตามสิทธิ์...</span>
            </div>
          ) : branchPrices.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              ไม่พบสาขาที่คุณมีสิทธิ์จัดการ
            </div>
          ) : (
            branchPrices.map(item => (
              <div 
                key={item.branch_id} 
                className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-750 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-sm"
              >
                {/* ชื่อสาขา */}
                <div className="sm:w-1/3">
                  <span className="font-bold text-gray-800 dark:text-gray-200 block text-sm flex items-center gap-2">
                    <i className="fas fa-store text-blue-500"></i>
                    {item.branch_name}
                  </span>
                  <span className="text-xs text-gray-400">
                    {item.price !== null && item.price !== '' ? 'ใช้ราคาเฉพาะสาขา' : 'ใช้ราคากลางอัตโนมัติ'}
                  </span>
                </div>

                {/* ช่องกรอกราคา Override */}
                <div className="sm:w-1/3">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">
                    ราคาขายสาขา (฿)
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    placeholder={`ราคากลาง (฿${product?.price})`}
                    value={item.price ?? ''}
                    onChange={(e) => handleInputChange(item.branch_id, 'price', e.target.value)}
                    className="w-full px-3 py-1.5 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  />
                </div>

                {/* สวิตช์เปิด/ปิดขายเฉพาะสาขา */}
                <div className="sm:w-1/4 flex items-center sm:justify-end gap-2 pt-1 sm:pt-0">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={item.is_active}
                      onChange={(e) => handleInputChange(item.branch_id, 'is_active', e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                    <span className="ml-2 text-xs font-semibold text-gray-700 dark:text-gray-300">
                      {item.is_active ? 'เปิดขาย' : 'ปิดขาย'}
                    </span>
                  </label>
                </div>

              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            ยกเลิก
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving || loading}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> กำลังบันทึก...
              </>
            ) : (
              <>
                <i className="fas fa-save"></i> บันทึกราคาสาขา
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
```

## File: src/pages/Branches.jsx
```javascript
// src/pages/Branches.jsx
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [permissions, setPermissions] = useState({ can_add: false, can_edit: false, can_delete: false });
  const [loading, setLoading] = useState(true);

  // State Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ branch_code: '', branch_name: '', contact_number: '', address: '', is_active: true });

  useEffect(() => {
    const token = localStorage.getItem('token');
    // โหลดสิทธิ์
    fetch('http://localhost:5000/api/menus', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const branchMenu = data.data.find(m => m.link === '/branches');
          if (branchMenu) setPermissions({ can_add: branchMenu.can_add, can_edit: branchMenu.can_edit, can_delete: branchMenu.can_delete });
        }
      });
    // โหลดสาขา
    fetchBranches(token);
  }, []);

  const fetchBranches = async (token) => {
    try {
      const res = await fetch('http://localhost:5000/api/branches', { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setBranches(data.data);
      setLoading(false);
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบข้อมูล?', text: "คุณจะไม่สามารถกู้คืนข้อมูลนี้ได้!", icon: 'warning',
      showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#6b7280',
      confirmButtonText: 'ใช่, ลบเลย!', cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:5000/api/branches/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
        Swal.fire('ลบสำเร็จ!', 'ข้อมูลสาขาถูกลบเรียบร้อยแล้ว', 'success');
        setBranches(branches.filter(b => b.id !== id));
      } else { Swal.fire('ลบไม่สำเร็จ!', data.message, 'error'); }
    } catch (error) { Swal.fire('ข้อผิดพลาด!', 'เกิดข้อผิดพลาดในการลบข้อมูล', 'error'); }
  };

  const openModal = (branch = null) => {
    if (branch) {
      setEditId(branch.id);
      setFormData({ ...branch });
    } else {
      setEditId(null);
      setFormData({ branch_code: '', branch_name: '', contact_number: '', address: '', is_active: true });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => { setIsModalOpen(false); setEditId(null); };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const url = editId ? `http://localhost:5000/api/branches/${editId}` : 'http://localhost:5000/api/branches';
    const method = editId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(formData) });
      const data = await res.json();

      if (data.success) {
        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true })
            .fire({ icon: 'success', title: editId ? 'แก้ไขสาขาสำเร็จ' : 'เพิ่มสาขาสำเร็จ' });
        closeModal();
        fetchBranches(token);
      } else { Swal.fire('ข้อผิดพลาด', data.message, 'warning'); }
    } catch (error) { Swal.fire('ระบบขัดข้อง', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์', 'error'); }
  };

  if (loading) return <div className="p-8 text-center">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">จัดการสาขา (Branches)</h2>
        {permissions.can_add && (
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-colors flex items-center gap-2" onClick={() => openModal()}>
            <i className="fas fa-plus"></i> เพิ่มสาขา
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
            <tr>
              <th className="p-4">รหัสสาขา</th>
              <th className="p-4">ชื่อสาขา</th>
              <th className="p-4">เบอร์ติดต่อ</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {branches.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">ไม่มีข้อมูลสาขา</td></tr>
            ) : (
              branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 last:border-0">
                  <td className="p-4 font-medium">{branch.branch_code}</td>
                  <td className="p-4">{branch.branch_name}</td>
                  <td className="p-4">{branch.contact_number || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${branch.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                      {branch.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                      {permissions.can_edit && (
                        <button 
                          onClick={() => openModal(branch)} 
                          className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors inline-flex items-center gap-2 text-sm"
                        >
                          <i className="fas fa-edit"></i> แก้ไข
                        </button>
                      )}
                      {permissions.can_delete && (
                        <button 
                          onClick={() => handleDelete(branch.id)} 
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm transition-colors inline-flex items-center gap-2 text-sm"
                        >
                          <i className="fas fa-trash-alt"></i> ลบ
                        </button>
                      )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">{editId ? 'แก้ไขสาขา' : 'เพิ่มสาขาใหม่'}</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-200"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสสาขา *</label><input type="text" name="branch_code" required value={formData.branch_code} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อสาขา *</label><input type="text" name="branch_name" required value={formData.branch_name} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">เบอร์ติดต่อ</label><input type="text" name="contact_number" value={formData.contact_number} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none" /></div>
              <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ที่อยู่</label><textarea name="address" rows="2" value={formData.address} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none resize-none"></textarea></div>
              {editId && (
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="is_active" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">เปิดใช้งานสาขานี้</label>
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow">บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
```

## File: src/pages/Dashboard.jsx
```javascript
// src/pages/Dashboard.jsx
export default function Dashboard() {
  return (
    <div className="p-4 md:p-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-100">ภาพรวมระบบ</h3>
        <p className="text-gray-600 dark:text-gray-300">
          ยินดีต้อนรับสู่ระบบ PPOS Back-Office! เลือกเมนูทางด้านซ้ายเพื่อเริ่มต้นใช้งาน
        </p>
      </div>
    </div>
  );
}
```

## File: src/main.jsx
```javascript
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

## File: src/components/Layout.jsx
```javascript
// src/components/Layout.jsx
import { useEffect, useState } from 'react';
import { useNavigate, Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [menus, setMenus] = useState([]);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // ตรวจสอบสิทธิ์และดึงเมนู
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    // ถ้าไม่มี Token หรือข้อมูล User ไม่ถูกต้อง ให้ดีดกลับไปหน้า Login ทันที
    if (!token || !storedUser || storedUser === 'undefined' || storedUser === 'null') {
      localStorage.clear();
      navigate('/login', { replace: true });
      return;
    }

    try {
      setUser(JSON.parse(storedUser));
    } catch (error) {
      console.error('Invalid user session', error);
      localStorage.clear();
      navigate('/login', { replace: true });
      return;
    }

    // ดึงเมนูตามสิทธิ์
    fetch('http://localhost:5000/api/menus', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMenus(data.data);
          const currentMenu = data.data.find(m => m.link === location.pathname);
          if (currentMenu && currentMenu.parent_id !== 0) {
             setExpandedMenu(currentMenu.parent_id);
          }
        } else {
          // ถ้า Token หมดอายุหรือไม่ถูกต้อง
          localStorage.clear();
          navigate('/login', { replace: true });
        }
      })
      .catch(err => {
        console.error('Error fetching menus:', err);
      });
  }, [navigate, location.pathname]);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login', { replace: true });
  };

  if (!user) {
    return <div className="h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 dark:text-white">กำลังโหลดข้อมูล...</div>;
  }

  const mainMenus = menus.filter(m => m.parent_id === 0 || !m.parent_id);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden transition-colors duration-300">
      
      {/* Overlay สำหรับมือถือ */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 dark:bg-gray-950 text-white flex flex-col shadow-xl transform transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 text-2xl font-bold border-b border-gray-700 dark:border-gray-800 bg-gray-900 dark:bg-black text-blue-400 flex justify-between items-center">
          <span>PPOS Admin</span>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          {mainMenus.map(menu => {
            const subMenus = menus.filter(m => m.parent_id === menu.id);
            const isExpanded = expandedMenu === menu.id;

            if (subMenus.length > 0) {
              return (
                <div key={menu.id} className="space-y-1">
                  <button onClick={() => setExpandedMenu(isExpanded ? null : menu.id)} className="w-full flex items-center justify-between py-2 px-4 hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg text-gray-300 transition-colors focus:outline-none">
                    <div className="flex items-center"><i className={`${menu.icon} mr-3 w-5 text-center`}></i><span className="font-medium">{menu.menu_name}</span></div>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-blue-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-6 pr-2 py-2 space-y-1 mt-1 bg-gray-900/50 dark:bg-black/30 rounded-lg">
                      {subMenus.map(sub => (
                        <Link key={sub.id} to={sub.link} onClick={() => setIsSidebarOpen(false)} className={`flex items-center py-2 px-4 rounded-md transition-colors text-sm ${location.pathname === sub.link ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-blue-600 hover:text-white'}`}>
                          <i className={`${sub.icon || 'fas fa-angle-right'} mr-3 w-4 text-center text-xs`}></i>{sub.menu_name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            } else {
              return (
                <Link key={menu.id} to={menu.link} onClick={() => setIsSidebarOpen(false)} className={`flex items-center py-2 px-4 rounded-lg transition-colors ${location.pathname === menu.link ? 'bg-gray-700 dark:bg-gray-800 text-white' : 'text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-800'}`}>
                  <i className={`${menu.icon} mr-3 w-5 text-center`}></i><span className="font-medium">{menu.menu_name}</span>
                </Link>
              );
            }
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-transparent dark:border-gray-700 p-4 flex justify-between items-center z-10 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-600 dark:text-gray-300 hover:text-gray-900 p-2 -ml-2"><i className="fas fa-bars text-xl"></i></button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 hidden sm:block">ระบบจัดการหลังบ้าน</h2>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={toggleTheme} className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors duration-300 focus:outline-none shadow-inner ${theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`inline-flex items-center justify-center w-6 h-6 transform bg-white rounded-full shadow-md transition-transform duration-300 ${theme === 'dark' ? 'translate-x-9' : 'translate-x-1'}`}>
                {theme === 'dark' ? <i className="fas fa-moon text-blue-600 text-xs"></i> : <i className="fas fa-sun text-yellow-500 text-xs"></i>}
              </span>
            </button>
            <span className="text-gray-600 dark:text-gray-300 hidden md:block">สวัสดี, <span className="font-bold text-blue-600 dark:text-blue-400">{user.fullname}</span></span>
            <button onClick={handleLogout} className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg shadow-sm hover:bg-red-100 dark:hover:bg-red-500/20 transition flex items-center gap-2">
              <i className="fas fa-sign-out-alt"></i><span className="hidden md:inline">ออก</span>
            </button>
          </div>
        </header>

        {/* จุดแสดงเนื้อหาของแต่ละหน้า */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

## File: src/pages/Login.jsx
```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard'; // บังคับเปลี่ยนหน้าทันทีถ้ามี Token อยู่แล้ว
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      console.log('Login Response:', data); // ปริ้นท์เช็คโครงสร้างข้อมูลใน Console

      if (response.ok && data.success) {
        // บันทึก Token ลง LocalStorage
        localStorage.setItem('token', data.token);
        
        // ป้องกันกรณี Backend ส่ง user มาเป็นรูปแบบอื่น ให้เซฟสำรองไว้
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        } else {
          localStorage.setItem('user', JSON.stringify({ fullname: username }));
        }

        Swal.fire({
          icon: 'success',
          title: 'เข้าสู่ระบบสำเร็จ!',
          timer: 1000,
          showConfirmButton: false,
        });

        // ใช้คำสั่งเปลี่ยนหน้าตรงๆ ของเบราว์เซอร์ ป้องกันปัญหาราวเตอร์ค้าง
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 1000);

      } else {
        Swal.fire({
          icon: 'error',
          title: 'เข้าสู่ระบบไม่สำเร็จ',
          text: data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
          confirmButtonColor: '#3b82f6',
        });
      }
    } catch (error) {
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">PPOS System</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">กรุณาเข้าสู่ระบบเพื่อจัดการหลังบ้าน</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อผู้ใช้งาน (Username)</label>
            <input 
              type="text" 
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              placeholder="กรอกชื่อผู้ใช้งาน"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสผ่าน (Password)</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white outline-none"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 px-4 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> กำลังตรวจสอบสิทธิ์...
              </>
            ) : (
              <>
                <i className="fas fa-sign-in-alt"></i> เข้าสู่ระบบ
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

## File: src/pages/Products.jsx
```javascript
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import BranchPriceModal from '../components/BranchPriceModal';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [permissions, setPermissions] = useState({ can_add: false, can_edit: false, can_delete: false });
  const [loading, setLoading] = useState(true);

  // State สำหรับเก็บข้อมูล Master Data (เอาไว้ใส่ Select Option)
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [units, setUnits] = useState([]);

  // State สำหรับ Modal เพิ่ม/แก้ไข สินค้า
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    barcode: '',
    name: '',
    category_id: '',
    supplier_id: '',
    unit_id: '',
    price: '',
    reorder_point: 0,
    is_active: true
  });

  // State สำหรับ Modal กำหนดราคาสาขา
  const [selectedProductForPrice, setSelectedProductForPrice] = useState(null);
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // 1. ดึงสิทธิ์การใช้งานเมนู
    fetch('http://localhost:5000/api/menus', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const currentMenu = data.data.find(m => m.link === '/products');
          
          // เปลี่ยนจาก currentMenu.permissions เป็น currentMenu ตรงๆ
          if (currentMenu) {
            setPermissions({
              can_add: currentMenu.can_add === true || currentMenu.can_add === 1,
              can_edit: currentMenu.can_edit === true || currentMenu.can_edit === 1,
              can_delete: currentMenu.can_delete === true || currentMenu.can_delete === 1,
            });
          }
        }
      })
      .catch(err => console.error('Error fetching permissions:', err));

    // 2. ดึง Master Data 
    fetchMasterData(token);
    // 3. ดึงรายการสินค้า
    fetchProducts(token);
  }, []);
  const fetchMasterData = (token) => {
    fetch('http://localhost:5000/api/master/categories', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => data.success && setCategories(data.data)).catch(console.error);

    fetch('http://localhost:5000/api/master/suppliers', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => data.success && setSuppliers(data.data)).catch(console.error);

    fetch('http://localhost:5000/api/master/units', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json()).then(data => data.success && setUnits(data.data)).catch(console.error);
  };

  const fetchProducts = (token = localStorage.getItem('token')) => {
    setLoading(true);
    fetch('http://localhost:5000/api/products', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        if (data.success) setProducts(data.data);
      })
      .catch(err => console.error('Error fetching products:', err))
      .finally(() => setLoading(false));
  };

  // เปิด Modal เพิ่ม / แก้ไข สินค้า
  const openModal = (product = null) => {
    if (product) {
      setEditId(product.id);
      setFormData({
        barcode: product.barcode || '',
        name: product.name || '',
        category_id: product.category_id || '',
        supplier_id: product.supplier_id || '',
        unit_id: product.unit_id || '',
        price: product.price || '',
        reorder_point: product.reorder_point || 0,
        is_active: product.is_active
      });
    } else {
      setEditId(null);
      setFormData({
        barcode: '',
        name: '',
        category_id: '',
        supplier_id: '',
        unit_id: '',
        price: '',
        reorder_point: 0,
        is_active: true
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // บันทึก เพิ่ม/แก้ไข สินค้า
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const method = editId ? 'PUT' : 'POST';
    const url = editId ? `http://localhost:5000/api/products/${editId}` : 'http://localhost:5000/api/products';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: editId ? 'แก้ไขสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ',
          timer: 1500,
          showConfirmButton: false
        });
        closeModal();
        fetchProducts(token);
      } else {
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (err) {
      console.error(err);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
  };

  // ลบสินค้า
  const handleDelete = (id) => {
    Swal.fire({
      title: 'ยืนยันการลบสินค้า?',
      text: "ข้อมูลสินค้านี้จะถูกลบออกจากระบบอย่างถาวร!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'ลบข้อมูล',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`http://localhost:5000/api/products/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json();
          if (data.success) {
            Swal.fire('ลบสำเร็จ!', 'ลบสินค้าเรียบร้อยแล้ว', 'success');
            fetchProducts(token);
          } else {
            Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // เปิด Modal กำหนดราคาสาขา
  const openBranchPriceModal = (product) => {
    setSelectedProductForPrice(product);
    setIsPriceModalOpen(true);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">จัดการสินค้า</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">เพิ่ม แก้ไข และกำหนดราคาสินค้าประจำสาขา</p>
        </div>
        {permissions.can_add && (
          <button onClick={() => openModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2 text-sm font-medium transition-colors">
            <i className="fas fa-plus"></i> เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 text-sm">
            <tr>
              <th className="p-4">บาร์โค้ด</th>
              <th className="p-4">ชื่อสินค้า</th>
              <th className="p-4">หมวดหมู่</th>
              <th className="p-4">ซัพพลายเออร์</th>
              <th className="p-4">ราคากลาง</th>
              <th className="p-4">หน่วยนับ</th>
              <th className="p-4">สถานะ</th>
              <th className="p-4 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan="8" className="p-8 text-center text-gray-500">กำลังโหลดข้อมูลสินค้า...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan="8" className="p-8 text-center text-gray-500">ไม่มีข้อมูลสินค้าในระบบ</td></tr>
            ) : (
              products.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 border-b dark:border-gray-700 last:border-0 transition-colors">
                  <td className="p-4 font-mono text-xs">{item.barcode || '-'}</td>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{item.category_name || '-'}</td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">{item.supplier_name || '-'}</td>
                  <td className="p-4 text-blue-600 dark:text-blue-400 font-bold">฿{Number(item.price).toFixed(2)}</td>
                  <td className="p-4">{item.unit_name || '-'}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${item.is_active ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                      {item.is_active ? 'เปิดขาย' : 'ปิดขาย'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2 whitespace-nowrap">
                    
                    {/* ปุ่มกำหนดราคาสาขา */}
                    <button 
                      onClick={() => openBranchPriceModal(item)} 
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg shadow-sm text-xs font-medium transition-colors"
                      title="กำหนดราคาเฉพาะสาขา"
                    >
                      <i className="fas fa-tags mr-1"></i> ราคาสาขา
                    </button>

                    {permissions.can_edit && (
                      <button onClick={() => openModal(item)} className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1.5 rounded-lg shadow-sm text-xs font-medium transition-colors">
                        <i className="fas fa-edit mr-1"></i> แก้ไข
                      </button>
                    )}
                    {permissions.can_delete && (
                      <button onClick={() => handleDelete(item.id)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg shadow-sm text-xs font-medium transition-colors">
                        <i className="fas fa-trash-alt mr-1"></i> ลบ
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal เพิ่ม/แก้ไข สินค้า */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editId ? 'แก้ไขข้อมูลสินค้า' : 'เพิ่มสินค้าใหม่'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">รหัสบาร์โค้ด</label>
                  <input type="text" name="barcode" value={formData.barcode} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="885XXXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ชื่อสินค้า *</label>
                  <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="ชื่อสินค้า" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หมวดหมู่</label>
                  <select name="category_id" value={formData.category_id} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกหมวดหมู่ --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ซัพพลายเออร์</label>
                  <select name="supplier_id" value={formData.supplier_id} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกซัพพลายเออร์ --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">หน่วยนับ</label>
                  <select name="unit_id" value={formData.unit_id} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- เลือกหน่วยนับ --</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ราคากลาง (บาท) *</label>
                  <input type="number" step="0.01" name="price" required value={formData.price} onChange={handleInputChange} className="w-full px-4 py-2 border dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
              </div>

              {editId && (
                <div className="flex items-center pt-2">
                  <input type="checkbox" id="is_active_prod" name="is_active" checked={formData.is_active} onChange={handleInputChange} className="w-4 h-4 text-blue-600 rounded" />
                  <label htmlFor="is_active_prod" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">เปิดขายสินค้านี้</label>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 rounded-lg transition-colors">
                  ยกเลิก
                </button>
                <button type="submit" className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal กำหนดราคาสาขา */}
      <BranchPriceModal 
        product={selectedProductForPrice}
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        onSaved={fetchProducts}
      />
    </div>
  );
}
```

## File: src/App.jsx
```javascript
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
```
