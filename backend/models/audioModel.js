// backend/models/audioModel.js

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./User'); // Import the User model to create association

class Audio extends Model {
  static initModel(sequelize) {
    Audio.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      audio_url: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      modelName: 'Audio',
      timestamps: false,
      tableName: 'audios',
    });
  }

  static associate(models) {
    Audio.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

module.exports = Audio;
