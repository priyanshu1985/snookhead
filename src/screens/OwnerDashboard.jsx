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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ownerAPI } from '../services/api';

const { width } = Dimensions.get('window');

// Chart colors for games
const CHART_COLORS = [
  '#42A5F5', '#66BB6A', '#AB47BC', '#EC407A', '#EF7350', '#FFA726',
  '#26A69A', '#5C6BC0', '#78909C', '#8D6E63',
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

export default function OwnerDashboard({ navigation }) {
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState([]);
  const [gameData, setGameData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [currentDate, setCurrentDate] = useState('');

  const periods = ['Day', 'Week', 'Month'];

  const getGameIcon = (gameName) => {
    const name = gameName.toLowerCase();
    return GAME_ICONS[name] || GAME_ICONS.default;
  };

  const getUsageStatus = (usage) => {
    if (usage >= 70) return { status: 'High usage', color: '#FF8C42' };
    if (usage >= 40) return { status: 'Good usage', color: '#FFC107' };
    return { status: 'Low usage', color: '#FF5252' };
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      const period = selectedPeriod.toLowerCase();
      const [statsData, gameUtilData] = await Promise.all([
        ownerAPI.getStats(period),
        ownerAPI.getGameUtilization(),
      ]);

      // Format stats data
      const formattedStats = [
        {
          id: 1,
          title: 'Active Wallets',
          value: String(statsData.activeWallets || 0),
          trend: statsData.activeWalletsTrend || '+0%',
          icon: 'wallet-outline',
          bgColor: '#FFF3E0',
          trendColor: '#FF8C42',
          positive: true,
        },
        {
          id: 2,
          title: 'New Members',
          value: String(statsData.newMembers || 0),
          trend: statsData.newMembersTrend || '+0%',
          icon: 'people-outline',
          bgColor: '#E8F5E9',
          trendColor: '#4CAF50',
          positive: true,
        },
        {
          id: 3,
          title: 'Inactive Wallets',
          value: String(statsData.inactiveWallets || 0),
          trend: `yesterday: ${statsData.inactiveWalletsYesterday || 0}`,
          icon: 'person-remove-outline',
          bgColor: '#F3E5F5',
          trendColor: '#999',
          positive: false,
        },
        {
          id: 4,
          title: 'Credit Member',
          value: String(statsData.creditMembers || 0),
          trend: statsData.creditMembers > 0 ? 'Alert' : 'OK',
          icon: 'alert-circle-outline',
          bgColor: '#FFEBEE',
          trendColor: statsData.creditMembers > 0 ? '#FF5252' : '#4CAF50',
          positive: false,
          isAlert: statsData.creditMembers > 0,
        },
      ];
      setStats(formattedStats);

      // Format game utilization data for chart
      const games = gameUtilData.games || [];
      const formattedChartData = games.map((game, index) => ({
        game: game.name,
        value: game.utilizationPercent || 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
      }));
      setChartData(formattedChartData);

      // Format game revenue data
      const formattedGameData = games.slice(0, 3).map((game) => {
        const usageInfo = getUsageStatus(game.utilizationPercent || 0);
        return {
          name: game.name,
          usage: game.utilizationPercent || 0,
          revenue: `₹${game.revenue || 0}`,
          status: usageInfo.status,
          statusColor: usageInfo.color,
          icon: getGameIcon(game.name),
        };
      });
      setGameData(formattedGameData);

      // Set current date
      setCurrentDate(new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default empty data on error
      setStats([
        { id: 1, title: 'Active Wallets', value: '0', trend: '+0%', icon: 'wallet-outline', bgColor: '#FFF3E0', trendColor: '#FF8C42', positive: true },
        { id: 2, title: 'New Members', value: '0', trend: '+0%', icon: 'people-outline', bgColor: '#E8F5E9', trendColor: '#4CAF50', positive: true },
        { id: 3, title: 'Inactive Wallets', value: '0', trend: 'yesterday: 0', icon: 'person-remove-outline', bgColor: '#F3E5F5', trendColor: '#999', positive: false },
        { id: 4, title: 'Credit Member', value: '0', trend: 'OK', icon: 'alert-circle-outline', bgColor: '#FFEBEE', trendColor: '#4CAF50', positive: false, isAlert: false },
      ]);
      setChartData([]);
      setGameData([]);
      setCurrentDate(new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }));
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

  return (
    <View style={styles.container}>
      {/* Header */}
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

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FF8C42']} />
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
            <Text style={styles.dateText}>{currentDate || 'Loading...'}</Text>
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

        {/* Game Utilization Section */}
        <View style={styles.utilizationSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Game Utilization</Text>
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
                  <Text style={styles.gameRevenue}>{game.revenue} revenue</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F',
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
  },
  periodBtnActive: {
    backgroundColor: '#FF8C42',
  },
  periodText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  periodTextActive: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    width: (width - 48) / 2, // 2 cards per row
    borderRadius: 12,
    padding: 16,
  },
  statCardRight: {
    marginLeft: 'auto',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statTrend: {
    fontSize: 12,
    fontWeight: '600',
  },
  utilizationSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  detailsLink: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  chartContainer: {
    marginBottom: 16,
  },
  chartLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
    fontWeight: '500',
  },
  chart: {
    gap: 8,
  },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chartGameName: {
    width: 60,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  barContainer: {
    flex: 1,
    height: 20,
    backgroundColor: '#F0F0F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 10,
  },
  chartValue: {
    width: 35,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textAlign: 'right',
  },
  revenueList: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  gameIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  gameRevenue: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  gameStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  usageIndicator: {
    width: 60,
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  usageFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomSpacing: {
    height: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
});
