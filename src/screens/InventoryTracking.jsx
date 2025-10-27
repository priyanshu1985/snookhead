import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function InventoryTracking({ navigation }) {
  // ===== STATE DECLARATIONS =====

  // Active category tab
  const [activeCategory, setActiveCategory] = useState('CAFE ASSET');

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Inventory items
  const [inventoryItems, setInventoryItems] = useState([
    {
      id: 1,
      name: 'Cue stick',
      category: 'CAFE ASSET',
      stock: 24,
      threshold: 10,
      status: 'Available',
      price: '₹50',
      icon: '🎱',
    },
    {
      id: 2,
      name: 'Coca cola(500 ml)',
      category: 'PACKED FOOD',
      stock: 45,
      threshold: 27,
      status: 'In Stock',
      price: '₹40',
      icon: '🥤',
    },
    {
      id: 3,
      name: 'Paneer',
      category: 'PREPARED FOOD',
      stock: 15,
      threshold: 10,
      status: 'Low Stock',
      price: '₹40',
      icon: '🍛',
    },
  ]);

  // Categories
  const categories = ['CAFE ASSET', 'PACKED FOOD', 'PREPARED FOOD'];

  // Filter status buttons
  const statusFilters = ['All', 'Available', 'Maintenance', 'In Re'];

  // ===== HANDLERS =====

  const handleRestockItem = itemId => {
    Alert.alert('Restock', 'Item restocked successfully!');
  };

  const handleCallSupplier = itemId => {
    Alert.alert('Supplier Call', 'Opening dialer to call supplier...');
  };

  // Filter items by category and search
  const getFilteredItems = () => {
    return inventoryItems.filter(item => {
      const categoryMatch = item.category === activeCategory;
      const searchMatch = item.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      return categoryMatch && searchMatch;
    });
  };

  // Get summary stats
  const getSummaryStats = () => {
    const categoryItems = inventoryItems.filter(
      item => item.category === activeCategory,
    );
    const total = categoryItems.length;
    const available = categoryItems.filter(
      item => item.stock > item.threshold,
    ).length;
    const maintenance = categoryItems.filter(
      item => item.stock <= item.threshold,
    ).length;

    return { total, available, maintenance };
  };

  const stats = getSummaryStats();

  // ===== RENDER FUNCTIONS =====

  const renderInventoryItem = ({ item }) => (
    <View style={styles.itemCard}>
      {/* Item Image and Name */}
      <View style={styles.itemHeader}>
        <View style={styles.itemImage}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
        </View>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemTitle}>{item.name}</Text>
          <Text style={styles.itemStockInfo}>
            In Stock: {item.stock} | Threshold: {item.threshold}
          </Text>
        </View>
      </View>

      {/* MRP */}
      <Text style={styles.itemMRP}>MRP: {item.price}</Text>

      {/* Quantity Input */}
      <View style={styles.quantityContainer}>
        <Text style={styles.quantityLabel}>Qty.</Text>
        <TextInput
          style={styles.quantityInput}
          placeholder="Enter quantity"
          keyboardType="numeric"
          placeholderTextColor="#CCC"
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.restockBtn}
          onPress={() => handleRestockItem(item.id)}
        >
          <Text style={styles.restockBtnText}>Restock item</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.callSupplierBtn}
          onPress={() => handleCallSupplier(item.id)}
        >
          <Icon name="call" size={18} color="#0066CC" />
          <Text style={styles.callSupplierBtnText}>Call supplier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ===== MAIN RENDER =====

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inventory tracking</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Alert Summary Cards */}
      <View style={styles.alertContainer}>
        <View style={styles.alertCard}>
          <Text style={styles.alertLabel}>Assets in maintenance</Text>
          <Text style={styles.alertValue}>
            {String(stats.maintenance).padStart(2, '0')}
          </Text>
        </View>
        <View style={styles.alertCard}>
          <Text style={styles.alertLabel}>Low stock items</Text>
          <Text style={styles.alertValue}>
            {String(stats.maintenance).padStart(2, '0')}
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#CCC"
        />
        <Icon name="mic" size={20} color="#FF8C42" />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryTab,
                activeCategory === category && styles.activeCategoryTab,
              ]}
              onPress={() => setActiveCategory(category)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  activeCategory === category && styles.activeCategoryTabText,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Total Assets</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.available}</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.maintenance}</Text>
            <Text style={styles.statLabel}>Maintenance</Text>
          </View>
        </View>

        {/* Status Filter Buttons */}
        <View style={styles.filterContainer}>
          {statusFilters.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterBtn,
                filter === 'All' && styles.filterBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  filter === 'All' && styles.filterBtnTextActive,
                ]}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Inventory Items List */}
        <FlatList
          data={getFilteredItems()}
          renderItem={renderInventoryItem}
          keyExtractor={item => item.id.toString()}
          scrollEnabled={false}
          contentContainerStyle={styles.listContent}
        />

        {/* Promotional Banner */}
        <View style={styles.promotionalBanner}>
          <View style={styles.bannerImageContainer}>
            <Icon name="clipboard" size={40} color="#fff" />
          </View>
          <View style={styles.bannerTextContainer}>
            <Text style={styles.bannerTitle}>prepared inventory tracking</Text>
            <TouchableOpacity style={styles.bannerButton}>
              <Text style={styles.bannerButtonText}>Track items →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },

  // Alert Summary
  alertContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  alertCard: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  alertLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  alertValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C42',
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#333',
  },

  // Category Tabs
  categoryTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  categoryTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeCategoryTab: {
    backgroundColor: '#fff',
    borderBottomColor: '#FF8C42',
  },
  categoryTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  activeCategoryTabText: {
    color: '#FF8C42',
  },

  // Summary Stats
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  filterBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterBtnActive: {
    backgroundColor: '#0066CC',
    borderColor: '#0066CC',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  filterBtnTextActive: {
    color: '#fff',
  },

  // Inventory Item
  listContent: {
    paddingHorizontal: 16,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  itemHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#FF6B5B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIcon: {
    fontSize: 28,
  },
  itemTitleContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemStockInfo: {
    fontSize: 12,
    color: '#666',
  },
  itemMRP: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },

  // Quantity
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  quantityLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    width: 30,
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#333',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  restockBtn: {
    flex: 1,
    backgroundColor: '#FF8C42',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  restockBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  callSupplierBtn: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  callSupplierBtnText: {
    color: '#0066CC',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Promotional Banner
  promotionalBanner: {
    flexDirection: 'row',
    backgroundColor: '#1E3A5F',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    gap: 12,
  },
  bannerImageContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  bannerButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  content: {
    flex: 1,
  },
});
