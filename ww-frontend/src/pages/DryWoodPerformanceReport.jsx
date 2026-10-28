import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch, { API_URL } from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับแสดงตาราง ───
const ReportTable = React.memo(({ data, grandTotal, expectedColumns, showFooter }) => {
  const getColumnLabel = (col) => {
    return `ไม้แปรรูปอบแห้ง ${col.grade}${col.is_special ? ' (พิเศษ)' : ''}`;
  };

  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-[11px] md:text-[12px] border-collapse border border-gray-400 whitespace-nowrap min-w-max text-center font-sans">
        <thead>
          <tr className="bg-gray-300 text-gray-800 font-bold border-y-2 border-gray-500">
            <th rowSpan="2" className="border border-gray-400 p-2 align-middle w-16">ลำดับ</th>
            <th rowSpan="2" className="border border-gray-400 p-2 align-middle w-16">รหัส</th>
            <th rowSpan="2" className="border border-gray-400 p-2 align-middle min-w-[200px] text-left">ชื่อพนักงาน</th>
            
            {expectedColumns.map((col, idx) => (
              <th key={idx} colSpan="2" className="border border-gray-400 p-2 align-middle">
                {getColumnLabel(col)}
              </th>
            ))}
            
            <th colSpan="2" className="border border-gray-400 p-2 align-middle bg-gray-400">
              รวม
            </th>
          </tr>
          <tr className="bg-gray-200 text-gray-700 font-semibold border-b-2 border-gray-400">
            {expectedColumns.map((_, idx) => (
              <React.Fragment key={`sub-${idx}`}>
                <th className="border border-gray-400 p-1 min-w-[70px]">ปริมาตร</th>
                <th className="border border-gray-400 p-1 min-w-[80px]">จำนวนเงิน</th>
              </React.Fragment>
            ))}
            <th className="border border-gray-400 p-1 min-w-[70px] bg-gray-300">ปริมาตร</th>
            <th className="border border-gray-400 p-1 min-w-[80px] bg-gray-300">จำนวนเงิน</th>
          </tr>
        </thead>
        
        <tbody>
          {data.length > 0 ? (
            data.map((emp, index) => (
              <tr key={index} className="bg-white hover:bg-orange-50 transition-colors">
                <td className="border border-gray-400 p-1.5 text-center text-gray-600">{emp.row_no}</td>
                <td className="border border-gray-400 p-1.5 text-center text-gray-600">{emp.employee_code}</td>
                <td className="border border-gray-400 p-1.5 text-left font-medium text-gray-800">{emp.employee_name}</td>
                
                {expectedColumns.map((col, cIdx) => {
                  const colKey = `${col.grade}_${col.is_special ? 'spc' : 'norm'}`;
                  const cellData = emp.grades[colKey];
                  return (
                    <React.Fragment key={cIdx}>
                      <td className="border border-gray-400 p-1 text-right text-gray-800">
                        {cellData && cellData.volumn > 0 ? Number(cellData.volumn).toFixed(4) : ''}
                      </td>
                      <td className="border border-gray-400 p-1 text-right text-gray-900 font-medium">
                        {cellData && cellData.net_wage > 0 ? Number(cellData.net_wage).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                      </td>
                    </React.Fragment>
                  );
                })}
                
                <td className="border border-gray-400 p-1 text-right font-bold bg-orange-50/50 text-orange-900">
                  {Number(emp.total_volumn).toFixed(4)}
                </td>
                <td className="border border-gray-400 p-1 text-right font-bold bg-orange-100/50 text-orange-900">
                  {Number(emp.total_net_wage).toLocaleString(undefined, {minimumFractionDigits: 2})}
                </td>
              </tr>
            ))
          ) : (
             <tr>
               <td colSpan={expectedColumns.length * 2 + 4} className="border border-gray-400 p-8 text-center text-gray-500">
                 ไม่พบข้อมูลในช่วงเวลาที่เลือก
               </td>
             </tr>
          )}

          {/* แถวสรุปรวมทั้งหมด (Grand Total) - โชว์เฉพาะหน้าสุดท้าย */}
          {showFooter && grandTotal && data.length > 0 && (
            <tr className="bg-gray-300 font-bold text-gray-900 border-t-2 border-gray-600 text-[12px]">
              <td colSpan="3" className="border border-gray-400 p-2 text-center align-middle tracking-wider">รวมทั้งหมด</td>
              {expectedColumns.map((col, cIdx) => {
                const colKey = `${col.grade}_${col.is_special ? 'spc' : 'norm'}`;
                const gtCell = grandTotal[colKey];
                return (
                  <React.Fragment key={`gt-${cIdx}`}>
                    <td className="border border-gray-400 p-2 text-right">
                      {gtCell && gtCell.volumn > 0 ? Number(gtCell.volumn).toFixed(4) : ''}
                    </td>
                    <td className="border border-gray-400 p-2 text-right">
                      {gtCell && gtCell.net_wage > 0 ? Number(gtCell.net_wage).toLocaleString(undefined, {minimumFractionDigits: 2}) : ''}
                    </td>
                  </React.Fragment>
                );
              })}
              <td className="border border-gray-400 p-2 text-right bg-orange-200 text-orange-900">
                {Number(grandTotal.total_volumn).toFixed(4)}
              </td>
              <td className="border border-gray-400 p-2 text-right bg-orange-300 text-orange-900">
                {Number(grandTotal.total_net_wage).toLocaleString(undefined, {minimumFractionDigits: 2})}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function DryWoodPerformanceReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: '104/00 - 104/99'
  });

  const [reportData, setReportData] = useState([]);
  const [expectedColumns, setExpectedColumns] = useState([]);
  const [grandTotal, setGrandTotal] = useState(null);
  
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // ─── การจัดการหน้า (Pagination) ───
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

      const res = await apiFetch(`/reports/dry-wood-perf?${queryParams}`);
      if (res?.success) {
        if (res.data.length === 0) {
          Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
          setReportData([]);
        } else {
          setReportData(res.data);
          setExpectedColumns(res.expectedColumns || []);
          setGrandTotal(res.grandTotal);
          setCurrentPage(1); // รีเซ็ตหน้ากลับไปเป็นหน้าแรกเสมอเมื่อค้นหาใหม่
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
      
      const res = await fetch(`${apiUrl}/reports/dry-wood-perf/pdf?${q}`, {
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
        a.download = `Dry_Wood_Perf_${filters.start_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ยังไม่ได้เชื่อมต่อ API สร้าง PDF สำหรับไม้แห้ง', 'error');
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
      
      const res = await fetch(`${apiUrl}/reports/dry-wood-perf/excel?${q}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Dry_Wood_Perf_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ยังไม่ได้เชื่อมต่อ API สร้าง Excel สำหรับไม้แห้ง', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ─── คำนวณข้อมูลที่จะแสดงในหน้าปัจจุบัน (Client-Side Slicing) ───
  const totalPages = Math.ceil(reportData.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = reportData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50 font-sans">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-fire-alt text-orange-600"></i> รายงานสรุปค่าแรงจัดเรียงไม้แห้ง แยกรายคน
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">สาขา <span className="text-red-500">*</span></label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              disabled={isLoading || (accessLevel !== 1 && branches.length <= 1)}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-orange-500 bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500"
            >
              <option value="" disabled>-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-orange-500 bg-gray-50"
              wrapperClassName="w-full"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-orange-500 bg-gray-50"
              wrapperClassName="w-full"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">ช่วงสโตร์ (ไม้แห้ง)</label>
            <input 
              type="text" 
              name="store_code" 
              value={filters.store_code} 
              onChange={handleFilterChange} 
              placeholder="เช่น 104/00 - 104/99"
              className="w-full border rounded-md p-2 text-sm outline-none bg-gray-50 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={handleSearch} 
            disabled={isLoading} 
            className="bg-orange-600 text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-orange-700 shadow-sm flex items-center justify-center min-w-[120px]"
          >
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i>ดึงข้อมูล</>}
          </button>
          
          {reportData.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => handleExportPDF(true)} disabled={isExportingPDF} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-gray-600 hover:bg-gray-700 text-white'}`}>
                <i className="fas fa-search-plus"></i> {isExportingPDF ? 'กำลังสร้าง PDF...' : 'ตัวอย่าง PDF'}
              </button>
              <button onClick={() => handleExportPDF(false)} disabled={isExportingPDF} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button onClick={handleExportExcel} disabled={isExportingExcel} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingExcel ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                <i className="fas fa-file-excel"></i> ส่งออก Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 pb-6 print:border-none print:shadow-none min-h-[900px] flex flex-col justify-between">
          <div>
            <div className="text-center mb-6 pt-6">
              <h1 className="text-lg font-bold text-gray-800">บริษัท วู้ดเวอร์ค จำกัด ({filters.branch_name})</h1>
              <h2 className="text-md font-semibold text-gray-700 mt-1">รายงานสรุปค่าแรงเรียงไม้แห้ง แยกรายคน</h2>
              <p className="text-sm text-gray-600 mt-1">
                ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}
              </p>
              <p className="text-sm text-gray-600 mt-1">รหัสสโตร์: <span className="font-semibold">{filters.store_code || '104/00 - 104/99'}</span></p>
            </div>

            {/* ส่ง currentRows (ที่หั่นแล้ว 35 แถว) ไปแสดงผลแทนที่จะส่ง reportData ทั้งหมด */}
            <div className="px-4">
              <ReportTable 
                data={currentRows} 
                grandTotal={grandTotal} 
                expectedColumns={expectedColumns}
                showFooter={currentPage === totalPages || totalPages === 0} 
              />
            </div>
          </div>

          {(currentPage === totalPages || totalPages === 0) && (
            <div className="mt-12 px-10 grid grid-cols-3 gap-8 text-center text-sm mb-4 print:mt-24">
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600">ผู้รายงาน</p>
              </div>
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600">ฝ่ายข้อมูลโรงงาน</p>
              </div>
              <div>
                <p>...........................................................</p>
                <p className="mt-2 text-gray-600">ผู้จัดการโรงงาน</p>
              </div>
            </div>
          )}

          {/* ─── Pagination Controls ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 mt-4 mx-4 print:hidden">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">« หน้าแรก</button>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">‹ ก่อนหน้า</button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm">หน้า</span>
                <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border py-1 px-2 text-sm text-orange-700 font-bold rounded-md outline-none focus:ring-1 focus:ring-orange-500">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <span className="text-sm">จาก {totalPages}</span>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">ถัดไป ›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">หน้าสุดท้าย »</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
