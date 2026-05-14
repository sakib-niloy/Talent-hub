const express = require('express');
const videoController = require('../controllers/videoController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/videos/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const router = express.Router();

router.post('/upload', authController.protect, upload.single('video'), videoController.uploadVideo);
router.get('/', videoController.getAllVideos);
router.get('/timeline', authController.protect, videoController.getUserVideos);
router.post('/like/:id', authController.protect, videoController.likeVideo);
router.delete('/:id', authController.protect, videoController.deleteVideo);
router.get('/like-status/:id', authController.protect, videoController.getLikeStatus);

module.exports = router;