require("dotenv").config();
const { validateEnv } = require("./config/env");
validateEnv();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { sequelize } = require("./config/database");
const models = require("./models");
const { securityHeaders } = require("./middleware/security");
const { requestLogger, logStartup } = require("./middleware/logger");

const path = require("path");

const app = express();

// Configure CORS to allow credentials (for httpOnly cookies)
const corsOptions = {
  origin: true, // Allow all origins in development
  credentials: true, // Enable credentials (cookies)
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(requestLogger);
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(cookieParser()); // Add cookie parser middleware
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

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    message: "Server is running!",
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 4000,
  });
});

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
app.use("/api/wallets", require("./routes/wallets"));
app.use("/api/customer", require("./routes/customer"));
app.use("/api/bugs", require("./routes/bugs"));
app.use("/api/admin/stations", require("./routes/adminStations"));
app.use("/api/inventory", require("./routes/inventory"));
app.use("/api/owner", require("./routes/ownerPanel"));
app.use("/api/owner/dashboard", require("./routes/ownerDashboard"));

// Error handler
app.use((err, req, res, next) => {
  logStartup.error(`${err.message}`);
  res.status(500).json({ error: err.message || "Server error" });
});

// Server startup
const preferred = parseInt(process.env.PORT, 10) || 4000;

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
        logStartup.error(`❌ Port ${port} is already in use!`);
        logStartup.error(
          `Please stop the process using port ${port} and try again.`
        );
        logStartup.error(
          `You can find the process with: netstat -ano | findstr :${port}`
        );
        process.exit(1);
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
