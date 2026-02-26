export default (sequelize, DataTypes) => {
    return sequelize.define(
        "WalletTransaction",
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true,
            },
            wallet_id: {
                type: DataTypes.UUID,
                allowNull: false,
                references: {
                    model: "wallets",
                    key: "id",
                },
            },
            amount: {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: false,
            },
            type: {
                type: DataTypes.ENUM("CREDIT", "DEBIT"),
                allowNull: false,
            },
            description: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            reference_id: {
                type: DataTypes.STRING,
                allowNull: true,
            },
            station_id: {
                type: DataTypes.INTEGER,
                allowNull: true,
            },
            created_at: {
                type: DataTypes.DATE,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "wallet_transactions",
            timestamps: false, // We use created_at manually or via default
            underscored: true,
        }
    );
};
