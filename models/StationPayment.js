module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "StationIssue",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },

      station_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "stations",
          key: "id",
        },
      },

      issue_title: {
        type: DataTypes.STRING(150),
        allowNull: false,
      },

      issue_description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM("open", "in_progress", "resolved"),
        defaultValue: "open",
      },
    },
    {
      tableName: "station_issues",
      timestamps: true,
    }
  );
};