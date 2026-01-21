import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  Dimensions,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../config';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');
const ORANGE = '#F08626';
const DARK_BLUE = '#1A1A2E';

export default function SignUpScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [role, setRole] = useState('customer');
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const roleOptions = [
    { label: 'Customer', value: 'customer' },
    { label: 'Owner', value: 'owner' },
    { label: 'Staff Member', value: 'staff' },
  ];

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
      setIsLoading(true);
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone: number,
          password,
          role,
        }),
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success && data.accessToken) {
        await login(data.accessToken, data.refreshToken, data.user);

        const userRole = data.user.role;
        if (userRole === 'admin') {
          navigation.replace('AdminDashboard');
        } else if (userRole === 'staff') {
          navigation.replace('StaffMember');
        } else {
          navigation.replace('MainTabs');
        }
      } else {
        Alert.alert('Sign up error', data.error || 'Could not sign up');
      }
    } catch (err) {
      console.error('Sign up error:', err);
      Alert.alert('Network error', 'Try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      {/* Orange Header with Curved Wave Pattern */}
      <View style={styles.headerContainer}>
        {/* Curved Wave Pattern Lines */}
        <Svg height="180" width={width} style={styles.patternSvg}>
          {/* Multiple curved wave lines */}
          <Path
            d={`M-50,140 Q${width * 0.2},100 ${width * 0.5},120 T${
              width + 50
            },80`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d={`M-50,120 Q${width * 0.25},80 ${width * 0.5},100 T${
              width + 50
            },60`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d={`M-50,100 Q${width * 0.3},60 ${width * 0.5},80 T${
              width + 50
            },40`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d={`M-50,80 Q${width * 0.25},40 ${width * 0.5},60 T${
              width + 50
            },20`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d={`M-50,60 Q${width * 0.2},20 ${width * 0.5},40 T${width + 50},0`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
            fill="none"
          />
        </Svg>

        <View style={styles.headerContent}>
          <View style={styles.logoRow}>
            <Image
              source={require('../Assets/logo.jpg')}
              style={styles.logoImage}
            />
            <Text style={styles.logoText}>SNOKEHEAD</Text>
          </View>
        </View>

        {/* Wave SVG at bottom */}
        <View style={styles.waveContainer}>
          <Svg height="40" width={width} viewBox={`0 0 ${width} 40`}>
            <Path
              d={`M0,20 Q${width * 0.25},40 ${
                width * 0.5
              },20 T${width},20 L${width},40 L0,40 Z`}
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      </View>

      {/* Form Container - No Scroll */}
      <View style={styles.formContainer}>
        <Text style={styles.header}>Sign up</Text>

        {/* Email Input */}
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="mail-outline"
            size={16}
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

        {/* Name Input */}
        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="person-outline"
            size={16}
            color="#999"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            placeholderTextColor="#bbb"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        {/* Role Selection */}
        <Text style={styles.label}>Role</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setShowRoleModal(true)}
        >
          <Icon
            name="briefcase-outline"
            size={16}
            color="#999"
            style={styles.inputIcon}
          />
          <Text style={[styles.input, { paddingTop: 12 }]}>
            {roleOptions.find(option => option.value === role)?.label ||
              'Select Role'}
          </Text>
          <Icon
            name="chevron-down-outline"
            size={16}
            color="#999"
            style={styles.dropdownIcon}
          />
        </TouchableOpacity>

        {/* Phone Input */}
        <Text style={styles.label}>Phone no</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="call-outline"
            size={16}
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

        {/* Password Input */}
        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={16}
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
              size={16}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Confirm Password Input */}
        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrapper}>
          <Icon
            name="lock-closed-outline"
            size={16}
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
              size={16}
              color="#999"
            />
          </TouchableOpacity>
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={[styles.createBtn, isLoading && styles.createBtnDisabled]}
          onPress={handleSignUp}
          disabled={isLoading}
        >
          <Text style={styles.createBtnText}>
            {isLoading ? 'Creating Account...' : 'Create Acount'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.signupSection}>
          <Text style={styles.textMuted}>Already have an Account! </Text>
          <TouchableOpacity onPress={() => navigation.navigate('LoginScreen')}>
            <Text style={styles.signupText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Selection Modal - Replaced with Absolute View */}
      {showRoleModal && (
        <View
          style={[
            styles.modalOverlay,
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              elevation: 10,
            },
          ]}
        >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Account Type</Text>
              <TouchableOpacity
                onPress={() => setShowRoleModal(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {roleOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.roleOption,
                  role === option.value && styles.selectedRole,
                ]}
                onPress={() => {
                  setRole(option.value);
                  setShowRoleModal(false);
                }}
              >
                <Icon
                  name={
                    option.value === 'customer'
                      ? 'person-outline'
                      : option.value === 'owner'
                      ? 'business-outline'
                      : 'people-outline'
                  }
                  size={20}
                  color={role === option.value ? ORANGE : '#666'}
                />
                <Text
                  style={[
                    styles.roleOptionText,
                    role === option.value && styles.selectedRoleText,
                  ]}
                >
                  {option.label}
                </Text>
                {role === option.value && (
                  <Icon name="checkmark-circle" size={20} color={ORANGE} />
                )}
              </TouchableOpacity>
            ))}

            <Text style={styles.roleDescription}>
              {role === 'customer'
                ? 'Access games, bookings, and wallet features'
                : role === 'owner'
                ? 'Access owner panel, analytics, and full management'
                : 'Access staff features and customer management'}
            </Text>
          </View>
        </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerContainer: {
    backgroundColor: ORANGE,
    height: 180,
    position: 'relative',
    overflow: 'hidden',
  },
  patternSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 30,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  logoText: {
    fontSize: 20,
    color: DARK_BLUE,
    fontWeight: '800',
    letterSpacing: 1,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  header: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 20,
  },
  label: {
    color: '#1A1A1A',
    fontWeight: '600',
    marginBottom: 8,
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
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
  },
  eyeBtn: {
    padding: 8,
    marginLeft: 4,
  },
  dropdownIcon: {
    padding: 8,
    marginLeft: 4,
  },
  dropdownText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
  },
  createBtn: {
    backgroundColor: ORANGE,
    borderRadius: 25,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  createBtnDisabled: {
    backgroundColor: '#CCCCCC',
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
  signupSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 20,
    padding: 20,
    width: '85%',
    maxWidth: 340,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    backgroundColor: '#F8F9FA',
  },
  selectedRole: {
    borderColor: ORANGE,
    backgroundColor: '#FFF3E0',
  },
  roleOptionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  selectedRoleText: {
    color: ORANGE,
  },
  roleDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    lineHeight: 18,
  },
});
