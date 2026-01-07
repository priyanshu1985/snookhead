const bcrypt = require("bcrypt");

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
    {
      id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: DataTypes.STRING(80), allowNull: false },
      email: { type: DataTypes.STRING(120), allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING(128) },
      phone: { type: DataTypes.STRING(20) },
      role: {
        type: DataTypes.ENUM("staff", "owner", "admin", "customer"),
        defaultValue: "customer",
      },
      owner_panel_password: { type: DataTypes.STRING(128), allowNull: true }, // Hashed owner panel password
      owner_panel_setup: { type: DataTypes.BOOLEAN, defaultValue: false }, // Track if user has set up owner panel password
    },
    {
      tableName: "users",
      timestamps: true,
    }
  );

  User.prototype.checkPassword = function (password) {
    return bcrypt.compare(password, this.passwordHash);
  };

  return User;
};
