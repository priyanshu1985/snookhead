// QueueScreen.js
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import QueueListView from '../components/QueueListView';
import QueueTableSelection from '../components/QueueTableSelection';
import UpcomingReservationList from '../components/UpcomingReservationList';
import AddReservationForm from '../components/AddReservationForm';

export default function QueueScreen({ navigation }) {
  // State to track which view is active
  const [currentView, setCurrentView] = useState('list'); // list, tableSelection, upcomingReservation, addReservation
  const [selectedData, setSelectedData] = useState(null);

  // Navigation handlers
  const handleAddQueue = () => {
    setCurrentView('tableSelection');
  };

  const handleTableSelected = table => {
    // After table selection, go back to list (modal will show)
    setSelectedData(table);
    setCurrentView('list');
  };

  const handleShowUpcomingReservations = () => {
    setCurrentView('upcomingReservation');
  };

  const handleAddReservation = () => {
    setCurrentView('addReservation');
  };

  const handleBackToList = () => {
    setCurrentView('list');
  };

  const handleBackToReservations = () => {
    setCurrentView('upcomingReservation');
  };

  // Render current view
  const renderView = () => {
    switch (currentView) {
      case 'list':
        return (
          <QueueListView
            onAddQueue={handleAddQueue}
            onShowReservations={handleShowUpcomingReservations}
            navigation={navigation}
          />
        );

      case 'tableSelection':
        return (
          <QueueTableSelection
            onTableSelected={handleTableSelected}
            onBack={handleBackToList}
            onSkip={handleBackToList}
          />
        );

      case 'upcomingReservation':
        return (
          <UpcomingReservationList
            onAddReservation={handleAddReservation}
            onBack={handleBackToList}
          />
        );

      case 'addReservation':
        return (
          <AddReservationForm
            onBack={handleBackToReservations}
            onComplete={handleBackToReservations}
          />
        );

      default:
        return (
          <QueueListView
            onAddQueue={handleAddQueue}
            onShowReservations={handleShowUpcomingReservations}
            navigation={navigation}
          />
        );
    }
  };

  return <View style={styles.container}>{renderView()}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
});
