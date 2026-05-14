const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const photoController = require('../controllers/photoController');
const authController = require('../controllers/authController');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/photos/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

router.post('/upload', authController.protect, upload.single('photo'), photoController.uploadPhoto);
router.get('/', photoController.getAllPhotos);
router.get('/timeline', authController.protect, photoController.getUserPhotos);
router.post('/like/:id', authController.protect, photoController.likePhoto);
router.delete('/:id', authController.protect, photoController.deletePhoto);
router.get('/like-status/:id', authController.protect, photoController.getLikeStatus);

module.exports = router;
