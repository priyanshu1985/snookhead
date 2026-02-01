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

// Helper to calculate trend percentage
function calculateTrend(current, previous) {
  if (!previous) return current > 0 ? "100%" : "0%";
  const percent = Math.round(((current - previous) / previous) * 100);
  return `${percent}%`;
}

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
      .select("totalamount, tablecharges, menucharges, sessionduration, createdAt, sessionid, details, paymentmethod")
      .gte("createdAt", startDate.toISOString())
      .lte("createdAt", endDate.toISOString())
      .eq("status", "paid");
    revenueQuery = applyStationFilter(revenueQuery, req.stationId);

    // Prev Total Revenue
    let prevRevenueQuery = supabase
      .from("bills")
      .select("totalamount")
      .gte("createdAt", prevStartDate.toISOString())
      .lte("createdAt", prevEndDate.toISOString())
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
      { count: lowStockCount },
      gamesResult // Capture games result
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
      lowStockQuery,
      // Fetch all games for mapping
      applyStationFilter(supabase.from("games").select("gameid, gamename"), req.stationId)
    ]);

    const gamesList = gamesResult.data || [];
    const gamesMap = gamesList.reduce((acc, g) => ({ ...acc, [g.gameid]: g }), {});

    // Calculate Occupancy Rate
    const occupancyRate = (totalTables || 0) > 0 
        ? Math.round(((activeTables || 0) / (totalTables || 1)) * 100) 
        : 0;

    // --- FINANCIAL BREAKDOWNS ---
    const bills = revenueData || [];
    
    // 1. Fetch related sessions
    const sessionIds = [...new Set(bills.map(b => b.sessionid).filter(Boolean))];
    let sessionsMap = {};
    if (sessionIds.length > 0) {
        // Only select columns known to exist
        const { data: sessions } = await supabase
            .from("activetables")
            .select("activeid, gameid") 
            .in("activeid", sessionIds);
        
        (sessions || []).forEach(s => sessionsMap[s.activeid] = s);
    }

    // 2. Aggregate
    const breakdown = {
        flow: { dashboard: 0, queue: 0, reservation: 0 },
        bookingType: { timer: 0, set: 0, frame: 0 },
        foodSource: { table: 0, order_screen: 0 },
        paymentMode: { cash: 0, upi: 0, wallet: 0 },
        gameReal: {} // gameId -> revenue (table charges)
    };

    const totalRevenue = bills.reduce((sum, bill) => {
        const amount = Number(bill.totalamount) || 0;
        const tableCharges = Number(bill.tablecharges) || 0;
        const menuCharges = Number(bill.menucharges) || 0;
        
        // Parse details for metadata
        let details = {};
        try {
           details = typeof bill.details === 'string' ? JSON.parse(bill.details) : (bill.details || {});
        } catch (e) {
           console.warn(`Failed to parse details for bill ${bill.id}:`, e);
           details = {};
        }
        
        const session = sessionsMap[bill.sessionid];

        // Flow Revenue using Bill Details (Persisted)
        // Fallback: Default to 'dashboard' if not found
        let source = details.booking_source || 'dashboard';
        
        // Normalize source names if needed
        if (source === 'dashboard' || source === 'queue' || source === 'reservation') {
             // valid
        } else {
             source = 'dashboard';
        }
        breakdown.flow[source] = (breakdown.flow[source] || 0) + amount;

        // Booking Type Revenue using Bill Details
        // Fallback: 'timer' default
        let bType = details.booking_type || 'timer';
        // Normalize
        if (['timer', 'set', 'frame'].includes(bType)) {
             // valid
        } else {
             bType = 'timer';
        }
        breakdown.bookingType[bType] = (breakdown.bookingType[bType] || 0) + tableCharges;

        // Food Source (Menu Charges attributed to source)
        if (menuCharges > 0) {
            if (bill.sessionid) {
                breakdown.foodSource.table += menuCharges;
            } else {
                breakdown.foodSource.order_screen += menuCharges;
            }
        }

        // Game Real Revenue (Table Charges attributed to Game)
        // Rely on Session -> GameID link (reliable)
        if (session && session.gameid) {
             breakdown.gameReal[session.gameid] = (breakdown.gameReal[session.gameid] || 0) + tableCharges;
        }

        // Payment Mode Revenue
        let pMode = (bill.paymentmethod || 'cash').toLowerCase();
        // Normalize
        if (pMode === 'online' || pMode === 'card') pMode = 'upi';
        if (breakdown.paymentMode[pMode] !== undefined) {
            breakdown.paymentMode[pMode] += amount;
        } else {
             // Fallback
             breakdown.paymentMode['cash'] += amount;
        }

        return sum + amount;
    }, 0);
    
    // ... rest of code uses gamesList and bill properties (already fixed)
    // Need to check gameData mapping loop (lines 600+)
    
    const gameRevenue = bills.reduce((sum, b) => sum + (Number(b.tablecharges) || 0), 0);
    const foodRevenue = bills.reduce((sum, b) => sum + (Number(b.menucharges) || 0), 0);
    
    // Session Duration Stats
    const validDurationBills = bills.filter(b => b.sessionduration > 0);
    const avgSessionDuration = validDurationBills.length > 0
        ? Math.round(validDurationBills.reduce((sum, b) => sum + b.sessionduration, 0) / validDurationBills.length)
        : 0;

    // Peak Hours
    const hoursMap = new Array(24).fill(0);
    bills.forEach(b => {
        const date = new Date(b.createdAt);
        const hour = date.getHours();
        hoursMap[hour]++;
    });
    const peakHourVal = Math.max(...hoursMap);
    const peakHourIndex = hoursMap.indexOf(peakHourVal);
    const peakHourLabel = `${peakHourIndex}:00 - ${peakHourIndex+1}:00`;

    const prevRevenueVal = (prevRevenueData || []).reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);
    const expenses = 0;
    const netProfit = totalRevenue - expenses;

    // --- GAME DATA (Real) ---
    // Use breakdown.gameReal combined with usage stats
    const gameData = await Promise.all(
      (gamesList || []).map(async (game) => {
        // We still calculate usage based on active sessions count (popularity)
        // But revenue is now REAL
        let sessionCountQuery = supabase
          .from("activetables") // Verified table name
          .select("activeid", { count: "exact", head: true })
          .eq("gameid", game.gameid) // Verified column
          .gte("starttime", startDate.toISOString()) // inferred lowercase
          .lte("starttime", endDate.toISOString());
        sessionCountQuery = applyStationFilter(sessionCountQuery, req.stationId);
        const { count: sessionCount } = await sessionCountQuery;

        const usage = (totalSessions || 0) > 0
            ? Math.round(((sessionCount || 0) / (totalSessions || 1)) * 100)
            : 0;

        const realRevenue = breakdown.gameReal[game.gameid] || 0;

        return {
          name: game.gamename || game.game_name || "Game", // Verified gamename
          usage,
          revenue: `₹${realRevenue.toFixed(0)}`,
          revenueValue: realRevenue,
          status: usage >= 70 ? "High usage" : usage >= 40 ? "Good usage" : "Low usage",
          statusColor: usage >= 70 ? "#FF8C42" : usage >= 40 ? "#FFC107" : "#FF5252",
          icon: "game-controller-outline",
        };
      })
    );
    const colors = ["#FF8C42", "#FFC107", "#FF5252", "#4CAF50", "#2196F3", "#9C27B0"];
    gameData.sort((a, b) => b.usage - a.usage);

    res.json({
      currentDate,
      period,
      stats: [
        {
          title: "Active Wallets",
          value: activeWallets,
          trend: "+2%", // Placeholder or calculation
          positive: true
        },
        {
          title: "New Members",
          value: newMembers,
          trend: `+${newMembers - prevNewMembers}`,
          positive: newMembers >= prevNewMembers
        },
        {
          title: "Low Stock Items",
          value: lowStockCount,
          trend: lowStockCount > 0 ? "Action Needed" : "Healthy",
          positive: lowStockCount === 0
        },
        {
           title: "Inactive Wallets",
           value: inactiveWallets,
           trend: "Stable",
           positive: true
        },
        {
           title: "Credit Members",
           value: creditMembers,
           trend: "Stable",
           positive: true
        }
      ],
      gameData: gameData.slice(0, 5),
      chartData: gameData.slice(0, 5).map((g,i) => ({ game:g.name, value:g.usage, color: colors[i%colors.length] })),
      summary: {
        totalRevenue,
        totalRevenueFormatted: `₹${totalRevenue.toFixed(2)}`,
        gameRevenue,
        gameRevenueFormatted: `₹${gameRevenue.toFixed(2)}`,
        foodRevenue,
        foodRevenueFormatted: `₹${foodRevenue.toFixed(2)}`,
        revenueTrend: calculateTrend(totalRevenue, prevRevenueVal),
        netProfit,
        netProfitFormatted: `₹${netProfit.toFixed(2)}`,
        expenses,
        expensesFormatted: `₹${expenses.toFixed(2)}`,
        occupancyRate,
        avgSessionDuration,
        peakHourLabel,
        totalSessions,
        activeTables,
        totalTables,
        // Detailed Breakdowns
        breakdown
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard summary:", error);
    res.status(500).json({ 
        error: error.message, 
        details: error.details, 
        hint: error.hint,
        code: error.code
    });
  }
});

export default router;
