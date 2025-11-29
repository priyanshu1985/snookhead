import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BillDescriptionHistory({ bill, onBack }) {
  if (!bill) return null;

  // Helper function to safely get bill details
  const getBillDetail = (field, defaultValue = '') => {
    return bill[field] || bill.originalBill?.[field] || defaultValue;
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bill Number */}
        <View style={styles.billNumberContainer}>
          <Text style={styles.billNumber}>{bill.billNumber}</Text>
          <Text style={styles.billLabel}>Bill 1</Text>
        </View>

        {/* Bill Details Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date :</Text>
            <Text style={styles.detailValue}>{getBillDetail('date')}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name :</Text>
            <Text style={styles.detailValue}>
              {getBillDetail('customerName', 'Unknown Customer')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Summary :</Text>
            <Text style={styles.detailValue}>
              {getBillDetail('summary', getBillDetail('items', 'Items'))}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mobile No. :</Text>
            <Text style={styles.detailValue}>
              {getBillDetail('mobile', '+91 XXXXXXXXXX')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Wallet Amount :</Text>
            <Text style={styles.detailValue}>
              {getBillDetail('walletAmount', '₹0.00')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Amount :</Text>
            <Text style={styles.detailValue}>
              {getBillDetail('totalAmount', '₹0 /-')}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Status :</Text>
            <Text style={styles.statusPaid}>
              {getBillDetail('status', 'Paid')}
            </Text>
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingBottom: 32,
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
  detailsCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 20,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    width: 120,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  statusPaid: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

// **Explanation:
// - Simple layout showing paid bill details
// - No items breakdown (just summary)
// - Blue "Paid" status
// - Clean minimal design
// - No payment button (already paid)
// - Just informational view

// ---

// ## 🔧 **Update AppNavigator.js**

// Your `AppNavigator.js` should already have BillScreen. No changes needed since BillScreen handles its own internal navigation.

// ---

// ## 📂 **Final File Structure for Bill Section**
// ```
// src/
// ├── screens/
// │   └── BillScreen.js (Main container)
// └── components/
//     ├── ActiveBillsList.js (Image 1 - Active bills list)
//     ├── BillHistoryList.js (Image 3 - History list)
//     ├── BillDescriptionActive.js (Image 2 - Payment screen)
//     └── BillDescriptionHistory.js (Image 4 - Paid bill details)
