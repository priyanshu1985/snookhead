import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reservationsAPI, activeTables } from '../../services/api';
import { API_URL } from '../../../config';
import ReservationCard from '../../components/reservation/ReservationCard';
import ReservationFormModal from '../../components/reservation/ReservationFormModal';

const ReservationsListScreen = ({ navigation }) => {
  const [reservations, setReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedGameFilter, setSelectedGameFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Available filters
  const statusFilters = [
    { id: 'all', label: 'All', icon: 'list-outline' },
    { id: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
    { id: 'starting-soon', label: 'Starting Soon', icon: 'time-outline' },
    { id: 'overdue', label: 'Overdue', icon: 'alert-circle-outline' },
  ];

  useEffect(() => {
    fetchReservations();
    const interval = setInterval(fetchReservations, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [reservations, searchQuery, selectedFilter, selectedGameFilter]);

  const fetchReservations = async () => {
    try {
      const data = await reservationsAPI.getAll();
      // Filter only pending and active
      const activeReservations = data.filter(
        r => r.status === 'pending' || r.status === 'active',
      );
      setReservations(activeReservations);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      Alert.alert('Error', 'Failed to load reservations. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReservations();
  }, []);

  const applyFilters = () => {
    let filtered = [...reservations];

    // Search filter (by customer name or phone)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        r =>
          (r.customerName || r.customer_name || '')
            .toLowerCase()
            .includes(query) ||
          (r.customerPhone || r.customer_phone || '').includes(query),
      );
    }

    // Time status filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(r => {
        const timeStatus = getTimeStatus(r);
        return timeStatus === selectedFilter;
      });
    }

    // Game filter
    if (selectedGameFilter !== 'all') {
      filtered = filtered.filter(r => {
        const gameName = r.TableAsset?.Game?.name || '';
        return gameName === selectedGameFilter;
      });
    }

    // Sort by start time
    filtered.sort((a, b) => {
      const timeA = new Date(
        a.fromTime || a.fromtime || a.reservationtime || a.reservation_time,
      );
      const timeB = new Date(
        b.fromTime || b.fromtime || b.reservationtime || b.reservation_time,
      );
      return timeA - timeB;
    });

    setFilteredReservations(filtered);
  };

  const getTimeStatus = reservation => {
    const now = new Date();
    const startTime = new Date(
      reservation.fromTime ||
        reservation.fromtime ||
        reservation.reservationtime ||
        reservation.reservation_time,
    );
    const minutesUntil = Math.floor((startTime - now) / (1000 * 60));

    if (minutesUntil < -15) return 'overdue';
    if (minutesUntil <= 30) return 'starting-soon';
    return 'upcoming';
  };

  const getUniqueGames = () => {
    const games = new Set();
    reservations.forEach(r => {
      if (r.TableAsset?.Game?.name) {
        games.add(r.TableAsset.Game.name);
      }
    });
    return Array.from(games);
  };

  const handleEdit = reservation => {
    navigation.navigate('TableBookingScreen', {
      mode: 'edit',
      reservation,
      table: reservation.TableAsset || {
        id: reservation.tableId || reservation.tableid,
        name: `Table #${reservation.tableId || reservation.tableid}`,
        game_id: reservation.game_id,
      },
      gameType: reservation.TableAsset?.Game?.name || 'Game',
      color: reservation.TableAsset?.Game?.color || '#FF8C42',
    });
  };

  const handleCancel = async reservationId => {
    try {
      console.log('Attempting to cancel reservation:', reservationId);

      if (!reservationId) {
        Alert.alert('Error', 'Invalid reservation ID');
        return;
      }

      const result = await reservationsAPI.cancel(reservationId);
      console.log('Cancel result:', result);

      Alert.alert('Success', 'Reservation cancelled successfully');
      fetchReservations();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to cancel reservation. Please try again.',
      );
    }
  };

  const handleConvertToActive = async reservation => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      console.log('Converting reservation to active:', reservation);

      // Extract table_id with multiple fallbacks
      const tableId =
        reservation.tableId || reservation.tableid || reservation.table_id;

      // Extract game_id with multiple fallbacks - check nested TableAsset structure
      const gameId =
        reservation.game_id ||
        reservation.gameid ||
        reservation.gameId ||
        reservation.TableAsset?.gameid ||
        reservation.TableAsset?.game_id ||
        reservation.TableAsset?.Game?.id;

      if (!tableId) {
        Alert.alert('Error', 'Table ID is missing from reservation');
        throw new Error('Table ID is missing from reservation');
      }

      if (!gameId) {
        Alert.alert(
          'Error',
          'Game ID is missing from reservation. Please contact support.',
        );
        console.error(
          'Full reservation object:',
          JSON.stringify(reservation, null, 2),
        );
        throw new Error('Game ID is missing from reservation');
      }

      // Get duration - ensure it's a valid number or null
      let durationMinutes =
        reservation.duration_minutes ||
        reservation.durationminutes ||
        reservation.durationMinutes ||
        null;

      if (durationMinutes) {
        durationMinutes = parseInt(durationMinutes, 10);
        if (isNaN(durationMinutes) || durationMinutes <= 0) {
          durationMinutes = null;
        }
      }

      // Get frame count - ensure it's a valid number or null
      let frameCount =
        reservation.frame_count || reservation.framecount || null;

      if (frameCount) {
        frameCount = parseInt(frameCount, 10);
        if (isNaN(frameCount) || frameCount <= 0) {
          frameCount = null;
        }
      }

      // Get booking type
      const bookingType =
        reservation.booking_type || reservation.bookingtype || 'timer';

      // Get customer name
      const customerName =
        reservation.customerName ||
        reservation.customer_name ||
        reservation.customername ||
        'Walk-in Customer';

      // Prepare booking data to create active table session
      const bookingData = {
        table_id: parseInt(tableId, 10),
        game_id: parseInt(gameId, 10),
        user_id: null,
        duration_minutes: durationMinutes,
        booking_type: bookingType,
        frame_count: frameCount,
        customer_name: customerName,
        reservationId: reservation.id, // Link to reservation
        acknowledge_conflicts: true, // Bypass time conflict warnings when converting from reservation
      };

      console.log('Creating active session from reservation:', bookingData);

      // Create active table session
      const sessionResponse = await fetch(`${API_URL}/api/activeTables/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bookingData),
      });

      const sessionResult = await sessionResponse.json();

      if (!sessionResponse.ok) {
        throw new Error(sessionResult.error || 'Failed to start session');
      }

      console.log('Active session created:', sessionResult);

      // Update reservation status to 'active'
      await fetch(`${API_URL}/api/reservations/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'active' }),
      });

      // Map booking_type to timeOption for AfterBooking screen
      let timeOption = 'Set Time'; // default
      if (bookingType === 'stopwatch') {
        timeOption = 'Timer';
      } else if (bookingType === 'frame') {
        timeOption = 'Select Frame';
      }

      // Navigate to AfterBooking screen with session
      navigation.navigate('AfterBooking', {
        table: reservation.TableAsset || {
          id: reservation.tableId || reservation.tableid,
          name: `Table #${reservation.tableId || reservation.tableid}`,
          game_id: reservation.game_id || reservation.gameid,
        },
        session: sessionResult.session || sessionResult,
        gameType: reservation.TableAsset?.Game?.name || 'Game',
        color: reservation.TableAsset?.Game?.color || '#4CAF50',
        timeOption: timeOption,
        timeDetails: {
          selectedDuration: bookingData.duration_minutes || 60,
          selectedFrame: bookingData.frame_count || 1,
        },
        preSelectedFoodItems: reservation.food_orders || [],
      });

      // Refresh list
      fetchReservations();
    } catch (error) {
      console.error('Error converting to active:', error);
      Alert.alert('Error', 'Failed to start session. Please try again.');
    }
  };

  const handleMarkNoShow = async reservationId => {
    try {
      await reservationsAPI.update(reservationId, {
        status: 'cancelled',
        notes: 'No-show',
      });
      Alert.alert('Success', 'Reservation marked as no-show');
      fetchReservations();
    } catch (error) {
      console.error('Error marking no-show:', error);
      Alert.alert('Error', 'Failed to mark no-show. Please try again.');
    }
  };

  const handleCreateNew = () => {
    console.log('FAB pressed - Opening create modal');
    setShowCreateModal(true);
  };

  const handleCreateSuccess = () => {
    fetchReservations(); // Refresh the list
  };

  const renderFilterChip = filter => {
    const isSelected = selectedFilter === filter.id;
    return (
      <TouchableOpacity
        key={filter.id}
        style={[styles.filterChip, isSelected && styles.filterChipSelected]}
        onPress={() => setSelectedFilter(filter.id)}
      >
        <Icon
          name={filter.icon}
          size={18}
          color={isSelected ? '#FFF' : '#666'}
        />
        <Text
          style={[
            styles.filterChipText,
            isSelected && styles.filterChipTextSelected,
          ]}
        >
          {filter.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Icon name="calendar-outline" size={80} color="#CCC" />
      <Text style={styles.emptyTitle}>No Reservations</Text>
      <Text style={styles.emptyText}>
        {searchQuery || selectedFilter !== 'all'
          ? 'No reservations match your filters'
          : 'Create a new reservation to get started'}
      </Text>
      {!searchQuery && selectedFilter === 'all' && (
        <TouchableOpacity style={styles.createButton} onPress={handleCreateNew}>
          <Icon name="add-circle-outline" size={24} color="#FFF" />
          <Text style={styles.createButtonText}>Create Reservation</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading reservations...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Reservations</Text>
          <Text style={styles.headerSubtitle}>
            {filteredReservations.length} reservation
            {filteredReservations.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Icon name="options-outline" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search-outline" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or phone..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={statusFilters}
          renderItem={({ item }) => renderFilterChip(item)}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Reservations List */}
      <FlatList
        data={filteredReservations}
        renderItem={({ item }) => (
          <ReservationCard
            reservation={item}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onConvertToActive={handleConvertToActive}
            onMarkNoShow={handleMarkNoShow}
          />
        )}
        keyExtractor={item => item.id?.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF8C42']}
          />
        }
        ListEmptyComponent={renderEmpty}
      />

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Game Filter */}
            <View style={styles.modalSection}>
              <Text style={styles.modalSectionTitle}>Filter by Game</Text>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  selectedGameFilter === 'all' && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedGameFilter('all');
                  setShowFilterModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    selectedGameFilter === 'all' &&
                      styles.modalOptionTextSelected,
                  ]}
                >
                  All Games
                </Text>
                {selectedGameFilter === 'all' && (
                  <Icon name="checkmark-circle" size={24} color="#4CAF50" />
                )}
              </TouchableOpacity>
              {getUniqueGames().map(game => (
                <TouchableOpacity
                  key={game}
                  style={[
                    styles.modalOption,
                    selectedGameFilter === game && styles.modalOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedGameFilter(game);
                    setShowFilterModal(false);
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      selectedGameFilter === game &&
                        styles.modalOptionTextSelected,
                    ]}
                  >
                    {game}
                  </Text>
                  {selectedGameFilter === game && (
                    <Icon name="checkmark-circle" size={24} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Reset Button */}
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => {
                setSelectedFilter('all');
                setSelectedGameFilter('all');
                setSearchQuery('');
                setShowFilterModal(false);
              }}
            >
              <Text style={styles.resetButtonText}>Reset All Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create Reservation Modal */}
      <ReservationFormModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreateNew}
        activeOpacity={0.7}
      >
        <Icon name="add" size={30} color="#FFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
    gap: 6,
  },
  filterChipSelected: {
    backgroundColor: '#FF8C42',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextSelected: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 24,
    gap: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  modalOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  modalOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReservationsListScreen;
