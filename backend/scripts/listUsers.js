const db = require('../config/db');

const sql = 'SELECT email FROM users LIMIT 10';

db.query(sql, (err, results) => {
  if (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
  console.log('Users:', results);
  process.exit(0);
});