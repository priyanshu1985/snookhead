import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { inventoryAPI } from '../services/api';

const AddInventoryScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'food_drinks',
    current_quantity: '',
    minimum_threshold: '',
    unit: 'pieces',
    cost_per_unit: '',
    supplier: '',
    description: '',
    last_restocked: '',
  });

  const categories = [
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
    { label: 'Grams', value: 'grams' },
    { label: 'Liters', value: 'liters' },
    { label: 'Milliliters', value: 'ml' },
    { label: 'Packets', value: 'packets' },
    { label: 'Boxes', value: 'boxes' },
    { label: 'Bottles', value: 'bottles' },
    { label: 'Meters', value: 'meters' },
    { label: 'Sets', value: 'sets' },
  ];

  const handleAddItem = async () => {
    try {
      // Validation - match backend requirements
      if (
        !formData.item_name ||
        !formData.item_name.trim ||
        !formData.item_name.trim()
      ) {
        Alert.alert('Error', 'Item name is required');
        return;
      }

      if (
        formData.item_name &&
        formData.item_name.trim &&
        formData.item_name.trim().length > 100
      ) {
        Alert.alert('Error', 'Item name cannot exceed 100 characters');
        return;
      }

      if (!formData.category) {
        Alert.alert('Error', 'Category is required');
        return;
      }

      if (!formData.unit || !formData.unit.trim || !formData.unit.trim()) {
        Alert.alert('Error', 'Unit is required');
        return;
      }

      if (
        formData.unit &&
        formData.unit.trim &&
        formData.unit.trim().length > 20
      ) {
        Alert.alert('Error', 'Unit cannot exceed 20 characters');
        return;
      }

      const currentQty = parseInt(formData.current_quantity) || 0;
      const minThreshold = parseInt(formData.minimum_threshold) || 10;

      if (currentQty < 0) {
        Alert.alert('Error', 'Current quantity cannot be negative');
        return;
      }

      if (minThreshold < 0) {
        Alert.alert('Error', 'Minimum threshold cannot be negative');
        return;
      }

      if (
        formData.supplier &&
        formData.supplier.trim &&
        formData.supplier.trim().length > 100
      ) {
        Alert.alert('Error', 'Supplier name cannot exceed 100 characters');
        return;
      }

      // Validate date format if provided
      if (
        formData.last_restocked &&
        formData.last_restocked.trim &&
        formData.last_restocked.trim()
      ) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(formData.last_restocked.trim())) {
          Alert.alert(
            'Error',
            'Last restocked date must be in YYYY-MM-DD format',
          );
          return;
        }
        const date = new Date(formData.last_restocked.trim());
        if (isNaN(date.getTime())) {
          Alert.alert('Error', 'Please enter a valid date');
          return;
        }
        if (date > new Date()) {
          Alert.alert('Error', 'Last restocked date cannot be in the future');
          return;
        }
      }

      setLoading(true);

      // Prepare data to match backend expectations exactly
      const itemData = {
        item_name:
          formData.item_name && formData.item_name.trim
            ? formData.item_name.trim()
            : '',
        category: formData.category,
        current_quantity: currentQty,
        minimum_threshold: minThreshold,
        unit:
          formData.unit && formData.unit.trim ? formData.unit.trim() : 'pieces',
        cost_per_unit:
          formData.cost_per_unit &&
          formData.cost_per_unit.trim &&
          formData.cost_per_unit.trim()
            ? parseFloat(formData.cost_per_unit)
            : null,
        supplier:
          formData.supplier && formData.supplier.trim
            ? formData.supplier.trim() || null
            : null,
        description:
          formData.description && formData.description.trim
            ? formData.description.trim() || null
            : null,
        last_restocked: formData.last_restocked
          ? new Date(formData.last_restocked).toISOString()
          : null,
      };

      console.log('Creating item with data:', itemData);
      await inventoryAPI.create(itemData);

      Alert.alert('Success!', 'Item added successfully to inventory', [
        {
          text: 'Add Another',
          onPress: () => resetForm(),
        },
        {
          text: 'View Dashboard',
          onPress: () => navigation.navigate('InventoryDashboard'),
          style: 'default',
        },
      ]);
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item: ' + error.message);
    } finally {
      setLoading(false);
    }
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
      last_restocked: '',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#FF8C42" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Stock Item</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.formContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Item Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Item Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter item name (max 100 characters)"
            value={formData.item_name || ''}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, item_name: text }))
            }
            maxLength={100}
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.category}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, category: value }))
              }
              style={styles.picker}
            >
              {categories.map(cat => (
                <Picker.Item
                  key={cat.value}
                  label={cat.label}
                  value={cat.value}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Quantity and Threshold */}
        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Current Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              value={formData.current_quantity || ''}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, current_quantity: text }))
              }
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Default: 0</Text>
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Min. Threshold</Text>
            <TextInput
              style={styles.input}
              placeholder="10"
              value={formData.minimum_threshold || ''}
              onChangeText={text =>
                setFormData(prev => ({ ...prev, minimum_threshold: text }))
              }
              keyboardType="numeric"
            />
            <Text style={styles.helpText}>Default: 10</Text>
          </View>
        </View>

        {/* Unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Unit *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.unit}
              onValueChange={value =>
                setFormData(prev => ({ ...prev, unit: value }))
              }
              style={styles.picker}
            >
              {units.map(unit => (
                <Picker.Item
                  key={unit.value}
                  label={unit.label}
                  value={unit.value}
                />
              ))}
            </Picker>
          </View>
          <Text style={styles.helpText}>Required field, max 20 characters</Text>
        </View>

        {/* Cost per unit */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cost per Unit (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={formData.cost_per_unit || ''}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, cost_per_unit: text }))
            }
            keyboardType="decimal-pad"
          />
        </View>

        {/* Supplier */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Supplier</Text>
          <TextInput
            style={styles.input}
            placeholder="Supplier name (max 100 characters)"
            value={formData.supplier || ''}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, supplier: text }))
            }
            maxLength={100}
          />
        </View>

        {/* Last Restocked Date */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Last Restocked Date (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD (e.g., 2026-01-10)"
            value={formData.last_restocked || ''}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, last_restocked: text }))
            }
          />
          <Text style={styles.helpText}>Leave empty if this is a new item</Text>
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Additional details about the item"
            value={formData.description || ''}
            onChangeText={text =>
              setFormData(prev => ({ ...prev, description: text }))
            }
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.addButton, loading && styles.disabledButton]}
          onPress={handleAddItem}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="add" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add to Inventory</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
  },
  picker: {
    height: 50,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginRight: 10,
  },
  bottomPadding: {
    height: 100,
  },
  buttonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default AddInventoryScreen;
