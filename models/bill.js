module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Bill', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { type: DataTypes.INTEGER },
    total: { type: DataTypes.DECIMAL(10,2) },
    status: { type: DataTypes.ENUM('pending','paid','refunded'), defaultValue: 'pending' },
    details: { type: DataTypes.TEXT }
  }, { tableName: 'bills', timestamps: true });
};
