module.exports = (sequelize, DataTypes) => {
  return sequelize.define('FoodItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(150), allowNull: false },
    image_url: { type: DataTypes.STRING(300) },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    station_id: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'food_items', timestamps: false });
};
