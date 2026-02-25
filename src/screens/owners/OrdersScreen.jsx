import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CommonActions,
  useNavigation,
  useFocusEffect,
} from '@react-navigation/native';
import { API_URL } from '../../../config';
import Header from '../../components/common/Header';
import ActiveOrders from '../../components/orders/ActiveOrders';
import MenuItemCard from '../../components/menu/MenuItemCard';
import VariationModal from '../../components/menu/VariationModal';
import { PreparedFoodIcon, PackedFoodIcon } from '../../components/common/icon';

const DEFAULT_CATEGORIES = ['prepared', 'packed', 'cigarette'];

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

// Helper to get full menu image URL
const getMenuImageUrl = imageKey => {
  if (!imageKey) return null;
  return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
};

export default function OrdersScreen({ navigation }) {
  // ===== HOOKS =====
  const rootNavigation = useNavigation();
  const [activeTab, setActiveTab] = useState('FOOD');
  // Two-tier category state
  const [selectedMainCategory, setSelectedMainCategory] = useState('prepared');
  const [selectedSubCategory, setSelectedSubCategory] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cartItems, setCartItems] = useState([]); // [{item, qty}]
  const [personName, setPersonName] = useState(''); // NEW
  const [activeOrdersKey, setActiveOrdersKey] = useState(0); // Force refresh of ActiveOrders
  
  // Variation Modal states
  const [selectedVariationItem, setSelectedVariationItem] = useState(null);
  const [isVariationModalVisible, setIsVariationModalVisible] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [mainCategories, setMainCategories] = useState(['prepared', 'packed']);
  const [subCategories, setSubCategories] = useState([]);

  // Helper to parse categories from items
  const parseCategories = (items) => {
    // 1. Extract Main Categories (item_type)
    const uniqueMainCats = Array.from(
      new Set(
        items.map(m => (m.item_type || 'prepared').toLowerCase()).filter(Boolean),
      ),
    );
    if (uniqueMainCats.length) {
      setMainCategories(uniqueMainCats);
      // Don't auto-switch main category if one is already selected, unless it's invalid
      if (!uniqueMainCats.includes(selectedMainCategory)) {
         setSelectedMainCategory(uniqueMainCats[0]);
      }
    }

    // 2. Extract Sub Categories (category) based on currently selected Main Category
    const activeMainCat = uniqueMainCats.includes(selectedMainCategory) ? selectedMainCategory : (uniqueMainCats[0] || 'prepared');
    
    const relevantSubCats = Array.from(
      new Set(
        items
          .filter(m => (m.item_type || 'prepared').toLowerCase() === activeMainCat)
          .map(m => (m.category || '').toLowerCase())
          .filter(Boolean),
      ),
    );
    
    setSubCategories(relevantSubCats);
    if (relevantSubCats.length > 0 && !relevantSubCats.includes(selectedSubCategory)) {
       setSelectedSubCategory(relevantSubCats[0]);
    } else if (relevantSubCats.length === 0) {
       setSelectedSubCategory('');
    }
  };

  // ===== FETCH MENU FROM BACKEND =====
  useEffect(() => {
    const fetchMenu = async () => {
      const token = await getAuthToken();
      try {
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
        parseCategories(items);
      } catch (error) {
        console.error('Error fetching menu:', error);
        setMenuItems([]);
      }
    };

    fetchMenu();
  }, [selectedMainCategory]); // Re-parse when main category changes to update sub-categories

  // Refetch menu items when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const fetchMenu = async () => {
        const token = await getAuthToken();
        try {
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
          parseCategories(items);
        } catch (error) {
          console.error('Error fetching menu:', error);
          setMenuItems([]);
        }
      };

      fetchMenu();
    }, [selectedMainCategory]), // Re-parse when main category changes to update sub-categories
  );

  // ===== FILTERED LIST =====
  const filteredFoodItems = menuItems.filter(item => {
    const matchesMainCat = (item.item_type || 'prepared').toLowerCase() === selectedMainCategory.toLowerCase();
    const matchesSubCat = !selectedSubCategory || (item.category || '').toLowerCase() === selectedSubCategory.toLowerCase();
    const matchesSearch = (item.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesMainCat && matchesSubCat && matchesSearch;
  });

  // ===== HANDLERS =====
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
            price: variation ? variation.selling_price : food.price,
            name: variation ? `${food.name} - ${variation.variation_name}` : food.name,
          },
          qty: 1,
          variation_id: variation?.id || null,
          uid,
        },
      ];
    });
  };

  const handleRemoveFood = foodId => {
    setCartItems(prev => {
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

  const handleConfirmFood = async () => {
    console.log('handleConfirmFood called');
    console.log('Cart items:', cartItems);
    console.log('Person name:', personName);

    if (!personName.trim()) {
      alert('Please enter a name for this order');
      return;
    }

    if (cartItems.length === 0) {
      alert('Please add items to cart');
      return;
    }

    try {
      // Create order in backend
      const token = await getAuthToken();
      if (!token) {
        alert('Please login first');
        return;
      }

      const orderTotal = cartItems.reduce(
        (sum, ci) => sum + (Number(ci.item.price) || 0) * ci.qty,
        0,
      );

      // Extract correct backend payload mapping (variation_id map included from cart payload)
      // Actually `cartItems` now correctly has `variation_id` properly set, so sending it directly is fine
      // but ensure backend expects the `cart` in the shape of { item: ..., qty: ..., variation_id: ... }
      const orderData = {
        personName: personName.trim(),
        orderTotal,
        paymentMethod: 'offline', // Default payment method (will be updated in PaymentGateway)
        cashAmount: orderTotal, // Set initial amount
        onlineAmount: 0,
        cart: cartItems.map((ci) => ({
          menu_item_id: ci.item.id,
          name: ci.item.name,
          price: ci.item.price,
          quantity: ci.qty,
          variation_id: ci.variation_id || null, // newly passed variation_id
        })),
      };

      console.log('Creating order:', orderData);

      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create order');
      }

      console.log('Order created successfully:', result);

      // Refresh active orders to show the new order
      setActiveOrdersKey(prev => prev + 1);

      setShowConfirmModal(false);

      // Navigate to PaymentGateway with order ID
      navigation.navigate('PaymentGateway', {
        cart: cartItems,
        personName: personName.trim(),
        orderId: result.order?.id,
      });

      // Clear cart and form
      setCartItems([]);
      setPersonName('');
    } catch (error) {
      console.error('Order creation error:', error);
      alert('Failed to create order: ' + error.message);
    }
  };

  const handleAddOtherItem = () => {
    // keep modal open so user can see current cart, or close if you prefer
    setShowConfirmModal(false);
  };

  const handleRemoveFromCart = uid => {
    setCartItems(prev =>
      Array.isArray(prev) ? prev.filter(ci => ci.uid !== uid) : [],
    );
  };

  const safeCart = Array.isArray(cartItems) ? cartItems : [];
  const cartTotal = safeCart.reduce(
    (sum, ci) => sum + (Number(ci.item.price) || 0) * ci.qty,
    0,
  );

  // ===== RENDER =====
  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'FOOD' && styles.activeTabStyle]}
          onPress={() => setActiveTab('FOOD')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'FOOD' && styles.activeTabText,
            ]}
          >
            FOOD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'ACTIVE ORDER' && styles.activeTabStyle,
          ]}
          onPress={() => setActiveTab('ACTIVE ORDER')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'ACTIVE ORDER' && styles.activeTabText,
            ]}
          >
            ACTIVE ORDER
          </Text>
        </TouchableOpacity>
      </View>

      {/* CONTENT */}
      {activeTab === 'FOOD' ? (
        <>
          {/* Food Search */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search food items..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Categories from backend menu */}
          <View style={styles.categoriesSection}>
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

            {/* Sub Categories Row */}
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
                        selectedSubCategory === cat &&
                          styles.subCategoryButtonTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Food List from menuItems */}
          <View style={styles.foodListContainer}>
            <FlatList
              data={filteredFoodItems}
              keyExtractor={item =>
                item.id ? String(item.id) : String(item.name)
              }
              contentContainerStyle={styles.foodListContent}
              renderItem={({ item }) => (
                <MenuItemCard
                  item={item}
                  cartItems={cartItems}
                  onAddFood={handleAddFood}
                  onRemoveFood={handleRemoveFood}
                  onOpenVariations={(item) => {
                    setSelectedVariationItem(item);
                    setIsVariationModalVisible(true);
                  }}
                />
              )}
            />
          </View>
        </>
      ) : (
        <>
          {/* Active Orders Search */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={18} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by customer name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <ActiveOrders
            refreshKey={activeOrdersKey}
            searchQuery={searchQuery}
          />
        </>
      )}

      {/* Sticky Bottom Cart Summary */}
      {cartItems.length > 0 && !showConfirmModal && (
        <View style={styles.stickyCartContainer}>
          <View style={styles.stickyCartInfo}>
            <Text style={styles.stickyCartItems}>
              {cartItems.reduce((acc, ci) => acc + ci.qty, 0)} ITEM
              {cartItems.reduce((acc, ci) => acc + ci.qty, 0) > 1 ? 'S' : ''}
            </Text>
            <Text style={styles.stickyCartPrice}>₹ {cartTotal}</Text>
          </View>
          <TouchableOpacity
            style={styles.stickyCartBtn}
            onPress={() => setShowConfirmModal(true)}
          >
            <Text style={styles.stickyCartBtnText}>View Cart</Text>
            <Icon name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Confirm Modal - Replaced with Absolute View */}
      {showConfirmModal && (
        <View
          style={[
            styles.modalOverlay,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cart</Text>

            {cartItems.length === 0 ? (
              <Text style={styles.modalSubtitle}>No items added yet.</Text>
            ) : (
              <>
                {cartItems.map(ci => (
                  <View
                    key={ci.uid}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                      width: '100%',
                    }}
                  >
                    <Text style={{ flex: 1, fontSize: 14, color: '#333' }}>
                      {ci.item.name} x {ci.qty}
                    </Text>
                    <Text
                      style={{ fontSize: 14, color: '#666', marginRight: 8 }}
                    >
                      ₹ {(Number(ci.item.price) || 0) * ci.qty}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveFromCart(ci.uid)}
                    >
                      <Icon name="trash-outline" size={18} color="#FF4D4F" />
                    </TouchableOpacity>
                  </View>
                ))}
                <Text
                  style={{
                    alignSelf: 'flex-end',
                    fontSize: 15,
                    fontWeight: 'bold',
                    marginTop: 8,
                    marginBottom: 16,
                    color: '#333',
                  }}
                >
                  Total: ₹ {cartTotal}
                </Text>
              </>
            )}
            <Text
              style={{
                alignSelf: 'flex-start',
                marginTop: 8,
                marginBottom: 4,
                fontSize: 13,
                color: '#555',
              }}
            >
              Name for this order
            </Text>
            <TextInput
              style={{
                width: '100%',
                borderWidth: 1,
                borderColor: '#E0E0E0',
                borderRadius: 8,
                paddingHorizontal: 10,
                paddingVertical: 8,
                marginBottom: 16,
                fontSize: 14,
                color: '#333',
                backgroundColor: '#FAFAFA',
              }}
              placeholder="Enter person's name"
              placeholderTextColor="#999"
              value={personName}
              onChangeText={setPersonName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButtonPrimary,
                  cartItems.length === 0 && { opacity: 0.5 },
                ]}
                disabled={cartItems.length === 0}
                onPress={handleConfirmFood}
              >
                <Text style={styles.modalButtonPrimaryText}>Confirm Food</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={handleAddOtherItem}
              >
                <Text style={styles.modalButtonSecondaryText}>
                  Add Other Item
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: '#F8F9FA',
  },

  // Search Row
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    gap: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    margin: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    padding: 0,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 12,
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
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  activeTabStyle: {
    backgroundColor: '#FFF8F5',
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999999',
    letterSpacing: 0.5,
  },
  activeTabText: {
    color: '#FF8C42',
    fontWeight: '700',
  },

  // Categories
  categoriesSection: {
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    marginTop: 12,
  },
  
  // Main Categories
  mainCategoriesGrid: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
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

  // Sub Categories
  subCategoriesScroll: {
    flexGrow: 0,
    marginBottom: 16,
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
    backgroundColor: '#FFF1E8', // Light orange background
    borderWidth: 1,
    borderColor: '#FF8C42',
    paddingHorizontal: 15, // Adjust for border width
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

  foodListContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    gap: 8,
    paddingBottom: 100, // padding for sticky cart
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

  // Sticky Cart Summary
  stickyCartContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    zIndex: 99,
  },
  stickyCartInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stickyCartItems: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  stickyCartPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stickyCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  stickyCartBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#888888',
    marginBottom: 24,
  },
  modalButtons: {
    width: '100%',
    gap: 12,
  },
  modalButtonPrimary: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  modalButtonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  modalButtonSecondaryText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
});
