import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

export default function SyncMaster() {
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('ระบบพร้อมทำงาน สามารถกดปุ่มเพื่อเริ่มอัปเดตข้อมูล');

  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [accessLevel, setAccessLevel] = useState(3);

  // ─── State สำหรับ Terminal Log ───
  const [logs, setLogs] = useState([
    `[${new Date().toLocaleTimeString('th-TH')}] System initialized. Ready for synchronization.`
  ]);
  const logEndRef = useRef(null);

  // ฟังก์ชันเพิ่ม Log ลง Terminal
  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('th-TH')}] ${msg}`]);
  };

  // เลื่อน Terminal ลงล่างสุดอัตโนมัติเวลามี Log ใหม่
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setIsAdmin(user.group_id === 1);
    }
    fetchAllowedBranches();
  }, []);

  const fetchAllowedBranches = async () => {
    addLog('Fetching authorized branches...');
    try {
      const data = await apiFetch('/branches/allowed');
      if (data?.success) {
        setBranches(data.data);
        setAccessLevel(data.access_level);
        
        if (data.access_level === 1) {
          setSelectedBranch(0); 
        } else if (data.data.length > 0) {
          setSelectedBranch(data.data[0].id);
        }
        addLog(`Loaded ${data.data.length} branches successfully. Access Level: ${data.access_level}`);
      }
    } catch (error) {
      console.error('Fetch branches error:', error);
      addLog('❌ Error: Failed to fetch branches.');
    }
  };

  const allowedBranches = isAdmin 
    ? branches 
    : branches.filter(b => b.id === currentUser?.branch_id);

  const handleStartSync = async () => {
    const branchName = Number(selectedBranch) === 0 
      ? 'ทุกสาขาทั้งบริษัท' 
      : branches.find(b => Number(b.id) === Number(selectedBranch))?.branch_name || 'สาขาที่เลือก';

    const confirm = await Swal.fire({
      title: 'ต้องการอัปเดตข้อมูลใช่หรือไม่?',
      html: `ระบบจะดึงข้อมูลล่าสุดของ <b class="text-blue-600">${branchName}</b> มาไว้ในเครื่อง`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'ใช่, อัปเดตเลย',
      cancelButtonText: 'ยกเลิก',
      reverseButtons: true
    });

    if (!confirm.isConfirmed) return;

    setStatus('syncing');
    setMessage(`กำลังดึงข้อมูล ${branchName} กรุณารอสักครู่...`);
    addLog('----------------------------------------');
    addLog(`🚀 START SYNC: Target -> ${branchName}`);
    addLog('Connecting to legacy MySQL database via dynamic pool...');

    const startTime = Date.now();

    try {
      const data = await apiFetch('/master/sync', { 
        method: 'POST',
        body: JSON.stringify({ branch_id: Number(selectedBranch) }) 
      });

      const endTime = Date.now();
      const syncTimeSeconds = ((endTime - startTime) / 1000).toFixed(2);

      if (data?.success) {
        setStatus('success');
        setMessage(`อัปเดตข้อมูล ${branchName} เสร็จสมบูรณ์!`);
        
        addLog(`✅ SYNC SUCCESS: Transferred ${data.total_synced || 0} rows.`);
        addLog(`⏱️ Execution Time: ${syncTimeSeconds} seconds.`);
        
        Swal.fire({ 
            icon: 'success', 
            title: 'อัปเดตสำเร็จ!', 
            text: `ใช้เวลาไป ${syncTimeSeconds} วินาที`,
            timer: 2500, 
            showConfirmButton: false 
        });
      } else {
        setStatus('error');
        setMessage(`เกิดปัญหา: ${data?.message || 'ไม่สามารถดึงข้อมูลได้'}`);
        addLog(`❌ SYNC FAILED: ${data?.message}`);
        Swal.fire('เกิดข้อผิดพลาด', data?.message || 'การดึงข้อมูลล้มเหลว', 'warning');
      }
    } catch (error) {
      console.error('Sync error:', error);
      setStatus('error');
      setMessage('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ โปรดตรวจสอบอินเทอร์เน็ต');
      addLog('❌ FATAL ERROR: Server connection lost or timed out.');
    }
  };

  const getStatusUI = () => {
    switch (status) {
      case 'syncing': return { icon: 'fas fa-cloud-download-alt animate-bounce text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', textColor: 'text-blue-700 dark:text-blue-300' };
      case 'success': return { icon: 'fas fa-check-circle text-green-500', bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', textColor: 'text-green-700 dark:text-green-300' };
      case 'error': return { icon: 'fas fa-exclamation-triangle text-red-500', bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', textColor: 'text-red-700 dark:text-red-300' };
      default: return { icon: 'fas fa-server text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800', border: 'border-gray-200 dark:border-gray-700', textColor: 'text-gray-600 dark:text-gray-400' };
    }
  };
  const ui = getStatusUI();

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[80vh]">
      
      {/* Container หลัก (แบ่ง 2 ฝั่งบนหน้าจอใหญ่) */}
      <div className="bg-white dark:bg-gray-800 w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col lg:flex-row">
        
        {/* ========================================================= */}
        {/* ฝั่งซ้าย: Control Panel (แผงควบคุมหลัก) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-5/12 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
          
          {/* Header */}
          <div className="p-6 md:p-8 text-center border-b border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-sync-alt text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">อัปเดตข้อมูลระบบ (Sync)</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">อัปเดตข้อมูลจากระบบส่วนกลาง</p>
          </div>

          <div className="p-6 flex-1 bg-gray-50/50 dark:bg-gray-900/30 flex flex-col justify-center">
            
            {/* Dropdown เลือกสาขา */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                เลือกเป้าหมาย
              </label>
              <div className="relative">
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  disabled={status === 'syncing' || (accessLevel !== 1 && allowedBranches.length <= 1)}
                  className="w-full appearance-none bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-white py-3 px-4 pr-8 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-500 cursor-pointer shadow-sm text-sm transition-colors"
                >
                  {accessLevel === 1 && <option value={0}>🌟 ทุกสาขาทั้งบริษัท (All Branches)</option>}
                  {allowedBranches.map(branch => (
                    <option key={branch.id} value={branch.id}>
                      {branch.branch_code} - {branch.branch_name}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <i className="fas fa-chevron-down text-sm"></i>
                </div>
              </div>
            </div>

            {/* กล่องแสดงสถานะ */}
            <div className={`flex flex-col items-center justify-center p-5 rounded-xl border ${ui.bg} ${ui.border} text-center transition-colors duration-300 min-h-[140px]`}>
              <i className={`${ui.icon} text-3xl mb-3`}></i>
              <p className={`text-sm font-medium ${ui.textColor} px-2`}>{message}</p>
              {status === 'syncing' && (
                <div className="w-full max-w-[200px] bg-blue-200 dark:bg-blue-900 rounded-full h-1.5 mt-4 overflow-hidden">
                  <div className="bg-blue-600 h-1.5 rounded-full w-full animate-pulse"></div>
                </div>
              )}
            </div>
          </div>

          {/* ปุ่มกด */}
          <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleStartSync}
              disabled={status === 'syncing' || selectedBranch === ''}
              className={`w-full py-3 rounded-xl text-white font-semibold shadow-md transition-all flex items-center justify-center gap-2
                ${status === 'syncing' || selectedBranch === '' 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                }`}
            >
              {status === 'syncing' ? <><i className="fas fa-spinner fa-spin"></i> กำลังดำเนินการ...</> : 
               status === 'success' ? <><i className="fas fa-redo"></i> อัปเดตข้อมูลอีกครั้ง</> : 
               <><i className="fas fa-download"></i> เริ่มอัปเดตข้อมูล</>}
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* ฝั่งขวา: Terminal Log (สำหรับ Admin/Dev ดูการเคลื่อนไหว) */}
        {/* ========================================================= */}
        <div className="w-full lg:w-7/12 bg-gray-950 p-4 lg:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-gray-400 text-xs font-mono tracking-wider ml-2">sys_sync_terminal.log</span>
            {/* แสดงเวลา Execution Time ท้าย Header ถ้ามี */}
            {status === 'success' && (
              <span className="text-green-400 text-xs font-mono ml-auto">STATUS: COMPLETED</span>
            )}
          </div>
          
          <div className="flex-1 bg-black/50 border border-gray-800 rounded-lg p-4 font-mono text-xs md:text-sm overflow-y-auto h-64 lg:h-auto custom-scrollbar shadow-inner">
            <div className="space-y-1.5">
              {logs.map((log, index) => {
                // จัดสีตามประเภทข้อความ
                let colorClass = "text-gray-300";
                if (log.includes('✅')) colorClass = "text-green-400 font-bold";
                else if (log.includes('❌') || log.includes('ERROR')) colorClass = "text-red-400";
                else if (log.includes('🚀') || log.includes('⏱️')) colorClass = "text-blue-300";
                else if (log.includes('---')) colorClass = "text-gray-500";
                
                return (
                  <div key={index} className={`${colorClass} break-words`}>
                    {log}
                  </div>
                );
              })}
              {status === 'syncing' && (
                <div className="text-blue-400 animate-pulse mt-2 flex items-center gap-2">
                  <i className="fas fa-terminal"></i> Processing data chunks...
                </div>
              )}
              {/* Dummy div สำหรับ Scroll ลงล่างสุด */}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}