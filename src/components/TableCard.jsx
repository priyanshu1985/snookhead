import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const cardWidth = (width - 48) / 2; // 2 cards per row with spacing

export default function TableCard({ table, color }) {
  const isOccupied = table.status === 'occupied';

  return (
    <View style={styles.card}>
      {/* Table Visual */}
      <View
        style={[
          styles.tableImage,
          { backgroundColor: isOccupied ? '#555' : color },
        ]}
      >
        {/* Timer overlay if table is occupied */}
        {isOccupied && (
          <View style={styles.timerOverlay}>
            <Icon name="time-outline" size={16} color="#fff" />
            <Text style={styles.timerText}>{table.time}</Text>
          </View>
        )}

        {/* Table graphics */}
        {!isOccupied && (
          <View style={styles.tableGraphics}>
            <View style={styles.centerLine} />
            <View style={styles.cue} />
            <View style={styles.ballRack} />
          </View>
        )}
      </View>

      {/* Table info */}
      <View style={styles.info}>
        <Text style={styles.tableName}>{table.name}</Text>
        <Text style={styles.price}>{table.price}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tableImage: {
    width: '100%',
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  timerText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableGraphics: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLine: {
    width: '60%',
    height: 1,
    backgroundColor: '#fff',
    opacity: 0.5,
  },
  cue: {
    width: 40,
    height: 2,
    backgroundColor: '#fff',
    position: 'absolute',
    left: 20,
    top: 50,
    transform: [{ rotate: '45deg' }],
  },
  ballRack: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    right: 20,
    top: 40,
  },
  info: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  price: {
    fontSize: 14,
    color: '#FF8C42',
    fontWeight: '600',
  },
});
