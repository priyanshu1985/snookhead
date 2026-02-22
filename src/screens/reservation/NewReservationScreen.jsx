import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { gamesAPI, tablesAPI } from '../../services/api';
import {
  getAvailableTables,
  calculateEstimatedCost,
} from '../../services/reservationService';
import MemberAutocomplete from '../../components/member/MemberAutocomplete';

const BOOKING_MODES = {
  TIMER: 'timer',
  FRAME: 'frame',
  STOPWATCH: 'set',
};

export default function NewReservationScreen({ navigation, route }) {
  const { bookingMode = 'advance', preselectedTable = null } =
    route.params || {};

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Game & Table Selection
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(preselectedTable);

  // Date & Time
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Simplified - no booking mode or food orders needed

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  // Load initial data
  useEffect(() => {
    loadGamesAndMenu();
  }, []);

  // Load tables when game is selected
  useEffect(() => {
    if (selectedGame) {
      loadAvailableTables();
    }
  }, [selectedGame, selectedDate, selectedTime]);

  const loadGamesAndMenu = async () => {
    setLoading(true);
    try {
      const gamesData = await gamesAPI.getAll();
      setGames(gamesData);
    } catch (error) {
      Alert.alert('Error', 'Failed to load games: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTables = async () => {
    if (!selectedGame) return;

    setLoadingTables(true);
    try {
      const date = selectedDate.toISOString().split('T')[0];
      const time = selectedTime.toTimeString().slice(0, 5);
      const duration =
        bookingType === BOOKING_MODES.TIMER ? parseInt(durationMinutes) : 60;

      const tables = await tablesAPI.getByGame(selectedGame.id);
      setAvailableTables(tables);
    } catch (error) {
      console.error('Error loading tables:', error);
      Alert.alert('Error', 'Failed to load available tables');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleAddFoodItem = item => {
    // Removed - not needed for simplified flow
  };

  const handleRemoveFoodItem = itemId => {
    // Removed - not needed for simplified flow
  };

  const handleUpdateQuantity = (itemId, delta) => {
    // Removed - not needed for simplified flow
  };

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name');
      return false;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }
    if (!selectedGame) {
      Alert.alert('Validation Error', 'Please select a game');
      return false;
    }
    if (!selectedTable) {
      Alert.alert('Validation Error', 'Please select a table');
      return false;
    }
    return true;
  };

  const handleProceedToPayment = () => {
    if (!validateForm()) return;

    const date = selectedDate.toISOString().split('T')[0];
    const time = selectedTime.toTimeString().slice(0, 5);

    const bookingDetails = {
      customer_name: customerName,
      customer_phone: customerPhone,
      game_id: selectedGame.id,
      table_id: selectedTable.id,
      reservation_date: date,
      start_time: time,
    };

    // Navigate to Payment screen
    navigation.navigate('PaymentConfirm', {
      bookingDetails,
      gameName: selectedGame.name,
      tableName: selectedTable.name,
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C42" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {bookingMode === 'advance' ? 'New Reservation' : 'Immediate Booking'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Customer Details */}
        <View style={[styles.section, { zIndex: 10 }]}>
          <Text style={styles.sectionTitle}>Customer Details *</Text>
          <MemberAutocomplete
            value={customerName}
            onChangeText={setCustomerName}
            onSelectMember={(member) => {
              setCustomerName(member.name);
              setCustomerPhone(member.phone || '');
            }}
            onCreateNewMember={(text) => setCustomerName(text)}
            placeholder="Search Name or Phone"
            style={{ marginBottom: 12 }}
          />
          <TextInput
            style={styles.input}
            placeholder="Phone Number *"
            value={customerPhone}
            onChangeText={text => {
              const digits = text.replace(/\D/g, '');
              if (digits.length <= 10) {
                setCustomerPhone(digits);
              }
            }}
            keyboardType="phone-pad"
            maxLength={10}
          />
        </View>

        {/* Game Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Game *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {games.map(game => (
              <TouchableOpacity
                key={game.id}
                style={[
                  styles.gameCard,
                  selectedGame?.id === game.id && styles.gameCardSelected,
                ]}
                onPress={() => setSelectedGame(game)}
              >
                <Text
                  style={[
                    styles.gameCardText,
                    selectedGame?.id === game.id && styles.gameCardTextSelected,
                  ]}
                >
                  {game.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Date & Time (for advance reservations) */}
        {bookingMode === 'advance' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar-outline" size={20} color="#666" />
                <Text style={styles.dateTimeText}>
                  {selectedDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Icon name="time-outline" size={20} color="#666" />
                <Text style={styles.dateTimeText}>
                  {selectedTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                minimumDate={new Date()}
                onChange={(event, date) => {
                  setShowDatePicker(false);
                  if (date) setSelectedDate(date);
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={selectedTime}
                mode="time"
                onChange={(event, time) => {
                  setShowTimePicker(false);
                  if (time) setSelectedTime(time);
                }}
              />
            )}
          </View>
        )}

        {/* Table Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Table *</Text>
            {loadingTables && (
              <ActivityIndicator size="small" color="#FF8C42" />
            )}
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {availableTables.map(table => (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.tableCard,
                  selectedTable?.id === table.id && styles.tableCardSelected,
                ]}
                onPress={() => setSelectedTable(table)}
              >
                <Text
                  style={[
                    styles.tableCardText,
                    selectedTable?.id === table.id &&
                      styles.tableCardTextSelected,
                  ]}
                >
                  {table.name}
                </Text>
                <Text style={styles.tableStatus}>Available</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {availableTables.length === 0 && !loadingTables && (
            <Text style={styles.emptyText}>
              {selectedGame
                ? 'No tables available for selected time'
                : 'Select a game first'}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Footer with Create Reservation Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPayment}
        >
          <Icon name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.proceedButtonText}>Create Reservation</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  gameCard: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  gameCardSelected: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  gameCardText: {
    fontSize: 14,
    color: '#666',
  },
  gameCardTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentButtonActive: {
    backgroundColor: '#FF8C42',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
  },
  numberInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  tableCard: {
    width: 100,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tableCardSelected: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  tableCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tableCardTextSelected: {
    color: '#fff',
  },
  tableStatus: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFoodText: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  selectedFoodSection: {
    marginTop: 12,
  },
  selectedFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFoodName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  qtyBtn: {
    padding: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  selectedFoodPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C42',
    marginRight: 12,
  },
  removeBtn: {
    padding: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 8,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  foodModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuItemPrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: 'bold',
    marginTop: 4,
  },
});
