import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';

export default function TableCard({
  table,
  color,
  gameImageUrl,
  onPress,
  onLongPress,
}) {
  const [isPortrait, setIsPortrait] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  if (!table) return null;

  // Handler to detect image orientation
  const handleImageLoad = event => {
    const { width, height } = event.nativeEvent.source;
    setIsPortrait(height > width);
  };
  const isOccupied = table.status === 'occupied' || table.status === 'reserved';

  const [fadeAnim] = React.useState(new Animated.Value(0));
  const [urgentAlert, setUrgentAlert] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const urgentAlertRef = useRef(false);

  // Check if table has a reservation coming up within 30 minutes
  const getReservationInfo = React.useCallback(() => {
    console.log('TableCard checking reservation for table:', table.name, {
      status: table.status,
      hasReservationDetails: !!table.reservationDetails,
      reservationDetails: table.reservationDetails,
    });

    if (table.status !== 'reserved' || !table.reservationDetails) {
      return null;
    }

    const reservation = table.reservationDetails;
    const reservationDate =
      reservation.reservation_date || reservation.reservationdate;
    const reservationTime =
      reservation.reservation_time ||
      reservation.reservationtime ||
      reservation.start_time;

    console.log('Reservation time details:', {
      reservationDate,
      reservationTime,
    });

    if (!reservationDate || !reservationTime) {
      console.log('Missing reservation date or time');
      return null;
    }

    const scheduledTime = new Date(`${reservationDate}T${reservationTime}`);
    const now = new Date();
    const minutesUntil = (scheduledTime - now) / (1000 * 60);

    console.log('Minutes until reservation:', minutesUntil);

    // Show reservation info if within 30 minutes or already in the start window
    if (minutesUntil <= 30) {
      const timeStr = scheduledTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      console.log('Showing reservation badge for:', table.name, 'at', timeStr);

      return {
        time: timeStr,
        minutesUntil: Math.round(minutesUntil),
        customerName: reservation.customer_name || reservation.customername,
      };
    }

    console.log('Reservation not within 30 minute window');
    return null;
  }, [table.status, table.reservationDetails, table.name, currentTime]);

  const reservationInfo = getReservationInfo();

  React.useEffect(() => {
    if (!table.name) {
      console.warn('TableCard received table with no name:', table);
    }
  }, [table]);

  // Fade-in animation
  Animated.timing(fadeAnim, {
    toValue: 1,
    duration: 400,
    useNativeDriver: true,
    easing: Easing.out(Easing.ease),
  }).start();

  // Highlight/Blinking animation for 3-minute warning
  const highlightAnim = React.useRef(new Animated.Value(0)).current;
  const animLoopRef = React.useRef(null);
  const [hasPlayedSound, setHasPlayedSound] = React.useState(false);

  // Load mute state from AsyncStorage
  React.useEffect(() => {
    if (!table.sessionId) return;
    const loadMuteState = async () => {
      try {
        const stored = await AsyncStorage.getItem(`muted_${table.sessionId}`);
        if (stored === 'true') {
          setIsMuted(true);
        }
      } catch (err) {
        console.log('Error loading mute state:', err);
      }
    };
    loadMuteState();
  }, [table.sessionId]);

  const toggleMute = async () => {
    if (!table.sessionId) return;
    try {
      const newState = !isMuted;
      setIsMuted(newState);
      await AsyncStorage.setItem(
        `muted_${table.sessionId}`,
        newState ? 'true' : 'false',
      );
    } catch (err) {
      console.log('Error toggling mute state:', err);
    }
  };

  // Update timer every second for occupied tables AND reserved tables with upcoming reservations
  React.useEffect(() => {
    // Update for occupied tables or reserved tables
    if (!isOccupied && table.status !== 'reserved') return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [isOccupied, table.status]);

  // Calculate remaining time (countdown)
  const getRemainingTime = () => {
    const session = table.activeSession || {};
    const bookingType =
      session.booking_type || session.bookingType || table.bookingType;

    // Frame Mode Display
    if (bookingType === 'frame') {
      const frames =
        session.frame_count ||
        session.frameCount ||
        table.frame_count ||
        table.frameCount ||
        0;
      const startTime =
        session.start_time || session.starttime || table.startTime;
      let elapsedText = '0m';

      if (startTime) {
        const elapsed = Math.floor(
          (currentTime - new Date(startTime).getTime()) / 1000,
        );
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
        isFrame: true,
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
          isCriticalWarning: false,
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
        isCriticalWarning: remaining <= 180, // Critical warning when <= 3 minutes
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
          isCriticalWarning: false,
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
        isCriticalWarning: remaining <= 180,
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
        isCriticalWarning: false,
        isElapsed: true,
        seconds: elapsed,
      };
    }

    return {
      text: '0m',
      isExpired: false,
      isWarning: false,
      isCriticalWarning: false,
      seconds: 0,
    };
  };

  const timerInfo = getRemainingTime();

  // Handle sound + vibration for critical warning
  React.useEffect(() => {
    // Only play sound if:
    // 1. We are in critical warning
    // 2. We haven't played alert yet during this session
    // 3. We are not muted
    if (timerInfo.isCriticalWarning && !hasPlayedSound && !isMuted) {
      console.log(`[TableCard] Playing warning sound for table ${table.name}`);
      try {
        // Enable playback in silence mode
        Sound.setCategory('Playback');

        // Load warning sound (you can add your own sound file in android/app/src/main/res/raw/)
        const warningSound = new Sound(
          'alarm.mp3',
          Sound.MAIN_BUNDLE,
          error => {
            if (error) {
              console.log('[TableCard] Failed to load sound', error);
              // Fallback to vibration only
              Vibration.vibrate([0, 200, 100, 200, 100, 200]);
              return;
            }

            // Set volume to max for urgency
            warningSound.setVolume(1.0);

            // Play the sound
            warningSound.play(success => {
              if (success) {
                console.log('[TableCard] Warning sound played successfully');
              } else {
                console.log('[TableCard] Warning sound playback failed');
              }
              // Release the sound resource
              warningSound.release();
            });
          },
        );

        // Vibration pattern: 3 strong pulses
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        setHasPlayedSound(true);
      } catch (error) {
        console.log('[TableCard] Error with sound/vibration:', error);
        // Fallback to vibration only
        Vibration.vibrate([0, 200, 100, 200, 100, 200]);
        setHasPlayedSound(true);
      }
    } else if (!timerInfo.isCriticalWarning && hasPlayedSound) {
      // Reset if we go out of critical warning (e.g., table updated)
      setHasPlayedSound(false);
    }
  }, [timerInfo.isCriticalWarning, hasPlayedSound, isMuted, table.name]);

  // Handle blinking animation
  React.useEffect(() => {
    if (timerInfo.isCriticalWarning && timerInfo.seconds > 0) {
      // Speed up animation as time decreases (max 2000ms, min 200ms)
      // At 180s: ~1.5s per cycle. At 1s: ~200ms per cycle
      const duration = Math.max(
        200,
        Math.min(1500, (timerInfo.seconds / 180) * 1500),
      );

      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(highlightAnim, {
            toValue: 1,
            duration: duration / 2,
            useNativeDriver: false,
          }),
          Animated.timing(highlightAnim, {
            toValue: 0,
            duration: duration / 2,
            useNativeDriver: false,
          }),
        ]),
      );

      loop.start();
      animLoopRef.current = loop;
    } else {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
        animLoopRef.current = null;
      }
      highlightAnim.setValue(0);
    }

    return () => {
      if (animLoopRef.current) {
        animLoopRef.current.stop();
      }
    };
  }, [timerInfo.isCriticalWarning, timerInfo.seconds, highlightAnim]);

  const animatedBorderColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 69, 58, 0.2)', 'rgba(255, 69, 58, 1)'], // Reddish glow
  });

  const animatedBackgroundColor = highlightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255, 255, 255, 1)', 'rgba(255, 235, 238, 1)'], // Light red bg flash
  });

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

  const AnimatedTouchableOpacity =
    Animated.createAnimatedComponent(TouchableOpacity);

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.card,
        isOccupied && styles.cardOccupied,
        timerInfo.isCriticalWarning && {
          borderColor: animatedBorderColor,
          backgroundColor: animatedBackgroundColor,
          borderWidth: 2,
        },
      ]}
      activeOpacity={0.85}
      onPress={handlePress}
      onLongPress={() => {
        if (onLongPress) {
          onLongPress(table);
        }
      }}
    >
      {/* Mute Bell Icon for Critical Warnings */}
      {timerInfo.isCriticalWarning && table.sessionId && (
        <TouchableOpacity
          style={styles.muteButton}
          onPress={e => {
            e.stopPropagation();
            toggleMute();
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon
            name={isMuted ? 'volume-mute-outline' : 'notifications'}
            size={20}
            color={isMuted ? '#999' : '#FF3B30'}
          />
        </TouchableOpacity>
      )}

      {/* Safety Check: If table data is corrupt, show error */}
      {!table || !table.name ? (
        <View
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
        >
          <Text style={{ color: 'red', fontWeight: 'bold' }}>Data Error</Text>
          <Text style={{ fontSize: 10 }}>ID: {table?.id || '?'}</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
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
                  style={[
                    styles.actualImage,
                    isPortrait
                      ? {
                          transform: [{ rotate: '90deg' }],
                          width: '177.78%',
                          height: '56.25%',
                          left: '-38.89%',
                          top: '21.88%',
                          position: 'absolute',
                        }
                      : { width: '100%', height: '100%' },
                  ]}
                  resizeMode="cover"
                  onLoad={handleImageLoad}
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
                <Icon
                  name="grid-outline"
                  size={32}
                  color="rgba(255,255,255,0.6)"
                />
              </View>
            )}

            {/* Occupied overlay with countdown timer */}
            {isOccupied && !reservationInfo && (
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

            {/* Reserved badge with time */}
            {reservationInfo && (
              <View style={styles.reservedBadge}>
                <Icon name="calendar" size={12} color="#FF9800" />
                <Text style={styles.reservedText}>
                  Reserved for {reservationInfo.time}
                </Text>
              </View>
            )}

            {/* Available badge */}
            {!isOccupied && !reservationInfo && (
              <View style={styles.availableBadge}>
                <Icon name="checkmark-circle" size={12} color="#4CAF50" />
                <Text style={styles.availableText}>Available</Text>
              </View>
            )}

            {/* Table Name - Center of Image */}
            <View style={styles.tableNameOverlay}>
              <Text style={styles.tableNameText}>
                {table.name || `Table ${table.id}`}
              </Text>
            </View>
          </View>
        </View>
      )}
    </AnimatedTouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '46%',
    aspectRatio: 1.5,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
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
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 140, 66, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  overlayWarning: {
    backgroundColor: 'rgba(255, 87, 34, 0.95)',
  },
  overlayExpired: {
    backgroundColor: 'rgba(244, 67, 54, 0.95)',
  },
  overlayPulse: {
    position: 'absolute',
    left: 6,
    width: 5,
    height: 5,
    borderRadius: 2.5,
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
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  availableBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  availableText: {
    fontSize: 9,
    color: '#4CAF50',
    fontWeight: '600',
  },
  reservedBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: '90%',
  },
  reservedText: {
    fontSize: 9,
    color: '#FF9800',
    fontWeight: '600',
  },

  // Table Name Overlay - Center
  tableNameOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    paddingHorizontal: 8,
  },
  muteButton: {
    position: 'absolute',
    top: 6,
    left: 6,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});
