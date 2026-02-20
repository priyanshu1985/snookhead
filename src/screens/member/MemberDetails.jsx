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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

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
  const [showAddAmountModal, setShowAddAmountModal] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [addingAmount, setAddingAmount] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

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
      }
    } catch (error) {
      console.error('Error fetching member data:', error);
    }
  };

  // Fetch wallet transactions
  const fetchTransactions = async () => {
    if (!wallet?.id) return;

    try {
      setLoadingTransactions(true);
      const token = await getAuthToken();

      const response = await fetch(
        `${API_URL}/api/wallets/${wallet.id}/transactions`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const transactionsData = await response.json();
        setTransactions(transactionsData);
      } else {
        console.error('Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoadingTransactions(false);
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

  // Fetch transactions when wallet changes
  React.useEffect(() => {
    if (wallet?.id) {
      fetchTransactions();
    }
  }, [wallet?.id]);

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

  // Add amount to wallet
  const handleAddAmount = async () => {
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
        fetchTransactions(); // Refresh transaction history
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

  // Generate simple wallet ID from UUID
  const generateSimpleWalletId = uuid => {
    if (!uuid) return '1000';
    // Create a hash from UUID to generate consistent numeric ID
    let hash = 0;
    for (let i = 0; i < uuid.length; i++) {
      const char = uuid.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Ensure positive number starting from 1000
    const simpleId = 1000 + Math.abs(hash % 90000);
    return simpleId.toString();
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
                  style={styles.addAmountButton}
                  onPress={() => setShowAddAmountModal(true)}
                >
                  <Icon name="add-circle" size={18} color="#fff" />
                  <Text style={styles.addAmountButtonText}>Add Amount</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.walletInfoRow}>
                <View style={styles.walletInfoItem}>
                  <Text style={styles.walletInfoLabel}>Wallet ID</Text>
                  <Text style={styles.walletInfoValue}>
                    {generateSimpleWalletId(wallet.id)}
                  </Text>
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

        {/* Transaction History */}
        {wallet && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              <Icon name="receipt-outline" size={20} color="#ff8c1a" />{' '}
              Transaction History
            </Text>

            {loadingTransactions ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#ff8c1a" />
                <Text style={styles.loadingText}>Loading transactions...</Text>
              </View>
            ) : transactions.length === 0 ? (
              <View style={styles.emptyTransactionsContainer}>
                <Icon name="receipt-outline" size={48} color="#ccc" />
                <Text style={styles.emptyTransactionsText}>
                  No transactions yet
                </Text>
              </View>
            ) : (
              <View style={styles.transactionsList}>
                {transactions.map((transaction, index) => {
                  // Determine if it's actually a credit based on description or amount
                  const isCredit =
                    transaction.type === 'CREDIT' ||
                    transaction.type === 'TOPUP' ||
                    (transaction.description &&
                      (transaction.description
                        .toLowerCase()
                        .includes('added') ||
                        transaction.description
                          .toLowerCase()
                          .includes('topup')));

                  return (
                    <View
                      key={transaction.id || index}
                      style={[
                        styles.transactionItem,
                        index === transactions.length - 1 &&
                          styles.transactionItemLast,
                      ]}
                    >
                      <View style={styles.transactionLeft}>
                        <View
                          style={[
                            styles.transactionIcon,
                            isCredit ? styles.creditIcon : styles.debitIcon,
                          ]}
                        >
                          <Icon
                            name={isCredit ? 'add-circle' : 'remove-circle'}
                            size={20}
                            color={isCredit ? '#4CAF50' : '#F44336'}
                          />
                        </View>
                        <View style={styles.transactionDetails}>
                          <Text style={styles.transactionType}>
                            {isCredit
                              ? 'Money Added in Wallet'
                              : 'Money Deducted'}
                          </Text>
                          {transaction.description && (
                            <Text style={styles.transactionDescription}>
                              {transaction.description}
                            </Text>
                          )}
                          <Text style={styles.transactionDate}>
                            {formatDate(
                              transaction.created_at || transaction.createdAt,
                            )}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.transactionRight}>
                        <Text
                          style={[
                            styles.transactionAmount,
                            isCredit ? styles.creditAmount : styles.debitAmount,
                          ]}
                        >
                          {isCredit ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Amount Modal - Replaced with Absolute View */}
      {showAddAmountModal && (
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
        </View>
      )}
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

  // Transaction History Styles
  emptyTransactionsContainer: {
    alignItems: 'center',
    paddingVertical: 30,
  },

  emptyTransactionsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 12,
  },

  transactionsList: {
    marginTop: 12,
  },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },

  transactionItemLast: {
    borderBottomWidth: 0,
  },

  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  creditIcon: {
    backgroundColor: '#E8F5E9',
  },

  debitIcon: {
    backgroundColor: '#FFEBEE',
  },

  transactionDetails: {
    flex: 1,
  },

  transactionType: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },

  transactionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },

  transactionDate: {
    fontSize: 12,
    color: '#999',
  },

  transactionRight: {
    alignItems: 'flex-end',
  },

  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },

  creditAmount: {
    color: '#4CAF50',
  },

  debitAmount: {
    color: '#F44336',
  },
});
