// backend/routes/audioRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { Audio, User } = require('../models');  // Make sure Audio is being imported correctly
const { protect } = require('../middleware/authMiddleware');

// Create `uploads/audios` folder if it doesn't exist
const audioUploadsPath = 'uploads/audios';
if (!fs.existsSync(audioUploadsPath)) {
  fs.mkdirSync(audioUploadsPath, { recursive: true });
}

// Multer setup for audio files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioUploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload Audio
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const user_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Log the uploaded file details
    console.log('Uploaded file:', req.file);

    // Log the data being used to create a new audio entry
    console.log('Data for new audio:', {
      user_id,
      title,
      description,
      audio_url: `/uploads/audios/${req.file.filename}`,
    });

    const newAudio = await Audio.create({
      user_id,
      title,
      description,
      audio_url: `/uploads/audios/${req.file.filename}`,
    });

    res.status(200).json({ success: true, audio: newAudio });
  } catch (error) {
    console.error('Error uploading audio:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all audios uploaded by all users
router.get('/all', async (req, res) => {
  try {
    const audios = await Audio.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json({ success: true, audios });
  } catch (error) {
    console.error('Error fetching audios:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Like Audio
router.post('/like/:id', protect, async (req, res) => {
  try {
    const audioId = req.params.id;
    const audio = await Audio.findByPk(audioId);

    if (audio) {
      audio.likes += 1;
      await audio.save();
      res.status(200).json({ success: true, likes: audio.likes });
    } else {
      res.status(404).json({ success: false, message: 'Audio not found' });
    }
  } catch (error) {
    console.error('Error liking audio:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
