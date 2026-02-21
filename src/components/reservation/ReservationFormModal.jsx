import React, { useState, useEffect, useMemo } from 'react';
import { Square, Timer, Clock, Grid, Minus, Plus, CheckCircle2, AlertCircle, ArrowRightLeft, Banknote, Wallet } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { API_URL } from '../../config';
import eventEmitter from '../../utils/eventEmitter';

const ReservationFormModal = ({ visible, onClose, onSuccess }) => {
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedGame, setSelectedGame] = useState(null);
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedHour, setSelectedHour] = useState(null);
  const [selectedMinute, setSelectedMinute] = useState(null);
  const [bookingType, setBookingType] = useState('timer'); // timer, set_time, frame
  const [duration, setDuration] = useState(60); // minutes

  // Payment state
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [paymentType, setPaymentType] = useState(null); // pay_now, pay_half, pay_later
  const [paymentMode, setPaymentMode] = useState(null); // cash, upi, wallet
  const [amount, setAmount] = useState('');

  // Data state
  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);
  const [filteredTables, setFilteredTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Validation state
  const [errors, setErrors] = useState({});
  const [availabilityStatus, setAvailabilityStatus] = useState('unchecked');
  const [conflictDetails, setConflictDetails] = useState(null);
  const [alternativeTables, setAlternativeTables] = useState([]);
  const [tableAvailability, setTableAvailability] = useState({}); // Track availability for each table

  // Generate hour options (00-23)
  const hours = useMemo(() => {
    const hoursList = [];
    for (let i = 0; i < 24; i++) {
      hoursList.push({
        value: String(i).padStart(2, '0'),
        label: String(i).padStart(2, '0'),
      });
    }
    return hoursList;
  }, []);

  // Generate minute options (00-59)
  const minutes = useMemo(() => {
    const minutesList = [];
    for (let i = 0; i < 60; i++) {
      minutesList.push({
        value: String(i).padStart(2, '0'),
        label: String(i).padStart(2, '0'),
      });
    }
    return minutesList;
  }, []);

  // Generate dates (today + 30 days) - memoized
  const dates = useMemo(() => {
    const datesList = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      // Format date in local timezone (YYYY-MM-DD)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      datesList.push({
        id: i,
        label:
          i === 0
            ? 'Today'
            : i === 1
            ? 'Tomorrow'
            : date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }),
        dateValue: `${year}-${month}-${day}`,
        fullDate: date,
      });
    }
    return datesList;
  }, []);

  useEffect(() => {
    if (visible) {
      fetchGamesAndTables();
      // Set default date to today
      if (!selectedDate) {
        setSelectedDate(dates[0]);
      }
    }
  }, [visible]);

  useEffect(() => {
    // Filter tables by selected game
    if (selectedGame) {
      const gameId =
        selectedGame.gameid || selectedGame.game_id || selectedGame.id;
      const filtered = tables.filter(
        t => t.gameid === gameId || t.game_id === gameId,
      );
      setFilteredTables(filtered);
      // Reset selected table if it doesn't match the game
      if (
        selectedTable &&
        selectedTable.gameid !== gameId &&
        selectedTable.game_id !== gameId
      ) {
        setSelectedTable(null);
      }
    } else {
      setFilteredTables([]);
    }
  }, [selectedGame, tables]);

  // Check table availability when date/time changes
  useEffect(() => {
    if (selectedDate && selectedTime && filteredTables.length > 0) {
      checkTableAvailabilityForTime();
    } else {
      setTableAvailability({});
    }
  }, [selectedDate, selectedTime, filteredTables]);

  // Check availability when all required fields are filled
  useEffect(() => {
    // For timer: only need table and date (no duration required)
    // For set_time/frame: need table, date, and duration
    const canCheckAvailability =
      selectedTable &&
      selectedDate &&
      (bookingType === 'timer' || duration > 0);

    if (canCheckAvailability) {
      checkAvailability();
    }
  }, [selectedTable, selectedDate, duration, bookingType]);

  // Calculate amount based on table pricing, booking type, and duration
  useEffect(() => {
    if (selectedTable && paymentType && paymentType !== 'pay_later') {
      let calculatedAmount = 0;

      if (bookingType === 'frame') {
        // Frame-based: duration is frame count, use frameCharge
        const frameCharge = parseFloat(
          selectedTable.frameCharge || selectedTable.framecharge || 0,
        );
        calculatedAmount = duration * frameCharge;
      } else if (bookingType === 'set_time') {
        // Set time: use duration in minutes and pricePerMin
        const pricePerMin = parseFloat(
          selectedTable.pricePerMin || selectedTable.pricepermin || 0,
        );
        calculatedAmount = duration * pricePerMin;
      } else if (bookingType === 'timer') {
        // Timer mode: no predefined duration, set amount to 0 or ask for manual entry
        // Since timer counts up, we might want to set a default or leave it at 0
        calculatedAmount = 0;
      }

      // If pay_half, calculate half of the total
      if (paymentType === 'pay_half') {
        calculatedAmount = calculatedAmount / 2;
      }

      // Round to 2 decimal places
      calculatedAmount = Math.round(calculatedAmount * 100) / 100;

      // Set the amount
      setAmount(calculatedAmount.toString());
    } else if (paymentType === 'pay_later') {
      setAmount('0');
    }
  }, [selectedTable, bookingType, duration, paymentType]);

  const fetchGamesAndTables = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');

      // Fetch games
      const gamesResponse = await fetch(`${API_URL}/api/games`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const gamesData = await gamesResponse.json();
      console.log('Fetched games:', gamesData?.length || 0, 'games');
      console.log('RAW Games Data:', JSON.stringify(gamesData, null, 2));
      if (gamesData && gamesData.length > 0) {
        console.log('First game keys:', Object.keys(gamesData[0]));
        console.log('First game data:', gamesData[0]);
      }
      setGames(gamesData || []);

      // Fetch tables
      const tablesResponse = await fetch(`${API_URL}/api/tables`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const tablesData = await tablesResponse.json();
      console.log('Fetched tables response:', tablesData);
      // Backend returns { total, currentPage, data: [...] }
      const tablesList = tablesData.data || tablesData || [];
      console.log('Tables list:', tablesList?.length || 0, 'tables');
      if (tablesList && tablesList.length > 0) {
        console.log('First table:', tablesList[0]);
      }
      setTables(tablesList);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load games and tables');
    } finally {
      setLoading(false);
    }
  };

  const checkTableAvailabilityForTime = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Fetch all reservations and active tables
      const [resResponse, activeResponse] = await Promise.all([
        fetch(`${API_URL}/api/reservations`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/api/activetables`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const allReservations = await resResponse.json();
      const activeTables = await activeResponse.json();

      // Check each filtered table for conflicts
      const availability = {};
      const requestedDate = selectedDate.dateValue;
      const requestedTime = selectedTime;

      if (!requestedTime) {
        setTableAvailability({});
        return;
      }

      // Create datetime for the requested slot
      const requestedStart = new Date(`${requestedDate}T${requestedTime}`);
      const requestedDuration = duration || 60;
      const requestedEnd = new Date(
        requestedStart.getTime() + requestedDuration * 60000,
      );

      filteredTables.forEach(table => {
        let hasConflict = false;

        // Check reservations
        const tableReservations = allReservations.filter(
          r =>
            (r.tableId === table.id ||
              r.tableid === table.id ||
              r.table_id === table.id) &&
            (r.status === 'pending' ||
              r.status === 'confirmed' ||
              r.status === 'active') &&
            r.reservation_date === requestedDate,
        );

        // Check for time overlap with reservations
        tableReservations.forEach(res => {
          const resStart = new Date(
            `${res.reservation_date}T${res.start_time}`,
          );
          const resDuration = res.duration_minutes || 60;
          const resEnd = new Date(resStart.getTime() + resDuration * 60000);

          // Check if there's an overlap
          if (requestedStart < resEnd && requestedEnd > resStart) {
            hasConflict = true;
          }
        });

        // For current day, also check active tables
        const today = new Date().toISOString().split('T')[0];
        if (requestedDate === today) {
          const activeTable = Array.isArray(activeTables)
            ? activeTables.find(
                at => at.table_id === table.id || at.tableid === table.id,
              )
            : null;

          if (activeTable) {
            // Table is currently in use, check if it will be free by requested time
            const now = new Date();
            if (requestedStart <= now) {
              // Requested time is now or in the past, table is occupied
              hasConflict = true;
            }
          }
        }

        availability[table.id] = hasConflict ? 'reserved' : 'available';
      });

      setTableAvailability(availability);
    } catch (error) {
      console.error('Error checking table availability:', error);
      setTableAvailability({});
    }
  };

  const checkAvailability = async () => {
    try {
      setAvailabilityStatus('checking');
      setConflictDetails(null);
      setAlternativeTables([]);

      const token = await AsyncStorage.getItem('authToken');

      // Fetch all reservations
      const response = await fetch(`${API_URL}/api/reservations`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check availability');
      }

      const allReservations = await response.json();

      // Check for time-based conflicts
      const requestedDate = selectedDate.dateValue;
      const requestedTime = selectedTime;
      const requestedStart = new Date(`${requestedDate}T${requestedTime}`);
      const requestedDuration = duration || 60;
      const requestedEnd = new Date(
        requestedStart.getTime() + requestedDuration * 60000,
      );

      // Filter for this table on this date with time overlap
      const tableReservations = allReservations.filter(
        r =>
          (r.tableId === selectedTable.id ||
            r.tableid === selectedTable.id ||
            r.table_id === selectedTable.id) &&
          (r.status === 'pending' ||
            r.status === 'confirmed' ||
            r.status === 'active') &&
          r.reservation_date === requestedDate,
      );

      // Check for time overlap
      let hasConflict = false;
      let conflictReservation = null;

      tableReservations.forEach(res => {
        const resStart = new Date(`${res.reservation_date}T${res.start_time}`);
        const resDuration = res.duration_minutes || 60;
        const resEnd = new Date(resStart.getTime() + resDuration * 60000);

        if (requestedStart < resEnd && requestedEnd > resStart) {
          hasConflict = true;
          conflictReservation = res;
        }
      });

      if (hasConflict) {
        setAvailabilityStatus('conflict');
        setConflictDetails(conflictReservation);
        await findAlternatives(selectedDate.dateValue);
      } else {
        setAvailabilityStatus('available');
      }
    } catch (error) {
      console.error('Error checking availability:', error);
      setAvailabilityStatus('unchecked');
    }
  };

  const findAlternatives = async date => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // Find alternative tables in the same game
      const altTables = filteredTables.filter(t => t.id !== selectedTable.id);

      const response = await fetch(`${API_URL}/api/reservations`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const allReservations = await response.json();

      // Check which alternative tables are available on this date
      const availableAlts = altTables.filter(tableOption => {
        const tableRes = allReservations.filter(
          r =>
            (r.tableId === tableOption.id ||
              r.tableid === tableOption.id ||
              r.table_id === tableOption.id) &&
            (r.status === 'pending' || r.status === 'active') &&
            r.reservation_date === date,
        );

        return tableRes.length === 0; // Table is available if no reservations on this date
      });

      setAlternativeTables(availableAlts.slice(0, 5));
    } catch (error) {
      console.error('Error finding alternatives:', error);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Customer name validation
    if (!customerName.trim()) {
      newErrors.customerName = 'Customer name is required';
    } else if (customerName.trim().length < 2) {
      newErrors.customerName = 'Name must be at least 2 characters';
    } else if (customerName.trim().length > 50) {
      newErrors.customerName = 'Name must be less than 50 characters';
    } else if (!/^[a-zA-Z\s-]+$/.test(customerName.trim())) {
      newErrors.customerName =
        'Please enter a valid name (letters, spaces, hyphens only)';
    }

    // Phone validation
    if (!customerPhone.trim()) {
      newErrors.customerPhone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(customerPhone.replace(/\D/g, ''))) {
      newErrors.customerPhone = 'Phone number must be exactly 10 digits';
    }

    // Game selection
    if (!selectedGame) {
      newErrors.selectedGame = 'Please select a game';
    }

    // Table selection
    if (!selectedTable) {
      newErrors.selectedTable = 'Please select a table';
    }

    // Date selection
    if (!selectedDate) {
      newErrors.selectedDate = 'Please select a date';
    } else {
      // Check if date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDateObj = new Date(selectedDate.dateValue);

      if (selectedDateObj < today) {
        newErrors.selectedDate = 'Cannot book for past dates';
      }
    }

    // Time selection
    if (!selectedTime) {
      newErrors.selectedTime = 'Please select a time';
    } else if (selectedDate) {
      // If booking for today, check if time is in the past
      const today = new Date();
      const selectedDateObj = new Date(selectedDate.dateValue);

      // Check if selected date is today
      if (
        selectedDateObj.getFullYear() === today.getFullYear() &&
        selectedDateObj.getMonth() === today.getMonth() &&
        selectedDateObj.getDate() === today.getDate()
      ) {
        // Parse selected time
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const selectedDateTime = new Date();
        selectedDateTime.setHours(hours, minutes, 0, 0);

        const now = new Date();

        if (selectedDateTime < now) {
          newErrors.selectedTime =
            'Cannot book for past time. Please select a time from now onwards.';
        }
      }
    }

    // Duration validation - only for set_time and frame, not for timer
    if (bookingType === 'frame') {
      if (duration < 1) {
        newErrors.duration = 'Minimum 1 frame required';
      } else if (duration > 20) {
        newErrors.duration = 'Maximum 20 frames allowed';
      }
    } else if (bookingType === 'set_time') {
      if (duration < 30) {
        newErrors.duration = 'Minimum duration is 30 minutes';
      } else if (duration > 480) {
        newErrors.duration = 'Maximum duration is 8 hours';
      }
    }
    // No validation needed for 'timer' - it counts up from 0

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again');
      return;
    }

    if (availabilityStatus === 'conflict') {
      Alert.alert(
        'Time Conflict',
        'This time slot has a potential conflict. Do you want to proceed anyway?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed Anyway',
            onPress: () => setShowPaymentStep(true),
          },
        ],
      );
      return;
    }

    setShowPaymentStep(true);
  };

  const handleSubmit = async (acknowledgeConflicts = false) => {
    // Validate payment type
    if (!paymentType) {
      Alert.alert('Error', 'Please select a payment option');
      return;
    }

    // Validate timer bookings must use pay_later
    if (bookingType === 'timer' && paymentType !== 'pay_later') {
      Alert.alert(
        'Invalid Payment Option',
        'Timer bookings require "Pay Later" since the amount is calculated after the session ends.',
      );
      return;
    }

    // Validate payment details for Pay Now and Pay Half
    if (paymentType !== 'pay_later') {
      if (!paymentMode) {
        Alert.alert('Error', 'Please select a payment mode');
        return;
      }

      if (!amount || parseFloat(amount) <= 0) {
        Alert.alert(
          'Error',
          'Amount could not be calculated. Please check table pricing settings.',
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const token = await AsyncStorage.getItem('authToken');

      // Validate data before sending
      if (!selectedTable?.id) {
        Alert.alert('Error', 'Please select a valid table');
        setSubmitting(false);
        return;
      }

      if (!selectedDate?.dateValue) {
        Alert.alert('Error', 'Please select a valid date');
        setSubmitting(false);
        return;
      }

      if (!selectedTime) {
        Alert.alert('Error', 'Please select a valid time');
        setSubmitting(false);
        return;
      }

      const reservationData = {
        table_id: selectedTable.id,
        game_id: selectedGame.gameid || selectedGame.game_id || selectedGame.id,
        customer_name: customerName.trim(),
        customer_phone: customerPhone.replace(/\D/g, ''),
        reservation_date: selectedDate.dateValue,
        start_time:
          selectedTime.includes(':') && selectedTime.split(':').length === 2
            ? `${selectedTime}:00`
            : selectedTime,
        booking_type: bookingType,
        duration_minutes:
          bookingType === 'timer'
            ? null
            : bookingType === 'frame'
            ? null
            : duration,
        frame_count: bookingType === 'frame' ? duration : null,
        notes: '',
        payment_status:
          paymentType === 'pay_now'
            ? 'paid'
            : paymentType === 'pay_half'
            ? 'partial'
            : 'pending',
        advance_payment: paymentType === 'pay_later' ? 0 : parseFloat(amount),
        acknowledge_conflicts: acknowledgeConflicts,
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

      // Handle BOOKING_WARNING as a conflict that needs confirmation
      if (response.status === 409 && result.error === 'BOOKING_WARNING') {
        setSubmitting(false);
        Alert.alert(
          'Booking Conflict',
          result.message ||
            'There is a potential time conflict. Do you want to proceed anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed Anyway',
              onPress: () => handleSubmit(true), // Retry with acknowledgment
            },
          ],
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.error || result.message || 'Failed to create reservation',
        );
      }

      Alert.alert('Success', 'Reservation created successfully!');

      // Emit event to refresh HomeScreen and update table status
      eventEmitter.emit('REFRESH_TABLES');

      resetForm();
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error creating reservation:', error);
      Alert.alert('Error', error.message || 'Failed to create reservation');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerName('');
    setCustomerPhone('');
    setSelectedGame(null);
    setSelectedTable(null);
    setSelectedDate(dates[0]);
    setSelectedTime(null);
    setSelectedHour(null);
    setSelectedMinute(null);
    setBookingType('timer');
    setDuration(60);
    setShowPaymentStep(false);
    setPaymentType(null);
    setPaymentMode(null);
    setAmount('');
    setErrors({});
    setAvailabilityStatus('unchecked');
    setConflictDetails(null);
  };

  const formatPhoneNumber = text => {
    const cleaned = text.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join('-');
    }
    return text;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (showPaymentStep) {
                setShowPaymentStep(false);
              } else {
                onClose();
              }
            }}
          >
            <Icon
              name={showPaymentStep ? 'arrow-back' : 'close'}
              size={28}
              color="#333"
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showPaymentStep ? 'Payment Details' : 'New Reservation'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {!showPaymentStep ? (
          <>
            {/* Reservation Form */}
            <ScrollView style={styles.formContainer}>
              {/* Section 1: Customer Information */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Customer Information</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Customer Name <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.customerName && styles.inputError,
                    ]}
                    placeholder="Enter customer name"
                    value={customerName}
                    onChangeText={setCustomerName}
                    maxLength={50}
                  />
                  {errors.customerName && (
                    <Text style={styles.errorText}>{errors.customerName}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Phone Number <Text style={styles.required}>*</Text>
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      errors.customerPhone && styles.inputError,
                    ]}
                    placeholder="XXX-XXX-XXXX"
                    value={formatPhoneNumber(customerPhone)}
                    onChangeText={text =>
                      setCustomerPhone(text.replace(/\D/g, ''))
                    }
                    keyboardType="phone-pad"
                    maxLength={12}
                  />
                  {errors.customerPhone && (
                    <Text style={styles.errorText}>{errors.customerPhone}</Text>
                  )}
                </View>
              </View>

              {/* Section 2: Game & Table Selection */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Game & Table</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Select Game <Text style={styles.required}>*</Text>
                  </Text>
                  {loading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#FF8C42" />
                      <Text style={styles.loadingText}>Loading games...</Text>
                    </View>
                  ) : games.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Icon
                        name="game-controller-outline"
                        size={40}
                        color="#CCC"
                      />
                      <Text style={styles.emptyText}>No games available</Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={
                          selectedGame?.gameid ||
                          selectedGame?.game_id ||
                          selectedGame?.id ||
                          ''
                        }
                        onValueChange={itemValue => {
                          const game = games.find(
                            g => (g.gameid || g.game_id || g.id) === itemValue,
                          );
                          setSelectedGame(game || null);
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a game..." value="" />
                        {games.map(game => (
                          <Picker.Item
                            key={game.gameid || game.game_id || game.id}
                            label={
                              game.gamename ||
                              game.game_name ||
                              game.name ||
                              'Unnamed Game'
                            }
                            value={game.gameid || game.game_id || game.id}
                          />
                        ))}
                      </Picker>
                    </View>
                  )}
                  {errors.selectedGame && (
                    <Text style={styles.errorText}>{errors.selectedGame}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Select Table <Text style={styles.required}>*</Text>
                  </Text>
                  {!selectedGame ? (
                    <View
                      style={[styles.pickerContainer, styles.pickerDisabled]}
                    >
                      <Picker enabled={false} style={styles.picker}>
                        <Picker.Item label="Select a game first..." value="" />
                      </Picker>
                    </View>
                  ) : filteredTables.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Square size={40} color="#CCC" />
                      <Text style={styles.emptyText}>
                        No tables available for this game
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedTable?.id || ''}
                        onValueChange={itemValue => {
                          const table = filteredTables.find(
                            t => t.id === itemValue,
                          );
                          if (table && table.status === 'available') {
                            setSelectedTable(table);
                          }
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a table..." value="" />
                        {filteredTables.map(table => {
                          const tableName =
                            table.name ||
                            table.tablename ||
                            `Table ${table.id}`;
                          let statusLabel = '';
                          let isEnabled = true;

                          // For future bookings, check time-slot availability
                          if (selectedDate && selectedTime) {
                            const tableStatus = tableAvailability[table.id];
                            if (tableStatus === 'reserved') {
                              statusLabel = ' (Reserved)';
                              isEnabled = false;
                            } else if (tableStatus === 'available') {
                              statusLabel = ' (Available)';
                              isEnabled = true;
                            } else {
                              // No status yet, check table maintenance
                              if (table.status === 'maintenance') {
                                statusLabel = ' (Maintenance)';
                                isEnabled = false;
                              } else {
                                statusLabel = '';
                                isEnabled = true;
                              }
                            }
                          } else {
                            // No date/time selected, show current status
                            if (table.status === 'maintenance') {
                              statusLabel = ' (Maintenance)';
                              isEnabled = false;
                            }
                          }

                          return (
                            <Picker.Item
                              key={table.id}
                              label={tableName + statusLabel}
                              value={table.id}
                              enabled={isEnabled}
                            />
                          );
                        })}
                      </Picker>
                    </View>
                  )}
                  {errors.selectedTable && (
                    <Text style={styles.errorText}>{errors.selectedTable}</Text>
                  )}
                </View>
              </View>

              {/* Section 3: Date & Time */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date & Time</Text>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Reservation Date <Text style={styles.required}>*</Text>
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.dateGrid}>
                      {dates.slice(0, 7).map(date => (
                        <TouchableOpacity
                          key={date.id}
                          style={[
                            styles.dateCard,
                            selectedDate?.id === date.id &&
                              styles.dateCardSelected,
                          ]}
                          onPress={() => setSelectedDate(date)}
                        >
                          <Text
                            style={[
                              styles.dateCardText,
                              selectedDate?.id === date.id &&
                                styles.dateCardTextSelected,
                            ]}
                          >
                            {date.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {errors.selectedDate && (
                    <Text style={styles.errorText}>{errors.selectedDate}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Reservation Time <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.timePickerRow}>
                    <View
                      style={[
                        styles.pickerContainer,
                        { flex: 1, marginRight: 8 },
                      ]}
                    >
                      <Picker
                        selectedValue={selectedHour}
                        onValueChange={itemValue => {
                          setSelectedHour(itemValue);
                          // Update selectedTime when both hour and minute are set
                          if (itemValue && selectedMinute) {
                            setSelectedTime(`${itemValue}:${selectedMinute}`);
                          }
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Hour" value={null} />
                        {hours.map(hour => (
                          <Picker.Item
                            key={hour.value}
                            label={hour.label}
                            value={hour.value}
                          />
                        ))}
                      </Picker>
                    </View>
                    <Text style={styles.timeSeparator}>:</Text>
                    <View
                      style={[
                        styles.pickerContainer,
                        { flex: 1, marginLeft: 8 },
                      ]}
                    >
                      <Picker
                        selectedValue={selectedMinute}
                        onValueChange={itemValue => {
                          setSelectedMinute(itemValue);
                          // Update selectedTime when both hour and minute are set
                          if (selectedHour && itemValue) {
                            setSelectedTime(`${selectedHour}:${itemValue}`);
                          }
                        }}
                        style={styles.picker}
                      >
                        <Picker.Item label="Minute" value={null} />
                        {minutes.map(minute => (
                          <Picker.Item
                            key={minute.value}
                            label={minute.label}
                            value={minute.value}
                          />
                        ))}
                      </Picker>
                    </View>
                  </View>
                  {errors.selectedTime && (
                    <Text style={styles.errorText}>{errors.selectedTime}</Text>
                  )}
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>
                    Booking Type <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.bookingTypeContainer}>
                    <TouchableOpacity
                      style={[
                        styles.bookingTypeButton,
                        bookingType === 'timer' &&
                          styles.bookingTypeButtonSelected,
                      ]}
                      onPress={() => {
                        setBookingType('timer');
                        // Timer has no preset duration - it counts up from 0
                        // Auto-select Pay Later for timer mode
                        setPaymentType('pay_later');
                        setPaymentMode(null);
                        setAmount('0');
                      }}
                    >
                      <Timer
                        size={24}
                        color={bookingType === 'timer' ? '#FF8C42' : '#666'}
                      />
                      <Text
                        style={[
                          styles.bookingTypeText,
                          bookingType === 'timer' &&
                            styles.bookingTypeTextSelected,
                        ]}
                      >
                        Timer
                      </Text>
                      <Text style={styles.bookingTypeSubtext}>
                        Counts from 0
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bookingTypeButton,
                        bookingType === 'set_time' &&
                          styles.bookingTypeButtonSelected,
                      ]}
                      onPress={() => {
                        setBookingType('set_time');
                        setDuration(60);
                        // Reset payment type to allow all options
                        if (paymentType === 'pay_later') {
                          setPaymentType(null);
                          setPaymentMode(null);
                          setAmount('');
                        }
                      }}
                    >
                      <Clock
                        size={24}
                        color={bookingType === 'set_time' ? '#FF8C42' : '#666'}
                      />
                      <Text
                        style={[
                          styles.bookingTypeText,
                          bookingType === 'set_time' &&
                            styles.bookingTypeTextSelected,
                        ]}
                      >
                        Set Time
                      </Text>
                      <Text style={styles.bookingTypeSubtext}>
                        Fixed duration
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.bookingTypeButton,
                        bookingType === 'frame' &&
                          styles.bookingTypeButtonSelected,
                      ]}
                      onPress={() => {
                        setBookingType('frame');
                        setDuration(1); // 1 frame as default
                        // Reset payment type to allow all options
                        if (paymentType === 'pay_later') {
                          setPaymentType(null);
                          setPaymentMode(null);
                          setAmount('');
                        }
                      }}
                    >
                      <Grid
                        size={24}
                        color={bookingType === 'frame' ? '#FF8C42' : '#666'}
                      />
                      <Text
                        style={[
                          styles.bookingTypeText,
                          bookingType === 'frame' &&
                            styles.bookingTypeTextSelected,
                        ]}
                      >
                        Frame
                      </Text>
                      <Text style={styles.bookingTypeSubtext}>
                        Per game frame
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Duration/Frame field - only show for Set Time and Frame */}
                {bookingType !== 'timer' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>
                      {bookingType === 'frame'
                        ? 'Number of Frames'
                        : 'Duration'}{' '}
                      <Text style={styles.required}>*</Text>
                    </Text>
                    <View style={styles.durationContainer}>
                      <TouchableOpacity
                        style={styles.durationButton}
                        onPress={() => {
                          if (bookingType === 'frame') {
                            setDuration(Math.max(1, duration - 1));
                          } else {
                            setDuration(Math.max(30, duration - 30));
                          }
                        }}
                      >
                        <Minus size={20} color="#666" />
                      </TouchableOpacity>
                      <View style={styles.durationDisplay}>
                        <Text style={styles.durationValue}>{duration}</Text>
                        <Text style={styles.durationUnit}>
                          {bookingType === 'frame' ? 'frames' : 'minutes'}
                        </Text>
                        {bookingType !== 'frame' && (
                          <Text style={styles.durationHours}>
                            ({Math.floor(duration / 60)}h {duration % 60}m)
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.durationButton}
                        onPress={() => {
                          if (bookingType === 'frame') {
                            setDuration(Math.min(20, duration + 1));
                          } else {
                            setDuration(Math.min(480, duration + 30));
                          }
                        }}
                      >
                        <Plus size={20} color="#666" />
                      </TouchableOpacity>
                    </View>
                    {errors.duration && (
                      <Text style={styles.errorText}>{errors.duration}</Text>
                    )}
                  </View>
                )}

                {/* Availability Status */}
                {availabilityStatus === 'checking' && (
                  <View style={styles.availabilityBanner}>
                    <ActivityIndicator size="small" color="#2196F3" />
                    <Text style={styles.availabilityText}>
                      Checking availability...
                    </Text>
                  </View>
                )}

                {availabilityStatus === 'available' && (
                  <View
                    style={[
                      styles.availabilityBanner,
                      styles.availabilitySuccess,
                    ]}
                  >
                    <CheckCircle2 size={24} color="#4CAF50" />
                    <Text style={styles.availabilitySuccessText}>
                      Available!
                    </Text>
                  </View>
                )}

                {availabilityStatus === 'conflict' && (
                  <>
                    <View
                      key="conflict-banner"
                      style={[
                        styles.availabilityBanner,
                        styles.availabilityError,
                      ]}
                    >
                      <AlertCircle size={24} color="#F44336" />
                      <View>
                        <Text style={styles.availabilityErrorText}>
                          Time Conflict
                        </Text>
                        <Text style={styles.availabilityErrorSubtext}>
                          Reserved by{' '}
                          {conflictDetails?.customerName || 'another customer'}
                        </Text>
                      </View>
                    </View>

                    {alternativeTables.length > 0 && (
                      <View
                        key="alternative-tables"
                        style={styles.alternativesSection}
                      >
                        <Text style={styles.alternativesTitle}>
                          Try These Tables
                        </Text>
                        {alternativeTables.map(altTable => (
                          <TouchableOpacity
                            key={altTable.id}
                            style={styles.alternativeCard}
                            onPress={() => {
                              setSelectedTable(altTable);
                              setAvailabilityStatus('unchecked');
                            }}
                          >
                            <ArrowRightLeft
                              size={20}
                              color="#4CAF50"
                            />
                            <Text style={styles.alternativeText}>
                              {altTable.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}
              </View>
            </ScrollView>
          </>
        ) : (
          // Payment Step
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              {/* Booking Summary */}
              <View style={styles.summarySection}>
                <Text style={styles.sectionTitle}>Booking Summary</Text>
                <View style={styles.summaryCard}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Customer:</Text>
                    <Text style={styles.summaryValue}>{customerName}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Phone:</Text>
                    <Text style={styles.summaryValue}>{customerPhone}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Game:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedGame?.name}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Table:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedTable?.name}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Date:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedDate?.label}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Time:</Text>
                    <Text style={styles.summaryValue}>
                      {selectedTime
                        ? (() => {
                            const [h, m] = selectedTime.split(':');
                            const hour = parseInt(h, 10);
                            const displayHour =
                              hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                            const period = hour >= 12 ? 'PM' : 'AM';
                            return `${displayHour}:${m} ${period}`;
                          })()
                        : 'Not selected'}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Booking Type:</Text>
                    <Text style={styles.summaryValue}>
                      {bookingType === 'timer'
                        ? 'Timer Mode'
                        : bookingType === 'frame'
                        ? `Frame Mode (${duration} frames)`
                        : `Set Time (${duration} min)`}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Payment Type Selection */}
              <View style={styles.paymentSection}>
                <Text style={styles.sectionTitle}>Payment Option</Text>

                {/* Show info message for Timer mode */}
                {bookingType === 'timer' && (
                  <View style={styles.timerPaymentInfo}>
                    <Icon
                      name="information-circle-outline"
                      size={20}
                      color="#2196F3"
                    />
                    <Text style={styles.timerPaymentInfoText}>
                      Timer bookings require payment after session ends
                    </Text>
                  </View>
                )}

                <View style={styles.paymentTypeContainer}>
                  {/* Hide Pay Now and Pay Half for Timer mode */}
                  {bookingType !== 'timer' && (
                    <>
                      <TouchableOpacity
                        style={[
                          styles.paymentTypeButton,
                          paymentType === 'pay_now' &&
                            styles.paymentTypeButtonActive,
                        ]}
                        onPress={() => {
                          setPaymentType('pay_now');
                          setPaymentMode(null);
                          setAmount('');
                        }}
                      >
                        <CheckCircle2
                          size={24}
                          color={paymentType === 'pay_now' ? '#4CAF50' : '#666'}
                        />
                        <Text
                          style={[
                            styles.paymentTypeButtonText,
                            paymentType === 'pay_now' &&
                              styles.paymentTypeButtonTextActive,
                          ]}
                        >
                          Pay Now
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.paymentTypeButton,
                          paymentType === 'pay_half' &&
                            styles.paymentTypeButtonActive,
                        ]}
                        onPress={() => {
                          setPaymentType('pay_half');
                          setPaymentMode(null);
                          setAmount('');
                        }}
                      >
                        <Icon
                          name="swap-horizontal-outline"
                          size={24}
                          color={
                            paymentType === 'pay_half' ? '#4CAF50' : '#666'
                          }
                        />
                        <Text
                          style={[
                            styles.paymentTypeButtonText,
                            paymentType === 'pay_half' &&
                              styles.paymentTypeButtonTextActive,
                          ]}
                        >
                          Pay Half
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.paymentTypeButton,
                      paymentType === 'pay_later' &&
                        styles.paymentTypeButtonActive,
                      bookingType === 'timer' && styles.paymentTypeButtonFull,
                    ]}
                    onPress={() => {
                      setPaymentType('pay_later');
                      setPaymentMode(null);
                      setAmount('');
                    }}
                  >
                    <Clock
                      size={24}
                      color={paymentType === 'pay_later' ? '#4CAF50' : '#666'}
                    />
                    <Text
                      style={[
                        styles.paymentTypeButtonText,
                        paymentType === 'pay_later' &&
                          styles.paymentTypeButtonTextActive,
                      ]}
                    >
                      Pay Later
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Payment Method Selection - Only show if not Pay Later */}
              {paymentType && paymentType !== 'pay_later' && (
                <View style={styles.paymentSection}>
                  <Text style={styles.sectionTitle}>Payment Method</Text>
                  <View style={styles.paymentButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMode === 'cash' && styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMode('cash')}
                    >
                      <Banknote
                        size={24}
                        color={paymentMode === 'cash' ? '#4CAF50' : '#666'}
                      />
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMode === 'cash' &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Cash
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMode === 'upi' && styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMode('upi')}
                    >
                      <Icon
                        name="phone-portrait-outline"
                        size={24}
                        color={paymentMode === 'upi' ? '#4CAF50' : '#666'}
                      />
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMode === 'upi' &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        UPI
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.paymentButton,
                        paymentMode === 'wallet' && styles.paymentButtonActive,
                      ]}
                      onPress={() => setPaymentMode('wallet')}
                    >
                      <Wallet
                        size={24}
                        color={paymentMode === 'wallet' ? '#4CAF50' : '#666'}
                      />
                      <Text
                        style={[
                          styles.paymentButtonText,
                          paymentMode === 'wallet' &&
                            styles.paymentButtonTextActive,
                        ]}
                      >
                        Wallet
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Amount Input - Only show if not Pay Later */}
              {paymentType && paymentType !== 'pay_later' && (
                <View style={styles.amountSection}>
                  <Text style={styles.sectionTitle}>
                    {paymentType === 'pay_half'
                      ? 'Advance Amount (Half)'
                      : 'Full Amount'}
                  </Text>
                  <View style={styles.inputContainer}>
                    <Banknote
                      size={20}
                      color="#666"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, styles.inputReadOnly]}
                      placeholder="Calculated amount"
                      value={amount}
                      editable={false}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                  {bookingType === 'timer' && (
                    <Text style={styles.helperText}>
                      Timer mode: Amount will be calculated after session ends
                    </Text>
                  )}
                  {bookingType === 'frame' && selectedTable && (
                    <Text style={styles.helperText}>
                      {duration} frame{duration > 1 ? 's' : ''} × ₹
                      {selectedTable.frameCharge ||
                        selectedTable.framecharge ||
                        0}{' '}
                      per frame
                      {paymentType === 'pay_half' ? ' ÷ 2 (Half Payment)' : ''}
                    </Text>
                  )}
                  {bookingType === 'set_time' && selectedTable && (
                    <Text style={styles.helperText}>
                      {duration} minutes × ₹
                      {selectedTable.pricePerMin ||
                        selectedTable.pricepermin ||
                        0}{' '}
                      per minute
                      {paymentType === 'pay_half' ? ' ÷ 2 (Half Payment)' : ''}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        {/* Fixed Bottom Button */}
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.createButton,
              (submitting ||
                (!showPaymentStep && availabilityStatus === 'conflict')) &&
                styles.createButtonDisabled,
            ]}
            onPress={showPaymentStep ? handleSubmit : handleProceedToPayment}
            disabled={
              submitting ||
              (!showPaymentStep && availabilityStatus === 'conflict')
            }
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <CheckCircle2 size={24} color="#FFF" />
                <Text style={styles.createButtonText}>
                  {showPaymentStep ? 'Confirm Payment' : 'Create Reservation'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  formContainer: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFF',
    marginBottom: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#FF8C42',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  inputReadOnly: {
    backgroundColor: '#F5F5F5',
    color: '#666',
  },
  inputError: {
    borderColor: '#F44336',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    fontStyle: 'italic',
  },
  errorText: {
    color: '#F44336',
    fontSize: 13,
    marginTop: 4,
  },
  pickerContainer: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 4,
  },
  picker: {
    height: 50,
  },
  pickerDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#DDD',
    opacity: 0.6,
  },
  bookingTypeContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  bookingTypeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingTypeButtonSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
  },
  bookingTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 6,
  },
  bookingTypeTextSelected: {
    color: '#FF8C42',
  },
  bookingTypeSubtext: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignSelf: 'flex-start',
  },
  stepperButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  stepperDisplay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gameCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    gap: 8,
  },
  gameCardSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
  },
  gameCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  gameCardTextSelected: {
    color: '#FF8C42',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  tableCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 100,
    gap: 8,
    position: 'relative',
  },
  tableCardSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
  },
  tableCardDisabled: {
    opacity: 0.5,
  },
  tableCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  tableCardTextSelected: {
    color: '#FF8C42',
  },
  tableCardTextDisabled: {
    color: '#CCC',
  },
  statusDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  dateCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  dateCardSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
  },
  dateCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dateCardTextSelected: {
    color: '#FF8C42',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 8,
  },
  timeCard: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  timeCardSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF3E0',
  },
  timeCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeCardTextSelected: {
    color: '#FF8C42',
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  durationButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  durationDisplay: {
    flex: 1,
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FF8C42',
  },
  durationUnit: {
    fontSize: 14,
    color: '#666',
  },
  durationHours: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  availabilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 10,
    backgroundColor: '#E3F2FD',
    marginVertical: 12,
    gap: 12,
  },
  availabilityText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600',
  },
  availabilitySuccess: {
    backgroundColor: '#E8F5E9',
  },
  availabilitySuccessText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },
  availabilityError: {
    backgroundColor: '#FFEBEE',
  },
  availabilityErrorText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F44336',
  },
  availabilityErrorSubtext: {
    fontSize: 13,
    color: '#F44336',
    marginTop: 2,
  },
  alternativesSection: {
    marginVertical: 8,
  },
  alternativesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  alternativeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 10,
  },
  alternativeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  bottomButtonContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
  },
  createButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#CCC',
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  // Payment Step Styles
  summarySection: {
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  paymentSection: {
    marginBottom: 20,
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentTypeButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  paymentTypeButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  paymentTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentTypeButtonTextActive: {
    color: '#4CAF50',
  },
  paymentTypeButtonFull: {
    flex: 0,
    minWidth: '100%',
  },
  timerPaymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  timerPaymentInfoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  paymentButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  paymentButtonActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8F4',
  },
  paymentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentButtonTextActive: {
    color: '#4CAF50',
  },
  amountSection: {
    marginBottom: 20,
  },
});

export default ReservationFormModal;
