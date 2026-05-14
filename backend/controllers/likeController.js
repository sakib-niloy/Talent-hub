const Like = require('../models/likesModel');

exports.addLike = async (req, res) => {
    try {
        const { content_type, content_id } = req.body;
        if (!content_type || !content_id) {
             return res.status(400).json({ success: false, error: 'Missing content details' });
        }
        
        // Prevent duplicate likes
        const existingLike = await Like.findOne({ where: { user_id: req.user.id, content_type, content_id } });
        if (existingLike) {
            return res.status(400).json({ success: false, error: 'Already liked' });
        }

        await Like.create({ user_id: req.user.id, content_type, content_id });
        res.status(201).json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getLikes = async (req, res) => {
    try {
        const { content_type, content_id } = req.query;
        const count = await Like.count({ where: { content_type, content_id } });
        res.status(200).json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
