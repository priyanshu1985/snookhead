import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  Modal,
  StatusBar,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Camera } from 'react-native-camera-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../components/Header';
import { API_URL } from '../config';

export default function ScannerScreen({ navigation, route }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Get payment context from navigation params
  const paymentContext = route?.params?.paymentContext;
  const isPaymentMode = !!paymentContext;

  // Check permission on mount and focus
  useFocusEffect(
    React.useCallback(() => {
      checkPermission();
    }, [])
  );

  const checkPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const status = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        setHasPermission(status);
        if (status) {
           // If permission is already granted, we can potentially ready the camera,
           // but we stick to the user pressing "Start Scanning" for control
        }
      } catch (err) {
        console.warn(err);
        setHasPermission(false);
      }
    } else {
      setHasPermission(true);
    }
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission Required',
            message: 'We need camera access to scan QR codes for interactions.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          setHasPermission(true);
          setIsScanning(true); 
        } else if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          Alert.alert(
            'Permission Required',
            'Camera permission was denied permanently. Please enable it in Settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          setHasPermission(false);
        } else {
          setHasPermission(false);
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleStartScanning = () => {
    if (!hasPermission) {
      if (hasPermission === false) {
          // If explicitly known to be false, request again
          requestCameraPermission();
      }
      return;
    }
    setIsScanning(true);
  };

  const handleManualEntry = () => {
    if (manualInput.trim()) {
      handleQRCodeProcessed(manualInput.trim());
    } else {
      Alert.alert('Error', 'Please enter a valid QR code');
    }
  };

  const handleQRCodeProcessed = async qrData => {
    setShowManualEntry(false);
    setManualInput('');
    setIsScanning(false);

    try {
      // Show loading
      Alert.alert('Processing...', 'Validating QR code...');

      // Get auth token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('Error', 'Please login first');
        return;
      }

      // Validate QR code with backend
      const response = await fetch(`${API_URL}/api/wallets/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          qr_data: qrData,
        }),
      });

      const result = await response.json();

      if (response.ok && result.wallet && result.customer) {
        // Check if customer is active
        if (!result.customer.is_active) {
          Alert.alert(
            'Wallet Deactivated',
            'Owner has deactivated your wallet. Please contact the owner to activate your account.',
            [
              {
                text: 'Try Another QR',
                onPress: () => setShowManualEntry(true),
              },
              {
                text: 'Cancel',
                onPress: () => navigation.goBack(),
                style: 'cancel',
              },
            ],
          );
          return;
        }

        // Check if this is a payment request from bill screen
        if (isPaymentMode && paymentContext) {
          const billAmount = parseFloat(paymentContext.amount);
          const walletBalance = parseFloat(result.wallet.balance);

          if (walletBalance < billAmount) {
            Alert.alert(
              'Insufficient Balance',
              `Wallet Balance: ₹${walletBalance.toFixed(
                2,
              )}\nRequired: ₹${billAmount.toFixed(2)}\nShortfall: ₹${(
                billAmount - walletBalance
              ).toFixed(2)}`,
              [
                {
                  text: 'Try Another QR',
                  onPress: () => setShowManualEntry(true),
                },
                {
                  text: 'Cancel',
                  onPress: () => navigation.goBack(),
                  style: 'cancel',
                },
              ],
            );
            return;
          }

          // Process wallet payment
          Alert.alert(
            'Confirm Payment',
            `Deduct ₹${billAmount.toFixed(2)} from ${
              result.customer.name
            }'s wallet?\nWallet Balance: ₹${walletBalance.toFixed(
              2,
            )}\nRemaining: ₹${(walletBalance - billAmount).toFixed(2)}`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm Payment',
                onPress: () => processWalletPayment(result, billAmount),
              },
            ],
          );
        } else {
          // Normal QR scan - show customer/wallet information
          Alert.alert(
            'QR Code Valid!',
            `Customer: ${
              result.customer?.name || 'Unknown'
            }\nWallet Balance: ₹${result.wallet?.balance || 0}\nWallet ID: ${
              result.wallet?.id
            }`,
            [
              { text: 'Scan Another', onPress: () => setShowManualEntry(true) },
              {
                text: 'View Details',
                onPress: () => {
                  navigation.navigate('MemberDetails', {
                    member: result.customer,
                    wallet: result.wallet,
                  });
                },
              },
              {
                text: 'Make Transaction',
                onPress: () => {
                  navigation.navigate('PaymentGateway', {
                    customer: result.customer,
                    wallet: result.wallet,
                  });
                },
              },
            ],
          );
        }
      } else {
        Alert.alert(
          'Invalid QR Code',
          result.error || 'QR code could not be validated',
          [
            { text: 'Try Again', onPress: () => setShowManualEntry(true) },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
      }
    } catch (error) {
      console.error('QR validation error:', error);
      Alert.alert(
        'Connection Error',
        'Failed to validate QR code. Please check your connection.',
        [
          { text: 'Retry', onPress: () => handleQRCodeProcessed(qrData) },
          { text: 'Manual Entry', onPress: () => setShowManualEntry(true) },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  // Process wallet payment
  const processWalletPayment = async (scanResult, billAmount) => {
    try {
      const token = await AsyncStorage.getItem('authToken');

      // First deduct money from wallet
      const deductResponse = await fetch(
        `${API_URL}/api/wallets/deduct-money`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            customer_id: scanResult.customer.id,
            amount: billAmount,
          }),
        },
      );

      const deductResult = await deductResponse.json();

      if (!deductResponse.ok) {
        throw new Error(deductResult.error || 'Failed to deduct from wallet');
      }

      // Then mark the bill as paid
      const billPayResponse = await fetch(
        `${API_URL}/api/bills/${
          paymentContext.bill.originalBill?.id || paymentContext.bill.id
        }/pay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            payment_method: 'wallet',
          }),
        },
      );

      const billPayResult = await billPayResponse.json();

      if (billPayResponse.ok) {
        Alert.alert(
          'Payment Successful!',
          `₹${billAmount.toFixed(2)} has been deducted from ${
            scanResult.customer.name
          }'s wallet.\\nBill #${
            paymentContext.bill.billNumber || paymentContext.bill.id
          } has been paid successfully.\\nNew wallet balance: ₹${
            deductResult.new_balance ||
            (scanResult.wallet.balance - billAmount).toFixed(2)
          }`,
          [
            {
              text: 'Done',
              onPress: () => {
                // Navigate back to bill screen and call payment complete
                navigation.goBack();
                if (paymentContext.onPaymentComplete) {
                  paymentContext.onPaymentComplete();
                }
              },
            },
          ],
        );
      } else {
        // If bill payment fails, we should refund the wallet (compensation transaction)
        Alert.alert(
          'Bill Payment Failed',
          'Wallet was deducted but bill payment failed. Please contact support.',
          [{ text: 'OK' }],
        );
      }
    } catch (error) {
      console.error('Wallet payment error:', error);
      Alert.alert(
        'Payment Failed',
        error.message || 'Failed to process wallet payment. Please try again.',
        [
          {
            text: 'Retry',
            onPress: () => processWalletPayment(scanResult, billAmount),
          },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} />
        <View style={styles.centerContainer}>
          <Icon name="camera" size={80} color="#666" />
          <Text style={styles.messageText}>
            Requesting camera permission...
          </Text>
        </View>
      </View>
    );
  }

  if (isScanning) {
    return (
      <View style={styles.scanningContainer}>
        <StatusBar backgroundColor="#000" barStyle="light-content" />
        
        <Camera
          scanBarcode={true}
          onReadCode={(event) => handleQRCodeProcessed(event.nativeEvent.codeStringValue)}
          showFrame={true}
          laserColor='#FF8C42'
          frameColor='white'
          style={StyleSheet.absoluteFillObject}
        />

        <View style={styles.scanningHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setIsScanning(false)}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.scanningTitle}>Scanning QR Code</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.scanningControls}>
            <Text style={{color: 'white', marginBottom: 10, textAlign: 'center'}}>
              Camera not showing?
            </Text>
            <TouchableOpacity
              style={styles.manualEntryButton}
              onPress={() => {
                setIsScanning(false);
                setShowManualEntry(true);
              }}
            >
              <Icon name="create-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Manual Entry</Text>
            </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />

      <View style={styles.content}>
        {/* Scanner Icon */}
        <View style={styles.iconContainer}>
          <Icon name="qr-code" size={100} color="#FF8C42" />
        </View>

        {/* Title and Description */}
        <Text style={styles.title}>
          {isPaymentMode ? 'Wallet Payment' : 'QR Code Scanner'}
        </Text>
        <Text style={styles.description}>
          {isPaymentMode
            ? `Scan customer's wallet QR code to deduct ₹${
                paymentContext?.amount || '0'
              } for bill payment`
            : 'Scan QR codes to process payments, access customer wallets, or validate tokens'}
        </Text>

        {/* Payment Context Info */}
        {isPaymentMode && paymentContext && (
          <View style={styles.paymentInfoCard}>
            <Text style={styles.paymentInfoTitle}>Payment Details</Text>
            <Text style={styles.paymentInfoText}>
              Bill #: {paymentContext.bill.billNumber || paymentContext.bill.id}
            </Text>
            <Text style={styles.paymentInfoAmount}>
              Amount: ₹{paymentContext.amount}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[
            styles.scanButton,
            hasPermission === false && styles.disabledButton,
          ]}
          onPress={handleStartScanning}
          disabled={hasPermission === false}
        >
          <Icon name="camera" size={24} color="#fff" />
          <Text style={styles.scanButtonText}>
            {hasPermission === false
              ? 'Camera Access Required'
              : 'Start Scanning'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.manualButton}
          onPress={() => setShowManualEntry(true)}
        >
          <Icon name="create" size={24} color="#FF8C42" />
          <Text style={styles.manualButtonText}>Manual Entry</Text>
        </TouchableOpacity>

        {/* Cancel Payment Button (only in payment mode) */}
        {isPaymentMode && (
          <TouchableOpacity
            style={styles.cancelPaymentButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#666" />
            <Text style={styles.cancelPaymentButtonText}>Back to Bill</Text>
          </TouchableOpacity>
        )}

        {hasPermission === false && (
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestCameraPermission}
          >
            <Icon name="settings" size={20} color="#FF8C42" />
            <Text style={styles.permissionButtonText}>
              Grant Camera Permission
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Manual Entry Modal - Replaced with Absolute View */}
      {showManualEntry && (
        <View
          style={[
            styles.modalOverlay,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manual QR Entry</Text>
              <TouchableOpacity
                onPress={() => setShowManualEntry(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter the QR code data manually if scanning is not available
            </Text>

            <TouchableOpacity
              style={styles.testDataButton}
              onPress={() => setManualInput(generateTestQRData())}
            >
              <Icon name="clipboard" size={16} color="#1a237e" />
              <Text style={styles.testDataButtonText}>Use Test QR Data</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.textInput}
              placeholder="Enter QR code data..."
              value={manualInput}
              onChangeText={setManualInput}
              multiline
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => {
                  setShowManualEntry(false);
                  setManualInput('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.processButton}
                onPress={handleManualEntry}
              >
                <Text style={styles.processButtonText}>Process</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  messageText: {
    fontSize: 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  iconContainer: {
    backgroundColor: '#FFF8F5',
    padding: 30,
    borderRadius: 50,
    marginBottom: 30,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: '#FFE0CC',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    minWidth: 200,
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    shadowColor: '#ccc',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#FF8C42',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    minWidth: 200,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  manualButtonText: {
    color: '#FF8C42',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    borderWidth: 1,
    borderColor: '#FFE0CC',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 10,
  },
  permissionButtonText: {
    color: '#FF8C42',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Scanning screen styles
  scanningContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  scanningHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  scanningTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  placeholder: {
    width: 40,
  },
  scanningContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  scanningArea: {
    alignItems: 'center',
    marginBottom: 80,
  },
  scanningText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  scanningIndicator: {
    marginTop: 20,
  },
  scanningControls: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
  },
  manualEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 5,
  },
  modalDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    textAlignVertical: 'top',
    marginBottom: 20,
    minHeight: 100,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelModalButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  cancelModalButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  processButton: {
    flex: 1,
    backgroundColor: '#FF8C42',
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  testDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF8C42',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 15,
    alignSelf: 'flex-start',
  },
  testDataButtonText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 5,
  },
  paymentInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  paymentInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  paymentInfoAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  cancelPaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#dee2e6',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    minWidth: 200,
    justifyContent: 'center',
  },
  cancelPaymentButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});
