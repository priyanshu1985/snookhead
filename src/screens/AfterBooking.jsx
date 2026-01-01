import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function AfterBooking({ route, navigation }) {
  const {
    table,
    session,
    gameType,
    timeOption = 'Set Time',
    timeDetails,
  } = route.params || {};

  console.log('AfterBooking received params:', {
    table: table?.name,
    session: session?.id,
    gameType,
    timeOption,
    timeDetails,
  });

  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [timerExpired, setTimerExpired] = useState(false);
  const [sessionData, setSessionData] = useState(session);
  const [frameCount, setFrameCount] = useState(
    timeDetails?.selectedFrame ? parseInt(timeDetails.selectedFrame) : 0,
  );
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState([]);
  const [totalBill, setTotalBill] = useState(0);
  const [tableCharges, setTableCharges] = useState(0);
  const [menuCharges, setMenuCharges] = useState(0);
  const [showBillPreview, setShowBillPreview] = useState(false);
  const [isCalculatingBill, setIsCalculatingBill] = useState(false);
  const [billData, setBillData] = useState(null);

  // Initialize countdown timer based on booking_end_time or duration_minutes
  useEffect(() => {
    if (sessionData?.booking_end_time) {
      // Calculate remaining time from booking_end_time
      const endTime = new Date(sessionData.booking_end_time);
      const now = new Date();
      const remainingMs = endTime - now;
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000));
      setRemainingSeconds(remainingSecs);

      // Set total duration for display
      if (sessionData?.duration_minutes) {
        setTotalDurationSeconds(sessionData.duration_minutes * 60);
      } else {
        setTotalDurationSeconds(remainingSecs);
      }
    } else if (sessionData?.duration_minutes) {
      // Fallback: use duration_minutes from start_time
      const durationSecs = sessionData.duration_minutes * 60;
      const startTime = new Date(sessionData.start_time);
      const now = new Date();
      const elapsedSecs = Math.floor((now - startTime) / 1000);
      const remainingSecs = Math.max(0, durationSecs - elapsedSecs);
      setRemainingSeconds(remainingSecs);
      setTotalDurationSeconds(durationSecs);
    }
  }, [sessionData]);

  // Countdown timer - decrements every second
  useEffect(() => {
    if (remainingSeconds <= 0 && totalDurationSeconds > 0 && !timerExpired) {
      // Timer has expired - auto-generate bill
      setTimerExpired(true);
      handleTimerExpired();
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, totalDurationSeconds, timerExpired]);

  // Handle timer expiration - auto generate bill
  const handleTimerExpired = async () => {
    Alert.alert(
      'Time Up!',
      'Your booking time has ended. Generating bill...',
      [
        {
          text: 'Generate Bill',
          onPress: () => handleGenerateBill(),
        },
      ],
      { cancelable: false }
    );
  };

  // Calculate pricing in real-time
  useEffect(() => {
    calculatePricing();
  }, [remainingSeconds, totalDurationSeconds, billItems, table]);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Calculate comprehensive pricing
  const calculatePricing = async () => {
    try {
      // Calculate table charges based on TOTAL booked duration (not remaining time)
      let calculatedTableCharges = 0;
      const bookedDurationMinutes = Math.ceil(totalDurationSeconds / 60);

      if (table && bookedDurationMinutes > 0) {
        let pricePerMin = parseFloat(
          table.pricePerMin || table.price_per_min || 10,
        );
        const frameCharge = parseFloat(table.frameCharge || 0);

        // Debug logging
        console.log('Frontend pricing debug:', {
          bookedDurationMinutes,
          original_pricePerMin: pricePerMin,
          frameCharge,
        });

        // If the price seems too high (>100), assume it's per hour and convert to per minute
        if (pricePerMin > 100) {
          pricePerMin = pricePerMin / 60;
          console.log('Converted hourly rate to per minute:', pricePerMin);
        }

        if (timeOption === 'Select Frame' && frameCount > 0) {
          const pricePerFrame = parseFloat(table.pricePerFrame || 100);
          calculatedTableCharges = frameCount * pricePerFrame + frameCharge;
        } else {
          calculatedTableCharges = bookedDurationMinutes * pricePerMin + frameCharge;
        }

        console.log('Calculated table charges:', calculatedTableCharges);
      }

      // Calculate menu charges
      const calculatedMenuCharges = billItems.reduce((sum, item) => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = item.quantity || 1;
        const itemTotal = itemPrice * itemQuantity;
        console.log(
          `Menu item: ${item.name}, Price: ${itemPrice}, Quantity: ${itemQuantity}, Total: ${itemTotal}`,
        );
        return sum + itemTotal;
      }, 0);

      console.log('Final calculations:', {
        tableCharges: calculatedTableCharges,
        menuCharges: calculatedMenuCharges,
        totalBill: calculatedTableCharges + calculatedMenuCharges,
      });

      setTableCharges(calculatedTableCharges);
      setMenuCharges(calculatedMenuCharges);
      setTotalBill(calculatedTableCharges + calculatedMenuCharges);
    } catch (error) {
      console.error('Error calculating pricing:', error);
    }
  };

  // Fetch menu items from backend
  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      const response = await fetch(`${API_URL}/api/menu`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        const items = Array.isArray(result) ? result : result.data || [];

        // Extract unique categories
        const uniqueCategories = [
          ...new Set(items.map(item => item.category || 'Food')),
        ];
        setCategories(
          uniqueCategories.length > 0
            ? uniqueCategories
            : ['Food', 'Fast Food', 'Beverages'],
        );

        setMenuItems(items);
        console.log('Fetched menu items:', items);
      } else {
        console.error('Failed to fetch menu items:', response.status);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format countdown time display (MM:SS or HH:MM:SS)
  const formatCountdownTime = (totalSeconds) => {
    if (totalSeconds <= 0) return '00:00';

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  // Get timer status text and color
  const getTimerStatus = () => {
    if (remainingSeconds <= 0) {
      return { text: 'Time Expired', color: '#FF4444' };
    } else if (remainingSeconds <= 60) {
      return { text: 'Less than 1 minute!', color: '#FF8C00' };
    } else if (remainingSeconds <= 300) {
      return { text: 'Less than 5 minutes', color: '#FFA500' };
    }
    return { text: 'Session Running', color: '#4CAF50' };
  };

  // Add item to bill
  const handleAddToBill = menuItem => {
    const existingItem = billItems.find(item => item.id === menuItem.id);

    if (existingItem) {
      // Increase quantity if item already exists
      setBillItems(prev =>
        prev.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      // Add new item to bill
      setBillItems(prev => [
        ...prev,
        {
          ...menuItem,
          quantity: 1,
          price: menuItem.price || 0,
        },
      ]);
    }

    Alert.alert('Added to Bill', `${menuItem.name} added to your bill`);
  };

  // Remove item from bill
  const handleRemoveFromBill = itemId => {
    setBillItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        // Decrease quantity
        return prev.map(item =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        );
      } else {
        // Remove item completely
        return prev.filter(item => item.id !== itemId);
      }
    });
  };

  // Get filtered menu items by category
  const getFilteredMenuItems = () => {
    return menuItems.filter(
      item => (item.category || 'Food') === selectedCategory,
    );
  };

  const handleUpdate = () => {
    // Navigate to update/modify session screen
    Alert.alert('Update', 'Update session functionality');
  };

  // Show bill preview before final generation
  const handleShowBillPreview = () => {
    if (totalBill <= 0) {
      Alert.alert(
        'No Charges',
        'No table time or menu items selected. Please play for some time or add menu items to generate a bill.',
      );
      return;
    }
    setShowBillPreview(true);
  };

  // Generate final bill and store in database
  const handleGenerateBill = async () => {
    try {
      setIsCalculatingBill(true);

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Authentication required. Please login again.');
        return;
      }

      // Prepare session_id - ensure it's a valid integer or null
      // Use active_id if available (from ActiveTable model), otherwise fall back to id
      let validSessionId = null;
      const rawSessionId = sessionData?.active_id || sessionData?.id;
      if (rawSessionId) {
        console.log(
          'Original session ID:',
          rawSessionId,
          'Type:',
          typeof rawSessionId,
        );
        const sessionIdInt = parseInt(rawSessionId);
        if (!isNaN(sessionIdInt) && sessionIdInt > 0) {
          validSessionId = sessionIdInt;
          console.log('Valid session ID:', validSessionId);
        } else {
          console.log('Invalid session ID, setting to null');
        }
      }

      // Prepare bill data
      const billRequest = {
        customer_name: route.params?.customerName || sessionData?.customer_name || 'Walk-in Customer',
        customer_phone: route.params?.customerPhone || sessionData?.customer_phone || '+91 XXXXXXXXXX',
        table_id: table?.id ? parseInt(table.id) : null,
        session_id: validSessionId,
        selected_menu_items: billItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity || 1,
        })),
        session_duration: Math.ceil(totalDurationSeconds / 60),
        booking_time: sessionData?.start_time,
        table_price_per_min: parseFloat(
          table?.pricePerMin || table?.price_per_min || 10,
        ),
        frame_charges: timeOption === 'Select Frame' ? frameCount * parseFloat(table?.pricePerFrame || table?.price_per_frame || 100) : 0,
      };

      console.log('Creating bill with data:', billRequest);

      const response = await fetch(`${API_URL}/api/bills/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(billRequest),
      });

      const result = await response.json();

      if (response.ok) {
        // End the session
        try {
          await fetch(`${API_URL}/api/activeTables/stop`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ active_id: validSessionId }),
          });
        } catch (sessionError) {
          console.warn('Failed to end session:', sessionError);
        }

        Alert.alert(
          'Bill Generated Successfully!',
          `Bill Number: ${result.bill.bill_number}\nTotal Amount: ₹${result.bill.total_amount}\n\nTable Charges: ₹${result.bill.table_charges}\nMenu Charges: ₹${result.bill.menu_charges}`,
          [
            {
              text: 'View in Bills',
              onPress: () =>
                navigation.navigate('MainTabs', { screen: 'Bill' }),
            },
            {
              text: 'Go Home',
              onPress: () =>
                navigation.navigate('MainTabs', { screen: 'Home' }),
            },
          ],
        );
      } else {
        throw new Error(result.error || 'Failed to create bill');
      }
    } catch (error) {
      console.error('Bill generation error:', error);
      Alert.alert(
        'Bill Generation Failed',
        error.message || 'Failed to generate bill. Please try again.',
      );
    } finally {
      setIsCalculatingBill(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameType || 'Snooker'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Table Badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{table?.name || 'Table'}</Text>
        </View>

        {/* Countdown Timer Display */}
        <View style={[styles.timerContainer, remainingSeconds <= 60 && remainingSeconds > 0 && styles.timerContainerWarning]}>
          <Text style={styles.timerLabel}>Time Remaining</Text>
          <Text style={[
            styles.timerValue,
            remainingSeconds <= 60 && styles.timerValueWarning,
            remainingSeconds <= 0 && styles.timerValueExpired
          ]}>
            {formatCountdownTime(remainingSeconds)}
          </Text>
          <View style={styles.timerStatus}>
            <Icon
              name={remainingSeconds <= 0 ? "alert-circle" : "radio-button-on"}
              size={12}
              color={getTimerStatus().color}
            />
            <Text style={[styles.timerStatusText, { color: getTimerStatus().color }]}>
              {getTimerStatus().text}
            </Text>
          </View>
          {totalDurationSeconds > 0 && (
            <Text style={styles.timerDurationInfo}>
              Booked: {Math.ceil(totalDurationSeconds / 60)} minutes
            </Text>
          )}
        </View>

        {/* Time Selection Options */}
        <View style={styles.timeOptionsContainer}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Set Time' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="time-outline"
              size={24}
              color={timeOption === 'Set Time' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Set Time' && styles.timeOptionTextActive,
              ]}
            >
              Set Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="timer-outline"
              size={24}
              color={timeOption === 'Select Frame' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Select Frame' && styles.timeOptionTextActive,
              ]}
            >
              Select Frame
            </Text>
          </TouchableOpacity>
        </View>

        {/* Frame Counter - Only show if Select Frame is active */}
        {timeOption === 'Select Frame' && (
          <View style={styles.frameContainer}>
            <Text style={styles.frameLabel}>Frame Count</Text>
            <View style={styles.frameCounterContainer}>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(Math.max(0, frameCount - 1))}
              >
                <Icon name="remove" size={20} color="#FF8C42" />
              </TouchableOpacity>
              <Text style={styles.frameCountText}>{frameCount} frames</Text>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(frameCount + 1)}
              >
                <Icon name="add" size={20} color="#FF8C42" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {categories.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.categoryButton,
                  selectedCategory === category && styles.categoryButtonActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Food Items */}
        <View style={styles.foodItemsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Loading menu items...</Text>
            </View>
          ) : getFilteredMenuItems().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="restaurant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                No items found in {selectedCategory}
              </Text>
              <Text style={styles.emptySubText}>
                Try selecting a different category
              </Text>
            </View>
          ) : (
            getFilteredMenuItems().map((item, index) => {
              const billItem = billItems.find(bi => bi.id === item.id);
              return (
                <View key={item.id || index} style={styles.foodItem}>
                  <View style={styles.foodIcon}>
                    <Text style={styles.foodEmoji}>
                      {item.category === 'Beverages'
                        ? '🥤'
                        : item.category === 'Fast Food'
                        ? '🍔'
                        : '🍽️'}
                    </Text>
                  </View>
                  <View style={styles.foodDetails}>
                    <Text style={styles.foodName}>{item.name}</Text>
                    <View style={styles.quantityContainer}>
                      {billItem ? (
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleRemoveFromBill(item.id)}
                          >
                            <Icon name="remove" size={16} color="#FF8C42" />
                          </TouchableOpacity>
                          <Text style={styles.quantityText}>
                            {billItem.quantity}
                          </Text>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => handleAddToBill(item)}
                          >
                            <Icon name="add" size={16} color="#FF8C42" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.addButton}
                          onPress={() => handleAddToBill(item)}
                        >
                          <Text style={styles.addButtonText}>ADD</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={styles.foodItemPrice}>₹{item.price || 0}</Text>
                </View>
              );
            })
          )}
        </View>

        {/* Comprehensive Bill Summary */}
        {(totalDurationSeconds > 0 || billItems.length > 0) && (
          <View style={styles.billSummaryContainer}>
            <Text style={styles.billSummaryTitle}>Current Bill Preview</Text>

            {/* Table Charges */}
            {totalDurationSeconds > 0 && (
              <View style={styles.billSection}>
                <Text style={styles.billSectionTitle}>Table Charges</Text>
                <View style={styles.billItem}>
                  <Text style={styles.billItemName}>
                    {gameType || 'Gaming'} - {table?.name} ({Math.ceil(totalDurationSeconds / 60)} min)
                  </Text>
                  <Text style={styles.billItemPrice}>
                    ₹{tableCharges.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Menu Charges */}
            {billItems.length > 0 && (
              <View style={styles.billSection}>
                <Text style={styles.billSectionTitle}>Menu Items</Text>
                {billItems.map((item, index) => (
                  <View key={item.id || index} style={styles.billItem}>
                    <Text style={styles.billItemName}>
                      {item.name} x{item.quantity}
                    </Text>
                    <Text style={styles.billItemPrice}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
                <View style={styles.billSubtotal}>
                  <Text style={styles.billSubtotalText}>
                    Menu Subtotal: ₹{menuCharges.toFixed(2)}
                  </Text>
                </View>
              </View>
            )}

            {/* Total */}
            <View style={styles.billTotal}>
              <Text style={styles.billTotalText}>
                Total Amount: ₹{totalBill.toFixed(2)}
              </Text>
            </View>

            {/* Preview Button */}
            {totalBill > 0 && (
              <TouchableOpacity
                style={styles.previewButton}
                onPress={handleShowBillPreview}
              >
                <Text style={styles.previewButtonText}>Preview Final Bill</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.endSessionButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <Text style={styles.endSessionButtonText}>End Session</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.generateBillButton,
              (totalBill <= 0 || isCalculatingBill) &&
                styles.generateBillButtonDisabled,
            ]}
            onPress={totalBill > 0 ? handleGenerateBill : handleShowBillPreview}
            disabled={isCalculatingBill}
          >
            <Text style={styles.generateBillButtonText}>
              {isCalculatingBill ? 'Creating Bill...' : 'Generate & Pay Bill'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bill Preview Modal */}
      <Modal
        visible={showBillPreview}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBillPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.billPreviewModal}>
            <View style={styles.billPreviewHeader}>
              <Text style={styles.billPreviewTitle}>Final Bill Preview</Text>
              <TouchableOpacity onPress={() => setShowBillPreview(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.billPreviewContent}>
              <View style={styles.billPreviewSection}>
                <Text style={styles.billPreviewCustomer}>
                  Customer: Walk-in Customer
                </Text>
                <Text style={styles.billPreviewTable}>
                  Table: {table?.name}
                </Text>
                <Text style={styles.billPreviewTime}>
                  Booked Duration: {Math.ceil(totalDurationSeconds / 60)} minutes
                </Text>
                <Text style={styles.billPreviewTime}>
                  Time Remaining: {formatCountdownTime(remainingSeconds)}
                </Text>
              </View>

              {tableCharges > 0 && (
                <View style={styles.billPreviewSection}>
                  <Text style={styles.billPreviewSectionTitle}>
                    Table Charges
                  </Text>
                  <View style={styles.billPreviewItem}>
                    <Text style={styles.billPreviewItemName}>
                      {gameType} Session ({Math.ceil(totalDurationSeconds / 60)} min)
                    </Text>
                    <Text style={styles.billPreviewItemPrice}>
                      ₹{tableCharges.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {billItems.length > 0 && (
                <View style={styles.billPreviewSection}>
                  <Text style={styles.billPreviewSectionTitle}>Menu Items</Text>
                  {billItems.map((item, index) => (
                    <View key={index} style={styles.billPreviewItem}>
                      <Text style={styles.billPreviewItemName}>
                        {item.name} × {item.quantity}
                      </Text>
                      <Text style={styles.billPreviewItemPrice}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.billPreviewTotal}>
                <Text style={styles.billPreviewTotalText}>
                  Total Amount: ₹{totalBill.toFixed(2)}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.billPreviewActions}>
              <TouchableOpacity
                style={styles.billPreviewCancelButton}
                onPress={() => setShowBillPreview(false)}
              >
                <Text style={styles.billPreviewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.billPreviewConfirmButton}
                onPress={handleGenerateBill}
                disabled={isCalculatingBill}
              >
                <Text style={styles.billPreviewConfirmText}>
                  {isCalculatingBill
                    ? 'Creating...'
                    : 'Confirm & Generate Bill'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main Container
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header - Professional Look
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
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

  // Content Area
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  // Table Badge - Prominent
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tableName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Timer Container - Focus Element
  timerContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  timerContainerWarning: {
    backgroundColor: '#FFF8E1',
    borderWidth: 2,
    borderColor: '#FFA500',
  },
  timerLabel: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timerValue: {
    fontSize: 56,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    letterSpacing: 2,
  },
  timerValueWarning: {
    color: '#FFA500',
  },
  timerValueExpired: {
    color: '#FF4444',
  },
  timerDurationInfo: {
    fontSize: 13,
    color: '#999999',
    marginTop: 10,
    fontWeight: '500',
  },
  timerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  timerStatusText: {
    fontSize: 13,
    marginLeft: 6,
    fontWeight: '600',
  },

  // Time Options Card
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  timeOption: {
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    minWidth: 90,
  },
  timeOptionActive: {
    backgroundColor: '#FF8C42',
  },
  timeOptionText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 6,
    fontWeight: '600',
  },
  timeOptionTextActive: {
    color: '#FFFFFF',
  },

  // Frame Counter
  frameContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  frameLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    fontWeight: '600',
  },
  frameCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  frameButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  frameCountText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 100,
    textAlign: 'center',
  },

  // Categories - Pill Style
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F0F0F0',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  categoryText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Food Items List
  foodItemsContainer: {
    marginBottom: 24,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  // Food Item Styling
  foodIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  foodEmoji: {
    fontSize: 26,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  foodPrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '700',
  },
  foodItemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  // Action Buttons Container
  buttonsContainer: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 8,
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
  generateBillButton: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  generateBillButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Loading & Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 14,
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#333333',
    marginTop: 14,
    fontWeight: '600',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888888',
    marginTop: 6,
  },

  // Quantity Controls
  quantityContainer: {
    marginTop: 6,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 4,
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  quantityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    minWidth: 32,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Bill Summary Card
  billSummaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  billSummaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  billItemName: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  billItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  billTotal: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  billTotalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF8C42',
    textAlign: 'center',
  },
  billSection: {
    marginBottom: 16,
  },
  billSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888888',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billSubtotal: {
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    paddingTop: 10,
    marginTop: 10,
  },
  billSubtotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'right',
  },
  previewButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Session Action Buttons
  endSessionButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
    marginRight: 8,
  },
  endSessionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
  generateBillButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  billPreviewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '85%',
    width: '100%',
    maxWidth: 420,
  },
  billPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  billPreviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  billPreviewContent: {
    padding: 20,
    maxHeight: 400,
  },
  billPreviewSection: {
    marginBottom: 20,
  },
  billPreviewCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  billPreviewTable: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  billPreviewTime: {
    fontSize: 14,
    color: '#666',
  },
  billPreviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 4,
  },
  billPreviewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  billPreviewItemName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  billPreviewItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  billPreviewTotal: {
    borderTopWidth: 2,
    borderTopColor: '#FF8C42',
    paddingTop: 16,
    marginTop: 16,
  },
  billPreviewTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
    textAlign: 'center',
  },
  billPreviewActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  billPreviewCancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCC',
    marginRight: 8,
  },
  billPreviewCancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  billPreviewConfirmButton: {
    flex: 2,
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  billPreviewConfirmText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
