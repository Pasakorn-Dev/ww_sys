import React, { useState } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function WoodTypeReport() {
  const [filters, setFilters] = useState({
    start_date: '2026-08-05', end_date: '2026-08-05',
    branch: 'สาขากันตัง', condition: 'เกรดไม้: AB ป/อ:สด : ปกติ'
  });
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleDateChange = (date, name) => { if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') }); };
  const handleSearch = async () => {
    setIsLoading(true);
    try {
      const q = new URLSearchParams({ start_date: filters.start_date, end_date: filters.end_date }).toString();
      const res = await apiFetch(`/reports/wood-type-ab?${q}`);
      if (res?.success) setReportData(res.data);
    } catch (error) { Swal.fire('Error', 'ดึงข้อมูลล้มเหลว', 'error'); } 
    finally { setIsLoading(false); }
  };

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50">
      
      {/* โซนค้นหา */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6 print:hidden">
        <h2 className="text-xl font-bold text-gray-800 mb-4">ค้นหารายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1">วันที่เริ่มต้น</label>
            <DatePicker selected={filters.start_date ? parseISO(filters.start_date) : null} onChange={(date) => handleDateChange(date, 'start_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border rounded-md p-2 text-sm" />
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1">วันที่สิ้นสุด</label>
            <DatePicker selected={filters.end_date ? parseISO(filters.end_date) : null} onChange={(date) => handleDateChange(date, 'end_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border rounded-md p-2 text-sm" />
          </div>
          <div className="flex items-end gap-2">
            <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 text-white px-6 py-2 rounded-md text-sm font-semibold hover:bg-blue-700">
              {isLoading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
            </button>
          </div>
        </div>
      </div>

      {/* โซนแสดงรายงาน */}
      {reportData.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto pb-6">
          
          <div className="text-center mb-6 pt-6">
            <h1 className="text-lg font-bold">บริษัท วู้ดเวิร์ค จำกัด ({filters.branch})</h1>
            <h2 className="text-md font-semibold">รายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
            <p className="text-sm">ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึงวันที่ {format(parseISO(filters.end_date), 'dd/MM/yyyy')}</p>
            <p className="text-sm text-gray-600">{filters.condition}</p>
          </div>

          <table className="w-full text-xs border-collapse border border-gray-400 whitespace-nowrap">
            <thead>
              {/* ปรับหัวตารางให้เป็นแถวเดียวและใช้ชื่อคอลัมน์ตามรูปภาพต้นฉบับ */}
              <tr className="bg-[#9fc5e8] text-black font-semibold">
                <th className="border border-gray-400 p-2 text-center" colSpan="2">ขนาดไม้</th>
                <th className="border border-gray-400 p-2 text-right">AB</th>
                <th className="border border-gray-400 p-2 text-right">%กว้าง</th>
                <th className="border border-gray-400 p-2 text-right">%ยาว</th>
                <th className="border border-gray-400 p-2 text-right">ราคา</th>
                <th className="border border-gray-400 p-2 text-right">จำนวนเงิน</th>
                <th className="border border-gray-400 p-2 text-right">ABพิเศษ</th>
                <th className="border border-gray-400 p-2 text-right">%กว้าง</th>
                <th className="border border-gray-400 p-2 text-right">%ยาว</th>
                <th className="border border-gray-400 p-2 text-right">ราคา</th>
                <th className="border border-gray-400 p-2 text-right">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              
              {/* ลูป 1: ชุดเลื่อย */}
              {reportData.map((sawGroup, sawIdx) => (
                <React.Fragment key={sawIdx}>
                  
                  {/* แถบคาด ชุดเลื่อย */}
                  <tr className="bg-white font-bold border-t-2 border-black">
                    <td className="border border-gray-400 p-1 pl-2 text-left" colSpan="2">{sawGroup.saw_name}</td>
                    <td className="border border-gray-400 p-1 pl-2 text-left" colSpan="10">ชุดที่ {sawIdx + 1}</td>
                  </tr>

                  {/* ลูป 2: ความหนา */}
                  {sawGroup.thicks.map((thickGroup, thickIdx) => (
                    <React.Fragment key={`${sawIdx}-${thickIdx}`}>
                      <tr className="bg-[#e6f2ff] font-bold">
                        <td className="border border-gray-400 p-1 pl-2">ความหนา</td>
                        <td className="border border-gray-400 p-1 pl-2" colSpan="11">{thickGroup.thick}</td>
                      </tr>

                      {/* ลูป 3: ความยาว */}
                      {thickGroup.lengths.map((lenGroup, lenIdx) => (
                        <React.Fragment key={`${sawIdx}-${thickIdx}-${lenIdx}`}>
                          
                          {/* รายละเอียดรหัสไม้ */}
                          {lenGroup.items.map((item, itemIdx) => (
                            <tr key={itemIdx} className="bg-white hover:bg-gray-50">
                              <td className="border border-gray-400 p-1 pl-2 font-medium" colSpan="2">
                                <span className="text-red-500">{item.wood_code.substring(0, 2)}</span>
                                {item.wood_code.substring(2)}
                              </td>
                              
                              <td className="border border-gray-400 p-1 text-right">{item.ab_volumn.toFixed(4)}</td>
                              <td className="border border-gray-400 p-1 text-right">{item.ab_pct_qty.toFixed(2)}%</td>
                              <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                              <td className="border border-gray-400 p-1 text-right">{item.ab_price.toFixed(2)}</td>
                              <td className="border border-gray-400 p-1 text-right">{item.ab_amt.toFixed(2)}</td>

                              <td className="border border-gray-400 p-1 text-right">{item.spc_volumn.toFixed(4)}</td>
                              <td className="border border-gray-400 p-1 text-right">{item.spc_pct_qty.toFixed(2)}%</td>
                              <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                              <td className="border border-gray-400 p-1 text-right">{item.spc_price.toFixed(2)}</td>
                              <td className="border border-gray-400 p-1 text-right">{item.spc_amt.toFixed(2)}</td>
                            </tr>
                          ))}

                          {/* สรุป "รวมยาว" */}
                          <tr className="bg-[#fff2cc] font-bold">
                            <td className="border border-gray-400 p-1 pl-2" colSpan="2">รวมยาว {lenGroup.length}</td>
                            
                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.ab_volumn.toFixed(4)}</td>
                            <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.ab_pct_amt.toFixed(2)}%</td>
                            <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.ab_amt.toFixed(2)}</td>

                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.spc_volumn.toFixed(4)}</td>
                            <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.spc_pct_amt.toFixed(2)}%</td>
                            <td className="border border-gray-400 p-1 text-right bg-[#e6e6e6]"></td>
                            <td className="border border-gray-400 p-1 text-right">{lenGroup.subTotal.spc_amt.toFixed(2)}</td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}