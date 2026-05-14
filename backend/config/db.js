// backend/config/db.js
const mysql = require('mysql2');  // Ensure you are using mysql2 package
const dotenv = require('dotenv');

dotenv.config();  // Load environment variables from .env file

// Create a connection to the MySQL database using environment variables
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Connect to the database
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to the MySQL database:', err.message); // Log the error message for debugging
    return;
  }
  console.log('Connected to the MySQL database'); // Successful connection message
});

module.exports = connection;  // Export the connection object
