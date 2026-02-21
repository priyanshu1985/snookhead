import React, { useState } from 'react';
import { QrCode, AlertCircle, AlertTriangle, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAdvanceReservation } from '../../services/reservationService';

const PAYMENT_MODES = {
  CASH: 'cash',
  UPI: 'upi',
  WALLET: 'wallet',
};

export default function PaymentConfirmScreen({ navigation, route }) {
  const { bookingDetails, gameName, tableName } = route.params;

  // Payment State
  const [paymentMode, setPaymentMode] = useState(null);
  const [amount, setAmount] = useState('');

  // UI State
  const [processing, setProcessing] = useState(false);

  const handleConfirmBooking = async (acknowledgeConflicts = false) => {
    // Validation
    if (!paymentMode) {
      Alert.alert('Error', 'Please select a payment mode');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      // Create reservation with payment info
      const reservationData = {
        ...bookingDetails,
        payment_status: paymentMode,
        advance_payment: parseFloat(amount),
        acknowledge_conflicts: acknowledgeConflicts,
      };

      const result = await createAdvanceReservation(
        reservationData,
        null,
        acknowledgeConflicts,
      );

      if (result.needsConfirmation) {
        // Show conflict confirmation dialog
        Alert.alert(
          'Booking Conflict',
          result.message ||
            'There is a potential time conflict. Do you want to proceed anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed Anyway',
              onPress: () => handleConfirmBooking(true), // Retry with acknowledgment
            },
          ],
        );
        return;
      }

      if (result.success) {
        Alert.alert(
          'Reservation Created',
          `Your reservation has been created successfully!\n\nPayment: ₹${amount} (${paymentMode.toUpperCase()})`,
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }],
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to create reservation');
      }
    } catch (error) {
      console.error('Booking error:', error);
      console.log(
        'Full error object:',
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );

      // Check if it's a BOOKING_WARNING that slipped through
      if (
        error.message === 'BOOKING_WARNING' ||
        error.message?.includes('BOOKING_WARNING') ||
        error.status === 409
      ) {
        // Show conflict confirmation dialog
        Alert.alert(
          'Booking Conflict',
          error.data?.message ||
            'There is a potential time conflict with this reservation. Do you want to proceed anyway?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Proceed Anyway',
              onPress: () => handleConfirmBooking(true), // Retry with acknowledgment
            },
          ],
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to create booking');
      }
    } finally {
      setProcessing(false);
    }
  };

  const renderSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Booking Summary</Text>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Customer:</Text>
        <Text style={styles.summaryValue}>{bookingDetails.customer_name}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Phone:</Text>
        <Text style={styles.summaryValue}>{bookingDetails.customer_phone}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Game:</Text>
        <Text style={styles.summaryValue}>{gameName}</Text>
      </View>

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Table:</Text>
        <Text style={styles.summaryValue}>{tableName}</Text>
      </View>

      {bookingMode === 'advance' && (
        <>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.reservation_date}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{bookingDetails.start_time}</Text>
          </View>
        </>
      )}

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Mode:</Text>
        <Text style={styles.summaryValue}>
          {costEstimate.breakdown.booking_type === 'timer' &&
            `Duration: ${costEstimate.breakdown.duration}`}
          {costEstimate.breakdown.booking_type === 'frame' &&
            `Frames: ${costEstimate.breakdown.frames}`}
          {costEstimate.breakdown.booking_type === 'set' && 'Stopwatch'}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <Text style={styles.summaryLabel}>Table Charges:</Text>
        <Text style={styles.summaryValue}>₹{costEstimate.tableCost}</Text>
      </View>

      {costEstimate.foodCost > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Food Charges:</Text>
          <Text style={styles.summaryValue}>₹{costEstimate.foodCost}</Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.summaryRow}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalValue}>₹{costEstimate.totalCost}</Text>
      </View>
    </View>
  );

  const renderPaymentOptions = () => (
    <View style={styles.paymentCard}>
      <Text style={styles.sectionTitle}>Payment Options</Text>

      {/* Pay Now / Pay Later */}
      <View style={styles.paymentToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            paymentSelection === 'now' && styles.toggleButtonActive,
          ]}
          onPress={() => setPaymentSelection('now')}
        >
          <Text
            style={[
              styles.toggleText,
              paymentSelection === 'now' && styles.toggleTextActive,
            ]}
          >
            Pay Now
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleButton,
            paymentSelection === 'later' && styles.toggleButtonActive,
          ]}
          onPress={() => setPaymentSelection('later')}
        >
          <Text
            style={[
              styles.toggleText,
              paymentSelection === 'later' && styles.toggleTextActive,
            ]}
          >
            Pay Later
          </Text>
        </TouchableOpacity>
      </View>

      {/* Payment Mode Selection */}
      {paymentSelection === 'now' && (
        <View style={styles.paymentModes}>
          <TouchableOpacity
            style={[
              styles.modeCard,
              paymentMode === PAYMENT_MODES.CASH && styles.modeCardActive,
            ]}
            onPress={() => setPaymentMode(PAYMENT_MODES.CASH)}
          >
            <Icon
              name="cash"
              size={24}
              color={paymentMode === PAYMENT_MODES.CASH ? '#FF8C42' : '#666'}
            />
            <Text
              style={[
                styles.modeText,
                paymentMode === PAYMENT_MODES.CASH && styles.modeTextActive,
              ]}
            >
              Cash
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              paymentMode === PAYMENT_MODES.UPI && styles.modeCardActive,
            ]}
            onPress={() => setPaymentMode(PAYMENT_MODES.UPI)}
          >
            <QrCode
              size={24}
              color={paymentMode === PAYMENT_MODES.UPI ? '#FF8C42' : '#666'}
            />
            <Text
              style={[
                styles.modeText,
                paymentMode === PAYMENT_MODES.UPI && styles.modeTextActive,
              ]}
            >
              UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modeCard,
              paymentMode === PAYMENT_MODES.WALLET && styles.modeCardActive,
            ]}
            onPress={() => setPaymentMode(PAYMENT_MODES.WALLET)}
          >
            <Icon
              name="wallet"
              size={24}
              color={paymentMode === PAYMENT_MODES.WALLET ? '#FF8C42' : '#666'}
            />
            <Text
              style={[
                styles.modeText,
                paymentMode === PAYMENT_MODES.WALLET && styles.modeTextActive,
              ]}
            >
              Wallet
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Wallet Lookup Section */}
      {paymentSelection === 'now' && paymentMode === PAYMENT_MODES.WALLET && (
        <View style={styles.walletSection}>
          <Text style={styles.walletTitle}>Wallet Payment</Text>

          <View style={styles.walletLookupRow}>
            <TextInput
              style={styles.walletInput}
              placeholder="Member ID or Phone Number"
              value={walletQuery}
              onChangeText={setWalletQuery}
              keyboardType="phone-pad"
            />
            <TouchableOpacity
              style={styles.checkButton}
              onPress={handleWalletLookup}
              disabled={walletLoading}
            >
              {walletLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.checkButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>

          {walletChecked && walletInfo && (
            <View
              style={[
                styles.walletInfo,
                walletInfo.balance < costEstimate.totalCost &&
                  styles.walletInfoError,
              ]}
            >
              <View style={styles.walletInfoRow}>
                <Icon
                  name="person-circle"
                  size={40}
                  color={
                    walletInfo.balance >= costEstimate.totalCost
                      ? '#4CAF50'
                      : '#f44336'
                  }
                />
                <View style={styles.walletInfoDetails}>
                  <Text style={styles.walletName}>
                    {walletInfo.customerName}
                  </Text>
                  <Text style={styles.walletPhone}>{walletInfo.phone}</Text>
                </View>
              </View>
              <View style={styles.walletBalanceSection}>
                <Text style={styles.walletBalanceLabel}>Balance:</Text>
                <Text
                  style={[
                    styles.walletBalance,
                    walletInfo.balance < costEstimate.totalCost &&
                      styles.walletBalanceInsufficient,
                  ]}
                >
                  ₹{walletInfo.balance.toFixed(2)}
                </Text>
              </View>
              {walletInfo.balance < costEstimate.totalCost && (
                <Text style={styles.insufficientText}>
                  Insufficient balance for this booking
                </Text>
              )}
            </View>
          )}

          {walletChecked && !walletInfo && (
            <View style={styles.walletNotFound}>
              <AlertCircle size={24} color="#f44336" />
              <Text style={styles.walletNotFoundText}>Wallet not found</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderConflictModal = () => (
    <Modal
      visible={showConflictModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowConflictModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.conflictModal}>
          <AlertTriangle size={48} color="#FF8C42" />
          <Text style={styles.conflictTitle}>Table Reserved</Text>
          <Text style={styles.conflictMessage}>
            {conflictData?.error ||
              'This table has a reservation at this time.'}
          </Text>
          <Text style={styles.conflictQuestion}>
            Do you want to force start the session anyway?
          </Text>

          <View style={styles.conflictButtons}>
            <TouchableOpacity
              style={styles.conflictCancelButton}
              onPress={() => setShowConflictModal(false)}
            >
              <Text style={styles.conflictCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.conflictForceButton}
              onPress={handleForceStart}
            >
              <Text style={styles.conflictForceText}>Force Start</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Booking Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>Booking Summary</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Customer:</Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.customer_name}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Phone:</Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.customer_phone}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Game:</Text>
            <Text style={styles.summaryValue}>{gameName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Table:</Text>
            <Text style={styles.summaryValue}>{tableName}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Date:</Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.reservation_date}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Time:</Text>
            <Text style={styles.summaryValue}>{bookingDetails.start_time}</Text>
          </View>
        </View>

        {/* Payment Options */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>

          <View style={styles.paymentModes}>
            <TouchableOpacity
              style={[
                styles.modeCard,
                paymentMode === PAYMENT_MODES.CASH && styles.modeCardActive,
              ]}
              onPress={() => setPaymentMode(PAYMENT_MODES.CASH)}
            >
              <Icon
                name="cash"
                size={32}
                color={paymentMode === PAYMENT_MODES.CASH ? '#FF8C42' : '#666'}
              />
              <Text
                style={[
                  styles.modeText,
                  paymentMode === PAYMENT_MODES.CASH && styles.modeTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                paymentMode === PAYMENT_MODES.UPI && styles.modeCardActive,
              ]}
              onPress={() => setPaymentMode(PAYMENT_MODES.UPI)}
            >
              <QrCode
                size={32}
                color={paymentMode === PAYMENT_MODES.UPI ? '#FF8C42' : '#666'}
              />
              <Text
                style={[
                  styles.modeText,
                  paymentMode === PAYMENT_MODES.UPI && styles.modeTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeCard,
                paymentMode === PAYMENT_MODES.WALLET && styles.modeCardActive,
              ]}
              onPress={() => setPaymentMode(PAYMENT_MODES.WALLET)}
            >
              <Icon
                name="wallet"
                size={32}
                color={
                  paymentMode === PAYMENT_MODES.WALLET ? '#FF8C42' : '#666'
                }
              />
              <Text
                style={[
                  styles.modeText,
                  paymentMode === PAYMENT_MODES.WALLET && styles.modeTextActive,
                ]}
              >
                Wallet
              </Text>
            </TouchableOpacity>
          </View>

          {/* Amount Input */}
          <View style={styles.amountSection}>
            <Text style={styles.inputLabel}>Advance Amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.rupeeSymbol}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            processing && styles.confirmButtonDisabled,
          ]}
          onPress={() => handleConfirmBooking(false)}
          disabled={processing}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <CheckCircle2 size={24} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  paymentCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  paymentToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  toggleButtonActive: {
    backgroundColor: '#FF8C42',
  },
  toggleText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  paymentModes: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  modeCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  modeCardActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF5EC',
  },
  modeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  modeTextActive: {
    color: '#FF8C42',
    fontWeight: 'bold',
  },
  amountSection: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  rupeeSymbol: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    padding: 0,
  },
  footer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  walletTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  walletLookupRow: {
    flexDirection: 'row',
    gap: 8,
  },
  walletInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  checkButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  walletInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  walletInfoError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#f44336',
  },
  walletInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletInfoDetails: {
    marginLeft: 12,
    flex: 1,
  },
  walletName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  walletPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  walletBalanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  walletBalanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  walletBalance: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  walletBalanceInsufficient: {
    color: '#f44336',
  },
  insufficientText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 8,
    fontStyle: 'italic',
  },
  walletNotFound: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
  },
  walletNotFoundText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: '#ccc',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  conflictModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  conflictTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 12,
  },
  conflictMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  conflictQuestion: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: '500',
  },
  conflictButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  conflictCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  conflictCancelText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  conflictForceButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  conflictForceText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
});
