import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Date generation helper
const getNextDates = () => {
  const dates = [];
  const today = new Date();
  const days = [
    'Today',
    '17June',
    '18June',
    '19June',
    '20June',
    '21June',
    '22June',
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      id: i,
      label: i === 0 ? 'Today' : `${date.getDate()}June`,
    });
  }
  return dates;
};

export default function TableBookingScreen({ route, navigation }) {
  const { table, gameType, color } = route.params;

  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTimeOption, setSelectedTimeOption] = useState('Set Time'); // 'Set Time', 'Timer', 'Select Frame'
  const [selectedFood, setSelectedFood] = useState([]);

  const dates = getNextDates();

  const foodOptions = [
    { id: 1, name: 'Food', icon: '🍔' },
    { id: 2, name: 'Fastfood', icon: '🍕' },
    { id: 3, name: 'Beverages', icon: '🥤' },
  ];

  const toggleFoodSelection = id => {
    if (selectedFood.includes(id)) {
      setSelectedFood(selectedFood.filter(item => item !== id));
    } else {
      setSelectedFood([...selectedFood, id]);
    }
  };

  const handleBook = () => {
    // Navigate to payment or confirmation
    navigation.navigate('PaymentGateway', {
      table,
      gameType,
      date: dates[selectedDate].label,
      timeOption: selectedTimeOption,
      food: selectedFood,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameType}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Table Name Badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{table.name} S0176</Text>
        </View>

        {/* Select Date */}
        <Text style={styles.sectionTitle}>Select date</Text>
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.dateList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateButton,
                selectedDate === item.id && styles.dateButtonActive,
              ]}
              onPress={() => setSelectedDate(item.id)}
            >
              <Text
                style={[
                  styles.dateText,
                  selectedDate === item.id && styles.dateTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Select Time */}
        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeOptions}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Set Time' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Set Time')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Set Time' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Set Time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Timer' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Timer')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Timer' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Select Frame')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Select Frame' &&
                  styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Select Frame</Text>
          </TouchableOpacity>
        </View>

        {/* Add Food */}
        <Text style={styles.sectionTitle}>Add Food</Text>
        <View style={styles.foodOptions}>
          {foodOptions.map(food => (
            <TouchableOpacity
              key={food.id}
              style={[
                styles.foodButton,
                selectedFood.includes(food.id) && styles.foodButtonActive,
              ]}
              onPress={() => toggleFoodSelection(food.id)}
            >
              <Text style={styles.foodIcon}>{food.icon}</Text>
              <Text style={styles.foodName}>{food.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Book Button */}
        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>

        {/* New User Link */}
        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.newUserText}>New User</Text>
        </TouchableOpacity>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 20,
  },
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  sectionTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  dateList: {
    marginBottom: 20,
    gap: 8,
  },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  dateButtonActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  dateText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  dateTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
  },
  radioCircleActive: {
    borderColor: '#FF9500',
    backgroundColor: '#FF9500',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
  },
  foodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  foodButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  foodButtonActive: {
    borderColor: '#FF9500',
    borderWidth: 2,
  },
  foodIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  bookButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
  },
  bookButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  newUserText: {
    color: '#CCC',
    fontSize: 14,
    textAlign: 'center',
  },
});
