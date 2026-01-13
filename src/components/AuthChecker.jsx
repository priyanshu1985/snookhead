import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

const AuthChecker = ({ navigation }) => {
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated && user) {
        // Navigate based on user role
        switch (user.role) {
          case 'admin':
            navigation.replace('AdminDashboard');
            break;
          case 'staff':
            navigation.replace('StaffMember');
            break;
          case 'owner':
            navigation.replace('HomeScreen');
            break;
          case 'customer':
          default:
            navigation.replace('MainTabs');
            break;
        }
      } else {
        // Navigate to new welcome screen instead of direct login
        navigation.replace('WelcomeScreen');
      }
    }
  }, [loading, isAuthenticated, user, navigation]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#FF8C42" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
});

export default AuthChecker;
