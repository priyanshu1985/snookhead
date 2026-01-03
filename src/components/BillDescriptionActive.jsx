import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export default function BillDescriptionActive({
  bill,
  onBack,
  onPaymentComplete,
}) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');

  if (!bill) return null;

  // Handle payment processing
  const handleProceedToPay = async () => {
    try {
      setIsProcessingPayment(true);
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      Alert.alert(
        'Confirm Payment',
        `Process payment of ₹${getBillDetail('totalAmount', '0')} via ${selectedPaymentMethod.toUpperCase()}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm Payment',
            style: 'default',
            onPress: async () => {
              try {
                const response = await fetch(
                  `${API_URL}/api/bills/${bill.originalBill?.id || bill.id}/pay`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      payment_method: selectedPaymentMethod,
                    }),
                  },
                );

                const result = await response.json();

                if (response.ok) {
                  Alert.alert(
                    'Payment Successful',
                    `Bill #${bill.billNumber} has been paid successfully.`,
                    [{ text: 'Done', onPress: () => onPaymentComplete() }],
                  );
                } else {
                  throw new Error(result.error || 'Payment failed');
                }
              } catch (error) {
                console.error('Payment error:', error);
                Alert.alert('Payment Failed', error.message || 'Please try again.');
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Helper function to safely get bill details
  const getBillDetail = (field, defaultValue = '') => {
    return bill[field] || bill.originalBill?.[field] || defaultValue;
  };

  // Get table charges
  const getTableCharges = () => {
    return parseFloat(getBillDetail('tableCharges', getBillDetail('table_charges', '0')));
  };

  // Get menu charges
  const getMenuCharges = () => {
    return parseFloat(getBillDetail('menuCharges', getBillDetail('menu_charges', '0')));
  };

  // Format detailed items for display
  const formatDetailedItems = () => {
    const items = bill.detailedItems || bill.originalBill?.order_items || bill.menuItems || [];
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    return [];
  };

  // Get session duration
  const getSessionDuration = () => {
    return getBillDetail('sessionDuration', getBillDetail('session_duration', '0'));
  };

  // Get table name
  const getTableName = () => {
    return getBillDetail('tableName', getBillDetail('table_name', 'Table'));
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const menuItems = formatDetailedItems();
  const tableCharges = getTableCharges();
  const menuCharges = getMenuCharges();
  const totalAmount = parseFloat(getBillDetail('totalAmount', '0'));

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Details</Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Unpaid</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bill Header Card */}
        <View style={styles.billHeaderCard}>
          <View style={styles.billNumberRow}>
            <View>
              <Text style={styles.billLabel}>Bill Number</Text>
              <Text style={styles.billNumber}>{bill.billNumber}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Icon name="calendar-outline" size={16} color="#666" />
              <Text style={styles.dateText}>
                {formatDate(getBillDetail('date', getBillDetail('createdAt')))}
              </Text>
            </View>
          </View>
        </View>

        {/* Customer & Table Info */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="person-outline" size={20} color="#FF8C42" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Customer</Text>
                <Text style={styles.infoValue}>{getBillDetail('customerName', 'Walk-in Customer')}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Icon name="call-outline" size={20} color="#FF8C42" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mobile</Text>
                <Text style={styles.infoValue}>{getBillDetail('mobile', '+91 XXXXXXXXXX')}</Text>
              </View>
            </View>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Icon name="grid-outline" size={20} color="#FF8C42" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Table</Text>
                <Text style={styles.infoValue}>{getTableName()}</Text>
              </View>
            </View>
            <View style={styles.infoItem}>
              <Icon name="time-outline" size={20} color="#FF8C42" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Duration</Text>
                <Text style={styles.infoValue}>{getSessionDuration()} min</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Table Charges Section */}
        {tableCharges > 0 && (
          <View style={styles.chargesCard}>
            <View style={styles.sectionHeader}>
              <Icon name="game-controller-outline" size={20} color="#FF8C42" />
              <Text style={styles.sectionTitle}>Table Charges</Text>
            </View>
            <View style={styles.chargeItem}>
              <View style={styles.chargeLeft}>
                <Text style={styles.chargeName}>{getTableName()} Session</Text>
                <Text style={styles.chargeSubtext}>{getSessionDuration()} minutes</Text>
              </View>
              <Text style={styles.chargeAmount}>₹{tableCharges.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Menu Items Section */}
        {(menuItems.length > 0 || menuCharges > 0) && (
          <View style={styles.chargesCard}>
            <View style={styles.sectionHeader}>
              <Icon name="restaurant-outline" size={20} color="#FF8C42" />
              <Text style={styles.sectionTitle}>Menu Items</Text>
            </View>
            {menuItems.length > 0 ? (
              menuItems.map((item, index) => (
                <View key={index} style={styles.menuItem}>
                  <View style={styles.menuItemIcon}>
                    <Text style={styles.menuEmoji}>
                      {item.category === 'Beverages' ? '🥤' : item.category === 'Fast Food' ? '🍔' : '🍽️'}
                    </Text>
                  </View>
                  <View style={styles.menuItemDetails}>
                    <Text style={styles.menuItemName}>
                      {item.name || item.item_name || 'Item'}
                    </Text>
                    <Text style={styles.menuItemQty}>
                      Qty: {item.quantity || item.qty || 1}
                    </Text>
                  </View>
                  <Text style={styles.menuItemPrice}>
                    ₹{((item.price || item.amount || 0) * (item.quantity || item.qty || 1)).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <View style={styles.chargeItem}>
                <Text style={styles.chargeName}>Food & Beverages</Text>
                <Text style={styles.chargeAmount}>₹{menuCharges.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Menu Subtotal</Text>
              <Text style={styles.subtotalValue}>₹{menuCharges.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {/* Bill Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Summary</Text>

          {tableCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Table Charges</Text>
              <Text style={styles.summaryValue}>₹{tableCharges.toFixed(2)}</Text>
            </View>
          )}

          {menuCharges > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Menu Charges</Text>
              <Text style={styles.summaryValue}>₹{menuCharges.toFixed(2)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodCard}>
          <Text style={styles.paymentMethodTitle}>Payment Method</Text>
          <View style={styles.paymentOptions}>
            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'cash' && styles.paymentOptionActive,
              ]}
              onPress={() => setSelectedPaymentMethod('cash')}
            >
              <Icon
                name="cash-outline"
                size={24}
                color={selectedPaymentMethod === 'cash' ? '#FF8C42' : '#666'}
              />
              <Text style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'cash' && styles.paymentOptionTextActive,
              ]}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'upi' && styles.paymentOptionActive,
              ]}
              onPress={() => setSelectedPaymentMethod('upi')}
            >
              <Icon
                name="phone-portrait-outline"
                size={24}
                color={selectedPaymentMethod === 'upi' ? '#FF8C42' : '#666'}
              />
              <Text style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'upi' && styles.paymentOptionTextActive,
              ]}>UPI</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'card' && styles.paymentOptionActive,
              ]}
              onPress={() => setSelectedPaymentMethod('card')}
            >
              <Icon
                name="card-outline"
                size={24}
                color={selectedPaymentMethod === 'card' ? '#FF8C42' : '#666'}
              />
              <Text style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'card' && styles.paymentOptionTextActive,
              ]}>Card</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.paymentOption,
                selectedPaymentMethod === 'wallet' && styles.paymentOptionActive,
              ]}
              onPress={() => setSelectedPaymentMethod('wallet')}
            >
              <Icon
                name="wallet-outline"
                size={24}
                color={selectedPaymentMethod === 'wallet' ? '#FF8C42' : '#666'}
              />
              <Text style={[
                styles.paymentOptionText,
                selectedPaymentMethod === 'wallet' && styles.paymentOptionTextActive,
              ]}>Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Extra space for bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Payment Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalLabel}>Total Payable</Text>
          <Text style={styles.bottomTotalValue}>₹{totalAmount.toFixed(2)}</Text>
        </View>
        <TouchableOpacity
          style={[
            styles.payButton,
            isProcessingPayment && styles.payButtonDisabled,
          ]}
          onPress={handleProceedToPay}
          disabled={isProcessingPayment}
        >
          {isProcessingPayment ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.payButtonText}>Pay Now</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 12,
  },
  statusBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF8C42',
  },
  scrollContent: {
    padding: 16,
  },
  billHeaderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  billNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  billLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  billNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FF8C42',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  infoContent: {},
  infoLabel: {
    fontSize: 11,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 14,
  },
  chargesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  chargeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  chargeLeft: {},
  chargeName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  chargeSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chargeAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F8F8',
  },
  menuItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuEmoji: {
    fontSize: 20,
  },
  menuItemDetails: {
    flex: 1,
  },
  menuItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  menuItemQty: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  menuItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  subtotalLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C42',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FF8C42',
  },
  paymentMethodCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  paymentOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
    flex: 1,
    marginHorizontal: 4,
  },
  paymentOptionActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF8F5',
  },
  paymentOptionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
  },
  paymentOptionTextActive: {
    color: '#FF8C42',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  bottomTotal: {},
  bottomTotalLabel: {
    fontSize: 12,
    color: '#888',
  },
  bottomTotalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 2,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  payButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  payButtonDisabled: {
    backgroundColor: '#CCC',
    elevation: 0,
    shadowOpacity: 0,
  },
});
