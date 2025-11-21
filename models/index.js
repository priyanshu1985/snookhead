const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const MenuItem = require('./menuitem')(sequelize, DataTypes);
const TableAsset = require('./tableasset')(sequelize, DataTypes);
const Reservation = require('./reservation')(sequelize, DataTypes);
const Order = require('./order')(sequelize, DataTypes);
const OrderItem = require('./orderitem')(sequelize, DataTypes);
const Bill = require('./bill')(sequelize, DataTypes);

const Game = require('./game')(sequelize, DataTypes);
const ActiveTable = require('./activeTable')(sequelize, DataTypes);
const Queue = require('./queue')(sequelize, DataTypes);
const FoodItem = require('./fooditem')(sequelize, DataTypes);

// relations
User.hasMany(Reservation, { foreignKey: 'userId' });
Reservation.belongsTo(User, { foreignKey: 'userId' });

TableAsset.hasMany(Reservation, { foreignKey: 'tableId' });
Reservation.belongsTo(TableAsset, { foreignKey: 'tableId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

FoodItem.hasMany(OrderItem, { foreignKey: 'menuItemId' });
OrderItem.belongsTo(FoodItem, { foreignKey: 'menuItemId' });

Order.hasOne(Bill, { foreignKey: 'orderId' });
Bill.belongsTo(Order, { foreignKey: 'orderId' });

// new relations
Game.hasMany(ActiveTable, { foreignKey: 'game_id' });
ActiveTable.belongsTo(Game, { foreignKey: 'game_id' });

TableAsset.hasMany(ActiveTable, { foreignKey: 'table_id' });
ActiveTable.belongsTo(TableAsset, { foreignKey: 'table_id' });

module.exports = {
  sequelize,
  User,
  MenuItem,
  TableAsset,
  Reservation,
  Order,
  OrderItem,
  Bill,
  Game,
  ActiveTable,
  Queue,
  FoodItem
};
