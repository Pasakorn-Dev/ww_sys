const pool = require('../config/db');

const masterOptionsController = {
  getOptions: async (req, res) => {
    const { branch_id } = req.query;
    
    if (!branch_id) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุสาขา' });
    }

    try {
      // 💡 ใช้ Promise.all เพื่อดึงข้อมูลทุกตารางพร้อมกัน (ประหยัดเวลา)
      // หมายเหตุ: เราใช้ old_id เป็น value เพราะตาราง transaction เก็บค่าอ้างอิงเป็น old_id
      const [
        txTypes, logWoodTypes, logWoodEvalSizes, truckCompanies, sawTimes, sawWoodTypes
      ] = await Promise.all([
        pool.query(`SELECT old_id as id, name FROM master_transaction_types WHERE branch_id = $1 ORDER BY old_id`, [branch_id]),
        pool.query(`SELECT old_id as id, name FROM master_log_wood_types WHERE branch_id = $1 AND is_active = true ORDER BY old_id`, [branch_id]),
        pool.query(`SELECT old_id as id, name FROM master_log_wood_eval_sizes WHERE branch_id = $1 AND is_active = true ORDER BY old_id`, [branch_id]),
        pool.query(`SELECT old_id as id, name, code FROM master_truck_companies WHERE branch_id = $1 ORDER BY old_id`, [branch_id]),
        pool.query(`SELECT old_id as id, time_name as name FROM master_saw_times WHERE branch_id = $1 ORDER BY old_id`, [branch_id]),
        pool.query(`SELECT old_id as id, name, code FROM master_saw_wood_types WHERE branch_id = $1 ORDER BY old_id`, [branch_id]),
      ]);

      res.json({
        success: true,
        data: {
          transactionTypes: txTypes.rows,
          logWoodTypes: logWoodTypes.rows,
          logWoodEvalSizes: logWoodEvalSizes.rows,
          truckCompanies: truckCompanies.rows,
          sawTimes: sawTimes.rows,
          sawWoodTypes: sawWoodTypes.rows
        }
      });
    } catch (error) {
      console.error('Fetch Master Options Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตัวเลือก' });
    }
  },

  // 1. เพิ่มฟังก์ชันดึงกลุ่มผู้ใช้งาน (Groups)
  getGroups: async (req, res) => {
    try {
      // อ้างอิงจากโครงสร้างตาราง user_groups[cite: 1]
      const query = `SELECT id, group_name FROM public.user_groups ORDER BY id ASC`;
      const { rows } = await pool.query(query);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Fetch Groups Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลกลุ่มผู้ใช้งาน' });
    }
  },

  // 2. เพิ่มฟังก์ชันดึงแผนก (Departments)
  getDepartments: async (req, res) => {
    try {
      // อ้างอิงจากโครงสร้าง FK fk_users_dept ที่ชี้ไปที่ตาราง departments[cite: 1]
      // สมมติว่ามีคอลัมน์ id และ dept_name
      const query = `SELECT id, dept_name FROM public.departments ORDER BY dept_name ASC`;
      const { rows } = await pool.query(query);
      res.json({ success: true, data: rows });
    } catch (error) {
      console.error('Fetch Departments Error:', error);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในการดึงข้อมูลแผนก' });
    }
  }
};

module.exports = masterOptionsController;