import React, { useState, useRef, useEffect } from 'react';
import { AlertCircle, Clock, User, Grid, Calendar, Settings } from 'lucide-react-native';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../components/common/Header';
import HeaderTabs from '../../components/common/HeaderTabs';
import TableCard from '../../components/tablebooking/TableCard';
import { API_URL } from '../../config';
import eventEmitter from '../../utils/eventEmitter';
import {
  startQueueMonitoring,
  stopQueueMonitoring,
  pollQueueAssignments,
} from '../../utils/queueAutoAssignment';
import {
  startReservationMonitoring,
  stopReservationMonitoring,
  triggerReservationCheck,
} from '../../utils/reservationMonitoring';

const { width } = Dimensions.get('window');

// Game colors for different game types (fallback if no image)
const GAME_COLORS = {
  snooker: '#4A7C59',
  pool: '#2E5F8A',
  billiards: '#8B4513',
  default: '#FF8C42',
};

// Helper to get full image URL from image_key
const getGameImageUrl = imageKey => {
  if (!imageKey) return null;
  return `${API_URL}/static/game-images/${encodeURIComponent(imageKey)}`;
};

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [gameData, setGameData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const flatListRef = useRef(null);

  // Reservation states
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [startingSession, setStartingSession] = useState(false);

  // Add event listener for table updates with ref trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const refreshSubscription = eventEmitter.addListener(
      'REFRESH_TABLES',
      () => {
        console.log('Received REFRESH_TABLES event, triggering refresh...');
        setRefreshTrigger(prev => prev + 1);
      },
    );

    // Add listener for reservation ready notifications
    const reservationReadySubscription = eventEmitter.addListener(
      'RESERVATION_READY',
      reservation => {
        console.log('Reservation ready notification:', reservation);

        // Show alert/modal for upcoming reservation
        Alert.alert(
          'Reservation Ready',
          `Customer ${
            reservation.customerName || reservation.customer_name
          } has a reservation now. Start the session?`,
          [
            {
              text: 'Later',
              style: 'cancel',
            },
            {
              text: 'Start Session',
              onPress: () => {
                setSelectedReservation(reservation);
                setShowStartSessionModal(true);
              },
            },
          ],
          { cancelable: false },
        );
      },
    );

    return () => {
      refreshSubscription.remove();
      reservationReadySubscription.remove();
    };
  }, []);

  // Effect to handle actual data fetching when trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Refreshing tables with full reload...');
      fetchGamesAndTables(); // Trigger full loading state as requested
    }
  }, [refreshTrigger]);

  const fetchGamesAndTables = async (isSilent = false) => {
    const token = await getAuthToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching games and tables...');

      // Add timeout for each request
      const timeout = 15000; // 15 seconds timeout

      // Fetch games with timeout
      const gamesResponse = await Promise.race([
        fetch(`${API_URL}/api/games`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Games request timeout')), timeout),
        ),
      ]);

      if (!gamesResponse.ok) {
        throw new Error(`Games API failed: ${gamesResponse.status}`);
      }

      const gamesResult = await gamesResponse.json();
      const games = Array.isArray(gamesResult)
        ? gamesResult
        : gamesResult.games || gamesResult.data || [];

      console.log('Games fetched successfully:', games.length);

      // Fetch tables with timeout
      const tablesResponse = await Promise.race([
        fetch(`${API_URL}/api/tables`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Tables request timeout')),
            timeout,
          ),
        ),
      ]);

      if (!tablesResponse.ok) {
        throw new Error(`Tables API failed: ${tablesResponse.status}`);
      }

      const tablesResult = await tablesResponse.json();
      console.log('Raw tables response:', tablesResult);
      const tables = Array.isArray(tablesResult)
        ? tablesResult
        : tablesResult.data || tablesResult.tables || [];

      console.log('Tables fetched successfully:', tables.length);

      // Fetch active sessions
      let activeSessions = [];
      try {
        const activeResponse = await fetch(`${API_URL}/api/activeTables`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (activeResponse.ok) {
          const activeResult = await activeResponse.json();
          activeSessions = Array.isArray(activeResult)
            ? activeResult
            : activeResult.sessions || activeResult.data || [];
        }
      } catch (err) {
        console.log('No active sessions endpoint or error:', err);
      }

      console.log('Fetched games:', games);
      console.log('Fetched tables:', tables);
      console.log('Fetched active sessions:', activeSessions);

      // Fetch pending reservations to mark tables as reserved
      let pendingReservationsData = [];
      try {
        const reservationsResponse = await fetch(
          `${API_URL}/api/reservations`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (reservationsResponse.ok) {
          const reservationsResult = await reservationsResponse.json();
          pendingReservationsData = Array.isArray(reservationsResult)
            ? reservationsResult.filter(r => r.status === 'pending')
            : [];
          console.log(
            'Fetched pending reservations:',
            pendingReservationsData.length,
          );
        }
      } catch (err) {
        console.log('Error fetching reservations:', err);
      }

      // Transform data to match HomeScreen structure
      const transformedGameData = games
        .map(game => {
          const gameId = game.game_id || game.id || game.gameid;
          const gameName = game.game_name || game.gamename || game.name;
          const imageKey = game.image_key || game.imagekey;
          const gameImageUrl = getGameImageUrl(imageKey);

          // Filter tables for this game
          const gameTables = tables
            .filter(table => {
              const tableGameId = table.game_id || table.gameid;
              return String(tableGameId) === String(gameId);
            })
            .sort((a, b) => {
              // Sort by ID (ascending) to maintain creation order
              // Table 1 will always appear first, Table 2 second, etc.
              const idA = parseInt(a.id) || 0;
              const idB = parseInt(b.id) || 0;
              return idA - idB;
            })
            .map(table => {
              // Find active session for this table
              const activeSession = activeSessions.find(
                session =>
                  (String(session.table_id || session.tableid) ===
                    String(table.id) ||
                    String(session.tableId) === String(table.id)) &&
                  session.status === 'active',
              );

              // Find pending reservation for this table
              const pendingReservation = pendingReservationsData.find(
                reservation =>
                  String(reservation.table_id || reservation.tableid) ===
                  String(table.id),
              );

              // Determine table status
              let tableStatus = table.status || 'available';
              if (activeSession) {
                tableStatus = 'occupied';
              } else if (pendingReservation) {
                tableStatus = 'reserved';
              }

              const transformedTable = {
                id: table.id,
                name: table.name || `T${table.id}`,
                price: `₹${table.pricePerMin || table.price_per_min || 200}/hr`,
                pricePerMin: table.pricePerMin || table.price_per_min,
                pricePerFrame: table.pricePerFrame || table.price_per_frame,
                frameCharge: table.frameCharge || table.frame_charge,
                status: tableStatus,
                time: table.activeTime || null, // For occupied tables
                sessionId:
                  activeSession?.active_id ||
                  activeSession?.id ||
                  activeSession?.activeid ||
                  null,
                startTime:
                  activeSession?.start_time || activeSession?.starttime || null,
                bookingEndTime:
                  activeSession?.booking_end_time ||
                  activeSession?.bookingendtime ||
                  null,
                durationMinutes:
                  activeSession?.duration_minutes ||
                  activeSession?.durationminutes ||
                  null,
                game_id: gameId,
                // Pass queue details
                queueBooking: table.queueBooking,
                bookingType:
                  activeSession?.booking_type ||
                  activeSession?.bookingtype ||
                  table.bookingType ||
                  'timer',
                bookedBy: table.bookedBy,
                // Pass extra session details if needed
                frameCount:
                  activeSession?.frame_count || activeSession?.framecount || 0,
                // Attach the game image to each table
                imageUrl: gameImageUrl,
                // Attach reservation details if exists
                reservationDetails: pendingReservation || null,
              };

              // Log each transformed table to debug
              if (activeSession) {
                console.log(`Table ${table.name} has active session:`, {
                  tableId: table.id,
                  sessionId: activeSession.id,
                  status: transformedTable.status,
                  startTime: transformedTable.startTime,
                });
              }

              if (pendingReservation) {
                console.log(`Table ${table.name} has pending reservation:`, {
                  tableId: table.id,
                  reservationId: pendingReservation.id,
                  status: transformedTable.status,
                  scheduledTime:
                    pendingReservation.reservation_time ||
                    pendingReservation.start_time,
                  date: pendingReservation.reservation_date,
                  reservationDetails: pendingReservation,
                });
              }

              return transformedTable;
            });

          return {
            id: gameId,
            name: gameName,
            color: GAME_COLORS[gameName.toLowerCase()] || GAME_COLORS.default,
            imageUrl: gameImageUrl,
            imageKey: imageKey,
            tables: gameTables,
          };
        })
        .filter(game => game.tables.length > 0); // Only include games that have tables

      setGameData(transformedGameData);
      console.log('Transformed game data:', transformedGameData);
    } catch (err) {
      console.error('Error fetching games and tables:', err);

      // Provide more specific error messages
      let errorMessage = 'Failed to load games and tables';
      if (err.message.includes('timeout')) {
        errorMessage =
          'Connection timeout. Please check your network and try again.';
      } else if (err.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (err.message.includes('Failed to fetch')) {
        errorMessage =
          'Unable to connect to server. Please check if the backend is running.';
      } else if (err.message.includes('401')) {
        errorMessage = 'Authentication failed. Please login again.';
      }

      setError(errorMessage);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchGamesAndTables();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Add small delay to ensure backend is updated
      setTimeout(() => {
        fetchGamesAndTables();
      }, 100);

      // Start queue monitoring for auto-assignment
      const monitoringIntervalId = startQueueMonitoring(30000); // Check every 30 seconds

      // Start reservation monitoring for upcoming reservations
      startReservationMonitoring(30); // Check every 30 seconds

      // Also do an immediate check for any waiting queue members
      setTimeout(() => {
        pollQueueAssignments();
      }, 2000);

      // Do an immediate check for upcoming reservations
      setTimeout(() => {
        triggerReservationCheck();
      }, 2000);

      // Cleanup: stop monitoring when screen loses focus
      return () => {
        stopQueueMonitoring(monitoringIntervalId);
        stopReservationMonitoring();
      };
    }, []),
  );

  // No automatic periodic check - user clicks reserved table to start

  // Force refresh function for when tables need to be updated
  const forceRefresh = async () => {
    await fetchGamesAndTables();
  };

  // Check for pending reservations that should start now
  // Mark reservation as no-show
  const markReservationNoShow = async () => {
    if (!selectedReservation) return;

    Alert.alert(
      'Mark as No-Show',
      'Are you sure you want to mark this reservation as no-show?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              setStartingSession(true);
              const token = await getAuthToken();
              const reservationId =
                selectedReservation.id || selectedReservation.reservationid;

              await fetch(`${API_URL}/api/reservations/${reservationId}`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: 'no-show' }),
              });

              setShowStartSessionModal(false);
              setSelectedReservation(null);
              Alert.alert('Success', 'Reservation marked as no-show');
              fetchGamesAndTables();
            } catch (error) {
              console.error('Error marking no-show:', error);
              Alert.alert('Error', 'Failed to mark as no-show');
            } finally {
              setStartingSession(false);
            }
          },
        },
      ],
    );
  };

  // Start a session from a reservation
  const startSessionFromReservation = async () => {
    if (!selectedReservation) return;

    try {
      setStartingSession(true);
      const token = await getAuthToken();

      // Close modal first
      setShowStartSessionModal(false);

      console.log('Selected reservation data:', selectedReservation);

      // Log payment data for debugging
      console.log('Payment data from reservation:', {
        payment_type: selectedReservation.payment_type,
        payment_status: selectedReservation.payment_status,
        payment_mode: selectedReservation.payment_mode,
        advance_payment: selectedReservation.advance_payment,
      });

      // Extract table_id with multiple fallbacks
      const tableId =
        selectedReservation.table_id ||
        selectedReservation.tableid ||
        selectedReservation.tableId;

      // Extract game_id with multiple fallbacks - check nested TableAsset structure
      const gameId =
        selectedReservation.game_id ||
        selectedReservation.gameid ||
        selectedReservation.gameId ||
        selectedReservation.TableAsset?.gameid ||
        selectedReservation.TableAsset?.game_id ||
        selectedReservation.TableAsset?.Game?.id;

      if (!tableId) {
        Alert.alert('Error', 'Table ID is missing from reservation');
        throw new Error('Table ID is missing from reservation');
      }

      if (!gameId) {
        Alert.alert(
          'Error',
          'Game ID is missing from reservation. Please contact support.',
        );
        console.error(
          'Full reservation object:',
          JSON.stringify(selectedReservation, null, 2),
        );
        throw new Error('Game ID is missing from reservation');
      }

      // Get duration - ensure it's a valid number or null
      let durationMinutes =
        selectedReservation.duration_minutes ||
        selectedReservation.durationminutes ||
        selectedReservation.durationMinutes ||
        null;

      // If duration is set, convert to number
      if (durationMinutes) {
        durationMinutes = parseInt(durationMinutes, 10);
        if (isNaN(durationMinutes) || durationMinutes <= 0) {
          durationMinutes = null;
        }
      }

      // Get frame count - ensure it's a valid number or null
      let frameCount =
        selectedReservation.frame_count ||
        selectedReservation.framecount ||
        selectedReservation.frameCount ||
        null;

      if (frameCount) {
        frameCount = parseInt(frameCount, 10);
        if (isNaN(frameCount) || frameCount <= 0) {
          frameCount = null;
        }
      }

      // Get booking type
      const bookingType =
        selectedReservation.booking_type ||
        selectedReservation.bookingtype ||
        selectedReservation.bookingType ||
        'timer';

      // Get customer name
      const customerName =
        selectedReservation.customerName ||
        selectedReservation.customer_name ||
        selectedReservation.customername ||
        'Walk-in Customer';

      // Prepare booking data to create active table session
      const bookingData = {
        table_id: parseInt(tableId, 10),
        game_id: parseInt(gameId, 10),
        user_id: null,
        duration_minutes: durationMinutes,
        booking_type: bookingType,
        frame_count: frameCount,
        customer_name: customerName,
        reservationId:
          selectedReservation.id || selectedReservation.reservationid, // Link to reservation
        acknowledge_conflicts: true, // Bypass time conflict warnings when converting from reservation
      };

      console.log(
        'Starting active table session from reservation:',
        bookingData,
      );

      // Create active table session
      const sessionResponse = await fetch(`${API_URL}/api/activeTables/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      const sessionResult = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionResult.error || 'Failed to start session');
      }

      console.log('Active session created:', sessionResult);

      // Update reservation status to 'active'
      const reservationId =
        selectedReservation.id || selectedReservation.reservationid;
      await fetch(`${API_URL}/api/reservations/${reservationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      // Fetch table and game details for display
      const tablesResponse = await fetch(`${API_URL}/api/tables`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      let tableDetails = null;
      if (tablesResponse.ok) {
        const tablesData = await tablesResponse.json();
        const allTables = Array.isArray(tablesData.data)
          ? tablesData.data
          : Array.isArray(tablesData)
          ? tablesData
          : [];
        tableDetails = allTables.find(t => t.id === tableId);
      }

      const gamesResponse = await fetch(`${API_URL}/api/games`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      let gameDetails = null;
      if (gamesResponse.ok) {
        const gamesData = await gamesResponse.json();
        const allGames = Array.isArray(gamesData.data)
          ? gamesData.data
          : Array.isArray(gamesData)
          ? gamesData
          : [];
        gameDetails = allGames.find(
          g => (g.id || g.game_id || g.gameid) === gameId,
        );
      }

      // Map booking_type to timeOption for AfterBooking screen
      let timeOption = 'Set Time'; // default
      if (bookingType === 'timer') {
        // Timer mode: counts UP from 0, no fixed duration
        timeOption = 'Timer';
      } else if (bookingType === 'frame') {
        // Frame mode: based on frames played
        timeOption = 'Select Frame';
      } else if (bookingType === 'set_time' || bookingType === 'set') {
        // Set Time mode: fixed duration, counts DOWN
        timeOption = 'Set Time';
      }

      // Navigate to AfterBooking screen with session
      navigation.navigate('AfterBooking', {
        table: tableDetails || {
          id: tableId,
          name: `Table #${tableId}`,
          game_id: gameId,
        },
        session: sessionResult.session || sessionResult,
        gameType: gameDetails?.name || gameDetails?.game_name || 'Game',
        color: gameDetails?.color || '#4CAF50',
        timeOption: timeOption,
        timeDetails: {
          selectedDuration: bookingData.duration_minutes || 60,
          selectedFrame: bookingData.frame_count || 1,
        },
        preSelectedFoodItems: selectedReservation.food_orders || [],
        reservationPayment: {
          paymentType:
            selectedReservation.payment_status === 'paid'
              ? 'pay_now'
              : selectedReservation.payment_status === 'partial'
              ? 'pay_half'
              : 'pay_later',
          advancePayment: parseFloat(selectedReservation.advance_payment || 0),
          paymentStatus: selectedReservation.payment_status || 'pending',
        },
      });

      setSelectedReservation(null);

      // Refresh tables
      fetchGamesAndTables();
    } catch (error) {
      console.error('Error starting session from reservation:', error);
      Alert.alert('Error', error.message || 'Failed to start session');
      setShowStartSessionModal(false);
    } finally {
      setStartingSession(false);
    }
  };

  const handleTabPress = index => {
    setActiveTab(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveTab(index);
  };

  const handleTablePress = async (table, action, gameType, color, gameId) => {
    console.log('HomeScreen handleTablePress:', {
      tableName: table.name,
      action,
      sessionId: table.sessionId,
      startTime: table.startTime,
      status: table.status,
      reservationDetails: table.reservationDetails,
    });

    // Handle clicking on reserved table
    if (table.status === 'reserved' && table.reservationDetails) {
      const reservation = table.reservationDetails;
      const reservationDate =
        reservation.reservation_date || reservation.reservationdate;
      const reservationTime =
        reservation.reservation_time ||
        reservation.reservationtime ||
        reservation.start_time;

      if (reservationDate && reservationTime) {
        const scheduledTime = new Date(`${reservationDate}T${reservationTime}`);
        const now = new Date();
        const minutesDiff = (now - scheduledTime) / (1000 * 60);

        // Check if scheduled time has arrived: current time is at or past scheduled time (up to 30 minutes late)
        if (minutesDiff >= 0 && minutesDiff <= 30) {
          setSelectedReservation(reservation);
          setShowStartSessionModal(true);
          return;
        } else {
          Alert.alert(
            'Reservation Not Ready',
            `This table is reserved for ${scheduledTime.toLocaleTimeString(
              'en-US',
              { hour: 'numeric', minute: '2-digit', hour12: true },
            )}. You can start the session when the scheduled time arrives.`,
            [{ text: 'OK' }],
          );
          return;
        }
      }
    }

    if (action === 'stop') {
      // Navigate to AfterBooking screen to show session details
      console.log(
        'Navigating to AfterBooking screen with session:',
        table.sessionId,
      );
      navigation.navigate('AfterBooking', {
        table,
        session: {
          id: table.sessionId,
          active_id: table.sessionId,
          start_time: table.startTime || new Date().toISOString(),
          booking_end_time: table.bookingEndTime,
          duration_minutes: table.durationMinutes,
          status: 'active',
          booking_type: table.bookingType,
          frame_count: table.frameCount,
        },
        gameType,
        color,
        // Map backend booking type to frontend timeOption
        timeOption:
          table.bookingType === 'timer'
            ? 'Timer' // Counts UP from 0
            : table.bookingType === 'frame'
            ? 'Select Frame'
            : 'Set Time', // Counts DOWN from duration
        timeDetails: {
          selectedFrame:
            table.bookingType === 'frame' ? String(table.frameCount || 1) : '1',
          timerDuration: table.durationMinutes
            ? String(table.durationMinutes)
            : '60',
        },
      });
    } else if (action === 'book') {
      // Add game_id to table object for booking
      console.log('Navigating to TableBookingScreen');
      const tableWithGameId = { ...table, game_id: gameId };
      navigation.navigate('TableBookingScreen', {
        table: tableWithGameId,
        gameType,
        color,
      });
    }
  };

  const stopTableSession = async sessionId => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/activeTables/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active_id: sessionId }),
      });

      const result = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Session ended successfully!');
        // Refresh the data to show updated table status
        fetchGamesAndTables();
      } else {
        throw new Error(result.error || 'Failed to end session');
      }
    } catch (error) {
      console.error('Error ending session:', error);
      Alert.alert('Error', 'Failed to end session. Please try again.');
    }
  };

  const renderGame = ({ item }) => {
    // Determine number of columns based on screen width
    // On average, we want 2 columns for phones
    const numColumns = 2;
    return (
      <View style={styles.gamePage}>
        <View style={styles.tablesGrid}>
          {item.tables.map((table, index) => (
            <TableCard
              key={`${table.id}-${index}`}
              table={table}
              gameType={item.name}
              color={item.color}
              gameImageUrl={item.imageUrl}
              onPress={(table, action) => handleTablePress(table, action, item.name, item.color, item.id)}
              imageKey={item.imageKey}
            />
          ))}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <View style={styles.emptyIcon}>
            <ActivityIndicator size="large" color="#FF8C42" />
          </View>
          <Text style={styles.loadingText}>Loading games and tables...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={28} color="#D32F2F" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorSubText}>
              Please check your connection and try again
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={fetchGamesAndTables}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (gameData.length === 0) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Icon name="game-controller-outline" size={40} color="#FF8C42" />
            </View>
            <Text style={styles.emptyText}>No Games Available</Text>
            <Text style={styles.emptySubText}>
              Add games and tables in the Setup Menu to start booking sessions
            </Text>
            <TouchableOpacity
              style={styles.setupButton}
              onPress={() => navigation.navigate('Menu')}
              activeOpacity={0.8}
            >
              <Text style={styles.setupButtonText}>Go to Setup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />

      <HeaderTabs
        tabs={gameData.map(g => g.name)}
        activeTab={activeTab}
        onTabPress={handleTabPress}
        onReorder={async (newTabs) => {
          // Find the new order of gameData objects based on the new tabs array of names
          const newGameData = newTabs.map(tabName => gameData.find(g => g.name === tabName));
          
          // Optimistically update the UI
          setGameData(newGameData);
          
          // Send to backend
          try {
            const token = await AsyncStorage.getItem('authToken');
            const gameIds = newGameData.map(g => g.id);
            await fetch(`${API_URL}/api/games/reorder`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ orderedIds: gameIds })
            });
          } catch (err) {
            console.error('Failed to save new game order:', err);
            // Revert on error if needed by refetching
            fetchGamesAndTables();
          }
        }}
      />

      <FlatList
        ref={flatListRef}
        data={gameData}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <View style={{ width, paddingHorizontal: 20 }}>
            {renderGame({ item, index })}
          </View>
        )}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={{ paddingVertical: 16 }}
      />

      {/* Start Reservation Modal */}
      <Modal
        visible={showStartSessionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartSessionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedReservation && (
              <>
                {/* Countdown Header */}
                <View style={styles.countdownHeader}>
                  <Clock size={20} color="#FF9800" />
                  <Text style={styles.countdownText}>
                    {(() => {
                      const scheduledTime = new Date(
                        `${
                          selectedReservation.reservation_date ||
                          selectedReservation.reservationdate
                        }T${
                          selectedReservation.reservation_time ||
                          selectedReservation.reservationtime ||
                          selectedReservation.start_time
                        }`,
                      );
                      const now = new Date();
                      const minutesUntil = Math.round(
                        (scheduledTime - now) / (1000 * 60),
                      );

                      if (minutesUntil > 0) {
                        return `Starting in ${minutesUntil} minute${
                          minutesUntil !== 1 ? 's' : ''
                        }`;
                      } else if (minutesUntil >= -5) {
                        return 'Ready to start';
                      } else {
                        return `Started ${Math.abs(minutesUntil)} minutes ago`;
                      }
                    })()}
                  </Text>
                </View>

                <View style={styles.reservationInfo}>
                  {/* Customer Info */}
                  <View style={styles.infoRow}>
                    <User size={20} color="#333" />
                    <View style={styles.infoContent}>
                      <Text style={styles.customerName}>
                        {selectedReservation.customer_name ||
                          selectedReservation.customername}
                      </Text>
                      <Text style={styles.customerPhone}>
                        {selectedReservation.customer_phone ||
                          selectedReservation.customerphone}
                      </Text>
                    </View>
                  </View>

                  {/* Table Info */}
                  <View style={styles.infoRow}>
                    <Grid size={20} color="#333" />
                    <Text style={styles.infoText}>
                      Table{' '}
                      {selectedReservation.table_id ||
                        selectedReservation.tableid}
                    </Text>
                  </View>

                  {/* Date & Time */}
                  <View style={styles.infoRow}>
                    <Calendar size={20} color="#333" />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoText}>
                        {(() => {
                          const date = new Date(
                            `${
                              selectedReservation.reservation_date ||
                              selectedReservation.reservationdate
                            }T${
                              selectedReservation.reservation_time ||
                              selectedReservation.reservationtime ||
                              selectedReservation.start_time
                            }`,
                          );
                          const today = new Date();
                          const isToday =
                            date.toDateString() === today.toDateString();
                          return isToday
                            ? 'Today'
                            : date.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              });
                        })()}
                      </Text>
                      <Text style={styles.infoSubtext}>
                        {(() => {
                          const date = new Date(
                            `${
                              selectedReservation.reservation_date ||
                              selectedReservation.reservationdate
                            }T${
                              selectedReservation.reservation_time ||
                              selectedReservation.reservationtime ||
                              selectedReservation.start_time
                            }`,
                          );
                          return date.toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true,
                          });
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* Duration */}
                  {(selectedReservation.duration_minutes ||
                    selectedReservation.durationminutes) && (
                    <View style={styles.infoRow}>
                      <Clock size={20} color="#333" />
                      <Text style={styles.infoText}>
                        Duration:{' '}
                        {selectedReservation.duration_minutes ||
                          selectedReservation.durationminutes}{' '}
                        minutes
                      </Text>
                    </View>
                  )}

                  {/* Booking Type */}
                  <View style={styles.infoRow}>
                    <Settings size={20} color="#333" />
                    <Text style={styles.infoText}>
                      {selectedReservation.booking_type === 'timer'
                        ? 'Timer Mode'
                        : selectedReservation.booking_type === 'set_time'
                        ? 'Set Mode'
                        : selectedReservation.booking_type === 'frame'
                        ? 'Frame Mode'
                        : 'Set Mode'}
                    </Text>
                  </View>
                </View>

                {/* Close Button */}
                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={[
                      styles.confirmYesButton,
                      startingSession && styles.buttonDisabled,
                    ]}
                    onPress={startSessionFromReservation}
                    disabled={startingSession}
                  >
                    {startingSession ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.confirmYesText}>Yes</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.confirmNoButton,
                      startingSession && styles.buttonDisabled,
                    ]}
                    onPress={() => {
                      setShowStartSessionModal(false);
                      setSelectedReservation(null);
                    }}
                    disabled={startingSession}
                  >
                    <Text style={styles.confirmNoText}>No</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  row: {
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  // Loading State
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Error State
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  errorIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  errorSubText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  // Empty State
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    marginHorizontal: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
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
  setupButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#F9F9F9',
    borderRadius: 16,
    width: '100%',
    maxWidth: 380,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFF9E6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    gap: 8,
    marginBottom: 20,
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  reservationInfo: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoContent: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  infoSubtext: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  confirmButtons: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  confirmYesButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  confirmYesText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmNoButton: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
  },
  confirmNoText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  reservationDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    minWidth: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  modalMessage: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#FFF5EE',
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C42',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 2,
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  modalConfirmText: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  modalButtonDisabled: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  tablesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
