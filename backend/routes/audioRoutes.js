const express = require('express');
const audioController = require('../controllers/audioController');
const authController = require('../controllers/authController');
const { createUploader } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');

// Hardened multer: audio MIME allow-list, size limit, random server-side filenames
const upload = createUploader('audios');

const router = express.Router();

router.post('/upload', authController.protect, uploadLimiter, upload.single('audio'), audioController.uploadAudio);
router.get('/', audioController.getAllAudios);
router.get('/timeline', authController.protect, audioController.getUserAudios);
router.post('/like/:id', authController.protect, audioController.likeAudio);
router.delete('/:id', authController.protect, audioController.deleteAudio);
router.get('/like-status/:id', authController.protect, audioController.getLikeStatus);

module.exports = router;
