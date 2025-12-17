module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Queue",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },

      customer_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },

      members: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },

      game_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      preferred_table_id: {
        type: DataTypes.INTEGER,
        allowNull: true, // null = any table of the game
      },

      estimated_wait_minutes: {
        type: DataTypes.INTEGER,
      },

      status: {
        type: DataTypes.ENUM(
          "waiting",
          "assigned",
          "seated",
          "served",
          "cancelled"
        ),
        defaultValue: "waiting",
      },

      created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: "queue",
      timestamps: false,
    }
  );
};
