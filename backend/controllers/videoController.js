const Video = require('../models/videoModel');
const Like = require('../models/likesModel');
const User = require('../models/user');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No video file uploaded. Please select a video file.' 
      });
    }

    const { title, description } = req.body;
    const userId = req.user.id;

    const newVideo = await Video.create({
      user_id: userId,
      title,
      description,
      video_url: `/uploads/videos/${req.file.filename}`,
      likes: 0
    });

    res.status(200).json({ success: true, video: newVideo });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllVideos = async (req, res) => {
  try {
    const videos = await Video.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserVideos = async (req, res) => {
  try {
    const userId = req.user.id;
    const videos = await Video.findAll({ where: { user_id: userId } });
    res.status(200).json({ success: true, videos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.likeVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;
    
    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'video',
        content_id: videoId
      }
    });
    
    const video = await Video.findByPk(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    if (existingLike) {
      await existingLike.destroy();
      video.likes = Math.max(0, video.likes - 1);
      await video.save();
      
      res.status(200).json({ 
        success: true, 
        liked: false, 
        likes: video.likes,
        message: 'Video unliked successfully' 
      });
    } else {
      await Like.create({
        user_id: userId,
        content_type: 'video',
        content_id: videoId
      });
      
      video.likes += 1;
      await video.save();
      
      res.status(200).json({ 
        success: true, 
        liked: true, 
        likes: video.likes,
        message: 'Video liked successfully' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLikeStatus = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;

    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'video',
        content_id: videoId
      }
    });

    res.status(200).json({ success: true, isLiked: !!existingLike });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteVideo = async (req, res) => {
  try {
    const videoId = req.params.id;
    const userId = req.user.id;
    
    const video = await Video.findByPk(videoId);
    if (!video) {
      return res.status(404).json({ success: false, message: 'Video not found' });
    }
    
    if (video.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this video' });
    }
    
    await video.destroy();
    res.status(200).json({ success: true, message: 'Video deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
