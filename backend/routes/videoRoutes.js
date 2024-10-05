// backend/routes/videoRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const Video = require('../models/videoModel');
const { protect } = require('../middleware/authMiddleware');

// Create `uploads/videos` folder if it doesn't exist
const videoUploadsPath = 'uploads/videos';
if (!fs.existsSync(videoUploadsPath)) {
  fs.mkdirSync(videoUploadsPath, { recursive: true });
}

// Multer setup for video files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoUploadsPath); // Save in `uploads/videos`
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload Video
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const user_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const newVideo = await Video.create({
      user_id,
      title,
      description,
      video_url: `/uploads/videos/${req.file.filename}`,
    });

    res.status(200).json({ success: true, video: newVideo });
  } catch (error) {
    console.error('Error uploading video:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all videos for the current user
router.get('/', protect, async (req, res) => {
  try {
    const videos = await Video.findAll({ where: { user_id: req.user.id } });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    console.error('Error fetching videos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
