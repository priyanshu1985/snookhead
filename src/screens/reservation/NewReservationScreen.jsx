import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { gamesAPI, tablesAPI } from '../../services/api';
import {
  getAvailableTables,
  calculateEstimatedCost,
} from '../../services/reservationService';
import MemberAutocomplete from '../../components/member/MemberAutocomplete';
import MenuItemCard from '../../components/menu/MenuItemCard';
import VariationModal from '../../components/menu/VariationModal';
import { menuAPI } from '../../services/api';
import { useCallback } from 'react';

const BOOKING_MODES = {
  TIMER: 'timer',
  FRAME: 'frame',
  STOPWATCH: 'set',
};

export default function NewReservationScreen({ navigation, route }) {
  const { bookingMode = 'advance', preselectedTable = null } =
    route.params || {};

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Game & Table Selection
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [availableTables, setAvailableTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(preselectedTable);

  // Date & Time
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Food Selection State
  const [menuItems, setMenuItems] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [foodInstructions, setFoodInstructions] = useState('');
  const [selectedMainCategory, setSelectedMainCategory] = useState('prepared');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [selectedVariationItem, setSelectedVariationItem] = useState(null);
  const [isVariationModalVisible, setIsVariationModalVisible] = useState(false);
  const [formStep, setFormStep] = useState(1);

  // Restored original logic states
  const [allTables, setAllTables] = useState([]);
  const [bookingType, setBookingType] = useState('timer'); // timer, set_time, frame
  const [duration, setDuration] = useState(60); // minutes or frames
  const [durationMinutes, setDurationMinutes] = useState('60'); // for input text

  // UI State
  const [loading, setLoading] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);

  // Load initial data
  useEffect(() => {
    loadGamesAndMenu();
  }, []);

  // Load tables when game is selected
  useEffect(() => {
    if (selectedGame) {
      loadAvailableTables();
    }
  }, [selectedGame, selectedDate, selectedTime]);

  const loadGamesAndMenu = async () => {
    setLoading(true);
    try {
      const [gamesData, menuData, tablesData] = await Promise.all([
        gamesAPI.getAll(),
        menuAPI.getAll(),
        tablesAPI.getAll(),
      ]);
      setGames(gamesData);
      setMenuItems(Array.isArray(menuData) ? menuData : menuData.data || []);
      
      const tablesList = tablesData.data || tablesData || [];
      setAllTables(tablesList);
    } catch (error) {
      Alert.alert('Error', 'Failed to load initial data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTables = async () => {
    if (!selectedGame || allTables.length === 0) return;

    setLoadingTables(true);
    try {
      // Filter tables by selected game first
      const gameId = selectedGame.gameid || selectedGame.game_id || selectedGame.id;
      const gameTables = allTables.filter(
        t => t.gameid === gameId || t.game_id === gameId || t.id === gameId,
      );

      // In a real scenario, we'd call the availability check API here
      // For now, we'll show tables for the selected game
      setAvailableTables(gameTables);
    } catch (error) {
      console.error('Error loading tables:', error);
      Alert.alert('Error', 'Failed to load available tables');
    } finally {
      setLoadingTables(false);
    }
  };

  // Update categories dynamically
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

  const handleRemoveFood = (item, variationId = null) => {
    setCartItems(prev => {
      let targetIndex = -1;
      
      if (variationId === null) {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].item.id === item.id) {
            targetIndex = i;
            break;
          }
        }
      } else {
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

  const validateForm = () => {
    if (!customerName.trim()) {
      Alert.alert('Validation Error', 'Please enter customer name');
      return false;
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      Alert.alert('Validation Error', 'Please enter a valid phone number');
      return false;
    }
    if (!selectedGame) {
      Alert.alert('Validation Error', 'Please select a game');
      return false;
    }
    if (!selectedTable) {
      Alert.alert('Validation Error', 'Please select a table');
      return false;
    }
    return true;
  };

  const handleProceedToPayment = () => {
    // This is now the final confirmation from Step 2
    const date = selectedDate.toISOString().split('T')[0];
    const time = selectedTime.toTimeString().slice(0, 5);

    const bookingDetails = {
      customer_name: customerName,
      customer_phone: customerPhone,
      game_id: selectedGame.gameid || selectedGame.game_id || selectedGame.id,
      table_id: selectedTable.id,
      reservation_date: date,
      start_time: time,
      booking_type: bookingType,
      duration_minutes: bookingType === 'set_time' ? duration : null,
      frame_count: bookingType === 'frame' ? duration : null,
      food_orders: cartItems.map(ci => ({
        id: ci.item.id,
        qty: ci.qty,
        variation_id: ci.variation_id,
        item_name: ci.item.name,
        variation_name: ci.item.variations?.find(v => v.id === ci.variation_id)?.name
      })),
      food_instructions: foodInstructions.trim() || null,
    };

    // Navigate to Payment screen
    navigation.navigate('PaymentConfirm', {
      bookingDetails,
      gameName: selectedGame.gamename || selectedGame.game_name || selectedGame.name || 'Unnamed Game',
      tableName: selectedTable.name || selectedTable.tablename || `Table ${selectedTable.id}`,
    });
  };

  const handleNextStep = () => {
    if (validateForm()) {
      setFormStep(2);
    }
  };

  const handleSkipFood = () => {
    setCartItems([]);
    setFoodInstructions('');
    handleProceedToPayment();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF8C42" style={styles.loader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (formStep === 2) {
            setFormStep(1);
          } else {
            navigation.goBack();
          }
        }}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {formStep === 1 
            ? (bookingMode === 'advance' ? 'New Reservation' : 'Immediate Booking')
            : 'Add Food (Optional)'
          }
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {formStep === 1 ? (
          <>
            {/* Customer Details */}
            <View style={[styles.section, { zIndex: 10 }]}>
              <Text style={styles.sectionTitle}>Customer Details *</Text>
              <MemberAutocomplete
                value={customerName}
                onChangeText={setCustomerName}
                onSelectMember={(member) => {
                  setCustomerName(member.name);
                  setCustomerPhone(member.phone || '');
                }}
                onCreateNewMember={(text) => setCustomerName(text)}
                placeholder="Search Name or Phone"
                style={{ marginBottom: 12 }}
              />
              <TextInput
                style={styles.input}
                placeholder="Phone Number *"
                value={customerPhone}
                onChangeText={text => {
                  const digits = text.replace(/\D/g, '');
                  if (digits.length <= 10) {
                    setCustomerPhone(digits);
                  }
                }}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>

            {/* Game Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Game *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {games.map(game => {
                  const gameId = game.hasOwnProperty('gameid') ? game.gameid : (game.game_id || game.id);
                  const gameName = game.gamename || game.game_name || game.name || 'Unnamed Game';
                  const isSelected = (selectedGame?.gameid || selectedGame?.game_id || selectedGame?.id) === gameId;

                  return (
                    <TouchableOpacity
                      key={gameId}
                      style={[
                        styles.gameCard,
                        isSelected && styles.gameCardSelected,
                      ]}
                      onPress={() => setSelectedGame(game)}
                    >
                      <Text
                        style={[
                          styles.gameCardText,
                          isSelected && styles.gameCardTextSelected,
                        ]}
                      >
                        {gameName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Table Selection */}
            <View style={[styles.section, { marginBottom: 20 }]}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Select Table *</Text>
                {loadingTables && (
                  <ActivityIndicator size="small" color="#FF8C42" />
                )}
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableTables.map(table => (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableCard,
                      selectedTable?.id === table.id && styles.tableCardSelected,
                    ]}
                    onPress={() => setSelectedTable(table)}
                  >
                    <Text
                      style={[
                        styles.tableCardText,
                        selectedTable?.id === table.id &&
                          styles.tableCardTextSelected,
                      ]}
                    >
                      {table.name}
                    </Text>
                    <Text style={styles.tableStatus}>Available</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {availableTables.length === 0 && !loadingTables && (
                <Text style={styles.emptyText}>
                  {selectedGame
                    ? 'No tables available for selected time'
                    : 'Select a game first'}
                </Text>
              )}
            </View>

            {/* Booking Type Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Type *</Text>
              <View style={styles.bookingTypeRow}>
                {[
                  { id: 'timer', label: 'Timer' },
                  { id: 'set_time', label: 'Set Time' },
                  { id: 'frame', label: 'Frame' },
                ].map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeBtn,
                      bookingType === type.id && styles.typeBtnActive,
                    ]}
                    onPress={() => {
                      setBookingType(type.id);
                      if (type.id === 'frame') setDuration(1);
                      else if (type.id === 'set_time') setDuration(60);
                    }}
                  >
                    <Text style={[
                      styles.typeBtnText,
                      bookingType === type.id && styles.typeBtnTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {bookingType !== 'timer' && (
                <View style={{ marginTop: 15 }}>
                  <Text style={styles.label}>
                    {bookingType === 'frame' ? 'Number of Frames' : 'Duration (Minutes)'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={duration.toString()}
                    onChangeText={(val) => setDuration(parseInt(val) || 0)}
                    keyboardType="numeric"
                    placeholder={bookingType === 'frame' ? "Enter frames" : "Enter minutes"}
                  />
                </View>
              )}
            </View>

            {/* Date & Time (for advance reservations) */}
            {bookingMode === 'advance' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Icon name="calendar-outline" size={20} color="#666" />
                    <Text style={styles.dateTimeText}>
                      {selectedDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowTimePicker(true)}
                  >
                    <Icon name="time-outline" size={20} color="#666" />
                    <Text style={styles.dateTimeText}>
                      {selectedTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    minimumDate={new Date()}
                    onChange={(event, date) => {
                      setShowDatePicker(false);
                      if (date) setSelectedDate(date);
                    }}
                  />
                )}

                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    onChange={(event, time) => {
                      setShowTimePicker(false);
                      if (time) setSelectedTime(time);
                    }}
                  />
                )}
              </View>
            )}
          </>
        ) : (
          <View style={{ flex: 1, paddingBottom: 20 }}>
            <View style={styles.section}>
              {/* Main Category Filter */}
              <View style={styles.mainCategoriesGrid}>
                {[
                  { id: 'prepared', label: 'Prepared', icon: 'fast-food' },
                  { id: 'packaged', label: 'Packed', icon: 'basket' }
                ].map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.mainCategoryButton,
                      selectedMainCategory === cat.id && styles.mainCategoryButtonActive,
                    ]}
                    onPress={() => setSelectedMainCategory(cat.id)}
                  >
                    <Icon 
                      name={cat.icon} 
                      size={20} 
                      color={selectedMainCategory === cat.id ? '#FF8C42' : '#666'} 
                      style={{ marginBottom: 4 }}
                    />
                    <Text style={[
                      styles.mainCategoryText,
                      selectedMainCategory === cat.id && styles.mainCategoryTextActive
                    ]}>
                      {cat.label}
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

              {/* Menu Items */}
              <View style={{ minHeight: 400 }}>
                {getFilteredMenuItems().length > 0 ? (
                  getFilteredMenuItems().map(item => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      cartItems={cartItems}
                      onAddFood={() => handleAddFood(item)}
                      onRemoveFood={() => handleRemoveFood(item)}
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

              {/* Selection Summary */}
              {cartItems.length > 0 && (
                <View style={styles.selectedFoodSection}>
                  <Text style={styles.subSectionTitle}>Selected Items ({cartItems.length})</Text>
                  {cartItems.map((ci, index) => (
                    <View key={`${ci.item.id}-${ci.variation_id}-${index}`} style={styles.selectedFoodItem}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedFoodName}>{ci.item.name}</Text>
                        {ci.variation_id && (
                          <Text style={styles.variationTag}>
                            {ci.item.variations?.find(v => v.id === ci.variation_id)?.name || 'Custom'}
                          </Text>
                        )}
                      </View>
                      <View style={styles.quantityControls}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleRemoveFood(ci.item, ci.variation_id)}>
                          <Icon name="remove-circle-outline" size={24} color="#FF8C42" />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{ci.qty}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => handleAddFood(ci.item, ci.variation_id)}>
                          <Icon name="add-circle" size={24} color="#FF8C42" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Special Instructions */}
              <View style={[styles.formSection, { marginTop: 20 }]}>
                <Text style={styles.sectionLabel}>Special Instructions</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  placeholder="E.g. Extra spicy, no onions..."
                  multiline
                  value={foodInstructions}
                  onChangeText={setFoodInstructions}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <VariationModal
        visible={isVariationModalVisible}
        onClose={() => setIsVariationModalVisible(false)}
        menuItem={selectedVariationItem}
        onAddVariation={handleVariationSelect}
      />

      {/* Footer Navigation Buttons */}
      <View style={styles.footer}>
        {formStep === 1 ? (
          <TouchableOpacity
            style={styles.proceedButton}
            onPress={handleNextStep}
          >
            <Text style={styles.proceedButtonText}>Next: Select Food</Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.foodStepFooter}>
            <TouchableOpacity 
              style={styles.skipButton}
              onPress={handleSkipFood}
            >
              <Text style={styles.skipButtonText}>Skip Food</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.proceedButton, { flex: 1, marginTop: 0 }]}
              onPress={handleProceedToPayment}
            >
              <Icon name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.proceedButtonText}>
                Confirm (${cartItems.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  gameCard: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  gameCardSelected: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  gameCardText: {
    fontSize: 14,
    color: '#666',
  },
  gameCardTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateTimeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 12,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  segmentButtonActive: {
    backgroundColor: '#FF8C42',
  },
  segmentText: {
    fontSize: 14,
    color: '#666',
  },
  segmentTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
  },
  numberInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    textAlign: 'center',
    fontSize: 14,
  },
  tableCard: {
    width: 100,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  tableCardSelected: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  tableCardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tableCardTextSelected: {
    color: '#fff',
  },
  tableStatus: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  addFoodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addFoodText: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  selectedFoodSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  selectedFoodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedFoodName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  qtyBtn: {
    padding: 4,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 20,
    textAlign: 'center',
  },
  selectedFoodPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C42',
    marginRight: 12,
  },
  removeBtn: {
    padding: 4,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  proceedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  foodModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  menuItemPrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: 'bold',
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subCategoryList: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  subCatBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  subCatBtnActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
  },
  subCatText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  subCatTextActive: {
    color: '#FF8C42',
    fontWeight: '700',
  },
  menuItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 8,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    marginTop: 10,
  },
  variationTag: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 11,
    color: '#FF8C42',
    fontWeight: '600',
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  variationTagText: {
    fontSize: 10,
    color: '#FF8C42',
    fontWeight: '700',
  },
  bookingTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  typeBtnText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#fff',
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
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  skipButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 15,
  },
  subCategoryRow: {
    paddingVertical: 8,
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
});
