// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Configure environment variables first
dotenv.config();

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

const app = express();

// Add process error handlers for debugging
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Middleware
app.use(cors());
app.use(express.json());

// Get Supabase client
const supabase = getSupabase();

// Register all API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/orders", ordersRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/tables", tablesRoutes);
app.use("/api/games", gamesRoutes);
app.use("/api/queue", queueRoutes);
app.use("/api/reservations", reservationsRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/wallets", walletsRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/bugs", bugsRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/activetables", activeTablesRoutes);
app.use("/api/admin/stations", adminStationsRoutes);
app.use("/api/owner/dashboard", ownerDashboardRoutes);
app.use("/api/owner/panel", ownerPanelRoutes);
app.use("/api/stock-images", stockImagesRoutes);

// Basic health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// Start server with proper async handling
async function startServer() {
  try {
    // Test connection on startup
    console.log("🔗 Testing Supabase connection...");
    const connected = await testConnection();
    if (!connected) {
      throw new Error("Failed to connect to Supabase");
    }

    const PORT = process.env.PORT || 4000; // Use port 4000 to match frontend config

    const server = app.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`👥 Users API: http://localhost:${PORT}/api/users`);
      console.log("🎯 Server is ready and listening for requests");
    });

    // Keep the server alive
    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;

    // Keep the process alive with stdin
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    server.on("close", () => {
      console.log("🔴 Server closed");
    });

    server.on("error", (error) => {
      console.error("🚨 Server error:", error);
    });

    // Prevent process from exiting
    process.on("SIGINT", () => {
      console.log("\n🛑 Received SIGINT. Graceful shutdown...");
      server.close(() => {
        process.exit(0);
      });
    });

    console.log("✨ Server startup completed successfully");

    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
