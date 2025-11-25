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
        allowNull: false, // or true, if allowed to be empty
        references: {
          model: "games", // Name of the referenced table
          key: "id", // Name of the column (must exist in 'games')
        },
      },
    },
    { tableName: "tables", timestamps: true }
  );
};
