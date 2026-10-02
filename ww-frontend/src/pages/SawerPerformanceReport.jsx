import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับแสดงตาราง ───
const ReportTable = React.memo(({ data, grandTotal, avgPerSet, showFooter }) => {
  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-[11px] md:text-xs border-collapse border border-gray-400 whitespace-nowrap min-w-max">
        <thead>
          <tr className="bg-gray-100 text-gray-800 font-bold">
            <th className="border border-gray-400 p-2 text-center align-middle" rowSpan="2">แผนก</th>
            <th className="border border-gray-400 p-2 text-center align-middle" rowSpan="2">นายม้า</th>
            <th className="border border-gray-400 p-2 text-center align-middle" rowSpan="2">แหล่งที่มา</th>
            
            <th className="border border-gray-400 p-1 text-center" colSpan="3">AB</th>
            <th className="border border-gray-400 p-1 text-center" colSpan="3">C</th>
            <th className="border border-gray-400 p-1 text-center" colSpan="3">P</th>
            <th className="border border-gray-400 p-1 text-center" colSpan="3">PP</th>
            <th className="border border-gray-400 p-2 text-center align-middle" rowSpan="2">รวม</th>
          </tr>
          <tr className="bg-gray-50 text-gray-700 font-semibold">
            {/* AB */}
            <th className="border border-gray-400 p-1 text-right">AB</th>
            <th className="border border-gray-400 p-1 text-right">AB พิเศษ</th>
            <th className="border border-gray-400 p-1 text-right">รวม AB</th>
            {/* C */}
            <th className="border border-gray-400 p-1 text-right">C</th>
            <th className="border border-gray-400 p-1 text-right">C พิเศษ</th>
            <th className="border border-gray-400 p-1 text-right">รวม C</th>
            {/* P */}
            <th className="border border-gray-400 p-1 text-right">P ปกติ</th>
            <th className="border border-gray-400 p-1 text-right">P พิเศษ</th>
            <th className="border border-gray-400 p-1 text-right">P</th>
            {/* PP */}
            <th className="border border-gray-400 p-1 text-right">PP ปกติ</th>
            <th className="border border-gray-400 p-1 text-right">PP พิเศษ</th>
            <th className="border border-gray-400 p-1 text-right">PP</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, idx) => (
              <React.Fragment key={idx}>
                {/* ─── บรรทัดที่ 1: ปริมาตร (ลบ.ฟุต) ─── */}
                <tr className="bg-white hover:bg-gray-50 transition-colors">
                  <td className="border border-gray-400 p-1.5 px-2 text-left" rowSpan="2">{row.department}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-left text-gray-600" rowSpan="2">{row.sawer}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-left text-gray-600" rowSpan="2">{row.source}</td>
                  
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{Number(row.vol_normal_ab) > 0 ? Number(row.vol_normal_ab).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{Number(row.vol_special_ab) > 0 ? Number(row.vol_special_ab).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right font-semibold text-blue-900">{Number(row.vol_ab) > 0 ? Number(row.vol_ab).toFixed(2) : ''}</td>

                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_normal_c) > 0 ? Number(row.vol_normal_c).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_special_c) > 0 ? Number(row.vol_special_c).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right font-semibold">{Number(row.vol_c) > 0 ? Number(row.vol_c).toFixed(2) : ''}</td>

                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_normal_p) > 0 ? Number(row.vol_normal_p).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_special_p) > 0 ? Number(row.vol_special_p).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right font-semibold">{Number(row.vol_p) > 0 ? Number(row.vol_p).toFixed(2) : ''}</td>

                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_normal_pp) > 0 ? Number(row.vol_normal_pp).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right">{Number(row.vol_special_pp) > 0 ? Number(row.vol_special_pp).toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right font-semibold">{Number(row.vol_pp) > 0 ? Number(row.vol_pp).toFixed(2) : ''}</td>

                  <td className="border border-gray-400 p-1.5 px-2 text-right font-bold text-gray-900 bg-gray-50">{Number(row.total_volumn) > 0 ? Number(row.total_volumn).toFixed(2) : ''}</td>
                </tr>
                {/* ─── บรรทัดที่ 2: เปอร์เซ็นต์ (%) ─── */}
                <tr className="bg-white hover:bg-gray-50 transition-colors text-gray-500">
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_normal_ab) > 0 ? Number(row.pct_normal_ab).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_special_ab) > 0 ? Number(row.pct_special_ab).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_ab) > 0 ? Number(row.pct_ab).toFixed(2) + '%' : ''}</td>

                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_normal_c) > 0 ? Number(row.pct_normal_c).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_special_c) > 0 ? Number(row.pct_special_c).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_c) > 0 ? Number(row.pct_c).toFixed(2) + '%' : ''}</td>

                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_normal_p) > 0 ? Number(row.pct_normal_p).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_special_p) > 0 ? Number(row.pct_special_p).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_p) > 0 ? Number(row.pct_p).toFixed(2) + '%' : ''}</td>

                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_normal_pp) > 0 ? Number(row.pct_normal_pp).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_special_pp) > 0 ? Number(row.pct_special_pp).toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{Number(row.pct_pp) > 0 ? Number(row.pct_pp).toFixed(2) + '%' : ''}</td>

                  <td className="border border-gray-400 p-1 px-2 text-right bg-gray-50">{Number(row.pct_total) > 0 ? Number(row.pct_total).toFixed(2) + '%' : ''}</td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan="16" className="border border-gray-400 p-8 text-center text-gray-500">
                ไม่พบข้อมูลในช่วงเวลาที่เลือก
              </td>
            </tr>
          )}

          {/* ─── แถวสรุปรวมท้ายตาราง (โชว์เฉพาะหน้าสุดท้าย) ─── */}
          {showFooter && grandTotal && avgPerSet && data.length > 0 && (
            <>
              {/* รวมทั้งหมด */}
              <tr className="bg-gray-300 font-bold text-gray-900 border-t-2 border-gray-500">
                <td colSpan="3" className="border border-gray-400 p-2 text-center tracking-wider">
                  รวมทั้งหมด
                </td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_normal_ab) > 0 ? Number(grandTotal.vol_normal_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_special_ab) > 0 ? Number(grandTotal.vol_special_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_ab) > 0 ? Number(grandTotal.vol_ab).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_normal_c) > 0 ? Number(grandTotal.vol_normal_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_special_c) > 0 ? Number(grandTotal.vol_special_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_c) > 0 ? Number(grandTotal.vol_c).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_normal_p) > 0 ? Number(grandTotal.vol_normal_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_special_p) > 0 ? Number(grandTotal.vol_special_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_p) > 0 ? Number(grandTotal.vol_p).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_normal_pp) > 0 ? Number(grandTotal.vol_normal_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_special_pp) > 0 ? Number(grandTotal.vol_special_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.vol_pp) > 0 ? Number(grandTotal.vol_pp).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(grandTotal.total_volumn) > 0 ? Number(grandTotal.total_volumn).toFixed(2) : ''}</td>
              </tr>
              {/* เฉลี่ย ลบ.ฟ./ชุด */}
              <tr className="bg-gray-400 font-bold text-gray-900">
                <td colSpan="3" className="border border-gray-400 p-2 text-center tracking-wider">
                  เฉลี่ย ลบ.ฟ./ชุด
                </td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_normal_ab) > 0 ? Number(avgPerSet.vol_normal_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_special_ab) > 0 ? Number(avgPerSet.vol_special_ab).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_ab) > 0 ? Number(avgPerSet.vol_ab).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_normal_c) > 0 ? Number(avgPerSet.vol_normal_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_special_c) > 0 ? Number(avgPerSet.vol_special_c).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_c) > 0 ? Number(avgPerSet.vol_c).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_normal_p) > 0 ? Number(avgPerSet.vol_normal_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_special_p) > 0 ? Number(avgPerSet.vol_special_p).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_p) > 0 ? Number(avgPerSet.vol_p).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_normal_pp) > 0 ? Number(avgPerSet.vol_normal_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_special_pp) > 0 ? Number(avgPerSet.vol_special_pp).toFixed(2) : ''}</td>
                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.vol_pp) > 0 ? Number(avgPerSet.vol_pp).toFixed(2) : ''}</td>

                <td className="border border-gray-400 p-2 text-right">{Number(avgPerSet.total_volumn) > 0 ? Number(avgPerSet.total_volumn).toFixed(2) : ''}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function SawerPerformanceReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    report_format: '1' // 💡 เพิ่มค่าตัวเลือกรูปแบบรายงาน
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [avgData, setAvgData] = useState(null);
  
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  // การจัดการหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  // ─── โหลดสาขาเริ่มต้น ───
  useEffect(() => {
    let isMounted = true;
    const fetchBranches = async () => {
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
            setFilters(prev => ({ ...prev, branch_id: validBranches[0].id, branch_name: validBranches[0].branch_name }));
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
    return () => { isMounted = false; };
  }, []);

  // ─── Handlers ───
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };
  
  const handleDateChange = (date, name) => {
    if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
  };
  
  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  const handleSearch = async () => {
    if (!filters.branch_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');

    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        report_format: filters.report_format // 💡 แนบรูปแบบรายงาน
      }).toString();

      const res = await apiFetch(`/reports/sawer-performance?${q}`);
      
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal);
        setAvgData(res.avgPerSet);
        setCurrentPage(1);
        if (res.data.length === 0) Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
      } else {
        Swal.fire('ข้อผิดพลาด', res?.message || 'ดึงข้อมูลไม่สำเร็จ', 'error');
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
        branch_name: filters.branch_name,
        report_format: filters.report_format // 💡 แนบรูปแบบรายงาน
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/sawer-performance/pdf?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
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
        a.download = `Sawer_Performance_${filters.start_date}.pdf`;
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
        report_format: filters.report_format // 💡 แนบรูปแบบรายงาน
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/sawer-performance/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Sawer_Performance_${filters.start_date}.xlsx`;
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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = reportData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reportData.length / itemsPerPage);

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50">
      
      {/* ─── โซนค้นหา ─── */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-users-cog text-blue-600"></i> ค้นหารายงานสรุปผลงานนายม้า
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">สาขา <span className="text-red-500">*</span></label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              disabled={isLoading || (accessLevel !== 1 && branches.length <= 1)}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-gray-50 disabled:bg-gray-200 disabled:text-gray-500"
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
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-md p-2 text-sm outline-none bg-gray-50"
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
              className="w-full border rounded-md p-2 text-sm outline-none bg-gray-50"
              wrapperClassName="w-full"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">รูปแบบรายงาน</label>
            <select
              name="report_format"
              value={filters.report_format}
              onChange={handleFilterChange}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-blue-50 text-blue-700 font-semibold"
            >
              <option value="1">แบบที่ 1 (แสดงนายม้า+แหล่งที่มา)</option>
              <option value="2">แบบที่ 2 (สรุปเฉพาะแผนก)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button 
            onClick={handleSearch} 
            disabled={isLoading} 
            className="bg-blue-600 text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm flex items-center justify-center min-w-[120px]"
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
                <i className="fas fa-file-excel"></i> {isExportingExcel ? 'กำลังสร้าง...' : 'โหลด Excel'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── โซนแสดงรายงาน ─── */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 pb-6 print:border-none print:shadow-none min-h-[900px] flex flex-col justify-between">
          
          <div>
            <div className="text-center mb-6 pt-6">
              <h1 className="text-lg font-bold text-gray-800">บริษัท วู้ดเวิร์ค จำกัด ({filters.branch_name})</h1>
              <h2 className="text-md font-semibold text-gray-700 mt-1">รายงานสรุปผลงานนายม้า แยกตามเกรดคุณภาพไม้ (AB, C, P, PP)</h2>
              <p className="text-sm text-gray-600 mt-1">
                ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}
                <span className="ml-2">สโตร์: ทั้งหมด</span>
              </p>
              <p className="text-sm text-gray-600">แหล่งที่มา: ทั้งหมด &nbsp;|&nbsp; ประเภทไม้: ทั้งหมด &nbsp;|&nbsp; กลุ่มไม้: ทั้งหมด</p>
            </div>

            <div className="px-4">
              <ReportTable 
                data={currentData} 
                grandTotal={grandTotalData} 
                avgPerSet={avgData}
                showFooter={currentPage === totalPages || totalPages === 0} 
              />
            </div>
          </div>

          {/* ─── โซนเซ็นชื่อท้ายรายงาน (แสดงเฉพาะหน้าสุดท้าย) ─── */}
          {(currentPage === totalPages || totalPages === 0) && (
            <div className="mt-12 px-10 grid grid-cols-4 gap-4 text-center text-sm mb-4">
              <div>
                <p>-------------------------</p>
                <p className="mt-2">ผู้รายงาน</p>
              </div>
              <div>
                <p>-------------------------</p>
                <p className="mt-2">ผู้ตรวจสอบ</p>
              </div>
              <div>
                <p>-------------------------</p>
                <p className="mt-2">ผู้พิจารณา</p>
              </div>
              <div>
                <p>-------------------------</p>
                <p className="mt-2">ผู้อนุมัติ</p>
              </div>
            </div>
          )}

          {/* ─── Pagination ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 mt-4 mx-4 print:hidden">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">« หน้าแรก</button>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400">‹ ก่อนหน้า</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">หน้า</span>
                <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border rounded-md py-1 px-2 text-sm font-semibold text-blue-700 outline-none">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
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