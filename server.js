// server.js
import "dotenv/config";
import dns from "node:dns";
import http from "http";
import express from "express";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import cron from "node-cron";

import { getSupabase, testConnection } from "./config/supabase.js";
import { securityHeaders } from "./middleware/security.js";
import { rateLimit } from "./middleware/rateLimiter.js";
import { setIO, emitToStation } from "./utils/socketManager.js";

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
import attendanceRoutes from "./routes/attendance.js";
import uploadRoutes from "./routes/upload.js";

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

const app = express();

// Process error handlers
process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Middleware
app.use(securityHeaders);
app.use(rateLimit(2000, 15 * 60 * 1000));
app.use(cors());
app.use(express.json());
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
app.use("/api/attendance", attendanceRoutes);
app.use("/api/upload", uploadRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "Server is running" });
});

// ── node-cron: Auto-release expired timer sessions every 1 minute ─────────────
const startCronJobs = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const now = new Date().toISOString();

      const { data: expiredSessions, error } = await supabase
        .from("activetables")
        .select("activeid, tableid, gameid, stationid, bookingtype, bookingendtime, status")
        .eq("status", "active")
        .eq("bookingtype", "timer")
        .lt("bookingendtime", now);

      if (error) {
        console.error("🕐 [Cron] Error querying expired sessions:", error.message);
        return;
      }

      if (!expiredSessions || expiredSessions.length === 0) return;

      console.log(`🕐 [Cron] Auto-releasing ${expiredSessions.length} expired session(s)`);

      for (const session of expiredSessions) {
        try {
          const endTime = new Date().toISOString();

          // Mark session as completed
          await supabase
            .from("activetables")
            .update({ status: "completed", endtime: endTime })
            .eq("activeid", session.activeid);

          // Free the table
          await supabase
            .from("tableassets")
            .update({ status: "available" })
            .eq("id", session.tableid);

          console.log(`✅ [Cron] Released session ${session.activeid} for table ${session.tableid}`);

          // Notify connected clients
          emitToStation(session.stationid, "session:changed", {
            action: "auto-release",
            activeId: session.activeid,
            tableId: session.tableid,
          });
        } catch (sessionErr) {
          console.error(`❌ [Cron] Failed to release session ${session.activeid}:`, sessionErr.message);
        }
      }
    } catch (err) {
      console.error("🕐 [Cron] Unexpected error:", err.message);
    }
  });

  console.log("🕐 Cron: auto-release expired sessions every 1 min");
};
// ─────────────────────────────────────────────────────────────────────────────

async function startServer() {
  try {
    console.log("🔗 Testing Supabase connection...");
    const connected = await testConnection();
    if (!connected) {
      throw new Error("Failed to connect to Supabase");
    }

    const PORT = process.env.PORT || 4000;

    // Wrap Express in an HTTP server for socket.io
    const httpServer = http.createServer(app);

    const io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    // Register shared socket.io instance for use in routes
    setIO(io);

    io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Clients join their station room so events are scoped per station
      socket.on("join-station", (stationId) => {
        if (stationId) {
          socket.join(`station:${stationId}`);
          console.log(`📡 Socket ${socket.id} joined station:${stationId}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });

    const server = httpServer.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
      console.log("🎯 Server is ready and listening for requests");
    });

    server.keepAliveTimeout = 120000;
    server.headersTimeout = 120000;

    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
    }

    server.on("close", () => console.log("🔴 Server closed"));
    server.on("error", (error) => console.error("🚨 Server error:", error));

    process.on("SIGINT", () => {
      console.log("\n🛑 Received SIGINT. Graceful shutdown...");
      server.close(() => process.exit(0));
    });

    startCronJobs();

    console.log("✨ Server startup completed successfully");
    return server;
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
}

startServer();
