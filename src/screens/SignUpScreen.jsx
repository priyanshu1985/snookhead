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
  Modal,
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
  const [role, setRole] = useState('customer'); // Default role
  const [showRoleModal, setShowRoleModal] = useState(false);

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
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          name,
          phone: number,
          password,
          role, // Include selected role
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const roleMessage =
          role === 'customer'
            ? 'Account created successfully!'
            : role === 'owner'
            ? 'Owner account created! You can now access the owner panel.'
            : 'Staff member account created! You can now access staff features.';
        Alert.alert('Success', roleMessage, [
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

        <Text style={styles.label}>Account Type</Text>
        <TouchableOpacity
          style={styles.inputWrapper}
          onPress={() => setShowRoleModal(true)}
        >
          <Icon
            name="person-circle-outline"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
          <Text style={styles.dropdownText}>
            {roleOptions.find(option => option.value === role)?.label ||
              'Select Role'}
          </Text>
          <Icon name="chevron-down-outline" size={18} color="#999" />
        </TouchableOpacity>

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

      {/* Role Selection Modal */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRoleModal(false)}
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
                  color={role === option.value ? '#FF8C42' : '#666'}
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
                  <Icon name="checkmark-circle" size={20} color="#FF8C42" />
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
      </Modal>
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
  dropdownText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A1A',
    letterSpacing: 0.2,
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
    width: '80%',
    maxWidth: 320,
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
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
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    lineHeight: 16,
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
