// Usage: node scripts/checkUserPassword.js user@example.com
// Reports whether a user exists and has a password set. Never prints the hash.
const db = require('../config/db');

const emailToCheck = process.argv[2] || 'user@example.com';

const sql = 'SELECT email, password FROM users WHERE email = ?';

db.query(sql, [emailToCheck], (err, results) => {
  if (err) {
    console.error('Error querying user:', err.message);
    process.exit(1);
  }
  if (results.length === 0) {
    console.log('No user found with email:', emailToCheck);
  } else {
    console.log('User found:', { email: results[0].email, hasPassword: Boolean(results[0].password) });
  }
  process.exit(0);
});
