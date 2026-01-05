import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 140; // Fixed card height
const MAX_ITEMS_PREVIEW = 2; // Max items to show before "..."

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function ActiveOrders({ refreshKey, searchQuery = '' }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // Track which order action is loading
  const [previewModal, setPreviewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Filter orders by customer name
  const filteredOrders = orders.filter(order =>
    (order.personName || 'Guest')
      .toLowerCase()
      .includes(searchQuery.toLowerCase()),
  );

  const fetchActiveOrders = async () => {
    const token = await getAuthToken();
    if (!token) {
      console.log('No auth token found');
      return;
    }
    try {
      setLoading(true);
      console.log(
        'Fetching active orders from:',
        `${API_URL}/api/orders?status=pending`,
      );
      const res = await fetch(`${API_URL}/api/orders?status=pending`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();
      console.log('Active orders API response:', result);

      const list = Array.isArray(result.data)
        ? result.data
        : Array.isArray(result)
        ? result
        : [];

      console.log('Processed active orders list:', list);
      setOrders(list);
    } catch (err) {
      console.log('Error fetching active orders', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveOrders();
  }, []);

  // Refetch when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      console.log('RefreshKey changed, refetching active orders...');
      fetchActiveOrders();
    }
  }, [refreshKey]);

  // Get items from order (handles both OrderItems and items arrays)
  const getOrderItems = order => {
    if (order.OrderItems && Array.isArray(order.OrderItems)) {
      return order.OrderItems.map(item => ({
        id: item.id,
        name: item.MenuItem?.name || 'Unknown Item',
        qty: item.qty || 1,
        price: item.priceEach || item.MenuItem?.price || 0,
      }));
    }
    if (order.items && Array.isArray(order.items)) {
      return order.items;
    }
    return [];
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, successMessage) => {
    try {
      setActionLoading(orderId);
      const token = await getAuthToken();
      if (!token) {
        Alert.alert('Error', 'Authentication required');
        return false;
      }

      const res = await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const result = await res.json();

      // Remove from active orders list if completed or cancelled
      if (newStatus === 'completed' || newStatus === 'cancelled') {
        setOrders(prev => prev.filter(o => o.id !== orderId));
      } else {
        // Update the order status in the list
        setOrders(prev =>
          prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)),
        );
      }

      Alert.alert('Success', successMessage);
      return true;
    } catch (err) {
      console.log('Error updating order status:', err);
      Alert.alert('Error', 'Failed to update order. Please try again.');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  // Action handlers
  const handleMarkReady = orderId => {
    Alert.alert('Mark as Ready', 'Is this order ready for delivery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Ready',
        onPress: () =>
          updateOrderStatus(orderId, 'ready', 'Order marked as ready!'),
      },
    ]);
  };

  const handleMarkDelivered = orderId => {
    Alert.alert(
      'Mark as Delivered',
      'Are you sure this order has been delivered?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Delivered',
          onPress: () =>
            updateOrderStatus(
              orderId,
              'completed',
              'Order marked as delivered!',
            ),
        },
      ],
    );
  };

  const handleCancelOrder = orderId => {
    Alert.alert(
      'Delete Order',
      'Are you sure you want to delete this order? This action cannot be undone.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: () =>
            updateOrderStatus(orderId, 'cancelled', 'Order has been deleted.'),
        },
      ],
    );
  };

  const handleEditOrder = order => {
    // For now, show the preview modal with edit indication
    // You can extend this to navigate to an edit screen
    Alert.alert(
      'Edit Order',
      'Edit functionality will open the order for modifications.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'View Order',
          onPress: () => openPreviewModal(order),
        },
      ],
    );
  };

  const openPreviewModal = order => {
    setSelectedOrder(order);
    setPreviewModal(true);
  };

  const closePreviewModal = () => {
    setPreviewModal(false);
    setSelectedOrder(null);
  };

  // Render item list preview (truncated)
  const renderItemsPreview = order => {
    const items = getOrderItems(order);
    if (items.length === 0) {
      return <Text style={styles.noItemsText}>No items</Text>;
    }

    const displayItems = items.slice(0, MAX_ITEMS_PREVIEW);
    const remainingCount = items.length - MAX_ITEMS_PREVIEW;

    return (
      <View style={styles.itemsPreview}>
        {displayItems.map((item, index) => (
          <Text key={index} style={styles.itemPreviewText} numberOfLines={1}>
            • {item.qty}x {item.name}
          </Text>
        ))}
        {remainingCount > 0 && (
          <Text style={styles.moreItemsText}>
            +{remainingCount} more item{remainingCount > 1 ? 's' : ''}...
          </Text>
        )}
      </View>
    );
  };

  // Render order preview modal
  const renderPreviewModal = () => {
    if (!selectedOrder) return null;

    const items = getOrderItems(selectedOrder);
    const totalItems = items.reduce((sum, item) => sum + (item.qty || 1), 0);

    return (
      <Modal
        visible={previewModal}
        transparent
        animationType="slide"
        onRequestClose={closePreviewModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closePreviewModal}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Order Info */}
            <View style={styles.orderInfoSection}>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Customer:</Text>
                <Text style={styles.orderInfoValue}>
                  {selectedOrder.personName || 'Guest'}
                </Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Order #:</Text>
                <Text style={styles.orderInfoValue}>{selectedOrder.id}</Text>
              </View>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Status:</Text>
                <View
                  style={[
                    styles.statusBadge,
                    selectedOrder.status === 'ready' && styles.statusReady,
                    selectedOrder.status === 'pending' && styles.statusPending,
                  ]}
                >
                  <Text style={styles.statusBadgeText}>
                    {selectedOrder.status || 'pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.orderInfoRow}>
                <Text style={styles.orderInfoLabel}>Total Items:</Text>
                <Text style={styles.orderInfoValue}>{totalItems}</Text>
              </View>
            </View>

            {/* Items List */}
            <Text style={styles.itemsSectionTitle}>Order Items</Text>
            <ScrollView style={styles.itemsList}>
              {items.length === 0 ? (
                <Text style={styles.noItemsModalText}>
                  No items in this order
                </Text>
              ) : (
                items.map((item, index) => (
                  <View key={index} style={styles.modalItemRow}>
                    <View style={styles.modalItemInfo}>
                      <Text style={styles.modalItemName}>{item.name}</Text>
                      <Text style={styles.modalItemPrice}>
                        ₹{item.price} × {item.qty}
                      </Text>
                    </View>
                    <Text style={styles.modalItemTotal}>
                      ₹{(item.price * item.qty).toFixed(2)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Total */}
            <View style={styles.modalTotalRow}>
              <Text style={styles.modalTotalLabel}>Total Amount:</Text>
              <Text style={styles.modalTotalValue}>
                ₹{selectedOrder.orderTotal || selectedOrder.total || 0}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, styles.cancelBtn]}
                onPress={() => {
                  closePreviewModal();
                  handleCancelOrder(selectedOrder.id);
                }}
              >
                <Icon name="close-circle-outline" size={18} color="#FF4444" />
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.readyBtn]}
                onPress={() => {
                  closePreviewModal();
                  handleMarkReady(selectedOrder.id);
                }}
              >
                <Icon name="timer-outline" size={18} color="#FF9800" />
                <Text style={styles.readyBtnText}>Ready</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalActionBtn, styles.deliveredBtn]}
                onPress={() => {
                  closePreviewModal();
                  handleMarkDelivered(selectedOrder.id);
                }}
              >
                <Icon
                  name="checkmark-circle-outline"
                  size={18}
                  color="#4CAF50"
                />
                <Text style={styles.deliveredBtnText}>Delivered</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.activeOrdersContainer}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.infoText}>Loading active orders...</Text>
        </View>
      </View>
    );
  }

  if (!filteredOrders.length && !loading) {
    return (
      <View style={styles.activeOrdersContainer}>
        <View style={styles.emptyContainer}>
          <Icon name="receipt-outline" size={60} color="#DDD" />
          <Text style={styles.infoText}>
            {searchQuery
              ? 'No orders found matching your search.'
              : 'No active orders.'}
          </Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={fetchActiveOrders}
          >
            <Icon name="refresh-outline" size={18} color="#fff" />
            <Text style={styles.refreshButtonText}>Refresh Orders</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.activeOrdersContainer}>
      <ScrollView
        style={styles.ordersScrollView}
        contentContainerStyle={styles.ordersScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredOrders.map((order, index) => {
          const items = getOrderItems(order);
          const isActionLoading = actionLoading === order.id;

          return (
            <TouchableOpacity
              key={order.id}
              style={styles.orderCard}
              onPress={() => openPreviewModal(order)}
              activeOpacity={0.7}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.orderIndex}>#{order.id}</Text>
                  <Text style={styles.orderName}>
                    {order.personName || 'Guest'}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadgeSmall,
                    order.status === 'ready' && styles.statusReadySmall,
                  ]}
                >
                  <Text style={styles.statusBadgeSmallText}>
                    {order.status || 'pending'}
                  </Text>
                </View>
              </View>

              {/* Items Preview */}
              <View style={styles.cardBody}>{renderItemsPreview(order)}</View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <Text style={styles.orderTotal}>
                  ₹{order.orderTotal || order.total || 0}
                </Text>
                <Text style={styles.itemCount}>
                  {items.length} item{items.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#FF8C42" />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={e => {
                        e.stopPropagation();
                        handleEditOrder(order);
                      }}
                    >
                      <Icon name="create-outline" size={16} color="#2196F3" />
                      <Text style={styles.actionBtnTextEdit}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={e => {
                        e.stopPropagation();
                        handleMarkReady(order.id);
                      }}
                    >
                      <Icon name="timer-outline" size={16} color="#FF9800" />
                      <Text style={styles.actionBtnTextReady}>Ready</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={e => {
                        e.stopPropagation();
                        handleCancelOrder(order.id);
                      }}
                    >
                      <Icon
                        name="close-circle-outline"
                        size={16}
                        color="#FF4444"
                      />
                      <Text style={styles.actionBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={e => {
                        e.stopPropagation();
                        handleMarkDelivered(order.id);
                      }}
                    >
                      <Icon
                        name="checkmark-circle-outline"
                        size={16}
                        color="#4CAF50"
                      />
                      <Text style={styles.actionBtnTextDelivered}>
                        Delivered
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Preview Modal */}
      {renderPreviewModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  activeOrdersContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  ordersScrollView: {
    flex: 1,
  },
  ordersScrollContent: {
    padding: 12,
    paddingBottom: 24,
  },

  // Order Card
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 14,
    minHeight: CARD_HEIGHT,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderIndex: {
    fontSize: 12,
    color: '#999',
    marginRight: 8,
    fontWeight: '500',
  },
  orderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  statusBadgeSmall: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusReadySmall: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeSmallText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF9800',
    textTransform: 'uppercase',
  },

  // Card Body - Items Preview
  cardBody: {
    flex: 1,
    marginBottom: 8,
  },
  itemsPreview: {
    paddingVertical: 4,
  },
  itemPreviewText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  moreItemsText: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '500',
    marginTop: 2,
  },
  noItemsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 8,
    marginBottom: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF8C42',
  },
  itemCount: {
    fontSize: 12,
    color: '#999',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F8F8F8',
  },
  actionBtnTextEdit: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 3,
  },
  actionBtnTextReady: {
    fontSize: 11,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 3,
  },
  actionBtnTextCancel: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '600',
    marginLeft: 3,
  },
  actionBtnTextDelivered: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 3,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: width - 40,
    maxHeight: '85%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  modalCloseBtn: {
    padding: 4,
  },

  // Order Info Section
  orderInfoSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderInfoLabel: {
    fontSize: 13,
    color: '#666',
  },
  orderInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusReady: {
    backgroundColor: '#E8F5E9',
  },
  statusPending: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
    textTransform: 'uppercase',
  },

  // Items List
  itemsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  itemsList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  noItemsModalText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalItemInfo: {
    flex: 1,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  modalItemPrice: {
    fontSize: 12,
    color: '#888',
  },
  modalItemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF8C42',
  },

  // Modal Total
  modalTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },
  modalTotalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  modalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF8C42',
  },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  cancelBtn: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4444',
    marginLeft: 4,
  },
  readyBtn: {
    borderColor: '#FFE0B2',
    backgroundColor: '#FFF8E1',
  },
  readyBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 4,
  },
  deliveredBtn: {
    borderColor: '#C8E6C9',
    backgroundColor: '#F1F8F1',
  },
  deliveredBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 4,
  },

  // Info & Refresh
  infoText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#999',
    fontSize: 14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
