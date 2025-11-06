import React, { useState, useRef } from 'react';
import { View, FlatList, Dimensions, StyleSheet } from 'react-native';
import HeaderTabs from './components/HeaderTabs';
import TableDashboard from './components/TableDashboard';

const { width } = Dimensions.get('window');

const gameData = [
  {
    name: 'Snooker',
    tables: [
      {
        id: 1,
        tableName: 'Snooker Table 1',
        status: 'Ongoing',
        remainingTime: '00:32:15',
        pricePerHour: '₹250/hr',
      },
      {
        id: 2,
        tableName: 'Snooker Table 2',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹250/hr',
      },
      {
        id: 3,
        tableName: 'Snooker Table 3',
        status: 'Prebooked',
        remainingTime: '-',
        pricePerHour: '₹250/hr',
      },
      {
        id: 4,
        tableName: 'Snooker Table 4',
        status: 'Ongoing',
        remainingTime: '00:12:45',
        pricePerHour: '₹250/hr',
      },
      {
        id: 5,
        tableName: 'Snooker Table 5',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹250/hr',
      },
    ],
  },
  {
    name: 'Pool',
    tables: [
      {
        id: 1,
        tableName: 'Pool Table 1',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹180/hr',
      },
      {
        id: 2,
        tableName: 'Pool Table 2',
        status: 'Ongoing',
        remainingTime: '00:20:33',
        pricePerHour: '₹180/hr',
      },
      {
        id: 3,
        tableName: 'Pool Table 3',
        status: 'Prebooked',
        remainingTime: '-',
        pricePerHour: '₹180/hr',
      },
      {
        id: 4,
        tableName: 'Pool Table 4',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹180/hr',
      },
    ],
  },
  {
    name: 'Carrom',
    tables: [
      {
        id: 1,
        tableName: 'Carrom Table 1',
        status: 'Ongoing',
        remainingTime: '00:45:10',
        pricePerHour: '₹120/hr',
      },
      {
        id: 2,
        tableName: 'Carrom Table 2',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹120/hr',
      },
    ],
  },
  {
    name: 'Table Tennis',
    tables: [
      {
        id: 1,
        tableName: 'TT Table 1',
        status: 'Ongoing',
        remainingTime: '00:15:20',
        pricePerHour: '₹200/hr',
      },
      {
        id: 2,
        tableName: 'TT Table 2',
        status: 'Available',
        remainingTime: '-',
        pricePerHour: '₹200/hr',
      },
      {
        id: 3,
        tableName: 'TT Table 3',
        status: 'Prebooked',
        remainingTime: '-',
        pricePerHour: '₹200/hr',
      },
    ],
  },
];

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef(null);

  const handleTabPress = index => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleMomentumScrollEnd = event => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveIndex(index);
  };

  const renderItem = ({ item }) => (
    <View style={{ width }}>
      <TableDashboard game={item} />
    </View>
  );

  return (
    <View style={styles.container}>
      <HeaderTabs
        tabs={gameData.map(g => g.name)}
        activeIndex={activeIndex}
        onTabPress={handleTabPress}
      />
      <FlatList
        ref={flatListRef}
        data={gameData}
        keyExtractor={item => item.name}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
});
