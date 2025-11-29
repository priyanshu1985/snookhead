"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if columns exist before adding them
      const tableDescription = await queryInterface.describeTable("bills");

      // Add bill_number column if it doesn't exist
      if (!tableDescription.bill_number) {
        await queryInterface.addColumn(
          "bills",
          "bill_number",
          {
            type: Sequelize.STRING(50),
            allowNull: true, // Allow null initially for existing records
            unique: false, // Remove unique constraint initially
          },
          { transaction }
        );
      }

      // Add customer_name column if it doesn't exist
      if (!tableDescription.customer_name) {
        await queryInterface.addColumn(
          "bills",
          "customer_name",
          {
            type: Sequelize.STRING(100),
            allowNull: false,
            defaultValue: "Walk-in Customer",
          },
          { transaction }
        );
      }

      // Add customer_phone column if it doesn't exist
      if (!tableDescription.customer_phone) {
        await queryInterface.addColumn(
          "bills",
          "customer_phone",
          {
            type: Sequelize.STRING(20),
            allowNull: true,
          },
          { transaction }
        );
      }

      // Add session_id column if it doesn't exist
      if (!tableDescription.session_id) {
        await queryInterface.addColumn(
          "bills",
          "session_id",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: "active_tables",
              key: "id",
            },
          },
          { transaction }
        );
      }

      // Add table_charges column if it doesn't exist
      if (!tableDescription.table_charges) {
        await queryInterface.addColumn(
          "bills",
          "table_charges",
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          { transaction }
        );
      }

      // Add menu_charges column if it doesn't exist
      if (!tableDescription.menu_charges) {
        await queryInterface.addColumn(
          "bills",
          "menu_charges",
          {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            defaultValue: 0,
          },
          { transaction }
        );
      }

      // Add bill_items column if it doesn't exist
      if (!tableDescription.bill_items) {
        await queryInterface.addColumn(
          "bills",
          "bill_items",
          {
            type: Sequelize.JSON,
            allowNull: true,
          },
          { transaction }
        );
      }

      // Add items_summary column if it doesn't exist
      if (!tableDescription.items_summary) {
        await queryInterface.addColumn(
          "bills",
          "items_summary",
          {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          { transaction }
        );
      }

      // Add session_duration column if it doesn't exist
      if (!tableDescription.session_duration) {
        await queryInterface.addColumn(
          "bills",
          "session_duration",
          {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          { transaction }
        );
      }

      // Add paid_at column if it doesn't exist
      if (!tableDescription.paid_at) {
        await queryInterface.addColumn(
          "bills",
          "paid_at",
          {
            type: Sequelize.DATE,
            allowNull: true,
          },
          { transaction }
        );
      }

      // Update existing records with bill numbers
      await queryInterface.sequelize.query(
        `
        UPDATE bills 
        SET bill_number = CONCAT('BILL-', LPAD(id, 6, '0')) 
        WHERE bill_number IS NULL
      `,
        { transaction }
      );

      // Now make bill_number NOT NULL and add unique constraint
      await queryInterface.changeColumn(
        "bills",
        "bill_number",
        {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
        },
        { transaction }
      );

      // Add indexes
      try {
        await queryInterface.addIndex("bills", ["bill_number"], {
          name: "bills_bill_number_idx",
          transaction,
        });
      } catch (e) {
        // Index might already exist
        console.log("Index bills_bill_number_idx might already exist");
      }

      try {
        await queryInterface.addIndex("bills", ["customer_phone"], {
          name: "bills_customer_phone_idx",
          transaction,
        });
      } catch (e) {
        // Index might already exist
        console.log("Index bills_customer_phone_idx might already exist");
      }

      try {
        await queryInterface.addIndex("bills", ["status"], {
          name: "bills_status_idx",
          transaction,
        });
      } catch (e) {
        // Index might already exist
        console.log("Index bills_status_idx might already exist");
      }

      await transaction.commit();
      console.log("Bills table updated successfully");
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove added columns
      const columnsToRemove = [
        "bill_number",
        "customer_name",
        "customer_phone",
        "session_id",
        "table_charges",
        "menu_charges",
        "bill_items",
        "items_summary",
        "session_duration",
        "paid_at",
      ];

      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn("bills", column, { transaction });
        } catch (e) {
          // Column might not exist
          console.log(`Column ${column} might not exist`);
        }
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
