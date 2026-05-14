const Comment = require('../models/commentModel');
const User = require('../models/user');

exports.addComment = async (req, res) => {
  try {
    const { content_type, content_id, comment } = req.body;
    const user_id = req.user.id;
    if (!content_type || !content_id || !comment) {
      return res.status(400).json({ success: false, error: 'Missing required fields.' });
    }
    const newComment = await Comment.create({
      user_id,
      content_type,
      content_id,
      comment
    });
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { content_type, content_id } = req.query;
    if (!content_type || !content_id) {
      return res.status(400).json({ success: false, error: 'Missing required query params.' });
    }
    
    // Get comments using correct field name 'commented_at'
    const comments = await Comment.findAll({
      where: { content_type, content_id },
      order: [['commented_at', 'ASC']]
    });
    
    // Manually get user data for each comment using 'findById' from our User model
    const commentsWithUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await User.findById(comment.user_id);
        return {
          ...comment.toJSON(),
          user: user ? { id: user.id, name: user.name } : null
        };
      })
    );
    
    res.status(200).json({ success: true, comments: commentsWithUsers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}; 
