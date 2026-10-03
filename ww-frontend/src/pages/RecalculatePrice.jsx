import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function RecalculatePrice() {
  const [branches, setBranches] = useState([]);
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [filters, setFilters] = useState({
    branch_id: '',
    produce_date: new Date().toISOString().split('T')[0]
  });

  // โหลดสิทธิ์สาขา และดึงประวัติครั้งแรก
  useEffect(() => {
    fetchBranches();
  }, []);

  // ระบบ Auto-Refresh ดึงข้อมูลประวัติใหม่ทุกๆ 3 วินาที หากมีงานไหนติดสถานะ 'Processing'
  useEffect(() => {
    let interval;
    const hasProcessing = logs.some(log => log.status === 'Processing');
    
    if (hasProcessing) {
      interval = setInterval(() => {
        fetchLogs(filters.branch_id);
      }, 3000);
    }
    
    return () => clearInterval(interval);
  }, [logs, filters.branch_id]);

  const fetchBranches = async () => {
    try {
      const currentPath = window.location.pathname;
      const res = await apiFetch(`/branches/allowed?menu=${currentPath}`);
      if (res?.success) {
        const validBranches = res.data.filter(b => b.id !== 0);
        setBranches(validBranches);
        if (validBranches.length > 0) {
          setFilters(prev => ({ ...prev, branch_id: validBranches[0].id }));
          fetchLogs(validBranches[0].id); // ดึงประวัติของสาขาเริ่มต้น
        }
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
    }
  };

  const fetchLogs = async (branchId) => {
    if (!branchId) return;
    try {
      const res = await apiFetch(`/transactions/recal-logs?branch_id=${branchId}`);
      if (res?.success) setLogs(res.data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleFilterChange = (e) => {
    const val = e.target.value;
    setFilters({ ...filters, [e.target.name]: val });
    if (e.target.name === 'branch_id') fetchLogs(val);
  };

  const handleDateChange = (date) => {
    if (date) setFilters({ ...filters, produce_date: format(date, 'yyyy-MM-dd') });
  };

  // กดยืนยันให้ทำงานเบื้องหลัง
  const handleStartRecalculate = async () => {
    if (!filters.branch_id || !filters.produce_date) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุสาขาและวันที่ผลิต', 'warning');
    }

    const branchName = branches.find(b => Number(b.id) === Number(filters.branch_id))?.branch_name;

    const confirm = await Swal.fire({
      title: 'เริ่มการคำนวณราคาใหม่?',
      html: `สาขา <b>${branchName}</b><br/>วันที่ผลิต: <b>${format(parseISO(filters.produce_date), 'dd/MM/yyyy')}</b><br/><br/><span class="text-sm text-gray-500">ระบบจะทำการรันเบื้องหลัง คุณสามารถทำงานอื่นต่อได้ทันที</span>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ยืนยัน',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    setIsLoading(true);
    try {
      const res = await apiFetch('/transactions/recalculate-prices', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: Number(filters.branch_id),
          produce_date: filters.produce_date
        })
      });

      if (res?.success) {
        Swal.fire({
          icon: 'success',
          title: 'เพิ่มเข้าสู่คิวสำเร็จ',
          text: res.message,
          timer: 2500,
          showConfirmButton: false
        });
        fetchLogs(filters.branch_id); // อัปเดตตารางเพื่อให้เห็นสถานะ Processing
      } else {
        Swal.fire('ข้อผิดพลาด', res?.message, 'error');
      }
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อระบบได้', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto min-h-screen bg-gray-50">
      
      {/* ─── โซนสั่งงาน ─── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <i className="fas fa-calculator text-blue-600"></i> คำนวณราคาขายสุทธิใหม่ (Recalculate)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">สาขา <span className="text-red-500">*</span></label>
            <select name="branch_id" value={filters.branch_id} onChange={handleFilterChange} className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>)}
            </select>
          </div>
          
          <div className="flex flex-col">
            <label className="block text-xs font-semibold text-gray-600 mb-1">วันที่ผลิต <span className="text-red-500">*</span></label>
            <DatePicker
              selected={filters.produce_date ? parseISO(filters.produce_date) : null}
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              locale={th}
              className="w-full border rounded-lg p-2 text-sm bg-gray-50 outline-none focus:border-blue-500"
              wrapperClassName="w-full"
            />
          </div>

          <button 
            onClick={handleStartRecalculate} 
            disabled={isLoading || !filters.branch_id} 
            className="bg-blue-600 hover:bg-blue-700 text-white w-full py-2 rounded-lg font-semibold shadow flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <i className="fas fa-play"></i> เริ่มคำนวณใหม่
          </button>
        </div>
      </div>

      {/* ─── โซนประวัติการทำรายการ ─── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col pb-4">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-md font-bold text-gray-700">
            <i className="fas fa-history text-gray-500 mr-2"></i> ประวัติการทำรายการ (50 รายการล่าสุด)
          </h3>
          <button onClick={() => fetchLogs(filters.branch_id)} className="text-blue-600 hover:text-blue-800 text-sm font-semibold">
            <i className="fas fa-sync-alt"></i> รีเฟรช
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3 border-b">วัน/เวลาสั่งงาน</th>
                <th className="px-4 py-3 border-b">สาขา</th>
                <th className="px-4 py-3 border-b">วันที่ผลิตเป้าหมาย</th>
                <th className="px-4 py-3 border-b">สั่งโดย</th>
                <th className="px-4 py-3 border-b text-center">อัปเดต (รายการ)</th>
                <th className="px-4 py-3 border-b text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-8 text-gray-500">ไม่พบประวัติการทำรายการ</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{log.branch_name}</td>
                    <td className="px-4 py-3">{format(new Date(log.produce_date), 'dd/MM/yyyy')}</td>
                    <td className="px-4 py-3 text-gray-600">{log.created_by_name}</td>
                    <td className="px-4 py-3 text-center text-blue-600 font-semibold">
                      {log.status === 'Processing' ? '-' : log.total_updated.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {log.status === 'Processing' && <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><i className="fas fa-spinner fa-spin"></i> กำลังทำงาน</span>}
                      {log.status === 'Success' && <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1"><i className="fas fa-check-circle"></i> สำเร็จ</span>}
                      {log.status === 'Error' && <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1" title={log.error_message}><i className="fas fa-times-circle"></i> ผิดพลาด</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}