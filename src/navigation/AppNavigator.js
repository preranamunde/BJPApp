import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { BackHandler } from 'react-native';
import DrawerNavigator from '../navigation/DrawerNavigator';

// Screens
import KnowYourLeaderScreen from '../screens/KnowYourLeaderScreen';
import AboutConstituencyScreen from '../screens/AboutConstituencyScreen';
import KamalSandeshScreen from '../screens/KamalSandeshScreen';
import BooksScreen from '../screens/BooksScreen';
import AboutScreen from '../screens/AboutScreen';
import ContactUsScreen from '../screens/ContactUsScreen';
import VisitMyGovScreen from '../screens/VisitMyGovScreen';
import DevelopmentLandscapeScreen from '../screens/DevelopmentLandscapeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RegistrationScreen from '../screens/RegistrationScreen';
import ChatBot from '../screens/ChatBot';
import SamvadScreen from '../screens/SamvadScreen';
import LoginScreen from '../screens/LoginScreen';
import ViewProfileScreen from '../screens/ViewProfileScreen';
import DeviceService from '../services/DeviceService';

import HomeScreen from '../screens/HomeScreen';
import DetailedFormScreen from '../screens/DetailedFormScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import PartyUpdatesScreen from '../screens/PartyUpdatesScreen';
import FeedbackScreen from '../screens/FeedbackScreen';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="MainDrawer"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#e16e2b',
          height: 90,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 18,
        },
      }}
    >
      {/* Home/Drawer - First in stack */}
      <Stack.Screen
        name="MainDrawer"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />

      {/* Login and Registration - Can navigate back to MainDrawer */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ 
          headerShown: false,
        }}
      />
      
      <Stack.Screen
        name="Registration"
        component={RegistrationScreen}
        options={{ headerShown: false }}
      />

      {/* Other screens with header */}
      <Stack.Screen name="ViewProfile" component={ViewProfileScreen}/>
      <Stack.Screen name="KnowYourLeader" component={KnowYourLeaderScreen} />
      <Stack.Screen name="AboutConstituency" component={AboutConstituencyScreen} />
      <Stack.Screen name="KamalSandesh" component={KamalSandeshScreen} />
      <Stack.Screen name="Books" component={BooksScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="ContactUs" component={ContactUsScreen} />
      <Stack.Screen name="VisitMyGov" component={VisitMyGovScreen} />
      <Stack.Screen name="DevelopmentLandscape" component={DevelopmentLandscapeScreen} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="LokSahayak" component={ChatBot} />
      <Stack.Screen name="DetailedFormScreen" component={DetailedFormScreen}/>
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen}/>
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen}/>
      <Stack.Screen name="PartyUpdates" component={PartyUpdatesScreen}/>
      <Stack.Screen name="Feedback" component={FeedbackScreen}/>
      
      <Stack.Screen
        name="SamvadScreen"
        component={SamvadScreen}
        options={{
          title: 'Samvad',
          headerBackTitleVisible: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;