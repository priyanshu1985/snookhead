import React, { useState, useEffect, useCallback } from 'react';
import { Pencil, Users, X, Trash2, XCircle, Plus, Calendar } from 'lucide-react-native';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { employeeAPI, attendanceAPI } from '../../services/api';

export default function EmployeeManagement({ navigation }) {
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    salary_type: 'monthly',
    salary_amount: '',
  });

  // Attendance states
  const [attendanceModalVisible, setAttendanceModalVisible] = useState(false);
  const [selectedEmployeeForAttendance, setSelectedEmployeeForAttendance] =
    useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await employeeAPI.getAll();
      // Filter to show only staff and manager roles
      const filteredEmployees = data.filter(
        emp => emp.role === 'staff' || emp.role === 'manager',
      );
      setEmployees(filteredEmployees);
    } catch (error) {
      console.error('Error fetching employees:', error);
      Alert.alert('Error', 'Failed to load employees');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  }, [fetchEmployees]);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      password: '',
      role: 'staff',
      salary_type: 'monthly',
      salary_amount: '',
    });
    setSelectedEmployee(null);
    setEditMode(false);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = employee => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name,
      email: employee.email,
      phone: employee.phone || '',
      password: '', // Don't show password
      role: employee.role,
      salary_type: employee.salary_type || 'monthly',
      salary_amount: employee.salary_amount
        ? String(employee.salary_amount)
        : '',
    });
    setEditMode(true);
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Name is required');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email is required');
      return false;
    }
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email');
      return false;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Phone is required');
      return false;
    }
    // Phone validation (10 digits)
    if (formData.phone.length !== 10 || !/^\d+$/.test(formData.phone)) {
      Alert.alert('Validation Error', 'Phone must be 10 digits');
      return false;
    }
    if (!editMode && !formData.password) {
      Alert.alert('Validation Error', 'Password is required for new employees');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        salary_type: formData.salary_type,
        salary_amount: parseFloat(formData.salary_amount) || 0,
      };

      if (editMode) {
        // Update employee
        await employeeAPI.update(selectedEmployee.id, payload);
        Alert.alert('Success', 'Employee updated successfully');
      } else {
        // Create new employee
        payload.password = formData.password;
        await employeeAPI.create(payload);
        Alert.alert('Success', 'Employee created successfully');
      }

      setModalVisible(false);
      resetForm();
      await fetchEmployees();
    } catch (error) {
      console.error('Error saving employee:', error);
      Alert.alert('Error', error.message || 'Failed to save employee');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = employeeId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this employee?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await employeeAPI.delete(employeeId);
              Alert.alert('Success', 'Employee deleted successfully');
              await fetchEmployees();
            } catch (error) {
              console.error('Error deleting employee:', error);
              Alert.alert('Error', 'Failed to delete employee');
            }
          },
        },
      ],
    );
  };

  const getInitials = name => {
    const names = name.split(' ');
    if (names.length >= 2) {
      return names[0][0] + names[1][0];
    }
    return name.substring(0, 2);
  };

  const getRoleBadgeColor = role => {
    switch (role) {
      case 'manager':
        return { bg: '#E3F2FD', text: '#1976D2' };
      case 'staff':
        return { bg: '#F3E5F5', text: '#7B1FA2' };
      default:
        return { bg: '#E0E0E0', text: '#616161' };
    }
  };

  const openAttendanceModal = async employee => {
    setSelectedEmployeeForAttendance(employee);
    setAttendanceModalVisible(true);
    setAttendanceLoading(true);

    try {
      const activeShiftData = await attendanceAPI.getActive(employee.id);
      setActiveShift(activeShiftData);
    } catch (error) {
      console.error('Error fetching active shift:', error);
      setActiveShift(null);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedEmployeeForAttendance) return;

    try {
      setAttendanceLoading(true);
      await attendanceAPI.checkIn(selectedEmployeeForAttendance.id);
      Alert.alert(
        'Success',
        `${selectedEmployeeForAttendance.name} has been checked in`,
      );

      // Refresh active shift
      const activeShiftData = await attendanceAPI.getActive(
        selectedEmployeeForAttendance.id,
      );
      setActiveShift(activeShiftData);
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Error', error.message || 'Failed to check in employee');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedEmployeeForAttendance || !activeShift) return;

    try {
      setAttendanceLoading(true);
      await attendanceAPI.checkOut(
        selectedEmployeeForAttendance.id,
        activeShift.id,
      );
      Alert.alert(
        'Success',
        `${selectedEmployeeForAttendance.name} has been checked out`,
      );
      setActiveShift(null);
      setAttendanceModalVisible(false);
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Error', error.message || 'Failed to check out employee');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const renderEmployee = ({ item }) => {
    const roleColors = getRoleBadgeColor(item.role);

    return (
      <TouchableOpacity
        style={styles.employeeCard}
        onPress={() => openAttendanceModal(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {getInitials(item.name).toUpperCase()}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>{item.name}</Text>
          <View style={[styles.roleBadge, { backgroundColor: roleColors.bg }]}>
            <Text style={[styles.roleText, { color: roleColors.text }]}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
          <Text style={styles.employeePhone}>{item.phone || 'No phone'}</Text>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={e => {
            e.stopPropagation();
            openEditModal(item);
          }}
        >
          <Pencil size={20} color="#FF8C42" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Employee List */}
      {isLoading && employees.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={employees}
          renderItem={renderEmployee}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF8C42']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No employees found</Text>
              <Text style={styles.emptySubtext}>
                Tap the Add button to create your first employee
              </Text>
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editMode ? 'Edit Employee' : 'Add Employee'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={text =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter full name"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={text =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="Enter email address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!editMode} // Email can't be changed in edit mode
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={text =>
                    setFormData({ ...formData, phone: text })
                  }
                  placeholder="Enter 10-digit phone number"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              {/* Password (only for new employees) */}
              {!editMode && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.password}
                    onChangeText={text =>
                      setFormData({ ...formData, password: text })
                    }
                    placeholder="Enter password"
                    placeholderTextColor="#999"
                    secureTextEntry
                  />
                </View>
              )}

              {/* Role */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'staff' && styles.roleButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, role: 'staff' })}
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'staff' &&
                          styles.roleButtonTextActive,
                      ]}
                    >
                      Staff
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.role === 'manager' && styles.roleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, role: 'manager' })
                    }
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.role === 'manager' &&
                          styles.roleButtonTextActive,
                      ]}
                    >
                      Manager
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Salary Type */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Salary Type</Text>
                <View style={styles.roleButtons}>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.salary_type === 'monthly' &&
                        styles.roleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, salary_type: 'monthly' })
                    }
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.salary_type === 'monthly' &&
                          styles.roleButtonTextActive,
                      ]}
                    >
                      Monthly
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.roleButton,
                      formData.salary_type === 'hourly' &&
                        styles.roleButtonActive,
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, salary_type: 'hourly' })
                    }
                  >
                    <Text
                      style={[
                        styles.roleButtonText,
                        formData.salary_type === 'hourly' &&
                          styles.roleButtonTextActive,
                      ]}
                    >
                      Hourly
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Salary Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Salary Amount</Text>
                <TextInput
                  style={styles.input}
                  value={formData.salary_amount}
                  onChangeText={text =>
                    setFormData({ ...formData, salary_amount: text })
                  }
                  placeholder="Enter salary amount"
                  placeholderTextColor="#999"
                  keyboardType="numeric"
                />
              </View>

              {/* Delete Button (only in edit mode) */}
              {editMode && (
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => {
                    setModalVisible(false);
                    handleDelete(selectedEmployee.id);
                  }}
                >
                  <Trash2 size={20} color="#FF5252" />
                  <Text style={styles.deleteButtonText}>Delete Employee</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSave}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editMode ? 'Update' : 'Save'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Attendance Check-In/Check-Out Modal */}
      <Modal
        visible={attendanceModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setAttendanceModalVisible(false);
          setSelectedEmployeeForAttendance(null);
          setActiveShift(null);
        }}
      >
        <View style={styles.attendanceModalOverlay}>
          <View style={styles.attendanceModalContent}>
            <View style={styles.attendanceModalHeader}>
              <Text style={styles.attendanceModalTitle}>⏰ Attendance</Text>
              <TouchableOpacity
                onPress={() => {
                  setAttendanceModalVisible(false);
                  setSelectedEmployeeForAttendance(null);
                  setActiveShift(null);
                }}
              >
                <XCircle size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedEmployeeForAttendance && (
              <View style={styles.employeeInfoSection}>
                <View style={styles.attendanceAvatar}>
                  <Text style={styles.attendanceAvatarText}>
                    {getInitials(
                      selectedEmployeeForAttendance.name,
                    ).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.attendanceEmployeeName}>
                  {selectedEmployeeForAttendance.name}
                </Text>
                <Text style={styles.attendanceEmployeeRole}>
                  {selectedEmployeeForAttendance.role.charAt(0).toUpperCase() +
                    selectedEmployeeForAttendance.role.slice(1)}
                </Text>
              </View>
            )}

            {attendanceLoading ? (
              <View style={styles.attendanceLoadingContainer}>
                <ActivityIndicator size="large" color="#FF8C42" />
                <Text style={styles.attendanceLoadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                {activeShift ? (
                  <View style={styles.activeShiftSection}>
                    <View style={styles.statusBadge}>
                      <MaterialCommunityIcons
                        name="clock-check"
                        size={20}
                        color="#4CAF50"
                      />
                      <Text style={styles.statusBadgeText}>Checked In</Text>
                    </View>

                    <View style={styles.shiftDetailsCard}>
                      <View style={styles.shiftDetailRow}>
                        <MaterialCommunityIcons
                          name="clock-start"
                          size={20}
                          color="#666"
                        />
                        <Text style={styles.shiftDetailLabel}>
                          Check In Time:
                        </Text>
                        <Text style={styles.shiftDetailValue}>
                          {new Date(
                            activeShift.check_in_time,
                          ).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      <View style={styles.shiftDetailRow}>
                        <Calendar
                          size={20}
                          color="#666"
                        />
                        <Text style={styles.shiftDetailLabel}>Date:</Text>
                        <Text style={styles.shiftDetailValue}>
                          {new Date(
                            activeShift.check_in_time,
                          ).toLocaleDateString()}
                        </Text>
                      </View>

                      {activeShift.status && (
                        <View style={styles.shiftDetailRow}>
                          <MaterialCommunityIcons
                            name="information"
                            size={20}
                            color="#666"
                          />
                          <Text style={styles.shiftDetailLabel}>Status:</Text>
                          <Text
                            style={[
                              styles.shiftDetailValue,
                              styles.statusValue,
                            ]}
                          >
                            {activeShift.status}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      style={styles.checkOutButton}
                      onPress={handleCheckOut}
                      disabled={attendanceLoading}
                    >
                      <MaterialCommunityIcons
                        name="logout-variant"
                        size={24}
                        color="#FFFFFF"
                      />
                      <Text style={styles.checkOutButtonText}>Check Out</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.noActiveShiftSection}>
                    <MaterialCommunityIcons
                      name="clock-alert-outline"
                      size={64}
                      color="#CCCCCC"
                    />
                    <Text style={styles.noShiftText}>Not Checked In</Text>
                    <Text style={styles.noShiftSubtext}>
                      Employee is currently not checked in
                    </Text>

                    <TouchableOpacity
                      style={styles.checkInButton}
                      onPress={handleCheckIn}
                      disabled={attendanceLoading}
                    >
                      <MaterialCommunityIcons
                        name="login-variant"
                        size={24}
                        color="#FFFFFF"
                      />
                      <Text style={styles.checkInButtonText}>Check In</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Plus size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  employeeCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '600',
  },
  employeePhone: {
    fontSize: 13,
    color: '#999',
  },
  editButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#CCCCCC',
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#FFFFFF',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  roleButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: 8,
    marginTop: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF5252',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  // Attendance Modal Styles
  attendanceModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  attendanceModalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 0,
    maxHeight: '80%',
  },
  attendanceModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  attendanceModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  employeeInfoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  attendanceAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  attendanceAvatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  attendanceEmployeeName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  attendanceEmployeeRole: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
  },
  attendanceLoadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendanceLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999',
  },
  activeShiftSection: {
    padding: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  statusBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4CAF50',
    marginLeft: 8,
  },
  shiftDetailsCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  shiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  shiftDetailLabel: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    flex: 1,
  },
  shiftDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  statusValue: {
    textTransform: 'capitalize',
  },
  checkOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5252',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#FF5252',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  checkOutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  noActiveShiftSection: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noShiftText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  noShiftSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    elevation: 2,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
