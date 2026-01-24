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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { menuAPI } from '../services/api';
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
      });

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
      setInventoryItems(response.data || (Array.isArray(response) ? response : []));
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
      if (isNaN(quantity) || quantity <= 0) {
        Alert.alert('Error', 'Please enter a valid quantity');
        setLoading(false);
        return;
      }

      // Calculate net change: add = positive, subtract = negative
      const netChange = quantityUpdate.operation === 'add' ? quantity : -quantity;

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

  const InventoryItemCard = ({ item }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemImageContainer}>
        <Icon name="inventory-2" size={30} color="#FF8C42" />
      </View>

      <View style={styles.itemDetails}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.stockInfo}>
          In Stock:{' '}
          <Text style={styles.stockNumber}>{item.stock}</Text> |
          Threshold:{' '}
          <Text style={styles.thresholdNumber}>{item.threshold}</Text>
        </Text>
        <Text style={styles.mrpText}>Price: ₹{item.price || 0}</Text>

        <View style={styles.quantityContainer}>
          <Text style={styles.qtyLabel}>Qty:</Text>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.restockButton}
            onPress={() => restockItem(item)}
          >
            <Text style={styles.restockButtonText}>Restock Item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callButton}
            onPress={() => callSupplier(item.supplier_contact)}
          >
            <Icon name="call" size={16} color="#fff" />
            <Text style={styles.callButtonText}>Call supplier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

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
          {filteredItems.map(item => (
            <InventoryItemCard key={item.id} item={item} />
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
                        setQuantityUpdate(prev => ({ ...prev, operation: value }))
                        }
                        style={styles.picker}
                    >
                        <Picker.Item label="Add Stock (Stock In)" value="add" />
                        <Picker.Item label="Remove Stock (Stock Out)" value="subtract" />
                    </Picker>
                  </View>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Quantity *"
                  value={quantityUpdate.quantity}
                  onChangeText={text =>
                    setQuantityUpdate(prev => ({ ...prev, quantity: text }))
                  }
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />

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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  stockInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  stockNumber: {
    fontWeight: '600',
    color: '#333',
  },
  thresholdNumber: {
    fontWeight: '600',
    color: '#333',
  },
  mrpText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  quantityContainer: {
    marginBottom: 12,
  },
  qtyLabel: {
    fontSize: 13,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  restockButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  restockButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  callButtonText: {
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
});

export default InventoryDashboard;
