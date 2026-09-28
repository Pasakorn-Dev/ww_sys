import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับตารางรายงาน ───
const ReportTable = React.memo(({ data, grandTotal }) => {
  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-xs border-collapse border border-gray-400 whitespace-nowrap min-w-max">
        <thead>
          {/* Header แถวบนสุด (แบ่งกลุ่มเกรด) */}
          <tr className="bg-gray-200 text-gray-800">
            <th className="border border-gray-400 p-2 text-center align-middle" rowSpan="2">
              แผนก<br/>(ชุดเลื่อย)
            </th>
            <th className="border border-gray-400 p-2 text-center" colSpan="13">
              เฉลี่ยราคา
            </th>
          </tr>
          {/* Header แถวที่ 2 (แบ่งย่อยแต่ละเกรด) */}
          <tr className="bg-gray-100 text-gray-700">
            <th className="border border-gray-400 p-2 text-right">AB ปกติ</th>
            <th className="border border-gray-400 p-2 text-right">AB พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right bg-blue-50 font-bold">AB</th>
            
            <th className="border border-gray-400 p-2 text-right">C ปกติ</th>
            <th className="border border-gray-400 p-2 text-right">C พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right bg-blue-50 font-bold">C</th>

            <th className="border border-gray-400 p-2 text-right">P ปกติ</th>
            <th className="border border-gray-400 p-2 text-right">P พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right bg-blue-50 font-bold">P</th>

            <th className="border border-gray-400 p-2 text-right">PP ปกติ</th>
            <th className="border border-gray-400 p-2 text-right">PP พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right bg-blue-50 font-bold">PP</th>

            <th className="border border-gray-400 p-2 text-right bg-green-100 font-bold">รวม</th>
          </tr>
        </thead>
        <tbody>
          {/* วนลูปข้อมูลแต่ละชุดเลื่อย */}
          {data.length > 0 ? (
            data.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors bg-white">
                <td className="border border-gray-400 p-2 text-left font-medium">{row.saw_name || 'ไม่ระบุ'}</td>
                
                {/* กลุ่ม AB */}
                <td className="border border-gray-400 p-2 text-right">{Number(row.normal_ab) > 0 ? Number(row.normal_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(row.special_ab) > 0 ? Number(row.special_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right bg-blue-50/30 font-semibold">{Number(row.avg_ab) > 0 ? Number(row.avg_ab).toFixed(2) : ''}</td>

                {/* กลุ่ม C */}
                <td className="border border-gray-400 p-2 text-right">{Number(row.normal_c) > 0 ? Number(row.normal_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(row.special_c) > 0 ? Number(row.special_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right bg-blue-50/30 font-semibold">{Number(row.avg_c) > 0 ? Number(row.avg_c).toFixed(2) : ''}</td>

                {/* กลุ่ม P */}
                <td className="border border-gray-400 p-2 text-right">{Number(row.normal_p) > 0 ? Number(row.normal_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(row.special_p) > 0 ? Number(row.special_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right bg-blue-50/30 font-semibold">{Number(row.avg_p) > 0 ? Number(row.avg_p).toFixed(2) : ''}</td>

                {/* กลุ่ม PP */}
                <td className="border border-gray-400 p-2 text-right">{Number(row.normal_pp) > 0 ? Number(row.normal_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(row.special_pp) > 0 ? Number(row.special_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right bg-blue-50/30 font-semibold">{Number(row.avg_pp) > 0 ? Number(row.avg_pp).toFixed(2) : ''}</td>

                {/* รวมเฉลี่ยทั้งหมด (ต่อชุดเลื่อย) */}
                <td className="border border-gray-400 p-2 text-right bg-green-50 text-green-800 font-bold">
                  {Number(row.avg_total) > 0 ? Number(row.avg_total).toFixed(2) : ''}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="14" className="border border-gray-400 p-8 text-center text-gray-500">
                ไม่พบข้อมูลในช่วงเวลาที่เลือก
              </td>
            </tr>
          )}

          {/* แถวสรุปรวมทั้งหมด (Grand Total) */}
          {grandTotal && data.length > 0 && (
            <tr className="bg-gray-300 font-bold text-gray-900 border-t-2 border-gray-600">
              <td className="border border-gray-500 p-2 text-left bg-gray-400">รวมทั้งหมด</td>
              
              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.normal_ab) > 0 ? Number(grandTotal.normal_ab).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.special_ab) > 0 ? Number(grandTotal.special_ab).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right bg-blue-200">{Number(grandTotal.avg_ab) > 0 ? Number(grandTotal.avg_ab).toFixed(2) : '0'}</td>

              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.normal_c) > 0 ? Number(grandTotal.normal_c).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.special_c) > 0 ? Number(grandTotal.special_c).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right bg-blue-200">{Number(grandTotal.avg_c) > 0 ? Number(grandTotal.avg_c).toFixed(2) : '0'}</td>

              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.normal_p) > 0 ? Number(grandTotal.normal_p).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.special_p) > 0 ? Number(grandTotal.special_p).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right bg-blue-200">{Number(grandTotal.avg_p) > 0 ? Number(grandTotal.avg_p).toFixed(2) : '0'}</td>

              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.normal_pp) > 0 ? Number(grandTotal.normal_pp).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right">{Number(grandTotal.special_pp) > 0 ? Number(grandTotal.special_pp).toFixed(2) : '0'}</td>
              <td className="border border-gray-500 p-2 text-right bg-blue-200">{Number(grandTotal.avg_pp) > 0 ? Number(grandTotal.avg_pp).toFixed(2) : '0'}</td>

              <td className="border border-gray-500 p-2 text-right bg-green-300 text-green-900">
                {Number(grandTotal.avg_total) > 0 ? Number(grandTotal.avg_total).toFixed(2) : '0'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function AveragePriceReport() {
  // ─── State ───
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    branch_id: '',
    branch_name: '',
    store_code: ''
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const { options } = useMasterOptions(filters.branch_id);

  // ─── Effect: โหลดสาขาเริ่มต้น ───
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        // const res = await apiFetch('/branches/allowed');
        // 💡 1. ดึงชื่อเมนูหน้าปัจจุบันจาก URL (เช่น '/average-price-report')
        const currentPath = window.location.pathname;
        
        // 💡 2. แนบ ?menu=... พ่วงไปกับ API เลย Backend จะได้รู้เป๊ะๆ
        const res = await apiFetch(`/branches/allowed?menu=${currentPath}`);
        
        if (res?.success && res.data.length > 0) {
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

  // ─── Handlers ───
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  const handleDateChange = (date, name) => {
    if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
  };

  const handleSearch = async () => {
    if (!filters.branch_id) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');
    }

    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code
      }).toString();

      const res = await apiFetch(`/reports/average-price?${q}`);
      
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal);
        if (res.data.length === 0) {
          Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
        }
      } else {
        Swal.fire('ข้อผิดพลาด', res?.message || 'ไม่สามารถดึงข้อมูลได้', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // --- ฟังก์ชันโหลด PDF (Blob) ---
  const handleExportPDF = async (isPreview = false) => {
    setIsExportingPDF(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code,
        branch_name: filters.branch_name
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/average-price/pdf?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (isPreview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Average_Price_Report_${filters.start_date}.pdf`;
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

  // --- ฟังก์ชันโหลด Excel (Blob) ---
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      
      const res = await fetch(`${apiUrl}/reports/average-price/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Average_Price_Report_${filters.start_date}.xlsx`;
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

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50">
      
      {/* ─── 1. ส่วนเงื่อนไขการค้นหา ─── */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-chart-line text-blue-600"></i> ค้นหารายงานเปรียบเทียบราคาขายเฉลี่ย
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">สาขา <span className="text-red-500">*</span></label>
            <select
              value={filters.branch_id}
              onChange={handleBranchChange}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
            >
              <option value="">-- เลือกสาขา --</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
              wrapperClassName="w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-gray-50"
              wrapperClassName="w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">รหัสสโตร์</label>
            <select 
              name="store_code" 
              value={filters.store_code} 
              onChange={handleFilterChange} 
              className="w-full border rounded-lg p-2 text-sm outline-none bg-gray-50"
            >
              <option value="">-- รวมทุกสโตร์ --</option>
              {options?.sawWoodTypes?.map(item => (
                <option key={item.id} value={item.code}>{item.code} - {item.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
          <button 
            onClick={handleSearch} 
            disabled={isLoading} 
            className="bg-blue-600 text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center min-w-[120px]"
          >
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังดึงข้อมูล...</> : <><i className="fas fa-search mr-2"></i>ดึงข้อมูล</>}
          </button>

          {reportData.length > 0 && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleExportPDF(true)} 
                disabled={isExportingPDF} 
                className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}
              >
                <i className="fas fa-search-plus"></i> {isExportingPDF ? 'กำลังสร้าง PDF...' : 'แสดงตัวอย่าง PDF'}
              </button>
              <button 
                onClick={() => handleExportPDF(false)} 
                disabled={isExportingPDF} 
                className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
              >
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button 
                onClick={handleExportExcel} 
                disabled={isExportingExcel} 
                className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingExcel ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >
                <i className="fas fa-file-excel"></i> {isExportingExcel ? 'กำลังสร้าง Excel...' : 'ดาวน์โหลด Excel'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── 2. ส่วนแสดงผลตารางรายงาน ─── */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 pb-6 print:border-none print:shadow-none">
          
          {/* หัวกระดาษ */}
          <div className="text-center mb-6 pt-8">
            <h1 className="text-xl font-bold text-gray-800">บริษัท วู้ดเวิร์ค จำกัด ( {filters.branch_name} )</h1>
            <h2 className="text-lg font-semibold text-gray-700 mt-2">รายงานเปรียบเทียบราคาขายเฉลี่ย ตามแผนกและเกรดไม้</h2>
            <p className="text-md text-gray-600 mt-2">
              ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')} 
              <span className="ml-2">
                สโตร์: {filters.store_code || 'รวมทุกสโตร์'}
              </span>
            </p>
          </div>

          {/* ตารางข้อมูล */}
          <div className="px-4">
            <ReportTable data={reportData} grandTotal={grandTotalData} />
          </div>

        </div>
      )}
    </div>
  );
}