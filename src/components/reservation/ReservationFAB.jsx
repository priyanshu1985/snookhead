import React from 'react';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

/**
 * Floating Action Button for Quick Reservation
 * Add this to any screen where you want users to quickly create reservations
 * 
 * Usage Example in HomeScreen:
 * import ReservationFAB from '../components/ReservationFAB';
 * 
 * // Inside the return/render:
 * <ReservationFAB />
 */
export default function ReservationFAB({ position = 'bottomRight', showLabel = false }) {
  const navigation = useNavigation();

  const positionStyles = {
    bottomRight: { bottom: 20, right: 20 },
    bottomLeft: { bottom: 20, left: 20 },
    topRight: { top: 80, right: 20 },
  };

  return (
    <View style={[styles.container, positionStyles[position]]}>
      {/* Advance Reservation Button */}
      <TouchableOpacity
        style={[styles.fab, styles.fabSecondary]}
        onPress={() => navigation.navigate('NewReservation', { bookingMode: 'advance' })}
      >
        <Icon name="calendar-outline" size={24} color="#fff" />
        {showLabel && <Text style={styles.fabLabel}>Reservation</Text>}
      </TouchableOpacity>

      {/* Immediate Booking Button */}
      <TouchableOpacity
        style={[styles.fab, styles.fabPrimary]}
        onPress={() => navigation.navigate('NewReservation', { bookingMode: 'immediate' })}
      >
        <Icon name="play-circle-outline" size={24} color="#fff" />
        {showLabel && <Text style={styles.fabLabel}>Book Now</Text>}
      </TouchableOpacity>
    </View>
  );
}

/**
 * Simple Button Version (for toolbars/headers)
 * 
 * Usage:
 * import { ReservationButton } from '../components/ReservationFAB';
 * <ReservationButton mode="advance" />
 */
export function ReservationButton({ mode = 'advance', compact = false }) {
  const navigation = useNavigation();

  const config = {
    advance: {
      icon: 'calendar-outline',
      label: 'New Reservation',
      color: '#FF8C42',
    },
    immediate: {
      icon: 'play-circle-outline',
      label: 'Book Now',
      color: '#4CAF50',
    },
  };

  const { icon, label, color } = config[mode];

  return (
    <TouchableOpacity
      style={[styles.button, compact && styles.buttonCompact]}
      onPress={() => navigation.navigate('NewReservation', { bookingMode: mode })}
    >
      <Icon name={icon} size={compact ? 20 : 24} color={color} />
      {!compact && <Text style={[styles.buttonText, { color }]}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    gap: 12,
    zIndex: 1000,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPrimary: {
    backgroundColor: '#4CAF50',
  },
  fabSecondary: {
    backgroundColor: '#FF8C42',
  },
  fabLabel: {
    fontSize: 10,
    color: '#fff',
    marginTop: 2,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  buttonCompact: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
