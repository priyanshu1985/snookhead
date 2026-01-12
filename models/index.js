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
const Bug = require("./bug")(sequelize, DataTypes);
const Station = require("./Station")(sequelize, DataTypes);
const StationPayment = require("./StationPayment")(sequelize, DataTypes);
const StationIssue = require("./StationIssue")(sequelize, DataTypes);
const OwnerSettings = require("./ownerSettings")(sequelize, DataTypes);
const Inventory = require("./inventory")(sequelize, DataTypes);

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
Game.hasMany(TableAsset, { foreignKey: "game_id", sourceKey: "game_id" });
TableAsset.belongsTo(Game, { foreignKey: "game_id", targetKey: "game_id" });

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

Customer.hasOne(Wallet, { foreignKey: "customer_id" });
Wallet.belongsTo(Customer, { foreignKey: "customer_id" });

Queue.belongsTo(TableAsset, {
  foreignKey: "preferred_table_id",
  as: "preferredTable",
});

TableAsset.hasMany(Queue, {
  foreignKey: "preferred_table_id",
});

// =============================================
// BUG RELATIONSHIPS
// =============================================

// User ↔ Bug (reporter)
User.hasMany(Bug, { foreignKey: "reported_by", as: "reportedBugs" });
Bug.belongsTo(User, { foreignKey: "reported_by", as: "reporter" });

// User ↔ Bug (assignee)
User.hasMany(Bug, { foreignKey: "assigned_to", as: "assignedBugs" });
Bug.belongsTo(User, { foreignKey: "assigned_to", as: "assignee" });

// =============================================
// STATION RELATIONSHIPS (Multi-Tenancy)
// =============================================

// Station ↔ Owner User (each station has one owner)
Station.belongsTo(User, { foreignKey: "owner_user_id", as: "owner" });
User.hasOne(Station, { foreignKey: "owner_user_id", as: "ownedStation" });

// Station ↔ Users (staff members belong to a station)
Station.hasMany(User, { foreignKey: "station_id", as: "staff" });
User.belongsTo(Station, { foreignKey: "station_id", as: "station" });

// Station ↔ MenuItem (each station has its own menu)
Station.hasMany(MenuItem, { foreignKey: "station_id" });
MenuItem.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ TableAsset (each station has its own tables)
Station.hasMany(TableAsset, { foreignKey: "station_id" });
TableAsset.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Order (each station has its own orders)
Station.hasMany(Order, { foreignKey: "station_id" });
Order.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Reservation (each station has its own reservations)
Station.hasMany(Reservation, { foreignKey: "station_id" });
Reservation.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Bill (each station has its own bills)
Station.hasMany(Bill, { foreignKey: "station_id" });
Bill.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Game (each station has its own games)
Station.hasMany(Game, { foreignKey: "station_id" });
Game.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ ActiveTable (each station has its own active sessions)
Station.hasMany(ActiveTable, { foreignKey: "station_id" });
ActiveTable.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Queue (each station has its own queue)
Station.hasMany(Queue, { foreignKey: "station_id" });
Queue.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Inventory (each station has its own inventory)
Station.hasMany(Inventory, { foreignKey: "station_id" });
Inventory.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ OwnerSettings (each station has its own settings)
Station.hasMany(OwnerSettings, { foreignKey: "station_id" });
OwnerSettings.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ StationPayment
Station.hasMany(StationPayment, { foreignKey: "station_id" });
StationPayment.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ StationIssue
Station.hasMany(StationIssue, { foreignKey: "station_id" });
StationIssue.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Customer (each station has its own customers)
Station.hasMany(Customer, { foreignKey: "station_id" });
Customer.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Wallet (each station has its own wallets)
Station.hasMany(Wallet, { foreignKey: "station_id" });
Wallet.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ FoodItem (each station has its own food items)
Station.hasMany(FoodItem, { foreignKey: "station_id" });
FoodItem.belongsTo(Station, { foreignKey: "station_id" });

// Station ↔ Bug (each station has its own bug reports)
Station.hasMany(Bug, { foreignKey: "station_id" });
Bug.belongsTo(Station, { foreignKey: "station_id" });

// =============================================
// SYNC DATABASE (optional - remove after first run)
// =============================================

// Database sync disabled - run manual migration below
// sequelize.sync({ alter: true }).then(() => {
//   console.log("Database synced");
// }).catch(err => {
//   console.error("Database sync error:", err);
// });

// Manual migration for order_source column
(async () => {
  try {
    // Check if order_source column exists in orders table
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'order_source'
    `);

    if (results.length === 0) {
      console.log("Adding order_source column to orders table...");
      await sequelize.query(`
        ALTER TABLE orders
        ADD COLUMN order_source ENUM('table_booking', 'counter', 'zomato', 'swiggy')
        NOT NULL DEFAULT 'table_booking'
      `);
      console.log("order_source column added successfully");
    }
  } catch (err) {
    // Ignore if column already exists or table doesn't exist yet
    if (!err.message.includes("Duplicate column")) {
      console.log("Migration note:", err.message);
    }
  }
})();

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
  Bug,
  Station,
  StationPayment,
  StationIssue,
  OwnerSettings,
  Inventory,
};
