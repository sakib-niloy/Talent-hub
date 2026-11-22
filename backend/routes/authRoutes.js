const express = require('express');
const authController = require('../controllers/authController');
const passport = require('passport');
const config = require('../config/env');
const { authLimiter } = require('../middleware/rateLimit');
const { validate, authSchemas } = require('../middleware/validate');

const router = express.Router();

// Auth routes (brute-force limited + input validated)
router.post('/signup', authLimiter, validate(authSchemas.signup), authController.signup);
router.post('/signin', authLimiter, validate(authSchemas.signin), authController.signin);

// Google Auth
const requireGoogle = (req, res, next) => {
  if (!config.googleOAuthEnabled) {
    return res.status(503).json({ success: false, error: 'Google sign-in is not configured' });
  }
  next();
};

router.get('/google', authLimiter, requireGoogle, passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', authLimiter, requireGoogle, passport.authenticate('google', { failureRedirect: '/login' }), (req, res) => {
    res.redirect('/');
});

module.exports = router;
