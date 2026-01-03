import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

export default function Notifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock notifications for now (until backend API is implemented)
  const mockNotifications = [
    {
      id: 1,
      title: 'New Member Added',
      message: 'John Doe has been added as a new member',
      type: 'member',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      read: false,
    },
    {
      id: 2,
      title: 'Wallet Created',
      message: 'Wallet has been successfully created for Jane Smith',
      type: 'wallet',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      read: false,
    },
    {
      id: 3,
      title: 'Payment Received',
      message: 'Payment of ₹500 received from customer wallet',
      type: 'payment',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      read: true,
    },
    {
      id: 4,
      title: 'Low Stock Alert',
      message: 'Beverages are running low in stock',
      type: 'inventory',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
      read: true,
    },
    {
      id: 5,
      title: 'Table Booking',
      message: 'Table T2 has been booked for 2 hours',
      type: 'booking',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      read: true,
    },
  ];

  // Fetch notifications
  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // For now, use mock data
      // In future, replace with actual API call:
      // const token = await getAuthToken();
      // const response = await fetch(`${API_URL}/api/notifications`, { ... });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Mark notification as read
  const markAsRead = id => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true })),
    );
  };

  // Get icon based on notification type
  const getNotificationIcon = type => {
    switch (type) {
      case 'member':
        return { name: 'person-add-outline', color: '#4CAF50' };
      case 'wallet':
        return { name: 'wallet-outline', color: '#FF8C42' };
      case 'payment':
        return { name: 'card-outline', color: '#2196F3' };
      case 'inventory':
        return { name: 'warning-outline', color: '#FF5722' };
      case 'booking':
        return { name: 'calendar-outline', color: '#9C27B0' };
      default:
        return { name: 'notifications-outline', color: '#666' };
    }
  };

  // Format timestamp
  const formatTime = timestamp => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  // Render notification item
  const renderNotification = ({ item }) => {
    const icon = getNotificationIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.read && styles.unreadItem]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <View
            style={[styles.iconWrapper, { backgroundColor: icon.color + '20' }]}
          >
            <Icon name={icon.name} size={20} color={icon.color} />
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>

        <View style={styles.contentContainer}>
          <Text style={[styles.title, !item.read && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.message} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={styles.timestamp}>{formatTime(item.timestamp)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <Text
            style={[
              styles.markAllText,
              unreadCount === 0 && styles.disabledText,
            ]}
          >
            Mark All Read
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ff8c1a" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderNotification}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchNotifications(true)}
              tintColor="#ff8c1a"
            />
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyMessage}>
                You'll see notifications about member activities, payments, and
                system updates here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  backButton: {
    padding: 8,
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  headerBadge: {
    backgroundColor: '#ff8c1a',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  markAllText: {
    color: '#ff8c1a',
    fontWeight: '600',
    fontSize: 14,
  },

  disabledText: {
    color: '#ccc',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },

  listContainer: {
    paddingTop: 8,
  },

  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  unreadItem: {
    backgroundColor: '#fff5f0',
    borderLeftWidth: 3,
    borderLeftColor: '#ff8c1a',
  },

  iconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },

  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff8c1a',
    position: 'absolute',
    top: -2,
    right: -2,
  },

  contentContainer: {
    flex: 1,
  },

  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  unreadTitle: {
    fontWeight: '700',
  },

  message: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8,
  },

  timestamp: {
    fontSize: 12,
    color: '#999',
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});
