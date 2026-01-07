import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { inventoryAPI } from '../services/api';

const InventoryDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: [],
    outOfStockItems: [],
    recentActivity: [],
    categoryBreakdown: [],
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all inventory data
      const [allItemsResponse, lowStockResponse] = await Promise.all([
        inventoryAPI.getAll({ limit: 1000 }), // Get all items for calculations
        inventoryAPI.getLowStockItems(),
      ]);

      const allItems = allItemsResponse.data || [];
      const lowStockItems = lowStockResponse.data || [];

      // Calculate dashboard statistics
      const totalItems = allItems.length;
      const totalValue = allItems.reduce((sum, item) => {
        const itemValue = (item.cost_per_unit || 0) * item.current_quantity;
        return sum + itemValue;
      }, 0);

      const outOfStockItems = allItems.filter(
        item => item.current_quantity <= 0,
      );

      // Category breakdown
      const categoryMap = {};
      allItems.forEach(item => {
        if (!categoryMap[item.category]) {
          categoryMap[item.category] = { count: 0, value: 0 };
        }
        categoryMap[item.category].count++;
        categoryMap[item.category].value +=
          (item.cost_per_unit || 0) * item.current_quantity;
      });

      const categoryBreakdown = Object.entries(categoryMap).map(
        ([category, data]) => ({
          category: category.replace('_', ' '),
          count: data.count,
          value: data.value,
        }),
      );

      setDashboardData({
        totalItems,
        totalValue,
        lowStockItems,
        outOfStockItems,
        categoryBreakdown,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const formatCurrency = amount => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getStockStatusColor = item => {
    if (item.current_quantity <= 0) return '#e74c3c';
    if (item.current_quantity <= item.minimum_threshold) return '#FF8C42';
    return '#27ae60';
  };

  const getStockStatusText = item => {
    if (item.current_quantity <= 0) return 'OUT OF STOCK';
    if (item.current_quantity <= item.minimum_threshold) return 'LOW STOCK';
    return 'IN STOCK';
  };

  const StatsCard = ({ title, value, icon, color, onPress, subtitle }) => (
    <TouchableOpacity
      style={[styles.statsCard, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.statsContent}>
        <View style={styles.statsLeft}>
          <Text style={styles.statsTitle}>{title}</Text>
          <Text style={styles.statsValue}>{value}</Text>
          {subtitle && <Text style={styles.statsSubtitle}>{subtitle}</Text>}
        </View>
        <View style={[styles.statsIcon, { backgroundColor: color }]}>
          <Icon name={icon} size={26} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  const InventoryItemCard = ({ item, onRestock, onViewDetails }) => (
    <View style={styles.inventoryListItem}>
      <View style={styles.itemIconContainer}>
        <View style={styles.itemIcon}>
          <Icon name="inventory" size={20} color="#fff" />
        </View>
      </View>

      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>
          {item.item_name}
          {item.unit && item.unit !== 'pieces' && (
            <Text style={styles.itemUnit}> ({item.unit})</Text>
          )}
        </Text>

        <Text style={styles.stockInfo}>
          In Stock: {item.current_quantity} | Threshold:{' '}
          {item.minimum_threshold}
        </Text>

        <Text style={styles.mrpText}>
          MRP: ₹
          {item.cost_per_unit ? parseFloat(item.cost_per_unit).toFixed(0) : '0'}
        </Text>

        <View style={styles.itemButtonsRow}>
          <TouchableOpacity
            style={styles.restockBtn}
            onPress={() => onRestock(item)}
          >
            <Text style={styles.restockBtnText}>Restock item</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.supplierBtn}
            onPress={() => handleCallSupplier(item)}
          >
            <Text style={styles.supplierBtnText}>Call supplier</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const handleRestock = item => {
    navigation.navigate('Inventory', { action: 'restock', item });
  };

  const handleViewDetails = item => {
    navigation.navigate('Inventory', { action: 'view', item });
  };

  const handleCallSupplier = item => {
    if (item.supplier) {
      Alert.alert(
        'Contact Supplier',
        `Call ${item.supplier} for ${item.item_name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Call',
            onPress: () => {
              // Here you could integrate with phone functionality
              // Linking.openURL(`tel:${supplierPhone}`);
              Alert.alert('Feature', 'Phone integration not implemented yet');
            },
          },
        ],
      );
    } else {
      Alert.alert('No Supplier', 'No supplier contact available for this item');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar backgroundColor="#1a237e" barStyle="light-content" />
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Loading inventory data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#fff" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Inventory Overview</Text>
          <Text style={styles.subtitle}>Manage your stock efficiently</Text>
        </View>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.navigate('Inventory')}
        >
          <Icon name="inventory" size={24} color="#1a237e" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsGrid}>
            <StatsCard
              title="Total Items"
              value={dashboardData.totalItems.toString()}
              icon="inventory"
              color="#3498db"
              onPress={() => navigation.navigate('Inventory')}
            />
            <StatsCard
              title="Total Value"
              value={formatCurrency(dashboardData.totalValue)}
              icon="attach-money"
              color="#27ae60"
              onPress={() => navigation.navigate('Inventory')}
            />
            <StatsCard
              title="Low Stock"
              value={dashboardData.lowStockItems.length.toString()}
              icon="warning"
              color="#FF8C42"
              onPress={() =>
                navigation.navigate('Inventory', { filter: 'lowStock' })
              }
              subtitle="Items need attention"
            />
            <StatsCard
              title="Out of Stock"
              value={dashboardData.outOfStockItems.length.toString()}
              icon="error"
              color="#e74c3c"
              onPress={() =>
                navigation.navigate('Inventory', { filter: 'outOfStock' })
              }
              subtitle="Urgent restocking"
            />
          </View>
        </View>

        {/* Critical Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Items Need Attention</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Inventory')}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {[...dashboardData.outOfStockItems, ...dashboardData.lowStockItems]
            .slice(0, 3)
            .map((item, index) => (
              <InventoryItemCard
                key={index}
                item={item}
                onRestock={handleRestock}
                onViewDetails={handleViewDetails}
              />
            ))}

          {dashboardData.lowStockItems.length === 0 &&
            dashboardData.outOfStockItems.length === 0 && (
              <View style={styles.noIssuesContainer}>
                <Icon name="check-circle" size={48} color="#27ae60" />
                <Text style={styles.noIssuesText}>
                  All items are properly stocked!
                </Text>
                <Text style={styles.noIssuesSubtext}>
                  Keep up the good work
                </Text>
              </View>
            )}
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category Overview</Text>
          <View style={styles.categoriesGrid}>
            {dashboardData.categoryBreakdown.map((category, index) => (
              <TouchableOpacity
                key={index}
                style={styles.categoryCard}
                onPress={() =>
                  navigation.navigate('Inventory', {
                    category: category.category.replace(' ', '_'),
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.categoryContent}>
                  <Text style={styles.categoryTitle}>{category.category}</Text>
                  <Text style={styles.categoryCount}>
                    {category.count} items
                  </Text>
                  <Text style={styles.categoryValue}>
                    {formatCurrency(category.value)}
                  </Text>
                </View>
                <Icon name="chevron-right" size={24} color="#ccc" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.floatingActionButton}
        onPress={() => navigation.navigate('Inventory', { action: 'add' })}
        activeOpacity={0.8}
      >
        <Icon name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontWeight: '400',
  },
  headerButton: {
    backgroundColor: '#f9fafb',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  scrollView: {
    flex: 1,
    paddingTop: 20,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 16,
    color: '#FF8C42',
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '48%',
    marginBottom: 16,
    borderLeftWidth: 5,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsLeft: {
    flex: 1,
  },
  statsTitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 8,
    fontWeight: '500',
  },
  statsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '400',
  },
  statsIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inventoryListItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemIconContainer: {
    marginRight: 16,
    marginTop: 4,
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  itemUnit: {
    fontSize: 16,
    fontWeight: 'normal',
    color: '#64748b',
  },
  stockInfo: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  mrpText: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 12,
  },
  itemButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  restockBtn: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
  },
  restockBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  supplierBtn: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flex: 1,
  },
  supplierBtnText: {
    color: '#2196F3',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  itemHeader: {
    marginBottom: 16,
  },
  itemInfo: {
    flex: 1,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
  },
  itemCategory: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    backgroundColor: '#f1f5f9',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  itemStock: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 4,
  },
  stockNumber: {
    fontWeight: 'bold',
    color: '#1e293b',
  },
  thresholdNumber: {
    fontWeight: 'bold',
    color: '#64748b',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#059669',
  },
  stockBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    minWidth: 100,
  },
  stockBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  itemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  restockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  restockButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF8C42',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flex: 0.48,
  },
  viewButtonText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noIssuesContainer: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  noIssuesText: {
    marginTop: 16,
    fontSize: 18,
    color: '#059669',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noIssuesSubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  categoriesGrid: {
    gap: 12,
  },
  categoryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 6,
    textTransform: 'capitalize',
  },
  categoryCount: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  categoryChevron: {
    marginLeft: 12,
  },
  bottomSpacing: {
    height: 100,
  },
  floatingActionButton: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    borderWidth: 4,
    borderColor: '#fff',
  },
});

export default InventoryDashboard;
