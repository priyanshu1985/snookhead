import React, { useState } from 'react';
import { X } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
} from 'react-native';

export default function PaymentModal({
  visible,
  onClose,
  grandTotal,
  personName,
  onPaymentComplete,
}) {
  const [paymentMethod, setPaymentMethod] = useState(null);

  const PAYMENT_OPTIONS = [
    { id: 'Cash', title: 'Cash', icon: 'cash-outline', desc: `Pay ₹${grandTotal.toFixed(2)} in cash` },
    { id: 'UPI', title: 'UPI', icon: 'qr-code-outline', desc: `Pay ₹${grandTotal.toFixed(2)} via UPI` },
    { id: 'Wallet', title: 'Wallet', icon: 'wallet-outline', desc: `Pay ₹${grandTotal.toFixed(2)} using Wallet` },
    { id: 'Credit', title: 'Credit', icon: 'card-outline', desc: `Pay ₹${grandTotal.toFixed(2)} using Credit Card` },
  ];

  const handlePayment = () => {
    if (!paymentMethod) return;
    const selectedOption = PAYMENT_OPTIONS.find(opt => opt.id === paymentMethod);

    Alert.alert(
      `${selectedOption.title} Payment`,
      `Processing payment of ₹${grandTotal} for ${personName}...`,
      [
        {
          text: 'OK',
          onPress: () => {
            onPaymentComplete({
              method: selectedOption.id,
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

  const resetModal = () => {
    setPaymentMethod(null);
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
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Total Amount Display */}
          <View style={styles.amountDisplay}>
            <Text style={styles.amountLabel}>Total Amount:</Text>
            <Text style={styles.amountValue}>₹ {grandTotal.toFixed(2)}</Text>
          </View>

          {/* Payment Methods */}
          <View style={styles.methodsContainer}>
            {PAYMENT_OPTIONS.map((option) => (
              <React.Fragment key={option.id}>
                <TouchableOpacity
                  style={[
                    styles.methodCard,
                    paymentMethod === option.id && styles.methodCardActive,
                  ]}
                  onPress={() => setPaymentMethod(option.id)}
                >
                  <View style={styles.methodHeader}>
                    <Icon
                      name={option.icon}
                      size={24}
                      color={paymentMethod === option.id ? '#FF8C42' : '#999'}
                    />
                    <Text
                      style={[
                        styles.methodTitle,
                        paymentMethod === option.id && styles.methodTitleActive,
                      ]}
                    >
                      {option.title}
                    </Text>
                  </View>
                  <Text style={styles.methodDesc}>{option.desc}</Text>
                </TouchableOpacity>

                {/* Confirm Section */}
                {paymentMethod === option.id && (
                  <View style={styles.inputSection}>
                    <Text style={styles.confirmText}>
                      Process ₹{grandTotal.toFixed(2)} using {option.title}?
                    </Text>
                    <TouchableOpacity
                      style={styles.confirmBtn}
                      onPress={handlePayment}
                    >
                      <Text style={styles.confirmBtnText}>
                        Proceed with {option.title}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </React.Fragment>
            ))}
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
    marginTop: 2,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    marginBottom: 10,
  },
  confirmText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
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
