require("dotenv").config();
const { validateEnv } = require("./config/env");
validateEnv();

const express = require("express");
const cors = require("cors");
const { sequelize } = require("./config/database");
const models = require("./models");
const { securityHeaders } = require("./middleware/security");
const { requestLogger, logStartup } = require("./middleware/logger");

const path = require("path");

const app = express();
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Serve static files from public folder
app.use("/static", express.static(path.join(__dirname, "public")));

// --- create default admin if missing
async function createAdmin() {
  try {
    const { User } = models;
    const adminEmail = process.env.ADMIN_EMAIL || "admin@snookhead.com";
    const adminPass = process.env.ADMIN_PASS || "admin123";
    const adminName = process.env.ADMIN_NAME || "Administrator";
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (!existing) {
      const bcrypt = require("bcrypt");
      const hash = await bcrypt.hash(adminPass, 10);
      await User.create({
        name: adminName,
        email: adminEmail,
        passwordHash: hash,
        role: "admin",
      });
      logStartup.success(`Admin created: ${adminEmail}`);
    }
  } catch (err) {
    logStartup.error(`Admin setup failed: ${err.message}`);
  }
}

// Routes
app.use("/api/health", require("./routes/health"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/menu", require("./routes/menu"));
app.use("/api/food", require("./routes/food"));
app.use("/api/orders", require("./routes/orders"));
app.use("/api/bills", require("./routes/bills"));
app.use("/api/tables", require("./routes/tables"));
app.use("/api/reservations", require("./routes/reservations"));
app.use("/api/activeTables", require("./routes/activeTables"));
app.use("/api/queue", require("./routes/queue"));
app.use("/api/games", require("./routes/games"));
app.use("/api/stock-images", require("./routes/stockImages"));
app.use("/api/debug", require("./routes/debug"));
app.use("/api/wallets", require("./routes/wallets"));
app.use("/api/customer", require("./routes/customer"));
app.use("/api/bugs", require("./routes/bugs"));
app.use("/api/admin/stations", require("./routes/adminStations"));
// app.use("/api/owner", require("./routes/ownerPanel"));
// app.use("/api/owner/dashboard", require("./routes/ownerDashboard"));

// Error handler
app.use((err, req, res, next) => {
  logStartup.error(`${err.message}`);
  res.status(500).json({ error: err.message || "Server error" });
});

// Server startup
const preferred = parseInt(process.env.PORT, 10) || 4000;
const maxPort = preferred + 10;

function startAt(port) {
  app
    .listen(port, async () => {
      logStartup.server(port);
      try {
        await sequelize.authenticate();
        logStartup.success("Database connected");
        await sequelize.sync();
        logStartup.success("Models synchronized");
      } catch (e) {
        logStartup.error(`Database failed: ${e.message}`);
        process.exit(1);
      }
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        logStartup.warn(`Port ${port} in use, trying ${port + 1}`);
        if (port + 1 <= maxPort) startAt(port + 1);
        else {
          logStartup.error(`No ports available (${preferred}-${maxPort})`);
          process.exit(1);
        }
      } else {
        logStartup.error(`Server error: ${err.message}`);
        process.exit(1);
      }
    });
}

// Initialize
(async () => {
  await createAdmin();
  startAt(preferred);
})();
