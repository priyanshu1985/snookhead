import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Move OUTSIDE component
const getNextDates = () => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    dates.push({
      id: i,
      label:
        i === 0 ? 'Today' : `${date.getDate()} ${monthNames[date.getMonth()]}`,
    });
  }
  return dates;
};

export default function TableBookingScreen({ route, navigation }) {
  // ===== ALL HOOKS AT THE TOP - MUST BE FIRST =====
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTimeOption, setSelectedTimeOption] = useState('Set Time');
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [foodInstructions, setFoodInstructions] = useState('');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('12:00 PM');
  const [timerDuration, setTimerDuration] = useState('60');
  const [selectedFrame, setSelectedFrame] = useState('1');
  const [isBooking, setIsBooking] = useState(false);
  const [showPricingPreview, setShowPricingPreview] = useState(false);
  const [estimatedCost, setEstimatedCost] = useState({
    tableCharges: 0,
    menuCharges: 0,
    totalAmount: 0,
  });

  // Menu items state (similar to AfterBooking)
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [loading, setLoading] = useState(false);
  const [billItems, setBillItems] = useState([]);

  // ===== DATA AND CONSTANTS AFTER HOOKS =====
  const { table, gameType, color, selectedFoodItems } = route.params || {};
  const dates = getNextDates();

  // Add safety checks for undefined parameters
  const safeTable = table || { name: 'Unknown Table', id: 'unknown' };
  const safeGameType = gameType || 'Game';

  // Update billItems when coming back from TableBookingOrders (backwards compatibility)
  useEffect(() => {
    if (selectedFoodItems && selectedFoodItems.length > 0) {
      const converted = selectedFoodItems.map(item => ({
        id: item.item?.id || item.id,
        name: item.item?.name || item.name,
        price: item.item?.price || item.price || 0,
        quantity: item.qty || item.quantity || 1,
        category: item.item?.category || item.category || 'Food',
      }));
      setBillItems(converted);
    }
  }, [selectedFoodItems]);

  // Fetch menu items on mount
  useEffect(() => {
    fetchMenuItems();
  }, []);

  // Recalculate cost when billItems or time options change
  useEffect(() => {
    calculateEstimatedCost();
  }, [billItems, selectedTimeOption, timerDuration, selectedFrame]);

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
        if (uniqueCategories.length > 0) {
          setSelectedCategory(uniqueCategories[0]);
        }

        setMenuItems(items);
      } else {
        console.error('Failed to fetch menu items:', response.status);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
    }
  };

  // ===== HANDLERS =====
  const handleAddInstructions = () => {
    if (billItems.length === 0) {
      Alert.alert('Info', 'Please select at least one food item first');
      return;
    }
    setShowInstructionModal(true);
  };

  const handleSaveInstructions = () => {
    setShowInstructionModal(false);
  };

  const handleTimeOptionSelect = option => {
    setSelectedTimeOption(option);
    if (
      option === 'Set Time' ||
      option === 'Timer' ||
      option === 'Select Frame'
    ) {
      setShowTimeModal(true);
    }
  };

  const handleTimeConfirm = () => {
    setShowTimeModal(false);
    calculateEstimatedCost();
  };

  // Add item to bill
  const handleAddToBill = menuItem => {
    const existingItem = billItems.find(item => item.id === menuItem.id);

    if (existingItem) {
      setBillItems(prev =>
        prev.map(item =>
          item.id === menuItem.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setBillItems(prev => [
        ...prev,
        {
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price || 0,
          quantity: 1,
          category: menuItem.category || 'Food',
        },
      ]);
    }
  };

  // Remove item from bill
  const handleRemoveFromBill = itemId => {
    setBillItems(prev => {
      const existingItem = prev.find(item => item.id === itemId);
      if (existingItem && existingItem.quantity > 1) {
        return prev.map(item =>
          item.id === itemId ? { ...item, quantity: item.quantity - 1 } : item,
        );
      } else {
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

  // Helper to get full menu image URL
  const getMenuImageUrl = (imageKey) => {
    if (!imageKey) return null;
    return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
  };

  // Calculate estimated cost based on selected options
  const calculateEstimatedCost = () => {
    let tableCharges = 0;
    let menuCharges = 0;

    // Calculate table charges based on selected time option
    if (safeTable) {
      const pricePerMin = parseFloat(
        safeTable.pricePerMin || safeTable.price_per_min || 10,
      );
      const frameCharge = parseFloat(safeTable.frameCharge || 0);

      if (selectedTimeOption === 'Timer') {
        const duration = parseInt(timerDuration || 60);
        tableCharges = duration * pricePerMin + frameCharge;
      } else if (selectedTimeOption === 'Select Frame') {
        const frames = parseInt(selectedFrame || 1);
        const pricePerFrame = parseFloat(safeTable.pricePerFrame || 100);
        tableCharges = frames * pricePerFrame + frameCharge;
      } else {
        // Set Time - estimate 60 minutes
        tableCharges = 60 * pricePerMin + frameCharge;
      }
    }

    // Calculate menu charges from billItems
    menuCharges = billItems.reduce((total, item) => {
      return total + (item.quantity || 1) * (item.price || 0);
    }, 0);

    const totalAmount = tableCharges + menuCharges;

    setEstimatedCost({
      tableCharges,
      menuCharges,
      totalAmount,
    });
  };

  // Show pricing preview before booking
  const handleShowPricingPreview = () => {
    calculateEstimatedCost();
    setShowPricingPreview(true);
  };

  const getTimeDisplayText = () => {
    switch (selectedTimeOption) {
      case 'Set Time':
        return `Start Time: ${selectedTime}`;
      case 'Timer':
        return `Duration: ${timerDuration} min`;
      case 'Select Frame':
        return `Frames: ${selectedFrame}`;
      default:
        return selectedTimeOption;
    }
  };

  const handleBook = async () => {
    try {
      setIsBooking(true);

      // Validation
      if (!safeTable.id) {
        Alert.alert('Error', 'Invalid table selected');
        return;
      }

      // Check if table appears to be occupied in frontend
      if (safeTable.status === 'occupied' || safeTable.status === 'reserved') {
        Alert.alert(
          'Table Not Available',
          'This table appears to be occupied. Please refresh and try again.',
          [
            { text: 'OK' },
            {
              text: 'Go Back',
              onPress: () => navigation.goBack(),
            },
          ],
        );
        return;
      }

      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      // Calculate duration in minutes based on selected time option
      let durationMinutes = null;
      if (selectedTimeOption === 'Timer') {
        durationMinutes = parseInt(timerDuration) || 60;
      } else if (selectedTimeOption === 'Set Time') {
        durationMinutes = 60;
      }

      // Prepare booking data
      const bookingData = {
        table_id: safeTable.id,
        game_id: safeTable.game_id || safeTable.gameid || 1,
        user_id: null,
        duration_minutes: durationMinutes,
      };

      console.log('Booking table with data:', bookingData);

      // Start active table session
      const response = await fetch(`${API_URL}/api/activeTables/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        throw new Error(`Server returned invalid response`);
      }

      if (!response.ok) {
        let errorMessage =
          result.error || result.message || 'Failed to book table';

        if (
          errorMessage.includes('not available') ||
          errorMessage.includes('not found')
        ) {
          errorMessage =
            'This table is currently not available. It may be occupied or under maintenance.';
        } else if (
          errorMessage.includes('reserved') ||
          errorMessage.includes('occupied')
        ) {
          errorMessage =
            'This table is already occupied. Please select another table.';
        }

        throw new Error(errorMessage);
      }

      console.log('Table booked successfully:', result);

      // Navigate to AfterBooking with selected food items
      navigation.navigate('AfterBooking', {
        table: safeTable,
        session: result.session || result.activeTable,
        gameType: safeGameType,
        timeOption: selectedTimeOption,
        timeDetails: {
          selectedTime,
          timerDuration,
          selectedFrame,
        },
        preSelectedFoodItems: billItems, // Pass pre-selected food items
      });
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage =
        error.message || 'Could not book the table. Please try again.';

      Alert.alert('Booking Failed', errorMessage, [
        { text: 'OK' },
        {
          text: 'Go Back & Refresh',
          onPress: () => {
            navigation.goBack();
          },
        },
      ]);
    } finally {
      setIsBooking(false);
    }
  };

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{safeGameType}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Table Badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{safeTable.name}</Text>
        </View>

        {/* Date Selection */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.dateList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateButton,
                selectedDate === item.id && styles.dateButtonActive,
              ]}
              onPress={() => setSelectedDate(item.id)}
            >
              <Text
                style={[
                  styles.dateText,
                  selectedDate === item.id && styles.dateTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Time Selection */}
        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeOptions}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Set Time' && styles.timeOptionActive,
            ]}
            onPress={() => handleTimeOptionSelect('Set Time')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Set Time' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Set Time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Timer' && styles.timeOptionActive,
            ]}
            onPress={() => handleTimeOptionSelect('Timer')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Timer' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
            onPress={() => handleTimeOptionSelect('Select Frame')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Select Frame' &&
                  styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Select Frame</Text>
          </TouchableOpacity>
        </View>

        {selectedTimeOption && (
          <View style={styles.timeDetailsContainer}>
            <Icon
              name="time-outline"
              size={18}
              color="#FF8C42"
              style={styles.timeDetailsIcon}
            />
            <Text style={styles.timeDetailsText}>{getTimeDisplayText()}</Text>
            <TouchableOpacity onPress={() => setShowTimeModal(true)}>
              <Icon name="pencil" size={16} color="#FF8C42" />
            </TouchableOpacity>
          </View>
        )}

        {/* Food Section Header */}
        <View style={styles.foodHeader}>
          <Text style={styles.sectionTitle}>Add Food Items</Text>
          {billItems.length > 0 && (
            <TouchableOpacity onPress={handleAddInstructions}>
              <Text style={styles.addInstructionLink}>+ Instructions</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Category Tabs */}
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

        {/* Food Items Section */}
        <View style={styles.foodItemsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Loading menu...</Text>
            </View>
          ) : getFilteredMenuItems().length === 0 ? (
            <View style={styles.emptyContainer}>
              <Icon name="restaurant-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                No items in {selectedCategory}
              </Text>
            </View>
          ) : (
            <View style={styles.foodListContainer}>
              {getFilteredMenuItems().map((item, index) => {
                const billItem = billItems.find(bi => bi.id === item.id);
                const imageUrl = getMenuImageUrl(item.imageUrl);
                return (
                  <View key={item.id || index} style={styles.foodCard}>
                    {/* Food Image */}
                    <View style={styles.foodImageContainer}>
                      {imageUrl ? (
                        <Image
                          source={{ uri: imageUrl }}
                          style={styles.foodImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.foodImagePlaceholder}>
                          <Text style={styles.foodEmoji}>
                            {item.category === 'Beverages'
                              ? '🥤'
                              : item.category === 'Fast Food'
                              ? '🍔'
                              : '🍽️'}
                          </Text>
                        </View>
                      )}
                      {/* Veg/Non-veg indicator */}
                      <View style={[styles.vegIndicator, { borderColor: '#0F8A0F' }]}>
                        <View style={[styles.vegDot, { backgroundColor: '#0F8A0F' }]} />
                      </View>
                    </View>

                    {/* Food Details */}
                    <View style={styles.foodCardContent}>
                      <View style={styles.foodCardHeader}>
                        <Text style={styles.foodCardName} numberOfLines={1}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.foodCardDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        )}
                      </View>

                      <View style={styles.foodCardFooter}>
                        <Text style={styles.foodCardPrice}>₹{item.price || 0}</Text>

                        {/* Add/Quantity Controls */}
                        {billItem ? (
                          <View style={styles.quantityControlsCompact}>
                            <TouchableOpacity
                              style={styles.quantityBtnCompact}
                              onPress={() => handleRemoveFromBill(item.id)}
                            >
                              <Icon name="remove" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                            <Text style={styles.quantityTextCompact}>{billItem.quantity}</Text>
                            <TouchableOpacity
                              style={styles.quantityBtnCompact}
                              onPress={() => handleAddToBill(item)}
                            >
                              <Icon name="add" size={16} color="#FFFFFF" />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.addBtnCompact}
                            onPress={() => handleAddToBill(item)}
                          >
                            <Text style={styles.addBtnText}>ADD</Text>
                            <View style={styles.addBtnPlus}>
                              <Icon name="add" size={12} color="#FF8C42" />
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Bill Summary */}
        {billItems.length > 0 && (
          <View style={styles.billSummaryContainer}>
            <Text style={styles.billSummaryTitle}>Order Summary</Text>
            {billItems.map((item, index) => (
              <View key={item.id || index} style={styles.billItem}>
                <Text style={styles.billItemName}>
                  {item.name} × {item.quantity}
                </Text>
                <Text style={styles.billItemPrice}>
                  ₹{(item.price * item.quantity).toFixed(2)}
                </Text>
              </View>
            ))}
            <View style={styles.billTotal}>
              <Text style={styles.billTotalText}>
                Menu Total: ₹{estimatedCost.menuCharges.toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        {/* Instructions Preview */}
        {foodInstructions !== '' && (
          <View style={styles.instructionsPreview}>
            <Text style={styles.instructionsLabel}>Special Instructions:</Text>
            <Text style={styles.instructionsText}>{foodInstructions}</Text>
            <TouchableOpacity
              onPress={handleAddInstructions}
              style={styles.editInstructionBtn}
            >
              <Icon name="pencil" size={16} color="#FF9500" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Fixed Bottom Buttons */}
      <View style={styles.fixedBottomContainer}>
        <TouchableOpacity
          style={styles.viewPricingButton}
          onPress={handleShowPricingPreview}
          disabled={isBooking}
        >
          <Icon name="pricetag-outline" size={18} color="#FF8C42" />
          <Text style={styles.viewPricingButtonText}>View Pricing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookButton, isBooking && styles.bookButtonDisabled]}
          onPress={handleShowPricingPreview}
          disabled={isBooking}
        >
          {isBooking ? (
            <View style={styles.bookButtonLoading}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={[styles.bookButtonText, { marginLeft: 8 }]}>
                Booking...
              </Text>
            </View>
          ) : (
            <>
              <Icon name="calendar-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.bookButtonText}>Book Table</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Food Instructions Modal */}
      <Modal
        visible={showInstructionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstructionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Food Instructions</Text>
              <TouchableOpacity onPress={() => setShowInstructionModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Add any special instructions for your food order
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="E.g., Extra spicy, No onions, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={foodInstructions}
              onChangeText={setFoodInstructions}
              autoFocus
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveInstructions}
            >
              <Text style={styles.saveButtonText}>Save Instructions</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTimeOption === 'Set Time' && 'Set Start Time'}
                {selectedTimeOption === 'Timer' && 'Set Timer Duration'}
                {selectedTimeOption === 'Select Frame' && 'Select Frame Count'}
              </Text>
              <TouchableOpacity onPress={() => setShowTimeModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedTimeOption === 'Set Time' && (
              <View>
                <Text style={styles.modalSubtitle}>
                  Choose your preferred start time
                </Text>
                <View style={styles.timePickerContainer}>
                  {[
                    '10:00 AM',
                    '11:00 AM',
                    '12:00 PM',
                    '1:00 PM',
                    '2:00 PM',
                    '3:00 PM',
                    '4:00 PM',
                    '5:00 PM',
                    '6:00 PM',
                    '7:00 PM',
                    '8:00 PM',
                    '9:00 PM',
                  ].map(time => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timePickerButton,
                        selectedTime === time && styles.timePickerButtonActive,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timePickerText,
                          selectedTime === time && styles.timePickerTextActive,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedTimeOption === 'Timer' && (
              <View>
                <Text style={styles.modalSubtitle}>
                  Set playing duration in minutes
                </Text>
                <View style={styles.timerInputContainer}>
                  <TextInput
                    style={styles.timerInput}
                    value={timerDuration}
                    onChangeText={setTimerDuration}
                    placeholder="60"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                  <Text style={styles.timerLabel}>minutes</Text>
                </View>
                <View style={styles.quickTimerOptions}>
                  {['30', '60', '90', '120'].map(duration => (
                    <TouchableOpacity
                      key={duration}
                      style={[
                        styles.quickTimerButton,
                        timerDuration === duration &&
                          styles.quickTimerButtonActive,
                      ]}
                      onPress={() => setTimerDuration(duration)}
                    >
                      <Text
                        style={[
                          styles.quickTimerText,
                          timerDuration === duration &&
                            styles.quickTimerTextActive,
                        ]}
                      >
                        {duration}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedTimeOption === 'Select Frame' && (
              <View>
                <Text style={styles.modalSubtitle}>
                  How many frames will you play?
                </Text>
                <View style={styles.frameOptionsContainer}>
                  {['1', '3', '5', '7', '9', '11'].map(frame => (
                    <TouchableOpacity
                      key={frame}
                      style={[
                        styles.frameButton,
                        selectedFrame === frame && styles.frameButtonActive,
                      ]}
                      onPress={() => setSelectedFrame(frame)}
                    >
                      <Text
                        style={[
                          styles.frameButtonText,
                          selectedFrame === frame &&
                            styles.frameButtonTextActive,
                        ]}
                      >
                        {frame}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleTimeConfirm}
            >
              <Text style={styles.saveButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Pricing Preview Modal */}
      <Modal
        visible={showPricingPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPricingPreview(false)}
      >
        <View style={styles.pricingModalOverlay}>
          <View style={styles.pricingPreviewModal}>
            {/* Header */}
            <View style={styles.pricingHeader}>
              <Text style={styles.pricingHeaderTitle}>Booking Summary & Pricing</Text>
              <TouchableOpacity
                style={styles.pricingCloseBtn}
                onPress={() => setShowPricingPreview(false)}
              >
                <Icon name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.pricingContent}>
              {/* Table Information */}
              <View style={styles.pricingSection}>
                <Text style={styles.pricingSectionTitle}>Table Information</Text>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Table:</Text>
                  <Text style={styles.pricingValue}>{safeTable.name}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Game:</Text>
                  <Text style={styles.pricingValue}>{safeGameType}</Text>
                </View>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Duration:</Text>
                  <Text style={styles.pricingValue}>
                    {selectedTimeOption === 'Timer' ? `${timerDuration} min` :
                     selectedTimeOption === 'Select Frame' ? `${selectedFrame} frame(s)` :
                     selectedTime}
                  </Text>
                </View>
              </View>

              {/* Estimated Charges */}
              <View style={styles.pricingSection}>
                <Text style={styles.pricingSectionTitle}>Estimated Charges</Text>
                <View style={styles.pricingChargeRow}>
                  <Text style={styles.pricingChargeName}>Table Charges</Text>
                  <Text style={styles.pricingChargeAmount}>₹{estimatedCost.tableCharges.toFixed(2)}</Text>
                </View>

                {billItems.length > 0 && (
                  <>
                    <Text style={styles.pricingMenuLabel}>Menu Items:</Text>
                    {billItems.map((item, index) => (
                      <View key={index} style={styles.pricingChargeRow}>
                        <Text style={styles.pricingChargeName}>{item.name} × {item.quantity}</Text>
                        <Text style={styles.pricingChargeAmount}>₹{(item.quantity * item.price).toFixed(2)}</Text>
                      </View>
                    ))}
                    <View style={styles.pricingChargeRow}>
                      <Text style={styles.pricingChargeName}>Menu Subtotal</Text>
                      <Text style={styles.pricingChargeAmount}>₹{estimatedCost.menuCharges.toFixed(2)}</Text>
                    </View>
                  </>
                )}
              </View>

              {/* Total */}
              <View style={styles.pricingTotalBox}>
                <Text style={styles.pricingTotalLabel}>Estimated Total</Text>
                <Text style={styles.pricingTotalAmount}>₹{estimatedCost.totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.pricingActions}>
              <TouchableOpacity
                style={styles.pricingCancelButton}
                onPress={() => setShowPricingPreview(false)}
              >
                <Text style={styles.pricingCancelText}>Modify</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pricingConfirmButton}
                onPress={() => {
                  setShowPricingPreview(false);
                  handleBook();
                }}
                disabled={isBooking}
              >
                <Text style={styles.pricingConfirmText}>
                  {isBooking ? 'Booking...' : 'Confirm & Book'}
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

  // Header
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },

  // Content Area
  content: {
    padding: 20,
    paddingBottom: 100,
  },

  // Table Badge
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

  // Section Titles
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Date Selection
  dateList: {
    marginBottom: 20,
  },
  dateButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    minWidth: 70,
    alignItems: 'center',
  },
  dateButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  dateText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '600',
  },
  dateTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Time Options
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  timeOptionActive: {},
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  radioCircleActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FF8C42',
  },
  timeOptionText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },

  // Time Details
  timeDetailsContainer: {
    backgroundColor: '#FFF8F5',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDetailsIcon: {
    marginRight: 10,
  },
  timeDetailsText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },

  // Food Header
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addInstructionLink: {
    color: '#FF8C42',
    fontSize: 13,
    fontWeight: '700',
  },

  // Categories (Swiggy Style Pills)
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingVertical: 4,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryButtonActive: {
    backgroundColor: '#FFF5EE',
    borderColor: '#FF8C42',
  },
  categoryText: {
    fontSize: 13,
    color: '#696969',
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },

  // Food Items
  foodItemsContainer: {
    marginBottom: 20,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  foodIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 1,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodEmoji: {
    fontSize: 28,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  foodPrice: {
    fontSize: 15,
    color: '#FF8C42',
    fontWeight: '800',
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  quantityContainer: {},
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    elevation: 1,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    minWidth: 36,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Food List Layout (Zomato/Swiggy Style)
  foodListContainer: {
    gap: 12,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  foodImageContainer: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodEmoji: {
    fontSize: 36,
  },
  vegIndicator: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 16,
    height: 16,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  foodCardContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  foodCardHeader: {
    flex: 1,
  },
  foodCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  foodCardDescription: {
    fontSize: 12,
    color: '#93959F',
    lineHeight: 16,
  },
  foodCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  foodCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  // Compact Add Button (Swiggy Style)
  addBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    position: 'relative',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C42',
    letterSpacing: 0.5,
  },
  addBtnPlus: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quantity Controls (Swiggy Style)
  quantityControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    overflow: 'hidden',
  },
  quantityBtnCompact: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextCompact: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 24,
    textAlign: 'center',
  },

  // Loading & Empty
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666666',
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 14,
    fontWeight: '600',
  },

  // Bill Summary
  billSummaryContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  billSummaryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  billItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  billItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  billItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
  billTotal: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#FF8C42',
  },
  billTotalText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },

  // Instructions Preview
  instructionsPreview: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    elevation: 1,
  },
  instructionsLabel: {
    fontSize: 11,
    color: '#888888',
    marginBottom: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  instructionsText: {
    fontSize: 13,
    color: '#333333',
    paddingRight: 30,
  },
  editInstructionBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
  },

  // Fixed Bottom Container
  fixedBottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    gap: 12,
  },
  viewPricingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF8C42',
    gap: 6,
  },
  viewPricingButtonText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '700',
  },
  bookButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  bookButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  bookButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal Overlay
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#666666',
    marginBottom: 20,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: '#333333',
    height: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  saveButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Time Picker
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  timePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    minWidth: 80,
    alignItems: 'center',
  },
  timePickerButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  timePickerText: {
    fontSize: 13,
    color: '#333333',
    fontWeight: '500',
  },
  timePickerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Timer Input
  timerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  timerInput: {
    flex: 1,
    fontSize: 22,
    color: '#1A1A1A',
    textAlign: 'center',
    fontWeight: '700',
  },
  timerLabel: {
    fontSize: 15,
    color: '#666666',
    marginLeft: 10,
  },
  quickTimerOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  quickTimerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  quickTimerButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  quickTimerText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  quickTimerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Frame Selection
  frameOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  frameButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  frameButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  frameButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  frameButtonTextActive: {
    color: '#FFFFFF',
  },

  // Pricing Preview Modal
  pricingModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pricingPreviewModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  pricingHeaderTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pricingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pricingContent: {
    padding: 20,
  },
  pricingSection: {
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
  },
  pricingSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  pricingLabel: {
    fontSize: 13,
    color: '#888888',
  },
  pricingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333333',
  },
  pricingChargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  pricingChargeName: {
    fontSize: 13,
    color: '#555555',
    flex: 1,
  },
  pricingChargeAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  pricingMenuLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666666',
    marginTop: 8,
    marginBottom: 4,
  },
  pricingTotalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  pricingTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  pricingTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF8C42',
  },
  pricingActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  pricingCancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
  },
  pricingCancelText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  pricingConfirmButton: {
    flex: 2,
    backgroundColor: '#FF8C42',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  pricingConfirmText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
