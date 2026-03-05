// server.js
// Touch to force restart!!
import "dotenv/config";
import dns from "node:dns";

// 🔥 Bypassing local DNS hijacking by forcing Google DNS
// try {
//   dns.setServers(["8.8.8.8", "8.8.4.4"]);
//   console.log("🛠️ DNS servers forced to Google DNS (8.8.8.8)");
// } catch (error) {
//   console.warn("⚠️ Failed to set custom DNS servers:", error.message);
// }

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}
import express from "express";
import cors from "cors";

import { getSupabase, testConnection } from "./config/supabase.js";
import { securityHeaders } from "./middleware/security.js";
import { rateLimit } from "./middleware/rateLimiter.js";

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
import expensesRoutes from "./routes/expenses.js";
import kitchenExpensesRoutes from "./routes/kitchenExpenses.js";

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
app.use(securityHeaders); // Must be before other middlewares
// We use 2000 requests per 15 minutes. 500 was still too strict for multiple active users and polling.
app.use(rateLimit(2000, 15 * 60 * 1000));

// Permissive CORS: Allow all origins for initial deployment
app.use(cors());

app.use(express.json());
// Serve static files from public directory
app.use("/static", express.static("public"));

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
app.use("/api/expenses", expensesRoutes);
app.use("/api/kitchen-expenses", kitchenExpensesRoutes);
import attendanceRoutes from "./routes/attendance.js";
app.use("/api/attendance", attendanceRoutes);
import uploadRoutes from "./routes/upload.js";
app.use("/api/upload", uploadRoutes);

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

    const HOST = "0.0.0.0";
    const server = app.listen(PORT, HOST, () => {
      console.log(`✅ Server running on http://${HOST}:${PORT}`);
      console.log(`📊 Health check: http://${HOST}:${PORT}/api/health`);
      console.log(`👥 Users API: http://${HOST}:${PORT}/api/users`);
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

