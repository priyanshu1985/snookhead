module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "TableAsset",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(50), allowNull: false },
      dimension: { type: DataTypes.STRING(32) },
      onboardDate: { type: DataTypes.DATEONLY },
      type: { type: DataTypes.STRING(32) },
      pricePerMin: { type: DataTypes.DECIMAL(10, 2) },
      status: {
        type: DataTypes.ENUM("available", "reserved", "maintenance"),
        defaultValue: "available",
      },
      frameCharge: { type: DataTypes.DECIMAL(10, 2) },
      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false, // Make required to prevent assignment to wrong games
        references: {
          model: "games", // Correct table name (should be 'games')
          key: "game_id", // Name of the column (must exist in 'games')
        },
      },
    },
    { tableName: "tables", timestamps: true }
  );
};
