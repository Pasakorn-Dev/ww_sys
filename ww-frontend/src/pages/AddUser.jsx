// src/pages/AddUser.jsx
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch, { API_URL } from '../services/apiFetch';
import { getUser } from '../utils/session';

const getAvatarUrl = (filename) => (filename ? `${API_URL}/uploads/avatars/${filename}` : '');


export default function Users() {
  // ─── State: ข้อมูลผู้ใช้ปัจจุบันและสิทธิ์ ───
  const [currentUser, setCurrentUser] = useState(null);
  const [accessLevel, setAccessLevel] = useState(3);

  // ─── State สำหรับจัดการตารางและการค้นหา ───
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);

  // ─── State สำหรับ Modal (เพิ่ม/แก้ไข) ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = โหมดเพิ่ม, มีค่า = โหมดแก้ไข
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [removeAvatar, setRemoveAvatar] = useState(false);

  // ─── Master Data สำหรับ Dropdown ───
  const [branches, setBranches] = useState([]);
  const [groups, setGroups] = useState([]);
  const [departments, setDepartments] = useState([]);

  // ─── Form State ───
  const initialFormState = {
    username: '',
    password: '',
    fullname: '',
    group_id: '',
    branch_id: '',
    dept_id: '',
    allowed_branches: []
  };
  const [formData, setFormData] = useState(initialFormState);

  // ─── Helper: ตั้งค่าสี SweetAlert2 ให้รองรับ Dark Mode (เหมือน WoodPriceManager) ───
  const getSwalTheme = () => ({
    background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
    color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
  });

  // ─── 1. โหลดข้อมูลเมื่อเปิดหน้าจอ ───
  useEffect(() => {
    let isMounted = true;

    const user = getUser();
    if (user) {
      setCurrentUser(user);
    }

    const initPageData = async () => {
      setIsFetchingUsers(true);
      try {
        const currentPath = window.location.pathname;

        // ดึงข้อมูลตัวเลือกและรายการผู้ใช้งานพร้อมกัน
        const [branchRes, groupRes, deptRes, usersRes] = await Promise.all([
          apiFetch(`/branches/allowed?menu=${currentPath}`),
          apiFetch('/master-options/groups'),
          apiFetch('/master-options/departments'),
          apiFetch(`/auth/manage/users?menu=${currentPath}`)
        ]);

        if (!isMounted) return;

        if (branchRes?.success) {
          setBranches(branchRes.data || []);
          setAccessLevel(branchRes.access_level || 3);
        }
        if (groupRes?.success) setGroups(groupRes.data || []);
        if (deptRes?.success) setDepartments(deptRes.data || []);

        if (usersRes?.success) {
          setUsers(usersRes.data || []);
        } else {
          Swal.fire({
            icon: 'warning',
            title: 'ถูกปฏิเสธ',
            text: usersRes?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้',
            confirmButtonColor: '#3b82f6',
            ...getSwalTheme()
          });
          setUsers([]);
        }
      } catch (error) {
        console.error('Error initializing users page:', error);
        if (isMounted) {
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้',
            ...getSwalTheme()
          });
        }
      } finally {
        if (isMounted) setIsFetchingUsers(false);
      }
    };

    initPageData();

    return () => {
      isMounted = false;
    };
  }, []);

  // ฟังก์ชันโหลดตารางผู้ใช้งานใหม่ (หลังเพิ่ม/แก้ไข/ลบ)
  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      const currentPath = window.location.pathname;
      const res = await apiFetch(`/auth/manage/users?menu=${currentPath}`);
      if (res?.success) {
        setUsers(res.data || []);
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'ถูกปฏิเสธ',
          text: res?.message || 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้',
          confirmButtonColor: '#3b82f6',
          ...getSwalTheme()
        });
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้',
        ...getSwalTheme()
      });
    } finally {
      setIsFetchingUsers(false);
    }
  };

  // ─── 2. จัดการ Modal ───
  const resetAvatarState = () => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(false);
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    resetAvatarState();
    setIsModalOpen(true);
  };

  const openEditModal = async (userId) => {
    setEditingId(userId);
    resetAvatarState();
    setIsModalOpen(true);

    try {
      const res = await apiFetch(`/auth/manage/user/${userId}`);
      if (res?.success && res?.data) {
        const u = res.data;
        setFormData({
          username: u.username || '',
          password: '', // เว้นว่างไว้เสมอเพื่อความปลอดภัย
          fullname: u.fullname || '',
          group_id: u.group_id || '',
          branch_id: u.branch_id || '',
          dept_id: u.dept_id || '',
          allowed_branches: Array.isArray(u.allowed_branches)
            ? u.allowed_branches.map(Number)
            : []
        });
        setAvatarPreview(getAvatarUrl(u.avatar));
      } else {
        Swal.fire({
          icon: 'warning',
          title: 'ไม่สามารถเปิดข้อมูลได้',
          text: res?.message || 'ไม่พบข้อมูลผู้ใช้งาน',
          ...getSwalTheme()
        });
        setIsModalOpen(false);
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'ข้อผิดพลาด',
        text: 'ดึงข้อมูลผู้ใช้ล้มเหลว',
        ...getSwalTheme()
      });
      setIsModalOpen(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    resetAvatarState();
    setEditingId(null);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์ไม่ถูกต้อง',
        text: 'รองรับเฉพาะไฟล์รูปภาพ (.jpg, .png, .webp, .gif)',
        ...getSwalTheme()
      });
      e.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      Swal.fire({
        icon: 'warning',
        title: 'ไฟล์มีขนาดใหญ่เกินไป',
        text: 'กรุณาเลือกรูปภาพขนาดไม่เกิน 2 MB',
        ...getSwalTheme()
      });
      e.target.value = '';
      return;
    }

    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
  };

  const handleRemoveAvatar = () => {
    if (avatarPreview && avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarFile(null);
    setAvatarPreview('');
    setRemoveAvatar(true);
  };

  // ─── 3. Handlers ฟอร์มและการบันทึก ───
  const handlePrimaryBranchChange = (e) => {
    const newBranchId = e.target.value;
    const numericBranchId = parseInt(newBranchId, 10);

    setFormData((prev) => ({
      ...prev,
      branch_id: newBranchId,
      // ลบสาขาหลักออกจากสาขาเพิ่มเติมอัตโนมัติ ป้องกันการบันทึกซ้ำซ้อน
      allowed_branches: prev.allowed_branches.filter((id) => id !== numericBranchId)
    }));
  };

  const handleCheckboxChange = (e) => {
    const value = parseInt(e.target.value, 10);
    setFormData((prev) => {
      const isChecked = e.target.checked;
      const newAllowed = isChecked
        ? [...prev.allowed_branches, value]
        : prev.allowed_branches.filter((id) => id !== value);
      return { ...prev, allowed_branches: newAllowed };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanUsername = formData.username.trim();
    const cleanFullname = formData.fullname.trim();
    const cleanPassword = formData.password.trim();

    if (!cleanUsername || !cleanFullname) {
      Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: 'กรุณากรอก Username และ ชื่อ-นามสกุล ให้ครบถ้วน',
        ...getSwalTheme()
      });
      return;
    }

    // ตรวจสอบความยาวรหัสผ่านขั้นต่ำ (กรณีเพิ่มผู้ใช้ใหม่ หรือกรณีกรอกรหัสผ่านใหม่ตอนแก้ไข)
    if ((!editingId && cleanPassword.length < 6) || (editingId && cleanPassword !== '' && cleanPassword.length < 6)) {
      Swal.fire({
        icon: 'warning',
        title: 'รหัสผ่านสั้นเกินไป',
        text: 'กรุณาตั้งรหัสผ่านอย่างน้อย 6 ตัวอักษรเพื่อความปลอดภัย',
        ...getSwalTheme()
      });
      return;
    }

    setLoading(true);

    const isEditMode = editingId !== null;
    const url = isEditMode ? `/auth/manage/update/${editingId}` : '/auth/manage/create';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const primaryBranchId = parseInt(formData.branch_id, 10);
      const payload = new FormData();
      payload.append('username', cleanUsername);
      if (cleanPassword) payload.append('password', cleanPassword);
      payload.append('fullname', cleanFullname);
      payload.append('group_id', String(parseInt(formData.group_id, 10)));
      payload.append('branch_id', String(primaryBranchId));
      if (formData.dept_id) payload.append('dept_id', String(parseInt(formData.dept_id, 10)));
      payload.append(
        'allowed_branches',
        JSON.stringify(formData.allowed_branches.filter((id) => id !== primaryBranchId))
      );
      if (avatarFile) {
        payload.append('avatar', avatarFile);
      } else if (isEditMode && removeAvatar) {
        payload.append('remove_avatar', 'true');
      }

      const res = await apiFetch(url, {
        method,
        body: payload
      });

      if (res?.success) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'บันทึกข้อมูลเรียบร้อย',
          timer: 1500,
          showConfirmButton: false,
          ...getSwalTheme()
        });
        if (isEditMode && currentUser && Number(currentUser.id) === Number(editingId)) {
          window.dispatchEvent(new Event('user-profile-updated'));
        }
        closeModal();
        fetchUsers();
      } else {
        Swal.fire({
          icon: 'error',
          title: 'ผิดพลาด',
          text: res?.message || 'ไม่สามารถบันทึกข้อมูลได้',
          ...getSwalTheme()
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'ระบบขัดข้อง',
        text: 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดลองใหม่',
        ...getSwalTheme()
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── 4. ระบบลบผู้ใช้งาน (พร้อมระบบป้องกันการลบบัญชีตัวเอง) ───
  const handleDelete = (userId, fullname) => {
    if (currentUser && Number(currentUser.id) === Number(userId)) {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่สามารถลบได้',
        text: 'คุณไม่สามารถลบบัญชีของตัวเองที่กำลังใช้งานอยู่ได้',
        ...getSwalTheme()
      });
      return;
    }

    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบผู้ใช้ "${fullname}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      ...getSwalTheme()
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await apiFetch(`/auth/manage/delete/${userId}`, { method: 'DELETE' });
          if (res?.success) {
            Swal.fire({
              icon: 'success',
              title: 'ลบแล้ว!',
              text: 'ผู้ใช้งานถูกลบออกจากระบบ',
              timer: 1500,
              showConfirmButton: false,
              ...getSwalTheme()
            });
            fetchUsers();
          } else {
            Swal.fire({
              icon: 'error',
              title: 'ล้มเหลว',
              text: res?.message || 'ไม่สามารถลบผู้ใช้นี้ได้',
              ...getSwalTheme()
            });
          }
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาด',
            text: 'ระบบขัดข้อง',
            ...getSwalTheme()
          });
        }
      }
    });
  };

  // ─── ค้นหาข้อมูลแบบ Real-time (ป้องกันค่า null/undefined) ───
  const filteredUsers = users.filter((user) => {
    const q = searchQuery.toLowerCase();
    const uname = (user.username || '').toLowerCase();
    const fname = (user.fullname || '').toLowerCase();
    return uname.includes(q) || fname.includes(q);
  });

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Controls */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors duration-300">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <i className="fas fa-users text-blue-600 dark:text-blue-400"></i> จัดการผู้ใช้งาน
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              ค้นหา เพิ่ม แก้ไข หรือลบผู้ใช้งานในระบบ
            </p>
          </div>
          
          <div className="flex w-full md:w-auto items-center gap-3">
            <div className="relative w-full md:w-64">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <i className="fas fa-search"></i>
              </span>
              <input 
                type="text" 
                placeholder="ค้นหาชื่อ หรือ Username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-white text-sm transition-colors"
              />
            </div>
            <button 
              onClick={openAddModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2 whitespace-nowrap text-sm"
            >
              <i className="fas fa-plus"></i> เพิ่มผู้ใช้
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-sm border-b dark:border-gray-700">
                <tr>
                  <th className="p-4 font-semibold">Username</th>
                  <th className="p-4 font-semibold">ชื่อ-นามสกุล</th>
                  <th className="p-4 font-semibold">กลุ่มสิทธิ์</th>
                  <th className="p-4 font-semibold">สาขาหลัก</th>
                  <th className="p-4 font-semibold text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-gray-200 dark:divide-gray-700">
                {isFetchingUsers ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                      <i className="fas fa-spinner fa-spin mr-2 text-blue-600"></i> กำลังโหลด...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                      ไม่พบข้อมูลผู้ใช้งาน
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser && Number(currentUser.id) === Number(u.id);
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="p-4 font-medium text-gray-800 dark:text-gray-200">
                          <div className="flex items-center gap-3">
                            {u.avatar ? (
                              <img
                                src={getAvatarUrl(u.avatar)}
                                alt={u.fullname || u.username}
                                className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 flex items-center justify-center shrink-0">
                                <i className="fas fa-user text-xs"></i>
                              </div>
                            )}
                            <span>{u.username}</span>
                            {isSelf && (
                              <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full">
                                คุณ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-300">{u.fullname}</td>
                        <td className="p-4 text-gray-600 dark:text-gray-300">
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            {u.group_name || 'ไม่มี'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-300">{u.branch_name || '-'}</td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(u.id)}
                              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition"
                              title="แก้ไข"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              onClick={() => handleDelete(u.id, u.fullname)}
                              disabled={isSelf}
                              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                              title={isSelf ? 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้' : 'ลบ'}
                            >
                              <i className="fas fa-trash-alt"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ─── Modal สำหรับ เพิ่ม/แก้ไขผู้ใช้ ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-5 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                <i className={`fas ${editingId ? 'fa-user-edit text-blue-600' : 'fa-user-plus text-green-600'} mr-2`}></i>
                {editingId ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานระบบ'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="userForm" onSubmit={handleSubmit} className="space-y-6">
                {/* อัปโหลดรูปโปรไฟล์ */}
                <div className="flex flex-col sm:flex-row items-center gap-4 pb-5 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <i className="fas fa-user text-2xl text-gray-400"></i>
                    )}
                  </div>
                  <div className="flex flex-col items-center sm:items-start gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-2">
                        <i className="fas fa-camera"></i>
                        <span>{avatarPreview ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                      {avatarPreview && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"
                        >
                          <i className="fas fa-trash-alt"></i>
                          <span>ลบรูปภาพ</span>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      รองรับไฟล์ .jpg, .png, .webp, .gif ขนาดไม่เกิน 2 MB
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Username <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      autoComplete="off"
                      value={formData.username}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Password {editingId ? <span className="text-xs text-gray-400 font-normal">(เว้นว่างหากไม่เปลี่ยน)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="password"
                      required={!editingId}
                      autoComplete="new-password"
                      value={formData.password}
                      placeholder={editingId ? 'กรอกเมื่อต้องการเปลี่ยน (อย่างน้อย 6 ตัวอักษร)...' : 'อย่างน้อย 6 ตัวอักษร'}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      ชื่อ-นามสกุล <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="text"
                      required
                      value={formData.fullname}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={(e) => setFormData({ ...formData, fullname: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      กลุ่มสิทธิ์ (Role) <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">เลือกกลุ่ม...</option>
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>{g.group_name || g.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      แผนก
                    </label>
                    <select
                      value={formData.dept_id}
                      onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">-- ไม่ระบุ --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.dept_name || d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      สาขาหลัก <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.branch_id}
                      onChange={handlePrimaryBranchChange}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">เลือกสาขาหลัก...</option>
                      {branches.filter((b) => b.id !== 0).map((b) => (
                        <option key={b.id} value={b.id}>{b.branch_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 rounded-lg">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                    สาขาเพิ่มเติมที่เข้าถึงได้ (สิทธิ์ระดับ 2)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {branches
                      .filter((b) => b.id !== 0 && b.id !== parseInt(formData.branch_id, 10))
                      .map((b) => (
                        <label key={b.id} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                          <input 
                            type="checkbox"
                            value={b.id}
                            checked={formData.allowed_branches.includes(b.id)}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{b.branch_name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              </form>
            </div>

            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
              <button
                onClick={closeModal}
                type="button"
                className="px-5 py-2.5 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                ยกเลิก
              </button>
              <button
                form="userForm"
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}