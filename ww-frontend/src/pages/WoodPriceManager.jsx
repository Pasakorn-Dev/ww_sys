import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

export default function WoodPriceManager() {
  // ─── State: ข้อมูลและสิทธิ์ ───
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [accessLevel, setAccessLevel] = useState(3);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // ─── State: กรองข้อมูล (Filters) ───
  const [filters, setFilters] = useState({
    thick: '',
    width: '',
    length: '',
    mil: '',
    wood_code: ''
  });

  // ─── State: ตารางสินค้าและการแก้ไข ───
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // เก็บค่าที่ถูกแก้ไข: { [id]: newPrice }
  const [editedPrices, setEditedPrices] = useState({});
  const fileInputRef = useRef(null);

  // ─── โหลดข้อมูลเริ่มต้น ───
  useEffect(() => {
    let isMounted = true; 

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.group_id === 1);
    }

    const fetchAllowedBranches = async () => {
      try {
        const currentPath = window.location.pathname;
        const data = await apiFetch(`/branches/allowed?menu=${currentPath}`);
        
        if (!isMounted) return;

        if (data?.success) {
          setBranches(data.data);
          setAccessLevel(data.access_level);
          
          if (data.access_level === 1) {
            setSelectedBranch(0); 
          } else if (data.data.length > 0) {
            setSelectedBranch(data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Fetch branches error:', error);
      }
    };

    fetchAllowedBranches();

    return () => {
      isMounted = false; 
    };
  }, []);

  // ดึงข้อมูลสินค้าตาม Filter (เรียกเมื่อ Filter เปลี่ยน หรือ สาขาเปลี่ยน)
  const fetchProducts = async () => {
    if (selectedBranch === '' || selectedBranch === 0) return; 

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        branch_id: selectedBranch,
        type_id: 1, 
        ...filters
      }).toString();

      const data = await apiFetch(`/master/wood-prices?${queryParams}`);
      if (data?.success) {
        setProducts(data.data);
        setEditedPrices({}); 
      }else {
        Swal.fire({
          icon: 'warning',
          title: 'ถูกปฏิเสธ',
          text: data?.message || 'ไม่สามารถดึงข้อมูลได้',
          confirmButtonColor: '#3b82f6',
          // เพิ่ม style รองรับ dark mode
          background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
        });
        setProducts([]); 
      }
    } catch (error) {
      console.error('Fetch products error:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลสินค้าได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ดึงข้อมูลอัตโนมัติเมื่อกด Enter หรือเปลี่ยนสาขา
  useEffect(() => {
    if (selectedBranch !== '' && selectedBranch !== 0) {
      fetchProducts();
    }
  }, [selectedBranch]);

  // ─── Handlers ───
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handlePriceChange = (id, value) => {
    setEditedPrices(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSavePrices = async () => {
    const editCount = Object.keys(editedPrices).length;
    if (editCount === 0) return;

    const payload = Object.entries(editedPrices).map(([id, price]) => ({
      id: Number(id),
      unit_price: Number(price)
    }));

    try {
      const data = await apiFetch('/master/wood-prices/bulk-update', {
        method: 'PUT',
        body: JSON.stringify({ prices: payload })
      });

      if (data?.success) {
        Swal.fire({ 
          icon: 'success', 
          title: 'บันทึกสำเร็จ', 
          text: `อัปเดตราคา ${editCount} รายการแล้ว`, 
          timer: 2000, 
          showConfirmButton: false,
          background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
        });
        fetchProducts(); 
      } else {
        Swal.fire('ข้อผิดพลาด', data?.message || 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (error) {
      Swal.fire('ระบบขัดข้อง', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    }
  };

  const handleExportExcel = () => {
    window.open(`${import.meta.env.VITE_API_URL}/master/wood-prices/export?branch_id=${selectedBranch}&type_id=1`, '_blank');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('branch_id', selectedBranch);

    try {
      Swal.fire({ 
        title: 'กำลังนำเข้าข้อมูล...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading(),
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
        color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
      });
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_API_URL}/master/wood-prices/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({ 
          icon: 'success', 
          title: 'นำเข้าสำเร็จ!', 
          text: `อัปเดตราคา ${data.updated_count} รายการ`, 
          timer: 2500,
          background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
          color: document.documentElement.classList.contains('dark') ? '#f3f4f6' : '#111827'
        });
        fetchProducts();
      } else {
        Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('ระบบขัดข้อง', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    } finally {
      e.target.value = null; 
    }
  };

  const allowedBranches = isAdmin ? branches : branches.filter(b => b.id === currentUser?.branch_id);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 h-full transition-colors duration-300">
      
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-colors duration-300">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
              <i className="fas fa-tags text-blue-600 dark:text-blue-400 mr-2"></i> จัดการราคาขายไม้เลื่อย
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              กำหนดราคาสินค้า (Unit Price) แยกตามสาขา สำหรับไม้เลื่อยเท่านั้น
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleExportExcel} disabled={selectedBranch === 0 || selectedBranch === ''} 
              className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="fas fa-file-excel mr-2"></i> โหลด Template
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={selectedBranch === 0 || selectedBranch === ''} 
              className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 dark:hover:bg-green-500 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <i className="fas fa-upload mr-2"></i> นำเข้า Excel
            </button>
          </div>
        </div>

        {/* สาขา & Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-7 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">สาขาที่จัดการ</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="" disabled>-- กรุณาเลือกสาขา --</option>
              {allowedBranches.map(b => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-gray-800">{b.branch_code} - {b.branch_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">มิล</label>
            <input type="text" name="mil" value={filters.mil} onChange={handleFilterChange} 
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors" placeholder="มิล..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">หนา</label>
            <input type="text" name="thick" value={filters.thick} onChange={handleFilterChange} 
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors" placeholder="หนา..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">กว้าง</label>
            <input type="text" name="width" value={filters.width} onChange={handleFilterChange} 
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors" placeholder="กว้าง..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">ยาว</label>
            <input type="text" name="length" value={filters.length} onChange={handleFilterChange} 
              className="w-full bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 text-sm rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500 transition-colors" placeholder="ยาว..." />
          </div>
          <button onClick={fetchProducts} disabled={selectedBranch === '' || selectedBranch === 0 || isLoading} 
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <><i className="fas fa-search mr-2"></i> ค้นหา</>}
          </button>
        </div>
      </div>

      {/* ตารางข้อมูล */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden transition-colors duration-300">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap justify-between items-center gap-3 bg-gray-50 dark:bg-gray-800/80 transition-colors duration-300">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            รายการสินค้า {products.length > 0 && <span className="text-blue-600 dark:text-blue-400 ml-1">({products.length} รายการ)</span>}
          </span>
          <button 
            onClick={handleSavePrices} 
            disabled={Object.keys(editedPrices).length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-save"></i> บันทึกราคาที่แก้ไข 
            {Object.keys(editedPrices).length > 0 && <span className="bg-white text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{Object.keys(editedPrices).length}</span>}
          </button>
        </div>
        
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs uppercase sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-colors duration-300">
              <tr>
                <th className="p-3 font-semibold w-32 border-b dark:border-gray-700">บาร์โค้ด</th>
                <th className="p-3 font-semibold border-b dark:border-gray-700">ขนาด (หนา x กว้าง x ยาว)</th>
                <th className="p-3 font-semibold text-center w-24 border-b dark:border-gray-700">มิล</th>
                <th className="p-3 font-semibold text-right w-32 border-b dark:border-gray-700">ราคาเดิม (฿)</th>
                <th className="p-3 font-semibold w-40 border-b dark:border-gray-700">ราคาใหม่ (฿)</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-500">
                    <i className="fas fa-spinner fa-spin text-2xl mb-3 block text-blue-600"></i> 
                    กำลังโหลดข้อมูล...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center text-gray-500 font-medium">
                    กรุณาเลือกสาขา และกดค้นหาเพื่อแสดงข้อมูล
                  </td>
                </tr>
              ) : (
                products.map((item) => {
                  const isEdited = editedPrices[item.id] !== undefined;
                  return (
                    <tr 
                      key={item.id} 
                      className={`transition-colors duration-150 ${
                        isEdited 
                          ? 'bg-blue-50/80 hover:bg-blue-100/60' 
                          : 'bg-white hover:bg-gray-100/80'
                      }`}
                    >
                      {/* บาร์โค้ด / รหัสไม้ */}
                      <td className="p-3 font-mono font-medium text-gray-900 whitespace-nowrap">
                        {item.wood_code || '-'}
                      </td>

                      {/* ขนาด */}
                      <td className="p-3 font-semibold text-gray-900 whitespace-nowrap">
                        {item.thick} x {item.width} x {item.length}
                      </td>

                      {/* มิล */}
                      <td className="p-3 text-center font-medium text-gray-800">
                        {item.mil}
                      </td>

                      {/* ราคาเดิม */}
                      <td className="p-3 text-right font-bold text-gray-900">
                        {Number(item.unit_price).toFixed(2)}
                      </td>

                      {/* ราคาใหม่ */}
                      <td className="p-3">
                        <div className="relative">
                          <span className={`absolute inset-y-0 left-0 flex items-center pl-3 text-sm font-bold ${
                            isEdited ? 'text-blue-600' : 'text-gray-500'
                          }`}>
                            ฿
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            value={editedPrices[item.id] !== undefined ? editedPrices[item.id] : ''}
                            placeholder={Number(item.unit_price).toFixed(2)}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className={`w-full pl-8 pr-3 py-1.5 text-sm font-semibold rounded-md outline-none border transition-all duration-200 ${
                              isEdited 
                                ? 'bg-white border-blue-500 text-blue-900 focus:ring-2 focus:ring-blue-500/20 shadow-sm' 
                                : 'bg-gray-50/80 border-gray-300 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-gray-400'
                            }`}
                          />
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
  );
}