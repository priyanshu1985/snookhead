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
        title: "Owner's Panel",
        route: 'OwnerPanel',
        roles: ['owner', 'admin'], // Owners and admins can access
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
        icon: 'people-outline',
        title: 'Member Management',
        route: 'Member',
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
          try {
            console.log('Starting logout process...');
            await logout();
            console.log('Logout function completed, navigating to login...');

            // Navigate to login screen and reset navigation stack
            navigation.reset({
              index: 0,
              routes: [{ name: 'LoginScreen' }],
            });

            console.log('Navigation reset completed');
          } catch (error) {
            console.error('Error during logout process:', error);
            Alert.alert(
              'Logout Error',
              'There was an issue logging out. Please try again.',
            );
          }
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  menu: {
    width: width * 0.8,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  profile: {
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  staffId: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  email: {
    fontSize: 13,
    color: '#888888',
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF8C42',
  },
  roleText: {
    fontSize: 11,
    color: '#FF8C42',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 2,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
  },
  menuText: {
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 14,
    flex: 1,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  logoutButton: {
    backgroundColor: '#FF8C42',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 'auto',
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
