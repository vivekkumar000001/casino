const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: process.env.DB_HOST || 'mysql-vivek.alwaysdata.net',
  user: process.env.DB_USER || 'vivek_vivek',
  password: process.env.DB_PASSWORD || 'V7462881297v',
  database: process.env.DB_NAME || 'vivek_vivek',
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
