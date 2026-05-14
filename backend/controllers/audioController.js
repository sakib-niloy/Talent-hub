const Audio = require('../models/audioModel');
const Like = require('../models/likesModel');
const User = require('../models/user');

exports.uploadAudio = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        error: 'No audio file uploaded. Please select an audio file.' 
      });
    }

    const { title, description } = req.body;
    const userId = req.user.id;

    const newAudio = await Audio.create({
      user_id: userId,
      title,
      description,
      audio_url: `/uploads/audios/${req.file.filename}`,
      likes: 0
    });

    res.status(200).json({ success: true, audio: newAudio });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAllAudios = async (req, res) => {
  try {
    const audios = await Audio.findAll({
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }]
    });
    res.status(200).json({ success: true, audios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getUserAudios = async (req, res) => {
  try {
    const userId = req.user.id;
    const audios = await Audio.findAll({ where: { user_id: userId } });
    res.status(200).json({ success: true, audios });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.likeAudio = async (req, res) => {
  try {
    const audioId = req.params.id;
    const userId = req.user.id;
    
    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'audio',
        content_id: audioId
      }
    });
    
    const audio = await Audio.findByPk(audioId);
    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }
    
    if (existingLike) {
      await existingLike.destroy();
      audio.likes = Math.max(0, audio.likes - 1);
      await audio.save();
      
      res.status(200).json({ 
        success: true, 
        liked: false, 
        likes: audio.likes,
        message: 'Audio unliked successfully' 
      });
    } else {
      await Like.create({
        user_id: userId,
        content_type: 'audio',
        content_id: audioId
      });
      
      audio.likes += 1;
      await audio.save();
      
      res.status(200).json({ 
        success: true, 
        liked: true, 
        likes: audio.likes,
        message: 'Audio liked successfully' 
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getLikeStatus = async (req, res) => {
  try {
    const audioId = req.params.id;
    const userId = req.user.id;

    const existingLike = await Like.findOne({
      where: {
        user_id: userId,
        content_type: 'audio',
        content_id: audioId
      }
    });

    res.status(200).json({ success: true, isLiked: !!existingLike });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteAudio = async (req, res) => {
  try {
    const audioId = req.params.id;
    const userId = req.user.id;
    
    const audio = await Audio.findByPk(audioId);
    if (!audio) {
      return res.status(404).json({ success: false, message: 'Audio not found' });
    }
    
    if (audio.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this audio' });
    }
    
    await audio.destroy();
    res.status(200).json({ success: true, message: 'Audio deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
