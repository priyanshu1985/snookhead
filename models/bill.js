module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Bill",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      bill_number: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Allow null for direct bills without orders
        references: {
          model: "orders",
          key: "id",
        },
      },
      customer_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Walk-in Customer",
      },
      customer_phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },
      table_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "tables",
          key: "id",
        },
      },
      session_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "active_tables",
          key: "active_id",
        },
      },
      table_charges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      menu_charges: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      status: {
        type: DataTypes.ENUM("pending", "paid", "refunded"),
        defaultValue: "pending",
        allowNull: false,
      },
      bill_items: {
        type: DataTypes.JSON,
        allowNull: true,
      },
      items_summary: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      session_duration: {
        type: DataTypes.INTEGER, // in minutes
        allowNull: true,
      },
      paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      details: { type: DataTypes.TEXT },
    },
    {
      tableName: "bills",
      timestamps: true,
      indexes: [
        {
          fields: ["bill_number"],
        },
        {
          fields: ["customer_phone"],
        },
        {
          fields: ["status"],
        },
        {
          fields: ["table_id"],
        },
      ],
    }
  );
};
