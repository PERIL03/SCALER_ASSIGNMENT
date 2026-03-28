const mysql = require("mysql2/promise");
require("dotenv").config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: true,
  multipleStatements: true,
});

async function query(text, params = []) {
  const [rows] = await pool.query(text, params);
  return rows;
}

module.exports = {
  pool,
  query,
};
