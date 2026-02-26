// QueueScreen.js
import React, { useState, useEffect, useCallback } from 'react';
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
import Icon from 'react-native-vector-icons/Ionicons';
import QueueListView from '../../components/queue/QueueListView';
import Header from '../../components/common/Header';
import { API_URL } from '../../../config';
import MemberAutocomplete from '../../components/member/MemberAutocomplete';
import MenuItemCard from '../../components/menu/MenuItemCard';
import VariationModal from '../../components/menu/VariationModal';
import { PreparedFoodIcon, PackedFoodIcon } from '../../components/common/icon';

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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [addingToQueue, setAddingToQueue] = useState(false);
  const [showGameDropdown, setShowGameDropdown] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form state
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [targetGameId, setTargetGameId] = useState(null);
  const [targetTableId, setTargetTableId] = useState(null);
  const [bookingType, setBookingType] = useState('Timer');
  const [duration, setDuration] = useState('60');
  const [frameCount, setFrameCount] = useState('1');
  const [setTime, setSetTime] = useState('');
  const [customerid, setCustomerid] = useState(null);
  const [formStep, setFormStep] = useState(1); // 1: Queue Form, 2: Food Selection
  const [cartItems, setCartItems] = useState([]);
  const [foodInstructions, setFoodInstructions] = useState('');
  const [menuItems, setMenuItems] = useState([]);
  const [selectedMainCategory, setSelectedMainCategory] = useState('prepared');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedVariationItem, setSelectedVariationItem] = useState(null);
  const [isVariationModalVisible, setIsVariationModalVisible] = useState(false);

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

      // Fetch Menu Data
      const menuRes = await fetch(`${API_URL}/api/menu`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(Array.isArray(menuData) ? menuData : menuData.data || []);
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

  // Update categories dynamically when menu items or main category change
  useEffect(() => {
    if (menuItems.length > 0) {
      const activeMainCat = selectedMainCategory;
      const relevantSubCats = Array.from(
        new Set(
          menuItems
            .filter(m => (m.item_type || m.itemType || 'prepared').toLowerCase() === activeMainCat)
            .map(m => m.category || m.category_name || '')
            .filter(Boolean),
        ),
      );
      
      setSubCategories(relevantSubCats);
      if (relevantSubCats.length > 0 && !relevantSubCats.includes(selectedCategory)) {
        setSelectedCategory(relevantSubCats[0]);
      } else if (relevantSubCats.length === 0) {
        setSelectedCategory(null);
      }
    }
  }, [selectedMainCategory, menuItems]);

  // Filter menu items based on selected categories
  const getFilteredMenuItems = useCallback(() => {
    return menuItems.filter(item => {
      const itemMainCat = (item.item_type || item.itemType || 'prepared').toLowerCase();
      const matchMain = itemMainCat === selectedMainCategory;
      if (!matchMain) return false;
      
      if (selectedCategory) {
        const itemSubCat = (item.category || item.category_name || '').toLowerCase();
        return itemSubCat === selectedCategory.toLowerCase();
      }
      return true;
    });
  }, [menuItems, selectedMainCategory, selectedCategory]);

  // Cart Management
  const handleAddFood = (item, variationId = null) => {
    setCartItems(prev => {
      const existing = prev.find(
        ci => ci.item.id === item.id && ci.variation_id === variationId
      );
      if (existing) {
        return prev.map(ci =>
          ci.item.id === item.id && ci.variation_id === variationId
            ? { ...ci, qty: ci.qty + 1 }
            : ci
        );
      }
      return [...prev, { item, qty: 1, variation_id: variationId }];
    });
  };

  const handleDecreaseFood = (item, variationId = null) => {
    setCartItems(prev => {
      // Find the item to decrease
      let targetIndex = -1;
      
      if (variationId === null) {
        // Find the last entry with this item ID (regardless of variation)
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].item.id === item.id) {
            targetIndex = i;
            break;
          }
        }
      } else {
        // Find the specific variation
        targetIndex = prev.findIndex(
          ci => ci.item.id === item.id && ci.variation_id === variationId
        );
      }

      if (targetIndex === -1) return prev;

      const existing = prev[targetIndex];
      if (existing.qty > 1) {
        const clone = [...prev];
        clone[targetIndex] = { ...existing, qty: existing.qty - 1 };
        return clone;
      }
      return prev.filter((_, i) => i !== targetIndex);
    });
  };

  const handleVariationSelect = (variation) => {
    if (selectedVariationItem) {
      handleAddFood(selectedVariationItem, variation.id);
      setIsVariationModalVisible(false);
      setSelectedVariationItem(null);
    }
  };

  // Refetch on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchQueueData();
    }, []),
  );

  // Handle add/edit queue
  const handleAddToQueue = async () => {
    if (!newCustomerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }

    if (!newCustomerPhone.trim()) {
      Alert.alert('Error', 'Please enter phone number');
      return;
    }

    const phoneDigits = newCustomerPhone.replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      Alert.alert('Error', 'Phone number must be exactly 10 digits');
      return;
    }

    if (formStep === 1) {
      setFormStep(2);
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

      // Add or Update queue
      const endpoint = isEditMode
        ? `${API_URL}/api/queue/${editingItem.id}`
        : `${API_URL}/api/queue`;
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method: method,
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
          booking_type:
            bookingType === 'Set Time' ? 'set_time' : bookingType.toLowerCase(),
          duration_minutes:
            bookingType === 'Set Time' ? parseInt(duration) || 60 : null,
          frame_count: bookingType === 'Frame' ? parseInt(frameCount) : null,
          customerid: customerid || null,
          food_orders: cartItems.map(ci => ({
            id: ci.item.id,
            qty: ci.qty,
            variation_id: ci.variation_id
          })),
          food_instructions: foodInstructions.trim() || null,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setShowAddModal(false);
        setNewCustomerName('');
        setNewCustomerPhone('');
        setDuration('60');
        setFrameCount('1');
        setSetTime('');
        setIsEditMode(false);
        setEditingItem(null);
        setCustomerid(null);
        fetchQueueData();
        setFormStep(1);
        setCartItems([]);
        setFoodInstructions('');
        setShowSuccessModal(true);
      } else {
        throw new Error(result.error || 'Failed to add to queue');
      }
    } catch (err) {
      console.error('Error adding to queue:', err);
      Alert.alert('Error', err.message || `Failed to ${isEditMode ? 'update' : 'add'} customer to queue`);
    } finally {
      setAddingToQueue(false);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingItem(null);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setTargetGameId(null);
    setTargetTableId(null);
    setBookingType('Timer');
    setDuration('60');
    setFrameCount('1');
    setSetTime('');
    setCustomerid(null);
    setFormStep(1);
    setCartItems([]);
    setFoodInstructions('');
    setShowAddModal(true);
  };

  const openEditModal = (item) => {
    setIsEditMode(true);
    setEditingItem(item);
    setNewCustomerName(item.customer_name || item.name || '');
    setNewCustomerPhone(item.customer_phone || item.phone || '');
    setTargetGameId(item.game_id || item.gameid || null);
    setTargetTableId(item.preferred_table_id || item.preferredtableid || null);
    
    // Determine booking type mapping
    let bType = 'Timer';
    if (item.booking_type === 'set_time') bType = 'Set Time';
    else if (item.booking_type === 'frame') bType = 'Frame';
    setBookingType(bType);

    setDuration(item.duration_minutes ? item.duration_minutes.toString() : '60');
    setFrameCount(item.frame_count ? item.frame_count.toString() : '1');
    setSetTime(item.set_time || '');
    setCustomerid(item.customerid || null);
    
    setShowAddModal(true);
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
    <View style={styles.container}>
      <Header navigation={navigation} />
      <QueueListView
        queueData={queueData}
        loading={loading}
        error={error}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onAddPress={openAddModal}
        onRemovePress={handleRemoveFromQueue}
        onEditPress={openEditModal}
        navigation={navigation}
      />

      {/* Add/Edit Queue Modal */}
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
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{isEditMode ? 'Edit Queue Entry' : 'Add to Queue'}</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={styles.modalCloseButton}
                >
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 10 }}
              >
                {formStep === 1 ? (
                  <>
                    {/* Game Selection Section */}
                    <View style={styles.formSection}>
                      <Text style={styles.sectionLabel}>Select Game *</Text>
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowGameDropdown(!showGameDropdown)}
                      >
                        <Text style={styles.dropdownButtonText}>
                          {targetGameId
                            ? games.find(
                                g => (g.game_id || g.gameid) === targetGameId,
                              )?.game_name ||
                              games.find(
                                g => (g.game_id || g.gameid) === targetGameId,
                              )?.gamename ||
                              games.find(
                                g => (g.game_id || g.gameid) === targetGameId,
                              )?.name ||
                              'Select a game'
                            : 'Select a game'}
                        </Text>
                    <Icon
                      name={showGameDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#666"
                    />
                  </TouchableOpacity>
                  {showGameDropdown && (
                    <View style={styles.dropdownList}>
                      {games.map(game => (
                        <TouchableOpacity
                          key={game.game_id || game.gameid}
                          style={[
                            styles.dropdownItem,
                            targetGameId === (game.game_id || game.gameid) &&
                              styles.dropdownItemActive,
                          ]}
                          onPress={() => {
                            setTargetGameId(game.game_id || game.gameid);
                            setTargetTableId(null);
                            setShowGameDropdown(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              targetGameId === (game.game_id || game.gameid) &&
                                styles.dropdownItemTextActive,
                            ]}
                          >
                            {game.game_name || game.gamename || game.name}
                          </Text>
                          {targetGameId === (game.game_id || game.gameid) && (
                            <Icon name="checkmark" size={20} color="#FF8C42" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Table Selection Section */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>
                    Preferred Table (Optional)
                  </Text>
                  {!targetGameId ? (
                    <View style={styles.lockedSection}>
                      <Icon name="lock-closed" size={20} color="#999" />
                      <Text style={styles.lockedText}>
                        Please select a game first
                      </Text>
                    </View>
                  ) : (
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
                        .filter(t => (t.game_id || t.gameid) === targetGameId)
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
                  )}
                </View>

                {/* Customer Details Section */}
                <View style={[styles.formSection, { zIndex: 10 }]}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.inputLabel}>Select or Enter Customer *</Text>
                    <TouchableOpacity
                      style={styles.scanButtonMini}
                      onPress={() => {
                        setShowAddModal(false);
                        navigation.navigate('ScannerScreen', {
                          scanMode: 'customer',
                          onScanResult: result => {
                            if (result?.customer) {
                              setNewCustomerName(result.customer.name);
                              setNewCustomerPhone(result.customer.phone || '');
                              setCustomerid(result.customer.id);
                              setShowAddModal(true);
                            }
                          },
                        });
                      }}
                    >
                      <Icon name="scan-outline" size={16} color="#FF8C42" />
                      <Text style={styles.scanButtonMiniText}>Scan QR</Text>
                    </TouchableOpacity>
                  </View>
                  <MemberAutocomplete
                    value={newCustomerName}
                    onChangeText={setNewCustomerName}
                    onSelectMember={(member) => {
                      setNewCustomerName(member.name);
                      setNewCustomerPhone(member.phone || '');
                    }}
                    onCreateNewMember={(text) => setNewCustomerName(text)}
                    placeholder="Search Name or Phone"
                    style={{ marginBottom: 12 }}
                  />

                  {/* Phone Number */}
                  <Text style={styles.inputLabel}>Phone Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter 10-digit phone number"
                    placeholderTextColor="#999"
                    value={newCustomerPhone}
                    onChangeText={text => {
                      const digits = text.replace(/\D/g, '');
                      if (digits.length <= 10) {
                        setNewCustomerPhone(digits);
                      }
                    }}
                    keyboardType="phone-pad"
                    maxLength={10}
                  />
                </View>

                {/* Booking Type Section */}
                <View style={styles.formSection}>
                  <Text style={styles.sectionLabel}>Booking Type *</Text>
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
                  {bookingType === 'Set Time' && (
                    <View style={styles.durationRow}>
                      <TouchableOpacity
                        style={styles.durationButton}
                        onPress={() =>
                          setDuration(
                            Math.max(
                              15,
                              parseInt(duration || 0) - 15,
                            ).toString(),
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
                            Math.max(
                              1,
                              parseInt(frameCount || 0) - 1,
                            ).toString(),
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

                  {bookingType === 'Timer' && (
                    <View style={styles.infoBox}>
                      <Icon
                        name="information-circle-outline"
                        size={18}
                        color="#FF8C42"
                      />
                      <Text style={styles.infoText}>
                        Timer will start from 0 and count up until bill is
                        generated
                      </Text>
                    </View>
                  )}
                </View>

                      </>
                    ) : (
                      <View style={{ flex: 1 }}>
                        <View style={styles.foodStepHeader}>
                          <TouchableOpacity onPress={() => setFormStep(1)} style={styles.backButton}>
                             <Icon name="arrow-back" size={20} color="#666" />
                             <Text style={styles.backButtonText}>Back to Details</Text>
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.sectionLabel, { marginTop: 12 }]}>Add Food (Optional)</Text>
                        
                        {/* Main Category Filter */}
                        <View style={styles.mainCategoriesGrid}>
                          {['prepared', 'packed'].map(cat => (
                            <TouchableOpacity
                              key={cat}
                              style={[
                                styles.mainCategoryButton,
                                selectedMainCategory === cat && styles.mainCategoryButtonActive,
                              ]}
                              onPress={() => setSelectedMainCategory(cat)}
                            >
                              <Text style={[
                                styles.mainCategoryText,
                                selectedMainCategory === cat && styles.mainCategoryTextActive
                              ]}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Sub Category Selection */}
                        {subCategories.length > 0 && (
                          <View style={{ marginBottom: 16 }}>
                            <ScrollView 
                              horizontal 
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.subCategoryRow}
                            >
                              {subCategories.map(cat => (
                                <TouchableOpacity
                                  key={cat}
                                  style={[
                                    styles.subCategoryChip,
                                    selectedCategory === cat && styles.subCategoryChipActive,
                                  ]}
                                  onPress={() => setSelectedCategory(cat)}
                                >
                                  <Text style={[
                                    styles.subCategoryChipText,
                                    selectedCategory === cat && styles.subCategoryChipTextActive
                                  ]}>
                                    {cat}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        )}

                        {/* Menu List - Simple horizontal or vertical list for the modal */}
                        <View style={{ minHeight: 400 }}>
                           {getFilteredMenuItems().length > 0 ? (
                             getFilteredMenuItems().map(item => (
                               <MenuItemCard
                                  key={item.id}
                                  item={item}
                                  cartItems={cartItems}
                                  onAddFood={handleAddFood}
                                  onRemoveFood={handleDecreaseFood}
                                  onOpenVariations={(item) => {
                                    setSelectedVariationItem(item);
                                    setIsVariationModalVisible(true);
                                  }}
                               />
                             ))
                           ) : (
                             <View style={styles.emptyMenu}>
                                <Text style={styles.emptyMenuText}>No items found in this category</Text>
                             </View>
                           )}
                        </View>

                        {/* Special Instructions */}
                        <View style={styles.formSection}>
                           <Text style={styles.sectionLabel}>Special Instructions</Text>
                           <TextInput
                             style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
                             placeholder="E.g. Extra spicy, no onions..."
                             multiline
                             value={foodInstructions}
                             onChangeText={setFoodInstructions}
                           />
                        </View>
                      </View>
                    )}
                  </ScrollView>

                  {/* Fixed Footer Buttons */}
                  <View style={styles.stickyFooter}>
                    {formStep === 1 ? (
                      <TouchableOpacity
                        style={[
                          styles.modalAddButton,
                          addingToQueue && styles.modalAddButtonDisabled,
                          { marginTop: 0 },
                        ]}
                        onPress={handleAddToQueue}
                        disabled={addingToQueue}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.modalAddButtonText}>
                          {addingToQueue ? 'Saving...' : 'Next'}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.foodStepFooter, { borderTopWidth: 0, marginTop: 0 }]}>
                        <TouchableOpacity 
                          style={styles.skipButton}
                          onPress={() => {
                            setCartItems([]);
                            handleAddToQueue();
                          }}
                          disabled={addingToQueue}
                        >
                          <Text style={styles.skipButtonText}>Skip Food</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[
                            styles.modalAddButton, 
                            { flex: 1, marginTop: 0 },
                            addingToQueue && styles.modalAddButtonDisabled
                          ]}
                          onPress={handleAddToQueue}
                          disabled={addingToQueue}
                        >
                          <Text style={styles.modalAddButtonText}>
                            {addingToQueue ? 'Saving...' : `Confirm & Add (${cartItems.length})`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
          </TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successModalTitle}>Success</Text>
            <Text style={styles.successModalMessage}>
              Customer {isEditMode ? 'updated in' : 'added to'} queue successfully!
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => setShowSuccessModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.successModalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Variation Modal */}
      <VariationModal
        visible={isVariationModalVisible}
        onClose={() => setIsVariationModalVisible(false)}
        menuItem={selectedVariationItem}
        onAddVariation={handleVariationSelect}
      />
    </View>
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
    paddingBottom: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 4,
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
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 6,
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  formSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginBottom: 8,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  dropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: {
    backgroundColor: '#FFF3E0',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },
  selectionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  selectionChipActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
    borderWidth: 2,
  },
  selectionChipText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  selectionChipTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },
  radioRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioText: {
    marginLeft: 8,
    color: '#333',
    fontSize: 14,
    fontWeight: '500',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    marginTop: 8,
  },
  durationButton: {
    width: 40,
    height: 40,
    backgroundColor: '#FF8C42',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  durationInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    marginTop: 6,
    gap: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  lockedSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    padding: 18,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  lockedText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalAddButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
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
  successModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  successModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  successIconContainer: {
    marginBottom: 20,
  },
  successModalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  successModalMessage: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  successModalButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  successModalButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanButtonMini: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  scanButtonMiniText: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '600',
    marginLeft: 4,
  },
  subCategoryRow: {
    paddingVertical: 10,
    gap: 10,
  },
  subCategoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
  },
  subCategoryChipActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
  },
  subCategoryChipText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  subCategoryChipTextActive: {
    color: '#FF8C42',
    fontWeight: '700',
  },
  // Food Step Styles
  foodStepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  mainCategoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 16,
  },
  mainCategoryButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  mainCategoryButtonActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
  },
  mainCategoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  mainCategoryTextActive: {
    color: '#FF8C42',
  },
  emptyMenu: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyMenuText: {
    color: '#999',
    fontStyle: 'italic',
  },
  foodStepFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 10,
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  stickyFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
});
