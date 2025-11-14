import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
// Import screens
import HomeScreen from '../screens/HomeScreen';
import QueueScreen from '../screens/QueueScreen';
import BillScreen from '../screens/BillScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MenuScreen from '../screens/MenuScreen';

// Import Menu bar related screens
import OwnerPanel from '../screens/OwnerPanel';
import OwnerDashboard from '../screens/OwnerDashboard';

import SetupMenu from '../screens/SetupMenu';
import InventoryTracking from '../screens/InventoryTracking';
import UpgradeSubscription from '../screens/UpgradeSubscription';
import ReportBugs from '../screens/ReportBugs';
import PrivacyPolicy from '../screens/PrivacyPolicy';

const Tab = createBottomTabNavigator(); // Creates bottom tabs
const Stack = createNativeStackNavigator(); // Creates stack navigation

// Bottom Tab Navigator
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide header for tabs
        tabBarActiveTintColor: '#FF8C42', // Orange color for active tab
        tabBarInactiveTintColor: '#888', // Gray for inactive tabs
        tabBarStyle: {
          height: 60, // Tab bar height
          paddingBottom: 8,
        },
      }}
    >
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="home-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Queue Tab */}
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="people-outline" size={size} color={color} />
          ),
        }}
      />
      {/* Bill Tab (Center - Highlighted) */}
      <Tab.Screen
        name="Bill"
        component={BillScreen}
        options={{
          tabBarIcon: ({ color }) => (
            <Icon name="receipt-outline" size={35} color="#fff" />
          ),
          tabBarIconStyle: {
            backgroundColor: '#FF8C42',
            borderRadius: 50,
            padding: 15,
            marginBottom: 20,
          },
        }}
      />
      {/* Bill Tab */}
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon name="document-text-outline" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main Navigator (includes Menu screen)
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="LoginScreen"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="LoginScreen" component={LoginScreen} />
        <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        <Stack.Screen name="MainTabs" component={BottomTabs} />
        <Stack.Screen
          name="Menu"
          component={MenuScreen}
          options={{
            presentation: 'transparentModal', // Slide from left
            animation: 'slide_from_left',
          }}
        />
        <Stack.Screen name="OwnerPanel" component={OwnerPanel} />
        <Stack.Screen name="OwnerDashboard" component={OwnerDashboard} />
        <Stack.Screen name="SetupMenu" component={SetupMenu} />
        <Stack.Screen name="InventoryTracking" component={InventoryTracking} />
        <Stack.Screen
          name="UpgradeSubscription"
          component={UpgradeSubscription}
        />
        <Stack.Screen name="ReportBugs" component={ReportBugs} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
