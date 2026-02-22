import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';

import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';

// Forgot Password Flow
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';

// Import screens
import HomeScreen from '../screens/booking/HomeScreen';
import QueueScreen from '../screens/queue/QueueScreen';
import BillScreen from '../screens/bill/BillScreen';
import ScannerScreen from '../screens/member/ScannerScreen';
import OrdersScreen from '../screens/owners/OrdersScreen';
import MenuScreen from '../screens/food/MenuScreen';
import Member from '../screens/member/Member';
import MemberDetails from '../screens/member/MemberDetails';
import Notifications from '../screens/other/Notifications';

// Import Menu bar related screens
import OwnerPanel from '../screens/owners/OwnerPanel';
import OwnerTabs from '../screens/owners/OwnerTabs';
import OwnerPasswordSetup from '../screens/owners/OwnerPasswordSetup';

import SetupMenu from '../screens/setupmenu/SetupMenu';
import InventoryDashboard from '../screens/inventory/InventoryDashboard';
import ServerStatusScreen from '../screens/other/ServerStatusScreen';
import UpgradeSubscription from '../screens/subscription/UpgradeSubscription';
import ReportBugs from '../screens/bugs/ReportBugs';
import PrivacyPolicy from '../screens/subscription/PrivacyPolicy';
import TableBookingScreen from '../screens/booking/TableBookingScreen';
import TableBookingOrders from '../components/orders/TableBookingOrders';
import PaymentGateway from '../screens/bill/PaymentGateway';
import AfterBooking from '../screens/booking/AfterBooking';

// Import role-based screens
import OtpVerificationScreen from '../screens/auth/OtpVerificationScreen';
import AdminDashboard from '../screens/admin/AdminDashboard';
import StaffMember from '../screens/staff/StaffMember';

// Import Reservation Screens
import ReservationsListScreen from '../screens/reservation/ReservationsListScreen';
import NewReservationScreen from '../screens/reservation/NewReservationScreen';
import PaymentConfirmScreen from '../screens/reservation/PaymentConfirmScreen';

// Import AuthContext and AuthChecker
import { AuthProvider } from '../context/AuthContext';
import AuthChecker from '../components/auth/AuthChecker';
import GlobalBillManager from '../components/bill/GlobalBillManager';
import { MemberProvider } from '../context/MemberContext';

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
          height: 75,
          paddingBottom: 12,
          paddingTop: 12,
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
          fontSize: 12,
          fontWeight: '500',
          marginTop: 4,
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
              size={28}
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
              size={28}
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
              size={28}
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
              size={28}
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
              size={28}
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
      <MemberProvider>
        <GlobalBillManager />
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="AuthChecker"
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="AuthChecker" component={AuthChecker} />
            <Stack.Screen name="LoginScreen" component={LoginScreen} />
            <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
            <Stack.Screen
              name="ForgotPasswordScreen"
              component={ForgotPasswordScreen}
            />
            <Stack.Screen
              name="ResetPasswordScreen"
              component={ResetPasswordScreen}
            />

            <Stack.Screen
              name="OtpVerificationScreen"
              component={OtpVerificationScreen}
            />
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
            <Stack.Screen name="OwnerTabs" component={OwnerTabs} />
            <Stack.Screen
              name="OwnerPasswordSetup"
              component={OwnerPasswordSetup}
            />
            <Stack.Screen name="SetupMenu" component={SetupMenu} />
            <Stack.Screen
              name="InventoryDashboard"
              component={InventoryDashboard}
            />
            <Stack.Screen name="ServerStatus" component={ServerStatusScreen} />
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
            <Stack.Screen name="ScannerScreen" component={ScannerScreen} />
            <Stack.Screen
              name="ReservationsListScreen"
              component={ReservationsListScreen}
            />
            <Stack.Screen
              name="NewReservation"
              component={NewReservationScreen}
            />
            <Stack.Screen
              name="PaymentConfirm"
              component={PaymentConfirmScreen}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </MemberProvider>
    </AuthProvider>
  );
}
