const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

// Import all models
const User = require("./user")(sequelize, DataTypes);
const MenuItem = require("./menuitem")(sequelize, DataTypes);
const TableAsset = require("./tableasset")(sequelize, DataTypes);
const Reservation = require("./reservation")(sequelize, DataTypes);
const Order = require("./order")(sequelize, DataTypes);
const OrderItem = require("./orderitem")(sequelize, DataTypes);
const Bill = require("./bill")(sequelize, DataTypes);
const Game = require("./game")(sequelize, DataTypes);
const ActiveTable = require("./activeTable")(sequelize, DataTypes);
const Queue = require("./queue")(sequelize, DataTypes);
const FoodItem = require("./fooditem")(sequelize, DataTypes);
const Wallet = require("./wallets")(sequelize, DataTypes);
const Customer = require("./customer")(sequelize, DataTypes);

// =============================================
// CORE RELATIONSHIPS
// =============================================

// User ↔ Reservation
User.hasMany(Reservation, { foreignKey: "userId" });
Reservation.belongsTo(User, { foreignKey: "userId" });

// TableAsset ↔ Reservation
TableAsset.hasMany(Reservation, { foreignKey: "tableId" });
Reservation.belongsTo(TableAsset, { foreignKey: "tableId" });

// User ↔ Order
User.hasMany(Order, { foreignKey: "userId" });
Order.belongsTo(User, { foreignKey: "userId" });

// =============================================
// GAME & TABLE RELATIONSHIPS
// =============================================

// Game ↔ TableAsset (tables belong to a game)
Game.hasMany(TableAsset, { foreignKey: "game_id" });
TableAsset.belongsTo(Game, { foreignKey: "game_id" });

// Game ↔ ActiveTable (active sessions belong to a game)
Game.hasMany(ActiveTable, { foreignKey: "game_id" });
ActiveTable.belongsTo(Game, { foreignKey: "game_id" });

// TableAsset ↔ ActiveTable (when a table is active)
TableAsset.hasMany(ActiveTable, { foreignKey: "table_id" });
ActiveTable.belongsTo(TableAsset, { foreignKey: "table_id" });

// =============================================
// ORDER RELATIONSHIPS
// =============================================

// ActiveTable ↔ Order (one active session can have one order)
ActiveTable.hasOne(Order, { foreignKey: "active_id" });
Order.belongsTo(ActiveTable, { foreignKey: "active_id" });

// Order ↔ OrderItem (one order has many items)
Order.hasMany(OrderItem, { foreignKey: "orderId" });
OrderItem.belongsTo(Order, { foreignKey: "orderId" });

// MenuItem ↔ OrderItem (each order item references a menu item)
MenuItem.hasMany(OrderItem, { foreignKey: "menuItemId" });
OrderItem.belongsTo(MenuItem, { foreignKey: "menuItemId" });

// =============================================
// BILL RELATIONSHIPS
// =============================================

// Order ↔ Bill (one order has one bill)
Order.hasOne(Bill, { foreignKey: "orderId" });
Bill.belongsTo(Order, { foreignKey: "orderId" });

// =============================================
// SYNC DATABASE (optional - remove after first run)
// =============================================

// Uncomment this to sync models with database on startup
// sequelize.sync({ alter: true }).then(() => {
//   console.log("Database synced");
// }).catch(err => {
//   console.error("Database sync error:", err);
// });

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
  FoodItem,
  Wallet,
  Customer,
};
