import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับแสดงตารางและยอดรวม ───
const ReportTable = React.memo(({ data, grandTotal, showGrandTotal, selectedGrade }) => {
  // คำนวณชื่อบนหัวตาราง
  const gradeLabel = selectedGrade === 'ALL' ? 'ปกติ' : (selectedGrade || 'AB');
  const spcGradeLabel = selectedGrade === 'ALL' ? 'พิเศษ' : `${selectedGrade || 'AB'} พิเศษ`;

  return (
    <table className="w-full text-xs border-collapse border border-gray-400 whitespace-nowrap mt-4">
      <thead>
        <tr className="bg-[#9fc5e8] text-black font-semibold">
          <th className="border border-gray-400 p-2 text-center" colSpan="2">ขนาดไม้</th>
          <th className="border border-gray-400 p-2 text-right">{gradeLabel}</th>
          <th className="border border-gray-400 p-2 text-right">% กว้าง</th>
          <th className="border border-gray-400 p-2 text-right">% ยาว</th>
          <th className="border border-gray-400 p-2 text-right">ราคาเฉลี่ย</th>
          <th className="border border-gray-400 p-2 text-right">จำนวนเงิน</th>
          <th className="border border-gray-400 p-2 text-right">{spcGradeLabel}</th>
          <th className="border border-gray-400 p-2 text-right">% กว้าง</th>
          <th className="border border-gray-400 p-2 text-right">% ยาว</th>
          <th className="border border-gray-400 p-2 text-right">ราคาเฉลี่ย</th>
          <th className="border border-gray-400 p-2 text-right">จำนวนเงิน</th>
        </tr>
      </thead>
      <tbody>
        {data.map((sawGroup, sawIdx) => (
          <React.Fragment key={sawIdx}>
            <tr className="bg-[#4472c4] text-white font-bold border-t-4 border-[#1f3864]">
              <td className="border border-gray-500 p-2 pl-3 text-left text-[13px]" colSpan="2">{sawGroup.saw_name}</td>
              <td className="border border-gray-500 p-2 pl-3 text-left text-[13px]" colSpan="10">ชุดที่ {sawIdx + 1}</td>
            </tr>

            {sawGroup.thicks.map((thickGroup, thickIdx) => (
              <React.Fragment key={`${sawIdx}-${thickIdx}`}>
                <tr className="bg-[#e6f2ff] font-bold">
                  <td className="border border-gray-400 p-1 pl-3 text-blue-900">ความหนา</td>
                  <td className="border border-gray-400 p-1 pl-2 text-blue-900" colSpan="11">{thickGroup.thick}</td>
                </tr>

                {thickGroup.lengths.map((lenGroup, lenIdx) => (
                  <React.Fragment key={`${sawIdx}-${thickIdx}-${lenIdx}`}>
                    {lenGroup.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="bg-white hover:bg-gray-100 transition-colors">
                        <td className="border border-gray-400 p-1 pl-3 font-medium" colSpan="2">
                          <span className="text-red-600 font-bold">{item.wood_code.substring(0, 2)}</span>
                          <span className="text-gray-700">{item.wood_code.substring(2)}</span>
                        </td>
                        <td className="border border-gray-400 p-1 text-right">{item.ab_volumn.toFixed(4)}</td>
                        <td className="border border-gray-400 p-1 text-right text-gray-600">{item.ab_pct_qty.toFixed(2)}%</td>
                        <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                        <td className="border border-gray-400 p-1 text-right">{item.ab_price > 0 ? item.ab_price.toFixed(2) : ''}</td>
                        <td className="border border-gray-400 p-1 text-right">{item.ab_amt.toFixed(2)}</td>
                        <td className="border border-gray-400 p-1 text-right">{item.spc_volumn.toFixed(4)}</td>
                        <td className="border border-gray-400 p-1 text-right text-gray-600">{item.spc_volumn > 0 ? item.spc_pct_qty.toFixed(2) + '%' : ''}</td>
                        <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                        <td className="border border-gray-400 p-1 text-right">{item.spc_price > 0 ? item.spc_price.toFixed(2) : ''}</td>
                        <td className="border border-gray-400 p-1 text-right">{item.spc_amt.toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* รวมยาว */}
                    <tr className="bg-[#fff2cc] font-bold text-gray-800">
                      <td className="border border-gray-400 p-1 pl-3" colSpan="2">รวมยาว {lenGroup.length}</td>
                      <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.ab_volumn.toFixed(4)}</td>
                      <td className="border border-gray-400 p-1 text-right text-gray-600">{lenGroup.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
                      <td className="border border-gray-400 p-1 text-right text-blue-700">{lenGroup.subTotal.ab_volumn > 0 ? lenGroup.subTotal.ab_pct_amt.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                      <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.ab_amt.toFixed(2)}</td>
                      <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.spc_volumn.toFixed(4)}</td>
                      <td className="border border-gray-400 p-1 text-right text-gray-600">{lenGroup.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
                      <td className="border border-gray-400 p-1 text-right text-blue-700">{lenGroup.subTotal.spc_volumn > 0 ? lenGroup.subTotal.spc_pct_amt.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                      <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.spc_amt.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* รวมหนา */}
                <tr className="bg-[#c6e0b4] font-bold text-gray-800 border-t-2 border-gray-500">
                  <td className="border border-gray-400 p-1 pl-3" colSpan="2">รวมหนา <span className="text-red-600">{thickGroup.thick}</span></td>
                  <td className="border border-gray-400 p-1 text-right text-green-900">{thickGroup.subTotal.ab_volumn.toFixed(4)}</td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right text-gray-600">{thickGroup.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right text-green-900">{thickGroup.subTotal.ab_amt.toFixed(2)}</td>
                  <td className="border border-gray-400 p-1 text-right text-green-900">{thickGroup.subTotal.spc_volumn.toFixed(4)}</td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right text-gray-600">{thickGroup.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right text-green-900">{thickGroup.subTotal.spc_amt.toFixed(2)}</td>
                </tr>

                {/* % ความหนา (ชุด) รวมพิเศษ และ แยก */}
                <tr className="bg-white font-medium">
                  <td className="border border-gray-400 p-1 pl-3" colSpan="2">% ความหนา (ชุด) รวมพิเศษ</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#ffe699] font-bold text-orange-900">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.pct_thick_all_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#ffe699] font-bold text-orange-900">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.pct_thick_all_spc.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
                </tr>
                <tr className="bg-white font-medium">
                  <td className="border border-gray-400 p-1 pl-3" colSpan="2">% ความหนา (ชุด) แยก ปกติ ,พิเศษ</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f8cbad] font-bold text-orange-900">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.pct_thick_sep_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#f8cbad] font-bold text-orange-900">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.pct_thick_sep_spc.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
                </tr>
                <tr className="bg-white font-medium border-b-4 border-gray-400">
                  <td className="border border-gray-400 p-1 pl-3" colSpan="2">ราคาเฉลี่ย</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#ff0000] font-bold text-white">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.avg_price_ab.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
                  <td className="border border-gray-400 p-1 text-right bg-[#ff0000] font-bold text-white">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.avg_price_spc.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
                </tr>
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        {/* Grand Total */}
        {showGrandTotal && grandTotal && (
          <React.Fragment>
            <tr className="bg-[#a9d08e] font-bold text-gray-900 border-t-4 border-gray-700">
              <td className="border border-gray-500 p-2 pl-3 text-left text-[13px]" colSpan="2">รวมทั้งหมดทั้งรายงาน</td>
              <td className="border border-gray-500 p-2 text-right">{grandTotal.ab_volumn.toFixed(4)}</td>
              <td className="border border-gray-500 p-2 text-right bg-[#f2f2f2]"></td>
              <td className="border border-gray-500 p-2 text-right text-gray-700">{grandTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
              <td className="border border-gray-500 p-2 text-right bg-[#f2f2f2]"></td>
              <td className="border border-gray-500 p-2 text-right">{grandTotal.ab_amt.toFixed(2)}</td>
              
              <td className="border border-gray-500 p-2 text-right">{grandTotal.spc_volumn.toFixed(4)}</td>
              <td className="border border-gray-500 p-2 text-right bg-[#f2f2f2]"></td>
              <td className="border border-gray-500 p-2 text-right text-gray-700">{grandTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
              <td className="border border-gray-500 p-2 text-right bg-[#f2f2f2]"></td>
              <td className="border border-gray-500 p-2 text-right">{grandTotal.spc_amt.toFixed(2)}</td>
            </tr>

            <tr className="bg-white font-medium">
              <td className="border border-gray-400 p-1 pl-3" colSpan="2">% รวมทั้งหมด รวมพิเศษ</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#ffe699] font-bold text-orange-900">{grandTotal.ab_volumn > 0 ? grandTotal.pct_all_ab.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#ffe699] font-bold text-orange-900">{grandTotal.spc_volumn > 0 ? grandTotal.pct_all_spc.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
            </tr>

            <tr className="bg-white font-medium">
              <td className="border border-gray-400 p-1 pl-3" colSpan="2">% รวมทั้งหมด แยก ปกติ ,พิเศษ</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#f8cbad] font-bold text-orange-900">{grandTotal.ab_volumn > 0 ? grandTotal.pct_sep_ab.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#f8cbad] font-bold text-orange-900">{grandTotal.spc_volumn > 0 ? grandTotal.pct_sep_spc.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
            </tr>

            <tr className="bg-white font-medium border-b-4 border-gray-700">
              <td className="border border-gray-400 p-1 pl-3" colSpan="2">ราคาเฉลี่ยรวมทั้งหมด</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#ff0000] font-bold text-white">{grandTotal.ab_volumn > 0 ? grandTotal.avg_price_ab.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="4"></td>
              <td className="border border-gray-400 p-1 text-right bg-[#ff0000] font-bold text-white">{grandTotal.spc_volumn > 0 ? grandTotal.avg_price_spc.toFixed(2) : ''}</td>
              <td className="border border-gray-400 p-1 bg-[#f2f2f2]" colSpan="3"></td>
            </tr>
          </React.Fragment>
        )}
      </tbody>
    </table>
  );
});

export default function WoodTypeReport() {
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    branch_id: '',
    branch_name: '',
    grade: 'AB' // 💡 เพิ่ม state grade
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 2; 

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await apiFetch(`/branches/allowed?menu=${window.location.pathname}`);
        if (res?.success && res.data.length > 0) {
          setBranches(res.data);
          setFilters(prev => ({ ...prev, branch_id: res.data[0].id, branch_name: res.data[0].branch_name }));
        }
      } catch (error) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลสาขาได้', 'error');
      }
    };
    fetchBranches();
  }, []);

  const handleDateChange = (date, name) => {
    if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
  };

  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  // 💡 ดักจับเวลาเปลี่ยน filter เกรดไม้
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleSearch = async () => {
    if (!filters.branch_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');

    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade // 💡 ส่งเกรดไม้
      }).toString();

      const res = await apiFetch(`/reports/wood-type-ab?${q}`);
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal); 
        setCurrentPage(1); 
        if (res.data.length === 0) Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลของสาขาและวันที่เลือก', 'info');
      }
    } catch (error) {
      Swal.fire('Error', 'ดึงข้อมูลล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade // 💡 ส่งเกรดไม้
      }).toString();

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/wood-type-ab/pdf?${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      window.open(window.URL.createObjectURL(blob), '_blank'); 
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade // 💡 ส่งเกรดไม้
      }).toString();

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/reports/wood-type-ab/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(blob);
      a.download = `Wood_Type_${filters.grade}_Report_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4">ค้นหารายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">สาขา</label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white"
            >
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                ))
              ) : (
                <option value="">กำลังโหลด...</option>
              )}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่เริ่มต้น</label>
            <DatePicker selected={filters.start_date ? parseISO(filters.start_date) : null} onChange={(date) => handleDateChange(date, 'start_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border rounded-md p-2 text-sm" />
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">วันที่สิ้นสุด</label>
            <DatePicker selected={filters.end_date ? parseISO(filters.end_date) : null} onChange={(date) => handleDateChange(date, 'end_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border rounded-md p-2 text-sm" />
          </div>

          {/* 💡 Dropdown เพิ่มเกรดไม้ */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700">เกรดไม้</label>
            <select
              name="grade"
              value={filters.grade}
              onChange={handleFilterChange}
              className="w-full border rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white"
            >
              <option value="AB">AB</option>
              <option value="C">C</option>
              <option value="P">P</option>
              <option value="PP">PP</option>
              <option value="ALL">รวมทุกเกรด</option>
            </select>
          </div>

          <div className="flex items-end gap-2 md:col-span-1">
            <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 text-white w-full py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center">
              {isLoading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
            </button>
          </div>
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto pb-6">
          <div className="flex justify-end gap-3 px-6 pt-6 print:hidden">
            <button onClick={handleExportPDF} disabled={isExportingPDF} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
              <i className="fas fa-file-pdf"></i> {isExportingPDF ? 'กำลังสร้าง PDF...' : 'ตัวอย่าง PDF'}
            </button>
            <button onClick={handleExportExcel} disabled={isExportingExcel} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingExcel ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              <i className="fas fa-file-excel"></i> {isExportingExcel ? 'กำลังสร้าง Excel...' : 'โหลด Excel'}
            </button>
          </div>

          {/* 💡 ปรับเปลี่ยนหัวรายงาน */}
          <div className="text-center mb-6 pt-2">
            <h1 className="text-lg font-bold text-gray-800">บริษัท วู้ดเวิร์ค จำกัด ({filters.branch_name})</h1>
            <h2 className="text-md font-semibold text-gray-700 mt-1">รายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
            <p className="text-sm text-gray-600 mt-2">ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึงวันที่ {format(parseISO(filters.end_date), 'dd/MM/yyyy')}</p>
            <p className="text-sm text-gray-500 mt-1">เกรดไม้: <span className="font-semibold text-blue-600">{filters.grade === 'ALL' ? 'ทั้งหมด' : filters.grade}</span></p>
          </div>

          <ReportTable 
            data={currentData} 
            grandTotal={grandTotalData} 
            showGrandTotal={currentPage === totalPages || totalPages === 0} 
            selectedGrade={filters.grade}
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 mt-4 print:hidden">
              <div className="flex flex-wrap justify-between items-center w-full gap-4">
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>« หน้าแรก</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>‹ ก่อนหน้า</button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">หน้า</span>
                  <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border border-gray-300 rounded-md py-1 px-2 text-sm outline-none focus:border-blue-500 font-semibold text-blue-700">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (<option key={page} value={page}>{page}</option>))}
                  </select>
                  <span className="text-sm text-gray-700">จาก {totalPages}</span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>ถัดไป ›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>หน้าสุดท้าย »</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}