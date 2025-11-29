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

      console.log('Fetched games:', games);
      console.log('Fetched tables:', tables);

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
            .map(table => ({
              id: table.id,
              name: table.name || `T${table.id}`,
              price: `₹${table.pricePerMin || table.price_per_min || 200}/hr`,
              status: table.status || 'available',
              time: table.activeTime || null, // For occupied tables
            }));

          return {
            id: gameId,
            name: gameName,
            color: GAME_COLORS[gameName.toLowerCase()] || GAME_COLORS.default,
            tables: gameTables,
          };
        })
        .filter(game => game.tables.length > 0); // Only include games that have tables

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
      fetchGamesAndTables();
    }, []),
  );

  const handleTabPress = index => {
    setActiveTab(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleScroll = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveTab(index);
  };

  const handleTablePress = (table, gameType, color) => {
    // If you have TableBooking screen, uncomment this:
    navigation.navigate('TableBookingScreen', { table, gameType, color });
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
            onPress={() => handleTablePress(table, item.name, item.color)}
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
