import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import EncryptedStorage from 'react-native-encrypted-storage';
import axios from 'axios';
import DeviceService from './src/services/DeviceService';
import ConfigService from './src/services/ConfigService'; // Added ConfigService import
import StaticBannerSplash from './src/components/StaticBannerSplash';
import LogoSplash from './src/components/LogoSplash';
import YouTubeSplash from './src/components/YouTubeSplash';
import AppNavigator from './src/navigation/AppNavigator';
import { generateAppKey } from './src/utils/generateAppKey';

// Global variables for user state
let loggedin_email = '';
let owner_emailid = '';
let userRole = 'user';

const App = () => {
  const [stage, setStage] = useState('static');
  const [isBootstrapped, setIsBootstrapped] = useState(false);

  useEffect(() => {
    SplashScreen.hide();
    // Initialize configuration on app start
    initializeConfiguration();
  }, []);

  // Initialize configuration
  const initializeConfiguration = async () => {
    try {
      console.log('🔧 Initializing configuration...');
      await ConfigService.initializeConfig();
      console.log('✅ Configuration initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing configuration:', error);
    }
  };

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

  // Enhanced function to set up global variables and admin role
  const setupUserRoleAndGlobals = async (appOwnerInfo) => {
    try {
      console.log('🔧 Setting up user role and global variables...');
      
      // Extract owner email from AppOwnerInfo
      owner_emailid = appOwnerInfo.emailid || appOwnerInfo.email || appOwnerInfo.email_id || '';
      
      // Store owner email globally
      await EncryptedStorage.setItem('OWNER_EMAIL', owner_emailid);
      
      // Store mobile number globally
      const mobileNo = appOwnerInfo.mobile_no || appOwnerInfo.mobile_number || appOwnerInfo.phone || '';
      if (mobileNo) {
        await EncryptedStorage.setItem('MOBILE_NUMBER', mobileNo);
      }
      
      // Check if user is already logged in
      const storedLoginEmail = await EncryptedStorage.getItem('LOGGED_IN_EMAIL');
      const accessToken = await EncryptedStorage.getItem('ACCESS_TOKEN');
      
      if (storedLoginEmail && accessToken) {
        // User is logged in
        loggedin_email = storedLoginEmail;
        
        // Check if logged in user is the owner (admin)
        if (owner_emailid && loggedin_email === owner_emailid) {
          userRole = 'admin';
          console.log('👑 User identified as ADMIN (owner logged in)');
        } else {
          userRole = 'user';
          console.log('👤 User identified as regular USER (logged in but not owner)');
        }
      } else {
        // User is not logged in, default role
        loggedin_email = '';
        userRole = 'user';
        console.log('🔓 No user logged in, default role: USER');
      }
      
      // Store user role globally
      await EncryptedStorage.setItem('USER_ROLE', userRole);
      
      // Store global variables for access throughout app
      global.loggedin_email = loggedin_email;
      global.owner_emailid = owner_emailid;
      global.userRole = userRole;
      
      console.log('✅ Global variables set:');
      console.log('   📧 Owner Email:', owner_emailid);
      console.log('   👤 Logged In Email:', loggedin_email);
      console.log('   🔑 User Role:', userRole);
      
      return {
        loggedin_email,
        owner_emailid,
        userRole
      };
      
    } catch (error) {
      console.error('❌ Error setting up user role and globals:', error);
      // Set defaults on error
      userRole = 'user';
      loggedin_email = '';
      await EncryptedStorage.setItem('USER_ROLE', 'user');
      return { loggedin_email: '', owner_emailid: '', userRole: 'user' };
    }
  };

  // Improved bootstrap API call function with ConfigService integration
  const callBootstrapAPI = async (appKey) => {
    console.log('📡 Starting bootstrap API call...');

    try {
      // Get the bootstrap API URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      const bootstrapUrl = `${baseUrl}/api/bootstrap`;
      
      console.log('🔗 Bootstrap API URL:', bootstrapUrl);
      console.log('🔑 App Key (first 10 chars):', appKey.substring(0, 10) + '...');

      // Get device fingerprint using DeviceService
      console.log('📱 Getting device fingerprint from DeviceService...');
      const deviceFingerprint = await DeviceService.getDeviceFingerprint();
      console.log('📱 Device Fingerprint (first 20 chars):', deviceFingerprint.substring(0, 20) + '...');

      // Get additional device info for logging
      const deviceInfo = await DeviceService.getDeviceInfo();
      console.log('📱 Device Info:', deviceInfo);

      // Test server connectivity first
      console.log('🔍 Testing server connectivity...');
      const isServerReachable = await ConfigService.testConnection(baseUrl, 5000);
      
      if (!isServerReachable) {
        console.warn('⚠️ Server connectivity test failed, but attempting bootstrap anyway...');
        // Continue with the bootstrap call as the health endpoint might not exist
      } else {
        console.log('✅ Server is reachable');
      }

      // Make the API request
      const response = await axios.post(bootstrapUrl, {}, {
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
          
          // Setup user role and global variables based on AppOwnerInfo
          const userSetup = await setupUserRoleAndGlobals(response.data.AppOwnerInfo);
          
          // Show success alert with admin status
          Alert.alert(
            '🎉 Bootstrap Success!',
            `✅ API called successfully!\n\n` +
            `Status: ${response.status}\n` +
            `Base URL: ${baseUrl}\n` +
            `Device: ${deviceInfo}\n` +
            `AppOwnerInfo: Received and stored\n` +
            `Owner Email: ${userSetup.owner_emailid}\n` +
            `Logged In: ${userSetup.loggedin_email || 'None'}\n` +
            `Role: ${userSetup.userRole.toUpperCase()}\n` +
            `Keys: ${Object.keys(response.data.AppOwnerInfo).join(', ')}`,
            [{ text: 'Continue', onPress: () => setStage('app') }]
          );
          
          return { success: true, data: response.data, userSetup };
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
          `URL: ${await ConfigService.getBaseUrl()}\n` +
          `Data: ${JSON.stringify(error.response.data, null, 2)}`,
          [
            { text: 'Continue', onPress: () => setStage('app') },
            { 
              text: 'Change Server', 
              onPress: () => showServerConfigDialog() 
            }
          ]
        );
        
        return { success: false, error: `Server error: ${error.response.status}`, data: error.response.data };
      } else if (error.request) {
        // Request was made but no response received
        console.error('📡 Network Error - No response received');
        console.error('📋 Request Details:', error.request);
        
        const currentBaseUrl = await ConfigService.getBaseUrl();
        Alert.alert(
          '📡 Network Error',
          `No response from server. Please check:\n\n` +
          `• Internet connection\n` +
          `• Server is running\n` +
          `• Current URL: ${currentBaseUrl}\n` +
          `• Bootstrap endpoint: /api/bootstrap`,
          [
            { text: 'Continue', onPress: () => setStage('app') },
            { 
              text: 'Change Server', 
              onPress: () => showServerConfigDialog() 
            }
          ]
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

  // Show server configuration dialog
  const showServerConfigDialog = async () => {
    try {
      const currentBaseUrl = await ConfigService.getBaseUrl();
      
      Alert.prompt(
        '🔧 Configure Server URL',
        'Enter the base URL of your server (e.g., https://your-server.com or http://192.168.1.100:5000):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setStage('app') },
          {
            text: 'Save & Retry',
            onPress: async (url) => {
              if (url) {
                console.log('🔄 Updating server URL to:', url);
                const result = await ConfigService.updateBaseUrl(url.trim());
                
                if (result.success) {
                  Alert.alert(
                    '✅ Server Updated',
                    `Server URL updated to: ${url}\n\nRetrying bootstrap...`,
                    [{ text: 'OK', onPress: () => bootstrapFlow() }]
                  );
                } else {
                  Alert.alert(
                    '❌ Invalid Server URL',
                    result.message,
                    [
                      { text: 'Try Again', onPress: () => showServerConfigDialog() },
                      { text: 'Continue', onPress: () => setStage('app') }
                    ]
                  );
                }
              } else {
                setStage('app');
              }
            }
          }
        ],
        'plain-text',
        currentBaseUrl
      );
    } catch (error) {
      console.error('❌ Error getting current base URL:', error);
      
      Alert.prompt(
        '🔧 Configure Server URL',
        'Enter the base URL of your server (e.g., https://your-server.com or http://192.168.1.100:5000):',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setStage('app') },
          {
            text: 'Save & Retry',
            onPress: async (url) => {
              if (url) {
                console.log('🔄 Updating server URL to:', url);
                const result = await ConfigService.updateBaseUrl(url.trim());
                
                if (result.success) {
                  Alert.alert(
                    '✅ Server Updated',
                    `Server URL updated to: ${url}\n\nRetrying bootstrap...`,
                    [{ text: 'OK', onPress: () => bootstrapFlow() }]
                  );
                } else {
                  Alert.alert(
                    '❌ Invalid Server URL',
                    result.message,
                    [
                      { text: 'Try Again', onPress: () => showServerConfigDialog() },
                      { text: 'Continue', onPress: () => setStage('app') }
                    ]
                  );
                }
              } else {
                setStage('app');
              }
            }
          }
        ],
        'plain-text',
        '' // Default empty string if ConfigService fails
      );
    }
  };

  const bootstrapFlow = async () => {
    try {
      console.log('🚀 Starting bootstrap flow...');

      // Step 1: Generate and store app_key
      console.log('📱 Step 1: Generating app key...');
      const appKey = generateAppKey();
      console.log('📱 App key generation result type:', typeof appKey);
      console.log('📱 App key length:', appKey?.length);

      if (appKey && typeof appKey === 'string' && appKey.length > 0) {
        try {
          await EncryptedStorage.setItem('APP_KEY', appKey);
          console.log('✅ App key generated and stored securely');

          // Step 2: Call bootstrap API with ConfigService integration
          console.log('📱 Step 2: Calling bootstrap API...');
          const apiResult = await callBootstrapAPI(appKey);
          
          if (apiResult.success) {
            console.log('🎉 Bootstrap completed successfully!');
            console.log('🔧 User setup completed:', apiResult.userSetup);
            setIsBootstrapped(true);
          } else {
            console.log('⚠️ Bootstrap completed with warnings:', apiResult.error);
            setIsBootstrapped(true);
            // App continues even if API fails, but with default user role
            userRole = 'user';
            await EncryptedStorage.setItem('USER_ROLE', 'user');
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

// Export helper functions for use in other components
export const updateUserLoginStatus = async (email, accessToken) => {
  try {
    console.log('🔄 Updating user login status...');
    
    // Store login credentials
    await EncryptedStorage.setItem('LOGGED_IN_EMAIL', email);
    await EncryptedStorage.setItem('ACCESS_TOKEN', accessToken);
    
    // Update global variable
    loggedin_email = email;
    global.loggedin_email = email;
    
    // Get owner email to check admin status
    const storedOwnerEmail = await EncryptedStorage.getItem('OWNER_EMAIL');
    
    // Update user role based on login
    if (storedOwnerEmail && email === storedOwnerEmail) {
      userRole = 'admin';
      console.log('👑 User logged in as ADMIN (owner)');
    } else {
      userRole = 'user';
      console.log('👤 User logged in as regular USER');
    }
    
    // Store updated role
    await EncryptedStorage.setItem('USER_ROLE', userRole);
    global.userRole = userRole;
    
    console.log('✅ Login status updated successfully');
    console.log('   📧 Logged In Email:', email);
    console.log('   🔑 User Role:', userRole);
    
    return { success: true, userRole, loggedin_email };
    
  } catch (error) {
    console.error('❌ Error updating login status:', error);
    return { success: false, error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    console.log('🔓 Logging out user...');
    
    // Clear login credentials
    await EncryptedStorage.removeItem('LOGGED_IN_EMAIL');
    await EncryptedStorage.removeItem('ACCESS_TOKEN');
    
    // Reset global variables
    loggedin_email = '';
    userRole = 'user';
    global.loggedin_email = '';
    global.userRole = 'user';
    
    // Update stored role
    await EncryptedStorage.setItem('USER_ROLE', 'user');
    
    console.log('✅ User logged out successfully');
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error logging out user:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUserRole = async () => {
  try {
    const role = await EncryptedStorage.getItem('USER_ROLE') || 'user';
    const loggedInEmail = await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || '';
    
    return {
      userRole: role,
      loggedin_email: loggedInEmail,
      isAdmin: role === 'admin'
    };
  } catch (error) {
    console.error('❌ Error getting user role:', error);
    return {
      userRole: 'user',
      loggedin_email: '',
      isAdmin: false
    };
  }
};

// Helper function to get current server configuration
export const getServerConfig = async () => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoints = await ConfigService.getApiEndpoints();
    
    return {
      baseUrl,
      endpoints,
      bootstrapUrl: `${baseUrl}/api/bootstrap`
    };
  } catch (error) {
    console.error('❌ Error getting server config:', error);
    return null;
  }
};

// Helper function to update server URL
export const updateServerUrl = async (newUrl) => {
  try {
    const result = await ConfigService.updateBaseUrl(newUrl);
    return result;
  } catch (error) {
    console.error('❌ Error updating server URL:', error);
    return { success: false, message: error.message };
  }
};

export default App;