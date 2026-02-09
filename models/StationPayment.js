module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "StationPayment",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      station_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "stations",
          key: "id",
        },
      },

      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },

      subscription_type: {
        type: DataTypes.ENUM("free", "basic", "pro", "enterprise"),
        allowNull: false,
      },

      payment_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      status: {
        type: DataTypes.ENUM("pending", "success", "failed"),
        defaultValue: "pending",
      },

      transaction_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      payment_method: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
    },
    {
      tableName: "station_payments",
      timestamps: true,
    }
  );
};
