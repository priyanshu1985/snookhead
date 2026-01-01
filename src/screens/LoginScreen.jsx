import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
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
      });

      const data = await res.json();

      if (res.ok && data.accessToken) {
        // Save auth data using AuthContext
        await login(data.accessToken, data.user);

        Alert.alert('Login Success', 'Logged in successfully!');

        // Navigate based on user role
        const userRole = data.user.role;
        switch (userRole) {
          case 'admin':
            navigation.replace('AdminDashboard');
            break;
          case 'staff':
            navigation.replace('StaffMember');
            break;
          case 'owner':
          case 'customer':
          default:
            navigation.replace('MainTabs');
            break;
        }
      } else {
        Alert.alert('Login Failed', data.error || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Network Error', 'Please try again.');
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
  container: { flex: 1, backgroundColor: '#fff', justifyContent: 'flex-start' },
  headerWrap: { alignItems: 'center', marginVertical: 44 },
  logoText: {
    fontSize: 28,
    color: '#14213D',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  formSection: { paddingHorizontal: 24 },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#14213D',
    marginBottom: 22,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderColor: ORANGE,
    marginBottom: 18,
    paddingHorizontal: 1,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 15,
    color: '#1a1a1a',
    letterSpacing: 0.2,
  },
  eyeBtn: { padding: 4, marginLeft: 2 },
  loginBtn: {
    backgroundColor: ORANGE,
    borderRadius: 22,
    alignItems: 'center',
    paddingVertical: 14,
    marginBottom: 14,
  },
  loginBtnDisabled: {
    backgroundColor: '#FFB366',
    opacity: 0.7,
  },
  loginBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  signupSection: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textMuted: { color: '#878787', fontSize: 13 },
  signupText: { color: ORANGE, fontWeight: 'bold', fontSize: 14 },
});
