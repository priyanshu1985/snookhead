module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "OrderItem",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "orders",
          key: "id",
        },
      },
      menuItemId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "menuitems",
          key: "id",
        },
      },
      qty: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      priceEach: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0,
      },
    },
    {
      tableName: "orderitems",
      timestamps: true,
    }
  );
};
