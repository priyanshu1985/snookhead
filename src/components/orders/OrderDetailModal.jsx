// import React from 'react';
// import {
//   View,
//   Text,
//   StyleSheet,
//   Modal,
//   TouchableOpacity,
//   Dimensions,
// } from 'react-native';

// const { width, height } = Dimensions.get('window');

// export default function OrderDetailModal({ visible, order, onClose }) {
//   if (!order) return null;

//   return (
//     <Modal
//       visible={visible}
//       transparent={true}
//       animationType="fade"
//       onRequestClose={onClose}
//     >
//       {/* Dark overlay background */}
//       <TouchableOpacity
//         style={styles.overlay}
//         activeOpacity={1}
//         onPress={onClose}
//       >
//         {/* Modal content */}
//         <TouchableOpacity
//           activeOpacity={1}
//           style={styles.modalContainer}
//           onPress={e => e.stopPropagation()}
//         >
//           {/* Header */}
//           <View style={styles.header}>
//             <Text style={styles.tableNumber}>{order.tableNumber}</Text>
//             <Text style={styles.billNumber}>{order.billNumber}</Text>
//           </View>

//           {/* Customer Details */}
//           <View style={styles.content}>
//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Name :</Text>
//               <Text style={styles.value}>{order.customerName}</Text>
//             </View>

//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Date :</Text>
//               <Text style={styles.value}>{order.date}</Text>
//             </View>

//             <View style={styles.detailRow}>
//               <Text style={styles.label}>Mobile No. :</Text>
//               <Text style={styles.value}>{order.mobile}</Text>
//             </View>

//             {/* Orders List */}
//             <View style={styles.ordersSection}>
//               <Text style={styles.ordersLabel}>Orders :</Text>
//               <View style={styles.ordersList}>
//                 {order.items.map((item, index) => (
//                   <Text key={index} style={styles.orderItem}>
//                     {item}
//                   </Text>
//                 ))}
//               </View>
//             </View>

//             {/* Wait Time */}
//             <Text style={styles.waitTime}>Wait for {order.waitTime}!</Text>

//             {/* Add Food Button */}
//             <TouchableOpacity style={styles.addButton}>
//               <Text style={styles.addButtonText}>Add Food</Text>
//             </TouchableOpacity>
//           </View>
//         </TouchableOpacity>
//       </TouchableOpacity>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0, 0, 0, 0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   modalContainer: {
//     width: width * 0.85,
//     maxHeight: height * 0.7,
//     backgroundColor: '#fff',
//     borderRadius: 16,
//     overflow: 'hidden',
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOpacity: 0.3,
//     shadowRadius: 10,
//     shadowOffset: { width: 0, height: 5 },
//   },
//   header: {
//     backgroundColor: '#fff',
//     paddingVertical: 16,
//     alignItems: 'center',
//     borderBottomWidth: 1,
//     borderBottomColor: '#E0E0E0',
//   },
//   tableNumber: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#FF8C42',
//   },
//   billNumber: {
//     fontSize: 14,
//     color: '#666',
//     marginTop: 4,
//   },
//   content: {
//     padding: 24,
//   },
//   detailRow: {
//     flexDirection: 'row',
//     marginBottom: 12,
//   },
//   label: {
//     fontSize: 14,
//     color: '#666',
//     width: 100,
//   },
//   value: {
//     fontSize: 14,
//     color: '#333',
//     fontWeight: '500',
//     flex: 1,
//   },
//   ordersSection: {
//     flexDirection: 'row',
//     marginTop: 8,
//     marginBottom: 16,
//   },
//   ordersLabel: {
//     fontSize: 14,
//     color: '#666',
//     width: 100,
//   },
//   ordersList: {
//     flex: 1,
//   },
//   orderItem: {
//     fontSize: 14,
//     color: '#FF8C42',
//     fontWeight: '600',
//     marginBottom: 4,
//   },
//   waitTime: {
//     fontSize: 16,
//     color: '#FF8C42',
//     textAlign: 'center',
//     marginVertical: 16,
//     fontWeight: '600',
//   },
//   addButton: {
//     backgroundColor: '#FF8C42',
//     paddingVertical: 14,
//     borderRadius: 25,
//     alignItems: 'center',
//     marginTop: 8,
//   },
//   addButtonText: {
//     fontSize: 16,
//     color: '#fff',
//     fontWeight: 'bold',
//   },
// });
