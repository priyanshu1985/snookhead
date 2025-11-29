import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TableCard({ table, color, onPress, onDelete }) {
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const isOccupied = table.status === 'occupied' || table.status === 'reserved';
  const priceText = table.price || `₹${table.pricePerHour || 200}/hr`;

  // Update timer every second for occupied tables
  React.useEffect(() => {
    if (!isOccupied || !table.startTime) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOccupied, table.startTime]);

  // Calculate elapsed time
  const getElapsedTime = () => {
    if (!table.startTime) return '0 min';
    const elapsed = Math.floor(
      (currentTime - new Date(table.startTime).getTime()) / (1000 * 60),
    );
    return `${elapsed} min`;
  };

  const handlePress = () => {
    console.log('TableCard pressed:', {
      tableName: table.name,
      status: table.status,
      sessionId: table.sessionId,
      isOccupied,
      startTime: table.startTime,
    });

    // Check if table is occupied (either has sessionId or status is occupied/reserved)
    if (isOccupied) {
      // Handle ending session for occupied tables
      console.log('Navigating to AfterBooking for occupied table');
      onPress(table, 'stop');
    } else {
      // Handle normal booking for available tables
      console.log('Navigating to TableBookingScreen for available table');
      onPress(table, 'book');
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={handlePress}
    >
      {/* Optional delete icon (top-right) */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={e => {
          e.stopPropagation();
          onDelete && onDelete();
        }}
      >
        <Icon name="trash-outline" size={16} color="#FF6B6B" />
      </TouchableOpacity>

      {/* Table image area */}
      <View style={styles.imageWrapper}>
        <View
          style={[styles.tableImage, { backgroundColor: color || '#4A7C59' }]}
        >
          {/* simple cue/balls illustration using lines */}
          <View style={styles.tableBorder} />
          <View style={[styles.line, { transform: [{ rotate: '-20deg' }] }]} />
          <View style={[styles.line, { transform: [{ rotate: '30deg' }] }]} />
        </View>

        {/* Occupied overlay */}
        {isOccupied && (
          <View style={styles.overlay}>
            <Icon
              name="time-outline"
              size={14}
              color="#fff"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.overlayText}>{getElapsedTime()}</Text>
          </View>
        )}
      </View>

      {/* Bottom info row */}
      <View style={styles.infoRow}>
        <Text style={styles.tableName}>{table.name}</Text>
        <Text style={styles.priceText}>
          {priceText.split('/')[0]} <Text style={styles.priceUnit}>/hr</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  deleteButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  imageWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },

  tableImage: {
    height: 80,
    borderRadius: 10,
    backgroundColor: '#4A7C59',
    justifyContent: 'center',
    alignItems: 'center',
  },

  tableBorder: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    right: 4,
    borderWidth: 2,
    borderColor: '#C97B43',
    borderRadius: 8,
  },

  line: {
    width: '70%',
    height: 2,
    backgroundColor: '#FFFFFFAA',
    borderRadius: 1,
  },

  overlay: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
  },

  overlayText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '600',
  },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  tableName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },

  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF8C42',
  },

  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFB27A',
  },
});
