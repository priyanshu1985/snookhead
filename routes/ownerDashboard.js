import express from "express";
import { getSupabase } from "../config/supabase.js";
import { auth } from "../middleware/auth.js";
import {
  stationContext,
  addStationFilter,
} from "../middleware/stationContext.js";

const router = express.Router();

// Helper: Get date range based on period
function getDateRange(period, customStart, customEnd) {
  // Respect custom dates if they are provided from frontend
  if (customStart && customEnd) {
    const s = new Date(customStart);
    const e = new Date(customEnd);
    s.setHours(0, 0, 0, 0);
    e.setHours(23, 59, 59, 999);
    return { startDate: s, endDate: e };
  }

  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);

  switch (period.toLowerCase()) {
    case "today":
    case "day":
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      startDate.setDate(now.getDate() - 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setDate(now.getDate() - 1);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "week":
      // Start of this week (Sunday)
      const day = now.getDay();
      startDate.setDate(now.getDate() - day);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "month":
      // 1st of current month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case "year":
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    default:
      // Default to last 7 days if unknown
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// Helper to apply station filter to Supabase query
const applyStationFilter = (query, stationId) => {
  if (stationId) {
    return query.eq("stationid", stationId);
  }
  return query;
};

// Helper: Calculate trend percentage
const calculateTrend = (current, previous) => {
  const curr = current || 0;
  const prev = previous || 0;
  if (prev === 0) return curr > 0 ? "+100%" : "0%";
  const change = ((curr - prev) / prev) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`;
};

// GET /api/owner/dashboard/stats - Get dashboard statistics (filtered by station)
router.get("/stats", auth, stationContext, async (req, res) => {
  try {
    const { period = "week", startDate: customStart, endDate: customEnd, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = getDateRange(period, customStart || dateFrom, customEnd || dateTo);
    const prevEndDate = startDate;
    const supabase = getSupabase();

    // Active wallets (wallets with balance > 0)
    let activeWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .gt("balance", 0);
    activeWalletsQuery = applyStationFilter(activeWalletsQuery, req.stationId);
    const { count: activeWallets } = await activeWalletsQuery;

    // Get previous period for comparison
    const prevPeriodLength = endDate - startDate;
    const prevStartDate = new Date(startDate - prevPeriodLength);

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
        isAlert: creditMembers > 0,
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
    const { period = "week", startDate: customStart, endDate: customEnd, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = getDateRange(period, customStart || dateFrom, customEnd || dateTo);
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
    const { period = "week", startDate: customStart, endDate: customEnd, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = getDateRange(period, customStart || dateFrom, customEnd || dateTo);
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
    const { period = "week", startDate: customStart, endDate: customEnd, dateFrom, dateTo } = req.query;
    const { startDate, endDate } = getDateRange(period, customStart || dateFrom, customEnd || dateTo);
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

    // Prev Active Wallets
    let prevActiveWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .gt("balance", 0)
      .lt("created_at", startDate.toISOString());
    prevActiveWalletsQuery = applyStationFilter(prevActiveWalletsQuery, req.stationId);

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

    // Prev Inactive Wallets
    let prevInactiveWalletsQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .eq("balance", 0)
      .lt("created_at", startDate.toISOString());
    prevInactiveWalletsQuery = applyStationFilter(prevInactiveWalletsQuery, req.stationId);

    // Credit Wallets
    let creditMembersQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .lt("balance", 0);
    creditMembersQuery = applyStationFilter(creditMembersQuery, req.stationId);

    // Prev Credit Wallets
    let prevCreditMembersQuery = supabase
      .from("wallets")
      .select("*", { count: "exact", head: true })
      .lt("balance", 0)
      .lt("created_at", startDate.toISOString());
    prevCreditMembersQuery = applyStationFilter(prevCreditMembersQuery, req.stationId);

    // Total Revenue (bills paid in dates) - Get tablecharges and menucharges
    let revenueQuery = supabase
      .from("bills")
      .select("totalamount, tablecharges, menucharges, sessionduration, createdAt, sessionid, details, paymentmethod, created_by, billitems")
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

    // Total Sessions
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
    lowStockQuery = applyStationFilter(lowStockQuery, req.stationId);

    // Debtor List (Wallets with negative balance)
    let debtorsQuery = supabase
      .from("wallets")
      .select("balance, customerid, customers(name)")
      .lt("balance", 0)
      .order("balance", { ascending: true }); // Most negative first
    debtorsQuery = applyStationFilter(debtorsQuery, req.stationId);

    const [
      { count: activeWallets },
      { count: prevActiveWallets },
      { count: newMembers },
      { count: prevNewMembers },
      { count: inactiveWallets },
      { count: prevInactiveWallets },
      { count: creditMembers },
      { count: prevCreditMembers },
      { data: debtorsData },
      { data: revenueData },
      { data: prevRevenueData },
      { count: totalSessions },
      { count: activeTables },
      { count: totalTables },
      { count: lowStockCount },
      gamesResult // Capture games result
    ] = await Promise.all([
      activeWalletsQuery,
      prevActiveWalletsQuery,
      newMembersQuery,
      prevNewMembersQuery,
      inactiveWalletsQuery,
      prevInactiveWalletsQuery,
      creditMembersQuery,
      prevCreditMembersQuery,
      debtorsQuery,
      revenueQuery,
      prevRevenueQuery,
      totalSessionsQuery,
      activeTablesQuery,
      totalTablesQuery,
      lowStockQuery,
      applyStationFilter(supabase.from("games").select("gameid, gamename"), req.stationId)
    ]);

    const totalOwed = (debtorsData || []).reduce((sum, d) => sum + Math.abs(Number(d.balance) || 0), 0);

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
      foodSource: { prepared: 0, packed: 0 },
      paymentMode: { cash: 0, upi: 0, wallet: 0 },
      gameReal: {}
    };

    const totalRevenue = bills.reduce((sum, bill) => {
      const amount = Number(bill.totalamount) || 0;
      const tableCharges = Number(bill.tablecharges) || 0;
      const menuCharges = Number(bill.menucharges) || 0;

      let details = {};
      try {
        details = typeof bill.details === 'string' ? JSON.parse(bill.details) : (bill.details || {});
      } catch (e) {
        console.warn(`Failed to parse details for bill ${bill.id}:`, e);
        details = {};
      }

      const session = sessionsMap[bill.sessionid];

      let source = details.booking_source || 'dashboard';
      if (source === 'dashboard' || source === 'queue' || source === 'reservation') {
      } else {
        source = 'dashboard';
      }
      breakdown.flow[source] = (breakdown.flow[source] || 0) + amount;

      let bType = details.booking_type || 'timer';
      if (['timer', 'set', 'frame'].includes(bType)) {
      } else {
        bType = 'timer';
      }
      breakdown.bookingType[bType] = (breakdown.bookingType[bType] || 0) + tableCharges;

      if (menuCharges > 0) {
        // Segregate food revenue by item type (prepared vs packed)
        let items = bill.billitems || [];
        if (typeof items === 'string') {
          try { items = JSON.parse(items); } catch(e) { items = []; }
        }

        if (Array.isArray(items) && items.length > 0) {
          items.forEach(item => {
            const type = (item.item_type || 'prepared').toLowerCase();
            if (breakdown.foodSource[type] !== undefined) {
               breakdown.foodSource[type] += (Number(item.total) || 0);
            } else {
               breakdown.foodSource.prepared += (Number(item.total) || 0);
            }
          });
        } else {
          // Fallback: If items are missing but menuCharges exist, attribute to prepared
          breakdown.foodSource.prepared += menuCharges;
        }
      }

      const pm = (bill.paymentmethod || 'cash').toLowerCase();
      if (pm.includes('cash')) breakdown.paymentMode.cash += amount;
      else if (pm.includes('upi') || pm.includes('online')) breakdown.paymentMode.upi += amount;
      else if (pm.includes('wallet')) breakdown.paymentMode.wallet += amount;

      if (session && session.gameid) {
        breakdown.gameReal[session.gameid] = (breakdown.gameReal[session.gameid] || 0) + tableCharges;
      }

      return sum + amount;
    }, 0);

    // --- FINANCIAL SUMMARY ---
    const gameRevenue = Object.values(breakdown.gameReal).reduce((s, v) => s + v, 0);
    const foodRevenue = breakdown.foodSource.prepared + breakdown.foodSource.packed;
    // netProfit will be the total revenue minus total expenses.

    // --- OTHER STATS ---
    const avgSessionDuration = bills.length > 0 
      ? Math.round(bills.reduce((s, b) => s + (Number(b.sessionduration) || 0), 0) / bills.length)
      : 0;

    // peak hour logic
    const hourCounts = new Array(24).fill(0);
    bills.forEach(b => {
      const h = new Date(b.createdAt).getHours();
      hourCounts[h]++;
    });
    const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    const peakHourLabel = `${peakHourIndex % 12 || 12}${peakHourIndex >= 12 ? 'PM' : 'AM'}`;

    // --- EXPENSES ---
    let expensesQuery = supabase
      .from("expenses")
      .select("amount, category")
      .gte("date", startDate.toLocaleDateString('en-CA'))
      .lte("date", endDate.toLocaleDateString('en-CA'));
    if (req.stationId) expensesQuery.eq("stationid", req.stationId);
    const { data: expensesData } = await expensesQuery;
    
    const expenseCats = {};
    const segregation = { owner: 0, inventory: 0, kitchen: 0 };
    let totalExpenses = 0;
    (expensesData || []).forEach(item => {
      const cat = item.category || 'Operational';
      const amt = Number(item.amount) || 0;
      expenseCats[cat] = (expenseCats[cat] || 0) + amt;
      totalExpenses += amt;

      if (cat === 'Inventory') {
        segregation.inventory += amt;
      } else if (cat === 'Kitchen') {
        segregation.kitchen += amt;
      } else {
        segregation.owner += amt;
      }
    });

    // --- Estimated Labour Cost Calculation ---
    // Fetch employees of this owner (or all if admin)
    // Ideally we need the owner ID. `req.user.id` is the caller.
    // If caller is owner, we fetch their employees.
    if (req.user.role === 'owner') {
      const { data: employees } = await supabase
        .from("users")
        .select("id, salary_type, salary_amount")
        .eq("owner_id", req.user.id);

      // This is an estimation. 
      // For 'monthly': (Salary * Months in period) OR (Salary / 30 * Days in period)
      // For 'hourly': Need shift info. For simplicity now, let's assume standard 8h/day, 5days/week if hourly?
      // Or just use salary_amount as estimated monthly cost for simplicity if they entered it as 'monthly equivalent'?
      // The prompt asked for "as per employee timing shift the expense will be calculated".
      // Real shift calculation requires: Shifts table.
      // Let's fetch shifts too if possible, or simplifying:
      // We will do a pro-rata calculation based on period length in days.

      const periodDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) || 1;

      // Fetch shifts for these employees to get hours? 
      // Let's do a simple estimation first to avoid complex join query unless critical.
      // User request: "as per employee timing shift"
      // Let's try to get shifts.
      const employeeIds = (employees || []).map(e => e.id);
      let shiftMap = {};
      if (employeeIds.length > 0) {
        const { data: shifts } = await supabase.from("shifts").select("user_id, start_time, end_time, work_days").in("user_id", employeeIds);
        (shifts || []).forEach(s => shiftMap[s.user_id] = s);
      }

      let labourCost = 0;
      (employees || []).forEach(emp => {
        const salary = Number(emp.salary_amount) || 0;
        if (emp.salary_type === 'monthly') {
          labourCost += (salary / 30) * periodDays;
        } else if (emp.salary_type === 'hourly') {
          const shift = shiftMap[emp.id];
          if (shift) {
            // Calculate hours
            const start = new Date(`1970-01-01T${shift.start_time}`);
            const end = new Date(`1970-01-01T${shift.end_time}`);
            const hours = (end - start) / (1000 * 60 * 60); // e.g. 8

            // Calculate working days in period
            // This is complex (e.g. how many Mondays in this date range?)
            // Simplified: periodDays * (workDays.length / 7)
            // If work_days is array ['Mon', 'Tue']
            const daysPerWeek = Array.isArray(shift.work_days) ? shift.work_days.length : 5;
            const workingDaysEst = periodDays * (daysPerWeek / 7);

            labourCost += salary * hours * workingDaysEst;
          }
        }
      });

    }

    const expenses = totalExpenses;
    const netProfit = totalRevenue - expenses;

    // Financial Breakdown for Profit Tab
    const estimatedProfitBySource = {
      game: Math.max(0, gameRevenue - segregation.owner),
      prepared: Math.max(0, breakdown.foodSource.prepared - segregation.kitchen),
      packed: Math.max(0, breakdown.foodSource.packed - segregation.inventory)
    };

    // employee shift summary
    let shiftActivityQuery = supabase
      .from("shifts")
      .select("*, users!inner(name, role, stationid)")
      .gte("check_in_time", startDate.toISOString())
      .lte("check_in_time", endDate.toISOString());
    if (req.stationId) shiftActivityQuery.eq("users.stationid", req.stationId);
    const { data: shiftsData } = await shiftActivityQuery;

    const employee_shifts = (shiftsData || []).map(shift => {
      const sStart = new Date(shift.check_in_time);
      const sEnd = shift.check_out_time ? new Date(shift.check_out_time) : new Date();
      const sBills = bills.filter(b => b.created_by === shift.user_id && new Date(b.createdAt) >= sStart && new Date(b.createdAt) <= sEnd);
      const rev = sBills.reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);
      return {
        id: shift.id,
        name: shift.users?.name || "Staff",
        date: sStart.toLocaleDateString(),
        revenue: rev,
        bills_generated: sBills.length
      };
    });

    // --- GAME DATA (Real) ---
    const gameData = await Promise.all(
      (gamesList || []).map(async (game) => {
        let scQuery = supabase
          .from("activetables")
          .select("activeid", { count: "exact", head: true })
          .eq("gameid", game.gameid)
          .gte("starttime", startDate.toISOString())
          .lte("starttime", endDate.toISOString());
        scQuery = applyStationFilter(scQuery, req.stationId);
        const { count: sc } = await scQuery;
        const usage = (totalSessions || 0) > 0 ? Math.round(((sc || 0) / (totalSessions || 1)) * 100) : 0;
        const realRev = breakdown.gameReal[game.gameid] || 0;
        return {
          name: game.gamename || "Game",
          usage,
          revenue: `₹${realRev.toFixed(0)}`,
          revenueValue: realRev,
          status: usage >= 70 ? "High usage" : usage >= 40 ? "Good" : "Low",
          statusColor: usage >= 70 ? "#FF8C42" : usage >= 40 ? "#FFC107" : "#FF5252",
          icon: "game-controller-outline",
        };
      })
    );
    gameData.sort((a, b) => b.usage - a.usage);

    const prevRevenueVal = (prevRevenueData || []).reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);

    res.json({
      currentDate,
      period,
      stats: [
        { title: "Active Wallets", value: activeWallets, trend: calculateTrend(activeWallets, prevActiveWallets), positive: activeWallets >= prevActiveWallets },
        { title: "New Members", value: newMembers, trend: calculateTrend(newMembers, prevNewMembers), positive: newMembers >= prevNewMembers },
        { title: "Low Stock Items", value: lowStockCount, trend: lowStockCount > 5 ? "Critical" : "Healthy" },
        { title: "Inactive Wallets", value: inactiveWallets, trend: calculateTrend(inactiveWallets, prevInactiveWallets), positive: inactiveWallets <= prevInactiveWallets },
        { title: "Credit Members", value: creditMembers, trend: `To Take: ₹${totalOwed.toLocaleString()}`, positive: creditMembers <= prevCreditMembers }
      ],
      debtors: (debtorsData || []).map(d => ({
        name: d.customers?.name || "Unknown",
        balance: d.balance,
        id: d.customerid
      })),
      totalOwed,
      gameData: gameData.slice(0, 5),
      chartData: gameData.slice(0, 5).map((g, i) => ({ game: g.name, value: g.usage, color: ["#FF8C42", "#FFC107", "#FF5252", "#4CAF50", "#2196F3"][i % 5] })),
      summary: {
        totalRevenue,
        totalRevenueFormatted: `₹${totalRevenue.toFixed(2)}`,
        gameRevenue,
        gameRevenueFormatted: `₹${gameRevenue.toFixed(2)}`,
        foodRevenue,
        foodRevenueFormatted: `₹${foodRevenue.toFixed(2)}`,
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
        breakdown,
        employee_shifts,
        totalOwed,
        expenseCategories: expenseCats,
        expenseSegregation: segregation,
        estimatedProfitBySource
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


// GET /api/owner/employees/:id/activity
router.get("/employees/:id/activity", auth, stationContext, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query; // Expect ISO strings or handle defaults
    const supabase = getSupabase();

    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    // If not provided, default to today
    if (!startDate) {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const startIso = start.toISOString();
    const endIso = end.toISOString();

    // 1. Fetch Active Tables started by this user
    // Note: created_by might be null for old records
    const activeTablesQuery = supabase
      .from('activetables')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', id)
      .gte('start_time', startIso)
      .lte('start_time', endIso);

    // 2. Fetch Bills generated by this user
    const billsQuery = supabase
      .from('bills')
      .select('total_amount', { count: 'exact' })
      .eq('created_by', id)
      .gte('createdAt', startIso)
      .lte('createdAt', endIso);

    // 3. Fetch Orders placed by this user (if we decide to track order placement separately)
    // Currently 'orders' has 'userId' which is customer. We added 'created_by' in migration.
    const ordersQuery = supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('created_by', id)
      .gte('createdAt', startIso)
      .lte('createdAt', endIso);

    // 4. Fetch Shifts (Attendance)
    const shiftsQuery = supabase
      .from('shifts')
      .select('*')
      .eq('user_id', id)
      .gte('check_in_time', startIso)
      .lte('check_in_time', endIso);

    const [
      { count: tablesCount },
      { data: bills, count: billsCount },
      { data: orders, count: ordersCount },
      { data: shifts }
    ] = await Promise.all([
      activeTablesQuery,
      billsQuery,
      ordersQuery,
      shiftsQuery
    ]);

    const totalBillAmount = (bills || []).reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    const totalOrderAmount = (orders || []).reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    // Calculate hours worked in this period
    let totalHours = 0;
    (shifts || []).forEach(s => {
      if (s.total_hours) {
        totalHours += Number(s.total_hours);
      } else if (s.check_in_time && s.check_out_time) {
        const diff = new Date(s.check_out_time) - new Date(s.check_in_time);
        totalHours += diff / (1000 * 60 * 60);
      } else if (s.check_in_time && s.status === 'active') {
        // Ongoing shift
        const diff = new Date() - new Date(s.check_in_time);
        totalHours += diff / (1000 * 60 * 60);
      }
    });

    res.json({
      tables_booked: tablesCount || 0,
      bills_generated: billsCount || 0,
      bill_revenue: totalBillAmount,
      orders_placed: ordersCount || 0,
      order_revenue: totalOrderAmount,
      hours_worked: totalHours.toFixed(2),
      shifts: shifts
    });

  } catch (err) {
    console.error("Error fetching employee activity:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
