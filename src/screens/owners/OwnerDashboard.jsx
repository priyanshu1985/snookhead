import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ownerAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;

// Custom Pie Chart Component
const PieChart = ({ data }) => {
  const total = data.reduce(
    (sum, item) => sum + parseFloat(item.value || 0),
    0,
  );

  if (total === 0) {
    return (
      <View style={styles.pieChartEmpty}>
        <Text style={styles.pieChartEmptyText}>No Data</Text>
      </View>
    );
  }

  return (
    <View style={styles.pieChartContainer}>
      {data.map((item, index) => {
        const percentage = (parseFloat(item.value || 0) / total) * 100;
        return (
          <View key={index} style={styles.pieChartLegendItem}>
            <View
              style={[styles.pieChartDot, { backgroundColor: item.color }]}
            />
            <View style={styles.pieChartLegendDetails}>
              <Text style={styles.pieChartLegendLabel}>{item.label}</Text>
              <Text style={styles.pieChartLegendValue}>
                {item.formatted} ({percentage.toFixed(1)}%)
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

// Custom Progress Bar Component
const ProgressBar = ({ percentage, color, height = 8 }) => {
  return (
    <View style={[styles.progressBarContainer, { height }]}>
      <View
        style={[
          styles.progressBarFill,
          {
            width: `${Math.min(percentage, 100)}%`,
            backgroundColor: color,
            height,
          },
        ]}
      />
    </View>
  );
};

// Chart colors for games
const CHART_COLORS = [
  '#FF8C42',
  '#4CAF50',
  '#2196F3',
  '#9C27B0',
  '#FF5252',
  '#FFC107',
  '#26A69A',
  '#EC407A',
];

// Game icons mapping
const GAME_ICONS = {
  snooker: 'grid-outline',
  pool: 'ellipse-outline',
  ps5: 'game-controller-outline',
  chess: 'apps-outline',
  carrom: 'square-outline',
  'table tennis': 'tennisball-outline',
  default: 'game-controller-outline',
};

export default function OwnerDashboard({ navigation, inTabbedView = false }) {
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([]);
  const [gameData, setGameData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentDate, setCurrentDate] = useState('');
  const [summary, setSummary] = useState(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState(null);
  const [operationalInsights, setOperationalInsights] = useState(null);

  const periods = ['Day', 'Week', 'Month'];

  const getGameIcon = gameName => {
    const name = gameName.toLowerCase();
    return GAME_ICONS[name] || GAME_ICONS.default;
  };

  const getUsageStatus = usage => {
    if (usage >= 70) return { status: 'High usage', color: '#FF8C42' };
    if (usage >= 40) return { status: 'Good usage', color: '#FFC107' };
    return { status: 'Low usage', color: '#FF5252' };
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const period = selectedPeriod.toLowerCase();
      const data = await ownerAPI.getSummary(period);

      // Financial Metrics Stats (Top Cards)
      const formattedStats = [
        {
          id: 1,
          title: 'Total Revenue',
          value: data.summary?.totalRevenueFormatted || '₹0',
          trend: data.summary?.revenueTrend || '+0%',
          icon: 'cash-outline',
          bgColor: '#E8F5E9',
          trendColor: '#4CAF50',
          positive: true,
        },
        {
          id: 2,
          title: 'Net Profit',
          value: data.summary?.netProfitFormatted || '₹0',
          trend: data.summary?.expensesFormatted
            ? `Expenses: ${data.summary.expensesFormatted}`
            : 'No expenses',
          icon: 'trending-up-outline',
          bgColor: data.summary?.netProfit >= 0 ? '#E8F5E9' : '#FFEBEE',
          trendColor: data.summary?.netProfit >= 0 ? '#4CAF50' : '#FF5252',
          positive: data.summary?.netProfit >= 0,
        },
        {
          id: 3,
          title: 'Occupancy Rate',
          value: `${data.summary?.occupancyRate?.toFixed(1) || 0}%`,
          trend: `${data.summary?.activeTables || 0}/${
            data.summary?.totalTables || 0
          } tables active`,
          icon: 'grid-outline',
          bgColor: '#FFF3E0',
          trendColor: '#FF8C42',
          positive: true,
        },
        {
          id: 4,
          title: 'Inventory Health',
          value: String(
            data.stats?.find(s => s.title === 'Low Stock Items')?.value || 0,
          ),
          trend:
            data.stats?.find(s => s.title === 'Low Stock Items')?.trend ||
            'Healthy',
          icon: 'cube-outline',
          bgColor:
            (data.stats?.find(s => s.title === 'Low Stock Items')?.value || 0) >
            0
              ? '#FFEBEE'
              : '#E8F5E9',
          trendColor:
            (data.stats?.find(s => s.title === 'Low Stock Items')?.value || 0) >
            0
              ? '#FF5252'
              : '#4CAF50',
          positive:
            (data.stats?.find(s => s.title === 'Low Stock Items')?.value ||
              0) === 0,
          isAlert:
            (data.stats?.find(s => s.title === 'Low Stock Items')?.value || 0) >
            0,
        },
      ];
      setStats(formattedStats);

      // Revenue Breakdown (Game vs Food & Bev)
      const gameRev = data.summary?.gameRevenue || 0;
      const foodRev = data.summary?.foodRevenue || 0;
      const totalRev = gameRev + foodRev || 1; // Avoid division by zero
      setRevenueBreakdown({
        game: {
          amount: data.summary?.gameRevenueFormatted || '₹0',
          percentage: ((gameRev / totalRev) * 100).toFixed(1),
        },
        food: {
          amount: data.summary?.foodRevenueFormatted || '₹0',
          percentage: ((foodRev / totalRev) * 100).toFixed(1),
        },
      });

      // Operational Insights
      const avgDuration = data.summary?.avgSessionDuration || 0;
      setOperationalInsights({
        avgSessionDuration: avgDuration > 0 ? `${avgDuration} mins` : 'N/A',
        peakActivity: data.summary?.peakHourLabel || 'N/A',
        totalSessions: data.summary?.totalSessions || 0,
      });

      // Store full summary for detailed analysis
      setSummary(data.summary);

      // Format game utilization data for chart (from existing gameData)
      const games = data.gameData || [];
      const formattedChartData = games.map((game, index) => ({
        game: game.name,
        value: game.usage || 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
      setChartData(formattedChartData);

      // Format game revenue data
      setGameData(games.slice(0, 5));

      // Set current date
      setCurrentDate(
        data.currentDate ||
          new Date().toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }),
      );
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default empty data on error
      setStats([
        {
          id: 1,
          title: 'Total Revenue',
          value: '₹0',
          trend: '+0%',
          icon: 'cash-outline',
          bgColor: '#E8F5E9',
          trendColor: '#4CAF50',
          positive: true,
        },
        {
          id: 2,
          title: 'Net Profit',
          value: '₹0',
          trend: 'No expenses',
          icon: 'trending-up-outline',
          bgColor: '#E8F5E9',
          trendColor: '#4CAF50',
          positive: true,
        },
        {
          id: 3,
          title: 'Occupancy Rate',
          value: '0%',
          trend: '0/0 tables active',
          icon: 'grid-outline',
          bgColor: '#FFF3E0',
          trendColor: '#FF8C42',
          positive: true,
        },
        {
          id: 4,
          title: 'Inventory Health',
          value: '0',
          trend: 'Healthy',
          icon: 'cube-outline',
          bgColor: '#E8F5E9',
          trendColor: '#4CAF50',
          positive: true,
          isAlert: false,
        },
      ]);
      setChartData([]);
      setGameData([]);
      setRevenueBreakdown({
        game: { amount: '₹0', percentage: '0' },
        food: { amount: '₹0', percentage: '0' },
      });
      setOperationalInsights({
        avgSessionDuration: 'N/A',
        peakActivity: 'N/A',
        totalSessions: 0,
      });
      setSummary(null);
      setCurrentDate(
        new Date().toLocaleDateString('en-US', {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }),
      );
    }
  }, [selectedPeriod]);

  useEffect(() => {
    setIsLoading(true);
    fetchDashboardData().finally(() => setIsLoading(false));
  }, [fetchDashboardData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  return inTabbedView ? (
    // When inside tabs, just return the content without SafeAreaView
    <View style={styles.tabbedContainer}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF8C42']}
          />
        }
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8C42" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Date and Period Selector */}
            <View style={styles.dateSection}>
              <View style={styles.dateContainer}>
                <Icon name="calendar-outline" size={20} color="#999" />
                <Text style={styles.dateText}>
                  {currentDate || 'Loading...'}
                </Text>
              </View>
              <View style={styles.periodSelector}>
                {periods.map(period => (
                  <TouchableOpacity
                    key={period}
                    style={[
                      styles.periodBtn,
                      selectedPeriod === period && styles.periodBtnActive,
                    ]}
                    onPress={() => setSelectedPeriod(period)}
                  >
                    <Text
                      style={[
                        styles.periodText,
                        selectedPeriod === period && styles.periodTextActive,
                      ]}
                    >
                      {period}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              {stats.map((stat, idx) => (
                <View
                  key={stat.id}
                  style={[
                    styles.statCard,
                    { backgroundColor: stat.bgColor },
                    idx % 2 === 1 && styles.statCardRight,
                  ]}
                >
                  <View style={styles.statHeader}>
                    <Text style={styles.statTitle}>{stat.title}</Text>
                    <Icon name={stat.icon} size={20} color={stat.trendColor} />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={[styles.statTrend, { color: stat.trendColor }]}>
                    {stat.isAlert ? '🔴 ' : '📈 '}
                    {stat.trend}
                  </Text>
                </View>
              ))}
            </View>

            {/* Revenue Breakdown Section */}
            {revenueBreakdown && (
              <View style={styles.breakdownSection}>
                <Text style={styles.sectionTitle}>💰 Revenue Breakdown</Text>
                <PieChart
                  data={[
                    {
                      label: 'Game Revenue',
                      value: revenueBreakdown.game.percentage,
                      formatted: revenueBreakdown.game.amount,
                      color: '#FF8C42',
                    },
                    {
                      label: 'Food & Beverage',
                      value: revenueBreakdown.food.percentage,
                      formatted: revenueBreakdown.food.amount,
                      color: '#4CAF50',
                    },
                  ]}
                />
              </View>
            )}

            {/* Operational Insights */}
            {operationalInsights && (
              <View style={styles.insightsSection}>
                <Text style={styles.sectionTitle}>📊 Operational Insights</Text>
                <View style={styles.insightsGrid}>
                  <View style={styles.insightCard}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={28}
                      color="#2196F3"
                    />
                    <Text style={styles.insightLabel}>Avg Session</Text>
                    <Text style={styles.insightValue}>
                      {operationalInsights.avgSessionDuration}
                    </Text>
                  </View>
                  <View style={styles.insightCard}>
                    <MaterialCommunityIcons
                      name="chart-line"
                      size={28}
                      color="#FF8C42"
                    />
                    <Text style={styles.insightLabel}>Peak Time</Text>
                    <Text style={styles.insightValue}>
                      {operationalInsights.peakActivity}
                    </Text>
                  </View>
                  <View style={styles.insightCard}>
                    <MaterialCommunityIcons
                      name="account-group"
                      size={28}
                      color="#9C27B0"
                    />
                    <Text style={styles.insightLabel}>Sessions</Text>
                    <Text style={styles.insightValue}>
                      {operationalInsights.totalSessions}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Detailed Revenue Analysis */}
            {summary?.breakdown && (
              <View style={styles.analysisSection}>
                <Text style={styles.sectionTitle}>
                  📈 Detailed Revenue Analysis
                </Text>

                {/* Revenue by Flow */}
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisCardTitle}>
                    🔄 Revenue by Flow
                  </Text>
                  <View style={styles.analysisTable}>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>
                        📱 Dashboard Direct
                      </Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.flow.dashboard?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>⏳ Queue</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹{summary.breakdown.flow.queue?.toFixed(2) || '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>
                        📅 Reservation
                      </Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.flow.reservation?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Revenue by Booking Type */}
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisCardTitle}>
                    🎯 Revenue by Booking Type
                  </Text>
                  <View style={styles.analysisTable}>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>⏱️ Timer Mode</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.bookingType.timer?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>🎮 Set Game</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.bookingType.set?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>🎱 Frame Mode</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.bookingType.frame?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Revenue Collection Methods */}
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisCardTitle}>
                    💳 Payment Methods
                  </Text>
                  <View style={styles.analysisTable}>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>💵 Cash</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.paymentMode.cash?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>📱 UPI/Online</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.paymentMode.upi?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                    <View style={styles.analysisRow}>
                      <Text style={styles.analysisRowLabel}>👛 Wallet</Text>
                      <Text style={styles.analysisRowValue}>
                        ₹
                        {summary.breakdown.paymentMode.wallet?.toFixed(2) ||
                          '0.00'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Game Utilization Section */}
            <View style={styles.utilizationSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>🎮 Game Utilization</Text>
                <TouchableOpacity>
                  <Text style={styles.detailsLink}>Details</Text>
                </TouchableOpacity>
              </View>

              {/* Chart */}
              <View style={styles.chartContainer}>
                <Text style={styles.chartLabel}>
                  Top 5 Products with Highest Sales Data
                </Text>
                <View style={styles.chart}>
                  {chartData.map((item, idx) => (
                    <View key={idx} style={styles.chartRow}>
                      <Text style={styles.chartGameName}>{item.game}</Text>
                      <View style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              width: `${item.value}%`,
                              backgroundColor: item.color,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.chartValue}>{item.value}%</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Game Revenue List */}
              <View style={styles.revenueList}>
                {gameData.map(game => (
                  <View key={game.name} style={styles.gameCard}>
                    <View style={styles.gameIconContainer}>
                      <Icon name={game.icon} size={32} color="#FF8C42" />
                    </View>
                    <View style={styles.gameInfo}>
                      <Text style={styles.gameName}>{game.name}</Text>
                      <Text style={styles.gameRevenue}>
                        {game.revenue} revenue
                      </Text>
                    </View>
                    <View style={styles.gameStatus}>
                      <Text
                        style={[styles.statusText, { color: game.statusColor }]}
                      >
                        {game.status}
                      </Text>
                      <View style={styles.usageIndicator}>
                        <View
                          style={[
                            styles.usageFill,
                            {
                              width: `${game.usage}%`,
                              backgroundColor: game.statusColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Bottom Spacing */}
            <View style={styles.bottomSpacing} />
          </>
        )}
      </ScrollView>
    </View>
  ) : (
    // Original standalone view with SafeAreaView
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header - only show when not in tabbed view */}
        {!inTabbedView && (
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="layers-outline" size={28} color="#1E3A5F" />
              <Text style={styles.headerTitle}>SNOKEHEAD</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity>
                <Icon name="notifications-outline" size={24} color="#FF8C42" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Icon name="menu" size={28} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF8C42']}
            />
          }
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Loading dashboard...</Text>
            </View>
          ) : (
            <>
              {/* Date and Period Selector */}
              <View style={styles.dateSection}>
                <View style={styles.dateContainer}>
                  <Icon name="calendar-outline" size={20} color="#999" />
                  <Text style={styles.dateText}>
                    {currentDate || 'Loading...'}
                  </Text>
                </View>
                <View style={styles.periodSelector}>
                  {periods.map(period => (
                    <TouchableOpacity
                      key={period}
                      style={[
                        styles.periodBtn,
                        selectedPeriod === period && styles.periodBtnActive,
                      ]}
                      onPress={() => setSelectedPeriod(period)}
                    >
                      <Text
                        style={[
                          styles.periodText,
                          selectedPeriod === period && styles.periodTextActive,
                        ]}
                      >
                        {period}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                {stats.map((stat, idx) => (
                  <View
                    key={stat.id}
                    style={[
                      styles.statCard,
                      { backgroundColor: stat.bgColor },
                      idx % 2 === 1 && styles.statCardRight,
                    ]}
                  >
                    <View style={styles.statHeader}>
                      <Text style={styles.statTitle}>{stat.title}</Text>
                      <Icon
                        name={stat.icon}
                        size={20}
                        color={stat.trendColor}
                      />
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text
                      style={[styles.statTrend, { color: stat.trendColor }]}
                    >
                      {stat.isAlert ? '🔴 ' : '📈 '}
                      {stat.trend}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Revenue Breakdown Section */}
              {revenueBreakdown && (
                <View style={styles.breakdownSection}>
                  <Text style={styles.sectionTitle}>💰 Revenue Breakdown</Text>
                  <PieChart
                    data={[
                      {
                        label: 'Game Revenue',
                        value: revenueBreakdown.game.percentage,
                        formatted: revenueBreakdown.game.amount,
                        color: '#FF8C42',
                      },
                      {
                        label: 'Food & Beverage',
                        value: revenueBreakdown.food.percentage,
                        formatted: revenueBreakdown.food.amount,
                        color: '#4CAF50',
                      },
                    ]}
                  />
                </View>
              )}

              {/* Operational Insights */}
              {operationalInsights && (
                <View style={styles.insightsSection}>
                  <Text style={styles.sectionTitle}>
                    📊 Operational Insights
                  </Text>
                  <View style={styles.insightsGrid}>
                    <View style={styles.insightCard}>
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={28}
                        color="#2196F3"
                      />
                      <Text style={styles.insightLabel}>Avg Session</Text>
                      <Text style={styles.insightValue}>
                        {operationalInsights.avgSessionDuration}
                      </Text>
                    </View>
                    <View style={styles.insightCard}>
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={28}
                        color="#FF8C42"
                      />
                      <Text style={styles.insightLabel}>Peak Time</Text>
                      <Text style={styles.insightValue}>
                        {operationalInsights.peakActivity}
                      </Text>
                    </View>
                    <View style={styles.insightCard}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={28}
                        color="#9C27B0"
                      />
                      <Text style={styles.insightLabel}>Sessions</Text>
                      <Text style={styles.insightValue}>
                        {operationalInsights.totalSessions}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Detailed Revenue Analysis */}
              {summary?.breakdown && (
                <View style={styles.analysisSection}>
                  <Text style={styles.sectionTitle}>
                    📈 Detailed Revenue Analysis
                  </Text>

                  {/* Revenue by Flow */}
                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisCardTitle}>
                      🔄 Revenue by Flow
                    </Text>
                    <View style={styles.analysisTable}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>
                          📱 Dashboard Direct
                        </Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.flow.dashboard?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>⏳ Queue</Text>
                        <Text style={styles.analysisRowValue}>
                          ₹{summary.breakdown.flow.queue?.toFixed(2) || '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>
                          📅 Reservation
                        </Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.flow.reservation?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Revenue by Booking Type */}
                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisCardTitle}>
                      🎯 Revenue by Booking Type
                    </Text>
                    <View style={styles.analysisTable}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>
                          ⏱️ Timer Mode
                        </Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.bookingType.timer?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>🎮 Set Game</Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.bookingType.set?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>
                          🎱 Frame Mode
                        </Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.bookingType.frame?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Revenue Collection Methods */}
                  <View style={styles.analysisCard}>
                    <Text style={styles.analysisCardTitle}>
                      💳 Payment Methods
                    </Text>
                    <View style={styles.analysisTable}>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>💵 Cash</Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.paymentMode.cash?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>
                          📱 UPI/Online
                        </Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.paymentMode.upi?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                      <View style={styles.analysisRow}>
                        <Text style={styles.analysisRowLabel}>👛 Wallet</Text>
                        <Text style={styles.analysisRowValue}>
                          ₹
                          {summary.breakdown.paymentMode.wallet?.toFixed(2) ||
                            '0.00'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Game Utilization Section */}
              <View style={styles.utilizationSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>🎮 Game Utilization</Text>
                  <TouchableOpacity>
                    <Text style={styles.detailsLink}>Details</Text>
                  </TouchableOpacity>
                </View>

                {/* Chart */}
                <View style={styles.chartContainer}>
                  <Text style={styles.chartLabel}>
                    Top 5 Products with Highest Sales Data
                  </Text>
                  <View style={styles.chart}>
                    {chartData.map((item, idx) => (
                      <View key={idx} style={styles.chartRow}>
                        <Text style={styles.chartGameName}>{item.game}</Text>
                        <View style={styles.barContainer}>
                          <View
                            style={[
                              styles.bar,
                              {
                                width: `${item.value}%`,
                                backgroundColor: item.color,
                              },
                            ]}
                          />
                        </View>
                        <Text style={styles.chartValue}>{item.value}%</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Game Revenue List */}
                <View style={styles.revenueList}>
                  {gameData.map(game => (
                    <View key={game.name} style={styles.gameCard}>
                      <View style={styles.gameIconContainer}>
                        <Icon name={game.icon} size={32} color="#FF8C42" />
                      </View>
                      <View style={styles.gameInfo}>
                        <Text style={styles.gameName}>{game.name}</Text>
                        <Text style={styles.gameRevenue}>
                          {game.revenue} revenue
                        </Text>
                      </View>
                      <View style={styles.gameStatus}>
                        <Text
                          style={[
                            styles.statusText,
                            { color: game.statusColor },
                          ]}
                        >
                          {game.status}
                        </Text>
                        <View style={styles.usageIndicator}>
                          <View
                            style={[
                              styles.usageFill,
                              {
                                width: `${game.usage}%`,
                                backgroundColor: game.statusColor,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* Bottom Spacing */}
              <View style={styles.bottomSpacing} />
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabbedContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    letterSpacing: 1.2,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateSection: {
    marginBottom: 20,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  dateText: {
    fontSize: 15,
    color: '#555',
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  periodBtnActive: {
    backgroundColor: '#FF8C42',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  periodText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: CARD_WIDTH,
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statCardRight: {
    marginLeft: 'auto',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  statTitle: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  statTrend: {
    fontSize: 11,
    fontWeight: '600',
  },
  // Revenue Breakdown Enhanced
  breakdownSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  breakdownCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E8E8E8',
  },
  breakdownLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  breakdownAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 8,
  },
  breakdownPercent: {
    fontSize: 15,
    color: '#FF8C42',
    marginTop: 6,
    fontWeight: 'bold',
  },
  // Operational Insights Enhanced
  insightsSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  insightsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  insightLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  insightValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 6,
    textAlign: 'center',
  },
  // Detailed Revenue Analysis Enhanced
  analysisSection: {
    marginBottom: 16,
  },
  analysisCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  analysisCardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  analysisTable: {
    gap: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  analysisRowLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  analysisRowValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  utilizationSection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  detailsLink: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: 18,
  },
  chartLabel: {
    fontSize: 12,
    color: '#777',
    marginBottom: 14,
    fontWeight: '600',
  },
  chart: {
    gap: 12,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chartGameName: {
    width: 70,
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
  },
  chartValue: {
    width: 40,
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  revenueList: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 16,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  gameIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  gameRevenue: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  gameStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  usageIndicator: {
    width: 70,
    height: 6,
    backgroundColor: '#E8E8E8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 3,
  },
  // Pie Chart Styles
  pieChartContainer: {
    marginTop: 12,
  },
  pieChartLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    marginBottom: 8,
  },
  pieChartDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  pieChartLegendDetails: {
    flex: 1,
  },
  pieChartLegendLabel: {
    fontSize: 13,
    color: '#555',
    fontWeight: '600',
    marginBottom: 2,
  },
  pieChartLegendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  pieChartEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  pieChartEmptyText: {
    fontSize: 14,
    color: '#999',
  },
  // Progress Bar Styles
  progressBarContainer: {
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    borderRadius: 10,
  },
  bottomSpacing: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
});
