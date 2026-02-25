import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';
import {
  OwnerPanelIcon,
  InventoryTrackingIcon,
  SetupMenuIcon,
  MembersListIcon,
  UpgradeIcon,
  ReportBugsIcon,
  PrivacyPolicyIcon,
} from '../../components/common/icon';

const { width } = Dimensions.get('window');

export default function MenuScreen({ navigation }) {
  const { user, logout, isOwner, isAdmin, isStaff } = useAuth();

  // Define menu items based on roles
  const getMenuItems = () => {
    const allMenuItems = [
      {
        icon: OwnerPanelIcon,
        title: "Owner's Panel",
        route: 'OwnerPanel',
        roles: ['owner', 'admin'],
      },
      {
        icon: InventoryTrackingIcon,
        title: 'Reservations',
        route: 'ReservationsListScreen',
        roles: ['owner', 'admin', 'staff'],
      },
      {
        icon: SetupMenuIcon,
        title: 'Set up menu',
        route: 'SetupMenu',
        roles: ['owner', 'admin'],
      },
      {
        icon: InventoryTrackingIcon,
        title: 'inventory tracking',
        route: 'InventoryDashboard',
        roles: ['owner', 'admin'],
      },
      {
        icon: MembersListIcon,
        title: 'Member Management',
        route: 'Member',
        roles: ['owner', 'admin'],
      },
      {
        icon: UpgradeIcon,
        title: 'Upgrade subscription',
        route: 'UpgradeSubscription',
        roles: ['owner'],
      },
      {
        icon: ReportBugsIcon,
        title: 'Report bugs',
        route: 'ReportBugs',
        roles: ['owner', 'customer', 'admin', 'staff'],
      },
      {
        icon: PrivacyPolicyIcon,
        title: 'Privacy and Policy',
        route: 'PrivacyPolicy',
        roles: ['owner', 'customer', 'admin', 'staff'],
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

  const handleLogout = async () => {
    try {
      console.log('Starting logout process (direct)...');

      // Perform logout (clears context state)
      if (logout) {
        await logout().catch(err =>
          console.log('AuthContext logout error:', err),
        );
      }
      console.log('Logout function completed, resetting to LoginScreen...');

      // Reset stack to LoginScreen (defined in AppNavigator.jsx)
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });

      console.log('Navigation reset completed');
    } catch (error) {
      console.error('Error during logout catch block:', error);

      // Fallback navigation explicitly to LoginScreen
      try {
        navigation.navigate('LoginScreen');
      } catch (navErr) {
        console.error('Even fallback navigation failed:', navErr);
      }
    }
  };


  return (
    <TouchableOpacity
      style={styles.overlay}
      activeOpacity={1}
      onPress={() => navigation.goBack()}
    >
      <View style={styles.menu}>
        {/* Profile Section - Ad Card Style */}
        <TouchableOpacity 
          style={styles.profileCard} 
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.8}
        >
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.station?.stationphotourl || user?.profile_picture ? (
                <Image 
                  source={{ uri: user.station?.stationphotourl || user.profile_picture }} 
                  style={styles.avatarImage} 
                />
              ) : (
                <Icon name="person-outline" size={36} color="#fff" />
              )}
            </View>
          </View>
          <Text style={styles.userName}>{user?.name?.toUpperCase() || 'USER'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {user?.role?.toUpperCase() || 'GUEST'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        {getMenuItems().map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => handleMenuItemPress(item.route)}
          >
            <item.icon size={22} color="#FF8C42" />
            <Text style={styles.menuText}>{item.title}</Text>
            <Icon
              name="chevron-forward-outline"
              size={18}
              color="#CCC"
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
        ))}

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={e => {
            e.stopPropagation();
            handleLogout();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </View>
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
    paddingTop: 80,
    paddingBottom: 32,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderRadius: 20,
    // Add border to distinguish it slightly if needed, or rely on layout
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 14,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#FF8C42',
    backgroundColor: 'rgba(255, 140, 66, 0.05)',
  },
  roleText: {
    fontSize: 12,
    color: '#FF8C42',
    fontWeight: '800',
    letterSpacing: 0.8,
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
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 'auto',
    elevation: 6,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
