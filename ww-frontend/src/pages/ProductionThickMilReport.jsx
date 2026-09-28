import React, { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function ProductionThickMilReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: ''
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [lengthSummary, setLengthSummary] = useState([]);
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const { options } = useMasterOptions(filters.branch_id);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3; 

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
    if (!filters.branch_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');

    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code
      }).toString();

      const res = await apiFetch(`/reports/production-thick-mil?${q}`);
      
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal);
        setLengthSummary(res.lengthSummary);
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
      
      const res = await fetch(`${apiUrl}/reports/production-thick-mil/pdf?${q}`, {
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
        a.download = `Production_Thick_Mil_${filters.start_date}.pdf`;
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
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        store_code: filters.store_code
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/production-thick-mil/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Production_Thick_Mil_${filters.start_date}.xlsx`;
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
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-layer-group text-blue-600"></i> รายงานการผลิต แยกตาม ความหนา-มิลไม้
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

      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto pb-6">
          <div className="text-center mb-6 pt-6">
            <h1 className="text-xl font-bold text-gray-800">รายงานการผลิต แยกตาม ความหนา-มิลไม้</h1>
            <h2 className="text-md font-semibold text-gray-700 mt-2">บริษัท วู้ดเวิร์ค จำกัด ({filters.branch_name})</h2>
            <p className="text-sm text-gray-600 mt-1">
              ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')} 
            </p>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400 whitespace-nowrap min-w-max px-4 mx-4" style={{ width: 'calc(100% - 32px)' }}>
            <thead>
              <tr className="bg-[#b4c6e7] text-gray-800 font-semibold border-y-2 border-gray-500">
                <th className="border border-gray-400 p-2 text-left" colSpan="2">ขนาดไม้</th>
                <th className="border border-gray-400 p-2 text-right">AB</th>
                <th className="border border-gray-400 p-2 text-right">% กว้าง</th>
                <th className="border border-gray-400 p-2 text-right">% ยาว</th>
                <th className="border border-gray-400 p-2 text-right">ราคา</th>
                <th className="border border-gray-400 p-2 text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((tmGroup, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-white text-gray-800 border-t border-gray-400">
                    <td className="border border-gray-400 p-2 pl-3 w-32">ความหนา</td>
                    <td className="border border-gray-400 p-2 w-40">{tmGroup.thick_mil} mm</td>
                    <td className="border border-gray-400 p-2" colSpan="5"></td>
                  </tr>

                  {tmGroup.lengths.map((lenGroup, lIdx) => (
                    <React.Fragment key={lIdx}>
                      {lenGroup.items.map((item, iIdx) => (
                        <tr key={iIdx} className="hover:bg-gray-50 bg-white">
                          <td className="border border-gray-400 p-1 bg-white"></td>
                          <td className="border border-gray-400 p-1 pl-2 text-blue-800">{item.wood_code}</td>
                          <td className="border border-gray-400 p-1 text-right">{item.ab_volumn.toFixed(4)}</td>
                          <td className="border border-gray-400 p-1 text-right text-gray-600">{item.pct_width.toFixed(2)}%</td>
                          <td className="border border-gray-400 p-1 text-right bg-white"></td>
                          <td className="border border-gray-400 p-1 text-right">{item.avg_price > 0 ? item.avg_price.toFixed(2) : ''}</td>
                          <td className="border border-gray-400 p-1 text-right">{item.ab_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                      <tr className="bg-[#fff2cc] font-semibold text-gray-800">
                        <td className="border border-gray-400 p-1 pl-3" colSpan="2">รวมยาว {lenGroup.length}</td>
                        <td className="border border-gray-400 p-1 text-right">{lenGroup.sub_volumn.toFixed(4)}</td>
                        <td className="border border-gray-400 p-1 text-right bg-white"></td>
                        <td className="border border-gray-400 p-1 text-right">{lenGroup.pct_length.toFixed(2)}%</td>
                        <td className="border border-gray-400 p-1 text-right bg-white"></td>
                        <td className="border border-gray-400 p-1 text-right">{lenGroup.sub_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    </React.Fragment>
                  ))}

                  <tr className="bg-[#c6e0b4] font-bold text-gray-900 border-b border-gray-500">
                    <td className="border border-gray-400 p-2 pl-3 text-green-900" colSpan="2">รวมหนา {tmGroup.thick_mil} mm</td>
                    <td className="border border-gray-400 p-2 text-right text-green-900">{tmGroup.total_volumn.toFixed(4)}</td>
                    <td className="border border-gray-400 p-2 text-right bg-white" colSpan="3"></td>
                    <td className="border border-gray-400 p-2 text-right text-green-900">{tmGroup.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                  
                  <tr className="bg-white font-medium">
                    <td className="border border-gray-400 p-1 pl-3" colSpan="2">% หน้าไม้นี้ รวมพิเศษ</td>
                    <td className="border border-gray-400 p-1 text-right bg-[#ffe699] font-bold text-orange-900">{tmGroup.pct_thick_total.toFixed(2)}%</td>
                    <td className="border border-gray-400 p-1 text-right bg-white" colSpan="4"></td>
                  </tr>
                  <tr className="bg-white font-medium">
                    <td className="border border-gray-400 p-1 pl-3" colSpan="2">ราคาเฉลี่ย</td>
                    <td className="border border-gray-400 p-1 text-right bg-[#ff0000] font-bold text-white">{tmGroup.avg_price.toFixed(2)}</td>
                    <td className="border border-gray-400 p-1 text-right bg-white" colSpan="4"></td>
                  </tr>
                </React.Fragment>
              ))}

              {grandTotalData && (currentPage === totalPages || totalPages === 0) && (
                <>
                  <tr className="bg-[#8ea9db] font-bold text-gray-900 border-t-4 border-gray-600">
                    <td className="border border-gray-500 p-2 pl-3" colSpan="2">รวม ลบ. ฟุต ทั้งหมด</td>
                    <td className="border border-gray-500 p-2 text-right text-blue-900">{grandTotalData.total_volumn.toFixed(4)}</td>
                    <td className="border border-gray-500 p-2 text-right">100%</td>
                    <td className="border border-gray-500 p-2 text-right bg-white" colSpan="2"></td>
                    <td className="border border-gray-500 p-2 text-right text-blue-900">{grandTotalData.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                  <tr className="bg-gray-200 font-bold">
                    <td className="border border-gray-500 p-2 pl-3" colSpan="2">ราคาเฉลี่ย</td>
                    <td className="border border-gray-500 p-2 text-right text-orange-900 bg-[#ffe699]">{grandTotalData.avg_price.toFixed(2)}</td>
                    <td className="border border-gray-500 p-2 text-right bg-white" colSpan="4"></td>
                  </tr>

                  <tr className="bg-white">
                    <td colSpan="7" className="p-0 border-0">
                      <div className="mt-4 w-1/2 min-w-[300px]">
                        <table className="w-full text-xs border-collapse border border-gray-300">
                          <thead>
                            <tr className="bg-gray-100 font-semibold text-gray-700">
                              <th className="border border-gray-300 p-2 text-left">สรุปสัดส่วนความยาว</th>
                              <th className="border border-gray-300 p-2 text-right">ปริมาตร</th>
                              <th className="border border-gray-300 p-2 text-right">เปอร์เซ็นต์</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lengthSummary.map((sum, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="border border-gray-300 p-1 pl-3">รวมปริมาตร {sum.length} ม.</td>
                                <td className="border border-gray-300 p-1 text-right">{sum.volumn > 0 ? sum.volumn.toFixed(4) : ''}</td>
                                <td className="border border-gray-300 p-1 text-right">{sum.pct > 0 ? sum.pct.toFixed(2) + '%' : ''}</td>
                              </tr>
                            ))}
                            <tr className="bg-gray-100 font-bold text-gray-800">
                              <td className="border border-gray-300 p-2 pl-3">รวมปริมาตรทั้งหมด</td>
                              <td className="border border-gray-300 p-2 text-right">{grandTotalData.total_volumn.toFixed(2)}</td>
                              <td className="border border-gray-300 p-2 text-right">100.00%</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>

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