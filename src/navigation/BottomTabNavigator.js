import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

// Screens
import HomeScreen from '../screens/HomeScreen';
import SamvadScreen from '../screens/SamvadScreen';
import MediaCornerScreen from '../screens/MediaCornerScreen';
import UpcomingEventsScreen from '../screens/UpcomingEventsScreen';
import ConnectBJPScreen from '../screens/ConnectBJPScreen';

const Tab = createBottomTabNavigator();

const DrawerToggleButton = () => {
  const navigation = useNavigation();
  return (
    <TouchableOpacity onPress={() => navigation.openDrawer()} style={{ marginLeft: 15 }}>
      <Icon name="menu" size={35} color="#fff" />
    </TouchableOpacity>
  );
};

const BottomTabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Samvad':
              iconName = 'chat';
              break;
            case 'Media Corner':
              iconName = 'video-library';
              break;
            case 'Upcoming Events':
              iconName = 'event';
              break;
            case 'Join BJP':
              iconName = 'connect-without-contact';
              break;
          }
          return <Icon name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: '#e16e2b',
        tabBarInactiveTintColor: 'gray',
        headerShown: true,
        headerTitleAlign: 'left',
        headerStyle: {
          backgroundColor: '#e16e2b',
          height: 80,
        },
        headerTintColor: '#fff',
        headerLeft: () => <DrawerToggleButton />,
        tabBarLabelStyle: {
          fontSize: 10,
        },
        tabBarStyle: {
          height: 115,
          paddingBottom: 10,
          paddingTop: 5,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <Tab.Screen name="Samvad" component={SamvadScreen} />
      <Tab.Screen name="Media Corner" component={MediaCornerScreen} />
      <Tab.Screen name="Upcoming Events" component={UpcomingEventsScreen} />
      <Tab.Screen name="Join BJP" component={ConnectBJPScreen} />
    </Tab.Navigator>
  );
};

export default BottomTabNavigator;
