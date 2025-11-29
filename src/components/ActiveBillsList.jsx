import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';

// Helper function to get auth token
async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

// Helper function to format date
const formatDate = dateString => {
  const date = new Date(dateString);
  return date
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
    .replace(/\//g, '/');
};

export default function ActiveBillsList({
  onShowHistory,
  onBillClick,
  navigation,
}) {
  const [searchText, setSearchText] = useState('');
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Fetch active bills from backend
  const fetchActiveBills = async () => {
    const token = await getAuthToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/bills`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const billsData = Array.isArray(result)
        ? result
        : result.bills || result.data || [];

      // Filter active bills (unpaid status)
      const activeBills = billsData
        .filter(bill => bill.status !== 'paid')
        .map(bill => ({
          id: bill.id.toString(),
          date: formatDate(bill.createdAt || bill.created_at),
          customerName:
            bill.customer_name || bill.customerName || 'Unknown Customer',
          items: bill.items_summary || bill.itemsSummary || 'Items',
          mobile: bill.customer_phone || bill.mobile || '+91 XXXXXXXXXX',
          billNumber: bill.bill_number || bill.billNumber || `B${bill.id}`,
          amount: `₹${
            bill.total_amount || bill.totalAmount || bill.amount || 0
          }/-`,
          status: bill.status === 'paid' ? 'Paid' : 'Unpaid',
          detailedItems: bill.order_items || bill.orderItems || [],
          orderAmount:
            bill.order_amount || bill.orderAmount || bill.total_amount || 0,
          totalAmount:
            bill.total_amount || bill.totalAmount || bill.amount || 0,
          originalBill: bill, // Keep original data for detailed view
        }));

      setBills(activeBills);
      console.log('Fetched active bills:', activeBills);
    } catch (err) {
      console.error('Error fetching active bills:', err);
      setError('Failed to load active bills');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchActiveBills();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchActiveBills();
    }, []),
  );

  // Filter bills based on search text
  const filteredBills = bills.filter(bill => {
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      bill.customerName.toLowerCase().includes(searchLower) ||
      bill.billNumber.toLowerCase().includes(searchLower) ||
      bill.items.toLowerCase().includes(searchLower) ||
      bill.mobile.includes(searchText)
    );
  });

  const renderBillCard = ({ item }) => (
    <TouchableOpacity style={styles.billCard} onPress={() => onBillClick(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.items}>{item.items}</Text>
          <Text style={styles.mobile}>{item.mobile}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.billLabel}>Bill 1</Text>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <Text style={styles.amount}>{item.amount}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Management</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>ACTIVE BILLS</Text>
        </View>

        <TouchableOpacity style={styles.tab} onPress={onShowHistory}>
          <Text style={styles.tabText}>BILL HISTORY</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Date Selector */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          <Icon name="mic" size={20} color="#FF8C42" />
        </View>

        <TouchableOpacity style={styles.dateSelector}>
          <Icon name="calendar-outline" size={18} color="#999" />
          <Text style={styles.dateSelectorText}>
            {formatDate(selectedDate)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bills List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading active bills...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchActiveBills}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="receipt-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>No active bills found</Text>
          <Text style={styles.emptySubText}>
            All bills have been paid or no bills exist yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={item => item.id}
          renderItem={renderBillCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dateSelectorText: {
    fontSize: 12,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  items: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  mobile: {
    fontSize: 12,
    color: '#999',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  billLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
    marginBottom: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
