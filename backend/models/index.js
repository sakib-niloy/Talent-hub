// backend/models/index.js

const sequelize = require('../config/database');

// Import models
const User = require('./User');
const Photo = require('./photoModel');
const Video = require('./videoModel');
const Audio = require('./audioModel');

// Initialize models
User.initModel(sequelize);
Photo.initModel(sequelize);
Video.initModel(sequelize);
Audio.initModel(sequelize);

// Define associations
User.hasMany(Photo, { foreignKey: 'user_id', as: 'photos' });
Photo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Video, { foreignKey: 'user_id', as: 'videos' });
Video.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(Audio, { foreignKey: 'user_id', as: 'audios' });
Audio.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = {
  User,
  Photo,
  Video,
  Audio,
  sequelize,
};
