// // backend/routes/photoRoutes.js

// const express = require('express');
// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');
// const router = express.Router();
// const { Photo, User } = require('../models');
// const { protect } = require('../middleware/authMiddleware');

// // Create `uploads/photos` folder if it doesn't exist
// const photoUploadsPath = 'uploads/photos';
// if (!fs.existsSync(photoUploadsPath)) {
//   fs.mkdirSync(photoUploadsPath, { recursive: true });
// }

// // Multer setup
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, photoUploadsPath);
//   },
//   filename: (req, file, cb) => {
//     cb(null, Date.now() + path.extname(file.originalname));
//   },
// });
// const upload = multer({ storage });

// // Upload Photo
// router.post('/upload', protect, upload.single('file'), async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const user_id = req.user.id;

//     if (!req.file) {
//       return res.status(400).json({ success: false, error: 'No file uploaded' });
//     }

//     const newPhoto = await Photo.create({
//       user_id,
//       title,
//       description,
//       photo_url: `/uploads/photos/${req.file.filename}`,
//     });

//     res.status(200).json({ success: true, photo: newPhoto });
//   } catch (error) {
//     console.error('Error uploading photo:', error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// // Get all photos for the current user, including user information
// router.get('/', protect, async (req, res) => {
//   try {
//     const photos = await Photo.findAll({
//       where: { user_id: req.user.id },
//       include: [
//         {
//           model: User,
//           as: 'user', // Use the alias defined in associations.js
//           attributes: ['name'],
//         },
//       ],
//     });

//     res.status(200).json({ success: true, photos });
//   } catch (error) {
//     console.error('Error fetching photos:', error.message);
//     res.status(500).json({ success: false, error: error.message });
//   }
// });

// module.exports = router;

// working , showing in the feed and upload



// backend/routes/photoRoutes.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const { Photo, User } = require('../models');
const { protect } = require('../middleware/authMiddleware');

// Create `uploads/photos` folder if it doesn't exist
const photoUploadsPath = 'uploads/photos';
if (!fs.existsSync(photoUploadsPath)) {
  fs.mkdirSync(photoUploadsPath, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, photoUploadsPath);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Upload Photo
router.post('/upload', protect, upload.single('file'), async (req, res) => {
  try {
    const { title, description } = req.body;
    const user_id = req.user.id;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const newPhoto = await Photo.create({
      user_id,
      title,
      description,
      photo_url: `/uploads/photos/${req.file.filename}`,
    });

    res.status(200).json({ success: true, photo: newPhoto });
  } catch (error) {
    console.error('Error uploading photo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all photos for the current user, including user information
router.get('/', protect, async (req, res) => {
  try {
    const photos = await Photo.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: User,
          as: 'user', // Make sure the alias matches the association
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching photos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Like a photo
router.post('/like/:id', protect, async (req, res) => {
  try {
    const photoId = req.params.id;
    const photo = await Photo.findByPk(photoId);

    if (photo) {
      photo.likes += 1; // Increment the like count
      await photo.save();
      res.status(200).json({ success: true, likes: photo.likes });
    } else {
      res.status(404).json({ success: false, message: 'Photo not found' });
    }
  } catch (error) {
    console.error('Error liking photo:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Get all photos uploaded by all users
router.get('/all', async (req, res) => {
  try {
    const photos = await Photo.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    res.status(200).json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching all photos:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
