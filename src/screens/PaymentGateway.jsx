import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PaymentGateway({ route, navigation }) {
  const { cart = [], personName = '' } = route.params || {};

  const orderTotal = cart.reduce(
    (sum, ci) => sum + (Number(ci.item.price) || 0) * ci.qty,
    0,
  );
  const orderSaving = 0; // plug in any discount logic later
  const grandTotal = orderTotal - orderSaving;

  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, '0')}/${String(
    today.getMonth() + 1,
  ).padStart(2, '0')}/${today.getFullYear()}`;

  const tableLabel = 'T2 S0176'; // you can pass table from OrdersScreen via params if needed
  const billNo = 'Bill 1';

  const handleProceedToPay = () => {
    // TODO: integrate real payment or mark as paid in backend
    // For now just go back
    navigation.goBack();
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

      {/* Card with name, date, items */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardName}>{personName || 'Guest'}</Text>
          <Text style={styles.cardDate}>{dateStr}</Text>
        </View>

        <FlatList
          data={cart}
          keyExtractor={ci => String(ci.item.id || ci.item.name)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        />
      </View>

      {/* Details section */}
      <View style={styles.detailsSection}>
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
          <Text style={[styles.detailValue, styles.detailBold]}>
            ₹ {grandTotal.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status :</Text>
          <Text style={[styles.detailValue, { color: '#FF3B30' }]}>Unpaid</Text>
        </View>
      </View>

      {/* Order payment details */}
      <View style={styles.paymentDetailsSection}>
        <Text style={styles.paymentDetailsTitle}>ORDER PAYMENT DETAILS</Text>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Amount</Text>
          <Text style={styles.detailValue}>+ {orderTotal}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Order Saving</Text>
          <Text style={styles.detailValue}>- {orderSaving}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={[styles.detailLabel, styles.detailBold]}>Total :</Text>
          <Text style={[styles.detailValue, styles.detailBold]}>
            ₹ {grandTotal}
          </Text>
        </View>
      </View>

      {/* Bottom bar */}
      <View style={styles.bottomBarNote}>
        <Text style={styles.bottomBarNoteText}>
          🎉 Cheers! You Saved ₹ {orderSaving}.
        </Text>
      </View>

      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomAmountLabel}>₹ {grandTotal}</Text>
          <Text style={styles.bottomAmountSub}>View details</Text>
        </View>
        <TouchableOpacity style={styles.payButton} onPress={handleProceedToPay}>
          <Text style={styles.payButtonText}>Proceed To Pay</Text>
        </TouchableOpacity>
      </View>
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

  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardName: { fontSize: 14, fontWeight: '600', color: '#333' },
  cardDate: { fontSize: 13, color: '#777' },

  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemIcon: {
    width: 40,
    height: 30,
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
    marginRight: 10,
  },
  itemName: { fontSize: 14, fontWeight: '600', color: '#333' },
  itemMeta: { fontSize: 12, color: '#777', marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '600', color: '#333' },
  itemSeparator: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4 },

  detailsSection: {
    marginHorizontal: 16,
    marginTop: 4,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  detailLabel: { fontSize: 13, color: '#777' },
  detailValue: { fontSize: 13, color: '#333' },
  detailBold: { fontWeight: '700' },

  paymentDetailsSection: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  paymentDetailsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },

  bottomBarNote: {
    marginHorizontal: 0,
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: '#FFEFD5',
    alignItems: 'center',
  },
  bottomBarNoteText: { fontSize: 12, color: '#FF8C42' },

  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  bottomAmountLabel: { fontSize: 16, fontWeight: '700', color: '#333' },
  bottomAmountSub: { fontSize: 11, color: '#999' },
  payButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 22,
  },
  payButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
