import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export default function MenuScreen({ navigation }) {
  const menuItems = [
    { icon: 'id-card-outline', title: 'Owners panel' },
    { icon: 'settings-outline', title: 'Set up menu' },
    { icon: 'stats-chart-outline', title: 'inventory tracking' },
    { icon: 'refresh-outline', title: 'Upgrade subscription' },
    { icon: 'bug-outline', title: 'Report bugs' },
    { icon: 'shield-checkmark-outline', title: 'Privacy and Policy' },
  ];

  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={() => navigation.goBack()}
    >
      <TouchableOpacity
        activeOpacity={1}
        style={styles.menu}
        onPress={e => e.stopPropagation()}
      >
        {/* Profile Section */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Icon name="person" size={40} color="#fff" />
          </View>
          <Text style={styles.staffId}>staff@id</Text>
          <Text style={styles.email}>mike.den@example.com</Text>
        </View>

        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem}>
            <Icon name={item.icon} size={24} color="#FF8C42" />
            <Text style={styles.menuText}>{item.title}</Text>
          </TouchableOpacity>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark semi-transparent background
  },
  menu: {
    width: width * 0.75, // 75% of screen width
    height: '100%',
    backgroundColor: '#fff',
    padding: 24,
  },
  profile: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  staffId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
  },
  logoutButton: {
    backgroundColor: '#FF8C42',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 'auto', // Push to bottom
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
