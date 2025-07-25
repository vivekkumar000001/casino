const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'sql12.freesqldatabase.com',
  user: process.env.DB_USER || 'sql12791866',
  password: process.env.DB_PASSWORD || 'vaEFIFXIM2',
  database: process.env.DB_NAME || 'sql12791866',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ MySQL connected successfully');
    connection.release();
  } catch (err) {
    console.error('❌ Error connecting to MySQL:', err);
  }
})();

module.exports = db;
