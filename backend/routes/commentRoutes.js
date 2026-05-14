const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const authController = require('../controllers/authController');

// Add a comment (protected)
router.post('/', authController.protect, commentController.addComment);
// Get comments for a content item
router.get('/', commentController.getComments);

module.exports = router; 