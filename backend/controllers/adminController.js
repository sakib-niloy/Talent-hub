const Photo = require('../models/photoModel');
const Audio = require('../models/audioModel');
const Video = require('../models/videoModel');
const User = require('../models/user');

exports.deleteContent = async (req, res) => {
    const { type, id } = req.params;
    try {
        if (type === 'photo') await Photo.destroy({ where: { id } });
        else if (type === 'audio') await Audio.destroy({ where: { id } });
        else if (type === 'video') await Video.destroy({ where: { id } });
        else return res.status(400).json({ error: 'Invalid content type' });
        res.status(200).json({ message: 'Content deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting content' });
    }
};

exports.blockUser = async (req, res) => {
    const { userId } = req.params;
    try {
        // Simple block logic: e.g. deactivate user account
        await User.update({ is_blocked: true }, { where: { id: userId } });
        res.status(200).json({ message: 'User blocked' });
    } catch (err) {
        res.status(500).json({ error: 'Error blocking user' });
    }
};
