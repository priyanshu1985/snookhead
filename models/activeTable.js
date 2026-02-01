module.exports = (sequelize, DataTypes) => {
  return sequelize.define('ActiveTable', {
    activeid: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stationid: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "stations",
        key: "id",
      },
    },
    tableid: { type: DataTypes.STRING(50), allowNull: false },
    gameid: { type: DataTypes.INTEGER, allowNull: false },
    starttime: { type: DataTypes.DATE, allowNull: false },
    endtime: { type: DataTypes.DATE, allowNull: true },
    bookingendtime: { type: DataTypes.DATE, allowNull: true },
    durationminutes: { type: DataTypes.INTEGER, allowNull: true },
    customer_name: { type: DataTypes.STRING, allowNull: true },
    bookingtype: { type: DataTypes.STRING, allowNull: true }, 
    framecount: { type: DataTypes.INTEGER, allowNull: true },
    status: { type: DataTypes.ENUM('active','paused','completed'), defaultValue: 'active' }
  }, { tableName: 'active_tables', timestamps: false });
};
