const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

let dbPool;

// Initialize Database connection and create schema
async function initializeDatabase() {
  try {
    // 1. First connection without a specific DB to ensure the DB itself exists
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
    });

    const dbName = process.env.DB_NAME || 'attendance_db';
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Create a re-usable Connection Pool targeting our specific database
    dbPool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: "attendance_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // 3. Create the attendance table if it doesn't exist yet
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS records (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status ENUM('Present', 'Absent') NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;
    await dbPool.query(createTableQuery);
    console.log(`Successfully connected to MySQL database: "${dbName}"`);

  } catch (error) {
    console.error('❌ MySQL Initialization Error Details:');
    console.error(error.message);
    process.exit(1);
  }
}

// ==========================================
// API ROUTES
// ==========================================

/**
 * @route   GET /api/attendance
 * @desc    Fetch all records ordered by newest first
 */
app.get('/api/attendance', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM records ORDER BY createdAt DESC');
    
    // Express / MySQL maps rows directly into objects. 
    // We remap the 'id' to '_id' to remain fully compatible with your existing React keys!
    const formattedRows = rows.map(row => ({
      _id: row.id,
      name: row.name,
      status: row.status,
      createdAt: row.createdAt
    }));

    return res.status(200).json(formattedRows);
  } catch (error) {
    console.error('Error fetching logs:', error.message);
    return res.status(500).json({ error: 'Failed to retrieve attendance logs' });
  }
});

/**
 * @route   POST /api/attendance
 * @desc    Submit check-in selection (Present or Absent)
 */
app.post('/api/attendance', async (req, res) => {
  const { name, status } = req.body;

  // Validation validation
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'A valid name string must be provided.' });
  }
  if (!status || !['Present', 'Absent'].includes(status)) {
    return res.status(400).json({ error: 'Status must match either "Present" or "Absent".' });
  }

  try {
    const trimmedName = name.trim();
    
    // Insert record into MySQL
    const [result] = await dbPool.query(
      'INSERT INTO records (name, status) VALUES (?, ?)', 
      [trimmedName, status]
    );

    // Fetch the newly inserted record to return to frontend
    const [newRow] = await dbPool.query('SELECT * FROM records WHERE id = ?', [result.insertId]);

    // Format output to be immediately understood by React
    const savedRecord = {
      _id: newRow[0].id,
      name: newRow[0].name,
      status: newRow[0].status,
      createdAt: newRow[0].createdAt
    };

    return res.status(201).json(savedRecord);
  } catch (error) {
    console.error('Error saving log:', error.message);
    return res.status(500).json({ error: 'Failed to save attendance log' });
  }
});

// ==========================================
// SERVER INITIALIZATION
// ==========================================
const PORT = process.env.PORT || 5000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Attendance service running smoothly on http://localhost:${PORT}`);
  });
});
