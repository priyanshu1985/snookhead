import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../config';

export default function BillDescriptionActive({
  bill,
  onBack,
  onPaymentComplete,
  navigation,
}) {
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash');
  const [showPaymentConfirmModal, setShowPaymentConfirmModal] = useState(false);

  // Separate payment processing function
  const processPayment = async () => {
    // If credit or card is selected, navigate to scanner
    if (selectedPaymentMethod === 'credit' || selectedPaymentMethod === 'card') {
      setShowPaymentConfirmModal(false);
      navigation.navigate('ScannerScreen', {
        paymentContext: {
          bill: bill,
          amount: getBillDetail('totalAmount', '0'),
          onPaymentComplete: onPaymentComplete,
        },
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      setIsProcessingPayment(true);
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
        setShowPaymentConfirmModal(false);
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
      setShowPaymentConfirmModal(false);
    } finally {
      setIsProcessingPayment(false);
    }
  };

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

      // Show payment modal for user to select method
      setShowPaymentConfirmModal(true);
      setIsProcessingPayment(false);
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
    return parseFloat(
      getBillDetail('tableCharges', getBillDetail('table_charges', '0')),
    );
  };

  // Get menu charges
  const getMenuCharges = () => {
    return parseFloat(
      getBillDetail('menuCharges', getBillDetail('menu_charges', '0')),
    );
  };

  // Format detailed items for display
  const formatDetailedItems = () => {
    const items =
      bill.detailedItems ||
      bill.originalBill?.order_items ||
      bill.menuItems ||
      [];
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    return [];
  };

  // Get session duration
  const getSessionDuration = () => {
    return getBillDetail(
      'sessionDuration',
      getBillDetail('session_duration', '0'),
    );
  };

  // Get table name
  const getTableName = () => {
    return getBillDetail('tableName', getBillDetail('table_name', 'Table'));
  };

  // Format date
  const formatDate = dateString => {
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Details</Text>
        <View style={styles.statusBadge}>
          <Icon
            name="time-outline"
            size={14}
            color="#FF8C42"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.statusText}>Pending</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >


        {/* Main Bill Display Card */}
        <View style={styles.mainBillCard}>
          {/* Header row: Customer Name & Date */}
          <View style={styles.billCardHeader}>
            <Text style={styles.billCustomerName}>
              {getBillDetail('customerName', 'Customer')}
            </Text>
            <Text style={styles.billDateText}>
              {formatDate(getBillDetail('date', getBillDetail('createdAt')))}
            </Text>
          </View>

          {/* Table Charges Item (Simplified approach for mockup) */}
          <View style={styles.billItemRow}>
            <View style={styles.billItemIconContainer}>
              <View style={styles.tableAmberSquare} />
            </View>
            <View style={styles.billItemDetails}>
              <Text style={styles.billItemTitle}>Table Charges</Text>
              <Text style={styles.billItemSubtitle}>{getSessionDuration()} Mins</Text>
            </View>
            <Text style={styles.billItemPrice}>
              ₹ {tableCharges > 0 ? tableCharges.toFixed(2) : '0.00'}
            </Text>
          </View>

          <View style={styles.billDivider} />

          {/* Key Value Details Row */}
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile No. :</Text>
              <Text style={styles.detailValue}>
                 {getBillDetail('mobile', '+91')}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Wallet Amount :</Text>
              <Text style={styles.detailValue}>₹ 0.00</Text> 
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Total Amount :</Text>
              <Text style={styles.detailValueBold}>₹ {totalAmount.toFixed(2)} /-</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status :</Text>
              <Text style={styles.statusUnpaid}>Unpaid</Text>
            </View>
          </View>

          <View style={styles.billDivider} />

          {/* Order Payment Details */}
          <Text style={styles.orderPaymentSectionTitle}>ORDER PAYMENT DETAILS</Text>
          <View style={styles.detailsList}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Amount</Text>
              <Text style={styles.detailValue}>+{totalAmount.toFixed(2)}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Order Saving</Text>
              <Text style={styles.detailValue}>-0</Text>
            </View>
          </View>

          <View style={styles.billDivider} />

          {/* Total */}
          <View style={styles.totalBlockRow}>
            <Text style={styles.totalBlockLabel}>Total :</Text>
            <Text style={styles.totalBlockValue}>₹ {totalAmount.toFixed(0)}</Text>
          </View>

        </View>

        {/* Extra space for bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Cheers Savings Banner */}
      <View style={styles.savingsBanner}>
        <Text style={styles.savingsText}>🎉 Cheers! You Saved ₹ 0</Text>
      </View>

      {/* Bottom Payment Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotal}>
          <Text style={styles.bottomTotalValue}>₹ {totalAmount.toFixed(2)}</Text>
          <Text style={styles.bottomTotalLabel}>View details</Text>
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
            <Text style={styles.payButtonText}>Proceed To Pay</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* Payment Options Modal */}
      {showPaymentConfirmModal && (
        <Modal
          visible={showPaymentConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowPaymentConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Payment Method</Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentConfirmModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <View style={styles.paymentOptionsGrid}>
                {/* Cash */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'cash' &&
                      styles.paymentOptionCardActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod('cash')}
                >
                  <Icon
                    name="cash-outline"
                    size={28}
                    color={
                      selectedPaymentMethod === 'cash' ? '#FF8C42' : '#666'
                    }
                  />
                  <Text
                    style={[
                      styles.paymentOptionCardText,
                      selectedPaymentMethod === 'cash' &&
                        styles.paymentOptionCardTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>

                {/* UPI */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'upi' &&
                      styles.paymentOptionCardActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod('upi')}
                >
                  <Icon
                    name="phone-portrait-outline"
                    size={28}
                    color={selectedPaymentMethod === 'upi' ? '#FF8C42' : '#666'}
                  />
                  <Text
                    style={[
                      styles.paymentOptionCardText,
                      selectedPaymentMethod === 'upi' &&
                        styles.paymentOptionCardTextActive,
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>

                {/* Card */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'card' &&
                      styles.paymentOptionCardActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod('card')}
                >
                  <Icon
                    name="card-outline"
                    size={28}
                    color={
                      selectedPaymentMethod === 'card' ? '#FF8C42' : '#666'
                    }
                  />
                  <Text
                    style={[
                      styles.paymentOptionCardText,
                      selectedPaymentMethod === 'card' &&
                        styles.paymentOptionCardTextActive,
                    ]}
                  >
                    Card
                  </Text>
                </TouchableOpacity>

                {/* Credit */}
                <TouchableOpacity
                  style={[
                    styles.paymentOptionCard,
                    selectedPaymentMethod === 'credit' &&
                      styles.paymentOptionCardActive,
                  ]}
                  onPress={() => setSelectedPaymentMethod('credit')}
                >
                  <Icon
                    name="wallet-outline"
                    size={28}
                    color={
                      selectedPaymentMethod === 'credit' ? '#FF8C42' : '#666'
                    }
                  />
                  <Text
                    style={[
                      styles.paymentOptionCardText,
                      selectedPaymentMethod === 'credit' &&
                        styles.paymentOptionCardTextActive,
                    ]}
                  >
                    Credit
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowPaymentConfirmModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    isProcessingPayment && styles.disabledButton,
                  ]}
                  onPress={processPayment}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Confirm Payment</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
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
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE0B2',
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
  mainBillCard: {
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
  billCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  billCustomerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  billDateText: {
    fontSize: 13,
    color: '#888',
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  billItemIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#FFF5EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tableAmberSquare: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FDE4C9',
  },
  billItemDetails: {
    flex: 1,
  },
  billItemTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  billItemSubtitle: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  billItemPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#EAEAEA',
    marginVertical: 16,
  },
  detailsList: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  detailValueBold: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  statusUnpaid: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF5722',
  },
  orderPaymentSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  totalBlockRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  totalBlockLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  totalBlockValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  savingsBanner: {
    backgroundColor: '#FFF5E5',
    paddingVertical: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
  },
  savingsText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '600',
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
    height: 80,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    width: '100%',
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  paymentOptionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  paymentOptionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  paymentOptionCardActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF8F5',
  },
  paymentOptionCardText: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
    fontWeight: '600',
  },
  paymentOptionCardTextActive: {
    color: '#FF8C42',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
