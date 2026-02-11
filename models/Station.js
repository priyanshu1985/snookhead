module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Station",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      owneruserid: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },

      stationname: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      onboardingdate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      subscriptiontype: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "free",
      },

      subscriptionstatus: {
        type: DataTypes.STRING(50),
        defaultValue: "active",
      },

      locationcity: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      locationstate: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },

      ownername: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      ownerphone: {
        type: DataTypes.STRING(20),
        allowNull: true,
      },

      stationphotourl: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.STRING(50),
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
    },
  );
};
