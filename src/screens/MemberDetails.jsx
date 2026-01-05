import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  Switch,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

// Helper function to get auth token
const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
};

export default function MemberDetails({ route, navigation }) {
  const { member: initialMember } = route.params;
  const [member, setMember] = useState(initialMember);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [memberStatus, setMemberStatus] = useState(initialMember.is_active);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addingAmount, setAddingAmount] = useState(false);

  // Fetch fresh member data from API
  const fetchMemberData = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(
        `${API_URL}/api/customer/${initialMember.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const memberData = await response.json();
        setMember(memberData);
        setMemberStatus(memberData.is_active);
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
    }
  };

  // Fetch wallet information for the member
  const fetchWallet = async () => {
    try {
      setLoading(true);
      const token = await getAuthToken();

      const response = await fetch(
        `${API_URL}/api/wallets/customer/${member.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const walletData = await response.json();
        console.log('Wallet data received:', walletData);

        // Ensure qr_code is properly formatted
        if (walletData.qr_code && typeof walletData.qr_code === 'object') {
          console.log('QR code is an object:', walletData.qr_code);
          walletData.qr_code = null; // Reset if it's not a string
        }

        setWallet(walletData);
        setError(null);
      } else if (response.status === 404) {
        setWallet(null);
        setError('No wallet found for this member');
      } else {
        setError('Failed to fetch wallet information');
      }
    } catch (error) {
      console.error('Error fetching wallet:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh member data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMemberData();
      fetchWallet();
    }, [initialMember.id]),
  );

  const handleCreateWallet = async () => {
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/wallets/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customer_id: member.id,
          phone_no: member.phone,
          currency: 'INR',
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Wallet created successfully');
        fetchWallet(); // Refresh wallet data
      } else {
        const result = await response.json();
        Alert.alert('Error', result.error || 'Failed to create wallet');
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    }
  };

  // Toggle member active/inactive status
  const handleToggleStatus = async newStatus => {
    setTogglingStatus(true);
    try {
      const token = await getAuthToken();
      const endpoint = newStatus
        ? `${API_URL}/api/customer/${member.id}/activate`
        : `${API_URL}/api/customer/${member.id}/deactivate`;

      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setMemberStatus(newStatus);
        Alert.alert(
          'Success',
          `Member ${newStatus ? 'activated' : 'deactivated'} successfully`,
        );
      } else {
        const result = await response.json();
        Alert.alert('Error', result.error || 'Failed to update member status');
        // Revert toggle if failed
        setMemberStatus(!newStatus);
      }
    } catch (error) {
      console.error('Error toggling member status:', error);
      Alert.alert('Error', 'Network error. Please try again.');
      // Revert toggle if failed
      setMemberStatus(!newStatus);
    } finally {
      setTogglingStatus(false);
    }
  };

  // Add amount to wallet
  const handleAddAmount = async () => {
    // Check if member is active
    if (!memberStatus) {
      Alert.alert('Error', 'Cannot add amount. Member is inactive.');
      return;
    }

    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setAddingAmount(true);
    try {
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/wallets/${wallet.id}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: amount,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', `₹${amount.toFixed(2)} added to wallet`);
        setShowAddAmountModal(false);
        setAddAmount('');
        fetchWallet(); // Refresh wallet data
      } else {
        const result = await response.json();
        Alert.alert('Error', result.error || 'Failed to add amount');
      }
    } catch (error) {
      console.error('Error adding amount:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setAddingAmount(false);
    }
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatCurrency = amount => {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Member Details</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Member Information Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="person-circle-outline" size={40} color="#ff8c1a" />
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberPhone}>{member.phone}</Text>
              <Text style={styles.memberEmail}>
                {member.email || 'No email'}
              </Text>
            </View>
          </View>

          {/* Status Toggle Section */}
          <View style={styles.statusToggleSection}>
            <View style={styles.statusToggleLeft}>
              <Text style={styles.statusToggleLabel}>Status</Text>
              <View
                style={[
                  styles.statusBadge,
                  memberStatus ? styles.activeBadge : styles.inactiveBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    memberStatus
                      ? styles.activeStatusText
                      : styles.inactiveStatusText,
                  ]}
                >
                  {memberStatus ? 'ACTIVE' : 'INACTIVE'}
                </Text>
              </View>
            </View>
            <View style={styles.statusToggleRight}>
              {togglingStatus ? (
                <ActivityIndicator size="small" color="#ff8c1a" />
              ) : (
                <Switch
                  value={memberStatus}
                  onValueChange={handleToggleStatus}
                  trackColor={{ false: '#e0e0e0', true: '#a5d6a7' }}
                  thumbColor={memberStatus ? '#4CAF50' : '#f5f5f5'}
                />
              )}
            </View>
          </View>

          {member.address && (
            <View style={styles.addressSection}>
              <Text style={styles.addressLabel}>Address:</Text>
              <Text style={styles.addressText}>{member.address}</Text>
            </View>
          )}

          <Text style={styles.joinDate}>
            Member since: {formatDate(member.createdAt)}
          </Text>
        </View>

        {/* Wallet Information */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            <Icon name="wallet-outline" size={20} color="#ff8c1a" /> Wallet
            Information
          </Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ff8c1a" />
              <Text style={styles.loadingText}>
                Loading wallet information...
              </Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Icon name="wallet-outline" size={48} color="#ccc" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.createWalletButton}
                onPress={handleCreateWallet}
              >
                <Text style={styles.createWalletText}>Create Wallet</Text>
              </TouchableOpacity>
            </View>
          ) : wallet ? (
            <View style={styles.walletDetails}>
              <View style={styles.balanceContainer}>
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={styles.balanceAmount}>
                  {formatCurrency(wallet.balance)}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.addAmountButton,
                    !memberStatus && styles.disabledButton,
                  ]}
                  onPress={() => {
                    if (!memberStatus) {
                      Alert.alert(
                        'Error',
                        'Cannot add amount. Member is inactive.',
                      );
                      return;
                    }
                    setShowAddAmountModal(true);
                  }}
                  disabled={!memberStatus}
                >
                  <Icon
                    name="add-circle"
                    size={18}
                    color={memberStatus ? '#fff' : '#999'}
                  />
                  <Text
                    style={[
                      styles.addAmountButtonText,
                      !memberStatus && styles.disabledButtonText,
                    ]}
                  >
                    Add Amount
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.walletInfoRow}>
                <View style={styles.walletInfoItem}>
                  <Text style={styles.walletInfoLabel}>Wallet ID</Text>
                  <Text style={styles.walletInfoValue}>{wallet.id}</Text>
                </View>
                <View style={styles.walletInfoItem}>
                  <Text style={styles.walletInfoLabel}>Currency</Text>
                  <Text style={styles.walletInfoValue}>
                    {wallet.currency || 'INR'}
                  </Text>
                </View>
              </View>

              <View style={styles.walletInfoRow}>
                <View style={styles.walletInfoItem}>
                  <Text style={styles.walletInfoLabel}>Status</Text>
                  <Text
                    style={[
                      styles.walletInfoValue,
                      wallet.is_active
                        ? styles.activeText
                        : styles.inactiveText,
                    ]}
                  >
                    {wallet.is_active ? 'Active' : 'Inactive'}
                  </Text>
                </View>
                <View style={styles.walletInfoItem}>
                  <Text style={styles.walletInfoLabel}>Created</Text>
                  <Text style={styles.walletInfoValue}>
                    {formatDate(wallet.createdAt)}
                  </Text>
                </View>
              </View>

              {wallet.qr_code &&
                typeof wallet.qr_code === 'string' &&
                wallet.qr_code.trim() !== '' && (
                  <View style={styles.qrContainer}>
                    <Text style={styles.qrLabel}>QR Code</Text>
                    <Image
                      source={{ uri: wallet.qr_code }}
                      style={styles.qrImage}
                      resizeMode="contain"
                      onError={error => {
                        console.log(
                          'QR Image load error:',
                          error.nativeEvent.error,
                        );
                      }}
                    />
                  </View>
                )}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Add Amount Modal */}
      <Modal
        visible={showAddAmountModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAmountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Amount to Wallet</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddAmountModal(false);
                  setAddAmount('');
                }}
                style={styles.closeButton}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.currentBalanceLabel}>Current Balance</Text>
              <Text style={styles.currentBalanceValue}>
                {formatCurrency(wallet?.balance)}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount to Add (₹)</Text>
                <TextInput
                  style={styles.amountInput}
                  value={addAmount}
                  onChangeText={setAddAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Quick amount buttons */}
              <View style={styles.quickAmountRow}>
                {[100, 500, 1000, 2000].map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setAddAmount(amount.toString())}
                  >
                    <Text style={styles.quickAmountText}>₹{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowAddAmountModal(false);
                  setAddAmount('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  addingAmount && styles.disabledButton,
                ]}
                onPress={handleAddAmount}
                disabled={addingAmount}
              >
                {addingAmount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Add Amount</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f6f6',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },

  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },

  placeholder: {
    width: 40,
  },

  content: {
    flex: 1,
    padding: 16,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  memberInfo: {
    flex: 1,
    marginLeft: 12,
  },

  memberName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },

  memberPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },

  memberEmail: {
    fontSize: 14,
    color: '#666',
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },

  activeBadge: {
    backgroundColor: '#e6f6ee',
  },

  inactiveBadge: {
    backgroundColor: '#fdecec',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  addressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  addressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },

  addressText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  joinDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    fontStyle: 'italic',
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },

  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },

  errorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },

  errorText: {
    fontSize: 14,
    color: '#666',
    marginVertical: 12,
    textAlign: 'center',
  },

  createWalletButton: {
    backgroundColor: '#ff8c1a',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
  },

  createWalletText: {
    color: '#fff',
    fontWeight: '600',
  },

  walletDetails: {
    paddingTop: 8,
  },

  balanceContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 16,
  },

  balanceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },

  balanceAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ff8c1a',
  },

  walletInfoRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  walletInfoItem: {
    flex: 1,
  },

  walletInfoLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  walletInfoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },

  activeText: {
    color: '#4CAF50',
  },

  inactiveText: {
    color: '#f44336',
  },

  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },

  qrLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },

  qrImage: {
    width: 150,
    height: 150,
  },

  // Status Toggle Styles
  statusToggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },

  statusToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  statusToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  statusToggleRight: {
    minWidth: 50,
    alignItems: 'flex-end',
  },

  activeStatusText: {
    color: '#4CAF50',
  },

  inactiveStatusText: {
    color: '#f44336',
  },

  // Add Amount Button Styles
  addAmountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff8c1a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },

  addAmountButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },

  disabledButtonText: {
    color: '#999',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
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
    color: '#333',
  },

  closeButton: {
    padding: 5,
  },

  modalBody: {
    paddingVertical: 10,
  },

  currentBalanceLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  currentBalanceValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ff8c1a',
    textAlign: 'center',
    marginBottom: 20,
  },

  inputGroup: {
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },

  amountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    color: '#333',
    backgroundColor: '#f9f9f9',
    textAlign: 'center',
  },

  quickAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  quickAmountButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },

  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },

  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },

  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },

  submitButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#ff8c1a',
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },

  disabledButton: {
    backgroundColor: '#ccc',
  },
});
