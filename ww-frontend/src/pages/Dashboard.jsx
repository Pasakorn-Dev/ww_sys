import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiFetch from '../services/apiFetch';

// ─── Component ย่อยสำหรับทำตัวเลขวิ่ง (Animated Counter) ───
const AnimatedNumber = ({ endValue, duration = 1500, isCurrency = false, prefix = '' }) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    setCurrentValue(0);

    let numericValue = 0;
    const cleanStr = String(endValue).replace(/,/g, '');

    if (cleanStr.includes('M')) {
      numericValue = parseFloat(cleanStr) * 1000000;
    } else if (cleanStr.includes('K')) {
      numericValue = parseFloat(cleanStr) * 1000;
    } else {
      numericValue = parseFloat(cleanStr) || 0;
    }

    if (numericValue === 0) {
      setCurrentValue(0);
      return;
    }

    let startTimestamp = null;
    let animationFrameId;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      const easeOutExpo = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrentValue(easeOutExpo * numericValue);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCurrentValue(numericValue); 
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => cancelAnimationFrame(animationFrameId);
  }, [endValue, duration]);

  const formatNumber = (num) => {
    const originalStr = String(endValue);
    if (originalStr.includes('M')) return `${prefix}${(num / 1000000).toFixed(1)}M`;
    if (isCurrency) return `${prefix}${num.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    return `${prefix}${Math.floor(num).toLocaleString()}`;
  };

  return <span>{formatNumber(currentValue)}</span>;
};

export default function Dashboard() {
  const [animationKey, setAnimationKey] = useState(0);

  const [stats, setStats] = useState({
    sawWood: { vol: 0, val: 0, percent: 0 },
    wetWood: { vol: 0, wage: 0, percent: 0 },
    dryWood: { vol: 0, wage: 0, percent: 0 },
    lastSync: 'กำลังโหลด...'
  });
  const [chartData, setChartData] = useState([]);

  // 💡 State เก็บข้อมูลผลงานยอดเยี่ยม
  const [topPerformers, setTopPerformers] = useState([]);
  
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [accessLevel, setAccessLevel] = useState(3);
  const [isLoading, setIsLoading] = useState(false);

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
            setSelectedBranch(''); 
            fetchDashboardData('');
          } else if (validBranches.length > 0) {
            setSelectedBranch(validBranches[0].id);
            fetchDashboardData(validBranches[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching branches:', error);
      }
    };
    fetchBranches();
    return () => { isMounted = false; };
  }, []);

  const fetchDashboardData = async (branchId) => {
    setIsLoading(true);
    try {
      const query = branchId ? `?branch_id=${branchId}` : '';
      const res = await apiFetch(`/dashboard/summary${query}`);
      if (res?.success) {
        let dateStr = 'ไม่มีข้อมูล';
        if (res.kpi.lastSync !== 'ไม่มีข้อมูล') {
           const d = new Date(res.kpi.lastSync);
           dateStr = `วันที่ ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth()+1).padStart(2, '0')}/${d.getFullYear()}`;
        }
        setStats({ ...res.kpi, lastSync: dateStr });
        setChartData(res.chart);
        
        // 💡 เก็บข้อมูลลง State
        setTopPerformers(res.topPerformers || []);
        
        setAnimationKey(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error fetching Dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBranchChange = (e) => {
    const val = e.target.value;
    setSelectedBranch(val);
    fetchDashboardData(val);
  };

  const handleGraphClick = () => {
    setAnimationKey(prev => prev + 1);
  };

  const maxChartVolume = chartData.length > 0 
    ? Math.max(...chartData.flatMap(d => [d.saw, d.wet, d.dry])) 
    : 100;
  const getGraphHeight = (val) => maxChartVolume > 0 ? (val / maxChartVolume) * 100 : 0;

  // 💡 จัดรูปแบบข้อมูลให้ดึงง่ายขึ้น
  const sawTop = topPerformers.find(p => p.department === 'แผนกเลื่อยไม้') || null;
  const wetTop = topPerformers.find(p => p.department === 'แผนกจัดเรียงไม้เปียก') || null;
  const dryTop = topPerformers.find(p => p.department === 'แผนกจัดเรียงไม้แห้ง') || null;

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-[80vh] font-sans">
      
      {/* 🌟 1. Welcome Banner + ตัวกรองสาขา */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative z-10 w-full md:w-auto">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">ระบบภาพรวมการผลิต</h1>
          <p className="text-blue-100 text-sm md:text-base max-w-xl leading-relaxed">
            ข้อมูลอัปเดตล่าสุด: 
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono ml-2 backdrop-blur-md inline-flex items-center mt-2 border border-white/30">
              <i className="fas fa-sync-alt mr-2 animate-spin-slow"></i> {stats.lastSync}
            </span>
          </p>
        </div>

        <div className="relative z-10 w-full md:w-64 bg-white/10 p-3 rounded-2xl backdrop-blur-sm border border-white/20">
          <label className="block text-[11px] font-bold text-blue-200 mb-1">แสดงข้อมูลสาขา</label>
          <select
            value={selectedBranch}
            onChange={handleBranchChange}
            disabled={isLoading || (accessLevel !== 1 && branches.length <= 1)}
            className="w-full bg-white text-gray-800 border-none rounded-lg p-2 text-sm outline-none shadow-inner disabled:bg-gray-200"
          >
            {accessLevel === 1 && <option value="">🌟 สรุปทุกสาขาทั้งบริษัท</option>}
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 🌟 2. KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: ไม้เลื่อย */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl">
              <i className="fas fa-layer-group text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${stats.sawWood.percent >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
              <i className={`fas ${stats.sawWood.percent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i> {Math.abs(stats.sawWood.percent).toFixed(1)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">ปริมาตรไม้เลื่อย (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800">
              <AnimatedNumber key={`saw-vol-${animationKey}`} endValue={stats.sawWood.vol} />
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            ยอดขายประเมิน <span className="font-bold text-blue-600">
              <AnimatedNumber key={`saw-val-${animationKey}`} endValue={stats.sawWood.val} prefix="฿" isMillion={true} />
            </span>
          </p>
        </div>

        {/* Card 2: ไม้เปียก */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-2xl">
              <i className="fas fa-water text-2xl text-teal-600 dark:text-teal-400"></i>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${stats.wetWood.percent >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
              <i className={`fas ${stats.wetWood.percent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i> {Math.abs(stats.wetWood.percent).toFixed(1)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">ปริมาตรไม้เปียก (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800">
              <AnimatedNumber key={`wet-vol-${animationKey}`} endValue={stats.wetWood.vol} />
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            ค่าแรงรวม <span className="font-bold text-teal-600">
              <AnimatedNumber key={`wet-val-${animationKey}`} endValue={stats.wetWood.wage} prefix="฿" isCurrency={true} />
            </span>
          </p>
        </div>

        {/* Card 3: ไม้แห้ง */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-2xl">
              <i className="fas fa-fire-alt text-2xl text-orange-600 dark:text-orange-400"></i>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 ${stats.dryWood.percent >= 0 ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
              <i className={`fas ${stats.dryWood.percent >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'}`}></i> {Math.abs(stats.dryWood.percent).toFixed(1)}%
            </span>
          </div>
          <h3 className="text-gray-500 text-sm font-medium">ปริมาตรไม้แห้ง (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800">
              <AnimatedNumber key={`dry-vol-${animationKey}`} endValue={stats.dryWood.vol} />
            </h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">
            ค่าแรงรวม <span className="font-bold text-orange-600">
              <AnimatedNumber key={`dry-val-${animationKey}`} endValue={stats.dryWood.wage} prefix="฿" isCurrency={true} />
            </span>
          </p>
        </div>

        {/* Card 4 - Quick Action */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10">
              <i className="fas fa-bolt text-2xl text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"></i>
            </div>
            <h3 className="text-gray-200 text-sm font-bold tracking-wide">เครื่องมือด่วน</h3>
          </div>
          <div className="relative z-10 flex flex-col gap-2 mt-4">
            <Link to="/sync-saw-woods" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-white/10 flex items-center justify-between">
              <span><i className="fas fa-cloud-download-alt w-5"></i> นำเข้าข้อมูลผลิต</span>
              <i className="fas fa-chevron-right text-[10px] opacity-50"></i>
            </Link>
            <Link to="/recalculate-price" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-between">
              <span><i className="fas fa-calculator w-5"></i> คำนวณราคาใหม่</span>
              <i className="fas fa-chevron-right text-[10px] opacity-50"></i>
            </Link>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <i className="fas fa-chart-pie text-[150px]"></i>
          </div>
        </div>
      </div>

      {/* 🌟 3. กราฟและข้อมูล (Main Content Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section */}
        <div 
          onClick={handleGraphClick}
          className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col cursor-pointer"
        >
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">แนวโน้มผลผลิต (7 วันย้อนหลัง)</h3>
            <div className="flex gap-4 text-xs font-bold text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span> ไม้เลื่อย</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm"></span> ไม้เปียก</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span> ไม้แห้ง</span>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 pt-4 relative border-b border-gray-200 flex-1">
            <div className="absolute w-full h-full flex flex-col justify-between pb-6 pointer-events-none opacity-20">
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
            </div>

            {chartData.length === 0 && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">ไม่พบข้อมูลในสัปดาห์นี้</div>
            )}

            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full pb-8 z-10 cursor-pointer">
                {/* Tooltip */}
                <div className="absolute -top-12 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20">
                  <div className="mb-1 text-center border-b border-gray-700 pb-1">{d.date} ({d.day})</div>
                  <span className="text-blue-400">เลื่อย: {d.saw.toLocaleString()}</span> | 
                  <span className="text-teal-400 ml-1">เปียก: {d.wet.toLocaleString()}</span> | 
                  <span className="text-orange-400 ml-1">แห้ง: {d.dry.toLocaleString()}</span>
                </div>
                
                <div className="flex items-end gap-1 w-full justify-center h-full">
                  <div key={`bar-saw-${animationKey}-${i}`} style={{ height: `${getGraphHeight(d.saw)}%` }} className="w-3 md:w-5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm animate-[grow_1s_ease-out_forwards]"></div>
                  <div key={`bar-wet-${animationKey}-${i}`} style={{ height: `${getGraphHeight(d.wet)}%` }} className="w-3 md:w-5 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm animate-[grow_1.2s_ease-out_forwards]"></div>
                  <div key={`bar-dry-${animationKey}-${i}`} style={{ height: `${getGraphHeight(d.dry)}%` }} className="w-3 md:w-5 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-md transition-all duration-500 hover:brightness-110 shadow-sm animate-[grow_1.4s_ease-out_forwards]"></div>
                </div>
                <span className="text-xs text-gray-500 mt-3 absolute bottom-0 font-bold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 💡 Top Performers Section (จัดกลุ่มตามประเภทไม้) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <i className="fas fa-trophy text-yellow-500"></i> ผลงานยอดเยี่ยม (7 วันย้อนหลัง)
          </h3>
          <div className="space-y-4 flex-1">
            
            {topPerformers.length === 0 && !isLoading && (
              <div className="text-center text-gray-400 text-sm mt-10">ไม่พบข้อมูลผลงานในสัปดาห์นี้</div>
            )}

            {/* แผนกไม้เลื่อย (สีฟ้า) */}
            {sawTop && (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-md bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <i className="fas fa-layer-group text-sm"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{sawTop.emp_name || 'ไม่ระบุชื่อ'}</h4>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{sawTop.department}</p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-extrabold text-blue-600 dark:text-blue-400">
                    <AnimatedNumber key={`top-saw-${animationKey}`} endValue={sawTop.volumn} />
                  </span>
                  <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
                </div>
              </div>
            )}

            {/* แผนกไม้เปียก (สีเขียว/Teal) */}
            {wetTop && (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-md bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                  <i className="fas fa-water text-sm"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{wetTop.emp_name || 'ไม่ระบุชื่อ'}</h4>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{wetTop.department}</p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-extrabold text-teal-600 dark:text-teal-400">
                    <AnimatedNumber key={`top-wet-${animationKey}`} endValue={wetTop.volumn} />
                  </span>
                  <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
                </div>
              </div>
            )}

            {/* แผนกไม้แห้ง (สีส้ม) */}
            {dryTop && (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-transparent hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-md bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                  <i className="fas fa-fire-alt text-sm"></i>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">{dryTop.emp_name || 'ไม่ระบุชื่อ'}</h4>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{dryTop.department}</p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-extrabold text-orange-600 dark:text-orange-400">
                    <AnimatedNumber key={`top-dry-${animationKey}`} endValue={dryTop.volumn} />
                  </span>
                  <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
                </div>
              </div>
            )}

          </div>

          <Link to="/sawer-performance" className="w-full mt-4 py-3 text-xs font-bold text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors block">
            ดูรายงานผลงานทั้งหมด <i className="fas fa-arrow-right ml-1"></i>
          </Link>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes grow {
          from { height: 0%; opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}