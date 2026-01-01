import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
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
    dates.push({
      id: i,
      label: i === 0 ? 'Today' : `${date.getDate()}June`,
    });
  }
  return dates;
};

export default function TableBookingScreen({ route, navigation }) {
  // ===== ALL HOOKS AT THE TOP - MUST BE FIRST =====
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTimeOption, setSelectedTimeOption] = useState('Set Time');
  const [selectedFood, setSelectedFood] = useState([]);
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

  // ===== DATA AND CONSTANTS AFTER HOOKS =====
  const { table, gameType, color, selectedFoodItems } = route.params || {};
  const dates = getNextDates();

  // Add safety checks for undefined parameters
  const safeTable = table || { name: 'Unknown Table', id: 'unknown' };
  const safeGameType = gameType || 'Game';

  // Update selectedFood when coming back from TableBookingOrders
  React.useEffect(() => {
    if (selectedFoodItems && selectedFoodItems.length > 0) {
      console.log(
        'Selected food items received:',
        JSON.stringify(selectedFoodItems, null, 2),
      );
      setSelectedFood(selectedFoodItems);
    }
  }, [selectedFoodItems]);

  const foodOptions = [{ id: 1, name: 'Food', icon: '🍔' }];

  // ===== HANDLERS =====
  const handleFoodSelection = () => {
    // Navigate to TableBookingOrders component
    navigation.navigate('TableBookingOrders', {
      tableId: safeTable.id,
      tableName: safeTable.name,
      table: safeTable,
      gameType: safeGameType,
      color: color,
    });
  };

  const handleAddInstructions = () => {
    if (selectedFood.length === 0) {
      alert('Please select at least one food item first');
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

    // Calculate menu charges
    menuCharges = selectedFood.reduce((total, item) => {
      return (
        total +
        (item.qty || item.quantity || 1) * (item.item?.price || item.price || 0)
      );
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
        return `Set Time: ${selectedTime}`;
      case 'Timer':
        return `Timer: ${timerDuration} min`;
      case 'Select Frame':
        return `Frame: ${selectedFrame}`;
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
        // For set time, default to 60 minutes (can be adjusted)
        durationMinutes = 60;
      }
      // For 'Select Frame', duration is not time-based

      // Prepare booking data
      const bookingData = {
        table_id: safeTable.id,
        game_id: safeTable.game_id || safeTable.gameid || 1, // Get game_id from table data
        user_id: null, // Will be extracted from token on backend
        duration_minutes: durationMinutes, // Pass duration to backend
      };

      console.log('Table object:', safeTable);
      console.log('Table status:', safeTable.status);
      console.log('Booking table with data:', bookingData);
      console.log('API URL:', `${API_URL}/api/activeTables/start`);

      // Start active table session
      const response = await fetch(`${API_URL}/api/activeTables/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      // Get response text first to see what we're actually getting
      const responseText = await response.text();
      console.log('Response text:', responseText);

      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error. Raw response:', responseText);
        throw new Error(
          `Server returned invalid response: ${responseText.substring(
            0,
            200,
          )}...`,
        );
      }

      if (!response.ok) {
        let errorMessage =
          result.error || result.message || 'Failed to book table';

        // Provide specific messages for common errors
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

      Alert.alert(
        'Success!',
        `Table ${safeTable.name} has been booked successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Small delay to ensure backend processing is complete
              setTimeout(() => {
                // Navigate back to Home tab to see the updated table status
                navigation.navigate('MainTabs', { screen: 'Home' });
              }, 500);
            },
          },
        ],
      );
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

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{safeTable.name} S0176</Text>
        </View>

        <Text style={styles.sectionTitle}>Select date</Text>
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
            <Text style={styles.timeDetailsText}>{getTimeDisplayText()}</Text>
          </View>
        )}

        <View style={styles.foodHeader}>
          <Text style={styles.sectionTitle}>Add Food</Text>
          {selectedFood.length > 0 && (
            <TouchableOpacity onPress={handleAddInstructions}>
              <Text style={styles.addInstructionLink}>+ Add Instructions</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.foodOptions}>
          {foodOptions.map(food => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodButtonSingle}
              onPress={handleFoodSelection}
            >
              <Text style={styles.foodIcon}>{food.icon}</Text>
              <Text style={styles.foodName}>{food.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Display selected food items */}
        {selectedFood.length > 0 && (
          <View style={styles.selectedFoodContainer}>
            <Text style={styles.selectedFoodTitle}>Selected Food Items:</Text>
            {selectedFood.map((item, index) => (
              <View key={index} style={styles.selectedFoodItem}>
                <View style={styles.selectedFoodInfo}>
                  <Text style={styles.selectedFoodName}>
                    {item.item?.name ||
                      item.name ||
                      item.title ||
                      'Unknown Item'}
                  </Text>
                  <Text style={styles.selectedFoodDetails}>
                    Qty: {item.qty || item.quantity || 1} × ₹
                    {item.item?.price || item.price || 0} = ₹
                    {(item.qty || item.quantity || 1) *
                      (item.item?.price || item.price || 0)}
                  </Text>
                </View>
                <View style={styles.selectedFoodActions}>
                  <TouchableOpacity
                    style={styles.removeItemButton}
                    onPress={() => {
                      const updatedFood = selectedFood.filter(
                        (_, i) => i !== index,
                      );
                      setSelectedFood(updatedFood);
                    }}
                  >
                    <Icon name="close" size={16} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <View style={styles.selectedFoodTotal}>
              <Text style={styles.selectedFoodTotalText}>
                Total Bill: ₹
                {selectedFood
                  .reduce(
                    (total, item) =>
                      total +
                      (item.qty || item.quantity || 1) *
                        (item.item?.price || item.price || 0),
                    0,
                  )
                  .toFixed(2)}
              </Text>
            </View>
          </View>
        )}

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
            <Text style={styles.bookButtonText}>View Pricing & Book Table</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.newUserText}>New User</Text>
        </TouchableOpacity>
      </ScrollView>

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
        animationType="slide"
        onRequestClose={() => setShowPricingPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pricingPreviewModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Booking Summary & Pricing</Text>
              <TouchableOpacity onPress={() => setShowPricingPreview(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pricingContent}>
              <View style={styles.pricingSection}>
                <Text style={styles.pricingSectionTitle}>
                  Table Information
                </Text>
                <Text style={styles.pricingText}>Table: {safeTable.name}</Text>
                <Text style={styles.pricingText}>Game: {safeGameType}</Text>
                <Text style={styles.pricingText}>
                  Time Option: {getTimeDisplayText()}
                </Text>
              </View>

              <View style={styles.pricingSection}>
                <Text style={styles.pricingSectionTitle}>
                  Estimated Charges
                </Text>

                <View style={styles.pricingItem}>
                  <Text style={styles.pricingItemName}>Table Charges</Text>
                  <Text style={styles.pricingItemPrice}>
                    ₹{estimatedCost.tableCharges.toFixed(2)}
                  </Text>
                </View>

                {selectedFood.length > 0 && (
                  <>
                    <Text style={styles.pricingSubTitle}>Menu Items:</Text>
                    {selectedFood.map((item, index) => (
                      <View key={index} style={styles.pricingItem}>
                        <Text style={styles.pricingItemName}>
                          {item.item?.name || item.name} ×{' '}
                          {item.qty || item.quantity || 1}
                        </Text>
                        <Text style={styles.pricingItemPrice}>
                          ₹
                          {(
                            (item.qty || item.quantity || 1) *
                            (item.item?.price || item.price || 0)
                          ).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                    <View style={styles.pricingItem}>
                      <Text style={styles.pricingItemName}>Menu Subtotal</Text>
                      <Text style={styles.pricingItemPrice}>
                        ₹{estimatedCost.menuCharges.toFixed(2)}
                      </Text>
                    </View>
                  </>
                )}

                <View style={styles.pricingTotal}>
                  <Text style={styles.pricingTotalText}>
                    Estimated Total: ₹{estimatedCost.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <Text style={styles.pricingNote}>
                * Final amount may vary based on actual session duration
              </Text>
            </ScrollView>

            <View style={styles.pricingActions}>
              <TouchableOpacity
                style={styles.pricingCancelButton}
                onPress={() => setShowPricingPreview(false)}
              >
                <Text style={styles.pricingCancelText}>Modify Selection</Text>
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
                  {isBooking ? 'Booking...' : 'Confirm & Book Table'}
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

  // Header - Clean and Professional
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

  // Table Badge - Prominent Display
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 28,
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

  // Section Titles - Consistent Typography
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 14,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Date Selection - Pill Style
  dateList: {
    marginBottom: 24,
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  dateButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  dateTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Time Options - Radio Button Style
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FF8C42',
  },
  radioCircleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },

  // Time Details Display
  timeDetailsContainer: {
    backgroundColor: '#FFF8F5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeDetailsIcon: {
    marginRight: 12,
  },
  timeDetailsText: {
    fontSize: 15,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },

  // Food Section
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  addInstructionLink: {
    color: '#FF8C42',
    fontSize: 13,
    fontWeight: '700',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },

  // Food Options - Card Style
  foodOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  foodButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  foodButtonSingle: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  foodButtonActive: {
    borderColor: '#FF8C42',
    borderWidth: 2,
    backgroundColor: '#FFF8F5',
  },
  foodIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  foodName: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },

  // Instructions Preview
  instructionsPreview: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  instructionsLabel: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333333',
    paddingRight: 36,
    lineHeight: 20,
  },
  editInstructionBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    padding: 6,
  },

  // Primary Book Button
  bookButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
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
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  newUserText: {
    color: '#999999',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
    lineHeight: 20,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    padding: 18,
    fontSize: 15,
    color: '#333333',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  saveButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
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
    fontSize: 16,
    fontWeight: '700',
  },

  // Time Picker Grid
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  timePickerButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    minWidth: 85,
    alignItems: 'center',
  },
  timePickerButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  timePickerText: {
    fontSize: 14,
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
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  timerInput: {
    flex: 1,
    fontSize: 24,
    color: '#1A1A1A',
    textAlign: 'center',
    fontWeight: '700',
  },
  timerLabel: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 12,
    fontWeight: '500',
  },
  quickTimerOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickTimerButton: {
    flex: 1,
    paddingVertical: 14,
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
    fontSize: 15,
    color: '#333333',
    fontWeight: '600',
  },
  quickTimerTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Frame Selection - Circular Buttons
  frameOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 24,
    justifyContent: 'center',
  },
  frameButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOpacity: 0.3,
  },
  frameButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
  },
  frameButtonTextActive: {
    color: '#FFFFFF',
  },

  // Selected Food Items Card
  selectedFoodContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  selectedFoodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 18,
    textAlign: 'center',
  },
  selectedFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  selectedFoodInfo: {
    flex: 1,
    paddingRight: 14,
  },
  selectedFoodActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFoodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  selectedFoodDetails: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  selectedFoodTotal: {
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginTop: 14,
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  selectedFoodTotalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF8C42',
    textAlign: 'center',
  },

  // Pricing Preview Modal
  pricingPreviewModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    width: '100%',
  },
  pricingContent: {
    padding: 24,
    maxHeight: 450,
  },
  pricingSection: {
    marginBottom: 24,
  },
  pricingSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#FF8C42',
  },
  pricingText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
    lineHeight: 20,
  },
  pricingSubTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
    marginTop: 10,
    marginBottom: 10,
  },
  pricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  pricingItemName: {
    fontSize: 14,
    color: '#666666',
    flex: 1,
  },
  pricingItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  pricingTotal: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 18,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  pricingTotalText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF8C42',
    textAlign: 'center',
  },
  pricingNote: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 18,
    fontStyle: 'italic',
  },
  pricingActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  pricingCancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  pricingCancelText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '600',
  },
  pricingConfirmButton: {
    flex: 2,
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  pricingConfirmText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
