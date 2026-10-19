import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function DryWoodDataReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code_start: '',
    store_code_end: ''
  });

  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await apiFetch(`/branches/allowed?menu=${window.location.pathname}`);
        if (res?.success) {
          const validBranches = res.data.filter(b => b.id !== 0);
          setBranches(validBranches);
          if (validBranches.length > 0) {
            setFilters(prev => ({
              ...prev,
              branch_id: validBranches[0].id,
              branch_name: validBranches[0].branch_name
            }));
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
  }, []);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });
  const handleDateChange = (date, name) => {
    if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
  };
  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  const getSwalTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    return {
      background: isDark ? '#1f2937' : '#ffffff',
      color: isDark ? '#f3f4f6' : '#111827',
    };
  };

  const handleSearch = async () => {
    if (!filters.branch_id || !filters.start_date || !filters.end_date) {
      return Swal.fire({ title: 'แจ้งเตือน', text: 'กรุณาระบุสาขาและช่วงวันที่', icon: 'warning', ...getSwalTheme() });
    }

    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        store_code_start: filters.store_code_start,
        store_code_end: filters.store_code_end
      }).toString();

      // ดึงข้อมูลจาก Transaction API 
      const res = await apiFetch(`/transactions/dry-woods?${queryParams}`);
      if (res?.success) {
        if (res.data.length === 0) {
          Swal.fire({ title: 'แจ้งเตือน', text: 'ไม่พบข้อมูลตามเงื่อนไขที่เลือก', icon: 'info', ...getSwalTheme() });
          setReportData(null);
        } else {
          setReportData({ rows: res.data, grandTotal: res.grandTotal });
          setCurrentPage(1);
        }
      }
    } catch (error) {
      Swal.fire({ title: 'ข้อผิดพลาด', text: 'ดึงข้อมูลล้มเหลว', icon: 'error', ...getSwalTheme() });
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = reportData ? Math.ceil(reportData.rows.length / itemsPerPage) : 1;
  const currentRows = reportData ? reportData.rows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : [];

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen transition-colors duration-300">
      
      {/* 🟢 ส่วนตัวกรอง (Filter Box) */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-search text-orange-500"></i> ค้นหาข้อมูลนับไม้แห้ง
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleBranchChange} className="w-full border dark:border-gray-600 rounded-lg p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-orange-500 transition-colors">
              <option value="">-- เลือกสาขา --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่ผลิต (เริ่ม) <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่ผลิต (สิ้นสุด) <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สโตร์เริ่มต้น (เช่น 104/00)</label>
            <input
                type="text" name="store_code_start" value={filters.store_code_start} onChange={handleFilterChange}
                placeholder="เว้นว่างเพื่อดึงทั้งหมด"
                className="w-full border dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สโตร์สิ้นสุด (เช่น 104/28)</label>
            <input
                type="text" name="store_code_end" value={filters.store_code_end} onChange={handleFilterChange}
                placeholder="เว้นว่างเพื่อดึงทั้งหมด"
                className="w-full border dark:border-gray-600 rounded-lg p-2 text-sm outline-none focus:border-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            />
          </div>
        </div>

        <div className="mt-6">
          <button onClick={handleSearch} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition-colors">
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i> กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i> แสดงข้อมูล</>}
          </button>
        </div>
      </div>

      {/* 🟢 ส่วนตารางแสดงผล (Data Table - List View) */}
      {reportData && (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto transition-colors duration-300">
          
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 border-l-4 border-orange-500 pl-3">
              ข้อมูลรายละเอียดการนับไม้แห้ง ({filters.branch_name})
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 pl-4">
              <span className="font-semibold text-gray-700 dark:text-gray-300">ช่วงวันที่:</span> {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}
            </p>
          </div>

          <table className="w-full text-sm border-collapse dark:text-gray-200 transition-colors duration-300 mt-2">
            <thead>
              <tr className="bg-orange-600 text-white border-y border-orange-700">
                <th className="py-3 px-2 text-center whitespace-nowrap">ลำดับ</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">วันที่ผลิต</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">บาร์โค้ด (QR)</th>
                <th className="py-3 px-2 text-center whitespace-nowrap">รหัสสโตร์</th>
                <th className="py-3 px-3 text-left whitespace-nowrap">รหัสสินค้า</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">จำนวนท่อน</th>
                <th className="py-3 px-3 text-right whitespace-nowrap">ปริมาตร (ลบ.ฟุต)</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <tr 
                    key={idx} 
                    className={`border-b border-gray-200 dark:border-gray-700 hover:bg-orange-50 dark:hover:bg-gray-700 transition-colors 
                      ${isEven ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900/50'}`}
                  >
                    <td className="py-2 px-2 text-center text-gray-500 dark:text-gray-400">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                    <td className="py-2 px-2 text-center">{format(new Date(row.produce_date), 'dd/MM/yyyy')}</td>
                    <td className="py-2 px-3 text-left font-mono tracking-wide">{row.barcode_id}</td>
                    <td className="py-2 px-2 text-center font-semibold text-orange-700 dark:text-orange-400">{row.wood_store_code || '-'}</td>
                    <td className="py-2 px-3 text-left">{row.wood_code}</td>
                    <td className="py-2 px-3 text-right">{Number(row.amount).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right text-orange-800 dark:text-orange-200">{Number(row.volumn).toFixed(4)}</td>
                  </tr>
                );
              })}
              
              {/* แถบสีเข้ม โชว์ยอดรวมท้ายสุด เฉพาะหน้าสุดท้าย */}
              {currentPage === totalPages && reportData.rows.length > 0 && (
                <tr className="bg-gray-200 dark:bg-gray-700 font-bold border-t-2 border-gray-400 dark:border-gray-500">
                  <td colSpan="5" className="py-4 px-4 text-right text-gray-800 dark:text-gray-100">ยอดรวมสุทธิทั้งหมด :</td>
                  <td className="py-4 px-3 text-right text-gray-900 dark:text-white">{Number(reportData.grandTotal.total_amount).toLocaleString()}</td>
                  <td className="py-4 px-3 text-right text-orange-700 dark:text-orange-300">{Number(reportData.grandTotal.total_volumn).toFixed(4)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* แถบแบ่งหน้า Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 mt-4 border-t border-gray-100 dark:border-gray-700">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">« หน้าแรก</button>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">‹ ก่อนหน้า</button>
              </div>
              <span className="text-sm font-semibold dark:text-gray-300">หน้า {currentPage} จาก {totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">ถัดไป ›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1 border dark:border-gray-600 rounded text-sm disabled:opacity-50 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">หน้าสุดท้าย »</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}