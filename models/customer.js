module.exports = (sequelize, DataTypes) => {
  const Customer = sequelize.define(
    "Customer",
    {
      id: {
        type: DataTypes.CHAR(36),
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },

      external_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: true,
      },

      name: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
      },

      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        unique: true,
      },

      address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      station_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },

      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
    },
    {
      tableName: "customers",
      timestamps: true,
      charset: "utf8mb4",
      collate: "utf8mb4_0900_ai_ci",
      indexes: [
        { unique: true, fields: ["phone"] },
        { unique: true, fields: ["email"] },
        { unique: true, fields: ["external_id"] },
        { fields: ["is_active"] },
        { fields: ["created_by"] },
      ],
    }
  );

  return Customer;
};
