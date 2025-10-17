import React, { useState, useRef } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import HeaderTabs from '../components/HeaderTabs';
import TableCard from '../components/TableCard';

const { width } = Dimensions.get('window'); // Get screen width

// Sample data for tables
const gameData = [
  {
    name: 'Snooker',
    color: '#4A7C59', // Green color for snooker table
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
    color: '#2E5F8A', // Blue color for pool table
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
  {
    name: 'PlayStation5',
    color: '#1E3A5F',
    tables: [
      { id: 1, name: 'PS1', price: '₹300/hr', status: 'available' },
      {
        id: 2,
        name: 'PS2',
        price: '₹300/hr',
        status: 'occupied',
        time: '12 min',
      },
    ],
  },
  {
    name: 'Table Tennis',
    color: '#D35400',
    tables: [
      { id: 1, name: 'TT1', price: '₹150/hr', status: 'available' },
      {
        id: 2,
        name: 'TT2',
        price: '₹150/hr',
        status: 'occupied',
        time: '22 min',
      },
    ],
  },
];

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(0); // Currently selected tab
  const flatListRef = useRef(null); // Reference to FlatList for scrolling

  // When user taps a tab
  const handleTabPress = index => {
    setActiveTab(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  // When user swipes the screen
  const handleScroll = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveTab(index);
  };

  // Render each game category (Snooker, Pool, etc.)
  const renderGame = ({ item }) => (
    <View style={{ width, padding: 16 }}>
      <FlatList
        data={item.tables}
        keyExtractor={table => table.id.toString()}
        numColumns={2} // 2 cards per row
        renderItem={({ item: table }) => (
          <TableCard table={table} color={item.color} />
        )}
        columnWrapperStyle={styles.row} // Space between columns
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header with logo, bell, menu */}
      <Header navigation={navigation} />

      {/* Tabs: Snooker, Pool, PlayStation5, Table Tennis */}
      <HeaderTabs
        tabs={gameData.map(g => g.name)}
        activeTab={activeTab}
        onTabPress={handleTabPress}
      />

      {/* Swipeable content for each tab */}
      <FlatList
        ref={flatListRef}
        data={gameData}
        keyExtractor={item => item.name}
        renderItem={renderGame}
        horizontal // Swipe left/right
        pagingEnabled // Snap to each page
        showsHorizontalScrollIndicator={false} // Hide scrollbar
        onMomentumScrollEnd={handleScroll} // Update tab on swipe
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
    justifyContent: 'space-between', // Space between cards
    marginBottom: 16,
  },
});
