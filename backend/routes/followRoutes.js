const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const authController = require('../controllers/authController');

// Follow a user (protected)
router.post('/:followed_id', authController.protect, followController.followUser);
// Unfollow a user (protected)
router.delete('/:followed_id', authController.protect, followController.unfollowUser);
// Get followers of a user
router.get('/followers/:user_id', followController.getFollowers);
// Get users that a user is following
router.get('/following/:user_id', followController.getFollowing);
// Check if current user is following another user (protected)
router.get('/is-following/:followed_id', authController.protect, followController.isFollowing);

module.exports = router; 