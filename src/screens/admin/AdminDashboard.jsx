import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
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
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState('');

  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    completedOrders: 0,
    totalTables: 0,
    totalMenuItems: 0,
    totalRevenue: 0,
  });

  const [stations, setStations] = useState([]);

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

      const pendingOrders = orders.filter(o => o.status === 'pending').length;
      const completedOrders = orders.filter(
        o => o.status === 'completed',
      ).length;

      const totalRevenue = orders
        .filter(o => o.status === 'completed')
        .reduce((sum, o) => sum + Number(o.total || 0), 0);

      setStats({
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        totalTables: tables.length,
        totalMenuItems: menuItems.length,
        totalRevenue,
      });
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
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
  }, []);

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
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.brand}>SNOKEHEAD</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      {loading ? (
        <ActivityIndicator size="large" />
      ) : (
        <View style={styles.statsBox}>
          <Text>Total Orders: {stats.totalOrders}</Text>
          <Text>Pending: {stats.pendingOrders}</Text>
          <Text>Completed: {stats.completedOrders}</Text>
          <Text>Tables: {stats.totalTables}</Text>
          <Text>Menu Items: {stats.totalMenuItems}</Text>
          <Text>Revenue: ₹{stats.totalRevenue.toFixed(2)}</Text>
        </View>
      )}

      {/* STATIONS */}
      {stationsLoading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={stations}
          keyExtractor={item => item.id.toString()}
          renderItem={renderStation}
        />
      )}
    </View>
  );
};

export default AdminDashboard;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: '#f5f5f5' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 40,
  },

  brand: { fontSize: 18, fontWeight: 'bold' },
  logout: { color: 'red' },

  statsBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },

  card: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },

  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontWeight: 'bold', fontSize: 16 },
  subText: { color: '#666' },

  logo: { width: 50, height: 50, borderRadius: 25 },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },

  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  pauseBtn: { backgroundColor: '#f59e0b', padding: 6, borderRadius: 6 },
  viewBtn: { backgroundColor: '#3b82f6', padding: 6, borderRadius: 6 },
  removeBtn: { backgroundColor: '#ef4444', padding: 6, borderRadius: 6 },

  btnText: { color: '#fff' },
});
