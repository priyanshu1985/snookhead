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
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';

// Helper function to get auth token
async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function QueueListView({
  onAddQueue,
  onShowReservations,
  navigation,
  prefillData,
}) {
  const [activeTab, setActiveTab] = useState('QUEUE');
  const [queueData, setQueueData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [targetGameId, setTargetGameId] = useState(null);
  const [targetTableId, setTargetTableId] = useState(null);
  const [members, setMembers] = useState('1');
  const [bookingType, setBookingType] = useState('Timer'); // Timer, Set Time, Frame
  const [duration, setDuration] = useState('60'); // Minutes
  const [frameCount, setFrameCount] = useState('1');

  const [setTime, setSetTime] = useState('');
  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);

  // Handle prefill data for adding to queue
  useEffect(() => {
     if (prefillData) {
       console.log("QueueListView received prefill:", prefillData);
       if (prefillData.customerName) setNewCustomerName(prefillData.customerName);
       if (prefillData.customerPhone) setNewCustomerPhone(prefillData.customerPhone);
       if (prefillData.gameId) setTargetGameId(prefillData.gameId);
       if (prefillData.tableId) setTargetTableId(prefillData.tableId);
       
       // Automatically open modal if requested
       if (prefillData.autoOpen) {
          setShowAddModal(true);
       }
     }
  }, [prefillData]);

  // Fetch queue data from backend
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

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const queue = Array.isArray(result)
        ? result
        : result.queue || result.data || [];

      // Sort by position or created date
      const sortedQueue = queue
        .filter(item => item.status === 'waiting' || item.status === 'active')
        .sort((a, b) => (a.position || a.id) - (b.position || b.id));

      setQueueData(sortedQueue);
      console.log('Fetched queue data:', sortedQueue.length, 'items');
    } catch (err) {
      console.error('Error fetching queue:', err);
      // Set empty array if API not available (feature may not be implemented)
      setQueueData([]);
      setError(null); // Don't show error, just show empty state
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
            fetch(`${API_URL}/api/games`, { headers: { Authorization: `Bearer ${token}` } }),
            fetch(`${API_URL}/api/tables?status=available`, { headers: { Authorization: `Bearer ${token}` } }) // Show available for preferred? Or all? Usually any table is fine for preference.
        ]);
        
        // Actually, for "Add to Queue", we probably want to select ANY table as preferred, even if occupied.
        // So let's fetch ALL tables.
        const allTablesRes = await fetch(`${API_URL}/api/tables`, { headers: { Authorization: `Bearer ${token}` } });

        if (gamesRes.ok) {
            const gamesData = await gamesRes.json();
            setGames(Array.isArray(gamesData) ? gamesData : gamesData.data || []);
        }
        if (allTablesRes.ok) {
            const tablesData = await allTablesRes.json();
            setTables(Array.isArray(tablesData.data) ? tablesData.data : (Array.isArray(tablesData) ? tablesData : []));
        }
    } catch (err) {
        console.error("Error fetching metadata:", err);
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    fetchQueueData();
    fetchMetadata();
  }, []);

  // Refetch when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchQueueData();
    }, []),
  );

  // Handle adding customer to queue
  const handleAddToQueue = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    setAddingToQueue(true);
    const token = await getAuthToken();

    try {
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
          gameid: targetGameId || 1, // Default to Snooker (1) if no game selected
          preferredtableid: targetTableId,
          members: parseInt(members) || 1,
          booking_type: bookingType.toLowerCase(),
          duration_minutes: bookingType === 'Timer' ? parseInt(duration) : null,
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
        Alert.alert('Success', 'Customer added to queue');
      } else {
        throw new Error(result.error || 'Failed to add to queue');
      }
    } catch (err) {
      console.error('Error adding to queue:', err);
      // If API not available, add locally for demo
      const newItem = {
        id: Date.now().toString(),
        name: newCustomerName.trim(),
        customer_name: newCustomerName.trim(),
        customer_phone: newCustomerPhone.trim(),
        status: 'waiting',
        position: queueData.length + 1,
      };
      setQueueData(prev => [...prev, newItem]);
      setShowAddModal(false);
      setNewCustomerName('');
      setNewCustomerPhone('');
    } finally {
      setAddingToQueue(false);
    }
  };

  // Handle removing from queue
  const handleRemoveFromQueue = async (item) => {
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
              await fetch(`${API_URL}/api/queue/${item.id}`, {
                method: 'DELETE',
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              });
              fetchQueueData();
            } catch (err) {
              // Remove locally if API fails
              setQueueData(prev => prev.filter(q => q.id !== item.id));
            }
          },
        },
      ],
    );
  };

  const handleReservationTab = () => {
    setActiveTab('UPCOMING RESERVATION');
    onShowReservations();
  };

  const handleRefresh = () => {
    fetchQueueData(true);
  };

  const renderQueueItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.queueItem}
      onLongPress={() => handleRemoveFromQueue(item)}
      activeOpacity={0.7}
    >
      <View style={styles.queuePosition}>
        <Text style={styles.queueNumber}>{index + 1}</Text>
      </View>
      <View style={styles.queueInfo}>
        <Text style={styles.queueName}>{item.customer_name || item.name}</Text>
        {item.customer_phone && (
          <Text style={styles.queuePhone}>{item.customer_phone}</Text>
        )}
      </View>
      <View style={styles.queueStatus}>
        <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusWaiting]}>
          <Text style={styles.statusText}>
            {item.status === 'active' ? 'Next' : 'Waiting'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFromQueue(item)}
      >
        <Icon name="close-circle-outline" size={22} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-back" size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Management</Text>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={handleRefresh}
          activeOpacity={0.7}
        >
          <Icon name="refresh-outline" size={22} color="#FF8C42" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'QUEUE' && styles.activeTab]}
          onPress={() => setActiveTab('QUEUE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'QUEUE' && styles.activeTabText]}>
            QUEUE
          </Text>
          {activeTab === 'QUEUE' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'UPCOMING RESERVATION' && styles.activeTab]}
          onPress={handleReservationTab}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'UPCOMING RESERVATION' && styles.activeTabText]}>
            RESERVATIONS
          </Text>
          {activeTab === 'UPCOMING RESERVATION' && <View style={styles.activeTabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Queue Count */}
      <View style={styles.countContainer}>
        <View style={styles.countBadge}>
          <Icon name="people-outline" size={18} color="#FF8C42" />
          <Text style={styles.countText}>{queueData.length} in queue</Text>
        </View>
        <Text style={styles.hintText}>Long press to remove</Text>
      </View>

      {/* Queue List */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="large" color="#FF8C42" />
            </View>
            <Text style={styles.loadingText}>Loading queue...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <View style={styles.errorIcon}>
              <Icon name="alert-circle-outline" size={48} color="#D32F2F" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchQueueData()}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : queueData.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIcon}>
              <Icon name="people-outline" size={48} color="#FF8C42" />
            </View>
            <Text style={styles.emptyText}>Queue is Empty</Text>
            <Text style={styles.emptySubText}>
              Add customers to the waiting queue
            </Text>
          </View>
        ) : (
          <FlatList
            data={queueData}
            keyExtractor={item => item.id?.toString() || Math.random().toString()}
            renderItem={renderQueueItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        )}
      </View>

      {/* Add Queue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
          activeOpacity={0.85}
        >
          <Icon name="add-circle-outline" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.addButtonText}>Add to Queue</Text>
        </TouchableOpacity>
      </View>

      {/* Add Customer Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                 {targetTableId ? `Add to Queue (Table ${targetTableId})` : 'Add to Queue'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowAddModal(false)}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>



            {/* Game Selection */}
            <Text style={styles.inputLabel}>Select Game</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
               {games.map((game) => (
                   <TouchableOpacity
                      key={game.gameid}
                      style={[
                          styles.selectionChip,
                          targetGameId === game.gameid && styles.selectionChipActive
                      ]}
                      onPress={() => {
                          setTargetGameId(game.gameid);
                          setTargetTableId(null); // Reset table when game changes
                      }}
                   >
                      <Text style={[
                          styles.selectionChipText,
                          targetGameId === game.gameid && styles.selectionChipTextActive
                      ]}>{game.name}</Text>
                   </TouchableOpacity>
               ))}
            </View>

            {/* Table Selection (Filtered by Game) */}
            <Text style={styles.inputLabel}>Preferred Table (Optional)</Text>
             <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                 <TouchableOpacity
                      style={[
                          styles.selectionChip,
                          targetTableId === null && styles.selectionChipActive
                      ]}
                      onPress={() => setTargetTableId(null)}
                   >
                      <Text style={[
                          styles.selectionChipText,
                          targetTableId === null && styles.selectionChipTextActive
                      ]}>Any Table</Text>
                   </TouchableOpacity>
               {tables
                   .filter(t => !targetGameId || t.gameid === targetGameId)
                   .map((table) => (
                   <TouchableOpacity
                      key={table.id}
                      style={[
                          styles.selectionChip,
                          targetTableId === table.id && styles.selectionChipActive
                      ]}
                      onPress={() => setTargetTableId(table.id)}
                   >
                      <Text style={[
                          styles.selectionChipText,
                          targetTableId === table.id && styles.selectionChipTextActive
                      ]}>{table.name}</Text>
                   </TouchableOpacity>
               ))}
            </View>

            <Text style={styles.inputLabel}>Customer Name *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter customer name"
              placeholderTextColor="#999"
              value={newCustomerName}
              onChangeText={setNewCustomerName}
            />

            <Text style={styles.inputLabel}>Phone Number (Optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter phone number"
              placeholderTextColor="#999"
              value={newCustomerPhone}
              onChangeText={setNewCustomerPhone}
              keyboardType="phone-pad"
            />

            <Text style={styles.inputLabel}>Number of Players</Text>
            <TextInput
              style={styles.textInput}
              placeholder="1 player"
              placeholderTextColor="#999"
              value={members}
              onChangeText={setMembers}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Booking Type *</Text>
            <View style={{ flexDirection: 'row', gap: 16, marginBottom: 16 }}>
              {['Timer', 'Set Time', 'Frame'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => setBookingType(type)}
                >
                  <Icon
                    name={bookingType === type ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={bookingType === type ? '#FF8C42' : '#999'}
                  />
                  <Text style={{ marginLeft: 6, color: '#333' }}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {bookingType === 'Timer' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                 <TouchableOpacity 
                    style={{ padding: 10,  backgroundColor: '#F5F5F5', borderRadius: 8 }} 
                    onPress={() => setDuration(Math.max(15, parseInt(duration || 0) - 15).toString())}>
                    <Text style={{ fontSize: 20 }}>-</Text>
                 </TouchableOpacity>
                 <View style={{ flex: 1 }}>
                    <TextInput
                        style={[styles.textInput, { marginBottom: 0, textAlign: 'center' }]}
                        value={duration}
                        onChangeText={setDuration}
                        keyboardType="numeric"
                    />
                 </View>
                 <TouchableOpacity 
                    style={{ padding: 10, backgroundColor: '#F5F5F5', borderRadius: 8 }} 
                    onPress={() => setDuration((parseInt(duration || 0) + 15).toString())}>
                    <Text style={{ fontSize: 20 }}>+</Text>
                 </TouchableOpacity>
                 <Text style={{ fontSize: 16, fontWeight: '600', color: '#666' }}>minutes</Text>
              </View>
            )}

             {bookingType === 'Frame' && (
              <View style={{ marginBottom: 10 }}>
                 <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>Number of Frames</Text>
                 <TextInput
                    style={styles.textInput}
                    value={frameCount}
                    onChangeText={setFrameCount}
                    keyboardType="numeric"
                    placeholder="Enter frames"
                 />
              </View>
            )}

            {bookingType === 'Set Time' && (
              <View style={{ marginBottom: 10 }}>
                 <Text style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>End Time (HH:MM)</Text>
                 <TextInput
                    style={styles.textInput}
                    value={setTime}
                    onChangeText={setSetTime}
                    placeholder="e.g. 22:00"
                 />
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalAddButton, addingToQueue && styles.modalAddButtonDisabled]}
              onPress={handleAddToQueue}
              disabled={addingToQueue}
              activeOpacity={0.85}
            >
              <Text style={styles.modalAddButtonText}>
                {addingToQueue ? 'Adding...' : 'Add to Queue'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    position: 'relative',
  },
  activeTab: {
    backgroundColor: '#FFF8F5',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#FF8C42',
    borderRadius: 2,
  },
  tabText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#FF8C42',
    fontWeight: '700',
  },

  // Count Container
  countContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  hintText: {
    fontSize: 11,
    color: '#999999',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },

  // Queue Item
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  queuePosition: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  queueNumber: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  queuePhone: {
    fontSize: 12,
    color: '#888888',
  },
  queueStatus: {
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusWaiting: {
    backgroundColor: '#FFF8E1',
  },
  statusActive: {
    backgroundColor: '#E8F5E9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },
  removeButton: {
    padding: 4,
  },

  // Center States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },

  // Button Container
  buttonContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C42',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // Modal
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
});
