module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Bill', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    orderId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: {
        model: 'orders',
        key: 'id'
      }
    },
    total: { 
      type: DataTypes.DECIMAL(10,2), 
      allowNull: false,
      validate: {
        min: 0
      }
    },
    status: { 
      type: DataTypes.ENUM('pending','paid','refunded'), 
      defaultValue: 'pending',
      allowNull: false
    },
    details: { type: DataTypes.TEXT }
  }, { 
    tableName: 'bills', 
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['orderId']
      }
    ]
  });
};
