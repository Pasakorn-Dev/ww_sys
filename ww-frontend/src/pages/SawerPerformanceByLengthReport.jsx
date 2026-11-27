import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import apiFetch, { API_URL } from '../services/apiFetch';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { th } from 'date-fns/locale';
import { format, parseISO } from 'date-fns';

// ─── Component ย่อยสำหรับแสดงตาราง ───
const ReportTable = React.memo(({ data, grandTotal, uniqueLengths, expectedGrades, isFormat2, showFooter }) => {
  const formatGradeLabel = (g) => {
    if (g === 'C_F') return 'C สด';
    return g;
  };

  const allGradesLabel = expectedGrades.map(formatGradeLabel).join('+') + ' (ลูกบาศก์ฟุต)';

  return (
    <div className="overflow-x-auto pb-4">
      <table className="w-full text-[11px] md:text-[12px] border-collapse border border-gray-400 dark:border-gray-600 whitespace-nowrap min-w-max text-center">
        <thead>
          {/* ─── Header แถวที่ 1 ─── */}
          <tr className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-100 font-bold border-y-2 border-gray-500 dark:border-gray-600">
            <th className="border border-gray-400 dark:border-gray-600 p-2 align-middle min-w-[150px]" rowSpan="2">รหัส-ชื่อนายม้า</th>
            {isFormat2 && <th className="border border-gray-400 dark:border-gray-600 p-2 align-middle min-w-[100px]" rowSpan="2">รหัสแผนก</th>}
            
            {expectedGrades.map(g => (
              <th key={g} className="border border-gray-400 dark:border-gray-600 p-2" colSpan={uniqueLengths.length + 1}>
                {formatGradeLabel(g)} (ลูกบาศก์ฟุต)
              </th>
            ))}
            <th className="border border-gray-400 dark:border-gray-600 p-2 bg-gray-400 dark:bg-gray-600" colSpan={uniqueLengths.length + 1}>
              {allGradesLabel}
            </th>
          </tr>

          {/* ─── Header แถวที่ 2: ความยาว ─── */}
          <tr className="bg-gray-200 dark:bg-gray-700/80 text-gray-700 dark:text-gray-200 font-semibold border-b-2 border-gray-400 dark:border-gray-600">
            {expectedGrades.map(g => (
              <React.Fragment key={`${g}-len`}>
                {uniqueLengths.map(l => (
                  <th key={`${g}-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 min-w-[45px]">{l}</th>
                ))}
                <th className="border border-gray-400 dark:border-gray-600 p-1 font-bold min-w-[50px]">รวม</th>
              </React.Fragment>
            ))}
            {/* ฝั่งรวมทั้งหมด */}
            {uniqueLengths.map(l => (
              <th key={`all-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 min-w-[45px] bg-gray-300 dark:bg-gray-600">{l}</th>
            ))}
            <th className="border border-gray-400 dark:border-gray-600 p-1 font-bold bg-gray-400 dark:bg-gray-600 min-w-[50px]">รวม</th>
          </tr>
        </thead>
        
        <tbody className="text-gray-800 dark:text-gray-200">
          {data.length > 0 ? (
            data.map((emp, empIdx) => {
              const saws = Object.values(emp.saws);
              const rowSpan = isFormat2 ? (saws.length * 2) : 2; // 💡 แก้ไข: นับแค่จำนวนชุดเลื่อย
              const empNameDisplay = emp.employee_code ? `${emp.employee_code} ${emp.employee_name}` : emp.employee_name;

              return (
                <React.Fragment key={empIdx}>
                  {isFormat2 ? (
                    <>
                      {/* วนลูปวาดตารางแบบ Format 2 */}
                      {saws.map((saw, sawIdx) => (
                        <React.Fragment key={`saw-${sawIdx}`}>
                          <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                            {sawIdx === 0 && (
                              <td className="border border-gray-400 dark:border-gray-600 p-1.5 px-3 text-left font-semibold text-gray-800 dark:text-amber-100 bg-yellow-50/50 dark:bg-amber-900/20 align-middle" rowSpan={rowSpan}>
                                {empNameDisplay}
                              </td>
                            )}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-left px-2">{saw.saw_name}</td>
                            {/* ... โค้ดส่วนข้อมูลปริมาตรเดิม ... */}
                            {expectedGrades.map(g => (
                              <React.Fragment key={`vol-${g}`}>
                                {uniqueLengths.map(l => (
                                  <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-700 dark:text-gray-200">
                                    {saw.grades[g].lengths[l] > 0 ? saw.grades[g].lengths[l].toFixed(4) : '0.0000'}
                                  </td>
                                ))}
                                <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold bg-gray-50 dark:bg-gray-700/50">
                                  {saw.grades[g].total > 0 ? saw.grades[g].total.toFixed(4) : '0.0000'}
                                </td>
                              </React.Fragment>
                            ))}
                            {uniqueLengths.map(l => (
                              <td key={`all-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-blue-50/30 dark:bg-blue-900/20">
                                {saw.total_all_grades.lengths[l] > 0 ? saw.total_all_grades.lengths[l].toFixed(4) : '0.0000'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold bg-blue-100/50 dark:bg-blue-900/40">
                              {saw.total_all_grades.total > 0 ? saw.total_all_grades.total.toFixed(4) : '0.0000'}
                            </td>
                          </tr>

                          <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400 text-[10px] transition-colors">
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-center bg-gray-50 dark:bg-gray-700/50"></td>
                            {/* ... โค้ดส่วนเปอร์เซ็นต์เดิม ... */}
                            {expectedGrades.map(g => (
                              <React.Fragment key={`pct-${g}`}>
                                {uniqueLengths.map(l => (
                                  <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right">
                                    {saw.grades[g].pcts[l] > 0 ? saw.grades[g].pcts[l].toFixed(2) + '%' : '0.00%'}
                                  </td>
                                ))}
                                <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-gray-50 dark:bg-gray-700/50">
                                  {saw.grades[g].pct_total > 0 ? saw.grades[g].pct_total.toFixed(2) + '%' : '0.00%'}
                                </td>
                              </React.Fragment>
                            ))}
                            {uniqueLengths.map(l => (
                              <td key={`all-pct-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-blue-50/30 dark:bg-blue-900/20">
                                {saw.total_all_grades.pcts[l] > 0 ? saw.total_all_grades.pcts[l].toFixed(2) + '%' : '0.00%'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-blue-100/50 dark:bg-blue-900/40">
                              {saw.total_all_grades.pct_total > 0 ? saw.total_all_grades.pct_total.toFixed(2) + '%' : '0.00%'}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}

                      {/* 💡 แก้ไข: รวมพนักงานคนนี้ ครอบทั้ง 2 บรรทัดและ 2 คอลัมน์ อย่างสมบูรณ์ */}
                      <tr className="bg-[#e2efda] dark:bg-emerald-900/35 font-bold text-gray-800 dark:text-emerald-100 border-t border-gray-400 dark:border-gray-600">
                        <td className="border border-gray-400 dark:border-gray-600 p-1.5 text-center align-middle" colSpan="2" rowSpan="2">รวม</td>
                        {expectedGrades.map(g => (
                          <React.Fragment key={`sum-vol-${g}`}>
                            {uniqueLengths.map(l => (
                              <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right">
                                {emp.summary.grades[g].lengths[l] > 0 ? emp.summary.grades[g].lengths[l].toFixed(4) : '0.0000'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#c6e0b4] dark:bg-emerald-800/50">
                              {emp.summary.grades[g].total > 0 ? emp.summary.grades[g].total.toFixed(4) : '0.0000'}
                            </td>
                          </React.Fragment>
                        ))}
                        {uniqueLengths.map(l => (
                          <td key={`sum-all-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#c6e0b4] dark:bg-emerald-800/50">
                            {emp.summary.total_all_grades.lengths[l] > 0 ? emp.summary.total_all_grades.lengths[l].toFixed(4) : '0.0000'}
                          </td>
                        ))}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#a9d08e] dark:bg-emerald-700/60 text-green-900 dark:text-emerald-100">
                          {emp.summary.total_all_grades.total > 0 ? emp.summary.total_all_grades.total.toFixed(4) : '0.0000'}
                        </td>
                      </tr>
                      <tr className="bg-[#e2efda] dark:bg-emerald-900/35 text-gray-600 dark:text-emerald-200 text-[10px] border-b-2 border-gray-500 dark:border-gray-600">
                        {/* ไม่ต้องใส่ <td> เปล่าแล้ว เพราะโดนครอบ (rowSpan) มาจากด้านบน */}
                        {expectedGrades.map(g => (
                          <React.Fragment key={`sum-pct-${g}`}>
                            {uniqueLengths.map(l => (
                              <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right">
                                {emp.summary.grades[g].pcts[l] > 0 ? emp.summary.grades[g].pcts[l].toFixed(2) + '%' : '0.00%'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-[#c6e0b4] dark:bg-emerald-800/50">
                              {emp.summary.grades[g].pct_total > 0 ? emp.summary.grades[g].pct_total.toFixed(2) + '%' : '0.00%'}
                            </td>
                          </React.Fragment>
                        ))}
                        {uniqueLengths.map(l => (
                          <td key={`sum-all-pct-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#c6e0b4] dark:bg-emerald-800/50">
                            {emp.summary.total_all_grades.pcts[l] > 0 ? emp.summary.total_all_grades.pcts[l].toFixed(2) + '%' : '0.00%'}
                          </td>
                        ))}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-[#a9d08e] dark:bg-emerald-700/60 text-green-900 dark:text-emerald-100">
                          {emp.summary.total_all_grades.pct_total > 0 ? emp.summary.total_all_grades.pct_total.toFixed(2) + '%' : '0.00%'}
                        </td>
                      </tr>
                    </>
                  ) : (
                    // ... (ส่วน Format 1 คงเดิมทั้งหมด)
                    <>
                      <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                        <td className="border border-gray-400 dark:border-gray-600 p-1.5 px-3 text-left font-medium text-gray-700 dark:text-gray-200 align-middle" rowSpan="2">
                          {empNameDisplay}
                        </td>
                        {expectedGrades.map(g => (
                          <React.Fragment key={`f1-vol-${g}`}>
                            {uniqueLengths.map(l => (
                              <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-800 dark:text-gray-200">
                                {emp.summary.grades[g].lengths[l] > 0 ? emp.summary.grades[g].lengths[l].toFixed(4) : '0.0000'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700/50">
                              {emp.summary.grades[g].total > 0 ? emp.summary.grades[g].total.toFixed(4) : '0.0000'}
                            </td>
                          </React.Fragment>
                        ))}
                        {uniqueLengths.map(l => (
                          <td key={`f1-all-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right text-blue-900 dark:text-blue-300 font-medium bg-blue-50/30 dark:bg-blue-900/20">
                            {emp.summary.total_all_grades.lengths[l] > 0 ? emp.summary.total_all_grades.lengths[l].toFixed(4) : '0.0000'}
                          </td>
                        ))}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-bold text-blue-900 dark:text-blue-200 bg-blue-100/50 dark:bg-blue-900/40">
                          {emp.summary.total_all_grades.total > 0 ? emp.summary.total_all_grades.total.toFixed(4) : '0.0000'}
                        </td>
                      </tr>
                      <tr className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 text-gray-500 dark:text-gray-400 text-[10px] transition-colors">
                        {expectedGrades.map(g => (
                          <React.Fragment key={`f1-pct-${g}`}>
                            {uniqueLengths.map(l => (
                              <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right">
                                {emp.summary.grades[g].pcts[l] > 0 ? emp.summary.grades[g].pcts[l].toFixed(2) + '%' : '0.00%'}
                              </td>
                            ))}
                            <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-gray-50 dark:bg-gray-700/50">
                              {emp.summary.grades[g].pct_total > 0 ? emp.summary.grades[g].pct_total.toFixed(2) + '%' : '0.00%'}
                            </td>
                          </React.Fragment>
                        ))}
                        {uniqueLengths.map(l => (
                          <td key={`f1-all-pct-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-blue-50/30 dark:bg-blue-900/20">
                            {emp.summary.total_all_grades.pcts[l] > 0 ? emp.summary.total_all_grades.pcts[l].toFixed(2) + '%' : '0.00%'}
                          </td>
                        ))}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right font-semibold bg-blue-100/50 dark:bg-blue-900/40">
                          {emp.summary.total_all_grades.pct_total > 0 ? emp.summary.total_all_grades.pct_total.toFixed(2) + '%' : '0.00%'}
                        </td>
                      </tr>
                    </>
                  )}
                </React.Fragment>
              )
            })
          ) : (
            <tr>
              <td colSpan={100} className="border border-gray-400 dark:border-gray-600 p-8 text-center text-gray-500 dark:text-gray-400">
                ไม่พบข้อมูลในช่วงเวลาที่เลือก
              </td>
            </tr>
          )}

          {/* ─── แถวสรุปรวมทั้งหมด (Grand Total) ─── */}
          {showFooter && grandTotal && expectedGrades.length > 0 && (
            <>
              <tr className="bg-gray-300 dark:bg-gray-700 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-600 dark:border-gray-500 text-[12px]">
                <td className="border border-gray-400 dark:border-gray-600 p-2 px-3 text-center tracking-wide align-middle" rowSpan="2" colSpan={isFormat2 ? 2 : 1}>
                  รวมทั้งหมด
                </td>
                {expectedGrades.map(g => (
                  <React.Fragment key={`gt-${g}-vol`}>
                    {uniqueLengths.map(l => (
                      <td key={l} className="border border-gray-400 dark:border-gray-600 p-2 text-right">
                        {grandTotal[g].lengths[l] > 0 ? grandTotal[g].lengths[l].toFixed(4) : '0.0000'}
                      </td>
                    ))}
                    <td className="border border-gray-400 dark:border-gray-600 p-2 text-right bg-gray-400 dark:bg-gray-600">
                      {grandTotal[g].total > 0 ? grandTotal[g].total.toFixed(4) : '0.0000'}
                    </td>
                  </React.Fragment>
                ))}
                {uniqueLengths.map(l => (
                  <td key={`gt-all-${l}`} className="border border-gray-400 dark:border-gray-600 p-2 text-right bg-blue-200 dark:bg-blue-900/50">
                    {grandTotal['ALL'].lengths[l] > 0 ? grandTotal['ALL'].lengths[l].toFixed(4) : '0.0000'}
                  </td>
                ))}
                <td className="border border-gray-400 dark:border-gray-600 p-2 text-right bg-blue-300 dark:bg-blue-800/60 text-blue-900 dark:text-blue-100">
                  {grandTotal['ALL'].total > 0 ? grandTotal['ALL'].total.toFixed(4) : '0.0000'}
                </td>
              </tr>
              <tr className="bg-gray-200 dark:bg-gray-700/80 font-semibold text-gray-700 dark:text-gray-200 text-[11px] border-b-2 border-gray-600 dark:border-gray-500">
                {/* ไม่ต้องใส่ <td> เปล่าแล้ว เพราะโดนครอบมาจากด้านบน */}
                {expectedGrades.map(g => (
                  <React.Fragment key={`gt-${g}-pct`}>
                    {uniqueLengths.map(l => (
                      <td key={l} className="border border-gray-400 dark:border-gray-600 p-1 text-right">
                        {grandTotal[g].pcts[l] > 0 ? grandTotal[g].pcts[l].toFixed(2) + '%' : '0.00%'}
                      </td>
                    ))}
                    <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-gray-300 dark:bg-gray-600">
                      {grandTotal[g].pct_total > 0 ? grandTotal[g].pct_total.toFixed(2) + '%' : '0.00%'}
                    </td>
                  </React.Fragment>
                ))}
                {uniqueLengths.map(l => (
                  <td key={`gt-all-pct-${l}`} className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-blue-100 dark:bg-blue-900/35">
                    {grandTotal['ALL'].pcts[l] > 0 ? grandTotal['ALL'].pcts[l].toFixed(2) + '%' : '0.00%'}
                  </td>
                ))}
                <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-blue-200 dark:bg-blue-800/50 text-blue-900 dark:text-blue-100">
                  {grandTotal['ALL'].pct_total > 0 ? grandTotal['ALL'].pct_total.toFixed(2) + '%' : '0.00%'}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
});

export default function SawerPerformanceByLengthReport() {
  const [filters, setFilters] = useState({
    branch_id: '',
    branch_name: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    grade_group: 'AB_C',
    report_format: '1' // 💡 ตัวเลือกรูปแบบ (1 = ปกติ, 2 = แยกแผนก)
  });

  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [uniqueLengths, setUniqueLengths] = useState([]);
  const [expectedGrades, setExpectedGrades] = useState([]);

  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [accessLevel, setAccessLevel] = useState(3);

  const [currentPage, setCurrentPage] = useState(1);
  // กำหนดจำนวนรายการต่อหน้าแยกรูปแบบรายงาน (แบบที่ 1 = 5 คน/หน้า, แบบที่ 2 แยกชุดเลื่อย = 3 คน/หน้า)
  const itemsPerPage = filters.report_format === '2' ? 3 : 10;

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
          if (res.access_level === 1) setFilters(prev => ({ ...prev, branch_id: '', branch_name: '' }));
          else if (validBranches.length > 0) setFilters(prev => ({ ...prev, branch_id: validBranches[0].id, branch_name: validBranches[0].branch_name }));
        }
      } catch (error) { console.error(error); }
    };
    fetchBranches();
    return () => { isMounted = false; };
  }, []);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    if (e.target.name === 'report_format') {
      setCurrentPage(1);
    }
  };
  const handleDateChange = (date, name) => { if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') }); };
  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  const handleSearch = async () => {
    if (!filters.branch_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');

    setIsLoading(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade_group: filters.grade_group,
        report_format: filters.report_format // ส่งตัวเลือกว่าจะเอารูปแบบที่ 2 หรือไม่
      }).toString();

      const res = await apiFetch(`/reports/sawer-performance-length?${q}`);
      
      if (res?.success) {
        setReportData(res.data);
        setGrandTotalData(res.grandTotal);
        setUniqueLengths(res.uniqueLengths);
        setExpectedGrades(res.expectedGrades);
        setCurrentPage(1);
        if (res.data.length === 0) Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลในช่วงเวลาที่เลือก', 'info');
      } else {
        Swal.fire('ข้อผิดพลาด', res?.message || 'ดึงข้อมูลไม่สำเร็จ', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── ฟังก์ชันโหลด PDF (Blob) ───
  const handleExportPDF = async (isPreview = false) => {
    Swal.fire({
      title: 'กำลังสร้างไฟล์ PDF...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade_group: filters.grade_group,
        report_format: filters.report_format,
        branch_name: filters.branch_name
      }).toString();

      const apiUrl = API_URL;
      
      const res = await fetch(`${apiUrl}/reports/sawer-performance-length/pdf?${q}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      Swal.close();

      if (isPreview) {
        window.open(url, '_blank');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.download = `Sawer_Length_${filters.start_date}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    }
  };

  // ─── ฟังก์ชันโหลด Excel (Blob) ───
  const handleExportExcel = async () => {
    Swal.fire({
      title: 'กำลังสร้างไฟล์ Excel...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade_group: filters.grade_group,
        report_format: filters.report_format
      }).toString();

      const apiUrl = API_URL;
      
      const res = await fetch(`${apiUrl}/reports/sawer-performance-length/excel?${q}`, {
        credentials: 'include'
      });

      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      Swal.close();

      const a = document.createElement('a');
      a.href = url;
      a.download = `Sawer_Length_${filters.start_date}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(error);
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
    }
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentData = reportData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reportData.length / itemsPerPage);

  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 print:hidden transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 flex items-center gap-2">
          <i className="fas fa-ruler-horizontal text-blue-600 dark:text-blue-400"></i> รายงานสรุปผลงานนายม้า แยกตามความยาวไม้
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สาขา <span className="text-red-500">*</span></label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              disabled={isLoading || (accessLevel !== 1 && branches.length <= 1)}
              title={accessLevel !== 1 && branches.length <= 1 ? 'คุณมีสิทธิ์เข้าถึงเฉพาะสาขานี้' : ''}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-300 dark:disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-75 transition-colors"
            >
              <option value="" disabled>-- เลือกสาขา --</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่เริ่มต้น <span className="text-red-500">*</span></label>
            <DatePicker selected={filters.start_date ? parseISO(filters.start_date) : null} onChange={(date) => handleDateChange(date, 'start_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" wrapperClassName="w-full"/>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่สิ้นสุด <span className="text-red-500">*</span></label>
            <DatePicker selected={filters.end_date ? parseISO(filters.end_date) : null} onChange={(date) => handleDateChange(date, 'end_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors" wrapperClassName="w-full"/>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">กลุ่มเกรดไม้</label>
            <select name="grade_group" value={filters.grade_group} onChange={handleFilterChange} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold transition-colors">
              <option value="AB_C">- AB, C</option>
              <option value="P_PP">- P, PP</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">รูปแบบรายงาน</label>
            <select name="report_format" value={filters.report_format} onChange={handleFilterChange} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold transition-colors">
              <option value="1">แบบที่ 1 (รวมยอดตามนายม้า)</option>
              <option value="2">แบบที่ 2 (นายม้า + แยกชุดเลื่อย)</option>
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 text-white px-8 py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm min-w-[120px] transition-colors">
            {isLoading ? <><i className="fas fa-spinner fa-spin mr-2"></i>กำลังโหลด...</> : <><i className="fas fa-search mr-2"></i>ดึงข้อมูล</>}
          </button>
          {reportData.length > 0 && (
            <div className="flex gap-2">
              <button onClick={() => handleExportPDF(true)} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-search-plus"></i> ตัวอย่าง PDF
              </button>
              <button onClick={() => handleExportPDF(false)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-pdf"></i> โหลด PDF
              </button>
              <button onClick={handleExportExcel} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2">
                <i className="fas fa-file-excel"></i> โหลด Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {reportData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 pb-6 print:bg-white print:text-black print:border-none print:shadow-none min-h-[900px] flex flex-col justify-between transition-colors duration-300">
          <div>
            <div className="text-center mb-6 pt-6">
              <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">บริษัท วู้ดเวอร์ค จำกัด ({filters.branch_name})</h1>
              <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mt-1">รายงานสรุปผลงานนายม้า แยกตามความยาวไม้</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึง {format(parseISO(filters.end_date), 'dd/MM/yyyy')}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300">กะการทำงาน: ทั้งหมด &nbsp;|&nbsp; กลุ่มเกรดไม้: {filters.grade_group === 'AB_C' ? 'AB, C' : 'P, PP'}</p>
            </div>

            <div className="px-4">
              <ReportTable 
                data={currentData} 
                grandTotal={grandTotalData} 
                uniqueLengths={uniqueLengths}
                expectedGrades={expectedGrades}
                isFormat2={filters.report_format === '2'}
                showFooter={currentPage === totalPages || totalPages === 0} 
              />
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-4 mx-4 print:hidden">
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500">« หน้าแรก</button>
                <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500">‹ ก่อนหน้า</button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">หน้า</span>
                <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md py-1 px-2 text-sm text-blue-700 dark:text-blue-300 font-semibold">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">จาก {totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500">ถัดไป ›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:text-gray-400 dark:disabled:text-gray-500">หน้าสุดท้าย »</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
