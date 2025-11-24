import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ScannerScreen({ navigation, route }) {
  const [amount, setAmount] = useState(1600);

  // You can pass QR image from backend or use a placeholder
  const qrCodeImage = require('../Assets/image1.png'); // Replace with your QR code image

  const handleUpdateWallet = () => {
    // Handle payment confirmation
    console.log('Payment of ₹', amount);
    // Navigate to success screen or payment gateway
    navigation.navigate('PaymentSuccess', { amount });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan to add amount in wallet</Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* QR Code */}
        <View style={styles.qrContainer}>
          <Image
            source={qrCodeImage}
            style={styles.qrImage}
            resizeMode="contain"
          />
        </View>

        {/* Total Amount */}
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Total Amount:</Text>
          <Text style={styles.amountValue}>
            ₹{amount.toLocaleString('en-IN')}/-
          </Text>
        </View>

        {/* Update Wallet Button */}
        <TouchableOpacity
          style={styles.updateButton}
          onPress={handleUpdateWallet}
        >
          <Text style={styles.updateButtonText}>Update Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  qrContainer: {
    width: 240,
    height: 240,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 60,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrImage: {
    width: '100%',
    height: '100%', // Orange color for QR code
  },
  amountContainer: {
    marginBottom: 32,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  updateButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    paddingHorizontal: 80,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
