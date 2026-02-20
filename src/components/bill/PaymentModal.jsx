import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function PaymentModal({
  visible,
  onClose,
  grandTotal,
  personName,
  onPaymentComplete,
}) {
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashAmount, setCashAmount] = useState('');
  const [onlineAmount, setOnlineAmount] = useState('');

  const handleOfflinePayment = () => {
    if (!cashAmount.trim()) {
      Alert.alert('Error', 'Please enter cash amount');
      return;
    }
    const amount = parseFloat(cashAmount);
    if (amount <= 0 || isNaN(amount)) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    Alert.alert(
      'Offline Payment',
      `Cash payment of ₹${amount} recorded for ${personName}`,
      [
        {
          text: 'OK',
          onPress: () => {
            onPaymentComplete({
              method: 'offline',
              amount,
              personName,
            });
            resetModal();
            onClose();
          },
        },
      ],
    );
  };

  const handleOnlinePayment = () => {
    Alert.alert(
      'Online Payment',
      `Processing online payment of ₹${grandTotal} for ${personName}...`,
      [
        {
          text: 'OK',
          onPress: () => {
            onPaymentComplete({
              method: 'online',
              amount: grandTotal,
              personName,
            });
            resetModal();
            onClose();
          },
        },
      ],
    );
  };

  const handleHybridPayment = () => {
    if (!cashAmount.trim() || !onlineAmount.trim()) {
      Alert.alert('Error', 'Please enter both cash and online amounts');
      return;
    }
    const cash = parseFloat(cashAmount);
    const online = parseFloat(onlineAmount);
    const total = cash + online;

    if (isNaN(cash) || isNaN(online) || cash < 0 || online < 0) {
      Alert.alert('Error', 'Please enter valid amounts');
      return;
    }
    if (Math.abs(total - grandTotal) > 0.01) {
      Alert.alert(
        'Error',
        `Total should be ₹${grandTotal}. You entered ₹${total.toFixed(2)}`,
      );
      return;
    }
    Alert.alert(
      'Hybrid Payment',
      `Cash: ₹${cash} + Online: ₹${online} = ₹${total} for ${personName}`,
      [
        {
          text: 'OK',
          onPress: () => {
            onPaymentComplete({
              method: 'hybrid',
              cashAmount: cash,
              onlineAmount: online,
              total: total,
              personName,
            });
            resetModal();
            onClose();
          },
        },
      ],
    );
  };

  const resetModal = () => {
    setPaymentMethod(null);
    setCashAmount('');
    setOnlineAmount('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Total Amount Display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Total Amount:</Text>
            <Text style={styles.amountValue}>₹ {grandTotal.toFixed(2)}</Text>
          </View>

          {/* Payment Methods */}
          <View style={styles.methodsContainer}>
            {/* OFFLINE - Cash Payment */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'offline' && styles.methodCardActive,
              ]}
              onPress={() => setPaymentMethod('offline')}
            >
              <View style={styles.methodHeader}>
                <Icon
                  name="cash"
                  size={24}
                  color={paymentMethod === 'offline' ? '#FF8C42' : '#999'}
                />
                <Text
                  style={[
                    styles.methodTitle,
                    paymentMethod === 'offline' && styles.methodTitleActive,
                  ]}
                >
                  Offline (Cash)
                </Text>
              </View>
              <Text style={styles.methodDesc}>Enter cash amount manually</Text>
            </TouchableOpacity>

            {/* Offline Input */}
            {paymentMethod === 'offline' && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter Cash Amount:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter amount"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleOfflinePayment}
                >
                  <Text style={styles.confirmBtnText}>
                    Confirm Offline Payment
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ONLINE - Auto Payment */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'online' && styles.methodCardActive,
              ]}
              onPress={() => setPaymentMethod('online')}
            >
              <View style={styles.methodHeader}>
                <Icon
                  name="card"
                  size={24}
                  color={paymentMethod === 'online' ? '#FF8C42' : '#999'}
                />
                <Text
                  style={[
                    styles.methodTitle,
                    paymentMethod === 'online' && styles.methodTitleActive,
                  ]}
                >
                  Online Payment
                </Text>
              </View>
              <Text style={styles.methodDesc}>
                Auto-book order (₹{grandTotal.toFixed(2)})
              </Text>
            </TouchableOpacity>

            {/* Online Confirm */}
            {paymentMethod === 'online' && (
              <View style={styles.inputSection}>
                <Text style={styles.confirmText}>
                  Process ₹{grandTotal.toFixed(2)} online payment?
                </Text>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleOnlinePayment}
                >
                  <Text style={styles.confirmBtnText}>
                    Proceed Online Payment
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* HYBRID - Cash + Online */}
            <TouchableOpacity
              style={[
                styles.methodCard,
                paymentMethod === 'hybrid' && styles.methodCardActive,
              ]}
              onPress={() => setPaymentMethod('hybrid')}
            >
              <View style={styles.methodHeader}>
                <Icon
                  name="swap-horizontal"
                  size={24}
                  color={paymentMethod === 'hybrid' ? '#FF8C42' : '#999'}
                />
                <Text
                  style={[
                    styles.methodTitle,
                    paymentMethod === 'hybrid' && styles.methodTitleActive,
                  ]}
                >
                  Hybrid (Cash + Online)
                </Text>
              </View>
              <Text style={styles.methodDesc}>
                50% cash + 50% online payment
              </Text>
            </TouchableOpacity>

            {/* Hybrid Input */}
            {paymentMethod === 'hybrid' && (
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Enter Cash Amount:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter cash amount"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={cashAmount}
                  onChangeText={setCashAmount}
                />
                <Text style={styles.inputLabel}>Enter Online Amount:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter online amount"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  value={onlineAmount}
                  onChangeText={setOnlineAmount}
                />
                <Text style={styles.totalText}>
                  Total: ₹
                  {(parseFloat(cashAmount) || 0) +
                    (parseFloat(onlineAmount) || 0)}
                </Text>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleHybridPayment}
                >
                  <Text style={styles.confirmBtnText}>
                    Confirm Hybrid Payment
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => {
              resetModal();
              onClose();
            }}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  amountDisplay: {
    backgroundColor: '#FFF8F0',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#999',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C42',
    marginTop: 4,
  },
  methodsContainer: {
    marginBottom: 16,
  },
  methodCard: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  methodCardActive: {
    backgroundColor: '#FFF8F0',
    borderColor: '#FF8C42',
  },
  methodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  methodTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 10,
  },
  methodTitleActive: {
    color: '#FF8C42',
  },
  methodDesc: {
    fontSize: 12,
    color: '#777',
    marginLeft: 34,
  },
  inputSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  confirmText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  totalText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
    marginBottom: 10,
    textAlign: 'right',
  },
  confirmBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
});
