import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { inventoryAPI } from '../services/api';

const InventoryScreen = ({ navigation }) => {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Add/Edit Form State
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'food_drinks',
    current_quantity: '',
    minimum_threshold: '',
    unit: 'pieces',
    cost_per_unit: '',
    supplier: '',
    description: '',
  });

  // Quantity Update State
  const [quantityUpdate, setQuantityUpdate] = useState({
    quantity: '',
    operation: 'add',
    reason: '',
  });

  const categories = [
    { label: 'All Categories', value: 'all' },
    { label: 'Food & Drinks', value: 'food_drinks' },
    { label: 'Snooker Equipment', value: 'snooker_equipment' },
    { label: 'Cleaning Supplies', value: 'cleaning_supplies' },
    { label: 'Office Supplies', value: 'office_supplies' },
    { label: 'Maintenance', value: 'maintenance' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Other', value: 'other' },
  ];

  const units = [
    { label: 'Pieces', value: 'pieces' },
    { label: 'Kilograms', value: 'kg' },
    { label: 'Liters', value: 'liters' },
    { label: 'Packets', value: 'packets' },
    { label: 'Boxes', value: 'boxes' },
    { label: 'Bottles', value: 'bottles' },
  ];

  useEffect(() => {
    loadInventory();
    loadLowStockItems();
  }, [selectedCategory, searchTerm]);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await inventoryAPI.getAll(params);
      console.log('Inventory API Response:', response);
      setInventory(response.data || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
      Alert.alert('Error', 'Failed to load inventory items: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadLowStockItems = async () => {
    try {
      const response = await inventoryAPI.getLowStockItems();
      setLowStockItems(response.data || []);
    } catch (error) {
      console.error('Error loading low stock items:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadInventory(), loadLowStockItems()]);
    setRefreshing(false);
  }, [selectedCategory, searchTerm]);

  const handleAddItem = async () => {
    try {
      if (!formData.item_name.trim()) {
        Alert.alert('Error', 'Item name is required');
        return;
      }

      setLoading(true);
      const itemData = {
        ...formData,
        current_quantity: parseInt(formData.current_quantity) || 0,
        minimum_threshold: parseInt(formData.minimum_threshold) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || null,
      };

      console.log('Creating item with data:', itemData);
      await inventoryAPI.create(itemData);
      Alert.alert('Success', 'Item added successfully');
      setShowAddModal(false);
      resetForm();
      loadInventory();
      loadLowStockItems();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async () => {
    try {
      if (!selectedItem || !formData.item_name.trim()) {
        Alert.alert('Error', 'Item name is required');
        return;
      }

      setLoading(true);
      const itemData = {
        ...formData,
        current_quantity: parseInt(formData.current_quantity) || 0,
        minimum_threshold: parseInt(formData.minimum_threshold) || 0,
        cost_per_unit: parseFloat(formData.cost_per_unit) || null,
      };

      await inventoryAPI.update(selectedItem.id, itemData);
      Alert.alert('Success', 'Item updated successfully');
      setShowEditModal(false);
      resetForm();
      loadInventory();
      loadLowStockItems();
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item: ' + error.message);
    } finally {
      setLoading(false);
    }
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
        return;
      }

      await inventoryAPI.updateQuantity(
        selectedItem.id,
        quantity,
        quantityUpdate.operation,
        quantityUpdate.reason.trim() || null
      );

      Alert.alert(
        'Success',
        `Stock ${quantityUpdate.operation === 'add' ? 'added' : 'removed'} successfully`
      );
      setShowQuantityModal(false);
      resetQuantityForm();
      loadInventory();
      loadLowStockItems();
    } catch (error) {
      console.error('Error updating quantity:', error);
      Alert.alert('Error', 'Failed to update quantity: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      'Confirm Delete',
      `Are you sure you want to delete "${item.item_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await inventoryAPI.delete(item.id);
              Alert.alert('Success', 'Item deleted successfully');
              loadInventory();
              loadLowStockItems();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item: ' + error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      category: 'food_drinks',
      current_quantity: '',
      minimum_threshold: '',
      unit: 'pieces',
      cost_per_unit: '',
      supplier: '',
      description: '',
    });
    setSelectedItem(null);
  };

  const resetQuantityForm = () => {
    setQuantityUpdate({
      quantity: '',
      operation: 'add',
      reason: '',
    });
    setSelectedItem(null);
  };

  const openEditModal = (item) => {
    setSelectedItem(item);
    setFormData({
      item_name: item.item_name,
      category: item.category,
      current_quantity: item.current_quantity.toString(),
      minimum_threshold: item.minimum_threshold.toString(),
      unit: item.unit,
      cost_per_unit: item.cost_per_unit ? item.cost_per_unit.toString() : '',
      supplier: item.supplier || '',
      description: item.description || '',
    });
    setShowEditModal(true);
  };

  const openQuantityModal = (item) => {
    setSelectedItem(item);
    setShowQuantityModal(true);
  };

  const getStockStatus = (item) => {
    if (item.current_quantity <= 0) return { text: 'Out of Stock', color: '#e74c3c' };
    if (item.current_quantity <= item.minimum_threshold) return { text: 'Low Stock', color: '#f39c12' };
    return { text: 'In Stock', color: '#27ae60' };
  };

  const renderInventoryItem = ({ item }) => {
    const stockStatus = getStockStatus(item);
    
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
            <Text style={styles.stockText}>{stockStatus.text}</Text>
          </View>
        </View>
        
        <View style={styles.itemDetails}>
          <Text style={styles.itemInfo}>Category: {item.category.replace('_', ' ')}</Text>
          <Text style={styles.itemInfo}>
            Quantity: {item.current_quantity} {item.unit}
          </Text>
          <Text style={styles.itemInfo}>Min. Threshold: {item.minimum_threshold}</Text>
          {item.supplier && (
            <Text style={styles.itemInfo}>Supplier: {item.supplier}</Text>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.editButton]}
            onPress={() => openEditModal(item)}
          >
            <Icon name="edit" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.quantityButton]}
            onPress={() => openQuantityModal(item)}
          >
            <Icon name="inventory" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Stock</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteItem(item)}
          >
            <Icon name="delete" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderForm = () => (
    <ScrollView style={styles.formContainer}>
      <TextInput
        style={styles.input}
        placeholder="Item Name *"
        value={formData.item_name}
        onChangeText={(text) => setFormData(prev => ({ ...prev, item_name: text }))}
      />
      
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Category:</Text>
        <Picker
          selectedValue={formData.category}
          onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
          style={styles.picker}
        >
          {categories.slice(1).map(cat => (
            <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
          ))}
        </Picker>
      </View>

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Current Quantity"
          value={formData.current_quantity}
          onChangeText={(text) => setFormData(prev => ({ ...prev, current_quantity: text }))}
          keyboardType="numeric"
        />
        <TextInput
          style={[styles.input, styles.halfInput]}
          placeholder="Min. Threshold"
          value={formData.minimum_threshold}
          onChangeText={(text) => setFormData(prev => ({ ...prev, minimum_threshold: text }))}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Unit:</Text>
        <Picker
          selectedValue={formData.unit}
          onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
          style={styles.picker}
        >
          {units.map(unit => (
            <Picker.Item key={unit.value} label={unit.label} value={unit.value} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Cost per Unit"
        value={formData.cost_per_unit}
        onChangeText={(text) => setFormData(prev => ({ ...prev, cost_per_unit: text }))}
        keyboardType="decimal-pad"
      />

      <TextInput
        style={styles.input}
        placeholder="Supplier"
        value={formData.supplier}
        onChangeText={(text) => setFormData(prev => ({ ...prev, supplier: text }))}
      />

      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Description"
        value={formData.description}
        onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
        multiline
        numberOfLines={3}
      />
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Icon name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <View style={styles.alertContainer}>
          <Icon name="warning" size={20} color="#f39c12" />
          <Text style={styles.alertText}>
            {lowStockItems.length} item(s) are low on stock
          </Text>
        </View>
      )}

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        <View style={styles.filterContainer}>
          <Picker
            selectedValue={selectedCategory}
            onValueChange={setSelectedCategory}
            style={styles.categoryPicker}
          >
            {categories.map(cat => (
              <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Inventory List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderInventoryItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Icon name="inventory" size={64} color="#bdc3c7" />
              <Text style={styles.emptyText}>No inventory items found</Text>
              <TouchableOpacity 
                style={styles.addFirstItemButton}
                onPress={() => setShowAddModal(true)}
              >
                <Text style={styles.addFirstItemText}>Add First Item</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Floating Action Button for Quick Add */}
      <TouchableOpacity 
        style={styles.floatingActionButton}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TouchableOpacity onPress={() => { setShowAddModal(false); resetForm(); }}>
              <Icon name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          {renderForm()}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => { setShowAddModal(false); resetForm(); }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleAddItem}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Adding...' : 'Add Item'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal visible={showEditModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TouchableOpacity onPress={() => { setShowEditModal(false); resetForm(); }}>
              <Icon name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          {renderForm()}
          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => { setShowEditModal(false); resetForm(); }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleEditItem}
              disabled={loading}
            >
              <Text style={styles.saveButtonText}>
                {loading ? 'Updating...' : 'Update Item'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quantity Update Modal */}
      <Modal visible={showQuantityModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Stock</Text>
            <TouchableOpacity onPress={() => { setShowQuantityModal(false); resetQuantityForm(); }}>
              <Icon name="close" size={24} color="#2c3e50" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            {selectedItem && (
              <View style={styles.itemSummary}>
                <Text style={styles.itemSummaryTitle}>{selectedItem.item_name}</Text>
                <Text style={styles.itemSummaryText}>
                  Current Stock: {selectedItem.current_quantity} {selectedItem.unit}
                </Text>
              </View>
            )}

            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Operation:</Text>
              <Picker
                selectedValue={quantityUpdate.operation}
                onValueChange={(value) => setQuantityUpdate(prev => ({ ...prev, operation: value }))}
                style={styles.picker}
              >
                <Picker.Item label="Add Stock (Stock In)" value="add" />
                <Picker.Item label="Remove Stock (Stock Out)" value="subtract" />
              </Picker>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Quantity *"
              value={quantityUpdate.quantity}
              onChangeText={(text) => setQuantityUpdate(prev => ({ ...prev, quantity: text }))}
              keyboardType="numeric"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason (optional)"
              value={quantityUpdate.reason}
              onChangeText={(text) => setQuantityUpdate(prev => ({ ...prev, reason: text }))}
              multiline
              numberOfLines={2}
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => { setShowQuantityModal(false); resetQuantityForm(); }}
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
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a237e',
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 4,
  },
  alertText: {
    marginLeft: 8,
    color: '#856404',
    fontWeight: '500',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    marginBottom: 12,
    borderRadius: 16,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchInput: {
    backgroundColor: '#f5f7fa',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterContainer: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryPicker: {
    height: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  listContainer: {
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
    borderRadius: 16,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a237e',
    flex: 1,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stockText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  itemDetails: {
    marginBottom: 12,
  },
  itemInfo: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
  },
  editButton: {
    backgroundColor: '#1a237e',
  },
  quantityButton: {
    backgroundColor: '#FF8C42',
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  addFirstItemButton: {
    marginTop: 20,
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addFirstItemText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a237e',
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  input: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 1,
    marginRight: 6,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  picker: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  itemSummary: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  itemSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  itemSummaryText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  saveButton: {
    backgroundColor: '#FF8C42',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});

export default InventoryScreen;