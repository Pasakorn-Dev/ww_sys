import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch, { API_URL } from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับแสดงตาราง ───
const ReportTable = React.memo(({ data, grandTotal, expectedColumns, showFooter }) => {
  // ฟังก์ชันตัวช่วยดึงชื่อคอลัมน์ (ตามเกรด) ให้กระชับขึ้น
  const getColumnLabel = (col) => {
    return `ไม้แปรรูปอบแห้ง ${col.grade}${col.is_special ? ' (พิเศษ)' : ''}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-[11px] md:text-[12px] border-collapse border border-gray-400 dark:border-gray-600 whitespace-nowrap min-w-max text-center">
        <thead>
          {/* แถวหัวตารางชั้นที่ 1 (ชื่อเกรด) */}
          <tr className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold border-y-2 border-gray-500 dark:border-gray-600">
            <th rowSpan="2" className="border border-gray-400 dark:border-gray-600 p-2 align-middle w-16">รหัส</th>
            <th rowSpan="2" className="border border-gray-400 dark:border-gray-600 p-2 align-middle min-w-[200px] text-left">ชื่อพนักงาน</th>
            
            {expectedColumns.map((col, idx) => (
              <th key={idx} colSpan="2" className="border border-gray-400 dark:border-gray-600 p-2 align-middle">
                {getColumnLabel(col)}
              </th>
            ))}
            
            <th colSpan="2" className="border border-gray-400 dark:border-gray-600 p-2 align-middle bg-gray-400 dark:bg-gray-600">
              รวม
            </th>
          </tr>
          {/* แถวหัวตารางชั้นที่ 2 (ปริมาตร / จำนวนเงิน) */}
          <tr className="bg-gray-200 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 font-semibold border-b-2 border-gray-400 dark:border-gray-600">
            {expectedColumns.map((_, idx) => (
              <React.Fragment key={`sub-${idx}`}>
                <th className="border border-gray-400 dark:border-gray-600 p-1 min-w-[70px]">ปริมาตร</th>
                <th className="border border-gray-400 dark:border-gray-600 p-1 min-w-[80px]">จำนวนเงิน</th>
              </React.Fragment>
            ))}
            <th className="border border-gray-400 dark:border-gray-600 p-1 min-w-[70px] bg-gray-300 dark:bg-gray-600">ปริมาตร</th>
            <th className="border border-gray-400 dark:border-gray-600 p-1 min-w-[80px] bg-gray-300 dark:bg-gray-600">จำนวนเงิน</th>
          </tr>
        </thead>
        
        <tbody className="text-gray-800 dark:text-gray-200">
          {data.length > 0 ? (
            data.map((emp, index) => (
              <tr key={index} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                <td className="border border-gray-400 dark:border-gray-600 p-1.5 text-center text-gray-600 dark:text-gray-400">{emp.employee_code}</td>
                <td className="border border-gray-400 dark:border-gray-600 p-1.5 text-left font-medium text-gray-800 dark:text-gray-100">{emp.employee_name}</td>
                
                {/* ข้อมูลของแต่ละเกรด */}
                {expectedColumns.map((col, cIdx) => {
                  const colKey = `${col.grade}_${col.is_special ? 'spc' : 'norm'}`;
                  const cellData = emp.grades[colKey];
                  return (
                    <React.Fragment key={cIdx}>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-800 dark:text-gray-200">
                        {cellData && cellData.volumn > 0 ? Number(cellData.volumn).toFixed(4) : ''}
                      </td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-900 dark:text-gray-100 font-medium">
                        {cellData && cellData.net_wage > 0 ? Number(cellData.net_wage).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                      </td>
                    </React.Fragment>
                  );
                })}
                
                {/* ยอดรวมของพนักงานคนนี้ */}
                <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold bg-blue-50/30 dark:bg-blue-900/25 text-blue-900 dark:text-blue-300">
                  {Number(emp.total_volumn).toFixed(4)}
                </td>
                <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold bg-blue-100/50 dark:bg-blue-900/40 text-blue-900 dark:text-blue-200">
                  {Number(emp.total_net_wage).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
              </tr>
            ))
          ) : (
             <tr>
               <td colSpan={expectedColumns.length * 2 + 4} className="border border-gray-400 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                 ไม่พบข้อมูลในช่วงเวลาที่เลือก
               </td>
             </tr>
          )}

          {/* บรรทัดสรุป Grand Total (แสดงเฉพาะหน้าสุดท้าย) */}
          {showFooter && grandTotal && data.length > 0 && (
            <tr className="bg-gray-300 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-600 dark:border-gray-500 text-[12px]">
              <td colSpan="2" className="border border-gray-400 dark:border-gray-600 p-2 text-center align-middle tracking-wider">รวมทั้งหมด</td>
              {expectedColumns.map((col, cIdx) => {
                const colKey = `${col.grade}_${col.is_special ? 'spc' : 'norm'}`;
                const gtCell = grandTotal[colKey];
                return (
                  <React.Fragment key={`gt-${cIdx}`}>
                    <td className="border border-gray-400 dark:border-gray-600 p-2 text-right">
                      {gtCell && gtCell.volumn > 0 ? Number(gtCell.volumn).toFixed(4) : ''}
                    </td>
                    <td className="border border-gray-400 dark:border-gray-600 p-2 text-right">
                      {gtCell && gtCell.net_wage > 0 ? Number(gtCell.net_wage).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="border border-gray-400 dark:border-gray-600 p-2 text-right bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-200">
                {Number(grandTotal.total_volumn).toFixed(4)}
              </td>
              <td className="border border-gray-400 dark:border-gray-600 p-2 text-right bg-blue-300 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100">
                {Number(grandTotal.total_net_wage).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function WetWoodPerformanceReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: '21/00 - 21/99'
  });

  const [reportData, setReportData] = useState([]);
  const [expectedColumns, setExpectedColumns] = useState([]);
  const [grandTotal, setGrandTotal] = useState(null);
  
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35; 

  useEffect(() => {
    let isMounted = true;
    const fetchInitialData = async () => {
      try {
        const currentPath = window.location.pathname;
        const res = await apiFetch(`/branches/allowed?menu=${currentPath}`);
        
        if (!isMounted) return;
        if (res?.success) {
          const validBranches = res.data.filter(b => b.id !== 0);
          setBranches(validBranches);
          setAccessLevel(res.access_level);
          
          if (res.access_level === 1) {
            setFilters(prev => ({ ...prev, branch_id: '', branch_name: '' }));
          } else if (validBranches.length > 0) {
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
    fetchInitialData();
    return () => { isMounted = false; };
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

  const handleSearch = async () => {
    if (!filters.branch_id || !filters.start_date || !filters.end_date) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุสาขาและช่วงวันที่', 'warning');
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        store_code: filters.store_code
      }).toString();

      const res = await apiFetch(`/reports/wet-wood-perf?${queryParams}`);
      if (res?.success) {
        if (res.data.length === 0) {
          Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
          setReportData([]);
        } else {
          setReportData(res.data);
          setExpectedColumns(res.expectedColumns || []);
          setGrandTotal(res.grandTotal);
          setCurrentPage(1);
        }
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ดึงข้อมูลรายงานล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async (isPreview = false) => {
    setIsExportingPDF(true);
    Swal.fire({
      title: 'กำลังสร้างไฟล์ PDF...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code,
        branch_name: filters.branch_name
      }).toString();

      const apiUrl = API_URL;
      
      const res = await fetch(`${apiUrl}/reports/wet-wood-perf/pdf?${q}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      Swal.close();

      if (isPreview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Wet_Wood_Perf_${filters.start_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    Swal.fire({
      title: 'กำลังสร้างไฟล์ Excel...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code,
        branch_name: filters.branch_name
      }).toString();

      const apiUrl = API_URL;
      
      const res = await fetch(`${apiUrl}/reports/wet-wood-perf/excel?${q}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Wet_Wood_Perf_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // การคำนวณ Pagination
  const totalPages = Math.ceil(reportData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = reportData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      {/* ─── กล่องค้นหา ─── */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 print:hidden transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-users-cog text-teal-600 dark:text-teal-400"></i> รายงานสรุปค่าแรงจัดเรียงไม้เปียก แยกรายคน
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สาขา <span className="text-red-500">*</span></label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              disabled={isLoading || (accessLevel !== 1 && branches.length <= 1)}
              title={accessLevel !== 1 && branches.length <= 1 ? 'คุณมีสิทธิ์เข้าถึงเฉพาะสาขานี้' : ''}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none focus:border-teal-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-300 dark:disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-75 transition-colors"
            >
              <option value="" disabled>-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-teal-500 transition-colors"
              wrapperClassName="w-full"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:border-teal-500 transition-colors"
              wrapperClassName="w-full"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">ช่วงสโตร์ (ไม้เปียก)</label>
            <input 
              type="text" 
              name="store_code" 
              value={filters.store_code} 
              onChange={handleFilterChange} 
              placeholder="เช่น 21/00 - 21/99"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:border-teal-500 transition-colors"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={handleSearch} 
            disabled={isLoading} 
            className="bg-teal-600 text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-teal-700 shadow-sm flex items-center justify-center min-w-[120px] transition-colors"
          >
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i>ดึงข้อมูล</>}
          </button>
          
          {reportData.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => handleExportPDF(true)} disabled={isExportingPDF} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-search-plus"></i> {isExportingPDF ? 'กำลังสร้าง...' : 'ตัวอย่าง PDF'}
              </button>
              <button onClick={() => handleExportPDF(false)} disabled={isExportingPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button onClick={handleExportExcel} disabled={isExportingExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-excel"></i> ส่งออก Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── ตารางแสดงผล ─── */}
      {reportData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 pb-6 print:bg-white print:text-black print:border-none print:shadow-none min-h-[900px] flex flex-col justify-between transition-colors duration-300">
          
          <div>
            {/* หัวกระดาษ (Header) */}
            <div className="text-center mb-6 pt-6">
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">บริษัท วู้ดเวอร์ค จำกัด ({filters.branch_name})</h1>
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mt-1">รายงานสรุปค่าแรงเรียงไม้เปียก แยกรายคน</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">รหัสสโตร์: <span className="font-semibold">{filters.store_code || '21/00 - 21/99'}</span></p>
            </div>

            <div className="px-4">
              <ReportTable 
                data={currentRows} 
                grandTotal={grandTotal} 
                expectedColumns={expectedColumns}
                showFooter={currentPage === totalPages || totalPages === 0} 
              />
            </div>
          </div>

          {/* ลายเซ็นต์ท้ายรายงาน (แสดงเฉพาะหน้าสุดท้าย) */}
          {(currentPage === totalPages || totalPages === 0) && (
            <div className="mt-12 px-10 grid grid-cols-3 gap-8 text-center text-sm mb-4 print:mt-24 text-gray-700 dark:text-gray-300 print:text-black">
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600 dark:text-gray-300">ผู้รายงาน</p>
              </div>
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600 dark:text-gray-300">ฝ่ายข้อมูลโรงงาน</p>
              </div>
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600 dark:text-gray-300">ผู้จัดการโรงงาน</p>
              </div>
            </div>
          )}

          {/* ระบบแบ่งหน้า (Pagination) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-4 mx-4 print:hidden">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 rounded-md">« หน้าแรก</button>
                <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 rounded-md">‹ ก่อนหน้า</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">หน้า</span>
                <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-1 px-2 text-sm text-teal-700 dark:text-teal-300 font-bold rounded-md outline-none focus:ring-1 focus:ring-teal-500">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>{page}</option>
                  ))}
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">จาก {totalPages}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 rounded-md">ถัดไป ›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500 rounded-md">หน้าสุดท้าย »</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
