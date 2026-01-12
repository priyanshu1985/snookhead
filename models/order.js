module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Order",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      station_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "stations",
          key: "id",
        },
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
        type: DataTypes.ENUM("pending", "ready", "completed", "cancelled"),
        defaultValue: "pending",
      },
      order_source: {
        type: DataTypes.ENUM("table_booking", "counter", "zomato", "swiggy"),
        defaultValue: "table_booking",
        allowNull: false,
      },
    },
    {
      tableName: "orders",
      timestamps: true,
    }
  );
};
