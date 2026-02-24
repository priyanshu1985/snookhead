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
  Animated,
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

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export default function ActiveBillsList({
  onShowHistory,
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

  // Animation values
  const blinkAnim = React.useRef(new Animated.Value(0)).current;
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (route?.params?.highlightedBillId) {
      setHighlightedId(String(route.params.highlightedBillId));
      Animated.loop(
        Animated.sequence([
          Animated.timing(blinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: false,
          }),
          Animated.timing(blinkAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
        { iterations: 5 } // 5 times * 1s loop = 5 seconds
      ).start(() => {
        setHighlightedId(null);
      });
    }
  }, [route?.params?.highlightedBillId]);

  const blinkBackgroundColor = blinkAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFFFFF', '#FFDDC1'], // White to light orange
  });

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

  // Filter bills based on search text and date range
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

  const handleRefresh = () => {
    fetchActiveBills(true);
  };

  const renderBillCard = ({ item }) => {
    const isHighlighted = item.id === highlightedId || item.billNumber === highlightedId;
    return (
      <AnimatedTouchableOpacity
        style={[
          styles.billCard,
          isHighlighted && { backgroundColor: blinkBackgroundColor },
        ]}
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
    </AnimatedTouchableOpacity>
  );
};

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
          onPress={() => setShowDateRangeModal(true)}
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
            {filterByDate
              ? dateFilterMode === 'single'
                ? formatDate(selectedDate)
                : `${formatDate(startDate).slice(0, 5)} - ${formatDate(
                    endDate,
                  ).slice(0, 5)}`
              : formatDate(new Date())}
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
            {filterByDate &&
              dateFilterMode === 'single' &&
              ` for ${formatDate(selectedDate)}`}
            {filterByDate &&
              dateFilterMode === 'range' &&
              ` from ${formatDate(startDate)} to ${formatDate(endDate)}`}
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
    minHeight: 45, // Reduced from 50
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
    marginTop: 3, // Move title down 3px for better visual centering
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
  statusUnpaid: {
    backgroundColor: '#FF8C42',
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
  contentSection: {
    minHeight: 60, // Ensure consistent height for all cards
    justifyContent: 'flex-start',
  },
  orderItemsContainer: {
    marginTop: 8,
    backgroundColor: '#FAFBFC',
    borderRadius: 6,
    padding: 8,
  },
  orderItemsLabel: {
    fontSize: 10,
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
  tableChargesContainer: {
    marginTop: 8,
    backgroundColor: '#FAFBFC',
    borderRadius: 6,
    padding: 8,
    minHeight: 36, // Match the order items container height
  },
  tableChargesText: {
    fontSize: 12,
    color: '#444444',
    lineHeight: 16,
  },

  billLabel: {
    fontSize: 9,
    color: '#BBBBBB',
    marginBottom: 2,
    fontWeight: '400',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billNumber: {
    fontSize: 11,
    fontWeight: '500',
    color: '#BBBBBB',
    marginBottom: 8,
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
  statusBadgeUnpaid: {
    backgroundColor: '#FFF3E0',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9800',
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
