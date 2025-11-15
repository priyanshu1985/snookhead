require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const { sequelize } = require("./config/database");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const menuRoutes = require("./routes/menu");
const tableRoutes = require("./routes/tables");
const reservationRoutes = require("./routes/reservations");
const orderRoutes = require("./routes/orders");
const billRoutes = require("./routes/bills");
const healthRoutes = require("./routes/health");

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use("/api/auth", authRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/reservations", reservationRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/health", healthRoutes);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log("Database connected.");

    await sequelize.sync({ alter: true });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to start server:", err);
  }
}

start();
