import React, { useEffect, useState } from 'react';
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

      <View style={styles.cardRight}>
        <View
          style={[
            styles.status,
            item.is_active ? styles.active : styles.inactive,
          ]}
        >
          <Text style={styles.statusText}>
            {item.is_active ? 'ACTIVE' : 'INACTIVE'}
          </Text>
        </View>
        <Icon
          name="chevron-forward"
          size={20}
          color="#ccc"
          style={styles.chevron}
        />
      </View>
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
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Members</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <Icon name="search" size={20} color="#666" />
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
            <Icon
              name="search"
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
                <Icon name="close-circle" size={16} color="#999" />
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
                <Icon name="people-outline" size={48} color="#ccc" />
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

        {/* Add Member Modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add New Member</Text>
                <TouchableOpacity
                  onPress={() => setShowAddModal(false)}
                  style={styles.closeButton}
                >
                  <Icon name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                {/* Name Field - Required */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.name}
                    onChangeText={text =>
                      setFormData(prev => ({ ...prev, name: text }))
                    }
                    placeholder="Enter member name"
                    placeholderTextColor="#999"
                  />
                </View>

                {/* Phone Field - Required */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Phone *</Text>
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
                  <Text style={styles.label}>Email</Text>
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
                    placeholder="Enter external member ID"
                    placeholderTextColor="#999"
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

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
              </View>
            </View>
          </View>
        </Modal>
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

  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
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

  status: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },

  active: {
    backgroundColor: '#e6f6ee',
  },

  inactive: {
    backgroundColor: '#fdecec',
  },

  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal styles
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
    maxHeight: '80%',
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

  formContainer: {
    maxHeight: '70%',
  },

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#f9f9f9',
  },

  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
