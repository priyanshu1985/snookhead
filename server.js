<<<<<<< HEAD
require('dotenv').config();
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const { sequelize } = require('./config/database');
const models = require('./models');
const { securityHeaders } = require('./middleware/security');
const { requestLogger } = require('./middleware/logger');
=======
require("dotenv").config();
const { validateEnv } = require("./config/env");
validateEnv();

const express = require("express");
const cors = require("cors");
const { sequelize } = require("./config/database");
const models = require("./models");
const { securityHeaders } = require("./middleware/security");
const { requestLogger } = require("./middleware/logger");
>>>>>>> backend2

const app = express();
app.use(requestLogger);
app.use(securityHeaders);
app.use(cors());
<<<<<<< HEAD
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
=======
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
>>>>>>> backend2

// routes

// --- create default admin if missing
async function createAdmin() {
  try {
    const { User } = models;
<<<<<<< HEAD
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@snookhead.com';
    const adminPass = process.env.ADMIN_PASS || 'admin123';
    const adminName = process.env.ADMIN_NAME || 'Administrator';
    const existing = await User.findOne({ where: { email: adminEmail } });
    if (!existing) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(adminPass, 10);
      await User.create({ name: adminName, email: adminEmail, passwordHash: hash, role: 'admin' });
      console.log('Default admin created:', adminEmail);
    } else {
      console.log('Admin user exists:', adminEmail);
    }
  } catch (err) {
    console.error('Error creating admin user:', err.message);
  }
}


app.use('/api/health', require('./routes/health'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/food', require('./routes/food'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/bills', require('./routes/bills'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/activeTables', require('./routes/activeTables'));
app.use('/api/queue', require('./routes/queue'));
app.use('/api/games', require('./routes/games'));
app.use('/api/debug', require('./routes/debug'));
=======
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
      console.log("Default admin created:", adminEmail);
    } else {
      console.log("Admin user exists:", adminEmail);
    }
  } catch (err) {
    console.error("Error creating admin user:", err.message);
  }
}

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
app.use("/api/debug", require("./routes/debug"));
>>>>>>> backend2

// error handler
app.use((err, req, res, next) => {
  console.error(err);
<<<<<<< HEAD
  res.status(500).json({ error: err.message || 'Server error' });
=======
  res.status(500).json({ error: err.message || "Server error" });
>>>>>>> backend2
});

// try preferred port, fallback if in use
const preferred = parseInt(process.env.PORT, 10) || 4000;
const maxPort = preferred + 10;

function startAt(port) {
<<<<<<< HEAD
  const server = app.listen(port, async () => {
    console.log(`Server listening on port ${port}`);
    try {
      await sequelize.authenticate();
      console.log('DB connected');
      // Skip sync - using existing database schema
      console.log('Using existing DB schema');
    } catch (e) {
      console.error('DB connection failed:', e.message);
      process.exit(1);
    }
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} in use, trying ${port+1}...`);
      if (port + 1 <= maxPort) startAt(port+1);
      else {
        console.error('No available ports in range', preferred, '-', maxPort);
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
=======
  const server = app
    .listen(port, async () => {
      console.log(`Server listening on port ${port}`);
      try {
        await sequelize.authenticate();
        console.log("DB connected");
        // Skip sync - using existing database schema
        console.log("Using existing DB schema");
      } catch (e) {
        console.error("DB connection failed:", e.message);
        process.exit(1);
      }
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        if (port + 1 <= maxPort) startAt(port + 1);
        else {
          console.error("No available ports in range", preferred, "-", maxPort);
          process.exit(1);
        }
      } else {
        console.error("Server error:", err);
        process.exit(1);
      }
    });
>>>>>>> backend2
}

// Initialize admin user and start server
(async () => {
  await createAdmin();
  startAt(preferred);
})();
