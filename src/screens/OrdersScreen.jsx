import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Sample food data
const foodCategories = [
  { key: 'food', label: 'food', icon: '🍜' },
  { key: 'Pack Food', label: 'Pack Food', icon: '📦' },
  { key: 'beverages', label: 'beverages', icon: '🥤' },
];

const foodItems = [
  {
    id: '1',
    name: 'Noodles',
    price: 330,
    image:
      'https://img.freepik.com/free-photo/delicious-asian-noodles-with-vegetables-table_23-2148670481.jpg',
    category: 'food',
  },
  {
    id: '2',
    name: 'Nachos',
    price: 310,
    image:
      'https://img.freepik.com/free-photo/nachos-with-cheese-mexican-food_144627-14608.jpg',
    category: 'food',
  },
  {
    id: '3',
    name: 'Pasta',
    price: 330,
    image:
      'https://img.freepik.com/free-photo/penne-pasta-tomato-sauce-with-chicken-tomatoes-wooden-table_2829-19744.jpg',
    category: 'Pack Food',
  },
  {
    id: '4',
    name: 'Wrap',
    price: 330,
    image:
      'https://img.freepik.com/free-photo/shawarma-wrap-with-vegetables_140725-6457.jpg',
    category: 'beverages',
  },
];

const activeOrdersData = [
  { id: '1', name: 'Rohit Sharma', waitTime: '10 min' },
  { id: '2', name: 'Virat', waitTime: '5 min' },
  { id: '3', name: 'Riyaa', waitTime: '13 min' },
  { id: '4', name: 'Mahi', waitTime: '2 min' },
];

export default function OrdersScreen({ navigation }) {
  // ===== ALL HOOKS MUST BE AT THE TOP =====
  const [activeTab, setActiveTab] = useState('FOOD');
  const [selectedCategory, setSelectedCategory] = useState('food');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedFood, setSelectedFood] = useState(null);

  // ===== HANDLERS =====
  const filteredFoodItems = foodItems.filter(
    item =>
      item.category === selectedCategory &&
      item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddFood = food => {
    setSelectedFood(food);
    setShowConfirmModal(true);
  };

  const handleConfirmFood = () => {
    setShowConfirmModal(false);
    navigation?.navigate('PaymentGateway', { food: selectedFood });
  };

  const handleAddOtherItem = () => {
    setShowConfirmModal(false);
  };

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Food and order</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search and Date Row */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity>
            <Icon name="mic" size={20} color="#FF8C42" />
          </TouchableOpacity>
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

      {/* Content */}
      {activeTab === 'FOOD' ? (
        <>
          {/* Categories */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
          >
            {foodCategories.map(category => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.categoryPill,
                  selectedCategory === category.key &&
                    styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(category.key)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === category.key &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Food Grid */}
          <FlatList
            data={filteredFoodItems}
            keyExtractor={item => item.id}
            numColumns={2}
            columnWrapperStyle={styles.foodRow}
            contentContainerStyle={styles.foodListContent}
            renderItem={({ item }) => (
              <View style={styles.foodCard}>
                <Image source={{ uri: item.image }} style={styles.foodImage} />
                <Text style={styles.foodName}>{item.name}</Text>
                <Text style={styles.foodPrice}>₹ {item.price}</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddFood(item)}
                >
                  <Icon name="add" size={20} color="#FF8C42" />
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      ) : (
        <View style={styles.activeOrdersContainer}>
          {activeOrdersData.map((order, index) => (
            <View key={order.id} style={styles.orderRow}>
              <Text style={styles.orderIndex}>{index + 1}.</Text>
              <Text style={styles.orderName}>{order.name}</Text>
              <Text style={styles.orderWaitTime}>
                Wait for {order.waitTime}!
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Food Added</Text>
            <Text style={styles.modalSubtitle}>
              {selectedFood?.name} - ₹{selectedFood?.price}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonPrimary}
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
    </SafeAreaView>
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
  categoriesContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4, // ✅ Reduced from 12 to 4
    gap: 10,
    backgroundColor: '#fff',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF8C42',
    backgroundColor: '#FFF8F0',
    gap: 6,
  },
  categoryPillActive: { backgroundColor: '#FF8C42' },
  categoryIcon: { fontSize: 14 },
  categoryText: { fontSize: 12, fontWeight: '600', color: '#FF8C42' },
  categoryTextActive: { color: '#fff' },
  foodListContent: {
    padding: 16,
    paddingTop: 8, // ✅ Reduced top padding
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
  foodImage: { width: 100, height: 80, borderRadius: 8, marginBottom: 8 },
  foodName: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 4 },
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
  activeOrdersContainer: { flex: 1, backgroundColor: '#fff', paddingTop: 8 },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  orderIndex: { fontSize: 15, color: '#999', width: 30 },
  orderName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#4CAF50' },
  orderWaitTime: { fontSize: 13, fontWeight: '600', color: '#FF8C42' },
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
  modalButtonPrimaryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalButtonSecondary: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  modalButtonSecondaryText: {
    color: '#FF8C42',
    fontSize: 16,
    fontWeight: '600',
  },
});
