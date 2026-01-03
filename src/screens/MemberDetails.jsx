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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const { member } = route.params;
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchWallet();
  }, [member.id]);

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
            <View
              style={[
                styles.statusBadge,
                member.is_active ? styles.activeBadge : styles.inactiveBadge,
              ]}
            >
              <Text style={styles.statusText}>
                {member.is_active ? 'ACTIVE' : 'INACTIVE'}
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
});
