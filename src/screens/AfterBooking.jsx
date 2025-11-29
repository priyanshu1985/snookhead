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

  const [timeSpent, setTimeSpent] = useState(0);
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

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionData?.start_time) {
        const startTime = new Date(sessionData.start_time);
        const now = new Date();
        const diffMinutes = Math.floor((now - startTime) / (1000 * 60));
        setTimeSpent(diffMinutes);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData]);

  // Calculate pricing in real-time
  useEffect(() => {
    calculatePricing();
  }, [timeSpent, billItems, table]);

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Calculate comprehensive pricing
  const calculatePricing = async () => {
    try {
      // Calculate table charges
      let calculatedTableCharges = 0;
      if (table && timeSpent > 0) {
        let pricePerMin = parseFloat(
          table.pricePerMin || table.price_per_min || 10,
        );
        const frameCharge = parseFloat(table.frameCharge || 0);

        // Debug logging
        console.log('Frontend pricing debug:', {
          timeSpent,
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
          calculatedTableCharges = timeSpent * pricePerMin + frameCharge;
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

  // Format time display
  const formatTime = minutes => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const seconds =
      Math.floor(
        (Date.now() - new Date(sessionData?.start_time || Date.now())) / 1000,
      ) % 60;

    if (hours > 0) {
      return `${hours}.${mins.toString().padStart(2, '0')}.${seconds
        .toString()
        .padStart(2, '0')} min`;
    }
    return `${mins}.${seconds.toString().padStart(2, '0')} min`;
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
      let validSessionId = null;
      if (sessionData?.id) {
        console.log(
          'Original session ID:',
          sessionData.id,
          'Type:',
          typeof sessionData.id,
        );
        const sessionIdInt = parseInt(sessionData.id);
        if (!isNaN(sessionIdInt) && sessionIdInt > 0) {
          validSessionId = sessionIdInt;
          console.log('Valid session ID:', validSessionId);
        } else {
          console.log('Invalid session ID, setting to null');
        }
      }

      // Prepare bill data
      const billRequest = {
        customer_name: 'Walk-in Customer',
        customer_phone: '+91 XXXXXXXXXX',
        table_id: table?.id ? parseInt(table.id) : null,
        session_id: validSessionId,
        selected_menu_items: billItems.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity || 1,
        })),
        session_duration: Math.round(timeSpent),
        booking_time: sessionData?.start_time,
        table_price_per_min: parseFloat(
          table?.pricePerMin || table?.price_per_min || 10,
        ),
        frame_charges: timeOption === 'Select Frame' ? frameCount * 100 : 0,
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

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Total Time Span</Text>
          <Text style={styles.timerValue}>{formatTime(timeSpent)}</Text>
          <View style={styles.timerStatus}>
            <Icon name="radio-button-on" size={12} color="#FF4444" />
            <Text style={styles.timerStatusText}>Session Running</Text>
          </View>
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
        {(timeSpent > 0 || billItems.length > 0) && (
          <View style={styles.billSummaryContainer}>
            <Text style={styles.billSummaryTitle}>Current Bill Preview</Text>

            {/* Table Charges */}
            {timeSpent > 0 && (
              <View style={styles.billSection}>
                <Text style={styles.billSectionTitle}>Table Charges</Text>
                <View style={styles.billItem}>
                  <Text style={styles.billItemName}>
                    {gameType || 'Gaming'} - {table?.name} ({timeSpent} min)
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
                  Duration: {timeSpent} minutes
                </Text>
              </View>

              {tableCharges > 0 && (
                <View style={styles.billPreviewSection}>
                  <Text style={styles.billPreviewSectionTitle}>
                    Table Charges
                  </Text>
                  <View style={styles.billPreviewItem}>
                    <Text style={styles.billPreviewItemName}>
                      {gameType} Session ({timeSpent} min)
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  timerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  timerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerStatusText: {
    fontSize: 12,
    color: '#FF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timeOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  timeOptionActive: {
    backgroundColor: '#FF8C42',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  timeOptionTextActive: {
    color: '#fff',
  },
  frameContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  frameLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  frameCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  frameButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  frameCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: '#FF8C42',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  foodItemsContainer: {
    marginBottom: 30,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  foodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  foodEmoji: {
    fontSize: 24,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  foodPrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  foodItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  generateBillButton: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBillButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#333',
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  quantityContainer: {
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  billSummaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  billSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  billItemName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  billItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  billTotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
  },
  billTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
    textAlign: 'center',
  },
  billSection: {
    marginBottom: 12,
  },
  billSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  billSubtotal: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 8,
    marginTop: 8,
  },
  billSubtotalText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'right',
  },
  previewButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  endSessionButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF8C42',
    marginRight: 6,
  },
  endSessionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  generateBillButtonDisabled: {
    backgroundColor: '#CCC',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  billPreviewModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 400,
  },
  billPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  billPreviewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
