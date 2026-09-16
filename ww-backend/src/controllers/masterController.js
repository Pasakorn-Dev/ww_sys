const pool = require('../config/db');

const masterController = {
  // ดึงหมวดหมู่ทั้งหมด
  getCategories: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching categories:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ดึงซัพพลายเออร์ทั้งหมด
  getSuppliers: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, name FROM suppliers WHERE is_active = true ORDER BY name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // ดึงหน่วยนับทั้งหมด
  getUnits: async (req, res) => {
    try {
      const { rows } = await pool.query('SELECT id, unit_name FROM units WHERE is_active = true ORDER BY unit_name ASC');
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error('Error fetching units:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = masterController;