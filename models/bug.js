module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "Bug",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      title: {
        type: DataTypes.STRING(200),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      category: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "App Issue",
      },
      status: {
        type: DataTypes.ENUM("pending", "in_progress", "resolved", "closed"),
        defaultValue: "pending",
        allowNull: false,
      },
      priority: {
        type: DataTypes.ENUM("low", "medium", "high", "critical"),
        defaultValue: "medium",
        allowNull: false,
      },
      image_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      audio_url: {
        type: DataTypes.STRING(500),
        allowNull: true,
      },
      reported_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "users",
          key: "id",
        },
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      tableName: "bugs",
      timestamps: true,
      indexes: [
        {
          fields: ["status"],
        },
        {
          fields: ["category"],
        },
        {
          fields: ["priority"],
        },
        {
          fields: ["reported_by"],
        },
      ],
    }
  );
};
