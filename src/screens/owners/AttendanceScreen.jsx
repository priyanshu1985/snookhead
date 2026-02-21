import React, { useState, useEffect, useCallback, useContext } from 'react';
import { Calendar, Clock, Power } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { attendanceAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AttendanceScreen({ navigation }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [isClockingIn, setIsClockingIn] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchAttendanceData();
    }
  }, [user]);

  useEffect(() => {
    let interval;
    if (activeShift) {
      interval = setInterval(() => {
        calculateElapsedTime();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeShift]);

  const fetchAttendanceData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [activeData, historyData] = await Promise.all([
        attendanceAPI.getActive(user.id),
        attendanceAPI.getHistory(user.id),
      ]);

      setActiveShift(activeData);
      setAttendanceHistory(historyData || []);

      if (activeData) {
        calculateElapsedTime(activeData);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      Alert.alert('Error', 'Failed to load attendance data');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAttendanceData();
    setRefreshing(false);
  }, [fetchAttendanceData]);

  const calculateElapsedTime = (shift = activeShift) => {
    if (!shift || !shift.check_in_time) return;

    const checkInTime = new Date(shift.check_in_time);
    const now = new Date();
    const diff = now - checkInTime;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    setElapsedTime(
      `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0',
      )}:${String(seconds).padStart(2, '0')}`,
    );
  };

  const handleClockIn = async () => {
    try {
      setIsClockingIn(true);
      const response = await attendanceAPI.checkIn(user.id);
      setActiveShift(response);
      Alert.alert('Success', 'Clocked in successfully');
      await fetchAttendanceData();
    } catch (error) {
      console.error('Error clocking in:', error);
      Alert.alert('Error', error.message || 'Failed to clock in');
    } finally {
      setIsClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeShift) return;

    Alert.alert('Confirm Clock Out', 'Are you sure you want to clock out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clock Out',
        onPress: async () => {
          try {
            setIsClockingIn(true);
            await attendanceAPI.checkOut(user.id, activeShift.id);
            setActiveShift(null);
            setElapsedTime('00:00:00');
            Alert.alert('Success', 'Clocked out successfully');
            await fetchAttendanceData();
          } catch (error) {
            console.error('Error clocking out:', error);
            Alert.alert('Error', error.message || 'Failed to clock out');
          } finally {
            setIsClockingIn(false);
          }
        },
      },
    ]);
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = dateString => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '--';
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end - start;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const renderHistoryItem = (item, index) => {
    return (
      <View key={item.id || index} style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <View style={styles.dateContainer}>
            <Calendar size={16} color="#666" />
            <Text style={styles.historyDate}>
              {formatDate(item.check_in_time)}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  item.status === 'active' ? '#E8F5E9' : '#F5F5F5',
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: item.status === 'active' ? '#4CAF50' : '#999' },
              ]}
            >
              {item.status === 'active' ? 'Active' : 'Completed'}
            </Text>
          </View>
        </View>

        <View style={styles.historyDetails}>
          <View style={styles.timeRow}>
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Check In</Text>
              <Text style={styles.timeValue}>
                {formatTime(item.check_in_time)}
              </Text>
            </View>
            <View style={styles.timeSeparator} />
            <View style={styles.timeItem}>
              <Text style={styles.timeLabel}>Check Out</Text>
              <Text style={styles.timeValue}>
                {formatTime(item.check_out_time)}
              </Text>
            </View>
          </View>

          <View style={styles.durationRow}>
            <Clock size={16} color="#FF8C42" />
            <Text style={styles.durationText}>
              Total:{' '}
              {calculateDuration(item.check_in_time, item.check_out_time)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF8C42']}
          />
        }
      >
        {/* Current Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Text style={styles.statusTitle}>Current Status</Text>
            <View
              style={[
                styles.statusIndicator,
                {
                  backgroundColor: activeShift ? '#4CAF50' : '#999',
                },
              ]}
            >
              <Text style={styles.statusIndicatorText}>
                {activeShift ? 'Clocked In' : 'Clocked Out'}
              </Text>
            </View>
          </View>

          {activeShift && (
            <View style={styles.timerContainer}>
              <Clock size={48} color="#FF8C42" />
              <Text style={styles.timerText}>{elapsedTime}</Text>
              <Text style={styles.timerLabel}>Hours worked today</Text>
            </View>
          )}

          {!activeShift && (
            <View style={styles.clockedOutContainer}>
              <Power size={48} color="#999" />
              <Text style={styles.clockedOutText}>
                You are currently clocked out
              </Text>
              <Text style={styles.clockedOutSubtext}>
                Tap the button below to start your shift
              </Text>
            </View>
          )}

          {/* Clock In/Out Button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: activeShift ? '#FF5252' : '#4CAF50',
              },
            ]}
            onPress={activeShift ? handleClockOut : handleClockIn}
            disabled={isClockingIn}
          >
            {isClockingIn ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon
                  name={activeShift ? 'log-out-outline' : 'log-in-outline'}
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.actionButtonText}>
                  {activeShift ? 'Clock Out' : 'Clock In'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Attendance History */}
        <View style={styles.historySection}>
          <View style={styles.historySectionHeader}>
            <Text style={styles.historySectionTitle}>Recent Attendance</Text>
            <Text style={styles.historyCount}>
              {attendanceHistory.length} records
            </Text>
          </View>

          {attendanceHistory.length === 0 ? (
            <View style={styles.emptyHistoryContainer}>
              <Calendar size={48} color="#CCCCCC" />
              <Text style={styles.emptyHistoryText}>No attendance records</Text>
              <Text style={styles.emptyHistorySubtext}>
                Your attendance history will appear here
              </Text>
            </View>
          ) : (
            <View style={styles.historyList}>
              {attendanceHistory.map((item, index) =>
                renderHistoryItem(item, index),
              )}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  clockedOutContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  clockedOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  clockedOutSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  historySection: {
    marginBottom: 24,
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyCount: {
    fontSize: 14,
    color: '#999',
  },
  historyList: {
    gap: 12,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyDetails: {
    gap: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeItem: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  timeSeparator: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8C42',
  },
  emptyHistoryContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyHistoryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginTop: 12,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacing: {
    height: 80,
  },
});
