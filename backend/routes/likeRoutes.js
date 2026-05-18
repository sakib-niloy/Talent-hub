const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const { protect } = require('../controllers/authController');

router.post('/', protect, likeController.toggleLike);
router.get('/', likeController.getLikes);
router.get('/status', protect, likeController.checkStatus);

module.exports = router;
