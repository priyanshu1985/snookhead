module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Reservation', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER },
    tableId: { type: DataTypes.INTEGER },
    fromTime: { type: DataTypes.DATE },
    toTime: { type: DataTypes.DATE },
    status: { type: DataTypes.ENUM('pending','active','done','cancelled'), defaultValue: 'pending' },
    notes: { type: DataTypes.STRING(255) }
  }, { tableName: 'reservations', timestamps: true });
};
