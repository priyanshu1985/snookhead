
module.exports = (sequelize, DataTypes) => {
  const KitchenExpense = sequelize.define(
    "KitchenExpense",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      itemName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      category: {
        type: DataTypes.ENUM(
          "Vegetables",
          "Spices",
          "Dairy",
          "Meat",
          "Grains",
          "Oils",
          "Other"
        ),
        allowNull: false,
        defaultValue: "Other",
      },
      quantity: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "kg",
      },
      cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      supplier: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      receiptUrl: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      stationid: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: "kitchen_expenses",
      timestamps: true,
    }
  );

  return KitchenExpense;
};
