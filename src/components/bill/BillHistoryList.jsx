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
import { API_URL } from '../../../config';

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
  route,
}) {
  const [searchText, setSearchText] = useState('');
  const [allBills, setAllBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [filterByDate, setFilterByDate] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Date range states
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectingDateType, setSelectingDateType] = useState('start'); // 'start' or 'end'
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [dateFilterMode, setDateFilterMode] = useState('single'); // 'single' or 'range'

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

      console.log('Total bills fetched:', billsData.length);
      console.log('Bills by status:', {
        paid: billsData.filter(b => b.status === 'paid').length,
        pending: billsData.filter(b => b.status === 'pending').length,
      });

      // Filter paid bills (bill history)
      const paidBills = billsData
        .filter(bill => bill.status === 'paid')
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
            itemsSummary = 'Items purchased';
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
              'Unknown Customer',
            items: itemsSummary,
            mobile:
              bill.customer_phone ||
              bill.mobile ||
              bill.user?.phone ||
              bill.User?.phone ||
              '---',
            billNumber:
              bill.bill_number || bill.billNumber || `BILL-${bill.id}`,
            amount: parseFloat(
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            ),
            amountDisplay: `₹${parseFloat(
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            ).toFixed(2)}/-`,
            status: 'Paid',
            summary: itemsSummary,
            detailedItems: orderItems,
            walletAmount: `₹${bill.wallet_amount || bill.walletAmount || 0}.00`,
            totalAmount: `₹${parseFloat(
              bill.total_amount || bill.totalAmount || bill.amount || 0,
            ).toFixed(2)} /-`,
            originalBill: bill, // Keep original data for detailed view
          };
        })
        .sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));

      setAllBills(paidBills);
      console.log('Paid bills (history):', paidBills.length);
      if (paidBills.length > 0) {
        console.log('Latest paid bill:', {
          id: paidBills[0].id,
          billNumber: paidBills[0].billNumber,
          date: paidBills[0].date,
          customer: paidBills[0].customerName,
        });
      }
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

  // Watch for forceRefresh parameter from navigation
  useEffect(() => {
    if (route?.params?.forceRefresh) {
      console.log('Force refresh triggered:', route.params.forceRefresh);
      fetchBillHistory(true);
    }
  }, [route?.params?.forceRefresh]);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('BillHistoryList focused - refreshing data');
      fetchBillHistory();
    }, []),
  );

  // Filter bills based on search text and date
  const filteredBills = allBills.filter(bill => {
    // Date filter
    if (filterByDate) {
      const billDate = new Date(bill.rawDate);
      billDate.setHours(0, 0, 0, 0);

      if (dateFilterMode === 'single') {
        // Single date mode - exact match
        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        if (billDate.getTime() !== selected.getTime()) {
          return false;
        }
      } else {
        // Date range mode
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        if (billDate < start || billDate > end) {
          return false;
        }
      }
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

  // Handle date change for date picker
  const handleDateChange = (event, date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      if (dateFilterMode === 'single') {
        setSelectedDate(date);
      } else {
        if (selectingDateType === 'start') {
          setStartDate(date);
        } else {
          setEndDate(date);
        }
      }
    }
  };

  // Apply date filter
  const applyDateFilter = () => {
    if (dateFilterMode === 'range') {
      // Ensure start date is before or equal to end date
      if (startDate > endDate) {
        Alert.alert(
          'Invalid Date Range',
          'Start date must be before or equal to end date.',
        );
        return;
      }
    }
    setFilterByDate(true);
    setShowDateRangeModal(false);
  };

  // Clear date filter
  const clearDateFilter = () => {
    setFilterByDate(false);
    setSelectedDate(new Date());
    setStartDate(new Date());
    setEndDate(new Date());
    setShowDateRangeModal(false);
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
        {/* Row 1: Customer Name and Amount */}
        <View style={styles.row}>
          <Text style={styles.customerName} numberOfLines={1}>
            {item.customerName}
          </Text>
          <Text style={styles.amount}>{item.amountDisplay}</Text>
        </View>

        {/* Row 2: Mobile and Status */}
        <View style={styles.row}>
          <Text style={styles.mobile}>{item.mobile}</Text>
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
    <View style={styles.container}>
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
        </View>

        <TouchableOpacity
          style={[
            styles.dateSelector,
            filterByDate && styles.dateSelectorActive,
          ]}
          onPress={() => setShowDateRangeModal(true)}
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
              ? dateFilterMode === 'single'
                ? formatDate(selectedDate)
                : `${formatDate(startDate).slice(0, 5)} - ${formatDate(
                    endDate,
                  ).slice(0, 5)}`
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
              dateFilterMode === 'single' &&
              `Showing bills from ${formatDate(selectedDate)}`}
            {filterByDate &&
              dateFilterMode === 'range' &&
              `Showing bills from ${formatDate(startDate)} to ${formatDate(
                endDate,
              )}`}
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
          value={
            dateFilterMode === 'single'
              ? selectedDate
              : selectingDateType === 'start'
              ? startDate
              : endDate
          }
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* Date Range Selection Modal */}
      <Modal
        visible={showDateRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDateRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dateRangeModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Date</Text>
              <TouchableOpacity
                onPress={() => setShowDateRangeModal(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Mode Selector */}
            <View style={styles.modeSelectorContainer}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  dateFilterMode === 'single' && styles.modeButtonActive,
                ]}
                onPress={() => setDateFilterMode('single')}
                activeOpacity={0.7}
              >
                <Icon
                  name="calendar-outline"
                  size={18}
                  color={dateFilterMode === 'single' ? '#FFFFFF' : '#666666'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    dateFilterMode === 'single' && styles.modeButtonTextActive,
                  ]}
                >
                  Single Date
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,
                  dateFilterMode === 'range' && styles.modeButtonActive,
                ]}
                onPress={() => setDateFilterMode('range')}
                activeOpacity={0.7}
              >
                <Icon
                  name="calendar"
                  size={18}
                  color={dateFilterMode === 'range' ? '#FFFFFF' : '#666666'}
                />
                <Text
                  style={[
                    styles.modeButtonText,
                    dateFilterMode === 'range' && styles.modeButtonTextActive,
                  ]}
                >
                  Date Range
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputsContainer}>
              {dateFilterMode === 'single' ? (
                // Single Date Mode
                <View style={styles.dateInputWrapper}>
                  <Text style={styles.dateLabel}>Select Date</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Icon name="calendar" size={20} color="#FF8C42" />
                    <Text style={styles.dateInputText}>
                      {formatDate(selectedDate)}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Date Range Mode
                <>
                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.dateLabel}>From Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => {
                        setSelectingDateType('start');
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon name="calendar" size={20} color="#FF8C42" />
                      <Text style={styles.dateInputText}>
                        {formatDate(startDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dateInputWrapper}>
                    <Text style={styles.dateLabel}>To Date</Text>
                    <TouchableOpacity
                      style={styles.dateInput}
                      onPress={() => {
                        setSelectingDateType('end');
                        setShowDatePicker(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Icon name="calendar" size={20} color="#FF8C42" />
                      <Text style={styles.dateInputText}>
                        {formatDate(endDate)}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowDateRangeModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalApplyButton}
                onPress={applyDateFilter}
                activeOpacity={0.7}
              >
                <Text style={styles.modalApplyText}>Apply Filter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    paddingVertical: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 45,
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
    marginTop: 3,
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
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 1,
  },
  activeTab: {
    backgroundColor: '#FF8C42',
  },
  activeTabIndicator: {
    // Remove the underline indicator
    display: 'none',
  },
  tabText: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    fontSize: 12,
    color: '#FFFFFF',
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 13,
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
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  date: {
    fontSize: 11,
    color: '#999999',
    marginBottom: 8,
    fontWeight: '500',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 22,
    flex: 1,
    marginRight: 12,
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
    flex: 1,
    marginRight: 12,
  },
  billNumber: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BBBBBB',
    marginBottom: 2,
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

  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
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

  // Date Range Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  dateRangeModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  modeButtonActive: {
    backgroundColor: '#FF8C42',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  dateInputsContainer: {
    marginBottom: 20,
  },
  dateInputWrapper: {
    marginBottom: 16,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  dateInputText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666666',
  },
  modalApplyButton: {
    flex: 1,
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalApplyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
