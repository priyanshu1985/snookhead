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

    if (isOccupied) {
      console.log('Navigating to AfterBooking for occupied table');
      onPress(table, 'stop');
    } else {
      console.log('Navigating to TableBookingScreen for available table');
      onPress(table, 'book');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isOccupied && styles.cardOccupied]}
      activeOpacity={0.85}
      onPress={handlePress}
    >
      {/* Status indicator */}
      <View style={[styles.statusIndicator, isOccupied ? styles.statusOccupied : styles.statusAvailable]} />

      {/* Delete button - only show for available tables */}
      {!isOccupied && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={e => {
            e.stopPropagation();
            onDelete && onDelete();
          }}
          activeOpacity={0.7}
        >
          <Icon name="trash-outline" size={14} color="#FF6B6B" />
        </TouchableOpacity>
      )}

      {/* Table image area */}
      <View style={styles.imageWrapper}>
        <View
          style={[
            styles.tableImage,
            { backgroundColor: color || '#4A7C59' },
            isOccupied && styles.tableImageOccupied,
          ]}
        >
          {/* Table illustration */}
          <View style={styles.tableBorder} />
          <View style={[styles.line, { transform: [{ rotate: '-20deg' }] }]} />
          <View style={[styles.line, { transform: [{ rotate: '30deg' }] }]} />

          {/* Pool balls decoration */}
          <View style={styles.ballsContainer}>
            <View style={[styles.ball, styles.ballRed]} />
            <View style={[styles.ball, styles.ballYellow]} />
            <View style={[styles.ball, styles.ballBlue]} />
          </View>
        </View>

        {/* Occupied overlay with timer */}
        {isOccupied && (
          <View style={styles.overlay}>
            <View style={styles.overlayPulse} />
            <Icon
              name="timer-outline"
              size={14}
              color="#FFFFFF"
              style={styles.overlayIcon}
            />
            <Text style={styles.overlayText}>{getElapsedTime()}</Text>
          </View>
        )}

        {/* Available badge */}
        {!isOccupied && (
          <View style={styles.availableBadge}>
            <Icon name="checkmark-circle" size={12} color="#4CAF50" />
            <Text style={styles.availableText}>Available</Text>
          </View>
        )}
      </View>

      {/* Bottom info section */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.tableName}>{table.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceText}>
              {priceText.split('/')[0]}
            </Text>
            <Text style={styles.priceUnit}>/hr</Text>
          </View>
        </View>

        {/* Action hint */}
        <View style={styles.actionHint}>
          <Text style={styles.actionText}>
            {isOccupied ? 'Tap to view session' : 'Tap to book'}
          </Text>
          <Icon
            name={isOccupied ? 'eye-outline' : 'arrow-forward'}
            size={12}
            color={isOccupied ? '#FF8C42' : '#4CAF50'}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  cardOccupied: {
    borderWidth: 1.5,
    borderColor: '#FFE0CC',
  },

  statusIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  statusAvailable: {
    backgroundColor: '#4CAF50',
  },
  statusOccupied: {
    backgroundColor: '#FF8C42',
  },

  deleteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 10,
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    borderWidth: 1,
    borderColor: '#FFEBEE',
  },

  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 4,
  },

  tableImage: {
    height: 90,
    borderRadius: 12,
    backgroundColor: '#4A7C59',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tableImageOccupied: {
    opacity: 0.9,
  },

  tableBorder: {
    position: 'absolute',
    top: 6,
    bottom: 6,
    left: 6,
    right: 6,
    borderWidth: 2,
    borderColor: '#C97B43',
    borderRadius: 8,
  },

  line: {
    width: '60%',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },

  ballsContainer: {
    position: 'absolute',
    bottom: 12,
    flexDirection: 'row',
    gap: 4,
  },
  ball: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ballRed: {
    backgroundColor: '#E53935',
  },
  ballYellow: {
    backgroundColor: '#FDD835',
  },
  ballBlue: {
    backgroundColor: '#1E88E5',
  },

  overlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 140, 66, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  overlayPulse: {
    position: 'absolute',
    left: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  overlayIcon: {
    marginLeft: 10,
    marginRight: 4,
  },
  overlayText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },

  availableBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  availableText: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
  },

  infoSection: {
    paddingHorizontal: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  tableName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C42',
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFB27A',
    marginLeft: 1,
  },

  actionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '500',
  },
});
