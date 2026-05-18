const Like = require('../models/likesModel');

exports.toggleLike = async (req, res) => {
    try {
        const { content_type, content_id } = req.body;
        const user_id = req.user.id;

        if (!content_type || !content_id) {
             return res.status(400).json({ success: false, error: 'Missing content details' });
        }
        
        const existingLike = await Like.findOne({ where: { user_id, content_type, content_id } });

        if (existingLike) {
            // If already liked, then unlike (remove from DB)
            await existingLike.destroy();
            return res.status(200).json({ success: true, message: 'Unliked successfully', isLiked: false });
        } else {
            // If not liked, then like (add to DB)
            await Like.create({ user_id, content_type, content_id });
            return res.status(201).json({ success: true, message: 'Liked successfully', isLiked: true });
        }
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

exports.checkStatus = async (req, res) => {
    try {
        const { content_type, content_id } = req.query;
        const user_id = req.user.id;
        const existingLike = await Like.findOne({ where: { user_id, content_type, content_id } });
        res.status(200).json({ success: true, isLiked: !!existingLike });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
