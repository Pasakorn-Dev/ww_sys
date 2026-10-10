import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function DryWoodCoverReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: '',
    report_format: '1'
  });

  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35; 

  useEffect(() => {
    const fetchInitialData = async () => {
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
    fetchInitialData();
  }, []);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleDateChange = (date, name) => {
    if (date) {
      setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
    }
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
      const endpoint = filters.report_format === '2' 
        ? '/reports/dry-wood-cover-format2' 
        : '/reports/dry-wood-cover';

      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        store_code: filters.store_code // 💡 เพิ่มบรรทัดนี้
      }).toString();

      const res = await apiFetch(`${endpoint}?${queryParams}`);
      if (res?.success) {
        if (res.data.groups.length === 0) {
          Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
          setReportData(null);
        } else {
          setReportData(res.data);
          setCurrentPage(1);
        }
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ดึงข้อมูลรายงานล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── ฟังก์ชันโหลด PDF (Blob) ───
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
        store_code: filters.store_code,
        report_format: filters.report_format,
        branch_name: filters.branch_name
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/dry-wood-cover/pdf?${q}`, {
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
        a.download = `Dry_Wood_Cover_${filters.start_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    }
  };

  // ─── ฟังก์ชันโหลด Excel (Blob) ───
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
        branch_id: filters.branch_id,
        store_code: filters.store_code,
        report_format: filters.report_format,
        branch_name: filters.branch_name
      }).toString();

      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      
      const res = await fetch(`${apiUrl}/reports/dry-wood-cover/excel?${q}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Dry_Wood_Cover_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
    }
  };

  const allRows = [];
  if (reportData) {
    reportData.groups.forEach((group, gIdx) => {
      allRows.push({ type: 'header', groupName: group.groupName, key: `header-${gIdx}` });
      group.items.forEach((item, iIdx) => {
        allRows.push({ type: 'item', data: item, key: `item-${gIdx}-${iIdx}` });
      });
      allRows.push({ 
        type: 'footer', 
        groupName: group.groupName, 
        sumAmount: group.sumAmount, 
        sumVolumn: group.sumVolumn, 
        sumNetWage: group.sumNetWage,
        key: `footer-${gIdx}` 
      });
      allRows.push({ type: 'spacer', key: `spacer-${gIdx}` });
    });

    allRows.push({ 
      type: 'grand-total', 
      sumAmount: reportData.groups.reduce((sum, g) => sum + g.sumAmount, 0),
      sumVolumn: reportData.groups.reduce((sum, g) => sum + g.sumVolumn, 0),
      sumNetWage: reportData.groups.reduce((sum, g) => sum + g.sumNetWage, 0),
      key: 'grand-total'
    });
  }

  const totalPages = Math.ceil(allRows.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = allRows.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-fire-alt text-orange-500"></i> เงื่อนไขรายงานค่าแรงไม้แห้ง (ใบปะหน้า)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleBranchChange} className="w-full border rounded-lg p-2 text-sm outline-none bg-gray-50">
              <option value="">-- เลือกสาขา --</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold mb-1">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-orange-500"
              placeholderText="วว/ดด/ปปปป"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold mb-1">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy" locale={th}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-orange-500"
              placeholderText="วว/ดด/ปปปป"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">รหัสสโตร์</label>
            <input 
              type="text" 
              name="store_code" 
              value={filters.store_code} 
              onChange={handleFilterChange} 
              placeholder="เช่น 104/13 (ค่าเริ่ม: 104%)"
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">รูปแบบรายงาน</label>
            <select 
              name="report_format" 
              value={filters.report_format} 
              onChange={handleFilterChange} 
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-orange-500 font-semibold text-orange-700 bg-orange-50"
            >
              <option value="1">แบบที่ 1 (จัดกลุ่มตามเกรดไม้)</option>
              <option value="2">แบบที่ 2 (แยกตามพนักงาน)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
          <button onClick={handleSearch} disabled={isLoading} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-semibold shadow">
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i>ดึงรายงาน</>}
          </button>
          
          {reportData && (
            <div className="flex gap-2">
              <button onClick={() => handleExportPDF(true)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
                <i className="fas fa-search-plus"></i> ตัวอย่าง PDF
              </button>
              <button onClick={() => handleExportPDF(false)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
                <i className="fas fa-file-excel"></i> ส่งออก Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {reportData && (
        <div className="bg-white p-10 rounded-lg shadow-lg border border-gray-200 overflow-x-auto print:shadow-none print:border-none print:p-0 min-h-[1050px] relative flex flex-col justify-between">
          
          <div>
            <div className="text-center mb-8">
              <h1 className="text-xl font-bold">บริษัท วู้ดเวิร์ค จำกัด ({filters.branch_name})</h1>
              <h2 className="text-lg font-semibold mt-1">รายงานค่าแรงไม้แห้ง ใบปะหน้า</h2>
              <p className="text-sm mt-1">ตั้งแต่วันที่ {new Date(reportData.header.start_date).toLocaleDateString('th-TH')} ถึง {new Date(reportData.header.end_date).toLocaleDateString('th-TH')}</p>
              <p className="text-sm mt-1 text-gray-500">รหัสสโตร์: <span className="font-semibold text-orange-600">{reportData.header.store_code}</span></p>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-gray-800 bg-orange-50">
                  <th className="py-2 text-left w-1/4 pl-2">รหัสสินค้า</th>
                  <th className="py-2 text-right w-1/4">จำนวนท่อน</th>
                  <th className="py-2 text-right w-1/4">ปริมาตร(ลบฟ)</th>
                  <th className="py-2 text-right w-1/4 pr-2">ค่าแรง</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row) => {
                  if (row.type === 'header') {
                    return (
                      <tr key={row.key}>
                        <td colSpan="4" className="py-2 font-bold text-gray-800 pl-2">{row.groupName}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'item') {
                    return (
                      <tr key={row.key} className="hover:bg-orange-50/50">
                        <td className="py-1 pl-6">{row.data.wood_code}</td>
                        <td className="py-1 text-right">{Number(row.data.amount).toLocaleString()}</td>
                        <td className="py-1 text-right">{Number(row.data.volumn).toFixed(4)}</td>
                        <td className="py-1 text-right pr-2">{Number(row.data.net_wage).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'footer') {
                    return (
                      <tr key={row.key} className="border-t border-dotted border-gray-400 font-semibold text-gray-700">
                        <td className="py-2 pl-2">รวม {row.groupName}</td>
                        <td className="py-2 text-right">{row.sumAmount.toLocaleString()}</td>
                        <td className="py-2 text-right">{row.sumVolumn.toFixed(4)}</td>
                        <td className="py-2 text-right pr-2 text-orange-700">{row.sumNetWage.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'spacer') {
                    return <tr key={row.key}><td colSpan="4" className="py-2"></td></tr>;
                  }
                  if (row.type === 'grand-total') {
                    return (
                      <tr key={row.key} className="border-y-2 border-gray-800 font-bold text-base bg-orange-100">
                        <td className="py-3 pl-2">รวมทั้งหมด</td>
                        <td className="py-3 text-right">{row.sumAmount.toLocaleString()}</td>
                        <td className="py-3 text-right">{row.sumVolumn.toFixed(4)}</td>
                        <td className="py-3 text-right pr-2 text-orange-800">{row.sumNetWage.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>

          {currentPage === totalPages && (
            <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm print:mt-16 pb-8">
              <div>
                <p>....................................................................</p>
                <p className="mt-2">ผู้รายงาน</p>
              </div>
              <div>
                <p>....................................................................</p>
                <p className="mt-2">ผู้จัดการโรงงาน</p>
              </div>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 border-t border-gray-200 mt-6 print:hidden">
              <div className="flex flex-wrap justify-between items-center w-full gap-4">
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 text-sm border hover:bg-gray-50 disabled:bg-gray-100">« หน้าแรก</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm border hover:bg-gray-50 disabled:bg-gray-100">‹ ก่อนหน้า</button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">หน้า</span>
                  <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border py-1 px-2 text-sm text-orange-700 font-bold">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (<option key={page} value={page}>{page}</option>))}
                  </select>
                  <span className="text-sm">จาก {totalPages}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm border hover:bg-gray-50 disabled:bg-gray-100">ถัดไป ›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 text-sm border hover:bg-gray-50 disabled:bg-gray-100">หน้าสุดท้าย »</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}