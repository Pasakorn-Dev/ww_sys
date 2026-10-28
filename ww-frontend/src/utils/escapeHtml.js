// src/utils/escapeHtml.js
// escape ข้อความก่อนใส่ใน HTML string (ใช้กับ Swal `html:` และ template string อื่น ๆ)
export default function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
