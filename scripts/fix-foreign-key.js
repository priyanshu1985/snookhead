const { sequelize } = require("../config/database");

async function fixForeignKeyConstraints() {
  try {
    console.log("Fixing foreign key constraints...");

    // First, drop the existing foreign key constraint that references food_items
    await sequelize
      .query(
        `
      ALTER TABLE orderitems 
      DROP FOREIGN KEY orderitems_ibfk_2;
    `
      )
      .catch((err) => {
        console.log("Constraint might not exist:", err.message);
      });

    // Add the correct foreign key constraint that references menuitems
    await sequelize.query(`
      ALTER TABLE orderitems 
      ADD CONSTRAINT orderitems_menuitem_fk 
      FOREIGN KEY (menuItemId) REFERENCES menuitems(id) 
      ON DELETE CASCADE ON UPDATE CASCADE;
    `);

    console.log("✅ Foreign key constraints fixed successfully!");
    console.log("OrderItems now correctly reference MenuItems table");
  } catch (error) {
    console.error("❌ Error fixing foreign key constraints:", error);

    // If the constraint already exists with correct reference
    if (error.message.includes("Duplicate key name")) {
      console.log("✅ Constraint already exists with correct reference");
    }
  } finally {
    await sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  fixForeignKeyConstraints();
}

module.exports = { fixForeignKeyConstraints };
