// backend/models/associations.js

const User = require('./User');
const Photo = require('./photoModel');

// Define associations here
User.hasMany(Photo, { foreignKey: 'user_id', as: 'photos' });
Photo.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

module.exports = { User, Photo };
