module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      personName: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      paymentMethod: {
        type: DataTypes.ENUM("offline", "online", "hybrid"),
        defaultValue: "offline",
      },
      cashAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      onlineAmount: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM("pending", "completed", "cancelled"),
        defaultValue: "pending",
      },
    },
    {
      tableName: "orders",
      timestamps: true,
    }
  );
};
