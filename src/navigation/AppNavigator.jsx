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
import ScannerScreen from '../screens/ScannerScreen';
import OrdersScreen from '../screens/OrdersScreen';
import MenuScreen from '../screens/MenuScreen';
import Member from '../screens/Member';
import MemberDetails from '../screens/MemberDetails';
import Notifications from '../screens/Notifications';

// Import Menu bar related screens
import OwnerPanel from '../screens/OwnerPanel';
import OwnerDashboard from '../screens/OwnerDashboard';
import OwnerPasswordSetup from '../screens/OwnerPasswordSetup';

import SetupMenu from '../screens/SetupMenu';
import InventoryTracking from '../screens/InventoryTracking';
import UpgradeSubscription from '../screens/UpgradeSubscription';
import ReportBugs from '../screens/ReportBugs';
import PrivacyPolicy from '../screens/PrivacyPolicy';
import TableBookingScreen from '../screens/TableBookingScreen';
import TableBookingOrders from '../components/TableBookingOrders';
import PaymentGateway from '../screens/PaymentGateway';
import AfterBooking from '../screens/AfterBooking';

// Import role-based screens
import AdminDashboard from '../screens/admin/AdminDashboard';
import StaffMember from '../screens/staff/StaffMember';

// Import AuthContext and AuthChecker
import { AuthProvider } from '../context/AuthContext';
import AuthChecker from '../components/AuthChecker';

const Tab = createBottomTabNavigator(); // Creates bottom tabs
const Stack = createNativeStackNavigator(); // Creates stack navigation

// Bottom Tab Navigator - Only for Owner and Customer roles
function BottomTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Hide header for tabs
        tabBarActiveTintColor: '#FF8C42', // Orange color for active tab
        tabBarInactiveTintColor: '#888', // Gray for inactive tabs
        tabBarStyle: {
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E8E8E8',
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      {/* Home Tab */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'home' : 'home-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      {/* Queue Tab */}
      <Tab.Screen
        name="Queue"
        component={QueueScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'people' : 'people-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      {/* Scanner Tab */}
      <Tab.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'scan' : 'scan-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* Bill Tab */}
      <Tab.Screen
        name="Bill"
        component={BillScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'receipt' : 'receipt-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
      {/* Orders Tab */}
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <Icon
              name={focused ? 'document-text' : 'document-text-outline'}
              size={22}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// Main Navigator (includes Menu screen)
export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="AuthChecker"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="AuthChecker" component={AuthChecker} />
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
          <Stack.Screen name="MainTabs" component={BottomTabs} />

          {/* Role-based screens */}
          <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          <Stack.Screen name="StaffMember" component={StaffMember} />

          {/* Common screens */}
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
          <Stack.Screen
            name="OwnerPasswordSetup"
            component={OwnerPasswordSetup}
          />
          <Stack.Screen name="SetupMenu" component={SetupMenu} />
          <Stack.Screen
            name="InventoryTracking"
            component={InventoryTracking}
          />
          <Stack.Screen name="Member" component={Member} />
          <Stack.Screen name="MemberDetails" component={MemberDetails} />
          <Stack.Screen name="Notifications" component={Notifications} />
          <Stack.Screen
            name="UpgradeSubscription"
            component={UpgradeSubscription}
          />
          <Stack.Screen name="ReportBugs" component={ReportBugs} />
          <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicy} />
          <Stack.Screen
            name="TableBookingScreen"
            component={TableBookingScreen}
          />
          <Stack.Screen
            name="TableBookingOrders"
            component={TableBookingOrders}
          />
          <Stack.Screen name="AfterBooking" component={AfterBooking} />
          <Stack.Screen name="PaymentGateway" component={PaymentGateway} />
        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
