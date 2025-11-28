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
import { API_URL } from '../config';
import ActiveOrders from '../components/ActiveOrders';

const DEFAULT_CATEGORIES = ['prepared', 'packed', 'cigarette'];

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function OrdersScreen({ navigation }) {
  // ===== HOOKS =====
  const rootNavigation = useNavigation();
  const [activeTab, setActiveTab] = useState('FOOD');
  const [selectedCategory, setSelectedCategory] = useState('prepared');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [cartItems, setCartItems] = useState([]); // [{item, qty}]
  const [personName, setPersonName] = useState(''); // NEW
  const [activeOrders, setActiveOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [activeOrdersKey, setActiveOrdersKey] = useState(0); // Force refresh of ActiveOrders

  // ===== FETCH MENU FROM BACKEND =====
  useEffect(() => {
    const fetchMenu = async () => {
      const token = await getAuthToken();
      try {
        console.log('Fetching menu items from:', `${API_URL}/api/menu`);
        const res = await fetch(`${API_URL}/api/menu`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await res.json();
        console.log('Menu API response:', result);

        const items = Array.isArray(result)
          ? result
          : result.menus || result.items || result.data || [];

        console.log('Processed menu items:', items);
        setMenuItems(items);

        // derive categories from menu data
        const uniqueCats = Array.from(
          new Set(
            items.map(m => (m.category || '').toLowerCase()).filter(Boolean),
          ),
        );
        if (uniqueCats.length) {
          setCategories(uniqueCats);
          setSelectedCategory(uniqueCats[0]);
        }
        console.log('Available categories:', uniqueCats);
      } catch (error) {
        console.error('Error fetching menu:', error);
        setMenuItems([]);
      }
    };

    fetchMenu();
  }, []);

  // Refetch menu items when screen comes into focus (to get newly added items)
  useFocusEffect(
    useCallback(() => {
      console.log('OrdersScreen focused, refetching menu items...');
      const fetchMenu = async () => {
        const token = await getAuthToken();
        try {
          console.log('Fetching menu items from:', `${API_URL}/api/menu`);
          const res = await fetch(`${API_URL}/api/menu`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const result = await res.json();
          console.log('Menu API response:', result);

          const items = Array.isArray(result)
            ? result
            : result.menus || result.items || result.data || [];

          console.log('Processed menu items:', items);
          setMenuItems(items);

          // derive categories from menu data
          const uniqueCats = Array.from(
            new Set(
              items.map(m => (m.category || '').toLowerCase()).filter(Boolean),
            ),
          );
          if (uniqueCats.length) {
            setCategories(uniqueCats);
            setSelectedCategory(uniqueCats[0]);
          }
          console.log('Available categories:', uniqueCats);
        } catch (error) {
          console.error('Error fetching menu:', error);
          setMenuItems([]);
        }
      };

      fetchMenu();
    }, []),
  );

  // ===== FILTERED LIST =====
  const filteredFoodItems = menuItems.filter(
    item =>
      (item.category || '').toLowerCase() === selectedCategory.toLowerCase() &&
      (item.name || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // ===== HANDLERS =====
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
    setShowConfirmModal(true);
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

      const orderData = {
        personName: personName.trim(),
        orderTotal,
        paymentMethod: 'offline', // Default payment method (will be updated in PaymentGateway)
        cashAmount: orderTotal, // Set initial amount
        onlineAmount: 0,
        cart: cartItems,
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

  const handleRemoveFromCart = id => {
    setCartItems(prev =>
      Array.isArray(prev) ? prev.filter(ci => ci.item.id !== id) : [],
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food and order</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search + Date Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={18} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search food"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity style={styles.dateButton}>
          <Icon name="calendar-outline" size={18} color="#999" />
          <Text style={styles.dateButtonText}>Select Date</Text>
        </TouchableOpacity>
      </View>

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
          {/* Categories from backend menu */}
          <View style={styles.categoriesSection}>
            <View style={styles.categoriesGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryButton,
                    selectedCategory === cat && styles.categoryButtonActive,
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.categoryButtonText,
                      selectedCategory === cat &&
                        styles.categoryButtonTextActive,
                    ]}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Food Grid from menuItems */}
          <FlatList
            data={filteredFoodItems}
            keyExtractor={item =>
              item.id ? String(item.id) : String(item.name)
            }
            numColumns={2}
            columnWrapperStyle={styles.foodRow}
            contentContainerStyle={styles.foodListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.foodCard}
                onPress={() => handleAddFood(item)}
              >
                {item.image ? (
                  <Image
                    source={{ uri: item.image }}
                    style={styles.foodImage}
                  />
                ) : (
                  <View
                    style={[styles.foodImage, { backgroundColor: '#FFF8F0' }]}
                  />
                )}
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodPrice}>₹ {item.price}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddFood(item)}
                >
                  <Icon name="add" size={18} color="#FF8C42" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </>
      ) : (
        <ActiveOrders refreshKey={activeOrdersKey} />
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
            <Text style={styles.modalTitle}>Cart</Text>

            {cartItems.length === 0 ? (
              <Text style={styles.modalSubtitle}>No items added yet.</Text>
            ) : (
              <>
                {cartItems.map(ci => (
                  <View
                    key={ci.item.id}
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
                      onPress={() => handleRemoveFromCart(ci.item.id)}
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
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },

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
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dateButtonText: { fontSize: 12, color: '#999' },

  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTabStyle: { borderBottomColor: '#FF8C42' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#999' },
  activeTabText: { color: '#FF8C42' },

  // NEW CATEGORY STYLES (replace the old ones)
  categoriesSection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  categoriesGrid: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    backgroundColor: '#FAFAFA',
    minWidth: 90,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  categoryButtonTextActive: {
    color: '#fff',
  },
  foodListContent: {
    padding: 16,
    paddingTop: 8,
  },
  foodRow: { justifyContent: 'space-between', marginBottom: 16 },
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
  foodImage: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  foodPrice: { fontSize: 13, color: '#666', marginBottom: 8 },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    alignItems: 'center',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  modalSubtitle: { fontSize: 16, color: '#666', marginBottom: 24 },
  modalButtons: { width: '100%', gap: 12 },
  modalButtonPrimary: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonSecondaryText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
