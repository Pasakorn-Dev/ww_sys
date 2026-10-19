import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import useMasterOptions from '../hooks/useMasterOptions';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';
import Select from 'react-select'; 

export default function CheckSawWood() {
  const [branches, setBranches] = useState([]);
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // 💡 เพิ่ม State สำหรับการแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; // โชว์หน้าละ 50 รายการ เพื่อความลื่นไหล

  // State สำหรับ Filters
  const [filters, setFilters] = useState({
    branch_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    transaction_type_id: '',
    log_wood_type_id: '',
    log_wood_eval_size_id: '',
    ws_customer_id: '',
    saw_time_id: '',
    saw_wood_types_code: ''
  });

  // State สำหรับจับข้อความค้นหาในช่องเจ้าหนี้ (รถไม้)
  const [truckSearchText, setTruckSearchText] = useState('');

  const { options, isLoadingOptions } = useMasterOptions(filters.branch_id);

  // เช็คสถานะโหมดมืด ณ ตอนที่ Render Component
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    fetchBranches();
  }, []);

  const fetchBranches = async () => {
    try {
      const currentPath = window.location.pathname;
      const res = await apiFetch(`/branches/allowed?menu=${currentPath}`);
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

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date, name) => {
    if (date) {
      setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
    }
  };

  // ฟังก์ชันดึง Theme สีสำหรับ SweetAlert2
  const getSwalTheme = () => {
    const darkTheme = document.documentElement.classList.contains('dark');
    return {
      background: darkTheme ? '#1f2937' : '#ffffff',
      color: darkTheme ? '#f3f4f6' : '#111827',
    };
  };

  const handleSearch = async () => {
    const themeParams = getSwalTheme();
    if (!filters.branch_id || !filters.start_date || !filters.end_date) {
      return Swal.fire({ ...themeParams, title: 'แจ้งเตือน', text: 'กรุณาเลือกสาขาและช่วงวันที่ให้ครบถ้วน', icon: 'warning', confirmButtonColor: '#3b82f6' });
    }
    
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await apiFetch(`/transactions/saw-woods?${queryParams}`);
      if (res?.success) {
        setData(res.data);
        setCurrentPage(1); // 💡 รีเซ็ตกลับไปหน้า 1 เสมอเมื่อค้นหาใหม่
        if (res.data.length === 0) {
           Swal.fire({ ...themeParams, title: 'แจ้งเตือน', text: 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', icon: 'info', confirmButtonColor: '#3b82f6' });
        }
      } else {
        Swal.fire({ ...themeParams, title: 'ข้อผิดพลาด', text: res?.message || 'ไม่สามารถดึงข้อมูลได้', icon: 'error', confirmButtonColor: '#3b82f6' });
      }
    } catch (error) {
      Swal.fire({ ...themeParams, title: 'ข้อผิดพลาด', text: 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', icon: 'error', confirmButtonColor: '#3b82f6' });
    } finally {
      setIsLoading(false);
    }
  };

  const viewDetails = async (barcode_id) => {
    const themeParams = getSwalTheme();
    const isDarkTheme = document.documentElement.classList.contains('dark');
    /*
    Swal.fire({
      ...themeParams,
      title: 'กำลังโหลดข้อมูล...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    */
    try {
      const queryParams = new URLSearchParams({
        branch_id: filters.branch_id,
        barcode_id: barcode_id
      }).toString();
      
      const res = await apiFetch(`/transactions/saw-woods?${queryParams}`);
      
      if (res?.success) {
        const items = res.data;
        let htmlTable = `
          <div class="overflow-x-auto mt-4 max-h-[60vh] custom-scrollbar">
            <table class="w-full text-sm text-left border ${isDarkTheme ? 'border-gray-700' : 'border-gray-200'}">
              <thead class="${isDarkTheme ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} sticky top-0">
                <tr>
                  <th class="p-2 border ${isDarkTheme ? 'border-gray-600' : ''}">รหัสไม้</th>
                  <th class="p-2 border ${isDarkTheme ? 'border-gray-600' : ''}">เกรด</th>
                  <th class="p-2 border ${isDarkTheme ? 'border-gray-600' : ''}">จำนวน</th>
                  <th class="p-2 border ${isDarkTheme ? 'border-gray-600' : ''}">ปริมาตร</th>
                  <th class="p-2 border ${isDarkTheme ? 'border-gray-600' : ''}">ราคาสุทธิ</th>
                </tr>
              </thead>
              <tbody class="${isDarkTheme ? 'text-gray-200' : 'text-gray-800'}">
                ${items.map(item => `
                  <tr class="border-b ${isDarkTheme ? 'border-gray-700 hover:bg-gray-600/50' : 'hover:bg-gray-50'}">
                    <td class="p-2 border ${isDarkTheme ? 'border-gray-700' : ''}">${item.wood_code || '-'}</td>
                    <td class="p-2 border ${isDarkTheme ? 'border-gray-700' : ''}">${item.grade || '-'}</td>
                    <td class="p-2 border ${isDarkTheme ? 'border-gray-700' : ''} text-right">${item.amount}</td>
                    <td class="p-2 border ${isDarkTheme ? 'border-gray-700' : ''} text-right">${item.volumn}</td>
                    <td class="p-2 border ${isDarkTheme ? 'border-gray-700' : ''} text-right ${isDarkTheme ? 'text-blue-400' : 'text-blue-600'} font-semibold">${Number(item.net_price).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;

        Swal.fire({
          ...themeParams,
          title: `<span class="text-lg">รายละเอียด Barcode: <span class="${isDarkTheme ? 'text-blue-400' : 'text-blue-600'}">${barcode_id}</span></span>`,
          html: htmlTable,
          width: '800px',
          showCloseButton: true,
          confirmButtonText: 'ปิด',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (error) {
      Swal.fire({ ...themeParams, title: 'ข้อผิดพลาด', text: 'ดึงรายละเอียดล้มเหลว', icon: 'error', confirmButtonColor: '#3b82f6' });
    }
  };

  const allTruckOptions = options.truckCompanies ? options.truckCompanies.map(item => ({
    value: item.id,
    label: `${item.code} - ${item.name}`
  })) : [];
  
  const displayTruckOptions = allTruckOptions
    .filter(opt => opt.label.toLowerCase().includes(truckSearchText.toLowerCase()))
    .slice(0, 50);

  const selectedTruck = allTruckOptions.find(opt => String(opt.value) === String(filters.ws_customer_id)) || null;

  // 💡 คำนวณข้อมูลที่จะตัดไปแสดงในตาราง (ตามหน้าที่เลือก)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = data.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.length / itemsPerPage);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto flex flex-col min-h-[80vh] font-sans">
      
      {/* ส่วนค้นหา */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <i className="fas fa-search text-blue-600 dark:text-blue-400"></i> ตรวจสอบข้อมูลไม้เลื่อย
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300">
              <option value="">-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.start_date ? parseISO(filters.start_date) : null}
              onChange={(date) => handleDateChange(date, 'start_date')}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 text-sm outline-none focus:border-blue-500 transition-colors duration-300"
              placeholderText="วว/ดด/ปปปป"
              wrapperClassName="w-full"
            />
          </div>
          
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.end_date ? parseISO(filters.end_date) : null}
              onChange={(date) => handleDateChange(date, 'end_date')}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 text-sm outline-none focus:border-blue-500 transition-colors duration-300"
              placeholderText="วว/ดด/ปปปป"
              wrapperClassName="w-full"
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">รหัสประเภทไม้เลื่อย (Code)</label>
            <input type="text" name="saw_wood_types_code" value={filters.saw_wood_types_code} onChange={handleFilterChange} placeholder="ระบุโค้ด (ถ้ามี)" className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg p-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 transition-colors duration-300" />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ประเภทการชั่ง</label>
            <select name="transaction_type_id" value={filters.transaction_type_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm outline-none disabled:opacity-60 transition-colors duration-300">
              <option value="">-- ทั้งหมด --</option>
              {options.transactionTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">ประเภทไม้ท่อน</label>
            <select name="log_wood_type_id" value={filters.log_wood_type_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm outline-none disabled:opacity-60 transition-colors duration-300">
              <option value="">-- ทั้งหมด --</option>
              {options.logWoodTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">กลุ่มไม้ท่อน</label>
            <select name="log_wood_eval_size_id" value={filters.log_wood_eval_size_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm outline-none disabled:opacity-60 transition-colors duration-300">
              <option value="">-- ทั้งหมด --</option>
              {options.logWoodEvalSizes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col z-20">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">เจ้าหนี้ (รถไม้)</label>
            <Select
              options={displayTruckOptions}
              value={selectedTruck}
              onInputChange={(inputValue, { action }) => {
                if (action === 'input-change') setTruckSearchText(inputValue);
              }}
              onMenuClose={() => setTruckSearchText('')} 
              onChange={(selected) => handleFilterChange({
                target: { name: 'ws_customer_id', value: selected ? selected.value : '' }
              })}
              filterOption={null} 
              isDisabled={isLoadingOptions}
              isClearable
              isSearchable
              placeholder="-- ค้นหา / ทั้งหมด --"
              noOptionsMessage={() => "ไม่พบข้อมูล (หรือพิมพ์คำค้นหาเพิ่มเติม)"}
              menuPortalTarget={document.body}
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: '38px',
                  borderRadius: '0.5rem',
                  borderColor: isDark ? '#4b5563' : '#e5e7eb',
                  backgroundColor: isDark ? '#374151' : '#f9fafb',
                  color: isDark ? '#f3f4f6' : '#111827',
                  fontSize: '0.875rem',
                  boxShadow: 'none',
                  '&:hover': { borderColor: isDark ? '#6b7280' : '#d1d5db' }
                }),
                singleValue: (base) => ({ ...base, color: isDark ? '#f3f4f6' : '#111827' }),
                input: (base) => ({ ...base, color: isDark ? '#f3f4f6' : '#111827' }),
                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                menu: (base) => ({ ...base, backgroundColor: isDark ? '#1f2937' : '#ffffff', fontSize: '0.875rem' }),
                option: (base, state) => ({
                  ...base,
                  backgroundColor: state.isFocused ? (isDark ? '#374151' : '#f3f4f6') : 'transparent',
                  color: isDark ? '#f3f4f6' : '#111827',
                  '&:active': { backgroundColor: isDark ? '#4b5563' : '#e5e7eb' }
                }),
              }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">กะการทำงาน (เวลา)</label>
            <select name="saw_time_id" value={filters.saw_time_id} onChange={handleFilterChange} disabled={isLoadingOptions} className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg p-2 text-sm outline-none disabled:opacity-60 transition-colors duration-300">
              <option value="">-- ทั้งหมด --</option>
              {options.sawTimes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow flex items-center gap-2">
            {isLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-search"></i>} ค้นหาข้อมูล
          </button>
        </div>
      </div>

      {/* ตารางแสดงผล */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex-1 overflow-hidden flex flex-col transition-colors duration-300">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 border-b dark:border-gray-600">วันที่ผลิต</th>
                <th className="px-4 py-3 border-b dark:border-gray-600">สาขา</th>
                <th className="px-4 py-3 border-b dark:border-gray-600">Barcode</th>
                <th className="px-4 py-3 border-b dark:border-gray-600">รหัสไม้</th>
                <th className="px-4 py-3 border-b dark:border-gray-600 text-center">เกรด</th>
                <th className="px-4 py-3 border-b dark:border-gray-600 text-right">จำนวน</th>
                <th className="px-4 py-3 border-b dark:border-gray-600 text-right">ปริมาตร</th>
                <th className="px-4 py-3 border-b dark:border-gray-600 text-right">ราคาสุทธิ</th>
                <th className="px-4 py-3 border-b dark:border-gray-600 text-center">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="text-gray-800 dark:text-gray-200">
              {data.length === 0 ? (
                <tr><td colSpan="9" className="text-center py-8 text-gray-500 dark:text-gray-400">ไม่พบข้อมูล</td></tr>
              ) : (
                // 💡 เปลี่ยนจาก data.map เป็น currentData.map 
                currentData.map((row, index) => (
                  <tr key={index} className="border-b dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">{new Date(row.produce_date).toLocaleDateString('th-TH')}</td>
                    <td className="px-4 py-3">{row.branch_code}</td>
                    <td className="px-4 py-3 font-mono text-xs">{row.barcode_id}</td>
                    <td className="px-4 py-3">{row.wood_code || '-'}</td>
                    <td className="px-4 py-3 text-center">{row.grade || '-'}</td>
                    <td className="px-4 py-3 text-right">{row.amount}</td>
                    <td className="px-4 py-3 text-right">{row.volumn}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">{Number(row.net_price).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => viewDetails(row.barcode_id)}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-3 py-1 rounded shadow-sm text-xs transition-colors"
                      >
                        <i className="fas fa-list"></i> ดูทั้งหมด
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* 💡 โซนปุ่มกดเปลี่ยนหน้า (Pagination Controls) ด้านล่างตาราง */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex flex-wrap justify-between items-center w-full gap-4">
              
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  « หน้าแรก
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === 1 
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  ‹ ก่อนหน้า
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">หน้า</span>
                <select
                  value={currentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="border border-gray-300 dark:border-gray-600 rounded-md py-1 px-2 text-sm outline-none focus:border-blue-500 font-semibold text-blue-700 dark:text-blue-400 bg-white dark:bg-gray-700"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <option key={page} value={page}>
                      {page}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">จาก {totalPages}</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  ถัดไป ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    currentPage === totalPages 
                      ? 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed' 
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700'
                  }`}
                >
                  หน้าสุดท้าย »
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}