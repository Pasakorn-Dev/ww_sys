import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

export default function Users() {
  // ─── State สำหรับจัดการตารางและการค้นหา ───
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFetchingUsers, setIsFetchingUsers] = useState(true);

  // ─── State สำหรับ Modal (เพิ่ม/แก้ไข) ───
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = โหมดเพิ่ม, มีค่า = โหมดแก้ไข
  const [loading, setLoading] = useState(false);

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

  // ─── 1. โหลดข้อมูลเมื่อเปิดหน้าจอ ───
  useEffect(() => {
    fetchMasterData();
    fetchUsers();
  }, []);

  const fetchMasterData = async () => {
    try {
      const currentPath = window.location.pathname;
      const [branchRes, groupRes, deptRes] = await Promise.all([
        apiFetch(`/branches/allowed?menu=${currentPath}`),
        apiFetch('/master-options/groups'), 
        apiFetch('/master-options/departments')
      ]);
      if (branchRes?.success) setBranches(branchRes.data);
      if (groupRes?.success) setGroups(groupRes.data);
      if (deptRes?.success) setDepartments(deptRes.data);
    } catch (error) {
      console.error('Error fetching master data:', error);
    }
  };

  const fetchUsers = async () => {
    setIsFetchingUsers(true);
    try {
      // 💡 ต้องมี API GET /auth/manage/users ที่ Backend
      const currentPath = window.location.pathname;

      const res = await apiFetch(`/auth/manage/users?menu=${currentPath}`);
      if (res?.success) setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', 'error');
    } finally {
      setIsFetchingUsers(false);
    }
  };

  // ─── 2. จัดการ Modal ───
  const openAddModal = () => {
    setEditingId(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = async (userId) => {
    setEditingId(userId);
    setIsModalOpen(true);
    
    // ดึงข้อมูลผู้ใช้รายคนมาแปะในฟอร์ม
    try {
      const res = await apiFetch(`/auth/manage/user/${userId}`);
      if (res?.success) {
        const u = res.data;
        setFormData({
          username: u.username,
          password: '', // ว่างไว้เสมอเพื่อความปลอดภัย
          fullname: u.fullname,
          group_id: u.group_id || '',
          branch_id: u.branch_id || '',
          dept_id: u.dept_id || '',
          allowed_branches: u.allowed_branches || []
        });
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ดึงข้อมูลผู้ใช้ล้มเหลว', 'error');
      setIsModalOpen(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData(initialFormState);
    setEditingId(null);
  };

  // ─── 3. Handlers ฟอร์มและการบันทึก ───
  const handleCheckboxChange = (e) => {
    const value = parseInt(e.target.value);
    setFormData(prev => {
      const isChecked = e.target.checked;
      const newAllowed = isChecked 
        ? [...prev.allowed_branches, value]
        : prev.allowed_branches.filter(id => id !== value);
      return { ...prev, allowed_branches: newAllowed };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const isEditMode = editingId !== null;
    const url = isEditMode ? `/auth/manage/update/${editingId}` : '/auth/manage/create';
    const method = isEditMode ? 'PUT' : 'POST';

    try {
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
            ...formData,
            group_id: parseInt(formData.group_id),
            branch_id: parseInt(formData.branch_id),
            dept_id: formData.dept_id ? parseInt(formData.dept_id) : null
        })
      });

      if (res?.success) {
        Swal.fire({ icon: 'success', title: 'สำเร็จ', text: 'บันทึกข้อมูลเรียบร้อย', timer: 1500, showConfirmButton: false });
        closeModal();
        fetchUsers(); // โหลดตารางใหม่
      } else {
        Swal.fire('ผิดพลาด', res?.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (error) {
      Swal.fire('ผิดพลาด', 'ระบบขัดข้อง โปรดลองใหม่', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ─── 4. ระบบลบผู้ใช้งาน ───
  const handleDelete = (userId, fullname) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบผู้ใช้ "${fullname}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          // 💡 ต้องมี API DELETE /auth/manage/delete/:id ที่ Backend
          const res = await apiFetch(`/auth/manage/delete/${userId}`, { method: 'DELETE' });
          if (res?.success) {
            Swal.fire('ลบแล้ว!', 'ผู้ใช้งานถูกลบออกจากระบบ', 'success');
            fetchUsers();
          } else {
            Swal.fire('ล้มเหลว', res?.message || 'ไม่สามารถลบผู้ใช้นี้ได้', 'error');
          }
        } catch (error) {
          Swal.fire('ข้อผิดพลาด', 'ระบบขัดข้อง', 'error');
        }
      }
    });
  };

  // ─── ค้นหาข้อมูลแบบ Real-time ───
  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.fullname.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        
        {/* Header & Controls */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <i className="fas fa-users text-blue-600"></i> จัดการผู้ใช้งาน
            </h2>
            <p className="text-sm text-gray-500 mt-1">ค้นหา เพิ่ม แก้ไข หรือลบผู้ใช้งานในระบบ</p>
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
                className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
              <tbody className="text-sm divide-y dark:divide-gray-700">
                {isFetchingUsers ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> กำลังโหลด...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-500">ไม่พบข้อมูลผู้ใช้งาน</td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                      <td className="p-4 font-medium text-gray-800 dark:text-gray-200">{u.username}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{u.fullname}</td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                          {u.group_name || 'ไม่มี'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-600 dark:text-gray-300">{u.branch_name || '-'}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditModal(u.id)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="แก้ไข">
                            <i className="fas fa-edit"></i>
                          </button>
                          <button onClick={() => handleDelete(u.id, u.fullname)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition" title="ลบ">
                            <i className="fas fa-trash-alt"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Username <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required value={formData.username}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setFormData({...formData, username: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Password {editingId ? <span className="text-xs text-gray-400 font-normal">(เว้นว่างหากไม่เปลี่ยน)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <input 
                      type="password" required={!editingId} value={formData.password} placeholder={editingId ? 'กรอกเมื่อต้องการเปลี่ยน...' : ''}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">ชื่อ-นามสกุล <span className="text-red-500">*</span></label>
                    <input 
                      type="text" required value={formData.fullname}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500"
                      onChange={e => setFormData({...formData, fullname: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border-t border-gray-200 dark:border-gray-700 pt-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">กลุ่มสิทธิ์ (Role) <span className="text-red-500">*</span></label>
                    <select required value={formData.group_id} onChange={e => setFormData({...formData, group_id: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">เลือกกลุ่ม...</option>
                      {groups.map(g => <option key={g.id} value={g.id}>{g.group_name || g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">แผนก</label>
                    <select value={formData.dept_id} onChange={e => setFormData({...formData, dept_id: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">-- ไม่ระบุ --</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.dept_name || d.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">สาขาหลัก <span className="text-red-500">*</span></label>
                    <select required value={formData.branch_id} onChange={e => setFormData({...formData, branch_id: e.target.value})} className="w-full border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">เลือกสาขาหลัก...</option>
                      {branches.filter(b => b.id !== 0).map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 rounded-lg">
                  <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">สาขาเพิ่มเติมที่เข้าถึงได้ (สิทธิ์ระดับ 2)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {branches.filter(b => b.id !== 0 && b.id !== parseInt(formData.branch_id)).map(b => (
                      <label key={b.id} className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input 
                          type="checkbox" value={b.id} checked={formData.allowed_branches.includes(b.id)} onChange={handleCheckboxChange}
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
              <button onClick={closeModal} type="button" className="px-5 py-2.5 rounded-lg font-semibold bg-gray-200 text-gray-800 hover:bg-gray-300 transition">
                ยกเลิก
              </button>
              <button form="userForm" type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-2">
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