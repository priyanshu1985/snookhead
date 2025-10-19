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

// Sample queue data
const queueData = [
  { id: '1', name: 'Rohit Sharma' },
  { id: '2', name: 'Rohit Sharma' },
  { id: '3', name: 'Rohit Sharma' },
  { id: '4', name: 'Rohit Sharma' },
  { id: '5', name: 'Rohit Sharma' },
  { id: '6', name: 'Rohit Sharma' },
];

export default function QueueListView({
  onAddQueue,
  onShowReservations,
  navigation,
}) {
  const [activeTab, setActiveTab] = useState('QUEUE');

  const handleReservationTab = () => {
    setActiveTab('UPCOMING RESERVATION');
    onShowReservations();
  };

  const renderQueueItem = ({ item, index }) => (
    <TouchableOpacity style={styles.queueItem}>
      <Text style={styles.queueNumber}>{index + 1}.</Text>
      <Text style={styles.queueName}>{item.name}</Text>
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
        <Text style={styles.headerTitle}>Queue</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <View style={[styles.tab, activeTab === 'QUEUE' && styles.activeTab]}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'QUEUE' && styles.activeTabText,
            ]}
          >
            QUEUE
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === 'UPCOMING RESERVATION' && styles.activeTab,
          ]}
          onPress={handleReservationTab}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'UPCOMING RESERVATION' && styles.activeTabText,
            ]}
          >
            UPCOMING{'\n'}RESERVATION
          </Text>
        </TouchableOpacity>
      </View>

      {/* Queue List */}
      <View style={styles.content}>
        <Text style={styles.listTitle}>List of queue</Text>

        <FlatList
          data={queueData}
          keyExtractor={item => item.id}
          renderItem={renderQueueItem}
          contentContainerStyle={styles.listContainer}
        />
      </View>

      {/* Add Queue Button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.addButton} onPress={onAddQueue}>
          <Text style={styles.addButtonText}>Add Queue</Text>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  tabText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#333',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    padding: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  listContainer: {
    paddingBottom: 16,
  },
  queueItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  queueNumber: {
    fontSize: 16,
    color: '#333',
    marginRight: 16,
    fontWeight: '500',
  },
  queueName: {
    fontSize: 16,
    color: '#FF8C42',
    fontWeight: '500',
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
