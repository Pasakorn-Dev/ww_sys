import { useState, useEffect, useRef } from 'react';
import Swal from 'sweetalert2';
import apiFetch from '../services/apiFetch';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

export default function SyncDryWood() {
  const [status, setStatus] = useState('idle');
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [logs, setLogs] = useState([`[${new Date().toLocaleTimeString('th-TH')}] System ready for dry wood sync.`]);
  const logEndRef = useRef(null);

  const addLog = (msg) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString('th-TH')}] ${msg}`]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    fetchAllowedBranches();
    const today = new Date().toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(today);
  }, []);

  const fetchAllowedBranches = async () => {
    try {
      const data = await apiFetch(`/branches/allowed?menu=${window.location.pathname}`);
      if (data?.success) {
        setBranches(data.data);
        const validList = data.data.filter(b => b.id !== 0);
        if (validList.length > 0) setSelectedBranch(validList[0].id);
      }
    } catch (error) {
      addLog('❌ Error: Failed to fetch branches.');
    }
  };

  const handleDateChange = (date, type) => {
    if (date) {
      const formattedDate = format(date, 'yyyy-MM-dd');
      if (type === 'start') setStartDate(formattedDate);
      if (type === 'end') setEndDate(formattedDate);
    }
  };

  const handleStartSync = async () => {
    if (!startDate || !endDate || !selectedBranch) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุข้อมูลให้ครบถ้วน', 'warning');
    }
    const branchName = branches.find(b => Number(b.id) === Number(selectedBranch))?.branch_name;
    const confirm = await Swal.fire({
      title: 'ยืนยันการนำเข้าไม้แห้ง?',
      html: `ดึงข้อมูลไม้แห้ง <b>${branchName}</b><br/>ตั้งแต่วันที่ <b>${format(parseISO(startDate), 'dd/MM/yyyy')}</b> ถึง <b>${format(parseISO(endDate), 'dd/MM/yyyy')}</b>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, เริ่มดึงข้อมูล'
    });

    if (!confirm.isConfirmed) return;

    setStatus('syncing');
    addLog('----------------------------------------');
    addLog(`🚀 START SYNC (DRY WOOD): Branch -> ${branchName} | Date: ${startDate} to ${endDate}`);
    const startTime = Date.now();

    try {
      const data = await apiFetch('/transactions/sync-dry-woods', { 
        method: 'POST',
        body: JSON.stringify({ branch_id: Number(selectedBranch), start_date: startDate, end_date: endDate }) 
      });
      const syncTimeSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

      if (data?.success) {
        setStatus('success');
        addLog(`✅ SYNC SUCCESS: Processed ${data.total_synced} records.`);
        Swal.fire('นำเข้าสำเร็จ!', `นำเข้าข้อมูลไม้แห้ง ${data.total_synced} รายการ<br/>ใช้เวลา ${syncTimeSeconds} วินาที`, 'success');
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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col min-h-[80vh]">
      <div className="bg-white dark:bg-gray-800 w-full rounded-2xl shadow-xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row flex-1">
        <div className="w-full lg:w-5/12 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100">
          <div className="p-6 text-center border-b border-gray-100 bg-orange-50 dark:bg-gray-900/50">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-fire-alt text-2xl text-orange-600"></i>
            </div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">นำเข้ายอดไม้แห้ง</h2>
            <p className="text-sm text-gray-500 mt-1">ดึงข้อมูลไม้แห้งและคำนวณค่าแรงอัตโนมัติ</p>
          </div>

          <div className="p-6 flex-1 space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">เลือกสาขา</label>
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} disabled={status === 'syncing'} className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                <option value="">-- กรุณาเลือกสาขา --</option>
                {branches.filter(b => b.id !== 0).map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="block text-sm font-semibold mb-2">ตั้งแต่วันที่</label>
                <DatePicker selected={startDate ? parseISO(startDate) : null} onChange={(date) => handleDateChange(date, 'start')} dateFormat="dd/MM/yyyy" locale={th} disabled={status === 'syncing'} className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-orange-500 text-sm" wrapperClassName="w-full" />
              </div>
              <div className="flex flex-col">
                <label className="block text-sm font-semibold mb-2">ถึงวันที่</label>
                <DatePicker selected={endDate ? parseISO(endDate) : null} onChange={(date) => handleDateChange(date, 'end')} dateFormat="dd/MM/yyyy" locale={th} disabled={status === 'syncing'} className="w-full bg-gray-50 border border-gray-300 rounded-xl p-3 outline-none focus:ring-2 focus:ring-orange-500 text-sm" wrapperClassName="w-full" />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 bg-gray-50">
            <button onClick={handleStartSync} disabled={status === 'syncing' || !selectedBranch || !startDate || !endDate} className="w-full py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50">
              {status === 'syncing' ? <><i className="fas fa-spinner fa-spin"></i> กำลังประมวลผล...</> : <><i className="fas fa-cloud-download-alt"></i> นำเข้าข้อมูล</>}
            </button>
          </div>
        </div>

        <div className="w-full lg:w-7/12 bg-gray-950 p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div></div>
            <span className="text-gray-400 text-xs font-mono ml-2">transaction_dry_wood_sync.log</span>
          </div>
          <div className="flex-1 bg-black/50 border border-gray-800 rounded-lg p-4 font-mono text-xs md:text-sm overflow-y-auto shadow-inner">
            <div className="space-y-1.5">
              {logs.map((log, index) => {
                let color = "text-gray-300";
                if (log.includes('✅')) color = "text-green-400 font-bold";
                else if (log.includes('❌')) color = "text-red-400";
                else if (log.includes('🚀')) color = "text-orange-300";
                return <div key={index} className={color}>{log}</div>;
              })}
              {status === 'syncing' && <div className="text-orange-400 animate-pulse mt-2 flex items-center gap-2"><i className="fas fa-cog fa-spin"></i> Processing dry wood data...</div>}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}