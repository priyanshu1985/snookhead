module.exports = (sequelize, DataTypes) => {
  const Inventory = sequelize.define(
    "Inventory",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      item_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [1, 100],
        },
      },
      category: {
        type: DataTypes.ENUM(
          "food_drinks",
          "snooker_equipment",
          "cleaning_supplies",
          "office_supplies",
          "maintenance",
          "electronics",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },
      current_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      minimum_threshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
        validate: {
          min: 0,
        },
      },
      unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "pieces",
        validate: {
          notEmpty: true,
        },
      },
      cost_per_unit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        validate: {
          min: 0,
        },
      },
      supplier: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      last_restocked: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: "inventory",
      timestamps: true,
      indexes: [
        {
          fields: ["category"],
        },
        {
          fields: ["item_name"],
          unique: true,
        },
      ],
    }
  );

  return Inventory;
};
