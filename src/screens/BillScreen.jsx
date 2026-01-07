// BillScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import Header from '../components/Header';
import ActiveBillsList from '../components/ActiveBillsList';
import BillHistoryList from '../components/BillHistoryList';
import BillDescriptionActive from '../components/BillDescriptionActive';
import BillDescriptionHistory from '../components/BillDescriptionHistory';

export default function BillScreen({ navigation }) {
  // State management
  const [currentView, setCurrentView] = useState('active');
  const [selectedBill, setSelectedBill] = useState(null);

  // Navigation handlers
  const handleShowHistory = () => {
    setCurrentView('history');
  };

  const handleShowActive = () => {
    setCurrentView('active');
  };

  const handleActiveBillClick = bill => {
    setSelectedBill(bill);
    setCurrentView('activeBillDetails');
  };

  const handleHistoryBillClick = bill => {
    setSelectedBill(bill);
    setCurrentView('historyBillDetails');
  };

  const handleBackToActive = () => {
    setSelectedBill(null);
    setCurrentView('active');
  };

  const handleBackToHistory = () => {
    setSelectedBill(null);
    setCurrentView('history');
  };

  const handlePaymentComplete = () => {
    setSelectedBill(null);
    setCurrentView('active');
  };

  // Render appropriate view
  const renderView = () => {
    switch (currentView) {
      case 'active':
        return (
          <ActiveBillsList
            onShowHistory={handleShowHistory}
            onBillClick={handleActiveBillClick}
            navigation={navigation}
          />
        );

      case 'history':
        return (
          <BillHistoryList
            onShowActive={handleShowActive}
            onBillClick={handleHistoryBillClick}
            navigation={navigation}
          />
        );

      case 'activeBillDetails':
        return (
          <BillDescriptionActive
            bill={selectedBill}
            onBack={handleBackToActive}
            onPaymentComplete={handlePaymentComplete}
            navigation={navigation}
          />
        );

      case 'historyBillDetails':
        return (
          <BillDescriptionHistory
            bill={selectedBill}
            onBack={handleBackToHistory}
          />
        );

      default:
        return (
          <ActiveBillsList
            onShowHistory={handleShowHistory}
            onBillClick={handleActiveBillClick}
            navigation={navigation}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />
      <View style={styles.screenWrapper}>{renderView()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  screenWrapper: {
    flex: 1,
  },
});
