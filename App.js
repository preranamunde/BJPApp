import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import EncryptedStorage from 'react-native-encrypted-storage';
import axios from 'axios';
import DeviceService from './src/services/DeviceService';
import StaticBannerSplash from './src/components/StaticBannerSplash';
import LogoSplash from './src/components/LogoSplash';
import YouTubeSplash from './src/components/YouTubeSplash';
import AppNavigator from './src/navigation/AppNavigator';
import { generateAppKey } from './src/utils/generateAppKey';

const App = () => {
  const [stage, setStage] = useState('static');
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    SplashScreen.hide();
  }, []);

  // Function to validate API response structure
  const validateBootstrapResponse = (data) => {
    console.log('🔍 Validating API response structure...');
    
    if (!data) {
      console.log('❌ Response data is null or undefined');
      return { isValid: false, message: 'No data received from server' };
    }

    if (typeof data !== 'object') {
      console.log('❌ Response data is not an object:', typeof data);
      return { isValid: false, message: 'Invalid response format' };
    }

    // Check if AppOwnerInfo exists and has expected structure
    if (data.AppOwnerInfo) {
      console.log('✅ AppOwnerInfo found in response');
      console.log('📋 AppOwnerInfo structure:', Object.keys(data.AppOwnerInfo));
      return { isValid: true, message: 'Valid response with AppOwnerInfo' };
    } else {
      console.log('⚠️ AppOwnerInfo not found in response');
      console.log('📋 Available keys in response:', Object.keys(data));
      return { isValid: false, message: 'AppOwnerInfo missing from response' };
    }
  };

  // Improved bootstrap API call function with DeviceService integration
  const callBootstrapAPI = async (appKey) => {
    const API_URL = 'http://192.168.1.104:5000/api/bootstrap';

    console.log('📡 Starting bootstrap API call...');
    console.log('🔗 API URL:', API_URL);
    console.log('🔑 App Key (first 10 chars):', appKey.substring(0, 10) + '...');

    try {
      // Get device fingerprint using DeviceService
      console.log('📱 Getting device fingerprint from DeviceService...');
      const deviceFingerprint = await DeviceService.getDeviceFingerprint();
      console.log('📱 Device Fingerprint (first 20 chars):', deviceFingerprint.substring(0, 20) + '...');

      // Get additional device info for logging
      const deviceInfo = await DeviceService.getDeviceInfo();
      console.log('📱 Device Info:', deviceInfo);

      // Make the API request
      const response = await axios.post(API_URL, {}, {
        headers: {
          'x-app-key': appKey,
          'x-device-fingerprint': deviceFingerprint,
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 seconds timeout
      });

      console.log('✅ API Request Successful!');
      console.log('📊 Response Status:', response.status);
      console.log('📊 Response Status Text:', response.statusText);
      console.log('📋 Response Headers:', JSON.stringify(response.headers, null, 2));
      console.log('📋 Raw Response Data:', JSON.stringify(response.data, null, 2));

      // Validate the response
      const validation = validateBootstrapResponse(response.data);
      
      if (validation.isValid) {
        console.log('✅ Response validation passed:', validation.message);
        
        // Store AppOwnerInfo securely
        try {
          await EncryptedStorage.setItem('AppOwnerInfo', JSON.stringify(response.data.AppOwnerInfo));
          console.log('✅ AppOwnerInfo stored securely in EncryptedStorage');
          
          // Show success alert
          Alert.alert(
            '🎉 Bootstrap Success!',
            `✅ API called successfully!\n\n` +
            `Status: ${response.status}\n` +
            `Device: ${deviceInfo}\n` +
            `AppOwnerInfo: Received and stored\n` +
            `Keys: ${Object.keys(response.data.AppOwnerInfo).join(', ')}`,
            [{ text: 'Continue', onPress: () => setStage('app') }]
          );
          
          return { success: true, data: response.data };
        } catch (storageError) {
          console.error('❌ Failed to store AppOwnerInfo:', storageError.message);
          Alert.alert(
            '⚠️ Storage Warning',
            `API call successful but storage failed:\n${storageError.message}`,
            [{ text: 'Continue', onPress: () => setStage('app') }]
          );
          return { success: false, error: 'Storage failed', data: response.data };
        }
      } else {
        console.log('❌ Response validation failed:', validation.message);
        Alert.alert(
          '⚠️ Invalid Response',
          `API responded but data is invalid:\n${validation.message}\n\nRaw response logged to console.`,
          [{ text: 'Continue', onPress: () => setStage('app') }]
        );
        return { success: false, error: validation.message, data: response.data };
      }

    } catch (error) {
      console.log('❌ API Request Failed!');
      
      if (error.response) {
        // Server responded with error status
        console.error('📊 Error Status:', error.response.status);
        console.error('📊 Error Status Text:', error.response.statusText);
        console.error('📋 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        console.error('📋 Error Response Headers:', JSON.stringify(error.response.headers, null, 2));
        
        Alert.alert(
          '❌ Server Error',
          `Server responded with error:\n\n` +
          `Status: ${error.response.status}\n` +
          `Message: ${error.response.statusText}\n` +
          `Data: ${JSON.stringify(error.response.data, null, 2)}`,
          [{ text: 'Continue', onPress: () => setStage('app') }]
        );
        
        return { success: false, error: `Server error: ${error.response.status}`, data: error.response.data };
      } else if (error.request) {
        // Request was made but no response received
        console.error('📡 Network Error - No response received');
        console.error('📋 Request Details:', error.request);
        
        Alert.alert(
          '📡 Network Error',
          `No response from server. Please check:\n\n` +
          `• Internet connection\n` +
          `• Server is running\n` +
          `• URL is correct: ${API_URL}`,
          [{ text: 'Continue', onPress: () => setStage('app') }]
        );
        
        return { success: false, error: 'Network error - no response', data: null };
      } else {
        // Something else happened
        console.error('❌ Request Setup Error:', error.message);
        console.error('❌ Error Stack:', error.stack);
        
        Alert.alert(
          '❌ Request Error',
          `Failed to make request:\n${error.message}`,
          [{ text: 'Continue', onPress: () => setStage('app') }]
        );
        
        return { success: false, error: error.message, data: null };
      }
    }
  };

  const bootstrapFlow = async () => {
    try {
      console.log('🚀 Starting bootstrap flow...');

      // Step 1: Generate and store app_key
      console.log('📱 Step 1: Generating app key...');
      //const appKey = generateAppKey();
       const appKey = await NativeModules.AppKeyModule.getEncryptedAppKey();
      console.log('📱 App key generation result type:', typeof appKey);
      console.log('📱 App key length:', appKey?.length);

      if (appKey && typeof appKey === 'string' && appKey.length > 0) {
        try {
          
          //await EncryptedStorage.setItem('APP_KEY', appKey);
          console.log('✅ App key generated and stored securely');

          // Step 2: Call bootstrap API with improved error handling and DeviceService
          console.log('📱 Step 2: Calling bootstrap API...');
          const apiResult = await callBootstrapAPI(appKey);
          
          if (apiResult.success) {
            console.log('🎉 Bootstrap completed successfully!');
            setIsBootstrapped(true);
          } else {
            console.log('⚠️ Bootstrap completed with warnings:', apiResult.error);
            setIsBootstrapped(true);
            // App continues even if API fails
          }

        } catch (storageError) {
          console.error('❌ Failed to store app key:', storageError.message);
          Alert.alert(
            '❌ Storage Error',
            `Failed to store app key:\n${storageError.message}`,
            [{ text: 'Continue', onPress: () => setStage('app') }]
          );
          setIsBootstrapped(true);
        }
      } else {
        console.error('❌ App key generation failed - received:', typeof appKey, appKey);
        Alert.alert(
          '❌ Key Generation Failed',
          'App key generation failed. Please check console for details.',
          [{ text: 'Continue', onPress: () => setStage('app') }]
        );
        setIsBootstrapped(true);
      }

    } catch (err) {
      console.error('❌ Bootstrap flow failed:', err.message);
      console.error('❌ Stack trace:', err.stack);

      Alert.alert(
        '❌ Bootstrap Error',
        `Bootstrap failed:\n${err.message}`,
        [{ text: 'Continue', onPress: () => setStage('app') }]
      );

      setIsBootstrapped(true);
    }
  };

  if (stage === 'static') {
    return <StaticBannerSplash onComplete={() => setStage('logo')} />;
  }

  if (stage === 'logo') {
    return <LogoSplash onComplete={() => setStage('youtube')} />;
  }

  if (stage === 'youtube') {
    return <YouTubeSplash onComplete={() => bootstrapFlow()} />;
  }

  if (stage === 'app') {
    return (
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    );
  }

  return null;
};

export default App;