import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import HeaderTabs from '../components/HeaderTabs';
import TableCard from '../components/TableCard';
import { API_URL } from '../config';
import eventEmitter from '../utils/eventEmitter';

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

  // Add event listener for table updates with ref trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const subscription = eventEmitter.addListener('REFRESH_TABLES', () => {
      console.log('Received REFRESH_TABLES event, triggering refresh...');
      setRefreshTrigger(prev => prev + 1);
    });

    return () => {
      subscription.remove();
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
            .map(table => {
              // Find active session for this table
              const activeSession = activeSessions.find(
                session =>
                  (String(session.table_id || session.tableid) ===
                    String(table.id) ||
                    String(session.tableId) === String(table.id)) &&
                  session.status === 'active',
              );

              const transformedTable = {
                id: table.id,
                name: table.name || `T${table.id}`,
                price: `₹${table.pricePerMin || table.price_per_min || 200}/hr`,
                pricePerMin: table.pricePerMin || table.price_per_min,
                pricePerFrame: table.pricePerFrame || table.price_per_frame,
                frameCharge: table.frameCharge || table.frame_charge,
                status: activeSession
                  ? 'occupied'
                  : table.status || 'available',
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
                bookingType: activeSession?.booking_type || activeSession?.bookingtype || table.bookingType || 'timer',
                bookedBy: table.bookedBy,
                // Pass extra session details if needed
                frameCount: activeSession?.frame_count || activeSession?.framecount || 0,
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
    }, []),
  );

  // Force refresh function for when tables need to be updated
  const forceRefresh = async () => {
    await fetchGamesAndTables();
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
    });

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
            table.bookingType === 'set' ? 'Timer' : 
            table.bookingType === 'frame' ? 'Select Frame' : 
            'Set Time',
        timeDetails: {
            selectedFrame: table.bookingType === 'frame' ? String(table.frameCount || 1) : '1',
            timerDuration: table.durationMinutes ? String(table.durationMinutes) : '60'
        }
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

  const renderGame = ({ item, index: gameIndex }) => (
    <View style={{ width, padding: 16 }}>
      <FlatList
        data={item.tables}
        keyExtractor={table => `${item.name}-${table.id}`}
        numColumns={2}
        renderItem={({ item: table }) => (
          <TableCard
            table={table}
            color={item.color}
            gameImageUrl={item.imageUrl}
            onPress={(table, action) =>
              handleTablePress(table, action, item.name, item.color, item.id)
            }
          />
        )}
        columnWrapperStyle={styles.row}
      />
    </View>
  );

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
              <Icon name="alert-circle-outline" size={28} color="#D32F2F" />
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
      />

      <FlatList
        ref={flatListRef}
        data={gameData}
        keyExtractor={item => String(item.id)}
        renderItem={renderGame}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
      />
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
});
