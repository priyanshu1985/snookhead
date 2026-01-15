// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getSupabase, testConnection } from "./config/supabase.js";

// Import all route modules
import authRoutes from "./routes/auth.js";
import usersRoutes from "./routes/users.js";
import ordersRoutes from "./routes/orders.js";
import billsRoutes from "./routes/bills.js";
import tablesRoutes from "./routes/tables.js";
import gamesRoutes from "./routes/games.js";
import queueRoutes from "./routes/queue.js";
import reservationsRoutes from "./routes/reservations.js";
import menuRoutes from "./routes/menu.js";
import inventoryRoutes from "./routes/inventory.js";
import walletsRoutes from "./routes/wallets.js";
import customerRoutes from "./routes/customer.js";
import foodRoutes from "./routes/food.js";
import bugsRoutes from "./routes/bugs.js";
import healthRoutes from "./routes/health.js";
import activeTablesRoutes from "./routes/activeTables.js";
import adminStationsRoutes from "./routes/adminStations.js";
import ownerDashboardRoutes from "./routes/ownerDashboard.js";
import ownerPanelRoutes from "./routes/ownerPanel.js";
import stockImagesRoutes from "./routes/stockImages.js";

dotenv.config();

const app = express();

// Add process error handlers for debugging
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Get Supabase client
const supabase = getSupabase();

// Register all API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/bills', billsRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/reservations', reservationsRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/wallets', walletsRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/food', foodRoutes);
app.use('/api/bugs', bugsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/activetables', activeTablesRoutes);
app.use('/api/admin/stations', adminStationsRoutes);
app.use('/api/owner/dashboard', ownerDashboardRoutes);
app.use('/api/owner/panel', ownerPanelRoutes);
app.use('/api/stock-images', stockImagesRoutes);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});
app.get("/api/users", async (req, res) => {
  try {
    console.log('📥 Received GET /api/users request');
    
    const { data, error } = await supabase.from("users").select("*");
    
    console.log('🔍 Supabase query result:');
    console.log('   Error:', error);
    console.log('   Data count:', data ? data.length : 0);

    if (error) {
      console.error('❌ Supabase error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ Successfully fetched users data');
    res.json({
      success: true,
      data: data,
      count: data.length,
    });
  } catch (error) {
    console.error('❌ Error in /api/users:', error.message);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Get single user
app.get("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Create new user
app.post("/api/users", async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;

    // Basic validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: "Name and email are required"
      });
    }

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          name,
          email,
          phone,
          role: role || "customer",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('User creation error:', error);
      throw error;
    }

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error('API Error (POST /api/users):', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update user
app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({
        name,
        email,
        phone,
        role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select();

    if (error) {
      console.error('User update error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    console.error('API Error (PUT /api/users/:id):', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete user
app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from("users").delete().eq("id", id);

    if (error) throw error;

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== STATIONS APIs ==========

app.get("/api/stations", async (req, res) => {
  try {
    const { data, error } = await supabase.from("stations").select(`
        *,
        users(id, name, email)
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== TABLES/GAMES APIs ==========

app.get("/api/games", async (req, res) => {
  try {
    const { data, error } = await supabase.from("games").select("*");

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.get("/api/tables", async (req, res) => {
  try {
    const { data, error } = await supabase.from("tables").select(`
        *,
        games(gameid, gamename),
        stations(id, stationname)
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== MENU ITEMS APIs ==========

app.get("/api/menu", async (req, res) => {
  try {
    const { data, error } = await supabase.from("menuitems").select("*");

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== ORDERS APIs ==========

app.get("/api/orders", async (req, res) => {
  try {
    const { data, error } = await supabase.from("orders").select(`
        *,
        users(id, name),
        orderitems(id, qty, priceEach, menuitems(id, name, price))
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const { stationid, userId, personName, paymentMethod, total } = req.body;

    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          stationid,
          userId,
          personName,
          paymentMethod,
          total,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== BILLS APIs ==========

app.get("/api/bills", async (req, res) => {
  try {
    const { data, error } = await supabase.from("bills").select(`
        *,
        orders(id, userId),
        activetables(activeid, tableid)
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== CUSTOMERS APIs ==========

app.get("/api/customers", async (req, res) => {
  try {
    const { data, error } = await supabase.from("customers").select(`
        *,
        wallets(id, balance, creditlimit)
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/customers", async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;

    const { data, error } = await supabase
      .from("customers")
      .insert([
        {
          name,
          phone,
          email,
          address,
          isactive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ========== RESERVATIONS APIs ==========

app.get("/api/reservations", async (req, res) => {
  try {
    const { data, error } = await supabase.from("reservations").select(`
        *,
        users(id, name, email),
        tables(id, name),
        stations(id, stationname)
      `);

    if (error) throw error;

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

app.post("/api/reservations", async (req, res) => {
  try {
    const {
      stationid,
      userId,
      tableId,
      fromTime,
      toTime,
      customerName,
      customerPhone,
    } = req.body;

    const { data, error } = await supabase
      .from("reservations")
      .insert([
        {
          stationid,
          userId,
          tableId,
          fromTime,
          toTime,
          customerName,
          customerPhone,
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data[0],
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Start server with proper async handling
async function startServer() {
  try {
    // Test connection on startup
    console.log('🔗 Testing Supabase connection...');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Supabase');
    }
    
    const PORT = process.env.PORT || 4000; // Use port 4000 to match frontend config
    
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
      console.log('🎯 Server is ready and listening for requests');
    });
    
    // Keep the server alive
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;
    
    // Keep the process alive with stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }
    
    server.on('close', () => {
      console.log('🔴 Server closed');
    });
    
    server.on('error', (error) => {
      console.error('🚨 Server error:', error);
    });
    
    // Prevent process from exiting
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT. Graceful shutdown...');
      server.close(() => {
        process.exit(0);
      });
    });
    
    console.log('✨ Server startup completed successfully');
    
    return server;
    
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
