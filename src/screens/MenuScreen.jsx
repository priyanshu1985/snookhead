import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function MenuScreen({ navigation }) {
  const { user, logout, isOwner, isAdmin, isStaff } = useAuth();

  // Define menu items based on roles
  const getMenuItems = () => {
    const allMenuItems = [
      {
        icon: 'id-card-outline',
        title: 'Owners panel',
        route: 'OwnerPanel',
        roles: ['owner'], // Only owners can access
      },
      {
        icon: 'settings-outline',
        title: 'Set up menu',
        route: 'SetupMenu',
        roles: ['owner', 'admin'], // Owners and admins can access
      },
      {
        icon: 'stats-chart-outline',
        title: 'inventory tracking',
        route: 'InventoryTracking',
        roles: ['owner', 'admin'],
      },
      {
        icon: 'refresh-outline',
        title: 'Upgrade subscription',
        route: 'UpgradeSubscription',
        roles: ['owner'], // Only owners can upgrade
      },
      {
        icon: 'bug-outline',
        title: 'Report bugs',
        route: 'ReportBugs',
        roles: ['owner', 'customer', 'admin', 'staff'], // All roles can report bugs
      },
      {
        icon: 'shield-checkmark-outline',
        title: 'Privacy and Policy',
        route: 'PrivacyPolicy',
        roles: ['owner', 'customer', 'admin', 'staff'], // All roles can view policy
      },
    ];

    // Filter menu items based on user role
    return allMenuItems.filter(item =>
      item.roles.includes(user?.role || 'customer'),
    );
  };

  const handleMenuItemPress = route => {
    navigation.navigate(route);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: 'LoginScreen' }],
          });
        },
      },
    ]);
  };

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
          <Text style={styles.staffId}>{user?.name || 'User'}</Text>
          <Text style={styles.email}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role?.toUpperCase() || 'GUEST'}
            </Text>
          </View>
        </View>

        {/* Menu Items */}
        {getMenuItems().map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(item.route)}
          >
            <Icon name={item.icon} size={24} color="#FF8C42" />
            <Text style={styles.menuText}>{item.title}</Text>
            <Icon
              name="chevron-forward"
              size={20}
              color="#CCC"
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        ))}

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menu: {
    width: width * 0.75,
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
  roleBadge: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
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
    flex: 1,
  },
  logoutButton: {
    backgroundColor: '#FF8C42',
    padding: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 'auto',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
