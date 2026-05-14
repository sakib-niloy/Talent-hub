const express = require('express');
const authController = require('../controllers/authController');

const router = express.Router();

// Protected route example (profile)
router.get('/profile', authController.protect, (req, res) => {
  res.json({ message: `Welcome, user ${req.user.id}` });
});

module.exports = router;
