const Photo = require('../models/photoModel');
const Like = require('../models/likesModel');
const User = require('../models/user');

exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No photo file uploaded. Please select a photo file.' 
      });
    }

    const { title, description } = req.body;
    const userId = req.user.id;

    const newPhoto = await Photo.create({
      user_id: userId,
      title,
      description,
      photo_url: `/uploads/photos/${req.file.filename}`,
      likes: 0
    });

    res.status(200).json({ success: true, photo: newPhoto });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllPhotos = async (req, res) => {
  try {
    const photos = await Photo.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });
    res.status(200).json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserPhotos = async (req, res) => {
  try {
    const userId = req.user.id;
    const photos = await Photo.findAll({ where: { user_id: userId } });
    res.status(200).json({ success: true, photos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.likePhoto = async (req, res) => {
  try {
    const photoId = req.params.id;
    const userId = req.user.id;
    
    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'photo',
        content_id: photoId
      }
    });
    
    const photo = await Photo.findByPk(photoId);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    if (existingLike) {
      await existingLike.destroy();
      photo.likes = Math.max(0, photo.likes - 1);
      await photo.save();
      
      res.status(200).json({ 
        success: true, 
        liked: false, 
        likes: photo.likes,
        message: 'Photo unliked successfully' 
      });
    } else {
      await Like.create({
        user_id: userId,
        content_type: 'photo',
        content_id: photoId
      });
      
      photo.likes += 1;
      await photo.save();
      
      res.status(200).json({ 
        success: true, 
        liked: true, 
        likes: photo.likes,
        message: 'Photo liked successfully' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLikeStatus = async (req, res) => {
  try {
    const photoId = req.params.id;
    const userId = req.user.id;

    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'photo',
        content_id: photoId
      }
    });

    res.status(200).json({ success: true, isLiked: !!existingLike });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deletePhoto = async (req, res) => {
  try {
    const photoId = req.params.id;
    const userId = req.user.id;
    
    const photo = await Photo.findByPk(photoId);
    if (!photo) {
      return res.status(404).json({ success: false, message: 'Photo not found' });
    }
    
    if (photo.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this photo' });
    }
    
    await photo.destroy();
    res.status(200).json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
