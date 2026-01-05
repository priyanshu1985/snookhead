module.exports = (sequelize, DataTypes) => {
  const OwnerSettings = sequelize.define(
    "OwnerSettings",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      setting_key: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
      setting_value: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "owner_settings",
      timestamps: false,
    }
  );

  return OwnerSettings;
};
