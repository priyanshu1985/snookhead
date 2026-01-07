import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Generate real dates for the next 7 days
const generateDateOptions = () => {
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
      id: i.toString(),
      label:
        i === 0 ? 'Today' : `${date.getDate()}${monthNames[date.getMonth()]}`,
      date: date.toISOString().split('T')[0], // YYYY-MM-DD format
      isToday: i === 0,
      displayDate: date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
      }),
    });
  }
  return dates;
};

const dateOptions = generateDateOptions();

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

export default function AddReservationForm({ onBack, onComplete }) {
  const [selectedDate, setSelectedDate] = useState('0');
  const [selectedTimeOption, setSelectedTimeOption] = useState('setTime');
  const [selectedTime, setSelectedTime] = useState('12:00 PM');
  const [timerDuration, setTimerDuration] = useState('60');
  const [selectedFrame, setSelectedFrame] = useState('1');
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({
    name: '',
    phone: '',
  });
  const [isCreating, setIsCreating] = useState(false);
  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  // Time options for Set Time
  const timeSlots = [
    '09:00 AM',
    '10:00 AM',
    '11:00 AM',
    '12:00 PM',
    '01:00 PM',
    '02:00 PM',
    '03:00 PM',
    '04:00 PM',
    '05:00 PM',
    '06:00 PM',
    '07:00 PM',
    '08:00 PM',
    '09:00 PM',
    '10:00 PM',
  ];

  // Fetch games from API
  const fetchGames = async () => {
    try {
      setLoadingGames(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }

      console.log('Fetching games from:', `${API_URL}/api/games`);

      const response = await fetch(`${API_URL}/api/games`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Games response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Fetched games:', data);

        // Transform data to ensure consistent naming
        const transformedGames = data.map(game => ({
          game_id: game.game_id || game.id,
          name: game.game_name || game.name,
          description: game.description || '',
          image_key: game.image_key,
          created_by: game.created_by,
          ...game,
        }));

        setGames(transformedGames);

        if (transformedGames.length === 0) {
          Alert.alert(
            'No Games Available',
            'No games found. Please add games first or contact administrator.',
            [{ text: 'OK' }],
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          'Failed to fetch games. Status:',
          response.status,
          'Error:',
          errorText,
        );
        Alert.alert(
          'Error',
          `Failed to load games. Status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      Alert.alert(
        'Network Error',
        'Failed to connect to server. Please check your connection.',
      );
    } finally {
      setLoadingGames(false);
    }
  };

  // Fetch tables for selected game
  const fetchTablesForGame = async gameId => {
    try {
      setLoadingTables(true);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }

      console.log('Fetching tables for game:', gameId);

      const response = await fetch(`${API_URL}/api/tables`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Tables response status:', response.status);

      if (response.ok) {
        const responseData = await response.json();
        console.log('Tables API response:', responseData);

        // Handle paginated response structure
        let allTables = [];
        if (responseData.data && Array.isArray(responseData.data)) {
          allTables = responseData.data;
        } else if (Array.isArray(responseData)) {
          allTables = responseData;
        }

        // Filter tables that match the selected game
        const gameTables = allTables.filter(table => table.game_id === gameId);

        // Transform table data for consistency
        const transformedTables = gameTables.map(table => ({
          id: table.id || table.table_id,
          name: table.name || table.table_name || `Table ${table.id}`,
          game_id: table.game_id,
          status: table.status || 'available',
          game_type: table.game_type,
          ...table,
        }));

        console.log(
          'Filtered and transformed tables for game',
          gameId,
          ':',
          transformedTables,
        );
        setAvailableTables(transformedTables);

        if (transformedTables.length === 0) {
          Alert.alert(
            'No Tables Available',
            `No tables found for the selected game. Please contact administrator to set up tables for this game.`,
            [{ text: 'OK' }],
          );
        }
      } else {
        const errorText = await response.text();
        console.error(
          'Failed to fetch tables. Status:',
          response.status,
          'Error:',
          errorText,
        );
        Alert.alert(
          'Error',
          `Failed to load tables. Status: ${response.status}`,
        );
      }
    } catch (error) {
      console.error('Error fetching tables:', error);
      Alert.alert(
        'Network Error',
        'Failed to connect to server. Please check your connection.',
      );
    } finally {
      setLoadingTables(false);
    }
  };

  // Load games when component mounts
  useEffect(() => {
    fetchGames();
  }, []);

  // Load tables when game is selected
  useEffect(() => {
    if (selectedGame) {
      fetchTablesForGame(selectedGame.game_id);
      setSelectedTable(null); // Reset table selection when game changes
    }
  }, [selectedGame]);

  const handleNext = () => {
    // Validation
    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!selectedGame) {
      Alert.alert('Error', 'Please select a game');
      return;
    }

    if (!selectedTable) {
      Alert.alert('Error', 'Please select a table');
      return;
    }

    // For today, require immediate booking flow
    const selectedDateInfo = dateOptions.find(d => d.id === selectedDate);
    if (selectedDateInfo?.isToday) {
      Alert.alert(
        'Today Booking',
        "For today's booking, please use the table booking screen directly.",
      );
      return;
    }

    // For future dates, show customer details modal
    setShowCustomerModal(true);
  };

  const handleCreateReservation = async () => {
    try {
      setIsCreating(true);

      // Validate customer details
      if (!customerDetails.name.trim() || !customerDetails.phone.trim()) {
        Alert.alert('Error', 'Please enter customer name and phone number');
        return;
      }

      // Validate game and table selection
      if (!selectedGame || !selectedTable) {
        Alert.alert('Error', 'Please select a game and table');
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      const selectedDateInfo = dateOptions.find(d => d.id === selectedDate);
      if (!selectedDateInfo) {
        Alert.alert('Error', 'Please select a valid date');
        return;
      }

      // Calculate duration
      let durationMinutes = 60; // default
      if (selectedTimeOption === 'timer') {
        durationMinutes = parseInt(timerDuration) || 60;
      }

      // Convert 12-hour time to 24-hour format for API
      const convertTo24Hour = time12h => {
        if (!time12h || typeof time12h !== 'string') {
          console.error('Invalid time format:', time12h);
          return '12:00:00'; // Default fallback
        }

        const [time, modifier] = time12h.split(' ');
        if (!time || !modifier) {
          console.error(
            'Invalid time format - missing time or modifier:',
            time12h,
          );
          return '12:00:00';
        }

        let [hours, minutes] = time.split(':');
        if (!hours || !minutes) {
          console.error(
            'Invalid time format - missing hours or minutes:',
            time,
          );
          return '12:00:00';
        }

        // Convert hours to number for calculation
        let hoursNum = parseInt(hours, 10);

        // Handle 12 hour format edge cases
        if (hoursNum === 12) {
          hoursNum = modifier === 'AM' ? 0 : 12;
        } else if (modifier === 'PM') {
          hoursNum = hoursNum + 12;
        }

        // Ensure we have valid numbers and convert back to strings with padding
        const finalHours = String(hoursNum).padStart(2, '0');
        const finalMinutes = String(minutes).padStart(2, '0');

        const result = `${finalHours}:${finalMinutes}:00`;
        console.log(`Converted ${time12h} to ${result}`);
        return result;
      };

      // Convert time with error handling
      let convertedTime;
      try {
        convertedTime = convertTo24Hour(selectedTime);
      } catch (error) {
        console.error('Time conversion error:', error);
        Alert.alert(
          'Error',
          'Invalid time format. Please select a different time.',
        );
        return;
      }

      const reservationData = {
        table_id: selectedTable.id,
        game_id: selectedGame.game_id,
        customer_name: customerDetails.name,
        customer_phone: customerDetails.phone,
        reservation_date: selectedDateInfo.date,
        start_time: convertedTime,
        duration_minutes: durationMinutes,
        notes: `Created via reservation form. Game: ${selectedGame.name}, Table: ${selectedTable.name}, Time option: ${selectedTimeOption}`,
      };

      console.log('Creating reservation with data:', reservationData);

      const response = await fetch(`${API_URL}/api/reservations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(reservationData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Reservation failed');
      }

      Alert.alert(
        'Reservation Created!',
        `Reservation has been created for ${customerDetails.name} on ${selectedDateInfo.label} at ${selectedTime}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              setShowCustomerModal(false);
              setCustomerDetails({ name: '', phone: '' });
              onComplete(); // Go back to upcoming reservations
            },
          },
        ],
      );
    } catch (error) {
      console.error('Reservation error:', error);
      Alert.alert(
        'Reservation Failed',
        error.message || 'Could not create reservation. Please try again.',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const getTimeDetails = () => {
    switch (selectedTimeOption) {
      case 'setTime':
        return `Start Time: ${selectedTime}`;
      case 'timer':
        return `Duration: ${timerDuration} min`;
      case 'selectFrame':
        return `Frames: ${selectedFrame}`;
      default:
        return selectedTimeOption;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming reservation</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tab} onPress={onBack}>
          <Text style={styles.tabText}>QUEUE</Text>
        </TouchableOpacity>

        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>UPCOMING{'\n'}RESERVATION</Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Select Date Section */}
        <Text style={styles.sectionTitle}>Select date</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScrollView}
          contentContainerStyle={styles.dateContainer}
        >
          {dateOptions.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.dateCard,
                selectedDate === option.id && styles.selectedDateCard,
              ]}
              onPress={() => setSelectedDate(option.id)}
            >
              <Text
                style={[
                  styles.dateCardText,
                  selectedDate === option.id && styles.selectedDateCardText,
                ]}
              >
                {option.isToday ? 'Today' : option.displayDate}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Select Game Section */}
        <Text style={styles.sectionTitle}>Select Game</Text>
        <TouchableOpacity
          style={styles.selectionCard}
          onPress={() => setShowGameModal(true)}
        >
          <Icon name="game-controller-outline" size={20} color="#FF8C42" />
          <View style={styles.selectionTextContainer}>
            <Text style={styles.selectionLabel}>Game</Text>
            <Text style={styles.selectionValue}>
              {selectedGame ? selectedGame.name : 'Choose a game'}
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Select Table Section */}
        <Text style={styles.sectionTitle}>Select Table</Text>
        <TouchableOpacity
          style={[styles.selectionCard, !selectedGame && styles.disabledCard]}
          onPress={() => selectedGame && setShowTableModal(true)}
          disabled={!selectedGame}
        >
          <Icon
            name="grid-outline"
            size={20}
            color={selectedGame ? '#FF8C42' : '#ccc'}
          />
          <View style={styles.selectionTextContainer}>
            <Text
              style={[
                styles.selectionLabel,
                !selectedGame && styles.disabledText,
              ]}
            >
              Table
            </Text>
            <Text
              style={[
                styles.selectionValue,
                !selectedGame && styles.disabledText,
              ]}
            >
              {selectedTable
                ? selectedTable.name
                : selectedGame
                ? 'Choose a table'
                : 'Select a game first'}
            </Text>
          </View>
          <Icon
            name="chevron-forward"
            size={20}
            color={selectedGame ? '#ccc' : '#e0e0e0'}
          />
        </TouchableOpacity>

        {/* Select Time Section */}
        <Text style={styles.sectionTitle}>Select Time</Text>

        <View style={styles.timeOptionsContainer}>
          {/* Set Time Option */}
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setSelectedTimeOption('setTime')}
          >
            <View style={styles.radioButton}>
              {selectedTimeOption === 'setTime' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <Text style={styles.radioLabel}>Set Time</Text>
          </TouchableOpacity>

          {/* Timer Option */}
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setSelectedTimeOption('timer')}
          >
            <View style={styles.radioButton}>
              {selectedTimeOption === 'timer' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <Text style={styles.radioLabel}>Timer</Text>
          </TouchableOpacity>

          {/* Select Frame Option */}
          <TouchableOpacity
            style={styles.radioOption}
            onPress={() => setSelectedTimeOption('selectFrame')}
          >
            <View style={styles.radioButton}>
              {selectedTimeOption === 'selectFrame' && (
                <View style={styles.radioButtonInner} />
              )}
            </View>
            <Text style={styles.radioLabel}>Select Frame</Text>
          </TouchableOpacity>
        </View>

        {/* Time Details */}
        {selectedTimeOption && (
          <TouchableOpacity
            style={styles.timeDetailsContainer}
            onPress={() => setShowTimeModal(true)}
          >
            <Icon name="time-outline" size={20} color="#FF8C42" />
            <Text style={styles.timeDetailsText}>{getTimeDetails()}</Text>
            <Icon name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedTimeOption === 'setTime' && 'Select Time'}
                {selectedTimeOption === 'timer' && 'Set Duration'}
                {selectedTimeOption === 'selectFrame' && 'Select Frames'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTimeModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {selectedTimeOption === 'setTime' && (
                <View style={styles.timeSlotContainer}>
                  {timeSlots.map(time => (
                    <TouchableOpacity
                      key={time}
                      style={[
                        styles.timeSlot,
                        selectedTime === time && styles.selectedTimeSlot,
                      ]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text
                        style={[
                          styles.timeSlotText,
                          selectedTime === time && styles.selectedTimeSlotText,
                        ]}
                      >
                        {time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {selectedTimeOption === 'timer' && (
                <View style={styles.timerContainer}>
                  <Text style={styles.inputLabel}>Duration (minutes)</Text>
                  <TextInput
                    style={styles.durationInput}
                    value={timerDuration}
                    onChangeText={setTimerDuration}
                    placeholder="Enter duration in minutes"
                    keyboardType="numeric"
                  />
                  <View style={styles.presetDurations}>
                    {['30', '60', '90', '120'].map(duration => (
                      <TouchableOpacity
                        key={duration}
                        style={[
                          styles.presetDurationButton,
                          timerDuration === duration &&
                            styles.selectedPresetDuration,
                        ]}
                        onPress={() => setTimerDuration(duration)}
                      >
                        <Text
                          style={[
                            styles.presetDurationText,
                            timerDuration === duration &&
                              styles.selectedPresetDurationText,
                          ]}
                        >
                          {duration} min
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {selectedTimeOption === 'selectFrame' && (
                <View style={styles.frameContainer}>
                  <Text style={styles.inputLabel}>Number of Frames</Text>
                  <View style={styles.frameOptions}>
                    {['1', '2', '3', '4', '5'].map(frame => (
                      <TouchableOpacity
                        key={frame}
                        style={[
                          styles.frameOption,
                          selectedFrame === frame && styles.selectedFrameOption,
                        ]}
                        onPress={() => setSelectedFrame(frame)}
                      >
                        <Text
                          style={[
                            styles.frameOptionText,
                            selectedFrame === frame &&
                              styles.selectedFrameOptionText,
                          ]}
                        >
                          {frame} Frame{frame !== '1' ? 's' : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalConfirmButton}
              onPress={() => setShowTimeModal(false)}
            >
              <Text style={styles.modalConfirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Customer Details Modal */}
      <Modal
        visible={showCustomerModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCustomerModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCustomerModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.customerForm}>
                <Text style={styles.inputLabel}>Customer Name</Text>
                <TextInput
                  style={styles.customerInput}
                  value={customerDetails.name}
                  onChangeText={text =>
                    setCustomerDetails(prev => ({ ...prev, name: text }))
                  }
                  placeholder="Enter customer name"
                  placeholderTextColor="#999"
                />

                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.customerInput}
                  value={customerDetails.phone}
                  onChangeText={text =>
                    setCustomerDetails(prev => ({ ...prev, phone: text }))
                  }
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />

                <View style={styles.bookingSummary}>
                  <Text style={styles.summaryTitle}>Booking Summary</Text>
                  <Text style={styles.summaryText}>
                    Game: {selectedGame?.name || 'Not selected'}
                  </Text>
                  <Text style={styles.summaryText}>
                    Table: {selectedTable?.name || 'Not selected'}
                  </Text>
                  <Text style={styles.summaryText}>
                    Date: {dateOptions.find(d => d.id === selectedDate)?.label}
                  </Text>
                  <Text style={styles.summaryText}>
                    Time: {getTimeDetails()}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowCustomerModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmButton, { flex: 1, marginLeft: 12 }]}
                onPress={handleCreateReservation}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmButtonText}>
                    Create Reservation
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Game Selection Modal */}
      <Modal
        visible={showGameModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Game</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGameModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {loadingGames ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF8C42" />
                  <Text style={styles.loadingText}>Loading games...</Text>
                </View>
              ) : (
                <View style={styles.gamesList}>
                  {games.map(game => (
                    <TouchableOpacity
                      key={game.game_id}
                      style={[
                        styles.gameOption,
                        selectedGame?.game_id === game.game_id &&
                          styles.selectedGameOption,
                      ]}
                      onPress={() => {
                        setSelectedGame(game);
                        setShowGameModal(false);
                      }}
                    >
                      <View style={styles.gameInfo}>
                        <Text
                          style={[
                            styles.gameName,
                            selectedGame?.game_id === game.game_id &&
                              styles.selectedGameText,
                          ]}
                        >
                          {game.name}
                        </Text>
                        {game.description && (
                          <Text
                            style={[
                              styles.gameDescription,
                              selectedGame?.game_id === game.game_id &&
                                styles.selectedGameText,
                            ]}
                          >
                            {game.description}
                          </Text>
                        )}
                      </View>
                      {selectedGame?.game_id === game.game_id && (
                        <Icon
                          name="checkmark-circle"
                          size={24}
                          color="#FF8C42"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Debug and Refresh Section */}
              <View style={styles.debugSection}>
                <Text style={styles.debugText}>
                  Games loaded: {games.length} | Loading:{' '}
                  {loadingGames ? 'Yes' : 'No'}
                </Text>
                <TouchableOpacity
                  style={styles.refreshButton}
                  onPress={() => {
                    console.log('Manual refresh games triggered');
                    fetchGames();
                  }}
                  disabled={loadingGames}
                >
                  <Text style={styles.refreshButtonText}>
                    {loadingGames ? 'Refreshing...' : 'Refresh Games'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Table Selection Modal */}
      <Modal
        visible={showTableModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTableModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select Table {selectedGame && `(${selectedGame.name})`}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowTableModal(false)}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {loadingTables ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FF8C42" />
                  <Text style={styles.loadingText}>Loading tables...</Text>
                </View>
              ) : availableTables.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Icon name="grid-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>No Tables Available</Text>
                  <Text style={styles.emptySubtitle}>
                    No tables found for the selected game.
                  </Text>
                </View>
              ) : (
                <View style={styles.tablesList}>
                  {availableTables.map(table => (
                    <TouchableOpacity
                      key={table.id}
                      style={[
                        styles.tableOption,
                        selectedTable?.id === table.id &&
                          styles.selectedTableOption,
                      ]}
                      onPress={() => {
                        setSelectedTable(table);
                        setShowTableModal(false);
                      }}
                    >
                      <View style={styles.tableInfo}>
                        <Text
                          style={[
                            styles.tableName,
                            selectedTable?.id === table.id &&
                              styles.selectedTableText,
                          ]}
                        >
                          {table.name}
                        </Text>
                        <Text
                          style={[
                            styles.tableStatus,
                            selectedTable?.id === table.id &&
                              styles.selectedTableText,
                          ]}
                        >
                          Status: Available
                        </Text>
                      </View>
                      {selectedTable?.id === table.id && (
                        <Icon
                          name="checkmark-circle"
                          size={24}
                          color="#FF8C42"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  dateScrollView: {
    marginBottom: 32,
  },
  dateContainer: {
    paddingRight: 16,
  },
  dateCard: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedDateCard: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  dateCardText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedDateCardText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8C42',
  },
  radioLabel: {
    fontSize: 14,
    color: '#333',
  },
  timeDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  timeDetailsText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  buttonContainer: {
    padding: 16,
  },
  nextButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    maxHeight: 400,
    paddingHorizontal: 20,
  },
  // Time Slot Styles
  timeSlotContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingVertical: 20,
  },
  timeSlot: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minWidth: '30%',
    alignItems: 'center',
  },
  selectedTimeSlot: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  timeSlotText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedTimeSlotText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Timer Styles
  timerContainer: {
    paddingVertical: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  durationInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  presetDurations: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  presetDurationButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedPresetDuration: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  presetDurationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedPresetDurationText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Frame Styles
  frameContainer: {
    paddingVertical: 20,
  },
  frameOptions: {
    gap: 12,
  },
  frameOption: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  selectedFrameOption: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  frameOptionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  selectedFrameOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  // Customer Form Styles
  customerForm: {
    paddingVertical: 20,
  },
  customerInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
  },
  bookingSummary: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  // Modal Button Styles
  modalButtonContainer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalConfirmButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalConfirmButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  // Game and Table Selection Styles
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  disabledCard: {
    backgroundColor: '#F9F9F9',
    borderColor: '#F0F0F0',
  },
  selectionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  selectionLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  selectionValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  disabledText: {
    color: '#ccc',
  },
  // Game Modal Styles
  gamesList: {
    paddingVertical: 20,
  },
  gameOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedGameOption: {
    backgroundColor: '#FFF3E8',
    borderColor: '#FF8C42',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gameDescription: {
    fontSize: 12,
    color: '#666',
  },
  selectedGameText: {
    color: '#FF8C42',
  },
  // Table Modal Styles
  tablesList: {
    paddingVertical: 20,
  },
  tableOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTableOption: {
    backgroundColor: '#FFF3E8',
    borderColor: '#FF8C42',
  },
  tableInfo: {
    flex: 1,
  },
  tableName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tableStatus: {
    fontSize: 12,
    color: '#666',
  },
  selectedTableText: {
    color: '#FF8C42',
  },
  // Loading and Empty States
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  // Debug Styles
  debugSection: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  refreshButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
});
