import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../../config';
import { useAuth } from '../../context/AuthContext';

const { width } = Dimensions.get('window');
const ORANGE = '#F08626';
const DARK_BLUE = '#1A1A2E';
const LIGHT_GRAY = '#F8F9FA';

export default function OtpVerificationScreen({ route, navigation }) {
  // Get email from navigation params
  const { email, password } = route.params || {};

  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const { login } = useAuth();

  // Refs for OTP inputs to handle auto-focus
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      Alert.alert('Error', 'Email not found. Please sign up again.');
      navigation.goBack();
    }
  }, [email]);

  // Timer for resend button
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleOtpChange = (text, index) => {
    // Handle paste (if user pastes full code)
    if (text.length > 1) {
      const newOtp = [...otp];
      const pastedChars = text.split('').slice(0, 4);
      pastedChars.forEach((char, i) => {
        if (index + i < 4) {
          newOtp[index + i] = char;
        }
      });
      setOtp(newOtp);
      // Focus last filled input or the next empty one
      const lastIndex = Math.min(index + pastedChars.length, 3);
      inputRefs.current[lastIndex]?.focus();
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to focus previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length < 4) {
      Alert.alert(
        'Invalid Code',
        'Please enter the 4-digit verification code.',
      );
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (res.ok && data.accessToken) {
        // Login the user directly
        await login(data.accessToken, data.refreshToken, data.user);

        Alert.alert('Success', 'Email verified successfully!');

        const userRole = data.user.role;
        if (userRole === 'admin') {
          navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
        } else if (userRole === 'staff') {
          navigation.reset({ index: 0, routes: [{ name: 'StaffMember' }] });
        } else {
          navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
        }
      } else {
        Alert.alert('Verification Failed', data.error || 'Invalid code');
      }
    } catch (error) {
      console.error('Verification error:', error);
      Alert.alert('Network Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        Alert.alert(
          'Code Sent',
          'A new verification code has been sent to your email.',
        );
        setTimer(60);
        setCanResend(false);
      } else {
        Alert.alert('Error', data.error || 'Failed to resend code');
      }
    } catch (error) {
      console.error('Resend error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LIGHT_GRAY} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color={DARK_BLUE} />
          </TouchableOpacity>

          <View style={styles.headerSection}>
            <View style={styles.iconContainer}>
              <Icon name="mail-unread-outline" size={40} color={ORANGE} />
            </View>
            <Text style={styles.title}>Verification</Text>
            <Text style={styles.subtitle}>
              We've sent a 4-digit verification code to
            </Text>
            <Text style={styles.emailText}>{email}</Text>
          </View>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => (inputRefs.current[index] = ref)}
                style={[
                  styles.otpInput,
                  digit ? styles.otpInputFilled : null,
                  // Highlight current input if needed, logic omitted for simplicity
                ]}
                value={digit}
                onChangeText={text => handleOtpChange(text, index)}
                onKeyPress={e => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1} // Only 1 char per input (unless pasting)
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.verifyButton,
              isLoading && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.verifyButtonText}>Verify Email</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn't receive the code? </Text>
            <TouchableOpacity onPress={handleResend} disabled={!canResend}>
              <Text
                style={[
                  styles.resendLink,
                  !canResend && styles.resendLinkDisabled,
                ]}
              >
                {canResend ? 'Resend Code' : `Resend in ${timer}s`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LIGHT_GRAY,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF3E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: DARK_BLUE,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: ORANGE,
    textAlign: 'center',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  otpInput: {
    width: 45,
    height: 56,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: DARK_BLUE,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  otpInputFilled: {
    borderColor: ORANGE,
    backgroundColor: '#FFF8F1',
  },
  verifyButton: {
    width: '100%',
    height: 56,
    backgroundColor: ORANGE,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  verifyButtonDisabled: {
    backgroundColor: '#FCCDA0',
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  resendText: {
    fontSize: 14,
    color: '#6B7280',
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
    color: ORANGE,
  },
  resendLinkDisabled: {
    color: '#9CA3AF',
  },
});
