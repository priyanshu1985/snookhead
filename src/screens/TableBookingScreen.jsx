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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

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

  const handleBook = () => {
    navigation.navigate('Scanner', {
      table: safeTable,
      gameType: safeGameType,
      date: dates[selectedDate].label,
      timeOption: selectedTimeOption,
      timeDetails: {
        selectedTime,
        timerDuration,
        selectedFrame,
      },
      food: selectedFood,
      instructions: foodInstructions,
    });
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

        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookButtonText}>Book</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  content: { padding: 20 },
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  tableName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 14, color: '#666', marginBottom: 12, marginTop: 8 },
  dateList: { marginBottom: 20, gap: 8 },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  dateButtonActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  dateText: { fontSize: 13, color: '#666', fontWeight: '500' },
  dateTextActive: { color: '#FFF', fontWeight: '600' },
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
  },
  radioCircleActive: { borderColor: '#FF9500', backgroundColor: '#FF9500' },
  timeOptionText: { fontSize: 14, color: '#333' },
  timeDetailsContainer: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  timeDetailsText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addInstructionLink: { color: '#FF9500', fontSize: 13, fontWeight: '600' },
  foodOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  foodButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  foodButtonSingle: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: 120,
  },
  foodButtonActive: { borderColor: '#FF9500', borderWidth: 2 },
  foodIcon: { fontSize: 32, marginBottom: 8 },
  foodName: { fontSize: 12, color: '#333', fontWeight: '500' },
  instructionsPreview: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  instructionsLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  instructionsText: { fontSize: 14, color: '#333', paddingRight: 30 },
  editInstructionBtn: { position: 'absolute', top: 12, right: 12 },
  bookButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  bookButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  newUserText: { color: '#CCC', fontSize: 14, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  // Time picker styles
  timePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  timePickerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  timePickerButtonActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  timePickerText: {
    fontSize: 14,
    color: '#333',
  },
  timePickerTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Timer input styles
  timerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  timerInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  quickTimerOptions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  quickTimerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  quickTimerButtonActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  quickTimerText: {
    fontSize: 14,
    color: '#333',
  },
  quickTimerTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Frame selection styles
  frameOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  frameButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameButtonActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  frameButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  frameButtonTextActive: {
    color: '#FFF',
  },

  // Selected food items styles
  selectedFoodContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedFoodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  selectedFoodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFoodInfo: {
    flex: 1,
    paddingRight: 12,
  },
  selectedFoodActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeItemButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedFoodName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  selectedFoodDetails: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  selectedFoodTotal: {
    paddingTop: 16,
    paddingHorizontal: 8,
    marginTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#FF9500',
    backgroundColor: '#FFF8F5',
    borderRadius: 8,
  },
  selectedFoodTotalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9500',
    textAlign: 'center',
    paddingVertical: 8,
  },
});
