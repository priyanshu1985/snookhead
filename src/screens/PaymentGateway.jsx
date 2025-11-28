import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import PaymentModal from '../components/PaymentModal';

export default function PaymentGateway({ route, navigation }) {
  const { cart = [], personName = '' } = route.params || {};
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const orderTotal = cart.reduce(
    (sum, ci) => sum + (Number(ci.item.price) || 0) * ci.qty,
    0,
  );
  const orderSaving = 0;
  const grandTotal = orderTotal - orderSaving;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}/${today.getFullYear()}`;

  const tableLabel = 'T2 S0176';
  const billNo = 'Bill 1';

  const handleProceedToPay = () => {
    console.log('Proceed to Pay clicked!');
    console.log('Current showPaymentModal state:', showPaymentModal);
    setShowPaymentModal(true);
    console.log('Set showPaymentModal to true');
  };

  const handlePaymentComplete = async paymentData => {
    // TODO: Send payment data to backend
    console.log('Payment Complete:', paymentData);

    if (paymentData.method === 'online') {
      Alert.alert(
        'Success',
        `Online payment of ₹${paymentData.amount} processed!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back or to orders
              navigation.navigate('Orders');
            },
          },
        ],
      );
    } else if (paymentData.method === 'offline') {
      Alert.alert(
        'Success',
        `Offline payment of ₹${paymentData.amount} recorded!`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('OrdersScreen');
            },
          },
        ],
      );
    } else if (paymentData.method === 'hybrid') {
      Alert.alert(
        'Success',
        `Hybrid payment: Cash ₹${paymentData.cashAmount} + Online ₹${paymentData.onlineAmount} processed!`,
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('OrdersScreen');
            },
          },
        ],
      );
    }
  };

  const renderItem = ({ item }) => {
    const { item: menuItem, qty } = item;
    return (
      <View style={styles.itemRow}>
        <View style={styles.itemLeft}>
          <View style={styles.itemIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.itemName}>{menuItem.name}</Text>
            <Text style={styles.itemMeta}>{qty} Qty</Text>
          </View>
        </View>
        <Text style={styles.itemPrice}>
          ₹ {(Number(menuItem.price) || 0) * qty}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Description</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Bill id row */}
      <View style={styles.billIdRow}>
        <Text style={styles.tableCode}>{tableLabel}</Text>
        <Text style={styles.billNo}>{billNo}</Text>
      </View>

      {/* Main Bill Card */}
      <View style={styles.billCard}>
        {/* Name and Date Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{personName || 'Guest'}</Text>
          <Text style={styles.cardDate}>{dateStr}</Text>
        </View>

        {/* Items List */}
        <FlatList
          data={cart}
          keyExtractor={ci => String(ci.item.id || ci.item.name)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          scrollEnabled={false}
          style={styles.itemsList}
        />

        {/* Divider Line */}
        <View style={styles.billDivider} />

        {/* Bill Details */}
        <View style={styles.billDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile No. :</Text>
            <Text style={styles.detailValue}>+91 9999999999</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wallet Amount :</Text>
            <Text style={styles.detailValue}>₹ 0.00</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount :</Text>
            <Text style={[styles.detailValue, styles.totalAmount]}>
              ₹ {grandTotal} /-
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status :</Text>
            <Text style={styles.unpaidStatus}>Unpaid</Text>
          </View>
        </View>

        {/* Order Payment Details Section */}
        <View style={styles.paymentDetailsInCard}>
          <Text style={styles.paymentDetailsTitle}>ORDER PAYMENT DETAILS</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Amount</Text>
            <Text style={styles.detailValue}>+{orderTotal}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Order Saving</Text>
            <Text style={styles.detailValue}>-{orderSaving}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total :</Text>
            <Text style={styles.totalValue}>₹ {grandTotal}</Text>
          </View>
        </View>
      </View>

      {/* Bottom Success Message */}
      <View style={styles.successMessage}>
        <Text style={styles.successText}>
          🎉 Cheers! You Saved ₹ {orderSaving}
        </Text>
      </View>

      {/* Bottom Payment Bar */}
      <View style={styles.bottomPaymentBar}>
        <View style={styles.amountSection}>
          <Text style={styles.finalAmount}>₹ {grandTotal}.00</Text>
          <Text style={styles.viewDetails}>View details</Text>
        </View>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPay}
        >
          <Text style={styles.proceedButtonText}>Proceed To Pay</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      <PaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        grandTotal={grandTotal}
        personName={personName}
        onPaymentComplete={handlePaymentComplete}
      />
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
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },

  billIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
  },
  tableCode: { fontSize: 14, fontWeight: '700', color: '#FF8C42' },
  billNo: { fontSize: 13, color: '#777', marginLeft: 4 },

  billCard: {
    margin: 25,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#E8F4FD',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cardName: { fontSize: 16, fontWeight: '600', color: '#333' },
  cardDate: { fontSize: 14, color: '#666' },

  itemsList: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: {
    width: 45,
    height: 35,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    marginRight: 12,
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#333' },
  itemMeta: { fontSize: 13, color: '#777', marginTop: 2 },
  itemPrice: { fontSize: 15, fontWeight: '700', color: '#333' },
  itemSeparator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 6 },

  billDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },

  billDetails: {
    marginBottom: 16,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: { fontSize: 14, color: '#666' },
  detailValue: { fontSize: 14, color: '#333' },
  totalAmount: { fontSize: 14, fontWeight: '700', color: '#333' },
  unpaidStatus: { fontSize: 14, color: '#FF6B35', fontWeight: '600' },

  paymentDetailsInCard: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  paymentDetailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#333' },

  successMessage: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 165,
  },
  successText: {
    fontSize: 13,
    color: '#FF8C42',
    fontWeight: '500',
  },

  bottomPaymentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  amountSection: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  finalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  viewDetails: {
    fontSize: 12,
    color: '#666',
    textDecorationLine: 'underline',
  },
  proceedButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
