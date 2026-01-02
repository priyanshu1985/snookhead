// BillScreen.js
import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActiveBillsList from '../components/ActiveBillsList';
import BillHistoryList from '../components/BillHistoryList';
import BillDescriptionActive from '../components/BillDescriptionActive';
import BillDescriptionHistory from '../components/BillDescriptionHistory';

const { width } = Dimensions.get('window');

export default function BillScreen({ navigation }) {
  // State management
  const [currentView, setCurrentView] = useState('active'); // active, history, activeBillDetails, historyBillDetails
  const [selectedBill, setSelectedBill] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(1));

  // Navigation handlers with smooth transitions
  const handleShowHistory = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentView('history');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleShowActive = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setCurrentView('active');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleActiveBillClick = bill => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBill(bill);
      setCurrentView('activeBillDetails');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleHistoryBillClick = bill => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBill(bill);
      setCurrentView('historyBillDetails');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBackToActive = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBill(null);
      setCurrentView('active');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleBackToHistory = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBill(null);
      setCurrentView('history');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const handlePaymentComplete = () => {
    // After payment, go back to active bills with animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSelectedBill(null);
      setCurrentView('active');
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Render appropriate view with animation
  const renderView = () => {
    switch (currentView) {
      case 'active':
        return (
          <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
            <ActiveBillsList
              onShowHistory={handleShowHistory}
              onBillClick={handleActiveBillClick}
              navigation={navigation}
            />
          </Animated.View>
        );

      case 'history':
        return (
          <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
            <BillHistoryList
              onShowActive={handleShowActive}
              onBillClick={handleHistoryBillClick}
              navigation={navigation}
            />
          </Animated.View>
        );

      case 'activeBillDetails':
        return (
          <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
            <BillDescriptionActive
              bill={selectedBill}
              onBack={handleBackToActive}
              onPaymentComplete={handlePaymentComplete}
            />
          </Animated.View>
        );

      case 'historyBillDetails':
        return (
          <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
            <BillDescriptionHistory
              bill={selectedBill}
              onBack={handleBackToHistory}
            />
          </Animated.View>
        );

      default:
        return (
          <Animated.View style={[styles.viewContainer, { opacity: fadeAnim }]}>
            <ActiveBillsList
              onShowHistory={handleShowHistory}
              onBillClick={handleActiveBillClick}
              navigation={navigation}
            />
          </Animated.View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F5F5F5"
        translucent={false}
      />
      <View style={styles.screenWrapper}>{renderView()}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  screenWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  viewContainer: {
    flex: 1,
    width: width,
    backgroundColor: 'transparent',
  },
});
