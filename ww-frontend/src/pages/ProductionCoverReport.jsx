import React, { useState, useRef, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// 💡 1. นำเข้าไลบรารีปฏิทินและภาษาไทย
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale'; 
import { format, parseISO } from 'date-fns';

export default function ProductionCoverReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    store_code: ''
  });

  const [branches, setBranches] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { options } = useMasterOptions(filters.branch_id);
  const printRef = useRef();

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

  // 💡 2. เพิ่มฟังก์ชันจัดการเมื่อเลือกวันที่จากปฏิทิน
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
      const queryParams = new URLSearchParams(filters).toString();
      const res = await apiFetch(`/reports/production-cover?${queryParams}`);
      if (res?.success) {
        if (res.data.groups.length === 0) {
          Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
          setReportData(null);
        } else {
          setReportData(res.data);
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

  // ─── 1. ฟังก์ชันตัวช่วยสำหรับสร้าง PDF (เรียกใช้ซ้ำได้) ───
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

  // ─── 2. ปุ่มดูตัวอย่าง (เปิดแท็บใหม่) ───
  const handlePreviewPDF = async () => {
    const pdf = await generatePDFDoc();
    if (pdf) {
      // สร้าง URL จากไฟล์ PDF และเปิดในแท็บใหม่
      const pdfBlobUrl = pdf.output('bloburl');
      window.open(pdfBlobUrl, '_blank');
    }
  };

  // ─── 3. ปุ่มดาวน์โหลดทันที ───
  const handleDownloadPDF = async () => {
    const pdf = await generatePDFDoc();
    if (pdf) {
      pdf.save(`ใบปะหน้าไม้ผลิต_${filters.start_date}.pdf`);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen">
      {/* ส่วนค้นหา */}
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
          {/* 💡 3. เปลี่ยนช่องวันที่เริ่มต้นเป็น DatePicker */}
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
          
          {/* 💡 3. เปลี่ยนช่องวันที่สิ้นสุดเป็น DatePicker */}
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
        </div>

        {/* กลุ่มปุ่มคำสั่ง */}
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

      {/* ส่วนแสดงรายงานบนหน้าเว็บ (HTML Preview) */}
      {reportData && (
        <div className="bg-white p-10 rounded-lg shadow-lg border border-gray-200 overflow-x-auto" ref={printRef}>
          
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
              {reportData.groups.map((group, gIdx) => (
                <React.Fragment key={gIdx}>
                  <tr>
                    <td colSpan="3" className="py-2 font-bold text-gray-800">{group.groupName}</td>
                  </tr>
                  
                  {group.items.map((item, iIdx) => (
                    <tr key={iIdx}>
                      <td className="py-1 pl-4">{item.wood_code}</td>
                      <td className="py-1 text-right">{item.total_amount.toLocaleString()}</td>
                      <td className="py-1 text-right">{Number(item.total_volumn).toFixed(4)}</td>
                    </tr>
                  ))}
                  
                  <tr className="border-t border-dotted border-gray-400 font-semibold text-gray-700">
                    <td className="py-2">รวม {group.groupName}</td>
                    <td className="py-2 text-right">{group.sumAmount.toLocaleString()}</td>
                    <td className="py-2 text-right">{group.sumVolumn.toFixed(4)}</td>
                  </tr>
                  <tr><td colSpan="3" className="py-2"></td></tr> 
                </React.Fragment>
              ))}

              <tr className="border-y-2 border-gray-800 font-bold text-base">
                <td className="py-3">รวมทั้งหมด</td>
                <td className="py-3 text-right">
                  {reportData.groups.reduce((sum, g) => sum + g.sumAmount, 0).toLocaleString()}
                </td>
                <td className="py-3 text-right">
                  {reportData.groups.reduce((sum, g) => sum + g.sumVolumn, 0).toFixed(4)}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-16 grid grid-cols-2 gap-8 text-center text-sm">
            <div>
              <p>....................................................................</p>
              <p className="mt-2">ผู้รายงาน</p>
            </div>
            <div>
              <p>....................................................................</p>
              <p className="mt-2">ผู้จัดการโรงงาน</p>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}