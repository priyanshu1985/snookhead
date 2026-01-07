import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter all fields!');
      return;
    }

    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for httpOnly cookies
      });

      const data = await res.json();

      if (res.ok && data.success && data.accessToken) {
        // Save auth data using AuthContext with refresh token
        await login(data.accessToken, data.refreshToken, data.user);

        Alert.alert('Login Success', 'Logged in successfully!');

        // Navigate based on user role
        const userRole = data.user.role;
        if (userRole === 'admin') {
          navigation.replace('AdminDashboard');
        } else if (userRole === 'staff') {
          navigation.replace('StaffMember');
        } else {
          // owner, customer, or other roles go to main tabs
          navigation.replace('MainTabs');
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to server. Please check your connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FF8C42" />
      <View style={styles.headerWrap}>
        <Text style={styles.logoText}>SNOKEHEAD</Text>
      </View>
      <View style={styles.formSection}>
        <Text style={styles.header}>Sign in</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="mail-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="demo@email.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="enter your password"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeBtn}
          >
            <Icon
              name={showPassword ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="#999"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.loginBtnText}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
        <View style={styles.signupSection}>
          <Text style={styles.textMuted}>Don't have an Account ? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUpScreen')}>
            <Text style={styles.signupText}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const ORANGE = '#FF8C42';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerWrap: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logoText: {
    fontSize: 32,
    color: '#1A1A1A',
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  formSection: {
    paddingHorizontal: 28,
    flex: 1,
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    marginTop: 16,
  },
  subHeader: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  inputWrapperFocused: {
    borderColor: ORANGE,
    backgroundColor: '#FFF8F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 15,
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  eyeBtn: {
    padding: 8,
    marginLeft: 4,
  },
  loginBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 16,
    marginBottom: 16,
    elevation: 4,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  signupSection: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textMuted: {
    color: '#888888',
    fontSize: 14,
  },
  signupText: {
    color: ORANGE,
    fontWeight: '700',
    fontSize: 14,
  },
});
