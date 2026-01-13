import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { bugsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ReportBugs({ navigation }) {
  const { user } = useAuth();
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [category, setCategory] = useState('App Issue');
  const [priority, setPriority] = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    'App Issue',
    'UI Problem',
    'Feature Request',
    'Performance',
    'Crash',
    'Other',
  ];
  const priorities = [
    { value: 'low', label: 'Low', color: '#4CAF50' },
    { value: 'medium', label: 'Medium', color: '#FFC107' },
    { value: 'high', label: 'High', color: '#FF8C42' },
    { value: 'critical', label: 'Critical', color: '#FF5252' },
  ];

  const handleSubmit = async () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    try {
      const bugData = {
        title: bugTitle.trim(),
        description: bugDescription.trim(),
        category,
        priority,
      };

      const response = await bugsAPI.create(bugData);

      if (response.success) {
        Alert.alert(
          'Success',
          'Bug report submitted successfully! Thank you for helping us improve.',
          [
            {
              text: 'OK',
              onPress: () => {
                setBugTitle('');
                setBugDescription('');
                setCategory('App Issue');
                setPriority('medium');
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        throw new Error('Failed to submit bug report');
      }
    } catch (error) {
      console.error('Error submitting bug report:', error);
      Alert.alert('Error', 'Failed to submit bug report. Please try again.', [
        { text: 'OK' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report a Bug</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.description}>
            Help us improve by reporting any issues you encounter
          </Text>

          {/* Bug Title */}
          <Text style={styles.label}>Bug Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Button not responding"
            value={bugTitle}
            onChangeText={setBugTitle}
            placeholderTextColor="#CCC"
            editable={!isSubmitting}
          />

          {/* Category */}
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryContainer}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBtn,
                  category === cat && styles.categoryBtnActive,
                ]}
                onPress={() => setCategory(cat)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.categoryText,
                    category === cat && {
                      color: '#FF8C42',
                      fontWeight: 'bold',
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority */}
          <Text style={styles.label}>Priority Level *</Text>
          <View style={styles.priorityContainer}>
            {priorities.map(pri => (
              <TouchableOpacity
                key={pri.value}
                style={[
                  styles.priorityBtn,
                  priority === pri.value && styles.priorityBtnActive,
                  {
                    borderColor: pri.color,
                    backgroundColor:
                      priority === pri.value ? pri.color : '#fff',
                  },
                ]}
                onPress={() => setPriority(pri.value)}
                disabled={isSubmitting}
              >
                <Text
                  style={[
                    styles.priorityText,
                    priority === pri.value && { color: '#fff' },
                  ]}
                >
                  {pri.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.descriptionInput]}
            placeholder="Describe the issue in detail..."
            value={bugDescription}
            onChangeText={setBugDescription}
            multiline
            numberOfLines={6}
            placeholderTextColor="#CCC"
            textAlignVertical="top"
            editable={!isSubmitting}
          />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="send" size={20} color="#fff" />
            )}
            <Text style={styles.submitBtnText}>
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </Text>
          </TouchableOpacity>

          {/* Info */}
          <Text style={styles.infoText}>
            📧 Your report will be reviewed by our support team within 24 hours
          </Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  description: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
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
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  descriptionInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
  },
  categoryBtnActive: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF8F5',
  },
  categoryText: {
    fontSize: 12,
    color: '#333',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  priorityBtnActive: {
    borderWidth: 2,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  submitBtn: {
    backgroundColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  submitBtnDisabled: {
    backgroundColor: '#FFB366',
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
  },
});
