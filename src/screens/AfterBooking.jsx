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

  // Fetch menu items on component mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Update total bill when bill items change
  useEffect(() => {
    const total = billItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    setTotalBill(total);
  }, [billItems]);

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

  const handleGenerateBill = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      Alert.alert(
        'Generate Bill',
        'Are you sure you want to end this session and generate bill?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate Bill',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/activeTables/stop`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ active_id: sessionData.id }),
                  },
                );

                const result = await response.json();

                if (response.ok) {
                  Alert.alert('Success', 'Bill generated successfully!', [
                    {
                      text: 'OK',
                      onPress: () =>
                        navigation.navigate('MainTabs', { screen: 'Home' }),
                    },
                  ]);
                } else {
                  throw new Error(result.error || 'Failed to generate bill');
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to generate bill. Please try again.',
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
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

        {/* Bill Summary */}
        {billItems.length > 0 && (
          <View style={styles.billSummaryContainer}>
            <Text style={styles.billSummaryTitle}>Bill Summary</Text>
            {billItems.map((item, index) => (
              <View key={item.id || index} style={styles.billItem}>
                <Text style={styles.billItemName}>
                  {item.name} x{item.quantity}
                </Text>
                <Text style={styles.billItemPrice}>
                  ₹{item.price * item.quantity}
                </Text>
              </View>
            ))}
            <View style={styles.billTotal}>
              <Text style={styles.billTotalText}>Food Total: ₹{totalBill}</Text>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.generateBillButton}
            onPress={handleGenerateBill}
          >
            <Text style={styles.generateBillButtonText}>Generate Bill</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
    textAlign: 'right',
  },
});
