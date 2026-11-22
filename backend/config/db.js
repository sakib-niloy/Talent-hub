// Raw mysql2 connection used only by the maintenance scripts in backend/scripts.
const mysql = require('mysql2');
const config = require('./env');

const connection = mysql.createConnection({
  host: config.DB_HOST,
  port: config.DB_PORT,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  database: config.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the MySQL database:', err.message);
    return;
  }
  console.log('Connected to the MySQL database');
});

module.exports = connection;
