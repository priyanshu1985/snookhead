import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Temporarily disabled due to react-native-svg linking issue
// import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import DashboardCard from '../../components/DashboardCard';
import { COLORS, SPACING } from '../../theme';
import { API_URL } from '../../config';
import {
  ordersAPI,
  tablesAPI,
  menuAPI,
  adminStationsAPI,
} from '../../services/api';

const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState('');

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalTables: 0,
    totalMenuItems: 0,
    totalRevenue: 0,
    weeklyRevenue: [],
    ordersBySource: [],
    tableUtilization: 0,
  });

  const [stations, setStations] = useState([]);
  const [users, setUsers] = useState([]);

  /* ---------------- FETCH ANALYTICS ---------------- */
  const fetchStats = async () => {
    try {
      setLoading(true);

      const ordersRes = await ordersAPI.getAll();
      const orders = ordersRes?.data || [];

      let tables = [];
      let menuItems = [];

      try {
        const t = await tablesAPI.getAll();
        tables = t?.data || [];
      } catch {}

      try {
        const m = await menuAPI.getAll();
        menuItems = m?.data || [];
      } catch {}

      // Enhanced analytics
      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(o => o.status === 'completed').length;
      
      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      // Weekly revenue data for chart
      const weeklyRevenue = generateWeeklyRevenue(orders);
      
      // Orders by source for pie chart
      const ordersBySource = generateOrdersBySource(orders);
      
      // Table utilization calculation
      const activeTableCount = tables.filter(t => t.status === 'occupied').length;
      const tableUtilization = tables.length > 0 ? (activeTableCount / tables.length) * 100 : 0;

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        totalTables: tables.length,
        totalMenuItems: menuItems.length,
        totalRevenue,
        weeklyRevenue,
        ordersBySource,
        tableUtilization,
      });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- FETCH USERS FOR ADMIN ANALYTICS ---------------- */
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`, {
        headers: {
          'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data || []);
      }
    } catch (err) {
      console.log('Error fetching users:', err);
    }
  };

  /* ---------------- ANALYTICS HELPERS ---------------- */
  const generateWeeklyRevenue = (orders) => {
    const last7Days = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayRevenue = orders
        .filter(o => o.status === 'completed' && o.createdAt?.includes(dateStr))
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      
      last7Days.push(dayRevenue);
    }
    
    return last7Days;
  };

  const generateOrdersBySource = (orders) => {
    const sources = {};
    orders.forEach(order => {
      const source = order.source || 'counter';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return Object.entries(sources).map(([name, count], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      color: [COLORS.primary, COLORS.secondary, COLORS.info, COLORS.warning, COLORS.success][index] || COLORS.textTertiary,
      legendFontColor: COLORS.textPrimary,
      legendFontSize: 12,
    }));
  };

  /* ---------------- FETCH STATIONS ---------------- */
  const fetchStations = async () => {
    try {
      setStationsLoading(true);
      const data = await adminStationsAPI.getAll();
      setStations(Array.isArray(data) ? data : []);
    } catch (err) {
      setStationsError('Failed to load stations');
    } finally {
      setStationsLoading(false);
    }
  };

  /* ---------------- ACTIONS ---------------- */
  const handlePauseSubscription = async id => {
    try {
      await adminStationsAPI.pauseSubscription(id);
      fetchStations();
    } catch {
      Alert.alert('Error', 'Failed to pause subscription');
    }
  };

  const handleRemoveStation = id => {
    Alert.alert('Confirm', 'Are you sure you want to remove this station?', [
      { text: 'Cancel' },
      {
        text: 'Remove',
        onPress: async () => {
          await adminStationsAPI.remove(id);
          fetchStations();
        },
      },
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          });
        },
      },
    ]);
  };

  useEffect(() => {
    fetchStats();
    fetchStations();
    fetchUsers();
  }, []);

  /* ---------------- REFRESH HANDLER ---------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchStations(), fetchUsers()]);
    setRefreshing(false);
  };

  /* ---------------- RENDER STATION CARD ---------------- */
  const renderStation = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        {item.station_photo_url ? (
          <Image source={{ uri: item.station_photo_url }} style={styles.logo} />
        ) : (
          <View style={styles.logoPlaceholder}>
            <Text>{item.station_name?.charAt(0)}</Text>
          </View>
        )}

        <View>
          <Text style={styles.title}>{item.station_name}</Text>
          <Text style={styles.subText}>
            {item.location_city}, {item.location_state}
          </Text>
        </View>
      </View>

      <Text>Owner: {item.owner_name}</Text>
      <Text>Phone: {item.owner_phone}</Text>
      <Text>Status: {item.subscription_status}</Text>
      <Text>Plan: {item.subscription_type}</Text>

      <View style={styles.actions}>
        {item.subscription_status === 'active' && (
          <TouchableOpacity
            style={styles.pauseBtn}
            onPress={() => handlePauseSubscription(item.id)}
          >
            <Text style={styles.btnText}>Pause</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => navigation.navigate('StationDetails', { id: item.id })}
        >
          <Text style={styles.btnText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.removeBtn}
          onPress={() => handleRemoveStation(item.id)}
        >
          <Text style={styles.btnText}>Remove</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      
      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ADMIN TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.welcomeText}>Welcome back, Admin</Text>
          <Text style={styles.dateText}>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</Text>
        </View>

        {/* STATS CARDS */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading analytics...</Text>
          </View>
        ) : (
          <>
            {/* Key Metrics */}
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.cardsGrid}>
              <DashboardCard
                title="Total Revenue"
                value={`₹${stats.totalRevenue.toLocaleString()}`}
                icon="cash"
                color={COLORS.success}
                growth={12.5}
              />
              <DashboardCard
                title="Active Orders"
                value={stats.pendingOrders.toString()}
                icon="restaurant"
                color={COLORS.warning}
                subtitle="Pending completion"
              />
              <DashboardCard
                title="Table Utilization"
                value={`${stats.tableUtilization.toFixed(1)}%`}
                icon="grid"
                color={COLORS.info}
                growth={-2.3}
              />
              <DashboardCard
                title="Total Users"
                value={users.length.toString()}
                icon="people"
                color={COLORS.secondary}
                subtitle={`${users.filter(u => u.role === 'owner').length} owners`}
              />
            </View>

            {/* Charts Section */}
            <Text style={styles.sectionTitle}>Analytics</Text>
            
            {/* Weekly Revenue Chart - Placeholder */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>Weekly Revenue Trend</Text>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartPlaceholderText}>
                  {stats.weeklyRevenue.length > 0
                    ? `Total: ₹${stats.weeklyRevenue.reduce((a, b) => a + b, 0).toLocaleString()}`
                    : 'No data available'}
                </Text>
                <View style={styles.weeklyRevenueList}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
                    <View key={day} style={styles.revenueItem}>
                      <Text style={styles.revenueDay}>{day}</Text>
                      <Text style={styles.revenueValue}>₹{(stats.weeklyRevenue[idx] || 0).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Orders by Source - Placeholder */}
            {stats.ordersBySource.length > 0 && (
              <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Orders by Source</Text>
                <View style={styles.chartPlaceholder}>
                  {stats.ordersBySource.map((source, idx) => (
                    <View key={idx} style={styles.sourceItem}>
                      <View style={[styles.sourceColor, { backgroundColor: source.color }]} />
                      <Text style={styles.sourceName}>{source.name}</Text>
                      <Text style={styles.sourceCount}>{source.count} orders</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Users Overview */}
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>User Distribution</Text>
              <View style={styles.userStats}>
                {['owner', 'staff', 'customer', 'admin'].map(role => (
                  <View key={role} style={styles.userStatItem}>
                    <Text style={styles.userStatNumber}>
                      {users.filter(u => u.role === role).length}
                    </Text>
                    <Text style={styles.userStatLabel}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}s
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Stations Section */}
        <Text style={styles.sectionTitle}>Station Management</Text>
        {stationsLoading ? (
          <ActivityIndicator size="large" color={COLORS.primary} />
        ) : stationsError ? (
          <Text style={styles.errorText}>{stationsError}</Text>
        ) : (
          <FlatList
            data={stations}
            keyExtractor={item => item.id.toString()}
            renderItem={renderStation}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ScrollView>
    </View>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.background,
  },
  
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },

  titleSection: {
    marginVertical: SPACING.lg,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  dateText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },

  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  cardsGrid: {
    marginBottom: SPACING.lg,
  },

  chartContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },

  chart: {
    borderRadius: 16,
  },

  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
  },

  userStatItem: {
    alignItems: 'center',
  },

  userStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },

  userStatLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },

  // Legacy styles for stations (to be improved)
  card: {
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: 12,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  row: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  
  title: { 
    fontWeight: '600', 
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  
  subText: { 
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },

  pauseBtn: { 
    backgroundColor: COLORS.warning, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  
  viewBtn: { 
    backgroundColor: COLORS.info, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  
  removeBtn: { 
    backgroundColor: COLORS.error, 
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  btnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Chart placeholder styles
  chartPlaceholder: {
    paddingVertical: SPACING.md,
  },

  chartPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },

  weeklyRevenueList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  revenueItem: {
    width: '13%',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },

  revenueDay: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  revenueValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },

  sourceColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: SPACING.sm,
  },

  sourceName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },

  sourceCount: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
