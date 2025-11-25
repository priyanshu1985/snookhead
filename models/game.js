module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Game', {
    game_id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    game_name: { type: DataTypes.STRING(250), allowNull: false },
    game_createdon: { type: DataTypes.DATE },
    created_by: { type: DataTypes.STRING(100) },
    game_modify: { type: DataTypes.STRING(250) },
    modified_by: { type: DataTypes.STRING(250) }
  }, { tableName: 'games', timestamps: false });
};
