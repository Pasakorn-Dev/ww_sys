import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับตาราง ───
const ReportTable = React.memo(({ data, grandTotal }) => {
  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-[11px] md:text-xs border-collapse border border-gray-400 whitespace-nowrap min-w-max">
        <thead>
          <tr className="bg-gray-100 text-gray-800 font-bold border-y-2 border-gray-500">
            <th className="border border-gray-400 p-2 text-left">วันที่ผลิต</th>
            <th className="border border-gray-400 p-2 text-right w-24">AB</th>
            <th className="border border-gray-400 p-2 text-right w-24">AB พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right w-24">C</th>
            <th className="border border-gray-400 p-2 text-right w-24">C พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right w-24">P ปกติ</th>
            <th className="border border-gray-400 p-2 text-right w-24">P พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right w-24">PP ปกติ</th>
            <th className="border border-gray-400 p-2 text-right w-24">PP พิเศษ</th>
            <th className="border border-gray-400 p-2 text-right bg-green-50 w-24">รวม</th>
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((monthGroup, mIdx) => (
              <React.Fragment key={mIdx}>
                {monthGroup.days.map((day, dIdx) => (
                  <React.Fragment key={dIdx}>
                    {/* บรรทัดที่ 1: ปริมาตร */}
                    <tr className="bg-white hover:bg-gray-50 transition-colors">
                      <td className="border border-gray-400 p-2 px-3 text-left font-medium text-gray-700" rowSpan="2">
                        {format(new Date(day.date), 'dd/MM/yyyy')}
                      </td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{day.vols.vol_normal_ab > 0 ? day.vols.vol_normal_ab.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{day.vols.vol_special_ab > 0 ? day.vols.vol_special_ab.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-green-700">{day.vols.vol_normal_c > 0 ? day.vols.vol_normal_c.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-green-700">{day.vols.vol_special_c > 0 ? day.vols.vol_special_c.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-orange-700">{day.vols.vol_normal_p > 0 ? day.vols.vol_normal_p.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-orange-700">{day.vols.vol_special_p > 0 ? day.vols.vol_special_p.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-purple-700">{day.vols.vol_normal_pp > 0 ? day.vols.vol_normal_pp.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right text-purple-700">{day.vols.vol_special_pp > 0 ? day.vols.vol_special_pp.toFixed(2) : ''}</td>
                      <td className="border border-gray-400 p-1.5 px-2 text-right font-bold text-gray-900 bg-gray-50">{day.vols.total_volumn > 0 ? day.vols.total_volumn.toFixed(2) : ''}</td>
                    </tr>
                    {/* บรรทัดที่ 2: สัดส่วน % */}
                    <tr className="bg-white hover:bg-gray-50 transition-colors text-gray-500">
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_normal_ab > 0 ? day.pcts.vol_normal_ab.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_special_ab > 0 ? day.pcts.vol_special_ab.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_normal_c > 0 ? day.pcts.vol_normal_c.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_special_c > 0 ? day.pcts.vol_special_c.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_normal_p > 0 ? day.pcts.vol_normal_p.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_special_p > 0 ? day.pcts.vol_special_p.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_normal_pp > 0 ? day.pcts.vol_normal_pp.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right">{day.pcts.vol_special_pp > 0 ? day.pcts.vol_special_pp.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 px-2 text-right bg-gray-50">{day.pcts.total_volumn > 0 ? day.pcts.total_volumn.toFixed(2) + '%' : ''}</td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* ─── สรุปรายเดือน ─── */}
                <tr className="bg-gray-100 text-gray-800 border-t-2 border-gray-400">
                  <td className="border border-gray-400 p-2 px-3 text-center font-bold" rowSpan="2">
                    รวมรายเดือน : {monthGroup.month_label}
                  </td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{monthGroup.monthly_total.vol_normal_ab > 0 ? monthGroup.monthly_total.vol_normal_ab.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-blue-800">{monthGroup.monthly_total.vol_special_ab > 0 ? monthGroup.monthly_total.vol_special_ab.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-green-700">{monthGroup.monthly_total.vol_normal_c > 0 ? monthGroup.monthly_total.vol_normal_c.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-green-700">{monthGroup.monthly_total.vol_special_c > 0 ? monthGroup.monthly_total.vol_special_c.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-orange-700">{monthGroup.monthly_total.vol_normal_p > 0 ? monthGroup.monthly_total.vol_normal_p.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-orange-700">{monthGroup.monthly_total.vol_special_p > 0 ? monthGroup.monthly_total.vol_special_p.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-purple-700">{monthGroup.monthly_total.vol_normal_pp > 0 ? monthGroup.monthly_total.vol_normal_pp.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right text-purple-700">{monthGroup.monthly_total.vol_special_pp > 0 ? monthGroup.monthly_total.vol_special_pp.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1.5 px-2 text-right font-bold text-gray-900 bg-gray-200">{monthGroup.monthly_total.total_volumn > 0 ? monthGroup.monthly_total.total_volumn.toFixed(2) : ''}</td>
                </tr>
                <tr className="bg-gray-100 text-gray-600 font-semibold border-b-2 border-gray-400">
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_normal_ab > 0 ? monthGroup.monthly_pcts.vol_normal_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_special_ab > 0 ? monthGroup.monthly_pcts.vol_special_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_normal_c > 0 ? monthGroup.monthly_pcts.vol_normal_c.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_special_c > 0 ? monthGroup.monthly_pcts.vol_special_c.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_normal_p > 0 ? monthGroup.monthly_pcts.vol_normal_p.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_special_p > 0 ? monthGroup.monthly_pcts.vol_special_p.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_normal_pp > 0 ? monthGroup.monthly_pcts.vol_normal_pp.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right">{monthGroup.monthly_pcts.vol_special_pp > 0 ? monthGroup.monthly_pcts.vol_special_pp.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 px-2 text-right bg-gray-200">{monthGroup.monthly_pcts.total_volumn > 0 ? monthGroup.monthly_pcts.total_volumn.toFixed(2) + '%' : ''}</td>
                </tr>
              </React.Fragment>
            ))
          ) : (
            <tr>
              <td colSpan="10" className="border border-gray-400 p-8 text-center text-gray-500">
                ไม่พบข้อมูลในช่วงเวลาที่เลือก
              </td>
            </tr>
          )}

          {/* ─── Grand Total ─── */}
          {grandTotal && data.length > 0 && (
            <tr className="bg-gray-300 font-bold text-gray-900 border-t-2 border-gray-500 text-sm">
              <td className="border border-gray-400 p-2.5 px-3 text-center tracking-wide">
                รวมทั้งหมด
              </td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_normal_ab > 0 ? grandTotal.vols.vol_normal_ab.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_special_ab > 0 ? grandTotal.vols.vol_special_ab.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_normal_c > 0 ? grandTotal.vols.vol_normal_c.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_special_c > 0 ? grandTotal.vols.vol_special_c.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_normal_p > 0 ? grandTotal.vols.vol_normal_p.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_special_p > 0 ? grandTotal.vols.vol_special_p.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_normal_pp > 0 ? grandTotal.vols.vol_normal_pp.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right">{grandTotal.vols.vol_special_pp > 0 ? grandTotal.vols.vol_special_pp.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-2.5 px-2 text-right bg-gray-400 text-black">{grandTotal.vols.total_volumn > 0 ? grandTotal.vols.total_volumn.toFixed(2) : ''}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function DailyProductionReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);

  // ─── 1. โหลดสาขาเริ่มต้น ───
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

  // ─── 2. Handlers ───
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
        branch_id: filters.branch_id
      }).toString();

      const res = await apiFetch(`/reports/daily-production?${q}`);
      
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal);
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
        branch_name: filters.branch_name
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/daily-production/pdf?${q}`, {
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
        a.download = `Daily_Production_${filters.start_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    }
  };

  // --- ฟังก์ชันโหลด Excel (Blob) ---
  const handleExportExcel = async () => {
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
        branch_id: filters.branch_id
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/daily-production/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Daily_Production_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50">
      
      {/* ─── โซนค้นหา ─── */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-calendar-alt text-blue-600"></i> ค้นหารายงานสรุปผลผลิตไม้รายวันและประจำเดือน
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <button onClick={() => handleExportPDF(true)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-search-plus"></i> ตัวอย่าง PDF
              </button>
              <button onClick={() => handleExportPDF(false)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-excel"></i> ส่งออก Excel
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
              <h2 className="text-md font-semibold text-gray-700 mt-1">รายงานสรุปผลผลิตไม้รายวันและประจำเดือน</h2>
              <p className="text-sm text-gray-600 mt-1">
                ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}
                <span className="ml-2">สโตร์: ทั้งหมด</span>
              </p>
              <p className="text-sm text-gray-600">แหล่งที่มา: ทั้งหมด &nbsp;|&nbsp; กลุ่มไม้: ทั้งหมด</p>
            </div>

            <div className="px-4">
              <ReportTable data={reportData} grandTotal={grandTotalData} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}