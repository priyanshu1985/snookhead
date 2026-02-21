import React, { useEffect, useState } from 'react';
import { ChevronRight, ArrowLeft, Search, XCircle, Users, X } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const Members = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Form data state matching backend customer API requirements
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    external_id: '',
  });

  // Fetch customers from backend
  const fetchMembers = async () => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/customer`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const customers = await response.json();
        setMembers(customers);
        setFilteredMembers(customers); // Initialize filtered members
      } else {
        console.error('Failed to fetch customers');
      }
    } catch (error) {
      console.log('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Add new customer function
  const handleAddMember = async () => {
    if (!formData.name.trim() || !formData.phone.trim()) {
      Alert.alert('Error', 'Name and phone are required');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{7,15}$/;
    if (!phoneRegex.test(formData.phone.trim())) {
      Alert.alert('Error', 'Please enter a valid phone number');
      return;
    }

    // Email validation if provided
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        Alert.alert('Error', 'Please enter a valid email address');
        return;
      }
    }

    setAddingMember(true);
    try {
      const token = await getAuthToken();

      if (!token) {
        Alert.alert('Error', 'Please login first');
        setAddingMember(false);
        return;
      }

      console.log('Sending data:', {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address: formData.address.trim() || null,
        external_id: formData.external_id.trim() || null,
      });

      const response = await fetch(`${API_URL}/api/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          external_id: formData.external_id.trim() || null,
        }),
      });

      const result = await response.json();
      console.log('API Response:', response.status, result);

      if (response.ok) {
        Alert.alert('Success', 'Member added successfully');
        setShowAddModal(false);
        setFormData({
          name: '',
          phone: '',
          email: '',
          address: '',
          external_id: '',
        });
        fetchMembers(); // Refresh the list
      } else {
        // Handle specific error messages
        let errorMessage = result.error || 'Failed to add member';

        if (response.status === 403) {
          errorMessage =
            'You do not have permission to add members. Please contact admin.';
        } else if (response.status === 401) {
          errorMessage = 'Your session has expired. Please login again.';
        } else if (errorMessage.includes('phone')) {
          errorMessage = 'This phone number is already registered';
        } else if (errorMessage.includes('email')) {
          errorMessage = 'This email address is already registered';
        } else if (errorMessage.includes('external_id')) {
          errorMessage = 'This member ID is already in use';
        }

        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error adding member:', error);
      Alert.alert(
        'Error',
        'Network error. Please check your connection and try again.',
      );
    } finally {
      setAddingMember(false);
    }
  };

  // Search functionality
  const handleSearch = text => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredMembers(members);
    } else {
      const filtered = members.filter(member =>
        member.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredMembers(filtered);
    }
  };

  // Toggle search input
  const toggleSearch = () => {
    setShowSearch(!showSearch);
    if (showSearch) {
      setSearchQuery('');
      setFilteredMembers(members);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('MemberDetails', { member: item })}
      activeOpacity={0.7}
    >
      <View>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
        <Text style={styles.meta}>
          {item.email || 'No email'} •{' '}
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <ChevronRight
        size={20}
        color="#ccc"
        style={styles.chevron}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Members</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <Search size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addBtnText}>+ Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <Search
              size={16}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search members by name..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearchQuery('');
                  setFilteredMembers(members);
                }}
                style={styles.clearButton}
              >
                <XCircle size={16} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Content */}
        {loading ? (
          <ActivityIndicator size="large" color="#ff8c1a" />
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={item => item.id.toString()}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Users size={48} color="#ccc" />
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No members found matching your search'
                    : 'No members found'}
                </Text>
                {searchQuery && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => {
                      setSearchQuery('');
                      setFilteredMembers(members);
                    }}
                  >
                    <Text style={styles.clearSearchText}>Clear Search</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        {/* Add Member Modal - Replaced with Absolute View */}
        {showAddModal && (
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
                {/* Header */}
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add New Member</Text>
                  <TouchableOpacity
                    onPress={() => setShowAddModal(false)}
                    style={styles.closeButton}
                  >
                    <X size={24} color="#666" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.formContainer}
                  showsVerticalScrollIndicator={false}
                >
                  {/* Name Field - Required */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Name for this member</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={text =>
                        setFormData(prev => ({ ...prev, name: text }))
                      }
                      placeholder="Enter person's name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Phone Field - Required */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone number</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.phone}
                      onChangeText={text =>
                        setFormData(prev => ({ ...prev, phone: text }))
                      }
                      placeholder="Enter phone number"
                      placeholderTextColor="#999"
                      keyboardType="phone-pad"
                    />
                  </View>

                  {/* Email Field - Optional */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email address</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={text =>
                        setFormData(prev => ({ ...prev, email: text }))
                      }
                      placeholder="Enter email address"
                      placeholderTextColor="#999"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Address Field - Optional */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={formData.address}
                      onChangeText={text =>
                        setFormData(prev => ({ ...prev, address: text }))
                      }
                      placeholder="Enter address"
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* External ID Field - Optional */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Member ID (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.external_id}
                      onChangeText={text =>
                        setFormData(prev => ({ ...prev, external_id: text }))
                      }
                      placeholder="Enter member ID"
                      placeholderTextColor="#999"
                    />
                  </View>
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      addingMember && styles.disabledButton,
                    ]}
                    onPress={handleAddMember}
                    disabled={addingMember}
                  >
                    {addingMember ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>Add Member</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowAddModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default Members;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f6f6f6',
    marginTop: 30,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },

  backButton: {
    padding: 8,
    marginRight: 8,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  searchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },

  addBtn: {
    backgroundColor: '#ff8c1a',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },

  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  searchIcon: {
    marginRight: 8,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
  },

  clearButton: {
    padding: 4,
    marginLeft: 8,
  },

  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },

  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 20,
  },

  clearSearchButton: {
    backgroundColor: '#ff8c1a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },

  clearSearchText: {
    color: '#fff',
    fontWeight: '600',
  },

  card: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  chevron: {
    marginLeft: 8,
  },

  name: {
    fontSize: 16,
    fontWeight: '600',
  },

  phone: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },

  meta: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '85%',
    maxWidth: 380,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 0,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },

  closeButton: {
    position: 'absolute',
    right: 16,
    top: 18,
    padding: 4,
  },

  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    marginBottom: 8,
  },

  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },

  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },

  modalFooter: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },

  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },

  cancelButtonText: {
    fontSize: 15,
    color: '#666',
    fontWeight: '600',
  },

  submitButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },

  submitButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },

  disabledButton: {
    backgroundColor: '#CCC',
    shadowOpacity: 0,
    elevation: 0,
  },
});
