// QueueScreen.js
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react-native';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  Alert,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QueueListView from '../../components/queue/QueueListView';
import Header from '../../components/common/Header';
import { API_URL } from '../../config';

// Helper function to get auth token
async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function QueueScreen({ navigation, route }) {
  const prefillData = route.params?.prefillData;

  // Queue state
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingToQueue, setAddingToQueue] = useState(false);

  // Form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [targetGameId, setTargetGameId] = useState(null);
  const [targetTableId, setTargetTableId] = useState(null);
  const [members, setMembers] = useState('1');
  const [bookingType, setBookingType] = useState('Timer');
  const [duration, setDuration] = useState('60');
  const [frameCount, setFrameCount] = useState('1');
  const [setTime, setSetTime] = useState('');

  // Metadata
  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);

  // Handle prefill data
  useEffect(() => {
    if (prefillData) {
      if (prefillData.customerName)
        setNewCustomerName(prefillData.customerName);
      if (prefillData.customerPhone)
        setNewCustomerPhone(prefillData.customerPhone);
      if (prefillData.gameId) setTargetGameId(prefillData.gameId);
      if (prefillData.tableId) setTargetTableId(prefillData.tableId);
      if (prefillData.autoOpen) setShowAddModal(true);
    }
  }, [prefillData]);

  // Fetch queue data
  const fetchQueueData = async (showRefreshing = false) => {
    const token = await getAuthToken();
    if (!token) {
      setError('Please login first');
      setLoading(false);
      return;
    }

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_URL}/api/queue`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      const queue = Array.isArray(result)
        ? result
        : result.queue || result.data || [];

      const sortedQueue = queue
        .filter(item => item.status === 'waiting' || item.status === 'active')
        .sort((a, b) => (a.position || a.id) - (b.position || b.id));

      setQueueData(sortedQueue);
    } catch (err) {
      console.error('Error fetching queue:', err);
      setQueueData([]);
      setError(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch games and tables
  const fetchMetadata = async () => {
    const token = await getAuthToken();
    try {
      const [gamesRes, tablesRes] = await Promise.all([
        fetch(`${API_URL}/api/games`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/tables`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        setGames(Array.isArray(gamesData) ? gamesData : gamesData.data || []);
      }
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTables(
          Array.isArray(tablesData.data)
            ? tablesData.data
            : Array.isArray(tablesData)
            ? tablesData
            : [],
        );
      }
    } catch (err) {
      console.error('Error fetching metadata:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchQueueData();
    fetchMetadata();
  }, []);

  // Refetch on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchQueueData();
    }, []),
  );

  // Handle add to queue
  const handleAddToQueue = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    setAddingToQueue(true);
    const token = await getAuthToken();

    try {
      // Check table availability
      let isTableAvailable = false;
      if (targetTableId) {
        const tableResponse = await fetch(`${API_URL}/api/tables`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (tableResponse.ok) {
          const tablesData = await tableResponse.json();
          const allTables = Array.isArray(tablesData.data)
            ? tablesData.data
            : Array.isArray(tablesData)
            ? tablesData
            : [];
          const selectedTable = allTables.find(t => t.id === targetTableId);

          if (
            selectedTable &&
            selectedTable.status !== 'occupied' &&
            selectedTable.status !== 'reserved'
          ) {
            isTableAvailable = true;
          }
        }
      }

      if (isTableAvailable) {
        Alert.alert(
          'Table Available',
          'The selected table is currently available. Please book it directly from the home screen instead of adding to queue.',
        );
        setAddingToQueue(false);
        return;
      }

      // Add to queue
      const response = await fetch(`${API_URL}/api/queue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customername: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
          status: 'waiting',
          gameid: targetGameId || 1,
          preferredtableid: targetTableId,
          members: parseInt(members) || 1,
          booking_type:
            bookingType === 'Set Time' ? 'set_time' : bookingType.toLowerCase(),
          duration_minutes:
            bookingType === 'Set Time' ? parseInt(duration) : null,
          frame_count: bookingType === 'Frame' ? parseInt(frameCount) : null,
          set_time: bookingType === 'Set Time' ? setTime : null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setMembers('1');
        setDuration('60');
        setFrameCount('1');
        setSetTime('');
        fetchQueueData();
        Alert.alert('Success', 'Customer added to queue successfully!');
      } else {
        throw new Error(result.error || 'Failed to add to queue');
      }
    } catch (err) {
      console.error('Error adding to queue:', err);
      Alert.alert('Error', err.message || 'Failed to add customer to queue');
    } finally {
      setAddingToQueue(false);
    }
  };

  // Handle remove from queue
  const handleRemoveFromQueue = async item => {
    Alert.alert(
      'Remove from Queue',
      `Remove ${item.customer_name || item.name} from queue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const token = await getAuthToken();
            try {
              const response = await fetch(`${API_URL}/api/queue/${item.id}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.ok) {
                fetchQueueData();
              } else {
                throw new Error('Failed to remove from queue');
              }
            } catch (err) {
              console.error('Error removing from queue:', err);
              Alert.alert('Error', 'Failed to remove from queue');
            }
          },
        },
      ],
    );
  };

  const handleRefresh = () => {
    fetchQueueData(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Header navigation={navigation} />
      <QueueListView
        queueData={queueData}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onAddPress={() => setShowAddModal(true)}
        onRemovePress={handleRemoveFromQueue}
        navigation={navigation}
      />

      {/* Add to Queue Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {targetTableId
                      ? `Add to Queue (Table ${targetTableId})`
                      : 'Add to Queue'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    style={styles.modalCloseButton}
                  >
                    <X size={24} color="#333" />
                  </TouchableOpacity>
                </View>

                {/* Game Selection */}
                <Text style={styles.inputLabel}>Select Game</Text>
                <View style={styles.chipRow}>
                  {games.map(game => (
                    <TouchableOpacity
                      key={game.game_id || game.gameid}
                      style={[
                        styles.selectionChip,
                        targetGameId === (game.game_id || game.gameid) &&
                          styles.selectionChipActive,
                      ]}
                      onPress={() => {
                        setTargetGameId(game.game_id || game.gameid);
                        setTargetTableId(null);
                      }}
                    >
                      <Text
                        style={[
                          styles.selectionChipText,
                          targetGameId === (game.game_id || game.gameid) &&
                            styles.selectionChipTextActive,
                        ]}
                      >
                        {game.game_name || game.gamename || game.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Table Selection */}
                <Text style={styles.inputLabel}>
                  Preferred Table (Optional)
                </Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.selectionChip,
                      targetTableId === null && styles.selectionChipActive,
                    ]}
                    onPress={() => setTargetTableId(null)}
                  >
                    <Text
                      style={[
                        styles.selectionChipText,
                        targetTableId === null &&
                          styles.selectionChipTextActive,
                      ]}
                    >
                      Any Table
                    </Text>
                  </TouchableOpacity>
                  {tables
                    .filter(
                      t =>
                        !targetGameId ||
                        (t.game_id || t.gameid) === targetGameId,
                    )
                    .map(table => (
                      <TouchableOpacity
                        key={table.id}
                        style={[
                          styles.selectionChip,
                          targetTableId === table.id &&
                            styles.selectionChipActive,
                        ]}
                        onPress={() => setTargetTableId(table.id)}
                      >
                        <Text
                          style={[
                            styles.selectionChipText,
                            targetTableId === table.id &&
                              styles.selectionChipTextActive,
                          ]}
                        >
                          {table.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </View>

                {/* Customer Name */}
                <Text style={styles.inputLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter customer name"
                  placeholderTextColor="#999"
                  value={newCustomerName}
                  onChangeText={setNewCustomerName}
                />

                {/* Phone Number */}
                <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter phone number"
                  placeholderTextColor="#999"
                  value={newCustomerPhone}
                  onChangeText={setNewCustomerPhone}
                  keyboardType="phone-pad"
                />

                {/* Number of Players */}
                <Text style={styles.inputLabel}>Number of Players</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="1 player"
                  placeholderTextColor="#999"
                  value={members}
                  onChangeText={setMembers}
                  keyboardType="numeric"
                />

                {/* Booking Type */}
                <Text style={styles.inputLabel}>Booking Type *</Text>
                <View style={styles.radioRow}>
                  {['Timer', 'Set Time', 'Frame'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={styles.radioOption}
                      onPress={() => setBookingType(type)}
                    >
                      <Icon
                        name={
                          bookingType === type
                            ? 'radio-button-on'
                            : 'radio-button-off'
                        }
                        size={20}
                        color={bookingType === type ? '#FF8C42' : '#999'}
                      />
                      <Text style={styles.radioText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Duration/Frame Selection */}
                {bookingType === 'Timer' && (
                  <View style={styles.durationRow}>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() =>
                        setDuration(
                          Math.max(15, parseInt(duration || 0) - 15).toString(),
                        )
                      }
                    >
                      <Text style={styles.durationButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.durationInput}
                      value={`${duration} min`}
                      onChangeText={text =>
                        setDuration(text.replace(/[^0-9]/g, ''))
                      }
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() =>
                        setDuration((parseInt(duration || 0) + 15).toString())
                      }
                    >
                      <Text style={styles.durationButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bookingType === 'Frame' && (
                  <View style={styles.durationRow}>
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() =>
                        setFrameCount(
                          Math.max(1, parseInt(frameCount || 0) - 1).toString(),
                        )
                      }
                    >
                      <Text style={styles.durationButtonText}>-</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={styles.durationInput}
                      value={`${frameCount} frame(s)`}
                      onChangeText={text =>
                        setFrameCount(text.replace(/[^0-9]/g, ''))
                      }
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.durationButton}
                      onPress={() =>
                        setFrameCount(
                          (parseInt(frameCount || 0) + 1).toString(),
                        )
                      }
                    >
                      <Text style={styles.durationButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {bookingType === 'Set Time' && (
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter time (e.g., 14:30)"
                    placeholderTextColor="#999"
                    value={setTime}
                    onChangeText={setSetTime}
                  />
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.modalAddButton,
                    addingToQueue && styles.modalAddButtonDisabled,
                  ]}
                  onPress={handleAddToQueue}
                  disabled={addingToQueue}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalAddButtonText}>
                    {addingToQueue ? 'Adding...' : 'Add to Queue'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  selectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectionChipActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
  },
  selectionChipText: {
    fontSize: 13,
    color: '#666',
  },
  selectionChipTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioText: {
    marginLeft: 6,
    color: '#333',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  durationButton: {
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  durationButtonText: {
    fontSize: 20,
  },
  durationInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    textAlign: 'center',
  },
  modalAddButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 16,
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalAddButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  modalAddButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
