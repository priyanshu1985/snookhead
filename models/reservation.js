module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Reservation",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      station_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "stations",
          key: "id",
        },
      },
      userId: { type: DataTypes.INTEGER },
      tableId: { type: DataTypes.INTEGER },
      customerName: { type: DataTypes.STRING(100) },
      customerPhone: { type: DataTypes.STRING(20) },
      fromTime: { type: DataTypes.DATE },
      toTime: { type: DataTypes.DATE },
      status: {
        type: DataTypes.ENUM("pending", "active", "done", "cancelled"),
        defaultValue: "pending",
      },
      notes: { type: DataTypes.STRING(255) },
    },
    { tableName: "reservations", timestamps: true }
  );
};
