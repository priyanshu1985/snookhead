import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { createAdvanceReservation, calculateEstimatedCost, lookupWallet } from '../../services/reservationService';

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
  const [loadingCost, setLoadingCost] = useState(true);
  const [costEstimate, setCostEstimate] = useState(null);
  const [bookingMode, setBookingMode] = useState('advance');
  const [paymentSelection, setPaymentSelection] = useState('now');
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reservationSuccessData, setReservationSuccessData] = useState(null);
  const [conflictData, setConflictData] = useState(null);

  // Wallet State
  const [walletQuery, setWalletQuery] = useState('');
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletChecked, setWalletChecked] = useState(false);
  const [walletInfo, setWalletInfo] = useState(null);

  useEffect(() => {
    const getEstimate = async () => {
      try {
        setLoadingCost(true);
        // Ensure consistent ID mapping for estimation
        const gameId = bookingDetails.game_id || bookingDetails.gameid;
        const tableId = bookingDetails.table_id || bookingDetails.tableid;
        
        const estimate = await calculateEstimatedCost({
          ...bookingDetails,
          game_id: gameId,
          table_id: tableId,
          booking_type: bookingDetails.booking_type || 'timer',
          duration_minutes: bookingDetails.duration_minutes || 60,
        });
        
        setCostEstimate(estimate);
        
        // Use estimate total if available, otherwise default to "0" or manual entry
        const total = estimate?.totalCost || 0;
        if (paymentSelection === 'now') {
          setAmount(total.toString());
        } else if (paymentSelection === 'half') {
          setAmount((total / 2).toString());
        } else {
          setAmount('0');
        }
      } catch (error) {
        console.error('Error getting cost estimate:', error);
        Alert.alert('Error', 'Failed to calculate booking cost');
      } finally {
        setLoadingCost(false);
      }
    };

    getEstimate();
  }, [bookingDetails, paymentSelection]);

  // Handle scanned customer from ScannerScreen
  useEffect(() => {
    if (route.params?.scannedCustomer) {
      const { scannedCustomer } = route.params;
      setWalletQuery(scannedCustomer.phone || scannedCustomer.id);
      setWalletInfo({
        customerId: scannedCustomer.id,
        customerName: scannedCustomer.name,
        phone: scannedCustomer.phone,
        balance: scannedCustomer.wallet?.balance || 0
      });
      setWalletChecked(true);
      setPaymentMode(PAYMENT_MODES.WALLET);
    }
  }, [route.params?.scannedCustomer]);

  const handleWalletLookup = async () => {
    if (!walletQuery.trim()) return;
    setWalletLoading(true);
    try {
      const result = await lookupWallet(walletQuery);
      setWalletChecked(true);
      if (result.success) {
        setWalletInfo(result.wallet);
      } else {
        setWalletInfo(null);
      }
    } catch (error) {
      console.error('Wallet lookup error:', error);
    } finally {
      setWalletLoading(false);
    }
  };

  const handleForceStart = () => {
    setShowConflictModal(false);
    handleConfirmBooking(true);
  };

  const handleConfirmBooking = async (acknowledgeConflicts = false) => {
    // Validation
    const isPaying = paymentSelection === 'now' || paymentSelection === 'half';
    if (isPaying && !paymentMode) {
      Alert.alert('Error', 'Please select a payment mode');
      return;
    }

    if (isPaying && (!amount || parseFloat(amount) <= 0)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setProcessing(true);

    try {
      // Create reservation with payment info
      const reservationData = {
        ...bookingDetails,
        payment_status: paymentSelection === 'later' ? 'pending' : (paymentSelection === 'half' ? 'partial' : 'paid'),
        advance_payment: paymentSelection === 'later' ? 0 : parseFloat(amount),
        acknowledge_conflicts: acknowledgeConflicts,
        food_orders: bookingDetails.food_orders || [],
        food_instructions: bookingDetails.food_instructions || null,
      };

      // Construction of payment data for service layer
      const paymentData = isPaying ? {
        paymentMode: paymentMode,
        payNow: true,
        amount: parseFloat(amount),
        customerId: walletInfo?.customerId || walletQuery, // Uses query if info not fetched yet
      } : null;

      const result = await createAdvanceReservation(
        reservationData,
        paymentData,
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
        setReservationSuccessData({
          ...result.reservation,
          paymentMode: paymentMode,
          paymentAmount: amount,
          estimate: costEstimate,
          selection: paymentSelection
        });
        setShowSuccessModal(true);
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

  const renderSummary = () => {
    if (loadingCost) {
      return (
        <View style={[styles.summaryCard, { alignItems: 'center', padding: 30 }]}>
          <ActivityIndicator size="small" color="#FF8C42" />
          <Text style={{ marginTop: 10, color: '#666' }}>Calculating charges...</Text>
        </View>
      );
    }

    if (!costEstimate) return null;

    return (
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

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date:</Text>
          <Text style={styles.summaryValue}>{bookingDetails.reservation_date}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time:</Text>
          <Text style={styles.summaryValue}>{bookingDetails.start_time}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Booking Type:</Text>
          <Text style={styles.summaryValue}>
            {bookingDetails.booking_type === 'timer' ? 'Timer' : 
             bookingDetails.booking_type === 'frame' ? 'Frame' : 'Set Time'}
          </Text>
        </View>

        {bookingDetails.booking_type !== 'timer' && (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              {bookingDetails.booking_type === 'frame' ? 'Frames:' : 'Duration:'}
            </Text>
            <Text style={styles.summaryValue}>
              {bookingDetails.booking_type === 'frame' 
                ? `${bookingDetails.frame_count} Frames` 
                : `${bookingDetails.duration_minutes} Mins`}
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Table Charges:</Text>
          <Text style={styles.summaryValue}>₹{costEstimate.tableCost}</Text>
        </View>

        {costEstimate.foodCost > 0 && (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Food Charges:</Text>
              <Text style={styles.summaryValue}>₹{costEstimate.foodCost}</Text>
            </View>
            
            {/* Display individual food items */}
            <View style={styles.foodDetailsList}>
              {bookingDetails.food_orders?.map((item, index) => (
                <View key={index} style={styles.foodDetailItem}>
                  <Text style={styles.foodDetailName}>
                    • {item.qty}x {item.item_name || 'Food Item'}
                    {item.variation_name ? ` (${item.variation_name})` : ''}
                  </Text>
                </View>
              ))}
              {bookingDetails.food_instructions && (
                <Text style={styles.foodInstructionsText}>
                  Note: {bookingDetails.food_instructions}
                </Text>
              )}
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>₹{costEstimate.subtotal}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>GST (5%):</Text>
          <Text style={styles.summaryValue}>₹{costEstimate.taxes}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.summaryRow}>
          <Text style={styles.totalLabel}>
            {paymentSelection === 'half' ? 'Total Advance (50%):' : 'Total Payable:'}
          </Text>
          <Text style={styles.totalValue}>₹{amount}</Text>
        </View>
        
        <Text style={styles.noteText}>* Remaining balance (if any) to be paid at the venue.</Text>
      </View>
    );
  };

  const renderPaymentOptions = () => (
    <View style={styles.paymentCard}>
      <Text style={styles.sectionTitle}>Payment Options</Text>

      {/* Pay Now / Pay Half / Pay Later */}
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
            paymentSelection === 'half' && styles.toggleButtonActive,
          ]}
          onPress={() => setPaymentSelection('half')}
        >
          <Text
            style={[
              styles.toggleText,
              paymentSelection === 'half' && styles.toggleTextActive,
            ]}
          >
            Pay Half
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
      {(paymentSelection === 'now' || paymentSelection === 'half') && (
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
            <Icon
              name="qr-code"
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
            onPress={() => {
              setPaymentMode(PAYMENT_MODES.WALLET);
              if (!walletInfo) {
                navigation.navigate('ScannerScreen', {
                  returnScreen: 'PaymentConfirmScreen',
                  scanMode: 'customer'
                });
              }
            }}
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.walletTitle}>Wallet Payment</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('ScannerScreen', { returnScreen: 'PaymentConfirmScreen', scanMode: 'customer' })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Icon name="qr-code" size={16} color="#FF8C42" />
              <Text style={{ fontSize: 13, color: '#FF8C42', fontWeight: 'bold' }}>Scan Again</Text>
            </TouchableOpacity>
          </View>

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
                walletInfo.balance < parseFloat(amount) &&
                  styles.walletInfoError,
              ]}
            >
              <View style={styles.walletInfoRow}>
                <Icon
                  name="person-circle"
                  size={40}
                  color={
                    walletInfo.balance >= parseFloat(amount)
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
                    walletInfo.balance < parseFloat(amount) &&
                      styles.walletBalanceInsufficient,
                  ]}
                >
                  ₹{walletInfo.balance.toFixed(2)}
                </Text>
              </View>
              {walletInfo.balance < parseFloat(amount) && (
                <View style={styles.insufficientContainer}>
                  <Text style={styles.insufficientText}>
                    Insufficient balance for this payment
                  </Text>
                  <TouchableOpacity 
                    style={styles.topUpButton}
                    onPress={() => navigation.navigate('Wallet')} // Assuming Wallet screen exist
                  >
                    <Text style={styles.topUpButtonText}>Top Up</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {walletChecked && !walletInfo && (
            <View style={styles.walletNotFound}>
              <Icon name="alert-circle" size={24} color="#f44336" />
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
          <Icon name="warning" size={48} color="#FF8C42" />
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

  const renderSuccessModal = () => (
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="slide"
    >
      <View style={styles.modalOverlay}>
        <View style={styles.invoiceModal}>
          <View style={styles.invoiceHeader}>
            <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            <Text style={styles.invoiceTitle}>Booking Confirmed!</Text>
            <Text style={styles.bookingId}>ID: {reservationSuccessData?.id || 'RES-' + Math.floor(Math.random() * 10000)}</Text>
          </View>

          <View style={styles.invoiceContent}>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Table Charges</Text>
              <Text style={styles.invoiceValue}>₹{reservationSuccessData?.estimate?.tableCost}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Food Total</Text>
              <Text style={styles.invoiceValue}>₹{reservationSuccessData?.estimate?.foodCost}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>Subtotal</Text>
              <Text style={styles.invoiceValue}>₹{reservationSuccessData?.estimate?.subtotal}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceLabel}>GST (5%)</Text>
              <Text style={styles.invoiceValue}>₹{reservationSuccessData?.estimate?.taxes}</Text>
            </View>
            <View style={styles.invoiceDivider} />
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceTotalLabel}>Total Payable</Text>
              <Text style={styles.invoiceTotalValue}>₹{reservationSuccessData?.estimate?.totalCost}</Text>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.advancePaidLabel}>Paid Advance ({reservationSuccessData?.paymentMode?.toUpperCase()})</Text>
              <Text style={styles.advancePaidValue}>- ₹{reservationSuccessData?.paymentAmount}</Text>
            </View>
            <View style={styles.dueRow}>
              <Text style={styles.dueLabel}>Remaining at Venue</Text>
              <Text style={styles.dueValue}>
                ₹{(parseFloat(reservationSuccessData?.total_amt || reservationSuccessData?.estimate?.totalCost || 0) - parseFloat(reservationSuccessData?.paymentAmount || 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={() => {
              setShowSuccessModal(false);
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs', params: { screen: 'Home' } }],
              });
            }}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderSummary()}
        {renderPaymentOptions()}
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
              <Icon name="checkmark-circle" size={24} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Payment</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      {renderConflictModal()}
      {renderSuccessModal()}
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
  foodDetailsList: {
    paddingLeft: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  foodDetailItem: {
    marginBottom: 4,
  },
  foodDetailName: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  foodInstructionsText: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    fontStyle: 'italic',
    paddingLeft: 10,
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
  noteText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
    textAlign: 'center',
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
  insufficientContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(244, 67, 54, 0.2)',
  },
  insufficientText: {
    fontSize: 12,
    color: '#f44336',
    flex: 1,
    fontStyle: 'italic',
  },
  topUpButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  topUpButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
  invoiceModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  invoiceTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
  },
  bookingId: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  invoiceContent: {
    backgroundColor: '#fcfcfc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 24,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  invoiceLabel: {
    fontSize: 14,
    color: '#666',
  },
  invoiceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  invoiceDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 12,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 1,
  },
  invoiceTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  invoiceTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  advancePaidLabel: {
    fontSize: 13,
    color: '#4CAF50',
    fontStyle: 'italic',
  },
  advancePaidValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  dueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  dueLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  dueValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f44336',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
