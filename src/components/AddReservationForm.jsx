import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

// Date options
const dateOptions = [
  { id: '1', label: 'Today', date: '17sept', isToday: true },
  { id: '2', label: '17sept', date: '17sept', isToday: false },
  { id: '3', label: '18sept', date: '18sept', isToday: false },
  { id: '4', label: '19sept', date: '19sept', isToday: false },
  { id: '5', label: '20sept', date: '20sept', isToday: false },
  { id: '6', label: '21sept', date: '21sept', isToday: false },
  { id: '7', label: '21sept', date: '21sept', isToday: false },
];

export default function AddReservationForm({ onBack, onComplete }) {
  const [selectedDate, setSelectedDate] = useState('1');
  const [selectedTimeOption, setSelectedTimeOption] = useState('setTime');

  const handleNext = () => {
    // Here you would typically save the reservation data
    onComplete();
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
                {option.isToday ? 'Today' : option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
      </ScrollView>

      {/* Next Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
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
});
