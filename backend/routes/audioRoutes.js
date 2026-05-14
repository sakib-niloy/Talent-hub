const express = require('express');
const audioController = require('../controllers/audioController');
const authController = require('../controllers/authController');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/audios/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

const router = express.Router();

router.post('/upload', authController.protect, upload.single('audio'), audioController.uploadAudio);
router.get('/', audioController.getAllAudios);
router.get('/timeline', authController.protect, audioController.getUserAudios);
router.post('/like/:id', authController.protect, audioController.likeAudio);
router.delete('/:id', authController.protect, audioController.deleteAudio);
router.get('/like-status/:id', authController.protect, audioController.getLikeStatus);

module.exports = router;
