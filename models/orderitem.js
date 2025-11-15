module.exports = (sequelize, DataTypes) => {
  return sequelize.define('OrderItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER },
    menuItemId: { type: DataTypes.INTEGER },
    qty: { type: DataTypes.INTEGER, defaultValue: 1 },
    priceEach: { type: DataTypes.DECIMAL(10,2) }
  }, { tableName: 'orderitems', timestamps: true });
};
