import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale'; 
import { format, parseISO } from 'date-fns';

export default function ProductionCoverReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: '',
    report_format: '1' // 💡 เพิ่มบรรทัดนี้: ค่าเริ่มต้นเป็นรูปแบบที่ 1
  });

  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { options } = useMasterOptions(filters.branch_id);
  const printRef = useRef();

  // สถานะสำหรับการจัดการหน้า
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 35; // 💡 ปรับให้เป็น 35 บรรทัดต่อหน้า (ความสูงเทียบเท่า A4 1 แผ่น)

  useEffect(() => {
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
    fetchBranches();
  }, []);

  const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const handleDateChange = (date, name) => {
    if (date) {
      setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
    }
  };

  const handleSearch = async () => {
    if (!filters.branch_id || !filters.start_date || !filters.end_date) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุสาขาและช่วงวันที่', 'warning');
    }
    
    setIsLoading(true);
    try {
      // 💡 เลือก Endpoint ตามรูปแบบที่ผู้ใช้เลือก
      const endpoint = filters.report_format === '2' 
        ? '/reports/production-cover-format2' 
        : '/reports/production-cover';

      // 💡 คัดเฉพาะพารามิเตอร์ที่ Backend ต้องการส่งไป
      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        start_date: filters.start_date,
        end_date: filters.end_date,
        store_code: filters.store_code
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

  const handleExportExcel = () => {
    if (!reportData) return;
    const wsData = [];
    
    wsData.push([reportData.header.branch_name]);
    wsData.push(['รายงานไม้ผลิต ใบปะหน้า']);
    wsData.push([`ตั้งแต่วันที่ ${new Date(reportData.header.start_date).toLocaleDateString('th-TH')} ถึง ${new Date(reportData.header.end_date).toLocaleDateString('th-TH')}`]);
    wsData.push([`รหัสสโตร์ : ${reportData.header.store_code || 'รวมทุกสโตร์'}`]);
    wsData.push([]); 

    wsData.push(['ขนาดไม้', 'จำนวนท่อน', 'ปริมาตร(ลบฟ)']);

    let grandTotalAmount = 0;
    let grandTotalVolumn = 0;

    reportData.groups.forEach(group => {
      wsData.push([group.groupName]); 
      
      group.items.forEach(item => {
        wsData.push([
          item.wood_code,
          Number(item.total_amount),
          Number(item.total_volumn)
        ]);
      });

      wsData.push([
        `รวม ${group.groupName}`,
        Number(group.sumAmount),
        Number(group.sumVolumn)
      ]);
      wsData.push([]); 
      
      grandTotalAmount += group.sumAmount;
      grandTotalVolumn += group.sumVolumn;
    });

    wsData.push(['รวมทั้งหมด', grandTotalAmount, grandTotalVolumn]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `ใบปะหน้าไม้ผลิต_${filters.start_date}.xlsx`);
  };

  const generatePDFDoc = async () => {
    if (!reportData) return null;
    
    Swal.fire({
      title: 'กำลังเตรียมไฟล์ PDF...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');

      const normalFontUrl = '/fonts/Sarabun-Medium.ttf';
      const boldFontUrl = '/fonts/Sarabun-Bold.ttf';

      const fetchFont = async (url) => {
        const res = await fetch(url);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(blob);
        });
      };

      const [normalFont, boldFont] = await Promise.all([fetchFont(normalFontUrl), fetchFont(boldFontUrl)]);

      pdf.addFileToVFS('THSarabunNew.ttf', normalFont);
      pdf.addFont('THSarabunNew.ttf', 'THSarabun', 'normal');
      pdf.addFileToVFS('THSarabunNew-Bold.ttf', boldFont);
      pdf.addFont('THSarabunNew-Bold.ttf', 'THSarabun', 'bold');

      pdf.setFont('THSarabun', 'bold');
      pdf.setFontSize(18);
      pdf.text(reportData.header.branch_name, 105, 15, { align: 'center' });

      pdf.setFontSize(16);
      pdf.text('รายงานไม้ผลิต ใบปะหน้า', 105, 23, { align: 'center' });

      pdf.setFont('THSarabun', 'normal');
      pdf.setFontSize(14);
      pdf.text(`ตั้งแต่วันที่ ${new Date(reportData.header.start_date).toLocaleDateString('th-TH')} ถึง ${new Date(reportData.header.end_date).toLocaleDateString('th-TH')}`, 105, 30, { align: 'center' });
      pdf.text(`รหัสสโตร์ : ${reportData.header.store_code || 'รวมทุกสโตร์'}`, 105, 37, { align: 'center' });

      const tableBody = [];
      let grandTotalAmount = 0;
      let grandTotalVolumn = 0;

      reportData.groups.forEach(group => {
        tableBody.push([{ content: group.groupName, colSpan: 3, styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]);

        group.items.forEach(item => {
          tableBody.push([
            item.wood_code,
            { content: Number(item.total_amount).toLocaleString(), styles: { halign: 'right' } },
            { content: Number(item.total_volumn).toFixed(4), styles: { halign: 'right' } }
          ]);
        });

        tableBody.push([
          { content: `รวม ${group.groupName}`, styles: { fontStyle: 'bold' } },
          { content: Number(group.sumAmount).toLocaleString(), styles: { halign: 'right', fontStyle: 'bold' } },
          { content: Number(group.sumVolumn).toFixed(4), styles: { halign: 'right', fontStyle: 'bold' } }
        ]);
        
        grandTotalAmount += group.sumAmount;
        grandTotalVolumn += group.sumVolumn;
      });

      tableBody.push([
        { content: 'รวมทั้งหมด', styles: { fontStyle: 'bold', fontSize: 16 } },
        { content: grandTotalAmount.toLocaleString(), styles: { halign: 'right', fontStyle: 'bold', fontSize: 16 } },
        { content: grandTotalVolumn.toFixed(4), styles: { halign: 'right', fontStyle: 'bold', fontSize: 16 } }
      ]);

      autoTable(pdf, {
        startY: 45, 
        head: [['ขนาดไม้', 'จำนวนท่อน', 'ปริมาตร(ลบฟ)']],
        body: tableBody,
        theme: 'grid',
        styles: { font: 'THSarabun', fontSize: 14, cellPadding: 2, lineColor: [200, 200, 200] },
        headStyles: { fontStyle: 'bold', fontSize: 14, fillColor: [50, 50, 50], textColor: [255, 255, 255], halign: 'center' },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'right' }, 2: { halign: 'right' } },
        showHead: 'everyPage',
        margin: { top: 20, bottom: 20 }
      });

      let finalY = pdf.lastAutoTable.finalY + 20;

      if (finalY > 260) {
        pdf.addPage();
        finalY = 30;
      }

      pdf.setFont('THSarabun', 'normal');
      pdf.setFontSize(14);
      pdf.text('....................................................................', 55, finalY, { align: 'center' });
      pdf.text('ผู้รายงาน', 55, finalY + 7, { align: 'center' });

      pdf.text('....................................................................', 155, finalY, { align: 'center' });
      pdf.text('ผู้จัดการโรงงาน', 155, finalY + 7, { align: 'center' });

      Swal.close();
      return pdf;
      
    } catch (error) {
      console.error('PDF Generate Error:', error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้ โปรดตรวจสอบว่ามีไฟล์ฟอนต์ในระบบ', 'error');
      return null;
    }
  };

  const handlePreviewPDF = async () => {
    const pdf = await generatePDFDoc();
    if (pdf) {
      const pdfBlobUrl = pdf.output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    }
  };

  const handleDownloadPDF = async () => {
    const pdf = await generatePDFDoc();
    if (pdf) {
      pdf.save(`ใบปะหน้าไม้ผลิต_${filters.start_date}.pdf`);
    }
  };

  // 💡 แปลงข้อมูลทั้งหมดให้อยู่ในรูปแบบ "แถว (Rows)" เพื่อใช้นับจำนวนบรรทัดให้แม่นยำเทียบเท่า A4
  const allRows = [];
  if (reportData) {
    reportData.groups.forEach((group, gIdx) => {
      // 1. หัวตารางกลุ่ม
      allRows.push({ type: 'header', groupName: group.groupName, key: `header-${gIdx}` });
      
      // 2. ข้อมูลแต่ละรายการ
      group.items.forEach((item, iIdx) => {
        allRows.push({ type: 'item', data: item, key: `item-${gIdx}-${iIdx}` });
      });
      
      // 3. สรุปรวมกลุ่ม
      allRows.push({ 
        type: 'footer', 
        groupName: group.groupName, 
        sumAmount: group.sumAmount, 
        sumVolumn: group.sumVolumn, 
        key: `footer-${gIdx}` 
      });
      
      // 4. ช่องว่างคั่นบรรทัด
      allRows.push({ type: 'spacer', key: `spacer-${gIdx}` });
    });

    // 5. บรรทัดยอดรวมทั้งหมด (Grand Total)
    allRows.push({ 
      type: 'grand-total', 
      sumAmount: reportData.groups.reduce((sum, g) => sum + g.sumAmount, 0),
      sumVolumn: reportData.groups.reduce((sum, g) => sum + g.sumVolumn, 0),
      key: 'grand-total'
    });
  }

  // คำนวณหาหน้าปัจจุบันจากจำนวน "บรรทัด"
  const totalPages = Math.ceil(allRows.length / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRows = allRows.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-file-alt text-blue-600"></i> เงื่อนไขรายงานใบปะหน้าไม้ผลิต
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm outline-none bg-gray-50">
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
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-blue-500"
              placeholderText="วว/ดด/ปปปป"
            />
          </div>
          <div className="flex flex-col">
            <label className="block text-xs font-semibold mb-1">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-lg p-2 text-sm outline-none focus:border-blue-500"
              placeholderText="วว/ดด/ปปปป"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">รหัสสโตร์ (Store Code)</label>
            <select name="store_code" value={filters.store_code} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm outline-none">
              <option value="">-- รวมทุกสโตร์ --</option>
              {options?.sawWoodTypes?.map(item => <option key={item.id} value={item.code}>{item.code} - {item.name}</option>)}
            </select>
          </div>
          {/* 💡 เพิ่มช่องเลือกรูปแบบรายงาน */}
          <div>
            <label className="block text-xs font-semibold mb-1">รูปแบบรายงาน</label>
            <select name="report_format" value={filters.report_format} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm outline-none focus:border-blue-500 font-semibold text-blue-700 bg-blue-50">
              <option value="1">แบบที่ 1 (ปกติ)</option>
              <option value="2">แบบที่ 2 (แยกชุดเลื่อย)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-between items-center gap-4">
          <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow">
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i>ดึงรายงาน</>}
          </button>
          
          {reportData && (
            <div className="flex gap-2">
              <button onClick={handlePreviewPDF} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
                <i className="fas fa-search-plus"></i> ตัวอย่าง PDF
              </button>
              <button onClick={handleDownloadPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
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
        <div className="bg-white p-10 rounded-lg shadow-lg border border-gray-200 overflow-x-auto print:shadow-none print:border-none print:p-0 min-h-[1050px] relative flex flex-col justify-between" ref={printRef}>
          
          <div>
            <div className="text-center mb-8">
              <h1 className="text-xl font-bold">{reportData.header.branch_name}</h1>
              <h2 className="text-lg font-semibold mt-1">รายงานไม้ผลิต ใบปะหน้า</h2>
              <p className="text-sm mt-1">ตั้งแต่วันที่ {new Date(reportData.header.start_date).toLocaleDateString('th-TH')} ถึง {new Date(reportData.header.end_date).toLocaleDateString('th-TH')}</p>
              <p className="text-sm mt-1">รหัสสโตร์ : {reportData.header.store_code || 'รวมทุกสโตร์'}</p>
            </div>

            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-y-2 border-gray-800">
                  <th className="py-2 text-left w-1/3">ขนาดไม้</th>
                  <th className="py-2 text-right w-1/3">จำนวนท่อน</th>
                  <th className="py-2 text-right w-1/3">ปริมาตร(ลบฟ)</th>
                </tr>
              </thead>
              <tbody>
                {currentRows.map((row) => {
                  if (row.type === 'header') {
                    return (
                      <tr key={row.key}>
                        <td colSpan="3" className="py-2 font-bold text-gray-800">{row.groupName}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'item') {
                    return (
                      <tr key={row.key}>
                        <td className="py-1 pl-4">{row.data.wood_code}</td>
                        <td className="py-1 text-right">{row.data.total_amount.toLocaleString()}</td>
                        <td className="py-1 text-right">{Number(row.data.total_volumn).toFixed(4)}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'footer') {
                    return (
                      <tr key={row.key} className="border-t border-dotted border-gray-400 font-semibold text-gray-700">
                        <td className="py-2">รวม {row.groupName}</td>
                        <td className="py-2 text-right">{row.sumAmount.toLocaleString()}</td>
                        <td className="py-2 text-right">{row.sumVolumn.toFixed(4)}</td>
                      </tr>
                    );
                  }
                  if (row.type === 'spacer') {
                    return <tr key={row.key}><td colSpan="3" className="py-2"></td></tr>;
                  }
                  if (row.type === 'grand-total') {
                    return (
                      <tr key={row.key} className="border-y-2 border-gray-800 font-bold text-base bg-gray-50">
                        <td className="py-3 pl-2">รวมทั้งหมด</td>
                        <td className="py-3 text-right">{row.sumAmount.toLocaleString()}</td>
                        <td className="py-3 text-right pr-2">{row.sumVolumn.toFixed(4)}</td>
                      </tr>
                    );
                  }
                  return null;
                })}
              </tbody>
            </table>
          </div>

          {/* 💡 ลายเซ็นต์จะโผล่เฉพาะหน้าสุดท้ายเท่านั้น */}
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

          {/* ปุ่มควบคุมหน้าเว็บ (ซ่อนเมื่อ Print) */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between py-3 border-t border-gray-200 mt-6 print:hidden">
              <div className="flex flex-wrap justify-between items-center w-full gap-4">
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>« หน้าแรก</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'}`}>‹ ก่อนหน้า</button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">หน้า</span>
                  <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border border-gray-300 rounded-md py-1 px-2 text-sm outline-none focus:border-blue-500 font-semibold text-blue-700">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <option key={page} value={page}>{page}</option>
                    ))}
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