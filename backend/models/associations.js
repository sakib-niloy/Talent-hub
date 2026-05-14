const User = require('./user');
const Comment = require('./commentModel');
const Follow = require('./followModel');
const Photo = require('./photoModel');
const Audio = require('./audioModel');
const Video = require('./videoModel');
const Like = require('./likesModel');

// User associations
User.hasMany(Comment, { foreignKey: 'user_id', as: 'comments' });
User.hasMany(Photo, { foreignKey: 'user_id', as: 'photos' });
User.hasMany(Audio, { foreignKey: 'user_id', as: 'audios' });
User.hasMany(Video, { foreignKey: 'user_id', as: 'videos' });

// Comment associations
Comment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Photo associations
Photo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Photo.hasMany(Comment, { foreignKey: 'content_id', constraints: false, scope: { content_type: 'photo' }, as: 'comments' });

// Audio associations
Audio.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Audio.hasMany(Comment, { foreignKey: 'content_id', constraints: false, scope: { content_type: 'audio' }, as: 'comments' });

// Video associations
Video.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Video.hasMany(Comment, { foreignKey: 'content_id', constraints: false, scope: { content_type: 'video' }, as: 'comments' });

// Like associations
Like.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Follow associations
User.belongsToMany(User, { as: 'Followers', through: Follow, foreignKey: 'following_id', otherKey: 'follower_id' });
User.belongsToMany(User, { as: 'Following', through: Follow, foreignKey: 'follower_id', otherKey: 'following_id' });

module.exports = {
  User,
  Comment,
  Follow,
  Photo,
  Audio,
  Video,
  Like
};
