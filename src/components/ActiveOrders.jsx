import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function ActiveOrders({ refreshKey, searchQuery = '' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filter orders by customer name
  const filteredOrders = orders.filter(order =>
    (order.personName || 'Guest')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const fetchActiveOrders = async () => {
    const token = await getAuthToken();
    if (!token) {
      console.log('No auth token found');
      return;
    }
    try {
      setLoading(true);
      console.log(
        'Fetching active orders from:',
        `${API_URL}/api/orders?status=pending`,
      );
      const res = await fetch(`${API_URL}/api/orders?status=pending`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      console.log('Active orders API response:', result);

      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      console.log('Processed active orders list:', list);
      setOrders(list);
    } catch (err) {
      console.log('Error fetching active orders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('RefreshKey changed, refetching active orders...');
      fetchActiveOrders();
    }
  }, [refreshKey]);

  const handleMarkDelivered = async orderId => {
    Alert.alert(
      'Mark as Delivered',
      'Are you sure this order has been delivered?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Mark Delivered',
          onPress: async () => {
            try {
              const token = await getAuthToken();
              if (!token) return;
              const res = await fetch(`${API_URL}/api/orders/${orderId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'completed' }),
              });
              const result = await res.json();
              if (!res.ok) {
                Alert.alert('Error', result.error || 'Failed to update order');
                return;
              }
              // Remove from active orders list
              setOrders(prev => prev.filter(o => o.id !== orderId));
              Alert.alert('Success', 'Order marked as delivered!');
            } catch (err) {
              Alert.alert('Error', err.message || 'Network error');
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.activeOrdersContainer}>
        <Text style={styles.infoText}>Loading active orders...</Text>
      </View>
    );
  }

  if (!filteredOrders.length && !loading) {
    return (
      <View style={styles.activeOrdersContainer}>
        <Text style={styles.infoText}>
          {searchQuery
            ? 'No orders found matching your search.'
            : 'No active orders.'}
        </Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchActiveOrders}
        >
          <Text style={styles.refreshButtonText}>Refresh Orders</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.activeOrdersContainer}>
      {filteredOrders.map((order, index) => (
        <View key={order.id} style={styles.orderRow}>
          <Text style={styles.orderIndex}>{index + 1}.</Text>
          <View style={styles.orderDetails}>
            <Text style={styles.orderName}>{order.personName || 'Guest'}</Text>
            <Text style={styles.orderTotal}>
              ₹ {order.orderTotal || order.total || 0}
            </Text>
            <Text style={styles.orderStatus}>{order.status || 'pending'}</Text>
          </View>
          <TouchableOpacity
            style={styles.deliveredButton}
            onPress={() => handleMarkDelivered(order.id)}
          >
            <Icon name="checkmark-circle-outline" size={24} color="#4CAF50" />
            <Text style={styles.deliveredText}>Delivered</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  activeOrdersContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 8,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#fff',
  },
  orderIndex: { fontSize: 15, color: '#999', width: 30 },
  orderDetails: {
    flex: 1,
    paddingRight: 12,
  },
  orderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF8C42',
    marginBottom: 2,
  },
  orderStatus: { fontSize: 12, color: '#666', textTransform: 'capitalize' },
  deliveredButton: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
    backgroundColor: '#F8FFF8',
  },
  deliveredText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 14,
  },
  refreshButton: {
    backgroundColor: '#FF8C42',
    marginHorizontal: 40,
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});
