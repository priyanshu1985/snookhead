const express = require("express");
const router = express.Router();
const { Op, fn, col, literal } = require("sequelize");
const { authMiddleware } = require("../middleware/auth");

// Get models
let models;
const getModels = () => {
  if (!models) {
    models = require("../models");
  }
  return models;
};

// Helper: Get date range based on period
function getDateRange(period) {
  const now = new Date();
  let startDate;

  switch (period.toLowerCase()) {
    case "day":
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week":
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      break;
    case "month":
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate = new Date(now);
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
  }

  return { startDate, endDate: now };
}

// GET /api/owner/dashboard/stats - Get dashboard statistics
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const { Wallet, Customer, Bill, ActiveTable, Order } = getModels();

    // Get previous period for comparison
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    // Active wallets (wallets with balance > 0)
    const activeWallets = await Wallet.count({
      where: { balance: { [Op.gt]: 0 } }
    });

    const prevActiveWallets = await Wallet.count({
      where: {
        balance: { [Op.gt]: 0 },
        createdAt: { [Op.lt]: startDate }
      }
    });

    // New members in current period
    const newMembers = await Customer.count({
      where: {
        createdAt: { [Op.between]: [startDate, endDate] }
      }
    });

    const prevNewMembers = await Customer.count({
      where: {
        createdAt: { [Op.between]: [prevStartDate, prevEndDate] }
      }
    });

    // Inactive wallets (wallets with balance = 0)
    const inactiveWallets = await Wallet.count({
      where: { balance: { [Op.eq]: 0 } }
    });

    // Credit members (wallets with negative balance or customers with pending bills)
    const creditMembers = await Wallet.count({
      where: { balance: { [Op.lt]: 0 } }
    });

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    const stats = [
      {
        id: 1,
        title: "Active Wallets",
        value: activeWallets.toString(),
        trend: calculateTrend(activeWallets, prevActiveWallets),
        icon: "wallet-outline",
        bgColor: "#FFF3E0",
        trendColor: "#FF8C42",
        positive: activeWallets >= prevActiveWallets,
      },
      {
        id: 2,
        title: "New Members",
        value: newMembers.toString(),
        trend: calculateTrend(newMembers, prevNewMembers),
        icon: "people-outline",
        bgColor: "#E8F5E9",
        trendColor: newMembers >= prevNewMembers ? "#4CAF50" : "#FF5252",
        positive: newMembers >= prevNewMembers,
      },
      {
        id: 3,
        title: "Inactive Wallets",
        value: inactiveWallets.toString(),
        trend: `Total: ${inactiveWallets}`,
        icon: "person-remove-outline",
        bgColor: "#F3E5F5",
        trendColor: "#999",
        positive: false,
      },
      {
        id: 4,
        title: "Credit Members",
        value: creditMembers.toString(),
        trend: creditMembers > 0 ? "Alert" : "None",
        icon: "alert-circle-outline",
        bgColor: "#FFEBEE",
        trendColor: creditMembers > 0 ? "#FF5252" : "#4CAF50",
        positive: false,
        isAlert: creditMembers > 0,
      },
    ];

    res.json({ stats, period });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Server error fetching statistics" });
  }
});

// GET /api/owner/dashboard/game-utilization - Get game utilization data
router.get("/game-utilization", authMiddleware, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const { Game, ActiveTable, Bill, sequelize } = getModels();

    // Get all games with their usage statistics
    const games = await Game.findAll({
      attributes: ["game_id", "game_name", "image_key"],
    });

    // Calculate usage and revenue for each game
    const gameData = await Promise.all(
      games.map(async (game) => {
        // Count active sessions for this game in the period
        const sessionCount = await ActiveTable.count({
          where: {
            game_id: game.game_id,
            start_time: { [Op.between]: [startDate, endDate] }
          }
        });

        // Get total sessions across all games in the period
        const totalSessions = await ActiveTable.count({
          where: {
            start_time: { [Op.between]: [startDate, endDate] }
          }
        });

        // Calculate usage percentage
        const usage = totalSessions > 0 ? Math.round((sessionCount / totalSessions) * 100) : 0;

        // Calculate revenue for this game (from bills related to active sessions)
        const revenueResult = await Bill.findOne({
          attributes: [
            [fn("SUM", col("total_amount")), "totalRevenue"]
          ],
          include: [{
            model: require("../models").Order,
            attributes: [],
            required: true,
            include: [{
              model: ActiveTable,
              attributes: [],
              required: true,
              where: {
                game_id: game.game_id,
                start_time: { [Op.between]: [startDate, endDate] }
              }
            }]
          }],
          raw: true
        }).catch(() => ({ totalRevenue: 0 }));

        const revenue = parseFloat(revenueResult?.totalRevenue || 0);

        // Determine status based on usage
        let status, statusColor;
        if (usage >= 70) {
          status = "High usage";
          statusColor = "#4CAF50";
        } else if (usage >= 40) {
          status = "Good usage";
          statusColor = "#FFC107";
        } else {
          status = "Low usage";
          statusColor = "#FF5252";
        }

        return {
          name: game.game_name,
          usage,
          revenue: `₹${revenue.toFixed(0)}`,
          revenueValue: revenue,
          status,
          statusColor,
          icon: "game-controller-outline",
          sessionCount,
        };
      })
    );

    // Sort by usage descending
    gameData.sort((a, b) => b.usage - a.usage);

    // Prepare chart data (top 6 games)
    const colors = ["#42A5F5", "#66BB6A", "#AB47BC", "#EC407A", "#EF7350", "#FFA726"];
    const chartData = gameData.slice(0, 6).map((game, idx) => ({
      game: game.name,
      value: game.usage,
      color: colors[idx % colors.length],
    }));

    res.json({
      gameData,
      chartData,
      period
    });
  } catch (error) {
    console.error("Error fetching game utilization:", error);
    res.status(500).json({ error: "Server error fetching game utilization" });
  }
});

// GET /api/owner/dashboard/revenue - Get revenue analytics
router.get("/revenue", authMiddleware, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const { Bill, Order } = getModels();

    // Total revenue in period
    const revenueResult = await Bill.findOne({
      attributes: [
        [fn("SUM", col("total_amount")), "totalRevenue"],
        [fn("COUNT", col("id")), "totalBills"]
      ],
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
        status: "paid"
      },
      raw: true
    });

    // Previous period revenue
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    const prevRevenueResult = await Bill.findOne({
      attributes: [
        [fn("SUM", col("total_amount")), "totalRevenue"]
      ],
      where: {
        createdAt: { [Op.between]: [prevStartDate, prevEndDate] },
        status: "paid"
      },
      raw: true
    });

    const currentRevenue = parseFloat(revenueResult?.totalRevenue || 0);
    const prevRevenue = parseFloat(prevRevenueResult?.totalRevenue || 0);

    // Calculate revenue trend
    let revenueTrend = "0%";
    if (prevRevenue > 0) {
      const change = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
      revenueTrend = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    } else if (currentRevenue > 0) {
      revenueTrend = "+100%";
    }

    // Daily/weekly breakdown
    const revenueBreakdown = await Bill.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("SUM", col("total_amount")), "revenue"],
        [fn("COUNT", col("id")), "count"]
      ],
      where: {
        createdAt: { [Op.between]: [startDate, endDate] },
        status: "paid"
      },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true
    });

    res.json({
      totalRevenue: currentRevenue,
      totalRevenueFormatted: `₹${currentRevenue.toFixed(2)}`,
      totalBills: parseInt(revenueResult?.totalBills || 0),
      revenueTrend,
      revenueBreakdown,
      period
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ error: "Server error fetching revenue" });
  }
});

// GET /api/owner/dashboard/summary - Get complete dashboard summary
router.get("/summary", authMiddleware, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const { Wallet, Customer, Bill, ActiveTable, Game, TableAsset, Order } = getModels();

    // Current date for display
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Get previous period for comparison
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    // ===== STATS =====
    const [
      activeWallets,
      newMembers,
      prevNewMembers,
      inactiveWallets,
      creditMembers,
      totalRevenue,
      prevTotalRevenue,
      totalSessions,
      activeTables
    ] = await Promise.all([
      Wallet.count({ where: { balance: { [Op.gt]: 0 } } }),
      Customer.count({ where: { createdAt: { [Op.between]: [startDate, endDate] } } }),
      Customer.count({ where: { createdAt: { [Op.between]: [prevStartDate, prevEndDate] } } }),
      Wallet.count({ where: { balance: { [Op.eq]: 0 } } }),
      Wallet.count({ where: { balance: { [Op.lt]: 0 } } }),
      Bill.sum("total_amount", { where: { createdAt: { [Op.between]: [startDate, endDate] }, status: "paid" } }),
      Bill.sum("total_amount", { where: { createdAt: { [Op.between]: [prevStartDate, prevEndDate] }, status: "paid" } }),
      ActiveTable.count({ where: { start_time: { [Op.between]: [startDate, endDate] } } }),
      ActiveTable.count({ where: { status: "active" } })
    ]);

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? "+100%" : "0%";
      const change = ((current - previous) / previous) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    const stats = [
      {
        id: 1,
        title: "Active Wallets",
        value: activeWallets.toString(),
        trend: `${activeWallets} total`,
        icon: "wallet-outline",
        bgColor: "#FFF3E0",
        trendColor: "#FF8C42",
        positive: true,
      },
      {
        id: 2,
        title: "New Members",
        value: newMembers.toString(),
        trend: calculateTrend(newMembers, prevNewMembers),
        icon: "people-outline",
        bgColor: "#E8F5E9",
        trendColor: newMembers >= prevNewMembers ? "#4CAF50" : "#FF5252",
        positive: newMembers >= prevNewMembers,
      },
      {
        id: 3,
        title: "Inactive Wallets",
        value: inactiveWallets.toString(),
        trend: `yesterday: ${inactiveWallets}`,
        icon: "person-remove-outline",
        bgColor: "#F3E5F5",
        trendColor: "#999",
        positive: false,
      },
      {
        id: 4,
        title: "Credit Member",
        value: creditMembers.toString(),
        trend: creditMembers > 0 ? "Alert" : "None",
        icon: "alert-circle-outline",
        bgColor: "#FFEBEE",
        trendColor: creditMembers > 0 ? "#FF5252" : "#4CAF50",
        positive: false,
        isAlert: creditMembers > 0,
      },
    ];

    // ===== GAME DATA =====
    const games = await Game.findAll({
      attributes: ["game_id", "game_name"],
    });

    const gameData = await Promise.all(
      games.map(async (game) => {
        const sessionCount = await ActiveTable.count({
          where: {
            game_id: game.game_id,
            start_time: { [Op.between]: [startDate, endDate] }
          }
        });

        const usage = totalSessions > 0 ? Math.round((sessionCount / totalSessions) * 100) : 0;

        // Estimate revenue based on sessions (simplified)
        const avgRevenuePerSession = 500; // Default estimate
        const revenue = sessionCount * avgRevenuePerSession;

        let status, statusColor;
        if (usage >= 70) {
          status = "High usage";
          statusColor = "#FF8C42";
        } else if (usage >= 40) {
          status = "Good usage";
          statusColor = "#FFC107";
        } else {
          status = "Low usage";
          statusColor = "#FF5252";
        }

        return {
          name: game.game_name,
          usage,
          revenue: `₹${revenue.toFixed(0)}`,
          status,
          statusColor,
          icon: "game-controller-outline",
        };
      })
    );

    // Sort by usage
    gameData.sort((a, b) => b.usage - a.usage);

    // Chart data
    const colors = ["#42A5F5", "#66BB6A", "#AB47BC", "#EC407A", "#EF7350", "#FFA726"];
    const chartData = gameData.slice(0, 6).map((game, idx) => ({
      game: game.name,
      value: game.usage || 0,
      color: colors[idx % colors.length],
    }));

    res.json({
      currentDate,
      period,
      stats,
      gameData: gameData.slice(0, 5),
      chartData,
      summary: {
        totalRevenue: totalRevenue || 0,
        totalRevenueFormatted: `₹${(totalRevenue || 0).toFixed(2)}`,
        revenueTrend: calculateTrend(totalRevenue || 0, prevTotalRevenue || 0),
        totalSessions,
        activeTables
      }
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Server error fetching dashboard summary" });
  }
});

module.exports = router;
