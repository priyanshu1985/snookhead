const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = require('./user')(sequelize, DataTypes);
const MenuItem = require('./menuitem')(sequelize, DataTypes);
const TableAsset = require('./tableasset')(sequelize, DataTypes);
const Reservation = require('./reservation')(sequelize, DataTypes);
const Order = require('./order')(sequelize, DataTypes);
const OrderItem = require('./orderitem')(sequelize, DataTypes);
const Bill = require('./bill')(sequelize, DataTypes);


User.hasMany(Reservation, { foreignKey: 'userId' });
Reservation.belongsTo(User, { foreignKey: 'userId' });
TableAsset.hasMany(Reservation, { foreignKey: 'tableId' });
Reservation.belongsTo(TableAsset, { foreignKey: 'tableId' });

User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });
Order.hasMany(OrderItem, { foreignKey: 'orderId' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId' });
MenuItem.hasMany(OrderItem, { foreignKey: 'menuItemId' });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menuItemId' });

Order.hasOne(Bill, { foreignKey: 'orderId' });
Bill.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  MenuItem,
  TableAsset,
  Reservation,
  Order,
  OrderItem,
  Bill
};
