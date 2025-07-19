import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
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
import SamvadScreen from '../screens/SamvadScreen'; // Add this import

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#e16e2b',
          height: 90, // Adjust height instead of paddingTop
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 18, // Optional: increase size for visibility
        },
      }}
    >
      {/* Drawer with HomeScreen inside */}
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} options={{
        headerShown: false, // Hide header on Home only
      }}/>
      <Stack.Screen name="Registration" component={RegistrationScreen}/>
      
      {/* Additional stack screens */}
      <Stack.Screen name="KnowYourLeader" component={KnowYourLeaderScreen} />
      <Stack.Screen name="AboutConstituency" component={AboutConstituencyScreen} />
      <Stack.Screen name="KamalSandesh" component={KamalSandeshScreen}/>
      <Stack.Screen name="Books" component={BooksScreen}/>
      <Stack.Screen name="About" component={AboutScreen}/>
      <Stack.Screen name="ContactUs" component={ContactUsScreen}/>
      <Stack.Screen name="VisitMyGov" component={VisitMyGovScreen}/>
      <Stack.Screen name="DevelopmentLandscape" component={DevelopmentLandscapeScreen}/>
      <Stack.Screen name="Dashboard" component={DashboardScreen}/>
      <Stack.Screen name="LokSahayak" component={ChatBot}/>
      
      {/* Add SamvadScreen here */}
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