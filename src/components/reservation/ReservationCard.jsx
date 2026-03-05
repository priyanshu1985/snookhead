import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const ReservationCard = ({
  reservation,
  onEdit,
  onCancel,
  onConvertToActive,
  onMarkNoShow,
}) => {
  const [timeStatus, setTimeStatus] = useState('upcoming');
  const [minutesUntilStart, setMinutesUntilStart] = useState(null);

  useEffect(() => {
    calculateTimeStatus();
    const interval = setInterval(calculateTimeStatus, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [reservation.status, reservation]);

  const calculateTimeStatus = () => {
    if (reservation.status === 'active') {
      setTimeStatus('ongoing');
      return;
    }

    const now = new Date();
    const startTime = new Date(
      reservation.fromTime ||
        reservation.fromtime ||
        reservation.reservationtime ||
        reservation.reservation_time,
    );

    const minutesUntil = Math.floor((startTime - now) / (1000 * 60));
    setMinutesUntilStart(minutesUntil);

    if (minutesUntil < -15) {
      setTimeStatus('overdue');
    } else if (minutesUntil < 0) {
      setTimeStatus('grace-period');
    } else if (minutesUntil <= 30) {
      setTimeStatus('starting-soon');
    } else {
      setTimeStatus('upcoming');
    }
  };

  const getStatusConfig = () => {
    switch (timeStatus) {
      case 'ongoing':
        return {
          color: '#2196F3',
          backgroundColor: '#E3F2FD',
          borderColor: '#2196F3',
          label: 'Ongoing',
          icon: 'play-circle-outline',
          pulse: true,
        };
      case 'starting-soon':
        return {
          color: '#FF8C42',
          backgroundColor: '#FFF3E0',
          borderColor: '#FF8C42',
          label: 'Starting Soon',
          icon: 'time-outline',
          pulse: true,
        };
      case 'overdue':
        return {
          color: '#F44336',
          backgroundColor: '#FFEBEE',
          borderColor: '#F44336',
          label: 'Overdue',
          icon: 'alert-circle-outline',
          pulse: false,
        };
      case 'grace-period':
        return {
          color: '#FF6B6B',
          backgroundColor: '#FFE5E5',
          borderColor: '#FF6B6B',
          label: 'Grace Period',
          icon: 'timer-outline',
          pulse: true,
        };
      default:
        return {
          color: '#4CAF50',
          backgroundColor: '#E8F5E9',
          borderColor: '#4CAF50',
          label: 'Upcoming',
          icon: 'calendar-outline',
          pulse: false,
        };
    }
  };

  const statusConfig = getStatusConfig();

  const formatTime = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = dateString => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const handleConvertToActive = () => {
    Alert.alert(
      'Start Session',
      `Convert this reservation to an active session for ${
        reservation.TableAsset?.name || 'this table'
      }?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => onConvertToActive(reservation),
          style: 'default',
        },
      ],
    );
  };

  const handleCancel = () => {
    console.log('Cancel button pressed for reservation:', reservation?.id);

    if (!onCancel) {
      console.error('onCancel callback is not defined');
      Alert.alert('Error', 'Cancel function is not available');
      return;
    }

    if (!reservation?.id) {
      console.error('Reservation ID is missing:', reservation);
      Alert.alert('Error', 'Invalid reservation ID');
      return;
    }

    Alert.alert(
      'Cancel Reservation',
      'Are you sure you want to cancel this reservation?',
      [
        {
          text: 'No',
          style: 'cancel',
          onPress: () => console.log('Cancel dialog dismissed'),
        },
        {
          text: 'Yes, Cancel',
          onPress: () => {
            console.log('Cancelling reservation:', reservation.id);
            onCancel(reservation.id);
          },
          style: 'destructive',
        },
      ],
    );
  };

  const handleMarkNoShow = () => {
    Alert.alert(
      'Mark as No-Show',
      'Customer did not arrive. Mark this reservation as no-show?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark No-Show',
          onPress: () => onMarkNoShow(reservation.id),
          style: 'destructive',
        },
      ],
    );
  };

  const startTime =
    reservation.fromTime || reservation.fromtime || reservation.reservationtime;
  const endTime = reservation.toTime || reservation.totime;
  const duration =
    reservation.durationminutes || reservation.duration_minutes || 60;

  return (
    <View
      style={[
        styles.card,
        {
          borderLeftColor: statusConfig.borderColor,
          borderLeftWidth: 4,
          backgroundColor: statusConfig.backgroundColor,
        },
        statusConfig.pulse && styles.pulseAnimation,
      ]}
    >
      {/* Status Badge */}
      <View
        style={[styles.statusBadge, { backgroundColor: statusConfig.color }]}
      >
        <Icon name={statusConfig.icon} size={14} color="#FFF" />
        <Text style={styles.statusText}>{statusConfig.label}</Text>
      </View>

      {/* Time Until Start (for starting soon) */}
      {timeStatus === 'starting-soon' && minutesUntilStart !== null && (
        <View style={styles.timeAlert}>
          <Icon name="time-outline" size={16} color="#FF8C42" />
          <Text style={styles.timeAlertText}>
            Starting in {minutesUntilStart} minute
            {minutesUntilStart !== 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Overdue Info */}
      {timeStatus === 'overdue' && (
        <View style={[styles.timeAlert, { backgroundColor: '#FFEBEE' }]}>
          <Icon name="alert-circle-outline" size={16} color="#F44336" />
          <Text style={[styles.timeAlertText, { color: '#F44336' }]}>
            Started {Math.abs(minutesUntilStart)} minutes ago
          </Text>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Customer Info */}
        <View style={styles.row}>
          <Icon name="person-outline" size={20} color="#333" />
          <View style={styles.infoColumn}>
            <Text style={styles.customerName}>
              {reservation.customerName ||
                reservation.customer_name ||
                'Unknown Customer'}
            </Text>
            {(reservation.customerPhone || reservation.customer_phone) && (
              <Text style={styles.customerPhone}>
                {reservation.customerPhone || reservation.customer_phone}
              </Text>
            )}
          </View>
        </View>

        {/* Table & Game Info */}
        <View style={styles.row}>
          <Icon name="game-controller-outline" size={20} color="#333" />
          <View style={styles.infoColumn}>
            <Text style={styles.infoText}>
              {reservation.TableAsset?.name ||
                `Table #${reservation.tableId || reservation.tableid}`}
            </Text>
            {reservation.TableAsset?.Game?.name && (
              <Text style={styles.subInfoText}>
                {reservation.TableAsset.Game.name}
              </Text>
            )}
          </View>
        </View>

        {/* Date & Time */}
        <View style={styles.row}>
          <Icon name="calendar-outline" size={20} color="#333" />
          <View style={styles.infoColumn}>
            <Text style={styles.infoText}>
              {formatDate(startTime)} • {formatTime(startTime)}
            </Text>
            <Text style={styles.subInfoText}>Duration: {duration} minutes</Text>
          </View>
        </View>

        {/* Booking Details */}
        {reservation.booking_type && (
          <View style={styles.row}>
            <Icon name="time-outline" size={20} color="#333" />
            <Text style={styles.infoText}>
              {reservation.booking_type === 'timer'
                ? `Timer Mode (${duration} min)`
                : reservation.booking_type === 'frame'
                ? `Frame Mode (${reservation.frame_count || 1} frame${
                    (reservation.frame_count || 1) > 1 ? 's' : ''
                  })`
                : 'Set Mode'}
            </Text>
          </View>
        )}

        {/* Notes */}
        {reservation.notes && (
          <View style={styles.notesContainer}>
            <Icon name="document-text-outline" size={16} color="#666" />
            <Text style={styles.notesText}>{reservation.notes}</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        {/* Edit */}
        {timeStatus === 'upcoming' && reservation.status !== 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => onEdit(reservation)}
          >
            <Icon name="create-outline" size={18} color="#4CAF50" />
            <Text style={styles.secondaryButtonText}>Edit</Text>
          </TouchableOpacity>
        )}

        {/* Cancel */}
        {reservation.status !== 'active' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleCancel}
          >
            <Icon name="close-circle-outline" size={18} color="#F44336" />
            <Text style={styles.dangerButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        {/* Mark No-Show (for overdue) */}
        {timeStatus === 'overdue' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.warningButton]}
            onPress={handleMarkNoShow}
          >
            <Icon name="person-remove-outline" size={18} color="#FF9800" />
            <Text style={styles.warningButtonText}>No-Show</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pulseAnimation: {
    // React Native doesn't support CSS animations directly
    // This would require Animated API for real pulse effect
    elevation: 5,
    shadowOpacity: 0.2,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  timeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  timeAlertText: {
    color: '#FF8C42',
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    marginTop: 8,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoColumn: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  subInfoText: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    flex: 1,
    minWidth: 120,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  dangerButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  warningButton: {
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  warningButtonText: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default ReservationCard;
