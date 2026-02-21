import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Wallet, Receipt, X, Plus } from 'lucide-react-native';
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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { expensesAPI } from '../../services/api';

const CATEGORIES = [
  'Salary',
  'Utilities',
  'Maintenance',
  'Inventory',
  'Marketing',
  'Other',
];

export default function ExpenseManagement({ navigation }) {
  const [expenses, setExpenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Other',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await expensesAPI.getAll();
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchExpenses();
    setRefreshing(false);
  }, [fetchExpenses]);

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      category: 'Other',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return false;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return false;
    }
    if (!formData.date) {
      Alert.alert('Validation Error', 'Date is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      const payload = {
        title: formData.title,
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: formData.date,
        description: formData.description || null,
      };

      await expensesAPI.create(payload);
      Alert.alert('Success', 'Expense added successfully');
      setModalVisible(false);
      resetForm();
      await fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      Alert.alert('Error', error.message || 'Failed to save expense');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = expenseId => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await expensesAPI.delete(expenseId);
              Alert.alert('Success', 'Expense deleted successfully');
              await fetchExpenses();
            } catch (error) {
              console.error('Error deleting expense:', error);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ],
    );
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryIcon = category => {
    switch (category) {
      case 'Salary':
        return 'cash-outline';
      case 'Utilities':
        return 'flash-outline';
      case 'Maintenance':
        return 'build-outline';
      case 'Inventory':
        return 'cube-outline';
      case 'Marketing':
        return 'megaphone-outline';
      default:
        return 'receipt-outline';
    }
  };

  const getCategoryColor = category => {
    switch (category) {
      case 'Salary':
        return { bg: '#E3F2FD', text: '#1976D2' };
      case 'Utilities':
        return { bg: '#FFF3E0', text: '#F57C00' };
      case 'Maintenance':
        return { bg: '#F3E5F5', text: '#7B1FA2' };
      case 'Inventory':
        return { bg: '#E8F5E9', text: '#388E3C' };
      case 'Marketing':
        return { bg: '#FCE4EC', text: '#C2185B' };
      default:
        return { bg: '#F5F5F5', text: '#616161' };
    }
  };

  const getTotalExpenses = () => {
    return expenses.reduce(
      (sum, expense) => sum + parseFloat(expense.amount || 0),
      0,
    );
  };

  const renderExpense = ({ item }) => {
    const categoryColors = getCategoryColor(item.category);

    return (
      <View style={styles.expenseCard}>
        <View style={styles.expenseLeft}>
          <View
            style={[
              styles.categoryIconContainer,
              { backgroundColor: categoryColors.bg },
            ]}
          >
            <Icon
              name={getCategoryIcon(item.category)}
              size={24}
              color={categoryColors.text}
            />
          </View>
          <View style={styles.expenseInfo}>
            <Text style={styles.expenseTitle}>{item.title}</Text>
            <View style={styles.expenseMeta}>
              <View
                style={[
                  styles.categoryBadge,
                  { backgroundColor: categoryColors.bg },
                ]}
              >
                <Text
                  style={[styles.categoryText, { color: categoryColors.text }]}
                >
                  {item.category}
                </Text>
              </View>
              <Text style={styles.expenseDate}>{formatDate(item.date)}</Text>
            </View>
            {item.description && (
              <Text style={styles.expenseDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.expenseRight}>
          <Text style={styles.expenseAmount}>
            ₹{parseFloat(item.amount).toFixed(2)}
          </Text>
          <TouchableOpacity
            style={styles.deleteIconButton}
            onPress={() => handleDelete(item.id)}
          >
            <Trash2 size={18} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Total Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryContent}>
          <Wallet size={32} color="#FF8C42" />
          <View style={styles.summaryText}>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
            <Text style={styles.summaryAmount}>
              ₹{getTotalExpenses().toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      {/* Expense List */}
      {isLoading && expenses.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading expenses...</Text>
        </View>
      ) : (
        <FlatList
          data={expenses}
          renderItem={renderExpense}
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
              <Receipt size={64} color="#CCCCCC" />
              <Text style={styles.emptyText}>No expenses recorded</Text>
              <Text style={styles.emptySubtext}>
                Tap the Add button to record your first expense
              </Text>
            </View>
          }
        />
      )}

      {/* Add Expense Modal */}
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
              <Text style={styles.modalTitle}>Add Expense</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <X size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Title */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.title}
                  onChangeText={text =>
                    setFormData({ ...formData, title: text })
                  }
                  placeholder="E.g., Office supplies"
                  placeholderTextColor="#999"
                />
              </View>

              {/* Amount */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Amount *</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={formData.amount}
                    onChangeText={text =>
                      setFormData({ ...formData, amount: text })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Category */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Category *</Text>
                <View style={styles.categoryButtons}>
                  {CATEGORIES.map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryButton,
                        formData.category === category &&
                          styles.categoryButtonActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Icon
                        name={getCategoryIcon(category)}
                        size={16}
                        color={
                          formData.category === category ? '#FFFFFF' : '#666'
                        }
                      />
                      <Text
                        style={[
                          styles.categoryButtonText,
                          formData.category === category &&
                            styles.categoryButtonTextActive,
                        ]}
                      >
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Date *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.date}
                  onChangeText={text =>
                    setFormData({ ...formData, date: text })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
                <Text style={styles.helperText}>Format: YYYY-MM-DD</Text>
              </View>

              {/* Description */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={text =>
                    setFormData({ ...formData, description: text })
                  }
                  placeholder="Add notes about this expense..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>

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
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
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
  summaryCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
  expenseCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  expenseLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  expenseInfo: {
    flex: 1,
  },
  expenseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  expenseMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  expenseDate: {
    fontSize: 12,
    color: '#999',
  },
  expenseDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  expenseRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  expenseAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  deleteIconButton: {
    padding: 4,
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
  textArea: {
    minHeight: 100,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingLeft: 12,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  categoryButtonActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
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
});
