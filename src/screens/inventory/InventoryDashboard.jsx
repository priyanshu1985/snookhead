import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  StatusBar,
  TextInput,
  Linking,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { menuAPI, inventoryAPI } from '../../services/api';
import { Picker } from '@react-native-picker/picker';

const InventoryDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [quantityUpdate, setQuantityUpdate] = useState({
    quantity: '',
    operation: 'add',
    reason: '',
    unitType: 'units', // 'units' or 'boxes'
    itemsPerBox: '10', // Default items per box
  });

  // History Modal States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const filters = ['All', 'Low Stock', 'Out of Stock'];

  useEffect(() => {
    loadInventoryData();
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from add item)
  useFocusEffect(
    useCallback(() => {
      loadInventoryData();
    }, []),
  );

  const loadInventoryData = async () => {
    try {
      setLoading(true);
      const response = await menuAPI.getAll({ limit: 1000 });
      setInventoryItems(
        response.data || (Array.isArray(response) ? response : []),
      );
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventoryData();
    setRefreshing(false);
  };

  const filteredItems = inventoryItems.filter(item => {
    // Only show packed items in inventory tracking
    if (item.item_type?.toLowerCase() !== 'packed') {
      return false;
    }

    const itemName = item.name || item.item_name || '';
    const matchesSearch = itemName
      .toLowerCase()
      .includes(searchText.toLowerCase());

    if (!matchesSearch) return false;

    switch (activeFilter) {
      case 'Low Stock':
        return item.stock <= item.threshold && item.stock > 0;
      case 'Out of Stock':
        return item.stock <= 0;
      default:
        return true;
    }
  });

  const callSupplier = phone => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else {
      Alert.alert('No Contact', 'Supplier contact not available');
    }
  };

  const resetQuantityForm = () => {
    setQuantityUpdate({
      quantity: '',
      operation: 'add',
      reason: '',
      unitType: 'units',
      itemsPerBox: '10',
    });
    setSelectedItem(null);
  };

  const handleUpdateQuantity = async () => {
    try {
      if (!selectedItem || !quantityUpdate.quantity.trim()) {
        Alert.alert('Error', 'Quantity is required');
        return;
      }

      setLoading(true);
      const quantity = parseInt(quantityUpdate.quantity);
      const itemsPerBox = parseInt(quantityUpdate.itemsPerBox) || 1;
      const multiplier = quantityUpdate.unitType === 'boxes' ? itemsPerBox : 1;

      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        setLoading(false);
        return;
      }

      // Calculate net change: add = positive, subtract = negative
      const netChange = (quantityUpdate.operation === 'add' ? quantity : -quantity) * multiplier;

      // menuAPI.updateStock takes (id, quantity) where quantity can be negative
      await menuAPI.updateStock(selectedItem.id, netChange);

      Alert.alert(
        'Success',
        `Stock ${
          quantityUpdate.operation === 'add' ? 'added' : 'removed'
        } successfully`,
      );
      setShowQuantityModal(false);
      resetQuantityForm();
      loadInventoryData();
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const restockItem = item => {
    setSelectedItem(item);
    setShowQuantityModal(true);
  };

  const handleViewHistory = async item => {
    setSelectedHistoryItem(item);
    setShowHistoryModal(true);
    setHistoryLoading(true);
    setHistoryData([]); // Clear old data

    try {
      const response = await inventoryAPI.getHistory({
        itemId: item.id,
        limit: 50,
      });

      if (response && response.success) {
        setHistoryData(response.data || []);
      } else {
        setHistoryData([]);
      }
    } catch (error) {
      console.error('Error fetching inventory history:', error);
      Alert.alert('Error', 'Failed to load item history.');
    } finally {
      setHistoryLoading(false);
    }
  };

  const InventoryItemCard = ({ item, index }) => {
    // Determine stock color
    const isLowStock = item.stock <= item.threshold;
    const isOutOfStock = item.stock <= 0;
    const stockColor = isOutOfStock
      ? '#F44336'
      : isLowStock
      ? '#FF9800'
      : '#4CAF50';

    return (
      <View style={styles.itemCard}>
        {/* Left Index Circle */}
        <View style={styles.indexCircleContainer}>
          <View style={styles.indexCircle}>
            <Text style={styles.indexCircleText}>{index + 1}</Text>
          </View>
        </View>

        {/* Middle Details (Icon + Title + Price String) */}
        <View style={styles.itemDetails}>
          <View style={styles.itemDetailsTop}>
            <Icon name="adjust" size={12} color="#FF8C42" style={styles.detailsIcon} />
            <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={styles.pricingText}>
            ₹{item.price || 0}
            <Text style={styles.bulletSeparator}> • </Text>
            Buy: ₹{item.purchasePrice || 0}
          </Text>
        </View>

        {/* Right Stock Number */}
        <View style={styles.stockCountContainer}>
          <Text style={[styles.largeStockNumber, { color: stockColor }]}>
            {item.stock}
          </Text>
        </View>

        {/* Actions (History icon + Add Stock button) */}
        <View style={styles.rightActionContainer}>
          <TouchableOpacity
            style={styles.historyMenuButton}
            onPress={() => handleViewHistory(item)}
          >
            <Icon name="history" size={18} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restockButton}
            onPress={() => restockItem(item)}
          >
            <Text style={styles.restockButtonText}>+ Add Stock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHistoryItem = ({ item }) => {
    const isAdd = item.action === 'stock_added' || item.action === 'restock';
    const isSubtract = item.action === 'stock_removed' || item.action === 'sale';
    const operator = isAdd ? '+' : isSubtract ? '-' : '';
    const color = isAdd ? '#4CAF50' : isSubtract ? '#F44336' : '#FF9800';

    return (
      <View style={styles.historyItemCard}>
        <View style={styles.historyItemHeader}>
          <Text style={styles.historyItemAction}>
            {item.action ? item.action.replace('_', ' ').toUpperCase() : 'UPDATE'}
          </Text>
          <Text style={styles.historyItemDate}>
            {new Date(item.created_at).toLocaleDateString()}{' '}
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.historyItemBody}>
          <View>
            <Text style={styles.historyItemReason}>
              {item.reason || 'No reason provided'}
            </Text>
            {item.user_name && (
              <Text style={styles.historyItemUser}>By: {item.user_name}</Text>
            )}
          </View>
          <Text style={[styles.historyItemQty, { color }]}>
            {operator}
            {item.quantity_change}
          </Text>
        </View>
      </View>
    );
  };

  if (loading && inventoryItems.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory tracking</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <View style={styles.container}>
        <StatusBar backgroundColor="#fff" barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Inventory tracking</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {/* Filter Tabs */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterTab,
                  activeFilter === filter && styles.activeFilterTab,
                ]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterText,
                    activeFilter === filter && styles.activeFilterText,
                  ]}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Inventory List */}
        <ScrollView
          style={styles.itemsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {filteredItems.map((item, index) => (
            <InventoryItemCard key={item.id} item={item} index={index} />
          ))}

          {filteredItems.length === 0 && (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No items found</Text>
            </View>
          )}
        </ScrollView>

        {/* Quantity Update Modal */}
        <Modal
          visible={showQuantityModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setShowQuantityModal(false);
            resetQuantityForm();
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Stock</Text>
                <TouchableOpacity
                  onPress={() => {
                    setShowQuantityModal(false);
                    resetQuantityForm();
                  }}
                >
                  <Icon name="close" size={24} color="#2c3e50" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                {selectedItem && (
                  <View style={styles.itemSummary}>
                    <Text style={styles.itemSummaryTitle}>
                      {selectedItem.name}
                    </Text>
                    <Text style={styles.itemSummaryText}>
                      Current Stock: {selectedItem.stock}
                    </Text>
                  </View>
                )}

                <View style={styles.pickerContainer}>
                  <Text style={styles.label}>Operation:</Text>
                  <View style={styles.pickerWrapper}>
                    <Picker
                      selectedValue={quantityUpdate.operation}
                      onValueChange={value =>
                        setQuantityUpdate(prev => ({
                          ...prev,
                          operation: value,
                        }))
                      }
                      style={styles.picker}
                    >
                      <Picker.Item label="Add Stock (Stock In)" value="add" />
                      <Picker.Item
                        label="Remove Stock (Stock Out)"
                        value="subtract"
                      />
                    </Picker>
                  </View>
                </View>

                <View style={styles.unitToggleContainer}>
                  <Text style={styles.label}>Restock By:</Text>
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[styles.toggleButton, quantityUpdate.unitType === 'units' && styles.toggleButtonActive]}
                      onPress={() => setQuantityUpdate(prev => ({ ...prev, unitType: 'units' }))}
                    >
                      <Text style={[styles.toggleButtonText, quantityUpdate.unitType === 'units' && styles.toggleButtonTextActive]}>Units</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleButton, quantityUpdate.unitType === 'boxes' && styles.toggleButtonActive]}
                      onPress={() => setQuantityUpdate(prev => ({ ...prev, unitType: 'boxes' }))}
                    >
                      <Text style={[styles.toggleButtonText, quantityUpdate.unitType === 'boxes' && styles.toggleButtonTextActive]}>Boxes</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {quantityUpdate.unitType === 'boxes' && (
                  <View style={styles.itemsPerBoxContainer}>
                    <Text style={styles.label}>Items Per Box:</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Items Per Box"
                      value={quantityUpdate.itemsPerBox}
                      onChangeText={text => setQuantityUpdate(prev => ({ ...prev, itemsPerBox: text }))}
                      keyboardType="numeric"
                      placeholderTextColor="#999"
                    />
                  </View>
                )}

                <TextInput
                  style={styles.input}
                  placeholder={quantityUpdate.unitType === 'boxes' ? "Number of Boxes *" : "Quantity *"}
                  value={quantityUpdate.quantity}
                  onChangeText={text =>
                    setQuantityUpdate(prev => ({ ...prev, quantity: text }))
                  }
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />

                {quantityUpdate.quantity && !isNaN(parseInt(quantityUpdate.quantity)) && (
                  <View style={styles.calculationPreview}>
                    <Text style={styles.calculationText}>
                      Total units to {quantityUpdate.operation === 'add' ? 'add' : 'remove'}: {
                        parseInt(quantityUpdate.quantity) * (quantityUpdate.unitType === 'boxes' ? (parseInt(quantityUpdate.itemsPerBox) || 0) : 1)
                      }
                    </Text>
                  </View>
                )}

                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Reason (optional)"
                  value={quantityUpdate.reason}
                  onChangeText={text =>
                    setQuantityUpdate(prev => ({ ...prev, reason: text }))
                  }
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#999"
                />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowQuantityModal(false);
                    resetQuantityForm();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleUpdateQuantity}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>
                    {loading ? 'Updating...' : 'Update Stock'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* History Modal */}
        <Modal
          visible={showHistoryModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowHistoryModal(false)}
        >
          <View style={styles.historyOverlay}>
            <View style={styles.historyContent}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>
                  {selectedHistoryItem
                    ? `${selectedHistoryItem.name} History`
                    : 'Item History'}
                </Text>
                <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                  <Icon name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              {historyLoading ? (
                <View style={styles.historyLoadingContainer}>
                  <ActivityIndicator size="large" color="#FF8C42" />
                  <Text style={styles.historyLoadingText}>
                    Loading history...
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={historyData}
                  keyExtractor={(item) => item.id}
                  renderItem={renderHistoryItem}
                  contentContainerStyle={styles.historyListContent}
                  ListEmptyComponent={
                    <View style={styles.historyEmptyContainer}>
                      <Icon name="history" size={48} color="#ccc" />
                      <Text style={styles.historyEmptyText}>
                        No history records found
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>

        {/* Add New Item Button area used to be here */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginLeft: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activeFilterTab: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
  },
  itemsList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
    alignItems: 'center',
  },
  indexCircleContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  indexCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  indexCircleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  itemDetailsTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailsIcon: {
    marginRight: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flexShrink: 1,
  },
  pricingText: {
    fontSize: 12,
    color: '#666',
  },
  bulletSeparator: {
    color: '#999',
  },
  stockCountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 50,
  },
  largeStockNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  rightActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  historyMenuButton: {
    width: 34,
    height: 34,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  restockButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  restockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  bottomActions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  addButton: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    maxHeight: 400,
  },
  itemSummary: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  itemSummaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  itemSummaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  unitToggleContainer: {
    marginBottom: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1',
    borderRadius: 8,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleButtonActive: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FF8C42',
    fontWeight: '700',
  },
  itemsPerBoxContainer: {
    marginBottom: 8,
  },
  calculationPreview: {
    backgroundColor: '#FFF8F5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  calculationText: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#FF8C42',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },

  historyOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  historyContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '75%',
    padding: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  historyLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyLoadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 16,
  },
  historyEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  historyEmptyText: {
    marginTop: 12,
    color: '#999',
    fontSize: 15,
  },
  historyListContent: {
    paddingBottom: 20,
  },
  historyItemCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#999',
  },
  historyItemBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyItemReason: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  historyItemUser: {
    fontSize: 12,
    color: '#666',
  },
  historyItemQty: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default InventoryDashboard;
