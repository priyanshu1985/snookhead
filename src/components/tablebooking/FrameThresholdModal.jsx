import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

const FrameThresholdModal = ({
  visible,
  onDismiss,
  onAddNextFrame,
  onCheckout,
  thresholdMinutes,
}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Icon name="warning" size={24} color="#D4A017" />
              <Text style={styles.headerTitle}>Frame Time Exceeded!</Text>
            </View>
            <TouchableOpacity onPress={onDismiss} style={styles.closeBtn}>
              <Icon name="close" size={24} color="#999" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.message}>
              The current frame has been playing for over{' '}
              <Text style={styles.boldText}>{thresholdMinutes} minutes</Text>.
            </Text>
            <Text style={styles.subMessage}>How would you like to proceed?</Text>

            {/* Actions */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.addFrameBtn]}
              onPress={onAddNextFrame}
            >
              <Text style={styles.addFrameBtnText}>+ Add Next Frame Charge</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.checkoutBtn]}
              onPress={onCheckout}
            >
              <Text style={styles.checkoutBtnText}>Close Game & Checkout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.dismissBtn]}
              onPress={onDismiss}
            >
              <Text style={styles.dismissBtnText}>Dismiss (Remind Later)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: width * 0.9,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF9E6', // Light yellow background
    borderBottomWidth: 1,
    borderBottomColor: '#FFEBB3',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B8860B', // Darker yellow/gold
    marginLeft: 10,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  message: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  boldText: {
    fontWeight: '700',
    color: '#000',
  },
  subMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    marginTop: 16,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  addFrameBtn: {
    backgroundColor: '#F36E10', // Vibrant orange
  },
  addFrameBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  checkoutBtn: {
    backgroundColor: '#D32F2F', // Material Red
  },
  checkoutBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dismissBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E91E63', // Pinkish/Red outline
  },
  dismissBtnText: {
    color: '#E91E63',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FrameThresholdModal;
