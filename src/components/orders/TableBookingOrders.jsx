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
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../../../config';
import MenuItemCard from '../menu/MenuItemCard';
import VariationModal from '../menu/VariationModal';
import { PreparedFoodIcon, PackedFoodIcon } from '../common/icon';

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function TableOrder({ route, navigation }) {
  const { tableId, tableName, table, gameType, color, existingCart } = route.params || {};

  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // To preserve hook order, we must keep the original hooks in the exact same place
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

  // Variation Modal states
  const [selectedVariationItem, setSelectedVariationItem] = useState(null);
  const [isVariationModalVisible, setIsVariationModalVisible] = useState(false);

  // New hooks for two-tier category logic added AFTER the original hooks
  const [selectedMainCategory, setSelectedMainCategory] = useState('prepared');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  const [mainCategories, setMainCategories] = useState(['prepared', 'packed']);
  const [subCategories, setSubCategories] = useState([]);

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
    } catch (error) {
      console.error('Error fetching menu:', error);
      setMenuItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update categories dynamically when menu items or main category change
  useEffect(() => {
    if (menuItems.length > 0) {
      // 1. Extract Main Categories
      const uniqueMainCats = Array.from(
        new Set(
          menuItems.map(m => (m.item_type || 'prepared').toLowerCase()).filter(Boolean),
        ),
      );
      if (uniqueMainCats.length && !uniqueMainCats.includes(selectedMainCategory)) {
        setMainCategories(uniqueMainCats);
        setSelectedMainCategory(uniqueMainCats[0]);
      } else if (uniqueMainCats.length) {
        setMainCategories(uniqueMainCats);
      }

      // 2. Extract Sub Categories
      const activeMainCat = uniqueMainCats.includes(selectedMainCategory) ? selectedMainCategory : (uniqueMainCats[0] || 'prepared');
      const relevantSubCats = Array.from(
        new Set(
          menuItems
            .filter(m => (m.item_type || 'prepared').toLowerCase() === activeMainCat)
            .map(m => (m.category || '').toLowerCase())
            .filter(Boolean),
        ),
      );
      
      setSubCategories(prevSubCats => {
        if (relevantSubCats.length > 0 && !relevantSubCats.includes(selectedSubCategory)) {
           setSelectedSubCategory(relevantSubCats[0]);
        } else if (relevantSubCats.length === 0) {
           setSelectedSubCategory('');
        }
        return relevantSubCats;
      });
    }
  }, [selectedMainCategory, menuItems]);

  useEffect(() => {
    fetchMenuItems();

    // Pre-fill cart if existing items were passed back
    if (existingCart && existingCart.length > 0) {
      const mapped = existingCart.map(i => ({
        item: {
          id: i.item?.id || i.id,
          name: i.item?.name || i.name,
          price: i.item?.price || i.price,
          category: i.item?.category || i.category,
        },
        qty: i.quantity || i.qty,
        variation_id: i.variation_id || null,
        uid: i.variation_id ? `${i.item?.id || i.id}_${i.variation_id}` : `${i.item?.id || i.id}`,
      }));
      setCartItems(mapped);
    }
  }, [fetchMenuItems, existingCart]);

  useFocusEffect(
    useCallback(() => {
      fetchMenuItems();
    }, [fetchMenuItems]),
  );

  // Filter items by category and search
  const filteredItems = menuItems.filter(item => {
    const matchesMainCat = (item.item_type || 'prepared').toLowerCase() === selectedMainCategory.toLowerCase();
    const matchesSubCat = !selectedSubCategory || (item.category || '').toLowerCase() === selectedSubCategory.toLowerCase();
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesMainCat && matchesSubCat && matchesSearch;
  });

  // Handle add food (with or without variation)
  const handleAddFood = (food, variation = null) => {
    setCartItems(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const uid = variation ? `${food.id}_${variation.id}` : `${food.id}`;
      
      const idx = arr.findIndex(ci => ci.uid === uid);
      if (idx !== -1) {
        const clone = [...arr];
        clone[idx] = { ...clone[idx], qty: clone[idx].qty + 1 };
        return clone;
      }
      return [
        ...arr,
        {
          item: {
            ...food,
            price: variation ? variation.selling_price : food.price, // use variation price
            name: variation ? `${food.name} - ${variation.variation_name}` : food.name, // Append variation name
          },
          qty: 1,
          variation_id: variation?.id || null,
          uid,
        },
      ];
    });
  };

  // Handle remove from cart summary
  const handleDecreaseFoodByUid = uid => {
    setCartItems(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      const idx = arr.findIndex(ci => ci.uid === uid);
      
      if (idx !== -1) {
        const clone = [...arr];
        if (clone[idx].qty > 1) {
          clone[idx] = { ...clone[idx], qty: clone[idx].qty - 1 };
          return clone;
        } else {
          // Remove if quantity is 1
          return clone.filter((_, i) => i !== idx);
        }
      }
      return arr;
    });
  };

  // Handle generic decrease from menu card
  const handleDecreaseFood = (foodId) => {
    setCartItems((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      // Find the most recently added instance of this base item
      // We will loop backwards to find the last occurrence
      let lastIndex = -1;
      for (let i = arr.length - 1; i >= 0; i--) {
         // handle both old state structures (without uid) and new state structures
         const match = arr[i].uid 
             ? arr[i].uid.startsWith(`${foodId}_`) || arr[i].uid === `${foodId}`
             : arr[i].item.id === foodId;
         if (match) {
             lastIndex = i;
             break;
         }
      }

      if (lastIndex !== -1) {
         const uidToRemove = arr[lastIndex].uid || arr[lastIndex].item.id;
         // Now reuse the specific uid remover logic
         const clone = [...arr];
         if (clone[lastIndex].qty > 1) {
             clone[lastIndex] = { ...clone[lastIndex], qty: clone[lastIndex].qty - 1 };
             return clone;
         } else {
             return clone.filter((_, i) => i !== lastIndex);
         }
      }
      return arr;
    });
  };

  // Handle completely remove from cart
  const handleRemoveFromCart = uid => {
    setCartItems(prev =>
      Array.isArray(prev) ? prev.filter(ci => ci.uid !== uid) : [],
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

        {/* Navigation Tabs */}
        <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
          <TouchableOpacity 
            style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' }}
            onPress={() => navigation?.goBack()}
          >
            <Text style={{ color: '#666', fontWeight: '600' }}>Table</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#FF8C42', alignItems: 'center' }}>
            <Text style={{ color: '#FF8C42', fontWeight: '600' }}>Food</Text>
          </TouchableOpacity>
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

      {/* Navigation Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', alignItems: 'center' }}
          onPress={() => navigation?.goBack()}
        >
          <Text style={{ color: '#666', fontWeight: '600' }}>Table</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: '#FF8C42', alignItems: 'center' }}>
          <Text style={{ color: '#FF8C42', fontWeight: '600' }}>Food</Text>
        </TouchableOpacity>
      </View>

      {/* Main Categories Row */}
      {mainCategories.length > 0 && (
        <View style={styles.mainCategoriesGrid}>
          {mainCategories.map(cat => {
            const IconComponent = cat.toLowerCase() === 'prepared' ? PreparedFoodIcon : 
                                cat.toLowerCase() === 'packed' ? PackedFoodIcon : null;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.mainCategoryButton,
                  selectedMainCategory === cat && styles.mainCategoryButtonActive,
                ]}
                onPress={() => setSelectedMainCategory(cat)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {IconComponent && (
                    <IconComponent 
                      size={18} 
                      color={selectedMainCategory === cat ? '#FFFFFF' : '#666666'} 
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <Text
                    style={[
                      styles.mainCategoryButtonText,
                      selectedMainCategory === cat &&
                        styles.mainCategoryButtonTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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

      {/* Sub Category Tabs */}
      {subCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.subCategoriesScroll}
          contentContainerStyle={styles.subCategoriesContent}
        >
          {subCategories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.subCategoryButton,
                selectedSubCategory === cat && styles.subCategoryButtonActive,
              ]}
              onPress={() => setSelectedSubCategory(cat)}
            >
              <Text
                style={[
                  styles.subCategoryButtonText,
                  selectedSubCategory === cat && styles.subCategoryButtonTextActive,
                ]}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Menu List */}
      <View style={styles.foodListContainer}>
        <FlatList
          data={filteredItems}
          keyExtractor={item => String(item.id || item.name)}
          contentContainerStyle={styles.foodListContent}
          renderItem={({ item }) => (
            <MenuItemCard
              item={item}
              cartItems={cartItems}
              onAddFood={handleAddFood}
              onRemoveFood={handleDecreaseFood}
              onOpenVariations={(item) => {
                setSelectedVariationItem(item);
                setIsVariationModalVisible(true);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', marginTop: 40 }}>
              {selectedMainCategory.toLowerCase() === 'prepared' ? (
                <PreparedFoodIcon size={64} color="#E8E8E8" />
              ) : selectedMainCategory.toLowerCase() === 'packed' ? (
                <PackedFoodIcon size={64} color="#E8E8E8" />
              ) : (
                <Icon name="restaurant-outline" size={48} color="#E8E8E8" />
              )}
              <Text style={{ color: '#999', fontSize: 16, marginTop: 10 }}>No items found</Text>
            </View>
          }
        />
      </View>

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
                <View key={ci.uid} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>
                      {ci.item.name} x {ci.qty}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      ₹ {(Number(ci.item.price) || 0) * ci.qty}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveFromCart(ci.uid)}
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

      {/* Variation Selection Modal */}
      <VariationModal
        visible={isVariationModalVisible}
        menuItem={selectedVariationItem}
        onClose={() => setIsVariationModalVisible(false)}
        onAddVariation={handleAddFood}
      />
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

  mainCategoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  mainCategoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    alignItems: 'center',
  },
  mainCategoryButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  mainCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  mainCategoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  subCategoriesScroll: {
    flexGrow: 0,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  subCategoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  subCategoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  subCategoryButtonActive: {
    backgroundColor: '#FFF1E8',
    borderWidth: 1,
    borderColor: '#FF8C42',
    paddingHorizontal: 15,
    paddingVertical: 7,
  },
  subCategoryButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  subCategoryButtonTextActive: {
    color: '#FF8C42',
    fontWeight: '600',
  },

  // Food List Container
  foodListContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    paddingBottom: 100, // padding for sticky cart
    flex: 1,
  },
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  foodImageContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  foodCardContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  foodCardHeader: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  foodDescription: {
    fontSize: 11,
    color: '#93959F',
    lineHeight: 14,
  },
  foodCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  foodPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  // Compact Add Button
  addBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    position: 'relative',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C42',
    letterSpacing: 0.5,
  },
  addBtnPlus: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quantity Controls
  quantityControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    borderRadius: 6,
    overflow: 'hidden',
  },
  quantityBtnCompact: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 20,
    textAlign: 'center',
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
