const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');
const { protect } = require('../controllers/authController');

router.post('/', protect, likeController.addLike);
router.get('/', likeController.getLikes);

module.exports = router;
