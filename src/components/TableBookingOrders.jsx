import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function TableOrder({ route, navigation }) {
  const { tableId, tableName, table, gameType, color } = route.params || {};

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([
    'FOOD',
    'PACKFOOD',
    'BEVERAGES',
  ]);
  const [selectedCategory, setSelectedCategory] = useState('FOOD');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [personName, setPersonName] = useState('');

  // Fetch menu items from backend
  const fetchMenuItems = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) return;

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/menu`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await res.json();
      const items = Array.isArray(result)
        ? result
        : result.menus || result.items || result.data || [];
      setMenuItems(items);

      // Derive categories from menu data
      const uniqueCats = Array.from(
        new Set(
          items.map(m => (m.category || '').toUpperCase()).filter(Boolean),
        ),
      );
      if (uniqueCats.length) {
        setCategories(uniqueCats);
        setSelectedCategory(uniqueCats[0]);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenuItems();
  }, [fetchMenuItems]);

  useFocusEffect(
    useCallback(() => {
      fetchMenuItems();
    }, [fetchMenuItems]),
  );

  // Filter items by category and search
  const filteredItems = menuItems.filter(
    item =>
      (item.category || '').toUpperCase() === selectedCategory.toUpperCase() &&
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle add food
  const handleAddFood = food => {
    setCartItems(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const idx = arr.findIndex(ci => ci.item.id === food.id);
      if (idx !== -1) {
        const clone = [...arr];
        clone[idx] = { ...clone[idx], qty: clone[idx].qty + 1 };
        return clone;
      }
      return [...arr, { item: food, qty: 1 }];
    });
  };

  // Handle remove from cart
  const handleRemoveFromCart = id => {
    setCartItems(prev =>
      Array.isArray(prev) ? prev.filter(ci => ci.item.id !== id) : [],
    );
  };

  // Handle confirm order
  const handleConfirmOrder = () => {
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Please select at least one item');
      return;
    }

    setShowConfirmModal(false);

    try {
      // Navigate back to TableBookingScreen with selected food items
      navigation.navigate('TableBookingScreen', {
        selectedFoodItems: cartItems,
        tableId,
        tableName,
        table,
        gameType,
        color,
      });
    } catch (error) {
      Alert.alert('Error', 'Navigation failed: ' + error.message);
    }
  };

  const cartTotal = cartItems.reduce(
    (sum, ci) => sum + (Number(ci.item.price) || 0) * ci.qty,
    0,
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Icon name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Food</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={{ marginTop: 12, color: '#666' }}>Loading menu...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.filterButton}>
          <Icon name="filter" size={18} color="#FF8C42" />
        </TouchableOpacity>
      </View>

      {/* Category Tabs */}
      <View style={styles.categoryTabs}>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.categoryTab,
              selectedCategory === cat && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === cat && styles.categoryTabTextActive,
              ]}
            >
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Menu Grid */}
      <FlatList
        data={filteredItems}
        keyExtractor={item => String(item.id || item.name)}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.foodCard}
            activeOpacity={0.8}
            onPress={() => handleAddFood(item)}
          >
            <View style={styles.imageContainer}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.foodImage} />
              ) : (
                <View
                  style={[styles.foodImage, { backgroundColor: '#FFF8F0' }]}
                >
                  <Icon name="fast-food-outline" size={40} color="#FF8C42" />
                </View>
              )}
            </View>
            <Text style={styles.foodName}>{item.name}</Text>
            <Text style={styles.foodPrice}>₹{item.price}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddFood(item)}
            >
              <Icon name="add" size={18} color="#FF8C42" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', marginTop: 40 }}>
            <Text style={{ color: '#999', fontSize: 16 }}>No items found</Text>
          </View>
        }
      />

      {/* Confirm Button (Fixed at Bottom) */}
      {cartItems.length > 0 && (
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={() => setShowConfirmModal(true)}
        >
          <Text style={styles.confirmButtonText}>Confirm</Text>
        </TouchableOpacity>
      )}

      {/* Confirm Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Order Summary</Text>

            {/* Cart Items */}
            <View style={styles.cartItemsContainer}>
              {cartItems.map(ci => (
                <View key={ci.item.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>
                      {ci.item.name} x {ci.qty}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      ₹ {(Number(ci.item.price) || 0) * ci.qty}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFromCart(ci.item.id)}
                  >
                    <Icon name="trash-outline" size={18} color="#FF4D4F" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Total */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>₹ {cartTotal}</Text>
            </View>

            {/* Person Name Input */}
            <Text style={styles.inputLabel}>Person Name</Text>
            <TextInput
              style={styles.personNameInput}
              placeholder="Enter person name"
              placeholderTextColor="#999"
              value={personName}
              onChangeText={setPersonName}
            />

            {/* Modal Buttons */}
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
                onPress={handleConfirmOrder}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  Confirm Selection
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    gap: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  categoryTabActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  categoryTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  categoryTabTextActive: {
    color: '#fff',
  },

  gridContent: {
    padding: 12,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  foodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  imageContainer: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#FFF8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  foodImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  foodPrice: {
    fontSize: 13,
    color: '#FF8C42',
    fontWeight: '600',
    marginBottom: 8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8F0',
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },

  confirmButton: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingVertical: 14,
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },

  cartItemsContainer: {
    maxHeight: 200,
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  cartItemPrice: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  personNameInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FAFAFA',
  },

  modalButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modalButtonPrimary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
