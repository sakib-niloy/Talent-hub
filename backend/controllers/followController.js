const Follow = require('../models/followModel');
const User = require('../models/user');

exports.followUser = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { followed_id } = req.params;
    
    if (follower_id === parseInt(followed_id)) {
      return res.status(400).json({ success: false, error: 'Cannot follow yourself' });
    }
    
    const existingFollow = await Follow.findOne({
      where: { follower_id, followed_id }
    });
    
    if (existingFollow) {
      return res.status(400).json({ success: false, error: 'Already following this user' });
    }
    
    await Follow.create({ follower_id, followed_id });
    res.status(200).json({ success: true, message: 'User followed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { followed_id } = req.params;
    
    const follow = await Follow.findOne({
      where: { follower_id, followed_id }
    });
    
    if (!follow) {
      return res.status(400).json({ success: false, error: 'Not following this user' });
    }
    
    await follow.destroy();
    res.status(200).json({ success: true, message: 'User unfollowed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFollowers = async (req, res) => {
  try {
    const { user_id } = req.params;
    const follows = await Follow.findAll({
      where: { followed_id: user_id }
    });
    
    // Manually get user data for each follower
    const followers = await Promise.all(
      follows.map(async (follow) => {
        const user = await User.findByPk(follow.follower_id);
        return {
          ...follow.toJSON(),
          follower: user ? { id: user.id, name: user.name } : null
        };
      })
    );
    
    res.status(200).json({ success: true, followers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getFollowing = async (req, res) => {
  try {
    const { user_id } = req.params;
    const follows = await Follow.findAll({
      where: { follower_id: user_id }
    });
    
    // Manually get user data for each followed user
    const following = await Promise.all(
      follows.map(async (follow) => {
        const user = await User.findByPk(follow.followed_id);
        return {
          ...follow.toJSON(),
          followed: user ? { id: user.id, name: user.name } : null
        };
      })
    );
    
    res.status(200).json({ success: true, following });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.isFollowing = async (req, res) => {
  try {
    const follower_id = req.user.id;
    const { followed_id } = req.params;
    
    const follow = await Follow.findOne({
      where: { follower_id, followed_id }
    });
    
    res.status(200).json({ success: true, isFollowing: !!follow });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 