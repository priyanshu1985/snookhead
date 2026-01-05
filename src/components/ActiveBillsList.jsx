import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
} from 'react-native';
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

export default function ActiveBillsList({
  onShowHistory,
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

  // Fetch active bills from backend
  const fetchActiveBills = async (showRefreshing = false) => {
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

      // Filter active bills (unpaid status)
      const activeBills = billsData
        .filter(bill => bill.status !== 'paid')
        .map(bill => {
          // Get order items from various possible fields
          const orderItems =
            bill.order_items || bill.orderItems || bill.OrderItems || [];

          // Build items summary from order items
          let itemsSummary = bill.items_summary || bill.itemsSummary || '';
          if (!itemsSummary && orderItems.length > 0) {
            itemsSummary = orderItems
              .slice(0, 3)
              .map(item => {
                const name =
                  item.MenuItem?.name ||
                  item.menu_item?.name ||
                  item.name ||
                  item.item_name ||
                  'Item';
                const qty = item.qty || item.quantity || 1;
                return `${name} x${qty}`;
              })
              .join(', ');
            if (orderItems.length > 3) {
              itemsSummary += ` +${orderItems.length - 3} more`;
            }
          }
          if (!itemsSummary) {
            itemsSummary = 'Table charges';
          }

          return {
            id: bill.id.toString(),
            rawDate: bill.createdAt || bill.created_at,
            date: formatDate(bill.createdAt || bill.created_at),
            customerName:
              bill.customer_name ||
              bill.customerName ||
              bill.user?.name ||
              bill.User?.name ||
              'Walk-in Customer',
            items: itemsSummary,
            mobile:
              bill.customer_phone ||
              bill.mobile ||
              bill.user?.phone ||
              '+91 XXXXXXXXXX',
            billNumber:
              bill.bill_number || bill.billNumber || `BILL-${bill.id}`,
            amount: parseFloat(
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            ),
            amountDisplay: `₹${parseFloat(
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            ).toFixed(2)}/-`,
            status: bill.status === 'paid' ? 'Paid' : 'Unpaid',
            detailedItems: orderItems,
            orderAmount:
              bill.order_amount || bill.orderAmount || bill.total_amount || 0,
            totalAmount:
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            originalBill: bill,
          };
        })
        .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

      setAllBills(activeBills);
      console.log('Fetched active bills:', activeBills.length);
    } catch (err) {
      console.error('Error fetching active bills:', err);
      setError('Failed to load active bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
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
    fetchActiveBills(true);
  };

  const renderBillCard = ({ item }) => (
    <TouchableOpacity
      style={styles.billCard}
      onPress={() => onBillClick(item)}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View
        style={[
          styles.statusIndicator,
          item.status === 'Paid' ? styles.statusPaid : styles.statusUnpaid,
        ]}
      />

      <View style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName}
          </Text>
          <Text style={styles.mobile}>{item.mobile}</Text>

          {/* Order Items */}
          {item.detailedItems && item.detailedItems.length > 0 ? (
            <View style={styles.orderItemsContainer}>
              <Text style={styles.orderItemsLabel}>Order Items:</Text>
              {item.detailedItems.slice(0, 3).map((orderItem, idx) => (
                <Text key={idx} style={styles.orderItemText} numberOfLines={1}>
                  •{' '}
                  {orderItem.MenuItem?.name ||
                    orderItem.menu_item?.name ||
                    orderItem.name ||
                    orderItem.item_name ||
                    'Item'}{' '}
                  x{orderItem.qty || orderItem.quantity || 1}
                </Text>
              ))}
              {item.detailedItems.length > 3 && (
                <Text style={styles.moreItemsText}>
                  +{item.detailedItems.length - 3} more items
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.items} numberOfLines={1}>
              {item.items}
            </Text>
          )}
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.billLabel}>Bill</Text>
          <Text style={styles.billNumber} numberOfLines={1}>
            {item.billNumber}
          </Text>
          <Text style={styles.amount}>{item.amountDisplay}</Text>
          <View
            style={[
              styles.statusBadge,
              item.status === 'Paid'
                ? styles.statusBadgePaid
                : styles.statusBadgeUnpaid,
            ]}
          >
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Management</Text>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Icon name="refresh-outline" size={22} color="#FF8C42" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, styles.activeTab]}
          activeOpacity={0.8}
        >
          <Text style={styles.activeTabText}>ACTIVE BILLS</Text>
          <View style={styles.activeTabIndicator} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={onShowHistory}
          activeOpacity={0.7}
        >
          <Text style={styles.tabText}>BILL HISTORY</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Date Selector */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={20} color="#999999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search bills..."
            placeholderTextColor="#999999"
            value={searchText}
            onChangeText={setSearchText}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchText('')}
              activeOpacity={0.7}
            >
              <Icon name="close-circle" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.dateSelector,
            filterByDate && styles.dateSelectorActive,
          ]}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.7}
        >
          <Icon
            name="calendar-outline"
            size={18}
            color={filterByDate ? '#FF8C42' : '#666666'}
          />
          <Text
            style={[
              styles.dateSelectorText,
              filterByDate && styles.dateSelectorTextActive,
            ]}
          >
            {formatDate(selectedDate)}
          </Text>
          {filterByDate && (
            <TouchableOpacity
              onPress={clearDateFilter}
              style={styles.clearDateButton}
              activeOpacity={0.7}
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
            Showing {filteredBills.length} of {allBills.length} bills
            {filterByDate && ` for ${formatDate(selectedDate)}`}
            {searchText && ` matching "${searchText}"`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchText('');
              clearDateFilter();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.clearAllText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Bills List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <View style={styles.loadingIcon}>
            <ActivityIndicator size="large" color="#FF8C42" />
          </View>
          <Text style={styles.loadingText}>Loading active bills...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <View style={styles.errorIcon}>
            <Icon name="alert-circle-outline" size={48} color="#D32F2F" />
          </View>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.errorSubText}>Please check your connection</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchActiveBills()}
            activeOpacity={0.8}
          >
            <Icon name="refresh-outline" size={18} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filteredBills.length === 0 ? (
        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <Icon name="receipt-outline" size={48} color="#FF8C42" />
          </View>
          <Text style={styles.emptyText}>No active bills found</Text>
          <Text style={styles.emptySubText}>
            {filterByDate || searchText
              ? 'Try adjusting your filters'
              : 'All bills have been paid or no bills exist yet'}
          </Text>
          {(filterByDate || searchText) && (
            <TouchableOpacity
              style={styles.clearFiltersButton}
              onPress={() => {
                setSearchText('');
                clearDateFilter();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredBills}
          keyExtractor={item => item.id}
          renderItem={renderBillCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
    </View>
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
    paddingVertical: 0, // Remove vertical padding to eliminate gap
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 50, // Ensure minimum height for touch targets
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
  statusUnpaid: {
    backgroundColor: '#FF8C42',
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
    marginTop: 6,
    lineHeight: 18,
  },
  mobile: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '400',
    marginBottom: 4,
  },
  orderItemsContainer: {
    marginTop: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 8,
  },
  orderItemsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  orderItemText: {
    fontSize: 12,
    color: '#444444',
    marginBottom: 2,
    lineHeight: 16,
  },
  moreItemsText: {
    fontSize: 11,
    color: '#FF8C42',
    fontStyle: 'italic',
    marginTop: 2,
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
  statusBadgeUnpaid: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF8C42',
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
