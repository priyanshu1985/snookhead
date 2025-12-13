module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Wallet", // ✅ Model name MUST be singular & PascalCase
    {
      id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4, // ✅ important
      },

      customer_id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        unique: true,
      },

      balance: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      credit_limit: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      currency: {
        type: DataTypes.STRING(3),
        allowNull: false,
        defaultValue: "INR",
      },

      reserved_amount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
      },

      last_transaction_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      phone_no: {
        type: DataTypes.STRING(14),
        allowNull: true,
      },

      qr_id: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },

      qr_code: {
        type: DataTypes.BLOB,
        allowNull: true,
      },
    },
    {
      tableName: "wallets",      // ✅ exact DB table
      timestamps: true,          // ✅ auto-manages createdAt / updatedAt
      charset: "utf8mb4",
      collate: "utf8mb4_bin",
      indexes: [
        {
          unique: true,
          fields: ["customer_id"],
        },
      ],
    }
  );
};
