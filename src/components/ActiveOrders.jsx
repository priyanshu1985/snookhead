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

export default function ActiveOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchActiveOrders = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/orders?status=pending`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];
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

  const handleMarkDelivered = async orderId => {
    try {
      const token = await getAuthToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
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
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
    }
  };

  if (loading) {
    return (
      <View style={styles.activeOrdersContainer}>
        <Text style={styles.infoText}>Loading active orders...</Text>
      </View>
    );
  }

  if (!orders.length) {
    return (
      <View style={styles.activeOrdersContainer}>
        <Text style={styles.infoText}>No active orders.</Text>
      </View>
    );
  }

  return (
    <View style={styles.activeOrdersContainer}>
      {orders.map((order, index) => (
        <View key={order.id} style={styles.orderRow}>
          <Text style={styles.orderIndex}>{index + 1}.</Text>
          <Text style={styles.orderName}>{order.personName || 'Guest'}</Text>
          <Text style={styles.orderWaitTime}>
            Wait for {order.waitTime || '—'}!
          </Text>
          <TouchableOpacity onPress={() => handleMarkDelivered(order.id)}>
            <Icon name="checkmark-circle-outline" size={22} color="#4CAF50" />
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
  },
  orderIndex: { fontSize: 15, color: '#999', width: 30 },
  orderName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#4CAF50' },
  orderWaitTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
    marginRight: 8,
  },
  infoText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
    fontSize: 14,
  },
});
