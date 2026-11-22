const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const authController = require('../controllers/authController');
const { createUploader } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimit');

// Hardened multer: image MIME allow-list, size limit, random server-side filenames
const upload = createUploader('photos');

router.post('/upload', authController.protect, uploadLimiter, upload.single('photo'), photoController.uploadPhoto);
router.get('/', photoController.getAllPhotos);
router.get('/timeline', authController.protect, photoController.getUserPhotos);
router.post('/like/:id', authController.protect, photoController.likePhoto);
router.delete('/:id', authController.protect, photoController.deletePhoto);
router.get('/like-status/:id', authController.protect, photoController.getLikeStatus);

module.exports = router;
