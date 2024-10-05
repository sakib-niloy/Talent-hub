const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('talent_hub', 'root', '', {
  host: 'localhost',
  dialect: 'mysql', // or 'mariadb'
  logging: false,   // Disable logging
});

module.exports = sequelize;
