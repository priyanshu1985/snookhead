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
        isAlert:creditMembers > 0,
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
      .select("totalamount, tablecharges, menucharges, sessionduration, createdAt, sessionid, details, paymentmethod, created_by")
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

    const [
      { count: activeWallets },
      { count: prevActiveWallets },
      { count: newMembers },
      { count: prevNewMembers },
      { count: inactiveWallets },
      { count: prevInactiveWallets },
      { count: creditMembers },
      { count: prevCreditMembers },
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
      revenueQuery,
      prevRevenueQuery,
      totalSessionsQuery,
      activeTablesQuery,
      totalTablesQuery,
      lowStockQuery,
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
            if (bill.sessionid) {
                breakdown.foodSource.table += menuCharges;
            } else {
                breakdown.foodSource.order_screen += menuCharges;
            }
        }

        if (session && session.gameid) {
             breakdown.gameReal[session.gameid] = (breakdown.gameReal[session.gameid] || 0) + tableCharges;
        }

        let pMode = (bill.paymentmethod || 'cash').toLowerCase();
        if (pMode === 'online' || pMode === 'card') pMode = 'upi';
        if (breakdown.paymentMode[pMode] !== undefined) {
            breakdown.paymentMode[pMode] += amount;
        } else {
             breakdown.paymentMode['cash'] += amount;
        }

        return sum + amount;
    }, 0);
    
    const gameRevenue = bills.reduce((sum, b) => sum + (Number(b.tablecharges) || 0), 0);
    const foodRevenue = bills.reduce((sum, b) => sum + (Number(b.menucharges) || 0), 0);
    
    const validDurationBills = bills.filter(b => b.sessionduration > 0);
    const avgSessionDuration = validDurationBills.length > 0
        ? Math.round(validDurationBills.reduce((sum, b) => sum + b.sessionduration, 0) / validDurationBills.length)
        : 0;

    // --- EMPLOYEE SHIFT PERFORMANCE ---
    // Fetch all shifts in this period 
    let shiftsQuery = supabase
        .from("shifts")
        .select(`
            id, 
            user_id, 
            check_in_time, 
            check_out_time, 
            total_hours, 
            status,
            users:user_id (name, role)
        `)
        .gte("check_in_time", startDate.toISOString())
        .lte("check_in_time", endDate.toISOString())
        .order("check_in_time", { ascending: false });
    
    // Note: If you want to filter by station, shifts need station_id or we filter by user's station
    // For now, assuming shifts are global or linked to user who is linked to station? 
    // Given the request, we will show all shifts for the owner's context.

    const { data: shiftsData } = await shiftsQuery;

    const employee_shifts = (shiftsData || []).map(shift => {
        const shiftStart = new Date(shift.check_in_time);
        const shiftEnd = shift.check_out_time ? new Date(shift.check_out_time) : new Date();
        
        // Find bills generated by this user DURING this shift
        // Logic: Bill created_by == shift.user_id AND created_at within shift time
        const shiftBills = bills.filter(b => {
             const billTime = new Date(b.createdAt);
             // Safety check for created_by presence (added in recent migration)
             // If b.created_by is missing, we can't attribute it.
             if (b.created_by !== shift.user_id) return false;
             return billTime >= shiftStart && billTime <= shiftEnd;
        });

        const billsGenerated = shiftBills.length;
        const totalRevenue = shiftBills.reduce((sum, b) => sum + (Number(b.totalamount) || 0), 0);
        
        // Calculate duration formatted
        let durationStr = "Active";
        if (shift.total_hours) {
            durationStr = `${shift.total_hours} hrs`;
        } else if (shift.check_out_time) {
            const diff = (new Date(shift.check_out_time) - shiftStart) / (1000 * 60 * 60);
            durationStr = `${diff.toFixed(2)} hrs`;
        } else {
             // Active
             const diff = (new Date() - shiftStart) / (1000 * 60 * 60);
             durationStr = `${diff.toFixed(2)} hrs (Active)`;
        }

        return {
            id: shift.id,
            name: shift.users?.name || "Unknown",
            role: shift.users?.role || "Staff",
            date: shiftStart.toLocaleDateString(),
            time: `${shiftStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${shift.check_out_time ? new Date(shift.check_out_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Active'}`,
            duration: durationStr,
            bills_generated: billsGenerated,
            revenue: totalRevenue,
            revenueFormatted: `₹${totalRevenue.toFixed(2)}`
        };
    });

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
    // Total Expenses
    let expensesQuery = supabase
      .from("expenses")
      .select("amount")
      .gte("date", startDate.toISOString().split('T')[0])
      .lte("date", endDate.toISOString().split('T')[0]);
    // Filter expenses by created_by if needed (assuming expenses are linked to owner/user)
    // For now, strict station filter on expenses table isn't there, but we can assume owner sees all expenses created by them or their staff?
    // Let's refine based on user request: "under owner".
    // Theoretically expenses should have owner_id or created_by.
    // Let's rely on expenses being global for now as per previous logic, but add Labour Cost.

    const { data: expensesData } = await expensesQuery;
    let totalExpenses = (expensesData || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

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
        
        totalExpenses += labourCost;
    }

    const expenses = totalExpenses;
    const netProfit = totalRevenue - expenses;

    // --- GAME DATA (Real) ---
    const gameData = await Promise.all(
      (gamesList || []).map(async (game) => {
        let sessionCountQuery = supabase
          .from("activetables")
          .select("activeid", { count: "exact", head: true })
          .eq("gameid", game.gameid)
          .gte("starttime", startDate.toISOString())
          .lte("starttime", endDate.toISOString());
        sessionCountQuery = applyStationFilter(sessionCountQuery, req.stationId);
        const { count: sessionCount } = await sessionCountQuery;

        const usage = (totalSessions || 0) > 0
            ? Math.round(((sessionCount || 0) / (totalSessions || 1)) * 100)
            : 0;

        const realRevenue = breakdown.gameReal[game.gameid] || 0;

        return {
          name: game.gamename || game.game_name || "Game",
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
          trend: calculateTrend(activeWallets, prevActiveWallets),
          positive: activeWallets >= prevActiveWallets
        },
        {
          title: "New Members",
          value: newMembers,
          trend: calculateTrend(newMembers, prevNewMembers),
          positive: newMembers >= prevNewMembers
        },
        {
          title: "Low Stock Items",
          value: lowStockCount,
          trend: lowStockCount > 5 ? "Critical" : lowStockCount > 0 ? "Warning" : "Healthy",
          positive: lowStockCount === 0
        },
        {
           title: "Inactive Wallets",
           value: inactiveWallets,
           trend: calculateTrend(inactiveWallets, prevInactiveWallets),
           positive: inactiveWallets <= prevInactiveWallets
        },
        {
           title: "Credit Members",
           value: creditMembers,
           trend: calculateTrend(creditMembers, prevCreditMembers),
           positive: creditMembers <= prevCreditMembers
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
        breakdown,
        employee_shifts // Added field
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
            start.setHours(0,0,0,0);
            end.setHours(23,59,59,999);
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
