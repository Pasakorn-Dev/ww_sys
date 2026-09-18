import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';

export default function SyncSawWood() {
  const [status, setStatus] = useState('idle');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  
  // State สำหรับวันที่
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [logs, setLogs] = useState([
    `[${new Date().toLocaleTimeString('th-TH')}] System ready for saw wood transaction sync.`
  ]);
  const logEndRef = useRef(null);

  const addLog = (msg) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('th-TH')}] ${msg}`]);
  };

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    fetchAllowedBranches();
    // Set default date = today
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const fetchAllowedBranches = async () => {
    try {
      const data = await apiFetch('/branches/allowed');
      if (data?.success) {
        setBranches(data.data);
        if (data.access_level === 1) setSelectedBranch(0); 
        else if (data.data.length > 0) setSelectedBranch(data.data[0].id);
      }
    } catch (error) {
      addLog('❌ Error: Failed to fetch branches.');
    }
  };

  const handleStartSync = async () => {
    if (!startDate || !endDate) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกช่วงวันที่ให้ครบถ้วน', 'warning');
    }
    if (new Date(startDate) > new Date(endDate)) {
      return Swal.fire('แจ้งเตือน', 'วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'warning');
    }
    if (selectedBranch === '' || selectedBranch === 0) {
      return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาปลายทาง (ไม่สามารถดึงรวมทุกสาขาได้ในฟังก์ชันนี้)', 'warning');
    }

    const branchName = branches.find(b => Number(b.id) === Number(selectedBranch))?.branch_name;

    const confirm = await Swal.fire({
      title: 'ยืนยันการนำเข้าข้อมูล?',
      html: `ดึงข้อมูลไม้เลื่อยของ <b>${branchName}</b><br/>ตั้งแต่วันที่ <b>${startDate}</b> ถึง <b>${endDate}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, เริ่มดึงข้อมูล',
      cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    setStatus('syncing');
    addLog('----------------------------------------');
    addLog(`🚀 START SYNC: Branch -> ${branchName} | Date: ${startDate} to ${endDate}`);

    const startTime = Date.now();

    try {
      const data = await apiFetch('/transactions/sync-saw-woods', { 
        method: 'POST',
        body: JSON.stringify({ 
          branch_id: Number(selectedBranch),
          start_date: startDate,
          end_date: endDate
        }) 
      });

      const syncTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      if (data?.success) {
        setStatus('success');
        addLog(`✅ SYNC SUCCESS: Processed ${data.total_synced} records.`);
        addLog(`⏱️ Execution Time: ${syncTimeSeconds} seconds.`);
        Swal.fire('นำเข้าสำเร็จ!', `นำเข้าข้อมูล ${data.total_synced} รายการ<br/>ใช้เวลา ${syncTimeSeconds} วินาที`, 'success');
      } else {
        setStatus('error');
        addLog(`❌ SYNC FAILED: ${data?.message}`);
        Swal.fire('ข้อผิดพลาด', data?.message, 'error');
      }
    } catch (error) {
      setStatus('error');
      addLog('❌ FATAL ERROR: Server connection lost.');
    }
  };

  // กรองเฉพาะสาขาจริง (ไม่เอา "ทุกสาขา") เพราะ Transaction ต้องการดึงข้อมูลทีละเซิร์ฟเวอร์ MySQL เจาะจง
  const validBranches = branches.filter(b => b.id !== 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col min-h-[80vh]">
      <div className="bg-white dark:bg-gray-800 w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col lg:flex-row flex-1">
        
        {/* Left Panel */}
        <div className="w-full lg:w-5/12 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
          <div className="p-6 md:p-8 text-center border-b border-gray-100 dark:border-gray-700 bg-blue-50/50 dark:bg-gray-900/50">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-file-import text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">นำเข้ายอดเลื่อยไม้</h2>
            <p className="text-sm text-gray-500 mt-1">ดึงข้อมูลการผลิตและคำนวณราคาอัตโนมัติ</p>
          </div>

          <div className="p-6 flex-1 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">เลือกสาขา</label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                disabled={status === 'syncing'}
                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">-- กรุณาเลือกสาขา --</option>
                {validBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.branch_code} - {b.branch_name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ตั้งแต่วันที่</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={status === 'syncing'}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">ถึงวันที่</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={status === 'syncing'}
                  className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm" 
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <button
              onClick={handleStartSync}
              disabled={status === 'syncing' || !selectedBranch || !startDate || !endDate}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'syncing' ? <><i className="fas fa-spinner fa-spin"></i> กำลังประมวลผล...</> : <><i className="fas fa-cloud-download-alt"></i> นำเข้าข้อมูล</>}
            </button>
          </div>
        </div>

        {/* Right Panel (Terminal) */}
        <div className="w-full lg:w-7/12 bg-gray-950 p-4 lg:p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <span className="text-gray-400 text-xs font-mono ml-2">transaction_sync.log</span>
          </div>
          
          <div className="flex-1 bg-black/50 border border-gray-800 rounded-lg p-4 font-mono text-xs md:text-sm overflow-y-auto custom-scrollbar shadow-inner">
            <div className="space-y-1.5">
              {logs.map((log, index) => {
                let color = "text-gray-300";
                if (log.includes('✅')) color = "text-green-400 font-bold";
                else if (log.includes('❌')) color = "text-red-400";
                else if (log.includes('🚀') || log.includes('⏱️')) color = "text-blue-300";
                
                return <div key={index} className={color}>{log}</div>;
              })}
              {status === 'syncing' && (
                <div className="text-blue-400 animate-pulse mt-2 flex items-center gap-2">
                  <i className="fas fa-cog fa-spin"></i> Fetching and calculating prices...
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}