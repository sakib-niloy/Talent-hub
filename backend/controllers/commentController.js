const Comment = require('../models/commentModel');
const User = require('../models/user');

exports.addComment = async (req, res) => {
  try {
    console.log('Received comment data:', req.body);
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
    console.log('Comment created successfully:', newComment);
    res.status(201).json({ success: true, comment: newComment });
  } catch (error) {
    console.error('Comment creation error:', error);
    res.status(500).json({ success: false, error: error.message, details: error.errors });
  }
};

exports.getComments = async (req, res) => {
  try {
    const { content_type, content_id } = req.query;
    if (!content_type || !content_id) {
      return res.status(400).json({ success: false, error: 'Missing required query params.' });
    }
    
    const comments = await Comment.findAll({
      where: { content_type, content_id },
      include: [{ model: User, as: 'user', attributes: ['id', 'name'] }],
      order: [['commented_at', 'ASC']]
    });
    
    res.status(200).json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
