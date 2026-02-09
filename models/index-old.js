import { getSupabase } from "../config/database.js";

// Helper function to get supabase instance
const getDb = () => getSupabase();

// Supabase table helpers - simplified data access layer
const models = {
  User: {
    tableName: "users",
    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "not found"
      return data;
    },

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(userData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(userData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(userData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(userData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await getDb()
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  MenuItem: {
    tableName: "menuitems",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(itemData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(itemData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(itemData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(itemData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  TableAsset: {
    tableName: "tableassets",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(tableData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(tableData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(tableData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(tableData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  Reservation: {
    tableName: "reservations",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(reservationData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(reservationData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(reservationData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(reservationData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  Order: {
    tableName: "orders",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(orderData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(orderData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(orderData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(orderData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  OrderItem: {
    tableName: "orderitems",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(orderItemData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(orderItemData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  Bill: {
    tableName: "bills",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(billData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(billData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(billData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(billData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  Game: {
    tableName: "games",
    async findAll() {
      const { data, error } = await supabase.from(this.tableName).select("*");
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("game_id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  },

  ActiveTable: {
    tableName: "activetables",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(activeTableData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(activeTableData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(activeTableData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(activeTableData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  Queue: {
    tableName: "queues",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(queueData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(queueData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  FoodItem: {
    tableName: "fooditems",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(foodItemData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(foodItemData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(foodItemData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(foodItemData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },

  Wallet: {
    tableName: "wallets",
    async findOne(filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(walletData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(walletData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(walletData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(walletData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  Customer: {
    tableName: "customers",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findOne(filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(customerData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(customerData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(customerData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(customerData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  Bug: {
    tableName: "bugs",
    async findAll() {
      const { data, error } = await supabase.from(this.tableName).select("*");
      if (error) throw error;
      return data || [];
    },

    async create(bugData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(bugData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  Station: {
    tableName: "stations",
    async findAll() {
      const { data, error } = await supabase.from(this.tableName).select("*");
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(stationData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(stationData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(stationData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(stationData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  StationPayment: {
    tableName: "stationpayments",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(paymentData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(paymentData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  StationIssue: {
    tableName: "stationissues",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(issueData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(issueData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(issueData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(issueData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  OwnerSettings: {
    tableName: "ownersettings",
    async findOne(filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(settingsData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(settingsData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(settingsData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(settingsData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  Inventory: {
    tableName: "inventory",
    async findAll(filter = {}) {
      let query = supabase.from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(inventoryData) {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(inventoryData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(inventoryData, filter) {
      const { data, error } = await supabase
        .from(this.tableName)
        .update(inventoryData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .match(filter.where || filter);
      if (error) throw error;
      return true;
    },
  },
};

export default models;
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

// No database migrations needed with Supabase - tables are managed via Supabase dashboard

// Export individual model helpers for backward compatibility
export const {
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
} = models;
