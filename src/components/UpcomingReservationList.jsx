import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QueueSuccessModal from './QueueSuccessModal';
import { API_URL } from '../config';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

export default function UpcomingReservationList({ onAddReservation, onBack }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch reservations from API
  const fetchReservations = async () => {
    try {
      setLoading(true);

      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Authentication Error', 'Please log in again');
        return;
      }

      const response = await fetch(`${API_URL}/api/reservations`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Handle empty array
        if (!Array.isArray(data)) {
          setReservations([]);
          return;
        }

        // Transform API data to match component structure
        const transformedData = data.map(reservation => ({
          id: reservation.id.toString(),
          tableNumber:
            reservation.TableAsset?.name || `Table ${reservation.tableId}`,
          billNumber: `RES ${reservation.id}`,
          game:
            reservation.TableAsset?.Game?.game_name ||
            reservation.TableAsset?.type ||
            'Unknown',
          date: new Date(reservation.fromTime).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit',
          }),
          timings: `${new Date(reservation.fromTime).toLocaleTimeString(
            'en-US',
            {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            },
          )} - ${new Date(reservation.toTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })}`,
          status:
            reservation.status === 'pending' ? 'Upcoming' : reservation.status,
          customerName: reservation.customerName || 'Walk-in',
          mobile: reservation.customerPhone || 'Not provided',
          members: '1', // Default for now
          timeSpan: `${Math.round(
            (new Date(reservation.toTime) - new Date(reservation.fromTime)) /
              60000,
          )} min`,
          fullDate: new Date(reservation.fromTime).toLocaleDateString('en-GB'),
          rawReservation: reservation, // Keep original data
        }));
        setReservations(transformedData);
      } else {
        const errorText = await response.text();

        if (response.status === 401) {
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please log in again.',
          );
        } else if (response.status === 500) {
          // Handle database schema issues
          if (
            errorText.includes('column') ||
            errorText.includes('customerName') ||
            errorText.includes('customerPhone')
          ) {
            Alert.alert(
              'Database Update Required',
              'The reservations table needs customer fields. Please run this SQL command:\n\nALTER TABLE reservations ADD COLUMN customerName VARCHAR(100) NULL, ADD COLUMN customerPhone VARCHAR(20) NULL;',
              [{ text: 'OK' }, { text: 'Retry', onPress: fetchReservations }],
            );
          } else {
            Alert.alert(
              'Server Error',
              'The server is experiencing issues. Please try again later.',
            );
          }
        } else {
          Alert.alert(
            'Error',
            `Failed to load reservations. Status: ${response.status}`,
          );
        }
      }
    } catch (error) {
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          'Connection Error',
          'Cannot connect to server. Please check if the backend is running and your network connection.',
          [
            { text: 'Retry', onPress: fetchReservations },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      } else {
        Alert.alert('Error', `Network error: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchReservations();
    }, []),
  );

  const handleCardPress = item => {
    setSelectedReservation(item);
    setModalVisible(true);
  };

  const renderReservation = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.tableNumber}>{item.tableNumber}</Text>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="ellipsis-vertical" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.infoText}>Game : {item.game}</Text>
        <Text style={styles.infoText}>Date : {item.date}</Text>
        <Text style={styles.infoText}>Timings: {item.timings}</Text>
      </View>
    </TouchableOpacity>
  );

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

      {/* List Title */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>List of Reservation</Text>
      </View>

      {/* Reservations List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      ) : reservations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="calendar-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No Reservations</Text>
          <Text style={styles.emptySubtitle}>
            There are no upcoming reservations yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={item => item.id}
          renderItem={renderReservation}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Reservation Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={onAddReservation}>
          <Icon name="add" size={20} color="#fff" />
          <Text style={styles.addButtonText}>Add Manual Reservation</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <QueueSuccessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        tableNumber={selectedReservation?.tableNumber}
        customerName={selectedReservation?.customerName}
        date={selectedReservation?.date}
        mobile={selectedReservation?.mobile}
        tablePreference={selectedReservation?.tablePreference}
        members={selectedReservation?.members}
        timeSpan={selectedReservation?.timeSpan}
      />
      {/* Modal */}
      {selectedReservation && (
        <QueueSuccessModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          tableNumber={selectedReservation.tableNumber}
          customerName={selectedReservation.customerName}
          date={selectedReservation.fullDate}
          mobile={selectedReservation.mobile}
          tablePreference={selectedReservation.game}
          members={selectedReservation.members}
          timeSpan={selectedReservation.timeSpan}
        />
      )}
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
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  billNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 4,
  },
  cardContent: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  buttonContainer: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
