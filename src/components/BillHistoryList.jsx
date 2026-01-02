import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_URL } from '../config';

// Helper function to get auth token
async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

// Helper function to format date for display
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

// Check if two dates are the same day
const isSameDay = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

export default function BillHistoryList({
  onShowActive,
  onBillClick,
  navigation,
}) {
  const [searchText, setSearchText] = useState('');
  const [allBills, setAllBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterByDate, setFilterByDate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch bill history from backend
  const fetchBillHistory = async (showRefreshing = false) => {
    const token = await getAuthToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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

      // Filter paid bills (bill history)
      const paidBills = billsData
        .filter(bill => bill.status === 'paid')
        .map(bill => ({
          id: bill.id.toString(),
          rawDate: bill.createdAt || bill.created_at,
          date: formatDate(bill.createdAt || bill.created_at),
          customerName:
            bill.customer_name || bill.customerName || 'Unknown Customer',
          items: bill.items_summary || bill.itemsSummary || 'Items purchased',
          mobile: bill.customer_phone || bill.mobile || '+91 XXXXXXXXXX',
          billNumber: bill.bill_number || bill.billNumber || `BILL-${bill.id}`,
          amount: parseFloat(
            bill.total_amount || bill.totalAmount || bill.amount || 0,
          ),
          amountDisplay: `₹${parseFloat(
            bill.total_amount || bill.totalAmount || bill.amount || 0,
          ).toFixed(2)}/-`,
          status: 'Paid',
          summary: bill.items_summary || bill.itemsSummary || 'Items purchased',
          walletAmount: `₹${bill.wallet_amount || bill.walletAmount || 0}.00`,
          totalAmount: `₹${parseFloat(
            bill.total_amount || bill.totalAmount || bill.amount || 0,
          ).toFixed(2)} /-`,
          originalBill: bill, // Keep original data for detailed view
        }))
        .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

      setAllBills(paidBills);
      console.log('Fetched bill history:', paidBills.length);
    } catch (err) {
      console.error('Error fetching bill history:', err);
      setError('Failed to load bill history');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchBillHistory();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchBillHistory();
    }, []),
  );

  // Filter bills based on search text and date
  const filteredBills = allBills.filter(bill => {
    // Date filter
    if (filterByDate && !isSameDay(bill.rawDate, selectedDate)) {
      return false;
    }

    // Search filter
    if (!searchText) return true;
    const searchLower = searchText.toLowerCase();
    return (
      bill.customerName.toLowerCase().includes(searchLower) ||
      bill.billNumber.toLowerCase().includes(searchLower) ||
      bill.items.toLowerCase().includes(searchLower) ||
      bill.mobile.includes(searchText)
    );
  });

  // Handle date change
  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setSelectedDate(date);
      setFilterByDate(true);
    }
  };

  // Clear date filter
  const clearDateFilter = () => {
    setFilterByDate(false);
    setSelectedDate(new Date());
  };

  // Handle pull to refresh
  const handleRefresh = () => {
    fetchBillHistory(true);
  };

  const renderBillCard = ({ item }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => onBillClick(item)}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View style={[styles.statusIndicator, styles.statusPaid]} />

      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.customerName} numberOfLines={2}>
            {item.customerName}
          </Text>
          <Text style={styles.items} numberOfLines={1}>
            {item.items}
          </Text>
          <Text style={styles.mobile}>{item.mobile}</Text>
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.billLabel}>Bill</Text>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <Text style={styles.amount}>{item.amountDisplay}</Text>
          <View style={[styles.statusBadge, styles.statusBadgePaid]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>

      {/* Tap indicator */}
      <View style={styles.tapIndicator}>
        <Icon name="chevron-forward" size={16} color="#CCCCCC" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Management</Text>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Icon
            name={refreshing ? 'reload' : 'refresh'}
            size={20}
            color="#FF8C42"
          />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tab} onPress={onShowActive}>
          <Text style={styles.tabText}>ACTIVE BILLS</Text>
        </TouchableOpacity>

        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>BILL HISTORY</Text>
          <View style={styles.activeTabIndicator} />
        </View>
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
          <View style={styles.searchDivider} />
          <Icon name="mic" size={20} color="#FF8C42" />
        </View>

        <TouchableOpacity
          style={[
            styles.dateSelector,
            filterByDate && styles.dateSelectorActive,
          ]}
          onPress={() => setShowDatePicker(true)}
        >
          <Icon
            name="calendar-outline"
            size={18}
            color={filterByDate ? '#FF8C42' : '#999'}
          />
          <Text
            style={[
              styles.dateSelectorText,
              filterByDate && styles.dateSelectorTextActive,
            ]}
          >
            {filterByDate
              ? selectedDate.toLocaleDateString('en-GB')
              : 'Select Date'}
          </Text>
          {filterByDate && (
            <TouchableOpacity
              onPress={clearDateFilter}
              style={styles.clearDateButton}
            >
              <Icon name="close-circle" size={16} color="#FF8C42" />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Info */}
      {(filterByDate || searchText) && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterInfoText}>
            {filterByDate &&
              `Showing bills from ${selectedDate.toLocaleDateString('en-GB')}`}
            {filterByDate && searchText && ' • '}
            {searchText && `Searching for "${searchText}"`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilterByDate(false);
              setSearchText('');
              setSelectedDate(new Date());
            }}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* DateTimePicker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Bills List */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF8C42" />
          </View>
          <Text style={styles.loadingText}>Loading bill history...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Icon name="alert-circle-outline" size={40} color="#D32F2F" />
          </View>
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorSubText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchBillHistory}
          >
            <Icon name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <Icon name="receipt-outline" size={40} color="#FF8C42" />
          </View>
          <Text style={styles.emptyText}>
            {filterByDate || searchText
              ? 'No matching bills found'
              : 'No bill history yet'}
          </Text>
          <Text style={styles.emptySubText}>
            {filterByDate || searchText
              ? 'Try adjusting your search or date filter'
              : 'Paid bills will appear here once customers complete their payments'}
          </Text>
          {(filterByDate || searchText) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setFilterByDate(false);
                setSearchText('');
                setSelectedDate(new Date());
              }}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          renderItem={renderBillCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onEndReachedThreshold={0.1}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFF8F5',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#FF8C42',
    borderRadius: 2,
  },
  tabText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // Search Container
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },
  searchDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E8E8E8',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dateSelectorActive: {
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  dateSelectorText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '500',
  },
  dateSelectorTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },
  clearDateButton: {
    marginLeft: 2,
  },

  // Filter Info
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterInfoText: {
    fontSize: 12,
    color: '#888888',
    flex: 1,
  },
  clearAllText: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '600',
  },

  // List
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },

  // Bill Card
  billCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    position: 'relative',
    overflow: 'hidden',
  },
  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  statusPaid: {
    backgroundColor: '#4CAF50',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  cardLeft: {
    flex: 1,
    paddingRight: 12,
  },
  date: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 6,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    lineHeight: 22,
  },
  items: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 6,
    lineHeight: 18,
  },
  mobile: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
  },
  cardRight: {
    alignItems: 'flex-end',
    minWidth: 130,
  },
  billLabel: {
    fontSize: 10,
    color: '#999999',
    marginBottom: 2,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF8C42',
    marginBottom: 8,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tapIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -8,
  },

  // Center Container States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 6,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  clearFiltersButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  clearFiltersText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
