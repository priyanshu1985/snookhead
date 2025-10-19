import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QueueSuccessModal from './QueueSuccessModal';

const reservationsData = [
  {
    id: '1',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    game: 'Snooker',
    date: '22/08/25',
    timings: '07:00 pm-09:00 PM',
    status: 'Prepaid',
    customerName: 'Amit sharma',
    mobile: '+91 9999999999',
    members: '08',
    timeSpan: '2 Hour',
    fullDate: '02/08/2025',
  },
  {
    id: '2',
    tableNumber: 'T2 S0176',
    billNumber: 'Bill 1',
    game: 'Snooker',
    date: '22/08/25',
    timings: '07:00 pm-09:00 PM',
    status: 'Prepaid',
    customerName: 'Rahul Verma',
    mobile: '+91 8888888888',
    members: '06',
    timeSpan: '1.5 Hour',
    fullDate: '02/08/2025',
  },
];

export default function UpcomingReservationList({ onAddReservation, onBack }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const handleCardPress = item => {
    setSelectedReservation(item);
    setModalVisible(true);
  };

  const renderReservation = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => handleCardPress(item)}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.tableNumber}>{item.tableNumber}</Text>
          <Text style={styles.billNumber}>{item.billNumber}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="ellipsis-vertical" size={20} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.infoText}>Game : {item.game}</Text>
        <Text style={styles.infoText}>Date : {item.date}</Text>
        <Text style={styles.infoText}>Timings: {item.timings}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upcoming reservation</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={styles.tab} onPress={onBack}>
          <Text style={styles.tabText}>QUEUE</Text>
        </TouchableOpacity>

        <View style={[styles.tab, styles.activeTab]}>
          <Text style={styles.activeTabText}>UPCOMING{'\n'}RESERVATION</Text>
        </View>
      </View>

      {/* List Title */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>List of Reservation</Text>
      </View>

      {/* Reservations List */}
      <FlatList
        data={reservationsData}
        keyExtractor={item => item.id}
        renderItem={renderReservation}
        contentContainerStyle={styles.listContent}
      />

      {/* Add Reservation Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={onAddReservation}>
          <Text style={styles.addButtonText}>Add Reservation</Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <QueueSuccessModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        tableNumber={selectedReservation?.tableNumber}
        customerName={selectedReservation?.customerName}
        date={selectedReservation?.date}
        mobile={selectedReservation?.mobile}
        tablePreference={selectedReservation?.tablePreference}
        members={selectedReservation?.members}
        timeSpan={selectedReservation?.timeSpan}
      />
      {/* Modal */}
      {selectedReservation && (
        <QueueSuccessModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          tableNumber={selectedReservation.tableNumber}
          customerName={selectedReservation.customerName}
          date={selectedReservation.fullDate}
          mobile={selectedReservation.mobile}
          tablePreference={selectedReservation.game}
          members={selectedReservation.members}
          timeSpan={selectedReservation.timeSpan}
        />
      )}
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
    textAlign: 'center',
  },
  activeTabText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tableNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  billNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
  },
  menuButton: {
    padding: 4,
  },
  cardContent: {
    padding: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 6,
  },
  buttonContainer: {
    padding: 16,
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
