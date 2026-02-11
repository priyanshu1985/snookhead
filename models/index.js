import { getSupabase } from "../config/supabase.js";

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
      let query = getDb()
        .from(this.tableName)
        .select(filter.attributes ? filter.attributes.join(",") : "*");
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
    tableName: "menuitems", // Fixed: plural
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

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(itemData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(itemData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(itemData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(itemData)
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

  TableAsset: {
    tableName: "tables", // Fixed: actual table name is 'tables', not 'tableassets'
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          if (Array.isArray(filter.where[key])) {
            query = query.in(key, filter.where[key]);
          } else {
            query = query.eq(key, filter.where[key]);
          }
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
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

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(tableData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(tableData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(tableData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(tableData)
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

  Reservation: {
    tableName: "reservations", // Reverted: database uses plural
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("reservationid", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(reservationData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(reservationData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(reservationData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(reservationData)
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

  Order: {
    tableName: "orders", // Fixed: should be plural to match actual database table
    async findAll(filter = {}) {
      let query = getDb()
        .from(this.tableName)
        .select(filter.select || "*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      if (filter.offset) {
        query = query.range(
          filter.offset,
          filter.offset + (filter.limit || 10) - 1,
        );
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("orderid", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(orderData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(orderData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(orderData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(orderData)
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

  OrderItem: {
    tableName: "orderitems", // Fixed: should be plural to match actual database table
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

    async create(orderItemData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(orderItemData)
        .select()
        .single();
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

  Bill: {
    tableName: "bills", // Reverted: database uses plural
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("billid", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(billData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(billData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(billData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(billData)
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return data;
    },
  },

  Game: {
    tableName: "games", // Reverted: database uses plural
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          if (Array.isArray(filter.where[key])) {
            query = query.in(key, filter.where[key]);
          } else {
            query = query.eq(key, filter.where[key]);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("gameid", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(gameData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(gameData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(gameData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(gameData)
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

  ActiveTable: {
    tableName: "activetables", // Reverted: database uses plural
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

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("activeid", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(activeTableData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(activeTableData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(activeTableData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(activeTableData)
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

  Queue: {
    tableName: "queue", // Fixed: actual table name is 'queue' not 'queues'
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          if (Array.isArray(filter.where[key])) {
            query = query.in(key, filter.where[key]);
          } else {
            query = query.eq(key, filter.where[key]);
          }
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
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

    async create(queueData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(queueData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(queueData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(queueData)
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

  FoodItem: {
    tableName: "fooditems",
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(foodItemData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(foodItemData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(foodItemData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(foodItemData)
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

  Wallet: {
    tableName: "wallets",
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      if (filter.limit) {
        query = query.limit(filter.limit);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(walletData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(walletData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(walletData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(walletData)
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

  Customer: {
    tableName: "customers",
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(customerData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(customerData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(customerData, filter) {
      const { data, error } = await getDb()
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
      const { data, error } = await getDb().from(this.tableName).select("*");
      if (error) throw error;
      return data || [];
    },

    async create(bugData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(bugData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  Station: {
    tableName: "stations", // Fixed: plural
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

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
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

    async create(stationData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(stationData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(stationData, filter) {
      const { data, error } = await getDb()
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

    async create(paymentData) {
      const { data, error } = await getDb()
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

    async create(issueData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(issueData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(issueData, filter) {
      const { data, error } = await getDb()
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
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(settingsData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(settingsData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(settingsData, filter) {
      const { data, error } = await getDb()
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

    async findByPk(id) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .eq("id", id)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(inventoryData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(inventoryData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(inventoryData, filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .update(inventoryData)
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

  // OTP Codes for email verification
  OtpCode: {
    tableName: "otp_codes",

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(otpData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(otpData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async destroy(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .delete()
        .match(filter.where || filter)
        .select();
      if (error) throw error;
      return { deletedRows: data.length };
    },
  },

  Token: {
    tableName: "tokens",
    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(tokenData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(tokenData)
        .select()
        .single();
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

    async destroyExpired() {
      const now = new Date().toISOString();
      const { error } = await getDb()
        .from(this.tableName)
        .delete()
        .lt("expires_at", now);
      if (error) throw error;
      return true;
    },
  },

  Expense: {
    tableName: "expenses", // Fixed: plural
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(data) {
      const { data: res, error } = await getDb()
        .from(this.tableName)
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return res;
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

  Shift: {
    tableName: "shifts",
    async findAll(filter = {}) {
      let query = getDb().from(this.tableName).select("*");
      if (filter.where) {
        Object.keys(filter.where).forEach((key) => {
          query = query.eq(key, filter.where[key]);
        });
      }
      if (filter.order) {
        filter.order.forEach(([key, dir]) => {
          query = query.order(key, { ascending: dir === "ASC" });
        });
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async findOne(filter) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .select("*")
        .match(filter.where || filter)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },

    async create(shiftData) {
      const { data, error } = await getDb()
        .from(this.tableName)
        .insert(shiftData)
        .select()
        .single();
      if (error) throw error;
      return data;
    },

    async update(shiftData, filter) {
      // Support for attendance.js calling update(id, data)
      let actualData, actualFilter;
      if (typeof shiftData !== "object" || shiftData === null) {
        // First arg is ID (scalar)
        actualFilter = { where: { id: shiftData } };
        actualData = filter; // 2nd arg is data
      } else {
        actualData = shiftData;
        actualFilter = filter;
      }

      const { data, error } = await getDb()
        .from(this.tableName)
        .update(actualData)
        .match(actualFilter.where || actualFilter)
        .select();
      if (error) throw error;
      return data;
    },
  },
};

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
  OtpCode,
  Token,
  Expense,
  Shift,
} = models;

export default models;
