const User = require('../models/user');

exports.isAdmin = async (req, res, next) => {
    try {
        // Assuming req.user is set by passport (or via JWT protect middleware)
        const user = await User.findById(req.user.id);
        if (user && user.is_admin) {
            next();
        } else {
            res.status(403).json({ error: 'Access denied: Admins only' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Error verifying admin status' });
    }
};
