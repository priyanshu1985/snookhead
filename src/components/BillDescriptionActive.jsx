import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BillDescriptionActive({
  bill,
  onBack,
  onPaymentComplete,
}) {
  if (!bill) return null;

  const handleProceedToPay = () => {
    // Here you would integrate payment gateway
    // For now, just go back after "payment"
    alert('Payment Successful! ₹' + bill.totalAmount);
    onPaymentComplete();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Description</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Bill Number */}
        <View style={styles.billNumberContainer}>
          <Text style={styles.billNumber}>{bill.billNumber}</Text>
          <Text style={styles.billLabel}>Bill 1</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfoCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>{bill.customerName}</Text>
            <Text style={styles.date}>{bill.date}</Text>
          </View>

          {/* Items List */}
          {bill.detailedItems.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIcon}>
                  <Icon name="cube-outline" size={24} color="#FF8C42" />
                </View>
                <View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQuantity}>{item.quantity}</Text>
                </View>
              </View>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>
          ))}
        </View>

        {/* Watermark */}
        <View style={styles.watermark}>
          <Icon name="fish" size={100} color="#F0F0F0" />
          <Text style={styles.watermarkText}>SNOKEHEAD</Text>
        </View>

        {/* Payment Details */}
        <View style={styles.paymentDetailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile No. :</Text>
            <Text style={styles.detailValue}>{bill.mobile}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wallet Amount :</Text>
            <Text style={styles.detailValue}>₹ 0.00</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount :</Text>
            <Text style={styles.detailValue}>₹ {bill.totalAmount} /-</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status :</Text>
            <Text style={styles.statusUnpaid}>Unpaid</Text>
          </View>
        </View>

        {/* Order Payment Details */}
        <View style={styles.orderPaymentCard}>
          <Text style={styles.orderPaymentTitle}>ORDER PAYMENT DETAILS</Text>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Order Amount</Text>
            <Text style={styles.paymentValue}>+₹{bill.orderAmount}rs</Text>
          </View>

          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Order Saving</Text>
            <Text style={styles.paymentValue}>{bill.orderSaving}rs</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total :</Text>
            <Text style={styles.totalValue}>₹ {bill.totalAmount}</Text>
          </View>
        </View>

        {/* Savings Banner */}
        <View style={styles.savingsBanner}>
          <Icon name="trophy" size={20} color="#FF8C42" />
          <Text style={styles.savingsText}>
            Cheers! You Saved ₹ {bill.savedAmount}.00
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Payment Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceAmount}>₹ {bill.totalAmount}.00</Text>
          <TouchableOpacity>
            <Text style={styles.viewDetails}>View details</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.proceedButton}
          onPress={handleProceedToPay}
        >
          <Text style={styles.proceedButtonText}>Proceed To Pay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  billNumberContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  billNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  billLabel: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  customerInfoCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  date: {
    fontSize: 14,
    color: '#999',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF5ED',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  watermark: {
    alignItems: 'center',
    paddingVertical: 20,
    opacity: 0.3,
  },
  watermarkText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#E0E0E0',
    letterSpacing: 2,
  },
  paymentDetailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  statusUnpaid: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: 'bold',
  },
  orderPaymentCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  orderPaymentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#666',
  },
  paymentValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  savingsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5ED',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 100,
    gap: 8,
  },
  savingsText: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  priceContainer: {
    flex: 1,
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  viewDetails: {
    fontSize: 12,
    color: '#FF8C42',
    marginTop: 2,
  },
  proceedButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 25,
  },
  proceedButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
