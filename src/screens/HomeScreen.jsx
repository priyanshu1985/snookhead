import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Text,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import HeaderTabs from '../components/HeaderTabs';
import TableCard from '../components/TableCard';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');

// Game colors for different game types
const GAME_COLORS = {
  snooker: '#4A7C59',
  pool: '#2E5F8A',
  billiards: '#8B4513',
  default: '#FF8C42',
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

  // Fetch games and tables from backend
  const fetchGamesAndTables = async () => {
    const token = await getAuthToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch games
      const gamesResponse = await fetch(`${API_URL}/api/games`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const gamesResult = await gamesResponse.json();
      const games = Array.isArray(gamesResult)
        ? gamesResult
        : gamesResult.games || gamesResult.data || [];

      // Fetch tables
      const tablesResponse = await fetch(`${API_URL}/api/tables`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const tablesResult = await tablesResponse.json();
      const tables = Array.isArray(tablesResult)
        ? tablesResult
        : tablesResult.tables || tablesResult.data || [];

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
          const gameId = game.game_id || game.id;
          const gameName = game.gamename || game.game_name || game.name;

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
                  String(session.table_id) === String(table.id) &&
                  session.status === 'active',
              );

              const transformedTable = {
                id: table.id,
                name: table.name || `T${table.id}`,
                price: `₹${table.pricePerMin || table.price_per_min || 200}/hr`,
                status: activeSession
                  ? 'occupied'
                  : table.status || 'available',
                time: table.activeTime || null, // For occupied tables
                sessionId: activeSession?.id || null,
                startTime: activeSession?.start_time || null,
                game_id: gameId,
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
            tables: gameTables,
          };
        })
        .filter(game => game.tables.length > 0); // Only include games that have tables

      // Add test occupied table for debugging
      if (
        transformedGameData.length > 0 &&
        transformedGameData[0].tables.length > 0
      ) {
        // Make first table occupied for testing
        transformedGameData[0].tables[0] = {
          ...transformedGameData[0].tables[0],
          status: 'occupied',
          sessionId: 'test-session-123',
          startTime: new Date().toISOString(),
        };
        console.log(
          'Added test occupied table:',
          transformedGameData[0].tables[0],
        );
      }

      setGameData(transformedGameData);
      console.log('Transformed game data:', transformedGameData);
    } catch (err) {
      console.error('Error fetching games and tables:', err);
      setError('Failed to load games and tables');
    } finally {
      setLoading(false);
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
      console.log('Navigating to AfterBooking screen');
      navigation.navigate('AfterBooking', {
        table,
        session: {
          id: table.sessionId || 'unknown',
          start_time: table.startTime || new Date().toISOString(),
          status: 'active',
        },
        gameType,
        color,
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

  const handleDeleteTable = (gameIndex, tableId) => {
    Alert.alert('Delete Table', 'Are you sure you want to delete this table?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          const updatedGameData = [...gameData];
          updatedGameData[gameIndex].tables = updatedGameData[
            gameIndex
          ].tables.filter(table => table.id !== tableId);
          setGameData(updatedGameData);
        },
      },
    ]);
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
            onPress={(table, action) =>
              handleTablePress(table, action, item.name, item.color, item.id)
            }
            onDelete={() => handleDeleteTable(gameIndex, table.id)}
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
          <ActivityIndicator size="large" color="#FF8C42" />
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
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  if (gameData.length === 0) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No games or tables available.</Text>
          <Text style={styles.emptySubText}>
            Please add games and tables in Setup Menu.
          </Text>
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
    backgroundColor: '#F5F5F5',
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
