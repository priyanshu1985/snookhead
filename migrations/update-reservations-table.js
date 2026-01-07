"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists first
      const tables = await queryInterface.showAllTables();
      if (!tables.includes("reservations")) {
        console.log("Reservations table does not exist. Creating...");
        await queryInterface.createTable(
          "reservations",
          {
            id: {
              type: Sequelize.INTEGER,
              autoIncrement: true,
              primaryKey: true,
            },
            userId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "users",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            tableId: {
              type: Sequelize.INTEGER,
              allowNull: true,
              references: {
                model: "tables",
                key: "id",
              },
              onUpdate: "CASCADE",
              onDelete: "CASCADE",
            },
            customerName: {
              type: Sequelize.STRING(100),
              allowNull: true,
            },
            customerPhone: {
              type: Sequelize.STRING(20),
              allowNull: true,
            },
            fromTime: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            toTime: {
              type: Sequelize.DATE,
              allowNull: true,
            },
            status: {
              type: Sequelize.ENUM("pending", "active", "done", "cancelled"),
              defaultValue: "pending",
            },
            notes: {
              type: Sequelize.STRING(255),
              allowNull: true,
            },
            createdAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
            updatedAt: {
              type: Sequelize.DATE,
              allowNull: false,
              defaultValue: Sequelize.literal(
                "CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"
              ),
            },
          },
          { transaction }
        );
        console.log("Reservations table created successfully");
        await transaction.commit();
        return;
      }

      // Check if columns exist before adding them
      const tableDescription = await queryInterface.describeTable(
        "reservations"
      );
      console.log(
        "Current reservations table structure:",
        Object.keys(tableDescription)
      );

      // Add customerName column if it doesn't exist
      if (!tableDescription.customerName) {
        console.log("Adding customerName column...");
        await queryInterface.addColumn(
          "reservations",
          "customerName",
          {
            type: Sequelize.STRING(100),
            allowNull: true,
          },
          { transaction }
        );
      }

      // Add customerPhone column if it doesn't exist
      if (!tableDescription.customerPhone) {
        console.log("Adding customerPhone column...");
        await queryInterface.addColumn(
          "reservations",
          "customerPhone",
          {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          { transaction }
        );
      }

      console.log("Migration completed successfully");
      await transaction.commit();
    } catch (error) {
      console.error("Migration failed:", error);
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if columns exist before removing them
      const tableDescription = await queryInterface.describeTable(
        "reservations"
      );

      if (tableDescription.customerName) {
        await queryInterface.removeColumn("reservations", "customerName", {
          transaction,
        });
      }

      if (tableDescription.customerPhone) {
        await queryInterface.removeColumn("reservations", "customerPhone", {
          transaction,
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
