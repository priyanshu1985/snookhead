module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Queue', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    phone: { type: DataTypes.STRING(20) },
    members: { type: DataTypes.INTEGER, defaultValue: 1 },
    tentative_time_span: { type: DataTypes.STRING(50) },
    status: { type: DataTypes.ENUM('waiting','served','cancelled'), defaultValue: 'waiting' },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'queue', timestamps: false });
};
