import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { ownerAPI } from '../services/api';

export default function OwnerPasswordSetup({ navigation }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();

  const handleSetupPassword = async () => {
    // Validation
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please enter both password and confirm password.');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await ownerAPI.setupPassword(password, confirmPassword);
      if (response.success) {
        Alert.alert(
          'Success',
          'Owner panel password has been set up successfully!',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('OwnerPanel'),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Password setup error:', error);

      let errorMessage = 'Something went wrong. Please try again.';

      if (error.message === 'Network request failed') {
        errorMessage =
          'Unable to connect to server. Please check if the backend is running and try again.';
      } else if (error.message.includes('Passwords do not match')) {
        errorMessage = 'Passwords do not match. Please try again.';
      } else if (error.message.includes('already been set up')) {
        errorMessage = 'Owner panel password has already been set up.';
      } else if (error.message.includes('at least 4 characters')) {
        errorMessage = 'Password must be at least 4 characters long.';
      }

      Alert.alert('Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    return (
      password.length >= 4 &&
      confirmPassword.length >= 4 &&
      password === confirmPassword
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Up Owner Password</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Icon and Welcome Text */}
          <View style={styles.welcomeSection}>
            <Icon name="shield-checkmark" size={80} color="#FF8C42" />
            <Text style={styles.title}>Secure Your Owner Panel</Text>
            <Text style={styles.description}>
              As this is your first time accessing the owner panel, please set
              up a secure password to protect your data.
            </Text>
          </View>

          {/* Password Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter password (min 4 characters)"
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

            {/* Confirm Password Input */}
            <Text style={styles.inputLabel}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Re-enter password"
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#999"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? 'eye' : 'eye-off'}
                  size={24}
                  color="#FF8C42"
                />
              </TouchableOpacity>
            </View>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicator}>
                <Icon
                  name={
                    password === confirmPassword
                      ? 'checkmark-circle'
                      : 'close-circle'
                  }
                  size={16}
                  color={password === confirmPassword ? '#4CAF50' : '#FF5252'}
                />
                <Text
                  style={[
                    styles.matchText,
                    {
                      color:
                        password === confirmPassword ? '#4CAF50' : '#FF5252',
                    },
                  ]}
                >
                  {password === confirmPassword
                    ? 'Passwords match'
                    : 'Passwords do not match'}
                </Text>
              </View>
            )}
          </View>

          {/* Setup Button */}
          <TouchableOpacity
            style={[
              styles.setupButton,
              { opacity: isFormValid() && !isLoading ? 1 : 0.5 },
            ]}
            onPress={handleSetupPassword}
            disabled={!isFormValid() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.setupButtonText}>Set Up Password</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Security Info */}
          <View style={styles.securityInfo}>
            <Text style={styles.securityTitle}>🔐 Security Information</Text>
            <Text style={styles.securityText}>
              • Your password is encrypted and stored securely
            </Text>
            <Text style={styles.securityText}>
              • You'll need this password every time you access the owner panel
            </Text>
            <Text style={styles.securityText}>
              • Keep your password safe and don't share it with others
            </Text>
            <Text style={styles.securityText}>
              • You can change your password later from the settings
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginHorizontal: 20,
  },
  inputSection: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
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
  matchIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  matchText: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  setupButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 32,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  securityInfo: {
    backgroundColor: '#FFF9F5',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  securityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },
});
