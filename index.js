/**
 * @format
 */

import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// ✅ CRITICAL: Background message handler
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log('📩 Background notification received:', remoteMessage);
  
  try {
    const channelId = await notifee.createChannel({
      id: 'leader_app_channel',
      name: 'Leader App Notifications',
      importance: AndroidImportance.HIGH,
      vibration: true,
      sound: 'default',
    });

    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'Leader App',
      body: remoteMessage.notification?.body || '',
      data: remoteMessage.data,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        color: '#e16e2b',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
    });
    
    console.log('✅ Background notification displayed');
  } catch (error) {
    console.error('❌ Background notification error:', error);
  }
});

AppRegistry.registerComponent(appName, () => App);