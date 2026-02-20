import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

export default function QueueSuccessModal({
  visible,
  onClose,
  tableNumber,
  customerName,
  date,
  mobile,
  tablePreference,
  members,
  timeSpan,
}) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.tableNumber}>{tableNumber}</Text>
            <Text style={styles.billNumber}>Bill 1</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <View style={styles.row}>
              <Text style={styles.label}>Name :</Text>
              <Text style={styles.value}>{customerName}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Date :</Text>
              <Text style={styles.value}>{date}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Mobile No. :</Text>
              <Text style={styles.value}>{mobile}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Table Preference :</Text>
              <Text style={styles.value}>{tablePreference}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>No Of Members.: :</Text>
              <Text style={styles.value}>{members}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Time Span :</Text>
              <Text style={styles.value}>{timeSpan}</Text>
            </View>

            <Text style={styles.successMessage}>
              Queue successfully Booked!
            </Text>

            <TouchableOpacity style={styles.editButton} onPress={onClose}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  billNumber: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  content: {
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    width: 140,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
  },
  successMessage: {
    fontSize: 16,
    color: '#FF8C42',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '600',
  },
  editButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  editButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
});
