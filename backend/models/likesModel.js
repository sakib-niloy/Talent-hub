const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  content_type: {
    type: DataTypes.ENUM('photo', 'audio', 'video'),
    allowNull: false
  },
  content_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  liked_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  timestamps: false,
  tableName: 'likes'
});

module.exports = Like;