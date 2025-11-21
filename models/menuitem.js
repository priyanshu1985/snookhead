module.exports = (sequelize, DataTypes) => {
  return sequelize.define('MenuItem', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    category: { type: DataTypes.ENUM('prepared','packed','cigarette'), allowNull: false },
    description: { type: DataTypes.STRING(512) },
    price: { type: DataTypes.DECIMAL(10,2), allowNull: false },
    stock: { type: DataTypes.INTEGER, defaultValue: 0 },
    threshold: { type: DataTypes.INTEGER, defaultValue: 0 },
    supplierPhone: { type: DataTypes.STRING(20) },
    imageUrl: { type: DataTypes.STRING(320) }
  }, { tableName: 'menuitems', timestamps: true });
};
