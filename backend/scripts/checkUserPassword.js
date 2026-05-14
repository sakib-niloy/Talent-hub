const db = require('../config/db');

const emailToCheck = 'user@example.com';

const sql = 'SELECT email, password FROM users WHERE email = ?';

db.query(sql, [emailToCheck], (err, results) => {
  if (err) {
    console.error('Error querying user:', err);
    process.exit(1);
  }
  if (results.length === 0) {
    console.log('No user found with email:', emailToCheck);
  } else {
    console.log('User found:', results[0]);
  }
  process.exit(0);
});