import express from "express";
import { getSupabase } from "../config/supabase.js";
import { auth } from "../middleware/auth.js";
import {
  stationContext,
  addStationFilter,
} from "../middleware/stationContext.js";

const router = express.Router();

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

// Helper to apply station filter to Supabase query
const applyStationFilter = (query, stationId) => {
  if (stationId) {
    return query.eq("stationid", stationId);
  }
  return query;
};

// GET /api/owner/dashboard/stats - Get dashboard statistics (filtered by station)
router.get("/stats", auth, stationContext, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const supabase = getSupabase();

    // Get previous period for comparison
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    // Active wallets (wallets with balance > 0)
    let activeWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .gt("balance", 0);
    activeWalletsQuery = applyStationFilter(activeWalletsQuery, req.stationId);
    const { count: activeWallets } = await activeWalletsQuery;

    let prevActiveWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .gt("balance", 0)
      .lt("created_at", startDate.toISOString());
    prevActiveWalletsQuery = applyStationFilter(prevActiveWalletsQuery, req.stationId);
    const { count: prevActiveWallets } = await prevActiveWalletsQuery;

    // New members
    let newMembersQuery = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());
    newMembersQuery = applyStationFilter(newMembersQuery, req.stationId);
    const { count: newMembers } = await newMembersQuery;

    let prevNewMembersQuery = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevStartDate.toISOString())
      .lte("created_at", prevEndDate.toISOString());
    prevNewMembersQuery = applyStationFilter(prevNewMembersQuery, req.stationId);
    const { count: prevNewMembers } = await prevNewMembersQuery;

    // Inactive wallets
    let inactiveWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .eq("balance", 0);
    inactiveWalletsQuery = applyStationFilter(inactiveWalletsQuery, req.stationId);
    const { count: inactiveWallets } = await inactiveWalletsQuery;

    // Credit members
    let creditMembersQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .lt("balance", 0);
    creditMembersQuery = applyStationFilter(creditMembersQuery, req.stationId);
    const { count: creditMembers } = await creditMembersQuery;

    // Calculate trends
    const calculateTrend = (current, previous) => {
      const curr = current || 0;
      const prev = previous || 0;
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const change = ((curr - prev) / prev) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    const stats = [
      {
        id: 1,
        title: "Active Wallets",
        value: (activeWallets || 0).toString(),
        trend: calculateTrend(activeWallets, prevActiveWallets),
        icon: "wallet-outline",
        bgColor: "#FFF3E0",
        trendColor: "#FF8C42",
        positive: (activeWallets || 0) >= (prevActiveWallets || 0),
      },
      {
        id: 2,
        title: "New Members",
        value: (newMembers || 0).toString(),
        trend: calculateTrend(newMembers, prevNewMembers),
        icon: "people-outline",
        bgColor: "#E8F5E9",
        trendColor: (newMembers || 0) >= (prevNewMembers || 0) ? "#4CAF50" : "#FF5252",
        positive: (newMembers || 0) >= (prevNewMembers || 0),
      },
      {
        id: 3,
        title: "Inactive Wallets",
        value: (inactiveWallets || 0).toString(),
        trend: `Total: ${inactiveWallets || 0}`,
        icon: "person-remove-outline",
        bgColor: "#F3E5F5",
        trendColor: "#999",
        positive: false,
      },
      {
        id: 4,
        title: "Credit Members",
        value: (creditMembers || 0).toString(),
        trend: creditMembers > 0 ? "Alert" : "None",
        icon: "alert-circle-outline",
        bgColor: "#FFEBEE",
        trendColor: creditMembers > 0 ? "#FF5252" : "#4CAF50",
        positive: false,
        isAlert:CreditMembers > 0,
      },
    ];

    res.json({ stats, period });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ error: "Server error fetching statistics" });
  }
});

// GET /api/owner/dashboard/game-utilization - filtered by station
router.get("/game-utilization", auth, stationContext, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const supabase = getSupabase();

    // Get all games for this station
    let gamesQuery = supabase.from("games").select("game_id:gameid, game_name:gamename, image_key");
    gamesQuery = applyStationFilter(gamesQuery, req.stationId);
    const { data: games, error: gamesError } = await gamesQuery;
    
    if (gamesError) throw gamesError;

    // Calculate usage and revenue for each game
    const gameData = await Promise.all(
      (games || []).map(async (game) => {
        // Count active sessions for this game in the period
        let sessionQuery = supabase
          .from("activetables")
          .select("activeid", { count: "exact", head: true })
          .eq("gameid", game.game_id)
          .gte("starttime", startDate.toISOString())
          .lte("starttime", endDate.toISOString());
        
        sessionQuery = applyStationFilter(sessionQuery, req.stationId);
        const { count: sessionCount } = await sessionQuery;

        // Get total sessions across all games in the period
        let totalSessionsQuery = supabase
          .from("activetables")
          .select("activeid", { count: "exact", head: true })
          .gte("starttime", startDate.toISOString())
          .lte("starttime", endDate.toISOString());
        
        totalSessionsQuery = applyStationFilter(totalSessionsQuery, req.stationId);
        const { count: totalSessions } = await totalSessionsQuery;

        // Calculate usage percentage
        const usage =
          (totalSessions || 0) > 0
            ? Math.round(((sessionCount || 0) / (totalSessions || 1)) * 100)
            : 0;

        // Estimate revenue based on sessions
        const avgRevenuePerSession = 500;
        const revenue = (sessionCount || 0) * avgRevenuePerSession;

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
          sessionCount: sessionCount || 0,
        };
      })
    );

    // Sort by usage descending
    gameData.sort((a, b) => b.usage - a.usage);

    // Prepare chart data (top 6 games)
    const colors = [
      "#42A5F5",
      "#66BB6A",
      "#AB47BC",
      "#EC407A",
      "#EF7350",
      "#FFA726",
    ];
    const chartData = gameData.slice(0, 6).map((game, idx) => ({
      game: game.name,
      value: game.usage,
      color: colors[idx % colors.length],
    }));

    res.json({
      gameData,
      chartData,
      period,
    });
  } catch (error) {
    console.error("Error fetching game utilization:", error);
    res.status(500).json({ error: "Server error fetching game utilization" });
  }
});

// GET /api/owner/dashboard/revenue - filtered by station
router.get("/revenue", auth, stationContext, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const supabase = getSupabase();

    // Total revenue in period
    let revenueQuery = supabase
      .from("bills")
      .select("totalamount")
      .gte("createdat", startDate.toISOString())
      .lte("createdat", endDate.toISOString())
      .eq("status", "paid");
    
    revenueQuery = applyStationFilter(revenueQuery, req.stationId);
    const { data: revenueData, error: revenueError } = await revenueQuery;
    
    if (revenueError) throw revenueError;

    const totalRevenue = (revenueData || []).reduce((sum, bill) => sum + (Number(bill.totalamount) || 0), 0);
    const totalBills = (revenueData || []).length;

    // Previous period revenue
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    let prevRevenueQuery = supabase
      .from("bills")
      .select("totalamount")
      .gte("createdat", prevStartDate.toISOString())
      .lte("createdat", prevEndDate.toISOString())
      .eq("status", "paid");
    
    prevRevenueQuery = applyStationFilter(prevRevenueQuery, req.stationId);
    const { data: prevRevenueData } = await prevRevenueQuery;
    
    const prevRevenue = (prevRevenueData || []).reduce((sum, bill) => sum + (Number(bill.totalamount) || 0), 0);

    // Calculate revenue trend
    let revenueTrend = "0%";
    if (prevRevenue > 0) {
      const change = ((totalRevenue - prevRevenue) / prevRevenue) * 100;
      revenueTrend = `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    } else if (totalRevenue > 0) {
      revenueTrend = "+100%";
    }

    // Daily/weekly breakdown
    // Note: Grouping by date isn't directly supported in simple select without RPC.
    // We will do it in JS.
    const revenueBreakdownMap = {};
    (revenueData || []).forEach(bill => {
        // Adjust date logic if needed, simplify to YYYY-MM-DD
        const dateKey = new Date(bill.createdat || new Date()).toISOString().split('T')[0]; 
        if (!revenueBreakdownMap[dateKey]) {
            revenueBreakdownMap[dateKey] = { date: dateKey, revenue: 0, count: 0 };
        }
        revenueBreakdownMap[dateKey].revenue += Number(bill.totalamount) || 0;
        revenueBreakdownMap[dateKey].count += 1;
    });
    
    const revenueBreakdown = Object.values(revenueBreakdownMap).sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      totalRevenue: totalRevenue,
      totalRevenueFormatted: `₹${totalRevenue.toFixed(2)}`,
      totalBills: totalBills,
      revenueTrend,
      revenueBreakdown,
      period,
    });
  } catch (error) {
    console.error("Error fetching revenue:", error);
    res.status(500).json({ error: "Server error fetching revenue" });
  }
});

// GET /api/owner/dashboard/summary - filtered by station
router.get("/summary", auth, stationContext, async (req, res) => {
  try {
    const { period = "week" } = req.query;
    const { startDate, endDate } = getDateRange(period);
    const supabase = getSupabase();

    // Current date for display
    const currentDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Get previous period for comparison
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);
    const prevEndDate = startDate;

    // ===== STATS - filters applied manually via supabase chain helpers =====
    
    // Active Wallets
    let activeWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .gt("balance", 0);
    activeWalletsQuery = applyStationFilter(activeWalletsQuery, req.stationId);
    
    // New Members
    let newMembersQuery = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", startDate.toISOString())
      .lte("created_at", endDate.toISOString());
    newMembersQuery = applyStationFilter(newMembersQuery, req.stationId);
    
    // Prev New Members
    let prevNewMembersQuery = supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .gte("created_at", prevStartDate.toISOString())
      .lte("created_at", prevEndDate.toISOString());
    prevNewMembersQuery = applyStationFilter(prevNewMembersQuery, req.stationId);
    
    // Inactive Wallets
    let inactiveWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .eq("balance", 0);
    inactiveWalletsQuery = applyStationFilter(inactiveWalletsQuery, req.stationId);

    // Credit Wallets
    let creditMembersQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .lt("balance", 0);
    creditMembersQuery = applyStationFilter(creditMembersQuery, req.stationId);

    // Total Revenue (bills paid in dates) - Get tablecharges and menucharges
    let revenueQuery = supabase
      .from("bills")
      .select("totalamount, tablecharges, menucharges, sessionduration, createdat")
      .gte("createdat", startDate.toISOString())
      .lte("createdat", endDate.toISOString())
      .eq("status", "paid");
    revenueQuery = applyStationFilter(revenueQuery, req.stationId);

    // Prev Total Revenue
    let prevRevenueQuery = supabase
      .from("bills")
      .select("totalamount")
      .gte("createdat", prevStartDate.toISOString())
      .lte("createdat", prevEndDate.toISOString())
      .eq("status", "paid");
    prevRevenueQuery = applyStationFilter(prevRevenueQuery, req.stationId);

    // Total Sessions (Active + Completed in period?)
    // Actually, dashboard usually tracks *activity*. Using bills for completed session stats (duration) and activeTables for current load.
    let totalSessionsQuery = supabase
      .from("activetables")
      .select("*", { count: "exact", head: true })
      .gte("starttime", startDate.toISOString())
      .lte("starttime", endDate.toISOString());
    totalSessionsQuery = applyStationFilter(totalSessionsQuery, req.stationId);

    // Active Tables
    let activeTablesQuery = supabase
      .from("activetables")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    activeTablesQuery = applyStationFilter(activeTablesQuery, req.stationId);

    // Total Tables
    let totalTablesQuery = supabase
      .from("tables")
      .select("*", { count: "exact", head: true });
    totalTablesQuery = applyStationFilter(totalTablesQuery, req.stationId);

    // Low Stock Items (Inventory where quantity < 5)
    let lowStockQuery = supabase
      .from("inventory")
      .select("*", { count: "exact", head: true })
      .lt("quantity", 5);
      // Inventory might use station_id? Usually yes.
    lowStockQuery = applyStationFilter(lowStockQuery, req.stationId);


    const [
      { count: activeWallets },
      { count: newMembers },
      { count: prevNewMembers },
      { count: inactiveWallets },
      { count: creditMembers },
      { data: revenueData },
      { data: prevRevenueData },
      { count: totalSessions },
      { count: activeTables },
      { count: totalTables },
      { count: lowStockCount }
    ] = await Promise.all([
      activeWalletsQuery,
      newMembersQuery,
      prevNewMembersQuery,
      inactiveWalletsQuery,
      creditMembersQuery,
      revenueQuery,
      prevRevenueQuery,
      totalSessionsQuery,
      activeTablesQuery,
      totalTablesQuery,
      lowStockQuery
    ]);

    // Calculate Occupancy Rate
    const occupancyRate = (totalTables || 0) > 0 
        ? Math.round(((activeTables || 0) / (totalTables || 1)) * 100) 
        : 0;

    // Financials Breakdown from REVENUE_DATA (Paid Bills)
    const bills = revenueData || [];
    const totalRevenue = bills.reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);
    const gameRevenue = bills.reduce((sum, b) => sum + (Number(b.tablecharges) || 0), 0);
    const foodRevenue = bills.reduce((sum, b) => sum + (Number(b.menucharges) || 0), 0);
    
    // Session Duration Stats (from Bills as they store final duration)
    const validDurationBills = bills.filter(b => b.sessionduration > 0);
    const avgSessionDuration = validDurationBills.length > 0
        ? Math.round(validDurationBills.reduce((sum, b) => sum + b.sessionduration, 0) / validDurationBills.length)
        : 0;

    // Peak Hours (Simple Heatmap)
    const hoursMap = new Array(24).fill(0);
    bills.forEach(b => {
        const date = new Date(b.createdat); // Using bill creation time as proxy for session end/payment time (peak)
        const hour = date.getHours();
        hoursMap[hour]++;
    });
    // Find peak hour
    const peakHourVal = Math.max(...hoursMap);
    const peakHourIndex = hoursMap.indexOf(peakHourVal);
    const peakHourLabel = `${peakHourIndex}:00 - ${peakHourIndex+1}:00`;


    const prevRevenueVal = (prevRevenueData || []).reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);
    const expenses = 0; // Placeholder
    const netProfit = totalRevenue - expenses;

    // Calculate trends
    const calculateTrend = (current, previous) => {
      const curr = current || 0;
      const prev = previous || 0;
      if (prev === 0) return curr > 0 ? "+100%" : "0%";
      const change = ((curr - prev) / prev) * 100;
      return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
    };

    const stats = [
      {
        id: 1,
        title: "Active Wallets",
        value: (activeWallets || 0).toString(),
        trend: `${activeWallets || 0} total`,
        icon: "wallet-outline",
        bgColor: "#FFF3E0",
        trendColor: "#FF8C42",
        positive: true,
      },
      {
        id: 2,
        title: "New Members",
        value: (newMembers || 0).toString(),
        trend: calculateTrend(newMembers, prevNewMembers),
        icon: "people-outline",
        bgColor: "#E8F5E9",
        trendColor: (newMembers || 0) >= (prevNewMembers || 0) ? "#4CAF50" : "#FF5252",
        positive: (newMembers || 0) >= (prevNewMembers || 0),
      },
      {
        id: 3,
        title: "Low Stock Items",
        value: (lowStockCount || 0).toString(),
        trend: (lowStockCount || 0) > 0 ? "Action Needed" : "Healthy",
        icon: "alert-circle-outline", // Using existing icon set
        bgColor: (lowStockCount || 0) > 0 ? "#FFEBEE" : "#E8F5E9", // Red if low stock
        trendColor: (lowStockCount || 0) > 0 ? "#FF5252" : "#4CAF50",
        positive: (lowStockCount || 0) === 0,
      },
      {
        id: 4,
        title: "Credit Member",
        value: (creditMembers || 0).toString(),
        trend: creditMembers > 0 ? "Alert" : "None",
        icon: "alert-circle-outline",
        bgColor: "#FFEBEE",
        trendColor: creditMembers > 0 ? "#FF5252" : "#4CAF50",
        positive: false,
        isAlert: (creditMembers || 0) > 0,
      },
    ];

    // ===== GAME DATA - filtered by station =====
    let gamesQuery = supabase.from("games").select("game_id:gameid, game_name:gamename");
    gamesQuery = applyStationFilter(gamesQuery, req.stationId);
    const { data: games } = await gamesQuery;

    const gameData = await Promise.all(
      (games || []).map(async (game) => {
        let sessionCountQuery = supabase
          .from("activetables")
          .select("activeid", { count: "exact", head: true })
          .eq("gameid", game.game_id)
          .gte("starttime", startDate.toISOString())
          .lte("starttime", endDate.toISOString());
        
        sessionCountQuery = applyStationFilter(sessionCountQuery, req.stationId);
        const { count: sessionCount } = await sessionCountQuery;

        const usage =
          (totalSessions || 0) > 0
            ? Math.round(((sessionCount || 0) / (totalSessions || 1)) * 100)
            : 0;

        // Estimate revenue
        const avgRevenuePerSession = 500; 
        const revenue = (sessionCount || 0) * avgRevenuePerSession;

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
    const colors = [
      "#42A5F5",
      "#66BB6A",
      "#AB47BC",
      "#EC407A",
      "#EF7350",
      "#FFA726",
    ];
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
        totalRevenue: totalRevenue,
        totalRevenueFormatted: `₹${totalRevenue.toFixed(2)}`,
        gameRevenue: gameRevenue,
        gameRevenueFormatted: `₹${gameRevenue.toFixed(2)}`,
        foodRevenue: foodRevenue,
        foodRevenueFormatted: `₹${foodRevenue.toFixed(2)}`,
        revenueTrend: calculateTrend(totalRevenue, prevRevenueVal),
        netProfit: netProfit,
        netProfitFormatted: `₹${netProfit.toFixed(2)}`,
        expenses: expenses,
        expensesFormatted: `₹${expenses.toFixed(2)}`,
        occupancyRate,
        avgSessionDuration,
        peakHourLabel,
        totalSessions,
        activeTables,
        totalTables
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ error: "Server error fetching dashboard summary" });
  }
});

export default router;
