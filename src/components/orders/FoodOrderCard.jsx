// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';

// const { width } = Dimensions.get('window');
// const cardWidth = (width - 48) / 2; // 2 cards per row with padding

// export default function FoodOrderCard({ order, onPress }) {
//   return (
//     <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
//       {/* Header - Orange background */}
//       <View style={styles.header}>
//         <Text style={styles.tableNumber}>{order.tableNumber}</Text>
//         <View style={styles.billBadge}>
//           <Text style={styles.billText}>{order.billNumber}</Text>
//         </View>
//       </View>

//       {/* Content - White background */}
//       <View style={styles.content}>
//         <View style={styles.row}>
//           <Text style={styles.label}>Total ordered item :</Text>
//           <Text style={styles.value}>{order.totalOrdered}</Text>
//         </View>

//         <View style={styles.row}>
//           <Text style={styles.label}>Orders delivered :</Text>
//           <Text style={styles.value}>{order.ordersDelivered}</Text>
//         </View>

//         <View style={styles.row}>
//           <Text style={styles.label}>Yet to deliver :</Text>
//           <Text style={styles.value}>{order.yetToDeliver}</Text>
//         </View>

//         <View style={styles.divider} />

//         <View style={styles.row}>
//           <Text style={styles.amountLabel}>Amount payable</Text>
//           <Text style={styles.amount}>{order.amountPayable}</Text>
//         </View>
//       </View>
//     </TouchableOpacity>
//   );
// }

// const styles = StyleSheet.create({
//   card: {
//     width: cardWidth,
//     backgroundColor: '#fff',
//     borderRadius: 8,
//     overflow: 'hidden',
//     elevation: 2,
//     shadowColor: '#000',
//     shadowOpacity: 0.1,
//     shadowRadius: 4,
//     shadowOffset: { width: 0, height: 2 },
//   },
//   header: {
//     backgroundColor: '#FF8C42',
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//   },
//   tableNumber: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#fff',
//   },
//   billBadge: {
//     backgroundColor: 'rgba(255, 255, 255, 0.3)',
//     paddingHorizontal: 8,
//     paddingVertical: 2,
//     borderRadius: 4,
//   },
//   billText: {
//     fontSize: 10,
//     color: '#fff',
//     fontWeight: '600',
//   },
//   content: {
//     padding: 12,
//   },
//   row: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     marginBottom: 6,
//   },
//   label: {
//     fontSize: 12,
//     color: '#666',
//   },
//   value: {
//     fontSize: 12,
//     color: '#333',
//     fontWeight: '500',
//   },
//   divider: {
//     height: 1,
//     backgroundColor: '#E0E0E0',
//     marginVertical: 8,
//   },
//   amountLabel: {
//     fontSize: 12,
//     color: '#333',
//     fontWeight: '600',
//   },
//   amount: {
//     fontSize: 14,
//     color: '#333',
//     fontWeight: 'bold',
//   },
// });
