module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Station",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      owner_user_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },

      station_name: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      onboarding_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      subscription_type: {
        type: DataTypes.ENUM("free", "basic", "pro", "enterprise"),
        allowNull: false,
        defaultValue: "free",
      },

      subscription_status: {
        type: DataTypes.ENUM("active", "paused", "expired"),
        defaultValue: "active",
      },

      location_city: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      location_state: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      owner_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      owner_phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      station_photo_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("active", "removed"),
        defaultValue: "active",
      },
    },
    {
      tableName: "stations",
      timestamps: true,
      indexes: [
        { fields: ["subscription_type"] },
        { fields: ["location_city"] },
        { fields: ["status"] },
      ],
    }
  );
};
