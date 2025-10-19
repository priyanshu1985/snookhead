import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import QueueSuccessModal from './QueueSuccessModal';

// Game categories
const gameTabs = ['Snooker', 'Pool', 'PlayStation5', 'Table Tennis'];

// Table data
const tablesData = {
  Snooker: [
    {
      id: '1',
      name: 'T1',
      price: '₹200/hr',
      status: 'available',
      color: '#4A7C59',
    },
    {
      id: '2',
      name: 'T2',
      price: '₹220/hr',
      status: 'available',
      color: '#4A7C59',
    },
    {
      id: '3',
      name: 'T3',
      price: '₹200/hr',
      status: 'occupied',
      time: '5 min',
      color: '#4A7C59',
    },
    {
      id: '4',
      name: 'T4',
      price: '₹200/hr',
      status: 'available',
      color: '#4A7C59',
    },
    {
      id: '5',
      name: 'T5',
      price: '₹200/hr',
      status: 'available',
      color: '#4A7C59',
    },
    {
      id: '6',
      name: 'T6',
      price: '₹200/hr',
      status: 'occupied',
      time: '31 min',
      color: '#4A7C59',
    },
    {
      id: '7',
      name: 'T7',
      price: '₹200/hr',
      status: 'occupied',
      time: '17 min',
      color: '#4A7C59',
    },
    {
      id: '8',
      name: 'T8',
      price: '₹200/hr',
      status: 'available',
      color: '#4A7C59',
    },
  ],
};

export default function QueueTableSelection({
  onTableSelected,
  onBack,
  onSkip,
}) {
  const [selectedTab, setSelectedTab] = useState('Snooker');
  const [selectedTable, setSelectedTable] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleContinue = () => {
    if (selectedTable) {
      setModalVisible(true);
    }
  };

  const handleModalClose = () => {
    setModalVisible(false);
    onTableSelected(selectedTable);
  };

  const renderTable = ({ item }) => {
    const isSelected = selectedTable?.id === item.id;
    const isOccupied = item.status === 'occupied';

    return (
      <TouchableOpacity
        style={[styles.tableCard, isSelected && styles.selectedTableCard]}
        onPress={() => !isOccupied && setSelectedTable(item)}
        disabled={isOccupied}
      >
        {/* Table Visual */}
        <View
          style={[
            styles.tableVisual,
            { backgroundColor: isOccupied ? '#555' : item.color },
          ]}
        >
          {isOccupied && (
            <View style={styles.timerBadge}>
              <Icon name="time-outline" size={14} color="#fff" />
              <Text style={styles.timerText}>{item.time}</Text>
            </View>
          )}

          {!isOccupied && (
            <View style={styles.tableGraphics}>
              <View style={styles.centerLine} />
              <View style={styles.cue} />
              <View style={styles.ballRack} />
            </View>
          )}
        </View>

        {/* Table Info */}
        <View style={styles.tableInfo}>
          <Text style={styles.tableName}>{item.name}</Text>
          <Text style={styles.tablePrice}>{item.price}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F5F5" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.mainTabs}>
          <View style={[styles.mainTab, styles.activeMainTab]}>
            <Text style={styles.activeMainTabText}>QUEUE</Text>
          </View>
          <View style={styles.mainTab}>
            <Text style={styles.mainTabText}>UPCOMING{'\n'}RESERVATION</Text>
          </View>
        </View>

        {/* Game Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.gameTabsScroll}
        >
          {gameTabs.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.gameTab,
                selectedTab === tab && styles.activeGameTab,
              ]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text
                style={[
                  styles.gameTabText,
                  selectedTab === tab && styles.activeGameTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tables Grid */}
      <FlatList
        data={tablesData[selectedTab] || []}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.tableRow}
        contentContainerStyle={styles.tablesContainer}
        renderItem={renderTable}
      />

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Success Modal */}
      <QueueSuccessModal
        visible={modalVisible}
        onClose={handleModalClose}
        tableNumber="T2 S0176"
        customerName="Amit sharma"
        date="02/08/2025"
        mobile="+91 9999999999"
        tablePreference={selectedTable?.name || 'Snooker'}
        members="08"
        timeSpan="2 Hour"
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
    backgroundColor: '#fff',
    paddingTop: 8,
  },
  mainTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  mainTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeMainTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42',
  },
  mainTabText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontWeight: '600',
  },
  activeMainTabText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  gameTabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gameTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 12,
  },
  activeGameTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#FF8C42',
  },
  gameTabText: {
    fontSize: 14,
    color: '#999',
  },
  activeGameTabText: {
    color: '#333',
    fontWeight: '600',
  },
  tablesContainer: {
    padding: 16,
  },
  tableRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tableCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedTableCard: {
    borderWidth: 3,
    borderColor: '#FF8C42',
  },
  tableVisual: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  timerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableGraphics: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLine: {
    width: '60%',
    height: 1,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  cue: {
    width: 40,
    height: 2,
    backgroundColor: '#fff',
    position: 'absolute',
    left: 20,
    top: 50,
    transform: [{ rotate: '45deg' }],
  },
  ballRack: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    right: 20,
    top: 40,
  },
  tableInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tablePrice: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
  bottomButtons: {
    padding: 16,
    gap: 12,
  },
  continueButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  skipButton: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  skipButtonText: {
    fontSize: 16,
    color: '#FF8C42',
    fontWeight: 'bold',
  },
});
