import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { ownerAPI } from '../services/api';

export default function OwnerPanel({ navigation }) {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (passcode.length !== 4) {
      Alert.alert('Error', 'Please enter a 4-digit passcode.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await ownerAPI.verifyPasscode(passcode);
      if (response.success) {
        Alert.alert('Success', 'Passcode verified!', [
          { text: 'OK', onPress: () => navigation.navigate('OwnerDashboard') },
        ]);
        setPasscode('');
      }
    } catch (error) {
      console.error('Passcode verification error:', error);

      // Check if it's a network error
      if (error.message === 'Network request failed') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to server. Please check if the backend is running and try again.',
        );
      } else if (
        error.message.includes('401') ||
        error.message.includes('Incorrect')
      ) {
        Alert.alert('Error', 'Incorrect passcode. Please try again.');
      } else {
        Alert.alert('Error', 'Something went wrong. Please try again.');
      }

      setPasscode('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner's Panel</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Icon name="lock-closed-outline" size={60} color="#FF8C42" />
        <Text style={styles.title}>Secure Access</Text>
        <Text style={styles.description}>
          Enter your passcode to access the owner's panel
        </Text>

        {/* Passcode Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter 4-digit passcode"
            secureTextEntry={!showPassword}
            keyboardType="numeric"
            value={passcode}
            onChangeText={setPasscode}
            maxLength={4}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Icon
              name={showPassword ? 'eye' : 'eye-off'}
              size={24}
              color="#FF8C42"
            />
          </TouchableOpacity>
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            { opacity: passcode.length === 4 && !isLoading ? 1 : 0.5 },
          ]}
          onPress={handleVerify}
          disabled={passcode.length !== 4 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Passcode</Text>
          )}
        </TouchableOpacity>

        {/* Info Text */}
        <Text style={styles.infoText}>
          🔐 Your data is secure and encrypted
        </Text>
      </View>
    </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
    width: '100%',
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    letterSpacing: 2,
    fontWeight: 'bold',
  },
  verifyButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoText: {
    marginTop: 24,
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
