import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  // 💡 ข้อมูลจำลองสำหรับแสดงผล (Mock Data) อนาคตสามารถเขียน API เพื่อดึงของจริงมาใส่ได้
  const [stats] = useState({
    sawWood: { vol: '12,450', val: '1.2M' },
    wetWood: { vol: '8,230', wage: '14,500' },
    dryWood: { vol: '6,120', wage: '11,200' },
    lastSync: 'วันนี้ 08:30 น.'
  });

  const [chartData] = useState([
    { day: 'จ.', saw: 80, wet: 60, dry: 40 },
    { day: 'อ.', saw: 95, wet: 50, dry: 70 },
    { day: 'พ.', saw: 60, wet: 40, dry: 50 },
    { day: 'พฤ.', saw: 100, wet: 80, dry: 90 },
    { day: 'ศ.', saw: 85, wet: 75, dry: 60 },
    { day: 'ส.', saw: 40, wet: 30, dry: 20 },
    { day: 'อา.', saw: 110, wet: 90, dry: 80 },
  ]);

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto min-h-[80vh] font-sans">
      
      {/* 🌟 1. Welcome Banner (Hero Section) */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden transition-all hover:shadow-blue-500/30">
        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2 tracking-tight">ระบบภาพรวมการผลิต WW_Report</h1>
          <p className="text-blue-100 text-sm md:text-base max-w-xl leading-relaxed">
            วิเคราะห์ปริมาตรไม้ คำนวณราคาขาย และประมวลผลค่าแรงอัตโนมัติ ข้อมูลอัปเดตล่าสุด: 
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-mono ml-2 backdrop-blur-md inline-flex items-center mt-2 md:mt-0 border border-white/30">
              <i className="fas fa-sync-alt mr-2 animate-spin-slow"></i> {stats.lastSync}
            </span>
          </p>
        </div>
        {/* วงกลมตกแต่ง Background สไตล์ Modern */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 -mb-10 w-40 h-40 bg-blue-300 opacity-20 rounded-full blur-2xl pointer-events-none"></div>
      </div>

      {/* 🌟 2. KPI Cards (สรุปข้อมูล 3 ประเภทไม้) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: ไม้เลื่อย */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <i className="fas fa-layer-group text-2xl text-blue-600 dark:text-blue-400"></i>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <i className="fas fa-arrow-up"></i> 12%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">ปริมาตรไม้เลื่อย (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{stats.sawWood.vol}</h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">ยอดขายประเมิน <span className="font-bold text-blue-600 dark:text-blue-400">฿{stats.sawWood.val}</span></p>
        </div>

        {/* Card 2: ไม้เปียก */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-teal-50 dark:bg-teal-900/30 p-3 rounded-2xl group-hover:scale-110 group-hover:-rotate-3 transition-transform">
              <i className="fas fa-water text-2xl text-teal-600 dark:text-teal-400"></i>
            </div>
            <span className="text-xs font-bold text-red-600 bg-red-100 dark:bg-red-900/40 dark:text-red-400 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <i className="fas fa-arrow-down"></i> 2%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">ปริมาตรไม้เปียก (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{stats.wetWood.vol}</h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">ค่าแรงรวม <span className="font-bold text-teal-600 dark:text-teal-400">฿{stats.wetWood.wage}</span></p>
        </div>

        {/* Card 3: ไม้แห้ง */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-orange-50 dark:bg-orange-900/30 p-3 rounded-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform">
              <i className="fas fa-fire-alt text-2xl text-orange-600 dark:text-orange-400"></i>
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/40 dark:text-green-400 px-2.5 py-1 rounded-lg flex items-center gap-1">
              <i className="fas fa-arrow-up"></i> 5%
            </span>
          </div>
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">ปริมาตรไม้แห้ง (ลบ.ฟุต)</h3>
          <div className="mt-2 flex items-baseline gap-2">
            <h2 className="text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{stats.dryWood.vol}</h2>
          </div>
          <p className="text-xs text-gray-400 mt-2 font-medium">ค่าแรงรวม <span className="font-bold text-orange-600 dark:text-orange-400">฿{stats.dryWood.wage}</span></p>
        </div>

        {/* Card 4 - Quick Action (Gradient) */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-3xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden group">
          <div className="relative z-10">
            <div className="bg-white/10 w-fit p-3 rounded-2xl mb-4 backdrop-blur-md border border-white/10">
              <i className="fas fa-bolt text-2xl text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"></i>
            </div>
            <h3 className="text-gray-200 text-sm font-bold tracking-wide">เครื่องมือด่วน</h3>
          </div>
          <div className="relative z-10 flex flex-col gap-2 mt-4">
            <Link to="/sync-saw-woods" className="bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all border border-white/10 flex items-center justify-between group/btn">
              <span><i className="fas fa-cloud-download-alt w-5"></i> นำเข้าข้อมูลผลิต</span>
              <i className="fas fa-chevron-right text-[10px] opacity-50 group-hover/btn:translate-x-1 transition-transform"></i>
            </Link>
            <Link to="/recalculate-price" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-md flex items-center justify-between group/btn">
              <span><i className="fas fa-calculator w-5"></i> คำนวณราคาใหม่</span>
              <i className="fas fa-chevron-right text-[10px] opacity-50 group-hover/btn:translate-x-1 transition-transform"></i>
            </Link>
          </div>
          {/* Abstract graphic */}
          <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-125 transition-transform duration-700 pointer-events-none">
            <i className="fas fa-chart-pie text-[150px]"></i>
          </div>
        </div>
      </div>

      {/* 🌟 3. กราฟและข้อมูล (Main Content Area) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart Section (ใช้ Tailwind สร้างกราฟแท่งแบบ Pure CSS) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">แนวโน้มผลผลิต (7 วันย้อนหลัง)</h3>
            <div className="flex gap-4 text-xs font-bold text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm"></span> ไม้เลื่อย</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm"></span> ไม้เปียก</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span> ไม้แห้ง</span>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 pt-4 relative border-b border-gray-200 dark:border-gray-700 flex-1">
            {/* เส้น Grid แนวนอน */}
            <div className="absolute w-full h-full flex flex-col justify-between pb-6 pointer-events-none opacity-20 dark:opacity-10">
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
              <div className="border-b-2 border-dashed border-gray-400 w-full flex-1"></div>
            </div>

            {chartData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col justify-end items-center group relative h-full pb-8 z-10 cursor-pointer">
                {/* Tooltip */}
                <div className="absolute -top-12 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold px-3 py-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl z-20">
                  <div className="mb-1 text-center border-b border-gray-700 dark:border-gray-300 pb-1">{d.day}</div>
                  <span className="text-blue-400 dark:text-blue-600">เลื่อย: {d.saw}</span> | <span className="text-teal-400 dark:text-teal-600">เปียก: {d.wet}</span> | <span className="text-orange-400 dark:text-orange-600">แห้ง: {d.dry}</span>
                </div>
                {/* กราฟแท่ง */}
                <div className="flex items-end gap-1 w-full justify-center h-full">
                  <div style={{ height: `${d.saw}%` }} className="w-3 md:w-5 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-sm"></div>
                  <div style={{ height: `${d.wet}%` }} className="w-3 md:w-5 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-sm"></div>
                  <div style={{ height: `${d.dry}%` }} className="w-3 md:w-5 bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-md transition-all duration-500 group-hover:brightness-110 shadow-sm"></div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400 mt-3 absolute bottom-0 font-bold">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <i className="fas fa-trophy text-yellow-500"></i> ผลงานยอดเยี่ยม (วันนี้)
          </h3>
          <div className="space-y-4 flex-1">
            
            {/* อันดับ 1 */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-yellow-50/50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-yellow-500/30">1</div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">นาย สมชาย ใจดี</h4>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">แผนกจัดเรียงไม้เปียก</p>
              </div>
              <div className="text-right">
                <span className="block text-sm font-extrabold text-teal-600 dark:text-teal-400">850</span>
                <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
              </div>
            </div>

            {/* อันดับ 2 */}
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-transparent">
              <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 text-lg font-bold">2</div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">นาย สมปอง งานเนี๊ยบ</h4>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">แผนกเลื่อยไม้ (ชุดที่ 2)</p>
              </div>
              <div className="text-right">
                <span className="block text-sm font-extrabold text-blue-600 dark:text-blue-400">720</span>
                <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
              </div>
            </div>

            {/* อันดับ 3 */}
            <div className="flex items-center gap-4 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors border border-transparent">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 text-lg font-bold">3</div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">นาง วนิดา ขยันทำ</h4>
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">แผนกจัดเรียงไม้แห้ง</p>
              </div>
              <div className="text-right">
                <span className="block text-sm font-extrabold text-orange-600 dark:text-orange-400">650</span>
                <span className="text-[10px] text-gray-400">ลบ.ฟุต</span>
              </div>
            </div>

          </div>

          <Link to="/sawer-performance" className="w-full mt-4 py-3 text-xs font-bold text-center text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors block">
            ดูรายงานผลงานทั้งหมด <i className="fas fa-arrow-right ml-1"></i>
          </Link>
        </div>

      </div>
    </div>
  );
}