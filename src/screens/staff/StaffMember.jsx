import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { ordersAPI } from '../../services/api';

const StaffOrders = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  const sourceFilters = [
    { key: 'all', label: 'All' },
    { key: 'table_booking', label: 'Table' },
    { key: 'counter', label: 'Counter' },
    { key: 'zomato', label: 'Zomato' },
    { key: 'swiggy', label: 'Swiggy' },
  ];

  /* ---------------- FETCH ORDERS ---------------- */
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await ordersAPI.getAll();
      const ordersList = response?.data || [];
      setOrders(ordersList);
      setError('');
    } catch (err) {
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UPDATE STATUS ---------------- */
  const handleUpdateStatus = async orderId => {
    try {
      await ordersAPI.updateStatus(orderId, 'completed');
      fetchOrders();
    } catch (err) {
      Alert.alert('Error', 'Failed to update order');
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  /* ---------------- FILTER LOGIC ---------------- */
  const pendingOrders = orders.filter(o => o.status === 'pending');

  const filteredOrders =
    sourceFilter === 'all'
      ? pendingOrders
      : pendingOrders.filter(o => o.order_source === sourceFilter);

  const getSourceCount = source => {
    if (source === 'all') return pendingOrders.length;
    return pendingOrders.filter(o => o.order_source === source).length;
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

  /* ---------------- ORDER CARD ---------------- */
  const renderOrder = ({ item, index }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.index}>{index + 1}.</Text>
        <View>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.customer}>{item.personName || 'Customer'}</Text>
        </View>
      </View>

      <View style={styles.badges}>
        <Text style={styles.sourceBadge}>{item.order_source}</Text>
        <Text style={styles.statusBadge}>Pending</Text>
      </View>

      <View style={styles.items}>
        {item.OrderItems?.map((it, idx) => (
          <View style={styles.itemRow} key={idx}>
            <Text>{it.MenuItem?.name || 'Item'}</Text>
            <Text>x{it.qty}</Text>
            <Text>₹{(Number(it.priceEach || 0) * it.qty).toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>{item.paymentMethod || 'Cash'}</Text>
        <Text style={styles.total}>₹{Number(item.total || 0).toFixed(2)}</Text>
      </View>

      <TouchableOpacity
        style={styles.completeBtn}
        onPress={() => handleUpdateStatus(item.id)}
      >
        <Text style={styles.btnText}>Mark as Completed</Text>
      </TouchableOpacity>
    </View>
  );

  /* ---------------- UI ---------------- */
  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.brand}>SNOKEHEAD</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* FILTER TABS */}
      <View style={styles.tabs}>
        {sourceFilters.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.tab, sourceFilter === f.key && styles.activeTab]}
            onPress={() => setSourceFilter(f.key)}
          >
            <Text>
              {f.label} ({getSourceCount(f.key)})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ORDERS */}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : filteredOrders.length === 0 ? (
        <Text style={styles.empty}>No active orders</Text>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id.toString()}
          renderItem={renderOrder}
        />
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

export default StaffOrders;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f4f4f4' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 40,
  },

  brand: { fontSize: 18, fontWeight: 'bold' },
  logout: { color: 'red' },

  tabs: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  tab: {
    padding: 6,
    backgroundColor: '#ddd',
    borderRadius: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  activeTab: { backgroundColor: '#93c5fd' },

  orderCard: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  orderHeader: { flexDirection: 'row', gap: 8 },
  index: { fontWeight: 'bold' },
  date: { fontSize: 12, color: '#555' },
  customer: { fontWeight: '600' },

  badges: { flexDirection: 'row', gap: 10, marginVertical: 6 },
  sourceBadge: { backgroundColor: '#fde68a', padding: 4, borderRadius: 4 },
  statusBadge: { backgroundColor: '#fecaca', padding: 4, borderRadius: 4 },

  items: { marginTop: 6 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  total: { fontWeight: 'bold' },

  completeBtn: {
    backgroundColor: '#22c55e',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },

  btnText: { color: '#fff', fontWeight: '600' },

  empty: { textAlign: 'center', marginTop: 20 },
  error: { color: 'red', textAlign: 'center' },
});
