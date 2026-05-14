const Like = require('../models/likesModel'); // You'll need to create this model
const { protect } = require('./authController');

exports.addLike = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const { content_type, content_id } = req.body;
        if (!content_type || !content_id) {
             return res.status(400).json({ error: 'Missing content details' });
        }
        const user_id = req.user.id;
        await Like.create({ user_id, content_type, content_id });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error('Like error:', error);
        res.status(500).json({ error: error.message });
    }
};
