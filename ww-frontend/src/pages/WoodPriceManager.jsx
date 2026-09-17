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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.group_id === 1);
    }
    fetchAllowedBranches();
  }, []);

  const fetchAllowedBranches = async () => {
    try {
      const data = await apiFetch('/branches/allowed');
      if (data?.success) {
        setBranches(data.data);
        setAccessLevel(data.access_level);
        if (data.access_level === 1) {
          setSelectedBranch(0); // Admin: 0 = ดูภาพรวม (หรือต้องบังคับเลือกทีละสาขา)
        } else if (data.data.length > 0) {
          setSelectedBranch(data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
    }
  };

  // ดึงข้อมูลสินค้าตาม Filter (เรียกเมื่อ Filter เปลี่ยน หรือ สาขาเปลี่ยน)
  const fetchProducts = async () => {
    if (selectedBranch === '' || selectedBranch === 0) return; // บังคับเลือกสาขาก่อน

    setIsLoading(true);
    try {
      // สร้าง Query String จาก Filters
      const queryParams = new URLSearchParams({
        branch_id: selectedBranch,
        type_id: 1, // บังคับเฉพาะไม้เลื่อย
        ...filters
      }).toString();

      // (API นี้เราต้องไปเขียนเพิ่มใน Backend)
      const data = await apiFetch(`/master/wood-prices?${queryParams}`);
      if (data?.success) {
        setProducts(data.data);
        setEditedPrices({}); // เคลียร์ของเก่าที่ยังไม่เซฟทิ้งเมื่อดึงข้อมูลใหม่
      }else {
        // 💡 เพิ่มบล็อก else ตรงนี้ เพื่อจับ Error จาก Backend มาโชว์
        Swal.fire({
          icon: 'warning',
          title: 'ถูกปฏิเสธ',
          text: data?.message || 'ไม่สามารถดึงข้อมูลได้',
          confirmButtonColor: '#3b82f6'
        });
        setProducts([]); // เคลียร์ตารางทิ้งถ้าไม่มีสิทธิ์
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

  // ─── Handlers สำหรับ Method 2: Inline Edit ───
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

    // แปลง Object เป็น Array เพื่อส่งให้ Backend
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
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: `อัปเดตราคา ${editCount} รายการแล้ว`, timer: 2000, showConfirmButton: false });
        fetchProducts(); // โหลดใหม่เพื่อให้ราคาเดิมเปลี่ยน
      } else {
        Swal.fire('ข้อผิดพลาด', data?.message || 'ไม่สามารถบันทึกได้', 'error');
      }
    } catch (error) {
      Swal.fire('ระบบขัดข้อง', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    }
  };

  // ─── Handlers สำหรับ Method 1: Excel Import/Export ───
  const handleExportExcel = () => {
    // นำทางไปที่ API โหลดไฟล์ตรงๆ
    window.open(`${import.meta.env.VITE_API_URL}/master/wood-prices/export?branch_id=${selectedBranch}&type_id=1`, '_blank');
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    formData.append('branch_id', selectedBranch);

    try {
      Swal.fire({ title: 'กำลังนำเข้าข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      
      const token = localStorage.getItem('token');
      // Import ใช้ FormData จึงใช้ fetch ตรงๆ (apiFetch เราตั้ง header เป็น application/json ไว้)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/master/wood-prices/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        Swal.fire({ icon: 'success', title: 'นำเข้าสำเร็จ!', text: `อัปเดตราคา ${data.updated_count} รายการ`, timer: 2500 });
        fetchProducts();
      } else {
        Swal.fire('เกิดข้อผิดพลาด', data.message, 'error');
      }
    } catch (error) {
      Swal.fire('ระบบขัดข้อง', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    } finally {
      e.target.value = null; // Reset input
    }
  };

  const allowedBranches = isAdmin ? branches : branches.filter(b => b.id === currentUser?.branch_id);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col gap-6 h-full">
      
      {/* Header & Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              <i className="fas fa-tags text-blue-600 mr-2"></i> จัดการราคาขายไม้เลื่อย
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              กำหนดราคาสินค้า (Unit Price) แยกตามสาขา สำหรับไม้เลื่อยเท่านั้น
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button onClick={handleExportExcel} disabled={selectedBranch === 0 || selectedBranch === ''} className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              <i className="fas fa-file-excel mr-2"></i> โหลด Template
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={selectedBranch === 0 || selectedBranch === ''} className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg text-sm font-medium shadow-sm transition-colors disabled:opacity-50">
              <i className="fas fa-upload mr-2"></i> นำเข้า Excel
            </button>
          </div>
        </div>

        {/* สาขา & Filter */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">สาขาที่จัดการ</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>-- กรุณาเลือกสาขา --</option>
              {allowedBranches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">หนา</label>
            <input type="text" name="thick" value={filters.thick} onChange={handleFilterChange} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg p-2.5" placeholder="หนา..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">กว้าง</label>
            <input type="text" name="width" value={filters.width} onChange={handleFilterChange} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg p-2.5" placeholder="กว้าง..." />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">ยาว</label>
            <input type="text" name="length" value={filters.length} onChange={handleFilterChange} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg p-2.5" placeholder="ยาว..." />
          </div>
          
          <button onClick={fetchProducts} disabled={selectedBranch === '' || selectedBranch === 0} className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
            <i className="fas fa-search mr-2"></i> ค้นหา
          </button>
        </div>
      </div>

      {/* ตารางข้อมูล */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            รายการสินค้า {products.length > 0 && `(${products.length} รายการ)`}
          </span>
          <button 
            onClick={handleSavePrices} 
            disabled={Object.keys(editedPrices).length === 0}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center gap-2"
          >
            <i className="fas fa-save"></i> บันทึกราคาที่แก้ไข 
            {Object.keys(editedPrices).length > 0 && <span className="bg-white text-blue-600 text-xs px-2 py-0.5 rounded-full ml-1">{Object.keys(editedPrices).length}</span>}
          </button>
        </div>
        
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 text-xs uppercase sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="p-3 font-semibold w-32">บาร์โค้ด</th>
                <th className="p-3 font-semibold">ขนาด (หนา x กว้าง x ยาว)</th>
                <th className="p-3 font-semibold text-center w-24">มิล</th>
                <th className="p-3 font-semibold text-right w-32">ราคาเดิม (฿)</th>
                <th className="p-3 font-semibold w-40">ราคาใหม่ (฿)</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {isLoading ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500"><i className="fas fa-spinner fa-spin mr-2"></i> กำลังโหลดข้อมูล...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-gray-500">กรุณาเลือกสาขา และกดค้นหาเพื่อแสดงข้อมูล</td></tr>
              ) : (
                products.map((item) => {
                  const isEdited = editedPrices[item.id] !== undefined;
                  return (
                    <tr key={item.id} className={`border-b dark:border-gray-700 transition-colors ${isEdited ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-750'}`}>
                      <td className="p-3 font-mono text-gray-600 dark:text-gray-400">{item.wood_code || '-'}</td>
                      <td className="p-3 font-medium text-gray-800 dark:text-gray-200">
                        {item.thick} x {item.width} x {item.length}
                      </td>
                      <td className="p-3 text-center text-gray-600 dark:text-gray-400">{item.mil}</td>
                      <td className="p-3 text-right font-semibold text-gray-600 dark:text-gray-400">
                        {Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="p-3">
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">฿</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editedPrices[item.id] !== undefined ? editedPrices[item.id] : ''}
                            placeholder={Number(item.unit_price).toFixed(2)}
                            onChange={(e) => handlePriceChange(item.id, e.target.value)}
                            className={`w-full pl-8 pr-3 py-1.5 text-sm rounded-md outline-none border transition-colors
                              ${isEdited 
                                ? 'bg-white border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:text-white' 
                                : 'bg-gray-50 border-gray-200 focus:bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:bg-gray-800 dark:border-gray-600 dark:text-white'
                              }`}
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}