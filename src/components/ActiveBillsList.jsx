import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Sample active bills data
const activeBillsData = [
  {
    id: '1',
    date: '02/08/2025',
    customerName: 'Amit sharma',
    items: 'Table tennis + Food+ Cigarette',
    mobile: '+91 9999999999',
    billNumber: 'T2 S0176',
    amount: '₹1,600/-',
    status: 'Unpaid',
    detailedItems: [
      { name: 'Snooker', quantity: '5 Frame', price: 730 },
      { name: 'Cigarette', quantity: '2 Qty', price: 170 },
      { name: 'Pasta', quantity: '1 Qty', price: 140 },
    ],
    orderAmount: 2400,
    orderSaving: -110,
    totalAmount: 2370,
    savedAmount: 110,
  },
  {
    id: '2',
    date: '02/08/2025',
    customerName: 'Jon Deo',
    items: 'Pool + PS5 + Cigarette+ beverages',
    mobile: '+91 9999999999',
    billNumber: 'T5 S0816',
    amount: '₹2,300/-',
    status: 'Unpaid',
    detailedItems: [
      { name: 'Pool', quantity: '3 Frame', price: 450 },
      { name: 'PS5', quantity: '2 Hours', price: 600 },
      { name: 'Cigarette', quantity: '3 Qty', price: 255 },
      { name: 'Beverages', quantity: '4 Qty', price: 200 },
    ],
    orderAmount: 2400,
    orderSaving: -100,
    totalAmount: 2300,
    savedAmount: 100,
  },
  {
    id: '3',
    date: '02/08/2025',
    customerName: 'Amit sharma',
    items: 'Table tennis + Food+ Cigarette',
    mobile: '+91 9999999999',
    billNumber: 'T1 S0901',
    amount: '₹3,100/-',
    status: 'Unpaid',
    detailedItems: [
      { name: 'Table Tennis', quantity: '2 Hours', price: 400 },
      { name: 'Food', quantity: '5 Items', price: 850 },
      { name: 'Cigarette', quantity: '5 Qty', price: 425 },
    ],
    orderAmount: 3200,
    orderSaving: -100,
    totalAmount: 3100,
    savedAmount: 100,
  },
  {
    id: '4',
    date: '02/08/2025',
    customerName: 'Amit sharma',
    items: 'Table tennis + Food+ Cigarette',
    mobile: '+91 9999999999',
    billNumber: 'T1 S0601',
    amount: '₹3,100/-',
    status: 'Unpaid',
    detailedItems: [
      { name: 'Snooker', quantity: '4 Frame', price: 800 },
      { name: 'Food', quantity: '3 Items', price: 420 },
      { name: 'Cigarette', quantity: '2 Qty', price: 170 },
    ],
    orderAmount: 3200,
    orderSaving: -100,
    totalAmount: 3100,
    savedAmount: 100,
  },
  {
    id: '5',
    date: '02/08/2025',
    customerName: 'Jon Deo',
    items: 'Pool + PS5 + Cigarette+ beverages',
    mobile: '+91 9999999999',
    billNumber: 'T5 S0816',
    amount: '₹2,300/-',
    status: 'Unpaid',
    detailedItems: [
      { name: 'Pool', quantity: '5 Frame', price: 750 },
      { name: 'Cigarette', quantity: '3 Qty', price: 255 },
      { name: 'Beverages', quantity: '5 Qty', price: 250 },
    ],
    orderAmount: 2400,
    orderSaving: -145,
    totalAmount: 2300,
    savedAmount: 145,
  },
];

export default function ActiveBillsList({
  onShowHistory,
  onBillClick,
  navigation,
}) {
  const [searchText, setSearchText] = useState('');

  const renderBillCard = ({ item }) => (
    <TouchableOpacity style={styles.billCard} onPress={() => onBillClick(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.date}>{item.date}</Text>
          <Text style={styles.customerName}>{item.customerName}</Text>
          <Text style={styles.items}>{item.items}</Text>
          <Text style={styles.mobile}>{item.mobile}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.billLabel}>Bill 1</Text>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
          <Text style={styles.amount}>{item.amount}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bill Management</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>ACTIVE BILLS</Text>
        </View>

        <TouchableOpacity style={styles.tab} onPress={onShowHistory}>
          <Text style={styles.tabText}>BILL HISTORY</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar & Date Selector */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
          <Icon name="mic" size={20} color="#FF8C42" />
        </View>

        <TouchableOpacity style={styles.dateSelector}>
          <Icon name="calendar-outline" size={18} color="#999" />
          <Text style={styles.dateSelectorText}>02/08/2025</Text>
        </TouchableOpacity>
      </View>

      {/* Bills List */}
      <FlatList
        data={activeBillsData}
        keyExtractor={item => item.id}
        renderItem={renderBillCard}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dateSelectorText: {
    fontSize: 12,
    color: '#333',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  billCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  date: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  items: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  mobile: {
    fontSize: 12,
    color: '#999',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  billLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 2,
  },
  billNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
    marginBottom: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  statusBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
});
