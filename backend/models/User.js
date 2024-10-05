// backend/models/User.js

const { DataTypes, Model } = require('sequelize');

class User extends Model {
  static initModel(sequelize) {
    User.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      modelName: 'User',
      timestamps: false,
      tableName: 'users',
    });
  }
}

module.exports = User;
