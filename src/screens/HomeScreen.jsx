import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, StyleSheet, Alert } from 'react-native';
import Header from '../components/Header';
import HeaderTabs from '../components/HeaderTabs';
import TableCard from '../components/TableCard';

const { width } = Dimensions.get('window');

const initialGameData = [
  {
    name: 'Snooker',
    color: '#4A7C59',
    tables: [
      { id: 1, name: 'T1', price: '₹200/hr', status: 'available' },
      { id: 2, name: 'T2', price: '₹200/hr', status: 'available' },
      {
        id: 3,
        name: 'T3',
        price: '₹200/hr',
        status: 'occupied',
        time: '5 min',
      },
      { id: 4, name: 'T4', price: '₹200/hr', status: 'available' },
      { id: 5, name: 'T5', price: '₹200/hr', status: 'available' },
      {
        id: 6,
        name: 'T6',
        price: '₹200/hr',
        status: 'occupied',
        time: '31 min',
      },
      {
        id: 7,
        name: 'T7',
        price: '₹200/hr',
        status: 'occupied',
        time: '17 min',
      },
      { id: 8, name: 'T8', price: '₹200/hr', status: 'available' },
      { id: 9, name: 'T9', price: '₹200/hr', status: 'available' },
      { id: 10, name: 'T10', price: '₹200/hr', status: 'available' },
    ],
  },
  {
    name: 'Pool',
    color: '#2E5F8A',
    tables: [
      {
        id: 1,
        name: 'T1',
        price: '₹250/hr',
        status: 'occupied',
        time: '8 min',
      },
      { id: 2, name: 'T2', price: '₹250/hr', status: 'available' },
      { id: 3, name: 'T3', price: '₹250/hr', status: 'available' },
      { id: 4, name: 'T4', price: '₹250/hr', status: 'available' },
      {
        id: 5,
        name: 'T5',
        price: '₹250/hr',
        status: 'occupied',
        time: '4 min',
      },
      { id: 6, name: 'T6', price: '₹250/hr', status: 'available' },
      {
        id: 7,
        name: 'T7',
        price: '₹250/hr',
        status: 'occupied',
        time: '27 min',
      },
      { id: 8, name: 'T8', price: '₹250/hr', status: 'available' },
    ],
  },
];

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0);
  const [gameData, setGameData] = useState(initialGameData);
  const flatListRef = useRef(null);

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
        keyExtractor={item => item.name}
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
});
