import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';

export default function CheckSawWood() {
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // State สำหรับ Filters[cite: 10]
  const [filters, setFilters] = useState({
    branch_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    transaction_type_id: '',
    log_wood_type_id: '',
    log_wood_eval_size_id: '',
    ws_customer_id: '',
    saw_time_id: '',
    saw_wood_types_code: ''
  });

  // 💡 เรียกใช้ Custom Hook ตรงนี้ โดยส่งค่า filters.branch_id เข้าไป
  const { options, isLoadingOptions } = useMasterOptions(filters.branch_id);

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const res = await apiFetch('/branches/allowed');
      if (res?.success) {
        const validBranches = res.data.filter(b => b.id !== 0);
        setBranches(validBranches);
        if (validBranches.length > 0) {
          setFilters(prev => ({ ...prev, branch_id: validBranches[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async () => {
    if (!filters.branch_id || !filters.start_date || !filters.end_date) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาและช่วงวันที่ให้ครบถ้วน', 'warning');
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await apiFetch(`/transactions/saw-woods?${queryParams}`);
      if (res?.success) {
        setData(res.data);
      } else {
        Swal.fire('ข้อผิดพลาด', res?.message || 'ไม่สามารถดึงข้อมูลได้', 'error');
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── ฟังก์ชันดูรายละเอียดตาม Barcode[cite: 10] ───
  const viewDetails = async (barcode_id) => {
    Swal.fire({
      title: 'กำลังโหลดข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        barcode_id: barcode_id
      }).toString();
      
      const res = await apiFetch(`/transactions/saw-woods?${queryParams}`);
      
      if (res?.success) {
        const items = res.data;
        let htmlTable = `
          <div class="overflow-x-auto mt-4 max-h-[60vh]">
            <table class="w-full text-sm text-left border border-gray-200">
              <thead class="bg-gray-100 sticky top-0">
                <tr>
                  <th class="p-2 border">รหัสไม้</th>
                  <th class="p-2 border">เกรด</th>
                  <th class="p-2 border">จำนวน</th>
                  <th class="p-2 border">ปริมาตร</th>
                  <th class="p-2 border">ราคาสุทธิ</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(item => `
                  <tr class="hover:bg-gray-50">
                    <td class="p-2 border">${item.wood_code || '-'}</td>
                    <td class="p-2 border">${item.grade || '-'}</td>
                    <td class="p-2 border text-right">${item.amount}</td>
                    <td class="p-2 border text-right">${item.volumn}</td>
                    <td class="p-2 border text-right text-blue-600 font-semibold">${Number(item.net_price).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        Swal.fire({
          title: `รายละเอียด Barcode: ${barcode_id}`,
          html: htmlTable,
          width: '800px',
          showCloseButton: true,
          confirmButtonText: 'ปิด'
        });
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ดึงรายละเอียดล้มเหลว', 'error');
    }
  };

  // ─── จัดกลุ่มข้อมูลในตารางหลักตาม Barcode (ให้ดูง่ายขึ้น) ───
  // หากต้องการแสดงรายบรรทัดตาม[cite: 10] สามารถลบ reduce นี้ออกและใช้ data.map ได้เลย
  // ในที่นี้จะจำลองให้เห็นทีละรายการ
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col min-h-[80vh]">
      
      {/* ส่วนค้นหา */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-search text-blue-600"></i> ตรวจสอบข้อมูลไม้เลื่อย
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <input type="date" name="end_date" value={filters.end_date} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">รหัสประเภทไม้เลื่อย (Saw Wood Type Code)</label>
            <input type="text" name="saw_wood_types_code" value={filters.saw_wood_types_code} onChange={handleFilterChange} placeholder="ระบุโค้ด (ถ้ามี)" className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none" />
          </div>
          
          {/* ตัวกรองที่เปลี่ยนเป็น Dropdown เลือกจาก Master Data */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภทการชั่ง</label>
            <select name="transaction_type_id" value={filters.transaction_type_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none">
              <option value="">-- ทั้งหมด --</option>
              {options.transactionTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ประเภทไม้ท่อน</label>
            <select name="log_wood_type_id" value={filters.log_wood_type_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none">
              <option value="">-- ทั้งหมด --</option>
              {options.logWoodTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">กลุ่มไม้ท่อน</label>
            <select name="log_wood_eval_size_id" value={filters.log_wood_eval_size_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none">
              <option value="">-- ทั้งหมด --</option>
              {options.logWoodEvalSizes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">เจ้าหนี้ (รถไม้)</label>
            <select name="ws_customer_id" value={filters.ws_customer_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none">
              <option value="">-- ทั้งหมด --</option>
              {options.truckCompanies.map(item => <option key={item.id} value={item.id}>{item.code} - {item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">กะการทำงาน (เวลา)</label>
            <select name="saw_time_id" value={filters.saw_time_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none">
              <option value="">-- ทั้งหมด --</option>
              {options.sawTimes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} ค้นหาข้อมูล
          </button>
        </div>
      </div>

      {/* ตารางแสดงผล[cite: 10] */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0">
              <tr>
                <th className="px-4 py-3 border-b">วันที่ผลิต</th>
                <th className="px-4 py-3 border-b">สาขา</th>
                <th className="px-4 py-3 border-b">Barcode</th>
                <th className="px-4 py-3 border-b">รหัสไม้</th>
                <th className="px-4 py-3 border-b text-center">เกรด</th>
                <th className="px-4 py-3 border-b text-right">จำนวน</th>
                <th className="px-4 py-3 border-b text-right">ปริมาตร</th>
                <th className="px-4 py-3 border-b text-right">ราคาสุทธิ</th>
                <th className="px-4 py-3 border-b text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500">ไม่พบข้อมูล</td></tr>
              ) : (
                data.map((row, index) => (
                  <tr key={index} className="border-b hover:bg-blue-50/50">
                    <td className="px-4 py-3">{new Date(row.produce_date).toLocaleDateString('th-TH')}</td>
                    <td className="px-4 py-3">{row.branch_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.barcode_id}</td>
                    <td className="px-4 py-3">{row.wood_code || '-'}</td>
                    <td className="px-4 py-3 text-center">{row.grade || '-'}</td>
                    <td className="px-4 py-3 text-right">{row.amount}</td>
                    <td className="px-4 py-3 text-right">{row.volumn}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">{Number(row.net_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => viewDetails(row.barcode_id)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded shadow-sm text-xs"
                      >
                        <i className="fas fa-list"></i> ดูทั้งหมด
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}