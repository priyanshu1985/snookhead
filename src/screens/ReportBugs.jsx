import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function ReportBugs({ navigation }) {
  const [bugTitle, setBugTitle] = useState('');
  const [bugDescription, setBugDescription] = useState('');
  const [severity, setSeverity] = useState('Medium');

  const severities = ['Low', 'Medium', 'High', 'Critical'];

  const handleSubmit = () => {
    if (!bugTitle.trim() || !bugDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    Alert.alert(
      'Success',
      'Bug report submitted! Thank you for helping us improve.',
      [
        {
          text: 'OK',
          onPress: () => {
            setBugTitle('');
            setBugDescription('');
            setSeverity('Medium');
          },
        },
      ],
    );
  };

  return (
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
        />

        {/* Severity */}
        <Text style={styles.label}>Severity Level *</Text>
        <View style={styles.severityContainer}>
          {severities.map(sev => (
            <TouchableOpacity
              key={sev}
              style={[
                styles.severityBtn,
                severity === sev && styles.severityBtnActive,
                {
                  borderColor:
                    sev === 'Low'
                      ? '#4CAF50'
                      : sev === 'Medium'
                      ? '#FFC107'
                      : sev === 'High'
                      ? '#FF8C42'
                      : '#FF5252',
                  backgroundColor:
                    severity === sev
                      ? sev === 'Low'
                        ? '#4CAF50'
                        : sev === 'Medium'
                        ? '#FFC107'
                        : sev === 'High'
                        ? '#FF8C42'
                        : '#FF5252'
                      : '#fff',
                },
              ]}
              onPress={() => setSeverity(sev)}
            >
              <Text
                style={[
                  styles.severityText,
                  severity === sev && { color: '#fff' },
                ]}
              >
                {sev}
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
        />

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Icon name="send" size={20} color="#fff" />
          <Text style={styles.submitBtnText}>Submit Report</Text>
        </TouchableOpacity>

        {/* Info */}
        <Text style={styles.infoText}>
          📧 Your report will be reviewed by our support team within 24 hours
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
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
  severityContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  severityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  severityBtnActive: {
    borderWidth: 2,
  },
  severityText: {
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
