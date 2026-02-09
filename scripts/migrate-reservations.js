const { Sequelize } = require("sequelize");
const { sequelize } = require("../config/database");

// Import the migration
const reservationsMigration = require("../migrations/update-reservations-table");

async function runMigration() {
  try {
    console.log("Starting reservations table migration...");

    // Test database connection
    await sequelize.authenticate();
    console.log("Database connection established.");

    // Create a query interface
    const queryInterface = sequelize.getQueryInterface();

    // Run the migration
    await reservationsMigration.up(queryInterface, Sequelize);

    console.log("Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
