import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

import CustomDrawer from '../components/CustomDrawer';
import BottomTabNavigator from '../navigation/BottomTabNavigator';

const Drawer = createDrawerNavigator();

const DrawerNavigator = () => {
  const handleLogout = async (navigation) => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userData');
              await AsyncStorage.setItem('isLoggedin', 'FALSE');
              global.isUserLoggedin = false;

              Alert.alert('Success', 'You are successfully Logged Out', [
                {
                  text: 'OK',
                  onPress: () => {
                    navigation.dispatch(
                      CommonActions.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      })
                    );
                  },
                },
              ]);
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleEditProfile = (navigation) => {
    if (global.isUserLoggedin) {
      navigation.navigate('Registration', { isEditMode: true });
    } else {
      Alert.alert('Login Required', 'Please login to edit your profile.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
    }
  };

  const handleMyProfile = () => {
    Alert.alert('Coming Soon', 'Profile view screen is under development.');
  };

  return (
    <Drawer.Navigator
      drawerContent={(props) => (
        <CustomDrawer
          {...props}
          handleLogout={handleLogout}
          handleEditProfile={handleEditProfile}
          handleMyProfile={handleMyProfile}
        />
      )}
      screenOptions={{
        headerShown: false,
        drawerStyle: {
          backgroundColor: '#fff',
          width: 280,
        },
        drawerActiveTintColor: '#e16e2b',
        drawerInactiveTintColor: '#333',
        drawerLabelStyle: {
          fontSize: 16,
          fontWeight: '500',
        },
      }}
    >
      
      <Drawer.Screen
        name="Main"
        component={BottomTabNavigator}
      />
    </Drawer.Navigator>
  );
};

export default DrawerNavigator;
