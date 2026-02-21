import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config';

export default function BillPreviewModal({ visible, table, onClose }) {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  
  // Calculate states
  const [tableCharges, setTableCharges] = useState(0);
  const [menuCharges, setMenuCharges] = useState(0);
  const [totalBill, setTotalBill] = useState(0);
  const [billableMinutes, setBillableMinutes] = useState(0);

  useEffect(() => {
    if (visible && table && table.sessionId) {
      fetchOrdersAndCalculate();
    }
  }, [visible, table]);

  const fetchOrdersAndCalculate = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      
      // Fetch orders
      const response = await fetch(`${API_URL}/api/orders/by-session/${table.sessionId}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      let fetchedOrders = [];
      if (response.ok) {
        const result = await response.json();
        fetchedOrders = result.consolidated_items || [];
      }
      setOrders(fetchedOrders);

      // --- CALCULATIONS ---
      
      let calcTableCharges = 0;
      let calcBillableMinutes = 0;

      const isFrameMode = table.bookingType === 'frame';
      const isStopwatchMode = table.bookingType === 'timer'; // countdown UP
      // anything else is set_time (countdown DOWN)
      
      const currentTime = Date.now();
      let pricePerMin = parseFloat(table.pricePerMin || 10);
      if (pricePerMin > 100) pricePerMin = pricePerMin / 60; // Usually given as hourly if huge
      
      if (isFrameMode) {
        const frames = table.frameCount || 1;
        const pricePerFrame = parseFloat(table.frameCharge || table.pricePerFrame || 100);
        calcTableCharges = frames * pricePerFrame;
      } else {
        // Calculate minutes based on start time / duration
        const startTime = new Date(table.startTime || Date.now()).getTime();
        
        if (isStopwatchMode) {
          // Time elapsed
          const elapsedSecs = Math.max(0, Math.floor((currentTime - startTime) / 1000));
          calcBillableMinutes = Math.ceil(elapsedSecs / 60);
        } else {
          // Duration based
          const duration = parseInt(table.durationMinutes || 60);
          calcBillableMinutes = duration;
        }
        
        calcTableCharges = calcBillableMinutes * pricePerMin;
      }

      // Calculate menu charges
      const calcMenuCharges = fetchedOrders.reduce((sum, item) => {
        return sum + (parseFloat(item.price || 0) * (item.quantity || 1));
      }, 0);

      setBillableMinutes(calcBillableMinutes);
      setTableCharges(calcTableCharges);
      setMenuCharges(calcMenuCharges);
      setTotalBill(calcTableCharges + calcMenuCharges);

    } catch (error) {
      console.error('Error fetching preview details:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!table) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          
          <View style={styles.header}>
            <Text style={styles.title}>Bill Preview</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loaderArea}>
              <ActivityIndicator size="large" color="#FF8C42" />
              <Text style={styles.loadingText}>Fetching details...</Text>
            </View>
          ) : (
            <ScrollView style={styles.scrollContent}>
               <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Customer & Table</Text>
                  <Text style={styles.rowText}>Table: <Text style={styles.bold}>{table.name}</Text></Text>
                  <Text style={styles.rowText}>Type: <Text style={styles.bold}>{table.bookingType?.toUpperCase()}</Text></Text>
               </View>

               <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Table Charges</Text>
                  <View style={styles.flexRow}>
                    <Text style={styles.itemName}>
                      {table.bookingType === 'frame' 
                        ? `${table.frameCount || 1} Frames` 
                        : `${billableMinutes} mins`}
                    </Text>
                    <Text style={styles.itemPrice}>₹{tableCharges.toFixed(2)}</Text>
                  </View>
               </View>

               {orders.length > 0 && (
                 <View style={styles.section}>
                   <Text style={styles.sectionTitle}>Menu Items</Text>
                   {orders.map((item, index) => (
                     <View key={index} style={styles.flexRow}>
                       <Text style={styles.itemName}>{item.name} x{item.quantity}</Text>
                       <Text style={styles.itemPrice}>₹{(item.price * item.quantity).toFixed(2)}</Text>
                     </View>
                   ))}
                   <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalText}>Menu Subtotal: ₹{menuCharges.toFixed(2)}</Text>
                   </View>
                 </View>
               )}

               <View style={styles.totalBox}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>₹{totalBill.toFixed(2)}</Text>
               </View>
            </ScrollView>
          )}

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FFF8F5',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF8C42',
  },
  closeBtn: {
    padding: 4,
  },
  loaderArea: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#888',
    fontSize: 15,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 4,
  },
  rowText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  bold: {
    fontWeight: '700',
    color: '#222',
  },
  flexRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
  },
  subtotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
    alignItems: 'flex-end',
  },
  subtotalText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  totalBox: {
    backgroundColor: '#FFF8F5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE0CC',
    marginTop: 10,
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF8C42',
  },
});
