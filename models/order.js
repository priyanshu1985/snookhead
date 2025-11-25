module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER },
    total: { type: DataTypes.DECIMAL(10,2) },
    status: { type: DataTypes.ENUM('pending','paid','cancelled'), defaultValue: 'pending' }
  }, { tableName: 'orders', timestamps: true });
};
