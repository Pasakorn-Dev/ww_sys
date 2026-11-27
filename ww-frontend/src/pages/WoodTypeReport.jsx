// ─── 1. ส่วนการนำเข้า (Imports) เครื่องมือต่างๆ ───
import React, { useState, useEffect } from 'react'; // นำเข้าไลบรารี React และ Hook ที่จำเป็น (useState จัดการข้อมูล, useEffect จัดการการโหลดหน้า)
import Swal from 'sweetalert2'; // นำเข้าแพ็กเกจสำหรับทำ Popup แจ้งเตือนสวยงาม
import apiFetch, { API_URL } from '../services/apiFetch'; // นำเข้าฟังก์ชันที่เราเขียนไว้สำหรับยิง API ไปยัง Backend
import DatePicker from 'react-datepicker'; // นำเข้าปฏิทินสำหรับเลือกวันที่
import 'react-datepicker/dist/react-datepicker.css'; // นำเข้าไฟล์ CSS เพื่อให้ปฏิทินแสดงผลได้ถูกต้องและสวยงาม
import { th } from 'date-fns/locale'; // นำเข้าภาษาไทย เพื่อให้ปฏิทินแสดงเดือน/ปีเป็นภาษาไทย
import { format, parseISO } from 'date-fns'; // นำเข้าฟังก์ชันจัดการวันที่ แปลงรูปแบบวันที่ไปมา

// ─── 2. คอมโพเนนต์ลูก: ReportTable (สำหรับวาดตารางโดยเฉพาะ) ───
// ใช้ React.memo เพื่อบอกระบบว่า "ถ้าข้อมูล (props) ที่ส่งมาไม่เปลี่ยน ก็ไม่ต้องเรนเดอร์ตารางใหม่" ช่วยให้เว็บไม่กระตุก
const ReportTable = React.memo(({ data, grandTotal, showGrandTotal, selectedGrade }) => {
  
  // กำหนดชื่อหัวตารางฝั่ง "ปกติ" ถ้าเลือกดูทุกเกรดให้ใช้คำว่า 'ปกติ' แต่ถ้าเลือกเกรดเจาะจงให้ใช้ชื่อเกรดนั้น (เช่น AB)
  const gradeLabel = selectedGrade === 'ALL' ? 'ปกติ' : (selectedGrade || 'AB');
  
  // กำหนดชื่อหัวตารางฝั่ง "พิเศษ" คล้ายๆ ด้านบน แต่ต่อท้ายด้วยคำว่า 'พิเศษ'
  const spcGradeLabel = selectedGrade === 'ALL' ? 'พิเศษ' : `${selectedGrade || 'AB'} พิเศษ`;

  return (
    // สร้างตาราง กำหนดคลาสตกแต่งเส้นขอบ และบังคับไม่ให้ตัวหนังสือตัดขึ้นบรรทัดใหม่ (whitespace-nowrap)
    <table className="w-full text-[11px] md:text-xs border-collapse border border-gray-400 dark:border-gray-600 whitespace-nowrap mt-4">
      
      {/* ─── ส่วนหัวตาราง (Thead) ─── */}
      <thead>
        <tr className="bg-[#9fc5e8] dark:bg-blue-900/70 text-black dark:text-blue-100 font-semibold">
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-center" colSpan="2">ขนาดไม้</th>
          
          {/* หัวคอลัมน์ฝั่งไม้ปกติ */}
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">{gradeLabel}</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">% กว้าง</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">% ยาว</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">ราคาเฉลี่ย</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">จำนวนเงิน</th>
          
          {/* หัวคอลัมน์ฝั่งไม้พิเศษ */}
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">{spcGradeLabel}</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">% กว้าง</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">% ยาว</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">ราคาเฉลี่ย</th>
          <th className="border border-gray-400 dark:border-gray-600 p-2 text-right">จำนวนเงิน</th>
        </tr>
      </thead>
      
      {/* ─── ส่วนเนื้อหาตาราง (Tbody) ─── */}
      <tbody className="text-gray-800 dark:text-gray-200">
        {/* วนลูปชั้นที่ 1: วนลูปตาม "ชุดเลื่อย" (sawGroup) */}
        {data.map((sawGroup, sawIdx) => (
          <React.Fragment key={sawIdx}>
            
            {/* แถบสีน้ำเงินเข้ม แสดงชื่อชุดเลื่อย */}
            <tr className="bg-[#4472c4] dark:bg-blue-950 text-white font-bold border-t-4 border-[#1f3864] dark:border-blue-800">
              <td className="border border-gray-500 dark:border-gray-600 p-2 pl-3 text-left text-[13px]" colSpan="2">{sawGroup.saw_name}</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 pl-3 text-left text-[13px]" colSpan="10">ชุดที่ {sawIdx + 1}</td>
            </tr>

            {/* วนลูปชั้นที่ 2: วนลูปตาม "ความหนา" ภายในชุดเลื่อยนั้นๆ */}
            {sawGroup.thicks.map((thickGroup, thickIdx) => (
              <React.Fragment key={`${sawIdx}-${thickIdx}`}>
                
                {/* แถบสีฟ้าอ่อน แสดงความหนา (เช่น 1.0) */}
                <tr className="bg-[#e6f2ff] dark:bg-sky-900/40 font-bold">
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3 text-blue-900 dark:text-sky-200">ความหนา</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-2 text-blue-900 dark:text-sky-200" colSpan="11">{thickGroup.thick}</td>
                </tr>

                {/* วนลูปชั้นที่ 3: วนลูปตาม "ความยาว" ภายในความหนานั้นๆ */}
                {thickGroup.lengths.map((lenGroup, lenIdx) => (
                  <React.Fragment key={`${sawIdx}-${thickIdx}-${lenIdx}`}>
                    
                    {/* วนลูปชั้นที่ 4: วนลูปรายการรหัสไม้ทั้งหมดออกมาทีละบรรทัด */}
                    {lenGroup.items.map((item, itemIdx) => (
                      <tr key={itemIdx} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-colors">
                        
                        {/* คอลัมน์รหัสไม้: ตัด 2 ตัวอักษรแรกให้เป็นสีแดง ตัวที่เหลือเป็นสีเทา */}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3 font-medium" colSpan="2">
                          <span className="text-red-600 dark:text-red-400 font-bold">{item.wood_code.substring(0, 2)}</span>
                          <span className="text-gray-700 dark:text-gray-300">{item.wood_code.substring(2)}</span>
                        </td>
                        
                        {/* ข้อมูลฝั่งไม้ปกติ (.toFixed(4) คือบังคับจุดทศนิยม 4 ตำแหน่ง) */}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.ab_volumn.toFixed(4)}</td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-400">{item.ab_pct_qty.toFixed(2)}%</td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.ab_price > 0 ? item.ab_price.toFixed(2) : ''}</td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.ab_amt.toFixed(2)}</td>
                        
                        {/* ข้อมูลฝั่งไม้พิเศษ */}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.spc_volumn.toFixed(4)}</td>
                        {/* เช็คก่อนว่ามีปริมาตรพิเศษไหม ถ้ามีค่อยโชว์ % */}
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-400">{item.spc_volumn > 0 ? item.spc_pct_qty.toFixed(2) + '%' : ''}</td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.spc_price > 0 ? item.spc_price.toFixed(2) : ''}</td>
                        <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{item.spc_amt.toFixed(2)}</td>
                      </tr>
                    ))}

                    {/* ─── บรรทัดสรุป: รวมยาว (จะขึ้นมาแสดงหลังวนลูปความยาวเสร็จ) ─── */}
                    <tr className="bg-[#fff2cc] dark:bg-amber-900/35 font-bold text-gray-800 dark:text-amber-100">
                      <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">รวมยาว {lenGroup.length}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{lenGroup.subTotal.ab_volumn.toFixed(4)}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-300">{lenGroup.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-blue-700 dark:text-blue-300">{lenGroup.subTotal.ab_volumn > 0 ? lenGroup.subTotal.ab_pct_amt.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{lenGroup.subTotal.ab_amt.toFixed(2)}</td>
                      
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{lenGroup.subTotal.spc_volumn.toFixed(4)}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-300">{lenGroup.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-blue-700 dark:text-blue-300">{lenGroup.subTotal.spc_volumn > 0 ? lenGroup.subTotal.spc_pct_amt.toFixed(2) + '%' : ''}</td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                      <td className="border border-gray-400 dark:border-gray-600 p-1 text-right">{lenGroup.subTotal.spc_amt.toFixed(2)}</td>
                    </tr>
                  </React.Fragment>
                ))}

                {/* ─── บรรทัดสรุป: รวมหนา (จะขึ้นมาแสดงหลังวนลูปความหนาเสร็จ) ─── */}
                <tr className="bg-[#c6e0b4] dark:bg-emerald-900/40 font-bold text-gray-800 dark:text-emerald-100 border-t-2 border-gray-500 dark:border-gray-600">
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">รวมหนา <span className="text-red-600 dark:text-red-400">{thickGroup.thick}</span></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-green-900 dark:text-emerald-200">{thickGroup.subTotal.ab_volumn.toFixed(4)}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-300">{thickGroup.subTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-green-900 dark:text-emerald-200">{thickGroup.subTotal.ab_amt.toFixed(2)}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-green-900 dark:text-emerald-200">{thickGroup.subTotal.spc_volumn.toFixed(4)}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-gray-600 dark:text-gray-300">{thickGroup.subTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right text-green-900 dark:text-emerald-200">{thickGroup.subTotal.spc_amt.toFixed(2)}</td>
                </tr>

                {/* ─── บรรทัดเปอร์เซ็นต์ (ชุด) รวมพิเศษ ─── */}
                <tr className="bg-white dark:bg-gray-800 font-medium">
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">% ความหนา (ชุด) รวมพิเศษ</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ffe699] dark:bg-amber-800/50 font-bold text-orange-900 dark:text-amber-200">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.pct_thick_all_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ffe699] dark:bg-amber-800/50 font-bold text-orange-900 dark:text-amber-200">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.pct_thick_all_spc.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
                </tr>
                
                {/* ─── บรรทัดเปอร์เซ็นต์ (ชุด) แยก ปกติ,พิเศษ ─── */}
                <tr className="bg-white dark:bg-gray-800 font-medium">
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">% ความหนา (ชุด) แยก ปกติ ,พิเศษ</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f8cbad] dark:bg-orange-900/50 font-bold text-orange-900 dark:text-orange-200">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.pct_thick_sep_ab.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f8cbad] dark:bg-orange-900/50 font-bold text-orange-900 dark:text-orange-200">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.pct_thick_sep_spc.toFixed(2) + '%' : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
                </tr>
                
                {/* ─── บรรทัด ราคาเฉลี่ย ─── */}
                <tr className="bg-white dark:bg-gray-800 font-medium border-b-4 border-gray-400 dark:border-gray-600">
                  <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">ราคาเฉลี่ย</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ff0000] dark:bg-red-700 font-bold text-white">{thickGroup.subTotal.ab_volumn > 0 ? thickGroup.avg_price_ab.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ff0000] dark:bg-red-700 font-bold text-white">{thickGroup.subTotal.spc_volumn > 0 ? thickGroup.avg_price_spc.toFixed(2) : ''}</td>
                  <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
                </tr>
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}

        {/* ─── ส่วนสรุป Grand Total (ยอดรวมทั้งหมดทั้งรายงาน) ─── */}
        {/* เช็คเงื่อนไข: จะโชว์ส่วนนี้ก็ต่อเมื่อถูกสั่งให้โชว์ (showGrandTotal เป็น true) และมีข้อมูล (grandTotal ไม่ว่าง) */}
        {showGrandTotal && grandTotal && (
          <React.Fragment>
            <tr className="bg-[#a9d08e] dark:bg-emerald-900/60 font-bold text-gray-900 dark:text-emerald-100 border-t-4 border-gray-700 dark:border-gray-500">
              <td className="border border-gray-500 dark:border-gray-600 p-2 pl-3 text-left text-[13px]" colSpan="2">รวมทั้งหมดทั้งรายงาน</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right">{grandTotal.ab_volumn.toFixed(4)}</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right text-gray-700 dark:text-gray-200">{grandTotal.ab_volumn > 0 ? '100.00%' : ''}</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right">{grandTotal.ab_amt.toFixed(2)}</td>
              
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right">{grandTotal.spc_volumn.toFixed(4)}</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right text-gray-700 dark:text-gray-200">{grandTotal.spc_volumn > 0 ? '100.00%' : ''}</td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-500 dark:border-gray-600 p-2 text-right">{grandTotal.spc_amt.toFixed(2)}</td>
            </tr>

            <tr className="bg-white dark:bg-gray-800 font-medium">
              <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">% รวมทั้งหมด รวมพิเศษ</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ffe699] dark:bg-amber-800/50 font-bold text-orange-900 dark:text-amber-200">{grandTotal.ab_volumn > 0 ? grandTotal.pct_all_ab.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ffe699] dark:bg-amber-800/50 font-bold text-orange-900 dark:text-amber-200">{grandTotal.spc_volumn > 0 ? grandTotal.pct_all_spc.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
            </tr>

            <tr className="bg-white dark:bg-gray-800 font-medium">
              <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">% รวมทั้งหมด แยก ปกติ ,พิเศษ</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f8cbad] dark:bg-orange-900/50 font-bold text-orange-900 dark:text-orange-200">{grandTotal.ab_volumn > 0 ? grandTotal.pct_sep_ab.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#f8cbad] dark:bg-orange-900/50 font-bold text-orange-900 dark:text-orange-200">{grandTotal.spc_volumn > 0 ? grandTotal.pct_sep_spc.toFixed(2) + '%' : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
            </tr>

            <tr className="bg-white dark:bg-gray-800 font-medium border-b-4 border-gray-700 dark:border-gray-500">
              <td className="border border-gray-400 dark:border-gray-600 p-1 pl-3" colSpan="2">ราคาเฉลี่ยรวมทั้งหมด</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ff0000] dark:bg-red-700 font-bold text-white">{grandTotal.ab_volumn > 0 ? grandTotal.avg_price_ab.toFixed(2) : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="4"></td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 text-right bg-[#ff0000] dark:bg-red-700 font-bold text-white">{grandTotal.spc_volumn > 0 ? grandTotal.avg_price_spc.toFixed(2) : ''}</td>
              <td className="border border-gray-400 dark:border-gray-600 p-1 bg-[#f2f2f2] dark:bg-gray-700/50" colSpan="3"></td>
            </tr>
          </React.Fragment>
        )}
      </tbody>
    </table>
  );
});

// ─── 3. คอมโพเนนต์หลัก: WoodTypeReport (ส่วนนี้จัดการการทำงานทั้งหมด) ───
export default function WoodTypeReport() {
  
  // สร้าง State เก็บเงื่อนไขการค้นหา (ค่าเริ่มต้นของวันที่ คือวันที่ปัจจุบัน)
  const [filters, setFilters] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    branch_id: '',
    branch_name: '',
    grade: 'AB' // ค่าเริ่มต้นของเกรดไม้ คือ AB
  });

  // สร้าง State สำหรับเก็บข้อมูลรายงาน และสาขา
  const [reportData, setReportData] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState(null);
  const [branches, setBranches] = useState([]);
  
  // สร้าง State ไว้จัดการสถานะปุ่ม (ป้องกันผู้ใช้กดรัวๆ ระหว่างรอโหลด)
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  
  // สร้าง State จัดการระบบแบ่งหน้า (Pagination)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 1; // กำหนดให้โชว์ข้อมูล 2 ชุดเลื่อย ต่อ 1 หน้า

  // จังหวะเริ่มเปิดหน้าเว็บ: ให้ไปดึงรายชื่อสาขาจาก API ทันที
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const res = await apiFetch(`/branches/allowed?menu=${window.location.pathname}`);
        if (res?.success && res.data.length > 0) {
          setBranches(res.data);
          // ตั้งให้สาขาแรกที่โหลดมาได้ เป็นค่า Default ทันที
          setFilters(prev => ({ ...prev, branch_id: res.data[0].id, branch_name: res.data[0].branch_name }));
        }
      } catch (error) {
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถดึงข้อมูลสาขาได้', 'error');
      }
    };
    fetchBranches();
  }, []); // [] หมายถึงสั่งให้ทำงานแค่ครั้งเดียวตอนโหลด

  // ─── ฟังก์ชันอัปเดตค่าเมื่อผู้ใช้เปลี่ยนแปลงเงื่อนไข ───

  // อัปเดตปฏิทิน
  const handleDateChange = (date, name) => {
    if (date) setFilters({ ...filters, [name]: format(date, 'yyyy-MM-dd') });
  };

  // อัปเดตเมื่อเลือกสาขา (เก็บทั้ง ID และชื่อสาขาไว้แสดงบนหัวกระดาษ)
  const handleBranchChange = (e) => {
    const selectedIndex = e.target.options.selectedIndex;
    const branchName = e.target.options[selectedIndex].text;
    setFilters({ ...filters, branch_id: e.target.value, branch_name: branchName });
  };

  // อัปเดตเมื่อเปลี่ยนเกรดไม้
  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  // ─── ฟังก์ชันปุ่ม "ดึงข้อมูล" ───
  const handleSearch = async () => {
    if (!filters.branch_id) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกสาขาก่อนค้นหา', 'warning');

    setIsLoading(true); // ปรับปุ่มเป็นสถานะกำลังโหลด
    try {
      // แปลงเงื่อนไขใน state filters เป็น Query String ท้าย URL
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade // ส่งเกรดไม้ไปด้วย
      }).toString();

      const res = await apiFetch(`/reports/wood-type-ab?${q}`);
      if (res?.success) {
        setReportData(res.data); // นำข้อมูลไปเก็บไว้วาดตาราง
        setGrandTotalData(res.grandTotal); // นำยอดรวมไปเก็บแยกไว้
        setCurrentPage(1); // หากหาข้อมูลใหม่ ให้กลับไปหน้า 1 เสมอ
        if (res.data.length === 0) Swal.fire('แจ้งเตือน', 'ไม่พบข้อมูลของสาขาและวันที่เลือก', 'info');
      }
    } catch (error) {
      Swal.fire('Error', 'ดึงข้อมูลล้มเหลว', 'error');
    } finally {
      setIsLoading(false); // ปลดล็อกปุ่ม
    }
  };

  // ─── ฟังก์ชันปุ่ม "Export PDF" ───
  const handleExportPDF = async () => {
    // โชว์ SweetAlert ว่ากำลังประมวลผล เพื่อไม่ให้ลูกค้ารู้สึกว่าระบบค้าง
    Swal.fire({
      title: 'กำลังสร้างไฟล์ PDF...',
      html: 'กรุณารอสักครู่ ระบบกำลังประมวลผลข้อมูล',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    setIsExportingPDF(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade
      }).toString();

      // ขอไฟล์แบบ Blob (ก้อนข้อมูลไบนารี) จาก Backend
      const res = await fetch(`${API_URL}/reports/wood-type-ab/pdf?${q}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      
      const blob = await res.blob();
      // สั่งเปิดแท็บใหม่ และโยนไฟล์ PDF เข้าไปโชว์
      window.open(window.URL.createObjectURL(blob), '_blank'); 

      Swal.close(); // ปิดหน้าต่างโหลด
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ PDF ได้', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // ─── ฟังก์ชันปุ่ม "Export Excel" ───
  const handleExportExcel = async () => {
    setIsExportingExcel(true);
    try {
      const q = new URLSearchParams({
        start_date: filters.start_date,
        end_date: filters.end_date,
        branch_id: filters.branch_id,
        grade: filters.grade
      }).toString();

      const res = await fetch(`${API_URL}/reports/wood-type-ab/excel?${q}`, {
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to generate Excel');
      
      const blob = await res.blob();
      
      // วิธีมาตรฐานในการสั่งเบราว์เซอร์ให้ดาวน์โหลดไฟล์
      const a = document.createElement('a'); // สร้าง element <a> จำลอง
      a.href = window.URL.createObjectURL(blob); // ใส่ลิงก์ของ Blob
      a.download = `Wood_Type_${filters.grade}_Report_${filters.start_date}.xlsx`; // ตั้งชื่อไฟล์ให้ตรงกับเกรดและวันที่
      document.body.appendChild(a);
      a.click(); // สั่งคลิกจำลองเพื่อดาวน์โหลด
      a.remove(); // ลบลิงก์จำลองทิ้ง
    } catch (error) {
      Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างไฟล์ Excel ได้', 'error');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // ─── คำนวณตรรกะการแบ่งหน้า (Pagination Math) ───
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // ตัดข้อมูลก้อนใหญ่ ออกมาเฉพาะข้อมูลที่ต้องโชว์ในหน้านี้ (currentData)
  const currentData = reportData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(reportData.length / itemsPerPage);

  // ─── 4. ส่วนการวาดหน้าจอ (Render UI) ───
  return (
    <div className="p-4 md:p-6 mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      
      {/* ─── กล่องเครื่องมือกรองข้อมูล (Filter Box) ─── */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6 print:hidden transition-colors duration-300">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">ค้นหารายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* ช่องเลือกสาขา */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">สาขา</label>
            <select
              name="branch_id"
              value={filters.branch_id}
              onChange={handleBranchChange}
              disabled={branches.filter(b => b.id !== 0).length <= 1}
              title={branches.filter(b => b.id !== 0).length <= 1 ? 'คุณมีสิทธิ์เข้าถึงเฉพาะสาขานี้' : ''}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:border-gray-300 dark:disabled:border-gray-700 disabled:cursor-not-allowed disabled:opacity-75 transition-colors"
            >
              {branches.length > 0 ? (
                branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.branch_name}</option>
                ))
              ) : (
                <option value="">กำลังโหลด...</option>
              )}
            </select>
          </div>

          {/* ช่องปฏิทิน วันที่เริ่มต้น */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่เริ่มต้น</label>
            <DatePicker selected={filters.start_date ? parseISO(filters.start_date) : null} onChange={(date) => handleDateChange(date, 'start_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors" />
          </div>

          {/* ช่องปฏิทิน วันที่สิ้นสุด */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">วันที่สิ้นสุด</label>
            <DatePicker selected={filters.end_date ? parseISO(filters.end_date) : null} onChange={(date) => handleDateChange(date, 'end_date')} dateFormat="dd/MM/yyyy" locale={th} className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500 transition-colors" />
          </div>

          {/* ช่องเลือกเกรดไม้ */}
          <div className="flex flex-col">
            <label className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">เกรดไม้</label>
            <select
              name="grade"
              value={filters.grade}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-md p-2 text-sm outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-colors"
            >
              <option value="AB">AB</option>
              <option value="C">C</option>
              <option value="P">P</option>
              <option value="PP">PP</option>
              <option value="ALL">รวมทุกเกรด</option>
            </select>
          </div>

          {/* ปุ่มดึงข้อมูล */}
          <div className="flex items-end gap-2 md:col-span-1">
            <button onClick={handleSearch} disabled={isLoading} className="bg-blue-600 text-white w-full py-2 rounded-md text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all flex items-center justify-center">
              {isLoading ? 'กำลังโหลด...' : 'ดึงข้อมูล'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── กล่องแสดงผลตาราง (โชว์เมื่อ reportData มีข้อมูล) ─── */}
      {reportData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto pb-6 print:bg-white print:text-black transition-colors duration-300">
          
          {/* ปุ่ม Export 2 ปุ่ม ไว้มุมขวาบน (จะซ่อนปุ่มอัตโนมัติตอนกดพิมพ์ เพราะใส่ class print:hidden) */}
          <div className="flex justify-end gap-3 px-6 pt-6 print:hidden">
            <button onClick={handleExportPDF} disabled={isExportingPDF} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingPDF ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-red-500 hover:bg-red-600 text-white'}`}>
              <i className="fas fa-file-pdf"></i> {isExportingPDF ? 'กำลังสร้าง PDF...' : 'ตัวอย่าง PDF'}
            </button>
            <button onClick={handleExportExcel} disabled={isExportingExcel} className={`px-4 py-2 rounded-md text-sm font-semibold shadow-sm flex items-center gap-2 transition-all ${isExportingExcel ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
              <i className="fas fa-file-excel"></i> {isExportingExcel ? 'กำลังสร้าง Excel...' : 'โหลด Excel'}
            </button>
          </div>

          {/* หัวกระดาษของรายงาน โชว์ข้อความต่างๆ ที่ผู้ใช้เลือก */}
          <div className="text-center mb-6 pt-2">
            <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">บริษัท วู้ดเวอร์ค จำกัด ({filters.branch_name})</h1>
            <h2 className="text-md font-semibold text-gray-700 dark:text-gray-200 mt-1">รายงานการเบิกจ่ายแยกตาม ประเภทไม้</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">ตั้งแต่วันที่ {format(parseISO(filters.start_date), 'dd/MM/yyyy')} ถึงวันที่ {format(parseISO(filters.end_date), 'dd/MM/yyyy')}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">เกรดไม้: <span className="font-semibold text-blue-600 dark:text-blue-400">{filters.grade === 'ALL' ? 'ทั้งหมด' : filters.grade}</span></p>
          </div>

          {/* ─── เรียกใช้งาน Component ตารางที่เราสร้างแยกไว้ข้างบน ─── */}
          <ReportTable 
            data={currentData} // โยนข้อมูลไปแค่นี้ (ข้อมูลหน้าปัจจุบัน) ไม่ได้โยนทั้งหมด
            grandTotal={grandTotalData} 
            // เช็คว่า โชว์ Grand Total เฉพาะหน้าสุดท้าย หรือตอนที่มี 0 หน้า
            showGrandTotal={currentPage === totalPages || totalPages === 0} 
            selectedGrade={filters.grade}
          />

          {/* ─── แถบควบคุมหน้า (Pagination) ด้านล่างตาราง ─── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sm:px-6 mt-4 print:hidden">
              <div className="flex flex-wrap justify-between items-center w-full gap-4">
                
                {/* กลุ่มปุ่มย้อนกลับ (หน้าแรก / ก่อนหน้า) */}
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>« หน้าแรก</button>
                  <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === 1 ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>‹ ก่อนหน้า</button>
                </div>

                {/* Dropdown เปลี่ยนหน้าตรงกลาง */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">หน้า</span>
                  <select value={currentPage} onChange={(e) => setCurrentPage(Number(e.target.value))} className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md py-1 px-2 text-sm outline-none focus:border-blue-500 font-semibold text-blue-700 dark:text-blue-300">
                    {/* เอาจำนวนหน้ามาวนลูปสร้างตัวเลือก <option> */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (<option key={page} value={page}>{page}</option>))}
                  </select>
                  <span className="text-sm text-gray-700 dark:text-gray-300">จาก {totalPages}</span>
                </div>

                {/* กลุ่มปุ่มไปข้างหน้า (ถัดไป / หน้าสุดท้าย) */}
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>ถัดไป ›</button>
                  <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className={`px-3 py-2 text-sm font-medium rounded-md ${currentPage === totalPages ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'}`}>หน้าสุดท้าย »</button>
                </div>
                
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
