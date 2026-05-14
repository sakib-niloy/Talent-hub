const express = require('express');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/adminMiddleware');
const { protect } = require('../controllers/authController');

const router = express.Router();

router.use(protect, isAdmin); // Protect all admin routes

router.delete('/content/:type/:id', adminController.deleteContent);
router.put('/block/:userId', adminController.blockUser);

module.exports = router;
