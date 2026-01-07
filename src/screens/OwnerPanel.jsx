import React, { useState, useEffect } from 'react';
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
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);

  // Check if user needs to set up password when component mounts
  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      setCheckingSetup(true);
      const response = await ownerAPI.checkSetupStatus();

      if (response.success) {
        if (response.needsSetup) {
          // User needs to set up password first
          navigation.replace('OwnerPasswordSetup');
          return;
        }
        // User has already set up password, proceed with verification screen
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
      // If there's an error checking, show password setup screen as fallback
      Alert.alert('Error', 'Unable to check setup status. Please try again.', [
        { text: 'Retry', onPress: checkSetupStatus },
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setCheckingSetup(false);
    }
  };

  const handleVerify = async () => {
    if (password.length < 4) {
      Alert.alert(
        'Error',
        'Please enter a password with at least 4 characters.',
      );
      return;
    }

    setIsLoading(true);
    try {
      const response = await ownerAPI.verifyPassword(password);
      if (response.success) {
        Alert.alert('Success', 'Password verified!', [
          { text: 'OK', onPress: () => navigation.navigate('OwnerDashboard') },
        ]);
        setPassword('');
      }
    } catch (error) {
      console.error('Password verification error:', error);

      let errorMessage = 'Something went wrong. Please try again.';

      // Check if it's a network error
      if (error.message === 'Network request failed') {
        errorMessage =
          'Unable to connect to server. Please check if the backend is running and try again.';
      } else if (error.message.includes('not set up')) {
        // User needs to set up password
        Alert.alert(
          'Setup Required',
          'Owner panel password not set up. Please set up your password first.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('OwnerPasswordSetup'),
            },
          ],
        );
        return;
      } else if (
        error.message.includes('401') ||
        error.message.includes('Incorrect')
      ) {
        errorMessage = 'Incorrect password. Please try again.';
      }

      Alert.alert('Error', errorMessage);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'To reset your owner panel password, please contact your administrator or use the admin panel.',
      [
        { text: 'OK' },
        {
          text: 'Contact Admin',
          onPress: () => {
            // You can implement admin contact functionality here
            Alert.alert(
              'Info',
              'Please contact your system administrator for password reset.',
            );
          },
        },
      ],
    );
  };

  // Show loading screen while checking setup status
  if (checkingSetup) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Checking setup status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner's Panel</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('OwnerPasswordSetup')}
        >
          <Icon name="settings-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Icon name="lock-closed-outline" size={60} color="#FF8C42" />
        <Text style={styles.title}>Secure Access</Text>
        <Text style={styles.description}>
          Enter your owner panel password to access the analytics dashboard
        </Text>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
            placeholderTextColor="#999"
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
            { opacity: password.length >= 4 && !isLoading ? 1 : 0.5 },
          ]}
          onPress={handleVerify}
          disabled={password.length < 4 || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.verifyButtonText}>Access Dashboard</Text>
          )}
        </TouchableOpacity>

        {/* Forgot Password */}
        <TouchableOpacity
          style={styles.forgotButton}
          onPress={handleForgotPassword}
        >
          <Text style={styles.forgotText}>Forgot Password?</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
    lineHeight: 20,
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
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#333',
  },
  verifyButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotButton: {
    paddingVertical: 8,
    marginBottom: 24,
  },
  forgotText: {
    color: '#FF8C42',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
});
