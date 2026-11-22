const express = require('express');
const videoController = require('../controllers/videoController');
const authController = require('../controllers/authController');
const { createUploader } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');

// Hardened multer: video MIME allow-list, size limit, random server-side filenames
const upload = createUploader('videos');

const router = express.Router();

router.post('/upload', authController.protect, uploadLimiter, upload.single('video'), videoController.uploadVideo);
router.get('/', videoController.getAllVideos);
router.get('/timeline', authController.protect, videoController.getUserVideos);
router.post('/like/:id', authController.protect, videoController.likeVideo);
router.delete('/:id', authController.protect, videoController.deleteVideo);
router.get('/like-status/:id', authController.protect, videoController.getLikeStatus);

module.exports = router;
