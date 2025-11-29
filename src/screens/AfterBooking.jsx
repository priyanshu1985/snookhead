import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function AfterBooking({ route, navigation }) {
  const {
    table,
    session,
    gameType,
    timeOption = 'Set Time',
    timeDetails,
  } = route.params || {};

  console.log('AfterBooking received params:', {
    table: table?.name,
    session: session?.id,
    gameType,
    timeOption,
    timeDetails,
  });

  const [timeSpent, setTimeSpent] = useState(0);
  const [sessionData, setSessionData] = useState(session);
  const [frameCount, setFrameCount] = useState(
    timeDetails?.selectedFrame ? parseInt(timeDetails.selectedFrame) : 0,
  );

  // Update timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessionData?.start_time) {
        const startTime = new Date(sessionData.start_time);
        const now = new Date();
        const diffMinutes = Math.floor((now - startTime) / (1000 * 60));
        setTimeSpent(diffMinutes);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionData]);

  // Format time display
  const formatTime = minutes => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const seconds =
      Math.floor(
        (Date.now() - new Date(sessionData?.start_time || Date.now())) / 1000,
      ) % 60;

    if (hours > 0) {
      return `${hours}.${mins.toString().padStart(2, '0')}.${seconds
        .toString()
        .padStart(2, '0')} min`;
    }
    return `${mins}.${seconds.toString().padStart(2, '0')} min`;
  };

  const handleUpdate = () => {
    // Navigate to update/modify session screen
    Alert.alert('Update', 'Update session functionality');
  };

  const handleGenerateBill = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      Alert.alert(
        'Generate Bill',
        'Are you sure you want to end this session and generate bill?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Generate Bill',
            style: 'destructive',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/activeTables/stop`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ active_id: sessionData.id }),
                  },
                );

                const result = await response.json();

                if (response.ok) {
                  Alert.alert('Success', 'Bill generated successfully!', [
                    {
                      text: 'OK',
                      onPress: () =>
                        navigation.navigate('MainTabs', { screen: 'Home' }),
                    },
                  ]);
                } else {
                  throw new Error(result.error || 'Failed to generate bill');
                }
              } catch (error) {
                Alert.alert(
                  'Error',
                  'Failed to generate bill. Please try again.',
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameType || 'Snooker'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Table Badge */}
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{table?.name || 'Table'}</Text>
        </View>

        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <Text style={styles.timerLabel}>Total Time Span</Text>
          <Text style={styles.timerValue}>{formatTime(timeSpent)}</Text>
          <View style={styles.timerStatus}>
            <Icon name="radio-button-on" size={12} color="#FF4444" />
            <Text style={styles.timerStatusText}>Session Running</Text>
          </View>
        </View>

        {/* Time Selection Options */}
        <View style={styles.timeOptionsContainer}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Set Time' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="time-outline"
              size={24}
              color={timeOption === 'Set Time' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Set Time' && styles.timeOptionTextActive,
              ]}
            >
              Set Time
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeOption,
              timeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
          >
            <Icon
              name="timer-outline"
              size={24}
              color={timeOption === 'Select Frame' ? '#fff' : '#FF8C42'}
            />
            <Text
              style={[
                styles.timeOptionText,
                timeOption === 'Select Frame' && styles.timeOptionTextActive,
              ]}
            >
              Select Frame
            </Text>
          </TouchableOpacity>
        </View>

        {/* Frame Counter - Only show if Select Frame is active */}
        {timeOption === 'Select Frame' && (
          <View style={styles.frameContainer}>
            <Text style={styles.frameLabel}>Frame Count</Text>
            <View style={styles.frameCounterContainer}>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(Math.max(0, frameCount - 1))}
              >
                <Icon name="remove" size={20} color="#FF8C42" />
              </TouchableOpacity>
              <Text style={styles.frameCountText}>{frameCount} frames</Text>
              <TouchableOpacity
                style={styles.frameButton}
                onPress={() => setFrameCount(frameCount + 1)}
              >
                <Icon name="add" size={20} color="#FF8C42" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Categories */}
        <View style={styles.categoriesContainer}>
          <TouchableOpacity
            style={[styles.categoryButton, styles.categoryButtonActive]}
          >
            <Text style={[styles.categoryText, styles.categoryTextActive]}>
              Food
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>Fast Food</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.categoryButton}>
            <Text style={styles.categoryText}>Beverages</Text>
          </TouchableOpacity>
        </View>

        {/* Food Items */}
        <View style={styles.foodItemsContainer}>
          <View style={styles.foodItem}>
            <View style={styles.foodIcon}>
              <Text style={styles.foodEmoji}>🥟</Text>
            </View>
            <View style={styles.foodDetails}>
              <Text style={styles.foodName}>Cigarette</Text>
              <Text style={styles.foodPrice}>ADD</Text>
            </View>
            <Text style={styles.foodItemPrice}>₹170</Text>
          </View>

          <View style={styles.foodItem}>
            <View style={styles.foodIcon}>
              <Text style={styles.foodEmoji}>🍕</Text>
            </View>
            <View style={styles.foodDetails}>
              <Text style={styles.foodName}>Pizza</Text>
              <Text style={styles.foodPrice}>ADD</Text>
            </View>
            <Text style={styles.foodItemPrice}>₹140</Text>
          </View>

          <View style={styles.foodItem}>
            <View style={styles.foodIcon}>
              <Text style={styles.foodEmoji}>🍕</Text>
            </View>
            <View style={styles.foodDetails}>
              <Text style={styles.foodName}>Pizza</Text>
              <Text style={styles.foodPrice}>ADD</Text>
            </View>
            <Text style={styles.foodItemPrice}>₹140</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity style={styles.updateButton} onPress={handleUpdate}>
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.generateBillButton}
            onPress={handleGenerateBill}
          >
            <Text style={styles.generateBillButtonText}>Generate Bill</Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: '#FF8C42',
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
  timerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  timerLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  timerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerStatusText: {
    fontSize: 12,
    color: '#FF4444',
    marginLeft: 4,
    fontWeight: '500',
  },
  timeOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  timeOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  timeOptionActive: {
    backgroundColor: '#FF8C42',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 4,
  },
  timeOptionTextActive: {
    color: '#fff',
  },
  frameContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  frameLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  frameCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  frameButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  frameCountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 80,
    textAlign: 'center',
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 12,
  },
  categoryButtonActive: {
    backgroundColor: '#FF8C42',
  },
  categoryText: {
    fontSize: 14,
    color: '#666',
  },
  categoryTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  foodItemsContainer: {
    marginBottom: 30,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  foodIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  foodEmoji: {
    fontSize: 24,
  },
  foodDetails: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  foodPrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  foodItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  updateButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  generateBillButton: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  generateBillButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
