import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignUp = async () => {
    if (!email || !name || !number || !password || !confirmPassword) {
      Alert.alert('Missing info', 'Please fill all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match!');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone: number,
          password,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        Alert.alert('Success', 'Account created', [
          { text: 'OK', onPress: () => navigation.navigate('MainTabs') },
        ]);
      } else {
        Alert.alert('Sign up error', data.error || 'Could not sign up');
      }
    } catch (err) {
      Alert.alert('Network error', 'Try again later.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FF8C42" />
      <ScrollView
        contentContainerStyle={styles.formSection}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.logoText}>SNOKEHEAD</Text>
        <Text style={styles.header}>Sign up</Text>

        <Text style={styles.label}>Email</Text>
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
        <Text style={styles.label}>Name</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="person-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>
        <Text style={styles.label}>Phone no</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="call-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="+00 000-0000-000"
            placeholderTextColor="#bbb"
            value={number}
            onChangeText={setNumber}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
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

        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm your password"
            placeholderTextColor="#bbb"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirm}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => setShowConfirm(!showConfirm)}
            style={styles.eyeBtn}
          >
            <Icon
              name={showConfirm ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={handleSignUp}>
          <Text style={styles.createBtnText}>Create Account</Text>
        </TouchableOpacity>

        <View style={styles.signupSection}>
          <Text style={styles.textMuted}>Already have an Account! </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.signupText}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const ORANGE = '#FF8C42';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  logoText: {
    fontSize: 28,
    color: '#1A1A1A',
    letterSpacing: 1.5,
    fontWeight: '800',
    alignSelf: 'center',
    marginTop: 50,
    marginBottom: 8,
  },
  formSection: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 12,
  },
  header: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  subHeader: {
    fontSize: 14,
    color: '#888888',
    marginBottom: 24,
  },
  label: {
    color: '#666666',
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    fontSize: 13,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    marginBottom: 4,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    letterSpacing: 0.2,
  },
  eyeBtn: {
    padding: 8,
    marginLeft: 4,
  },
  createBtn: {
    backgroundColor: ORANGE,
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 18,
    marginTop: 28,
    marginBottom: 16,
    elevation: 4,
    shadowColor: ORANGE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  signupSection: {
    marginTop: 16,
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
