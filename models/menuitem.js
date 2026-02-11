module.exports = (sequelize, DataTypes) => {
  return sequelize.define(
    "MenuItem",
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      stationid: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: "stations",
          key: "id",
        },
      },
      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      category: {
        type: DataTypes.STRING(100),
        allowNull: false,
        defaultValue: "Food",
      },
      item_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "prepared", // 'prepared' or 'packed'
      },
      description: {
        type: DataTypes.STRING(255),
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      purchasePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "piece",
      },
      is_available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      threshold: {
        type: DataTypes.INTEGER,
        defaultValue: 5,
      },
      supplierPhone: {
        type: DataTypes.STRING(20),
      },
      imageUrl: {
        type: DataTypes.STRING(255),
      },
    },
    {
      tableName: "menuitems",
      timestamps: true,
    },
  );
};
