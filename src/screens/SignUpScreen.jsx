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
  ScrollView,
} from 'react-native';
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
    backgroundColor: '#fff',
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  logoText: {
    fontSize: 28,
    color: '#14213D',
    letterSpacing: 1,
    fontWeight: 'bold',
    alignSelf: 'center',
    marginTop: 30,
    marginBottom: 4,
  },
  formSection: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 12,
  },
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#14213D',
    marginBottom: 16,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  label: {
    color: '#444',
    fontWeight: '600',
    marginTop: 18,
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.4,
    borderColor: ORANGE,
    marginBottom: 8,
    paddingHorizontal: 2,
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
  createBtn: {
    backgroundColor: ORANGE,
    borderRadius: 23,
    alignItems: 'center',
    paddingVertical: 15,
    marginVertical: 22,
    marginBottom: 10,
  },
  createBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  signupSection: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textMuted: { color: '#878787', fontSize: 13 },
  signupText: { color: ORANGE, fontWeight: 'bold', fontSize: 14 },
});
