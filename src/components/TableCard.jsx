import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function TableCard({ table, color, onPress, onDelete }) {
  return (
    <TouchableOpacity
      style={[styles.card, { borderColor: color }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={e => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Icon name="trash-outline" size={18} color="#FF4444" />
      </TouchableOpacity>

      {/* Table Visual */}
      <View style={[styles.table, { backgroundColor: color }]}>
        <View style={styles.xLine} />
        <View style={[styles.xLine, styles.xLineRotated]} />
      </View>

      {/* Table Info */}
      <Text style={styles.tableName}>{table.name}</Text>
      <Text style={styles.price}>{table.price}</Text>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          table.status === 'occupied' ? styles.occupied : styles.available,
        ]}
      >
        <Text style={styles.statusText}>
          {table.status === 'occupied' ? `${table.time}` : 'Available'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    minHeight: 180,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    zIndex: 10,
  },
  table: {
    width: 80,
    height: 60,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  xLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#fff',
    opacity: 0.6,
  },
  xLineRotated: {
    transform: [{ rotate: '90deg' }],
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  price: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  available: {
    backgroundColor: '#E8F5E9',
  },
  occupied: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
});
