import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TableCard({ table, color, gameImageUrl, onPress }) {
  if (!table) return null;

  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const isOccupied = table.status === 'occupied' || table.status === 'reserved';

  React.useEffect(() => {
    if (!table.name) {
      console.warn('TableCard received table with no name:', table);
    }
  }, [table]);

  // Format price to remove unnecessary decimals and extract currency/unit parts
  const formatPrice = () => {
    let rawPrice = table.pricePerMin || table.price_per_min || 200;

    // If it's already a formatted string like "₹200/hr", parse it
    if (typeof table.price === 'string' && table.price.includes('₹')) {
      const match = table.price.match(/₹([0-9.]+)/);
      if (match) {
        rawPrice = parseFloat(match[1]);
      }
    }

    // Format the number - always remove decimals for clean display
    const formattedPrice = Math.floor(rawPrice).toString();
    return `₹${formattedPrice}`;
  };

  const priceText = formatPrice();

  // Update timer every second for occupied tables
  React.useEffect(() => {
    if (!isOccupied) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOccupied]);

  // Calculate remaining time (countdown)
  const getRemainingTime = () => {
    const session = table.activeSession || {};
    const bookingType = session.booking_type || session.bookingType || table.bookingType;

    // Frame Mode Display
    if (bookingType === 'frame') {
      const frames = session.frame_count || session.frameCount || table.frame_count || table.frameCount || 0;
      const startTime = session.start_time || session.starttime || table.startTime;
      let elapsedText = '0m';

      if (startTime) {
        const elapsed = Math.floor((currentTime - new Date(startTime).getTime()) / 1000);
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        elapsedText = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
      }

      return {
        text: `${frames} Frames • ${elapsedText}`,
        isExpired: false,
        isWarning: false,
        isElapsed: true,
        seconds: 0,
        isFrame: true
      };
    }

    if (table.bookingEndTime) {
      // Use booking end time for countdown
      const endTime = new Date(table.bookingEndTime).getTime();
      const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));

      if (remaining <= 0) {
        return {
          text: 'Expired',
          isExpired: true,
          isWarning: false,
          seconds: 0,
        };
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      let text;
      if (hours > 0) {
        text = `${hours}h ${minutes}m left`;
      } else if (minutes > 0) {
        text = `${minutes}m left`;
      } else {
        text = `<1m left`;
      }

      return {
        text,
        isExpired: false,
        isWarning: remaining <= 300, // Warning when less than 5 minutes
        seconds: remaining,
      };
    } else if (table.durationMinutes && table.startTime) {
      // Calculate from start time and duration
      const startTime = new Date(table.startTime).getTime();
      const endTime = startTime + table.durationMinutes * 60 * 1000;
      const remaining = Math.max(0, Math.floor((endTime - currentTime) / 1000));

      if (remaining <= 0) {
        return {
          text: 'Expired',
          isExpired: true,
          isWarning: false,
          seconds: 0,
        };
      }

      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      let text;
      if (hours > 0) {
        text = `${hours}h ${minutes}m left`;
      } else if (minutes > 0) {
        text = `${minutes}m left`;
      } else {
        text = `<1m left`;
      }

      return {
        text,
        isExpired: false,
        isWarning: remaining <= 300,
        seconds: remaining,
      };
    } else if (table.startTime) {
      // Fallback: show elapsed time if no end time available
      const elapsed = Math.floor(
        (currentTime - new Date(table.startTime).getTime()) / 1000,
      );
      const hours = Math.floor(elapsed / 3600);
      const minutes = Math.floor((elapsed % 3600) / 60);

      let text;
      if (hours > 0) {
        text = `${hours}h ${minutes}m`;
      } else if (minutes > 0) {
        text = `${minutes}m`;
      } else {
        text = `<1m`;
      }

      return {
        text,
        isExpired: false,
        isWarning: false,
        isElapsed: true,
        seconds: elapsed,
      };
    }

    return { text: '0m', isExpired: false, isWarning: false, seconds: 0 };
  };

  const timerInfo = getRemainingTime();

  const handlePress = () => {
    console.log('TableCard pressed:', {
      tableName: table.name,
      status: table.status,
      sessionId: table.sessionId,
      isOccupied,
      startTime: table.startTime,
    });

    // If table has an active session ID, it's running -> View Session (AfterBooking)
    // If table is Occupied/Reserved/Available but NO session ID -> Start Session (Booking Screen)
    // This handles the "Manual Seat" queue flow where table is Occupied but waiting for start.
    if (table.sessionId) {
      console.log('Navigating to AfterBooking for active session');
      onPress(table, 'stop');
    } else {
      console.log('Navigating to TableBookingScreen to start session');
      onPress(table, 'book');
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, isOccupied && styles.cardOccupied]}
      activeOpacity={0.85}
      onPress={handlePress}
    >
      {/* Safety Check: If table data is corrupt, show error */}
      {(!table || !table.name) ? (
          <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
              <Text style={{color:'red', fontWeight:'bold'}}>Data Error</Text>
              <Text style={{fontSize:10}}>ID: {table?.id || '?'}</Text>
          </View>
      ) : (
        <View style={{flex: 1}}>
          {/* Status indicator */}
          <View
            style={[
              styles.statusIndicator,
              isOccupied ? styles.statusOccupied : styles.statusAvailable,
            ]}
          />

          {/* Table image area */}
          <View style={styles.imageWrapper}>
            {gameImageUrl ? (
              // Display actual game image from backend
              <View
                style={[
                  styles.imageContainer,
                  isOccupied && styles.tableImageOccupied,
                ]}
              >
                <Image
                  source={{ uri: gameImageUrl }}
                  style={styles.actualImage}
                  resizeMode="cover"
                  onError={e =>
                    console.log('TableCard image error:', e.nativeEvent.error)
                  }
                />
              </View>
            ) : (
              // Fallback to colored placeholder
              <View
                style={[
                  styles.tableImage,
                  { backgroundColor: color || '#4A7C59' },
                  isOccupied && styles.tableImageOccupied,
                ]}
              >
                {/* Fallback icon when no image */}
                <Icon name="grid-outline" size={32} color="rgba(255,255,255,0.6)" />
              </View>
            )}

            {/* Occupied overlay with countdown timer */}
            {isOccupied && (
              <View
                style={[
                  styles.overlay,
                  timerInfo.isExpired && styles.overlayExpired,
                  timerInfo.isWarning && styles.overlayWarning,
                ]}
              >
                <View
                  style={[
                    styles.overlayPulse,
                    timerInfo.isExpired && styles.pulseExpired,
                    timerInfo.isWarning && styles.pulseWarning,
                  ]}
                />
                <Icon
                  name={
                    timerInfo.isExpired
                      ? 'alert-circle'
                      : timerInfo.isFrame
                      ? 'apps-outline'
                      : timerInfo.isElapsed
                      ? 'time-outline'
                      : 'hourglass-outline'
                  }
                  size={12}
                  color="#FFFFFF"
                  style={styles.overlayIcon}
                />
                <Text style={styles.overlayText}>
                  {timerInfo.isElapsed ? ' ' : ''}
                  {timerInfo.text}
                </Text>
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
              <Text style={styles.tableName}>{table.name || `Table ${table.id}`}</Text>
              <View style={styles.priceContainer}>
                <Text style={styles.priceText}>{priceText}</Text>
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
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 18,
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

  imageWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    marginTop: 4,
    position: 'relative',
  },

  imageContainer: {
    width: '100%',
    aspectRatio: 1.5, // 3:2 aspect ratio for table images
    borderRadius: 12,
    backgroundColor: '#2D5A3D', // Dark green background to complement table images
    overflow: 'hidden',
  },

  tableImage: {
    width: '100%',
    aspectRatio: 1.5,
    borderRadius: 12,
    backgroundColor: '#4A7C59',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  actualImage: {
    width: '100%',
    height: '100%',
  },
  tableImageOccupied: {
    opacity: 0.85,
  },

  overlay: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 140, 66, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  overlayWarning: {
    backgroundColor: 'rgba(255, 87, 34, 0.95)',
  },
  overlayExpired: {
    backgroundColor: 'rgba(244, 67, 54, 0.95)',
  },
  overlayPulse: {
    position: 'absolute',
    left: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  pulseWarning: {
    backgroundColor: '#FFE0B2',
  },
  pulseExpired: {
    backgroundColor: '#FFCDD2',
  },
  overlayIcon: {
    marginRight: 0,
  },
  overlayText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.3,
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
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 0.1,
  },

  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    alignSelf: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF8C42',
    lineHeight: 14,
  },
  priceUnit: {
    fontSize: 9,
    fontWeight: '500',
    color: '#FFB27A',
    marginLeft: 1,
    lineHeight: 14,
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
