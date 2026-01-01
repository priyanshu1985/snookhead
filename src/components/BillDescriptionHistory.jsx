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

  // Format detailed items for display
  const formatDetailedItems = () => {
    const items = bill.detailedItems || bill.originalBill?.order_items || [];
    if (Array.isArray(items) && items.length > 0) {
      return items;
    }
    // If items is a string or no detailed items, create a simple item
    return [
      {
        name: bill.items || bill.summary || 'Items purchased',
        quantity: '1 unit',
        price:
          getBillDetail('totalAmount', '0')
            .replace('₹', '')
            .replace('/-', '')
            .replace(' ', '')
            .trim() || 0,
      },
    ];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Description</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Bill Number */}
        <View style={styles.billNumberContainer}>
          <Text style={styles.billNumber}>
            {getBillDetail('billNumber', 'BILL-001')}
          </Text>
          <Text style={styles.billLabel}>Paid Bill</Text>
        </View>

        {/* Customer Info */}
        <View style={styles.customerInfoCard}>
          <View style={styles.customerRow}>
            <Text style={styles.customerName}>
              {getBillDetail('customerName', 'Walk-in Customer')}
            </Text>
            <Text style={styles.date}>{getBillDetail('date')}</Text>
          </View>

          {/* Items List */}
          {formatDetailedItems().map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <View style={styles.itemIcon}>
                  <Icon name="cube-outline" size={24} color="#4CAF50" />
                </View>
                <View>
                  <Text style={styles.itemName}>
                    {item.name || item.item_name || 'Item'}
                  </Text>
                  <Text style={styles.itemQuantity}>
                    {item.quantity || item.qty || '1 unit'}
                  </Text>
                </View>
              </View>
              <Text style={styles.itemPrice}>
                ₹{item.price || item.amount || 0}
              </Text>
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
            <View style={styles.statusBadgePaid}>
              <Text style={styles.statusPaidText}>
                {getBillDetail('status', 'Paid')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },

  // Content
  scrollContent: {
    paddingBottom: 32,
  },
  billNumberContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  billNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#4CAF50',
    letterSpacing: 0.5,
  },
  billLabel: {
    fontSize: 14,
    color: '#888888',
    marginTop: 4,
    fontWeight: '500',
  },

  // Customer Info Card
  customerInfoCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  customerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },

  // Item Row
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8F9FA',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: '#888888',
    fontWeight: '400',
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4CAF50',
  },

  // Watermark
  watermark: {
    alignItems: 'center',
    marginVertical: 32,
  },
  watermarkText: {
    fontSize: 16,
    color: '#E0E0E0',
    fontWeight: '700',
    letterSpacing: 4,
    marginTop: 8,
  },

  // Payment Details Card
  paymentDetailsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  detailLabel: {
    fontSize: 14,
    color: '#888888',
    width: 120,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
    flex: 1,
  },
  statusBadgePaid: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusPaidText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
