module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ActiveTable', {
    active_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    table_id: { type: DataTypes.STRING(50), allowNull: false },
    game_id: { type: DataTypes.INTEGER, allowNull: false },
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: true },
    booking_end_time: { type: DataTypes.DATE, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('active','paused','completed'), defaultValue: 'active' }
  }, { tableName: 'active_tables', timestamps: false });
};
