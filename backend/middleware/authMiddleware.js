// backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Find user by id and add it to req.user
      req.user = await User.findByPk(decoded.id);
      if (!req.user) {
        return res.status(401).json({ error: 'User not found, unauthorized' });
      }

      next();
    } catch (error) {
      console.error('Not authorized, token failed');
      res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token' });
  }
};
