// OrdersScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import FoodOrderCard from '../components/FoodOrderCard';
import OrderDetailModal from '../components/OrderDetailModal';

// Sample order data
const ordersData = [
  {
    id: '1',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Amit sharma',
    date: '02/08/2025',
    mobile: '+91 9999999999',
    items: ['2- PASTA', '2- Cigarette', '1 - Noodles'],
    waitTime: '10 min',
  },
  {
    id: '2',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Rahul Verma',
    date: '02/08/2025',
    mobile: '+91 8888888888',
    items: ['1- PIZZA', '3- Coffee', '2 - Burger'],
    waitTime: '15 min',
  },
  {
    id: '3',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Priya Singh',
    date: '02/08/2025',
    mobile: '+91 7777777777',
    items: ['2- Sandwich', '1- Tea', '1 - Fries'],
    waitTime: '8 min',
  },
  {
    id: '4',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Vijay Kumar',
    date: '02/08/2025',
    mobile: '+91 6666666666',
    items: ['3- Samosa', '2- Cold Drink', '1 - Pakora'],
    waitTime: '12 min',
  },
  {
    id: '5',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Neha Gupta',
    date: '02/08/2025',
    mobile: '+91 5555555555',
    items: ['2- Momos', '1- Juice', '2 - Spring Roll'],
    waitTime: '20 min',
  },
  {
    id: '6',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Sanjay Sharma',
    date: '02/08/2025',
    mobile: '+91 4444444444',
    items: ['1- Dosa', '2- Coffee', '1 - Idli'],
    waitTime: '18 min',
  },
  {
    id: '7',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Anjali Desai',
    date: '02/08/2025',
    mobile: '+91 3333333333',
    items: ['2- Paratha', '1- Lassi', '1 - Chole'],
    waitTime: '25 min',
  },
  {
    id: '8',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    totalOrdered: 3,
    ordersDelivered: 2,
    yetToDeliver: 1,
    amountPayable: '₹1,600',
    customerName: 'Karan Mehta',
    date: '02/08/2025',
    mobile: '+91 2222222222',
    items: ['3- Vada Pav', '2- Tea', '1 - Bhaji'],
    waitTime: '10 min',
  },
];

export default function OrdersScreen() {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleCardPress = order => {
    setSelectedOrder(order);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedOrder(null);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <TouchableOpacity>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Food and order</Text>
      </View>

      <View style={styles.searchRow}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
          />
          <Icon name="mic" size={20} color="#FF8C42" />
        </View>

        {/* Select Date Button */}
        <TouchableOpacity style={styles.dateButton}>
          <Icon name="calendar-outline" size={18} color="#999" />
          <Text style={styles.dateButtonText}>Select Date</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />
      {renderHeader()}

      <FlatList
        data={ordersData}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <FoodOrderCard order={item} onPress={() => handleCardPress(item)} />
        )}
      />

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal
          visible={modalVisible}
          order={selectedOrder}
          onClose={handleCloseModal}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    marginTop: StatusBar.currentHeight || 0,
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  dateButtonText: {
    fontSize: 12,
    color: '#999',
  },
  listContent: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
});
