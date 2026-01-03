import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import Header from '../../components/Header';
import DashboardCard from '../../components/DashboardCard';
import { COLORS, SPACING } from '../../theme';
import { ordersAPI } from '../../services/api';

const StaffMember = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    todayOrders: 0,
  });

  const sourceFilters = [
    { key: 'all', label: 'All Sources' },
    { key: 'table_booking', label: 'Table' },
    { key: 'counter', label: 'Counter' },
    { key: 'zomato', label: 'Zomato' },
    { key: 'swiggy', label: 'Swiggy' },
  ];

  const statusFilters = [
    { key: 'all', label: 'All Status' },
    { key: 'pending', label: 'Pending' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'completed', label: 'Completed' },
  ];

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getAll();
      const ordersList = response?.data || [];
      setOrders(ordersList);

      // Calculate stats
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = ordersList.filter(o => o.createdAt?.includes(today));
      const pendingOrders = ordersList.filter(
        o => o.status === 'pending',
      ).length;
      const completedOrders = ordersList.filter(
        o => o.status === 'completed',
      ).length;

      setStats({
        totalOrders: ordersList.length,
        pendingOrders,
        completedOrders,
        todayOrders: todayOrders.length,
      });

      setError('');
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- REFRESH HANDLER ---------------- */
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  /* ---------------- UPDATE STATUS ---------------- */
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      await fetchOrders(); // Refresh orders after update
      Alert.alert('Success', `Order status updated to ${newStatus}`);
    } catch (err) {
      Alert.alert('Error', 'Failed to update order status');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */
  const filteredOrders = orders.filter(order => {
    const matchesSource =
      sourceFilter === 'all' || order.order_source === sourceFilter;
    const matchesStatus =
      statusFilter === 'all' || order.status === statusFilter;
    return matchesSource && matchesStatus;
  });

  const getSourceCount = source => {
    if (source === 'all') return orders.length;
    return orders.filter(o => o.order_source === source).length;
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return (
      d.toLocaleDateString('en-GB') +
      ' ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    );
  };

  const getStatusColor = status => {
    switch (status) {
      case 'pending':
        return COLORS.warning;
      case 'preparing':
        return COLORS.info;
      case 'ready':
        return COLORS.primary;
      case 'completed':
        return COLORS.success;
      default:
        return COLORS.textSecondary;
    }
  };

  const getNextStatus = currentStatus => {
    switch (currentStatus) {
      case 'pending':
        return 'preparing';
      case 'preparing':
        return 'ready';
      case 'ready':
        return 'completed';
      default:
        return null;
    }
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

  /* ---------------- RENDER ORDER CARD ---------------- */
  const renderOrderCard = order => {
    const nextStatus = getNextStatus(order.status);

    return (
      <View key={order.id} style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.orderId}>Order #{order.id}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
            <Text style={styles.customerName}>
              {order.personName || 'Customer'}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(order.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {(order.status || 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <View style={styles.orderMeta}>
            <Text style={styles.orderSource}>
              {order.order_source
                ? order.order_source.replace('_', ' ').toUpperCase()
                : 'COUNTER'}
            </Text>
            <Text style={styles.orderTotal}>
              ₹{Number(order.total || 0).toFixed(2)}
            </Text>
          </View>

          <View style={styles.itemsList}>
            {order.OrderItems?.slice(0, 3).map((item, idx) => (
              <Text key={idx} style={styles.itemText}>
                {item.MenuItem?.name || 'Item'} x{item.qty} - ₹
                {(Number(item.priceEach || 0) * item.qty).toFixed(2)}
              </Text>
            ))}
            {order.OrderItems?.length > 3 && (
              <Text style={styles.moreItems}>
                +{order.OrderItems.length - 3} more items...
              </Text>
            )}
          </View>

          {nextStatus && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={() => handleUpdateStatus(order.id, nextStatus)}
              >
                <Text style={styles.actionBtnText}>
                  {nextStatus === 'preparing'
                    ? 'Start Preparing'
                    : nextStatus === 'ready'
                    ? 'Mark Ready'
                    : nextStatus === 'completed'
                    ? 'Complete Order'
                    : 'Update'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={() =>
                  Alert.alert(
                    'Order Details',
                    `Order #${order.id}\nStatus: ${order.status}\nTotal: ₹${order.total}`,
                  )
                }
              >
                <Text style={styles.secondaryBtnText}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      <Header navigation={navigation} />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* STAFF TITLE */}
        <View style={styles.titleSection}>
          <Text style={styles.welcomeText}>Staff Dashboard</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* STATS CARDS */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading orders...</Text>
          </View>
        ) : (
          <>
            {/* Quick Stats */}
            <Text style={styles.sectionTitle}>Today's Overview</Text>
            <View style={styles.statsRow}>
              <DashboardCard
                title="Pending Orders"
                value={stats.pendingOrders.toString()}
                icon="time"
                color={COLORS.warning}
                subtitle="Needs attention"
              />
              <DashboardCard
                title="Today's Orders"
                value={stats.todayOrders.toString()}
                icon="calendar"
                color={COLORS.info}
                subtitle="This shift"
              />
            </View>

            <View style={styles.statsRow}>
              <DashboardCard
                title="Completed"
                value={stats.completedOrders.toString()}
                icon="checkmark-circle"
                color={COLORS.success}
                subtitle="All time"
              />
              <DashboardCard
                title="Total Orders"
                value={stats.totalOrders.toString()}
                icon="restaurant"
                color={COLORS.primary}
                subtitle="In system"
              />
            </View>

            {/* FILTER SECTION */}
            <Text style={styles.sectionTitle}>Filter Orders</Text>

            {/* Source Filter */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Source:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterTabs}>
                  {sourceFilters.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.filterTab,
                        sourceFilter === f.key && styles.activeFilterTab,
                      ]}
                      onPress={() => setSourceFilter(f.key)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          sourceFilter === f.key && styles.activeFilterText,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Status Filter */}
            <View style={styles.filterContainer}>
              <Text style={styles.filterLabel}>Status:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.filterTabs}>
                  {statusFilters.map(f => (
                    <TouchableOpacity
                      key={f.key}
                      style={[
                        styles.filterTab,
                        statusFilter === f.key && styles.activeFilterTab,
                      ]}
                      onPress={() => setStatusFilter(f.key)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          statusFilter === f.key && styles.activeFilterText,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* ORDERS LIST */}
            <Text style={styles.sectionTitle}>
              Orders ({filteredOrders.length})
            </Text>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : filteredOrders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No orders found</Text>
                <Text style={styles.emptySubtext}>
                  Try adjusting your filters
                </Text>
              </View>
            ) : (
              <View style={styles.ordersContainer}>
                {filteredOrders.map(order => renderOrderCard(order))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

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
    marginTop: SPACING.lg,
    marginBottom: SPACING.md,
  },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },

  filterContainer: {
    marginBottom: SPACING.md,
  },

  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },

  filterTabs: {
    flexDirection: 'row',
    paddingVertical: SPACING.xs,
  },

  filterTab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    marginRight: SPACING.xs,
    backgroundColor: COLORS.borderLight,
    borderRadius: 20,
  },

  activeFilterTab: {
    backgroundColor: COLORS.primary,
  },

  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  activeFilterText: {
    color: COLORS.white,
  },

  ordersContainer: {
    paddingBottom: SPACING.xl,
  },

  orderCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },

  orderInfo: {
    flex: 1,
  },

  orderId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },

  orderDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  customerName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: SPACING.sm,
  },

  statusText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  orderDetails: {
    marginTop: SPACING.sm,
  },

  orderMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },

  orderSource: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },

  itemsList: {
    marginBottom: SPACING.sm,
  },

  itemText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },

  moreItems: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontStyle: 'italic',
  },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },

  actionBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },

  primaryBtn: {
    backgroundColor: COLORS.primary,
  },

  secondaryBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  actionBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },

  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },

  emptyText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },

  emptySubtext: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  errorText: {
    color: COLORS.error,
    textAlign: 'center',
    marginVertical: SPACING.md,
  },
});

export default StaffMember;
