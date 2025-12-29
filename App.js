import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert } from 'react-native';
import SplashScreen from 'react-native-splash-screen';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import DeviceService from './src/services/DeviceService';
import ConfigService from './src/services/ConfigService';
import StaticBannerSplash from './src/components/StaticBannerSplash';
import LogoSplash from './src/components/LogoSplash';
import YouTubeSplash from './src/components/YouTubeSplash';
import AppNavigator from './src/navigation/AppNavigator';
import { generateAppKey } from './src/utils/generateAppKey';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { TranslationProvider } from './src/context/TranslationContext';
import UpdateStatusService from './src/services/UpdateStatusService';
import LocalStorageService from './src/services/LocalStorageService';

// Global variables for user state - Centralized Management
// Add this with other global variables at top
let loggedin_email = '';
let owner_emailid = '';
let owner_mobile = '';
let owner_name = ''; // ✅ ADD THIS LINE
let userRole = 'user';
let isAppBootstrapped = false;

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

// ✅ ADD THIS SIMPLE FUNCTION
const initializeCrashlytics = async () => {
  try {
    // Enable Crashlytics
    await crashlytics().setCrashlyticsCollectionEnabled(true);
    
    // Set custom attributes for better debugging
    await crashlytics().setAttribute('app_name', 'Leader App');
    await crashlytics().setAttribute('environment', __DEV__ ? 'development' : 'production');
    
    // Log initialization
    crashlytics().log('Crashlytics initialized successfully');
    console.log('✅ Firebase Crashlytics initialized');
    
    // Set user ID if available
    try {
      const userEmail = await AsyncStorage.getItem('userEmail');
      if (userEmail) {
        await crashlytics().setUserId(userEmail);
        crashlytics().log(`User identified: ${userEmail}`);
      }
    } catch (err) {
      console.log('Could not set user ID:', err);
    }
    
    // ONLY show alert in DEV mode
    if (__DEV__) {
      console.log('🎉 Crashlytics Ready - Test crash button available in HomeScreen');
    }
    
  } catch (error) {
    console.error('❌ Crashlytics initialization error:', error);
  }
};

  // ✅ Handle notification tap - Navigate to Home
useEffect(() => {
  // When app is opened from notification (background)
  const unsubscribe = messaging().onNotificationOpenedApp(remoteMessage => {
    console.log('📲 Notification opened app from background:', remoteMessage);
    Alert.alert('Notification Tapped!', 'Opening Home Screen...');
    // Navigation happens automatically since Home is the first screen
  });

  // When app is opened from notification (quit state)
  messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        console.log('📲 Notification opened app from quit state:', remoteMessage);
        Alert.alert('Notification Tapped!', 'Opening Home Screen...');
      }
    });

  return unsubscribe;
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

  // Enhanced function to set up global variables and determine initial admin role
// Add this temporary debugging code to your setupGlobalVariablesFromBootstrap function
// Place it right after the line: console.log('🔧 Setting up global variables from bootstrap...');

const setupGlobalVariablesFromBootstrap = async (appOwnerInfo) => {
  try {
    console.log('🔧 Setting up global variables from bootstrap...');
    
    // ===== DETAILED DEBUG LOGGING =====
    console.log('🐛 === DEBUGGING APPOWNERINFO ===');
    console.log('📋 AppOwnerInfo type:', typeof appOwnerInfo);
    console.log('📋 AppOwnerInfo is null/undefined:', appOwnerInfo == null);
    console.log('📋 AppOwnerInfo raw object:', appOwnerInfo);
    console.log('📋 AppOwnerInfo JSON:', JSON.stringify(appOwnerInfo, null, 2));
    
    if (appOwnerInfo && typeof appOwnerInfo === 'object') {
      console.log('📋 Available keys in AppOwnerInfo:', Object.keys(appOwnerInfo));
      console.log('📋 Number of keys:', Object.keys(appOwnerInfo).length);
      
      // Log each field with its type and value
      console.log('📋 === ALL APPOWNERINFO FIELDS ===');
      Object.keys(appOwnerInfo).forEach(key => {
        const value = appOwnerInfo[key];
        const type = typeof value;
        console.log(`   ${key}: (${type}) = ${value}`);
        
        // Special check for email-like fields
        if (typeof value === 'string' && (
          key.toLowerCase().includes('email') || 
          key.toLowerCase().includes('mail') ||
          value.includes('@')
        )) {
          console.log(`   🎯 POTENTIAL EMAIL FIELD FOUND: ${key} = ${value}`);
        }
      });
    } else {
      console.log('❌ AppOwnerInfo is not a valid object!');
    }
    
    // ===== CONTINUE WITH ENHANCED EMAIL EXTRACTION =====
    
    // All possible email field names (expanded list)
    const possibleEmailFields = [
      'emailid', 'email', 'email_id', 'owner_email', 'ownerEmail',
      'Email', 'EmailId', 'EMAILID', 'EMAIL', 'userEmail', 'adminEmail',
      'mail', 'Mail', 'MAIL', 'e_mail', 'eMail', 'emailAddress',
      'email_address', 'EmailAddress', 'owner_mail', 'ownerMail',
      'user_email', 'admin_email', 'login_email', 'loginEmail',
      'contact_email', 'contactEmail', 'primary_email', 'primaryEmail'
    ];
    
    let extractedOwnerEmail = '';
    let foundEmailField = '';
    
    // Try to find email in any field
    for (const field of possibleEmailFields) {
      if (appOwnerInfo[field] && typeof appOwnerInfo[field] === 'string') {
        const emailValue = appOwnerInfo[field].trim();
        if (emailValue.includes('@')) { // Basic email validation
          extractedOwnerEmail = emailValue.toLowerCase();
          foundEmailField = field;
          console.log(`✅ FOUND OWNER EMAIL in field '${field}': ${extractedOwnerEmail}`);
          break;
        }
      }
    }
    
    // If still no email found, check all string fields for @ symbol
    if (!extractedOwnerEmail && appOwnerInfo) {
      console.log('🔍 Searching ALL string fields for email addresses...');
      Object.keys(appOwnerInfo).forEach(key => {
        const value = appOwnerInfo[key];
        if (typeof value === 'string' && value.includes('@') && value.includes('.')) {
          console.log(`🎯 FOUND EMAIL-LIKE VALUE in '${key}': ${value}`);
          if (!extractedOwnerEmail) {
            extractedOwnerEmail = value.trim().toLowerCase();
            foundEmailField = key;
          }
        }
      });
    }
    
    if (!extractedOwnerEmail) {
      console.error('❌ === NO OWNER EMAIL FOUND ===');
      console.error('❌ Searched fields:', possibleEmailFields);
      console.error('❌ Available fields:', appOwnerInfo ? Object.keys(appOwnerInfo) : 'AppOwnerInfo is null');
      console.error('❌ This will prevent admin role detection!');
      
      // Show alert to help with debugging
      Alert.alert(
        '⚠️ Debug: No Owner Email Found',
        `AppOwnerInfo received but no email field found.\n\n` +
        `Available fields: ${appOwnerInfo ? Object.keys(appOwnerInfo).join(', ') : 'None'}\n\n` +
        `Please check your API response structure.`,
        [{ text: 'Continue' }]
      );
    } else {
      console.log(`🎉 EMAIL EXTRACTION SUCCESSFUL!`);
      console.log(`   Field used: ${foundEmailField}`);
      console.log(`   Email found: ${extractedOwnerEmail}`);
    }
    
    owner_emailid = extractedOwnerEmail;
    
    // Continue with rest of your existing mobile extraction code...
    const possibleMobileFields = [
  'mobile_no', 'mobile_number', 'phone', 'mobileNo', 'regdMobileNo',
  'Mobile', 'MobileNo', 'MOBILE', 'phoneNumber', 'contactNumber',
  'mobile', 'cell', 'cellular', 'contact', 'phone_number',
  'client_mobile'   // ✅ add this
];

    let extractedOwnerMobile = '';
    for (const field of possibleMobileFields) {
      if (appOwnerInfo[field] && (typeof appOwnerInfo[field] === 'string' || typeof appOwnerInfo[field] === 'number')) {
        extractedOwnerMobile = String(appOwnerInfo[field]).trim();
        console.log(`✅ Found owner mobile in field '${field}': ${extractedOwnerMobile}`);
        break;
      }
    }
    
    owner_mobile = extractedOwnerMobile;
    // Inside setupGlobalVariablesFromBootstrap function
// After extracting owner_mobile, add this:

// ✅ ADD THIS BLOCK - Extract client_name
const possibleNameFields = [
  'client_name', 'name', 'owner_name', 'ownerName', 'fullName',
  'full_name', 'Name', 'CLIENT_NAME', 'clientName', 'leaderName',
  'leader_name', 'userName', 'user_name'
];

let extractedOwnerName = '';
for (const field of possibleNameFields) {
  if (appOwnerInfo[field] && typeof appOwnerInfo[field] === 'string') {
    extractedOwnerName = appOwnerInfo[field].trim();
    console.log(`✅ Found owner name in field '${field}': ${extractedOwnerName}`);
    break;
  }
}

owner_name = extractedOwnerName;

// Store owner name
if (owner_name) {
  await EncryptedStorage.setItem('OWNER_NAME', owner_name);
  console.log('💾 Owner name stored:', owner_name);
} else {
  console.log('⚠️ No owner name found - will use default');
  await EncryptedStorage.setItem('OWNER_NAME', '');

}

const possibleAppNameFields = [
  'client_app_name', 'app_name', 'appName', 'application_name',
  'CLIENT_APP_NAME', 'AppName', 'clientAppName'
];

let extractedAppName = '';
for (const field of possibleAppNameFields) {
  if (appOwnerInfo[field] && typeof appOwnerInfo[field] === 'string') {
    extractedAppName = appOwnerInfo[field].trim();
    console.log(`✅ Found app name in field '${field}': ${extractedAppName}`);
    break;
  }
}

global.client_app_name = extractedAppName;

// Store client_app_name in encrypted storage
if (extractedAppName) {
  await EncryptedStorage.setItem('CLIENT_APP_NAME', extractedAppName);
  console.log('💾 Client app name stored:', extractedAppName);
} else {
  console.log('⚠️ No client app name found - will use default');
  await EncryptedStorage.setItem('CLIENT_APP_NAME', 'Leader App');
}
    
    // Store owner information in encrypted storage
    if (owner_emailid) {
      await EncryptedStorage.setItem('OWNER_EMAIL', owner_emailid);
      console.log('💾 Owner email stored:', owner_emailid);
    } else {
      console.error('❌ Cannot store owner email - not found in AppOwnerInfo');
      // Store empty string to avoid undefined errors
      await EncryptedStorage.setItem('OWNER_EMAIL', '');
    }
    
    if (owner_mobile) {
      await EncryptedStorage.setItem('OWNER_MOBILE', owner_mobile);
      console.log('💾 Owner mobile stored:', owner_mobile);
    }

    // Store complete AppOwnerInfo for future reference
    await EncryptedStorage.setItem('AppOwnerInfo', JSON.stringify(appOwnerInfo));
    console.log('💾 Complete AppOwnerInfo stored');
    
    // Continue with the rest of your existing login check code...
    const storedLoginEmail = await AsyncStorage.getItem('userEmail') || 
                            await EncryptedStorage.getItem('LOGGED_IN_EMAIL');
    const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                       await EncryptedStorage.getItem('ACCESS_TOKEN');
    
    console.log('🔍 Checking existing login status...');
    console.log('   📧 Stored login email:', storedLoginEmail);
    console.log('   🔑 Access token exists:', !!accessToken);
    
    if (storedLoginEmail && accessToken) {
      const processedLoginEmail = storedLoginEmail.trim().toLowerCase();
      loggedin_email = processedLoginEmail;
      
      console.log('🔍 ADMIN CHECK:');
      console.log('   Login Email:', processedLoginEmail);
      console.log('   Owner Email:', owner_emailid);
      console.log('   Emails match:', processedLoginEmail === owner_emailid);
      
      if (owner_emailid && processedLoginEmail === owner_emailid) {
        userRole = 'admin';
        console.log('👑 ADMIN IDENTIFIED - Owner is logged in');
      } else {
        userRole = 'user';
        console.log('👤 Regular USER identified');
        if (!owner_emailid) {
          console.log('   Reason: No owner email found in AppOwnerInfo');
        }
      }
    } else {
      loggedin_email = '';
      userRole = 'user';
      console.log('🔓 No user logged in - Default role: USER');
    }
    
    // Store current user role
    await EncryptedStorage.setItem('USER_ROLE', userRole);
    
    // Set global variables
    global.loggedin_email = loggedin_email;
    global.owner_emailid = owner_emailid;
    global.owner_mobile = owner_mobile;
    global.owner_name = owner_name;
    global.userRole = userRole;
    global.isAppBootstrapped = true;
    isAppBootstrapped = true;
    
    console.log('✅ Global variables initialized:');
    console.log('   📧 Owner Email:', owner_emailid);
    console.log('   📱 Owner Mobile:', owner_mobile);
    console.log('   👤 Owner Name:', owner_name);
    console.log('   👤 Logged In Email:', loggedin_email);
    console.log('   🔑 User Role:', userRole);
    console.log('   🚀 App Bootstrapped:', isAppBootstrapped);
    
    return {
      loggedin_email,
      owner_emailid,
      owner_mobile,
      owner_name,
      userRole,
      isBootstrapped: true
    };
    
  } catch (error) {
    console.error('❌ Error setting up global variables:', error);
    // ... rest of your error handling code
  }
};

  // Improved bootstrap API call function with ConfigService integration
 // Replace your existing callBootstrapAPI function with this updated version

// Replace your existing callBootstrapAPI function with this updated version

const callBootstrapAPI = async (appKey) => {
  console.log('📡 Starting bootstrap API call...');

  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const bootstrapUrl = `${baseUrl}/api/bootstrap`;
    
    console.log('🔗 Bootstrap API URL:', bootstrapUrl);
    console.log('🔑 App Key (first 10 chars):', appKey.substring(0, 10) + '...');

    console.log('📱 Getting device fingerprint from DeviceService...');
    const deviceFingerprint = await DeviceService.getDeviceFingerprint();
    console.log('📱 Device Fingerprint (first 20 chars):', deviceFingerprint.substring(0, 20) + '...');

    const deviceInfo = await DeviceService.getDeviceInfo();
    console.log('📱 Device Info:', deviceInfo);

    // ✅ REMOVED: No longer passing device info in bootstrap
    // Just pass user email if logged in
    const userEmail = await AsyncStorage.getItem('userEmail') || 
                     await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || 
                     'null';
    
    console.log('📧 User Email for bootstrap:', userEmail);

    // ✅ SIMPLIFIED: Only send user email
    const requestBody = {
      user_email_id: userEmail
    };

    console.log('📤 Request Body:', JSON.stringify(requestBody, null, 2));

    console.log('🔍 Testing server connectivity...');
    const isServerReachable = await ConfigService.testConnection(baseUrl, 5000);
    
    if (!isServerReachable) {
      console.warn('⚠️ Server connectivity test failed, but attempting bootstrap anyway...');
    } else {
      console.log('✅ Server is reachable');
    }

    // Make the API request
    const response = await axios.post(
      bootstrapUrl, 
      requestBody,
      {
        headers: {
          'x-app-key': appKey,
          'x-device-fingerprint': deviceFingerprint,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log('✅ Bootstrap API Request Successful!');
    console.log('📊 Response Status:', response.status);
    
    // ... rest of your existing validation and setup code
    const validation = validateBootstrapResponse(response.data);
    
    if (validation.isValid) {
  console.log('✅ Response validation passed:', validation.message);
  const globalSetup = await setupGlobalVariablesFromBootstrap(response.data.AppOwnerInfo);
  
  Alert.alert(
    '🎉 Bootstrap Success!',
    `✅ App initialized successfully!\n\n` +
    `Status: ${response.status}\n` +
    `Base URL: ${baseUrl}\n\n` +
    `🏛️ APP OWNER INFO:\n` +
    `Owner Email: ${globalSetup.owner_emailid || 'Not found'}\n` +
    `Owner Mobile: ${globalSetup.owner_mobile || 'Not found'}\n\n` +
    `👤 CURRENT USER STATUS:\n${globalSetup.userRole === 'admin' ? '👑 ADMIN' : '👤 USER'}`,
    [{ text: 'Continue', onPress: () => setStage('app') }]
  );
  
  return { success: true, data: response.data, globalSetup };
}
    // ... rest of error handling

  } catch (error) {
    // ... your existing error handling
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
        ''
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
            console.log('🔧 Global setup completed:', apiResult.globalSetup);
            setIsBootstrapped(true);
          } else {
            console.log('⚠️ Bootstrap completed with warnings:', apiResult.error);
            setIsBootstrapped(true);
            // App continues even if API fails, but with default user role
            userRole = 'user';
            await EncryptedStorage.setItem('USER_ROLE', 'user');
            global.userRole = 'user';
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
useEffect(() => {
  if (stage === 'app') {
    initializeFCM();
     initializeCrashlytics(); 
  }
}, [stage]);

const initializeFCM = async () => {
  try {
    console.log('🔔 Initializing FCM...');
    
    // Request permission
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('✅ Notification permission granted');
      
      // Get FCM token
      const token = await messaging().getToken();
      console.log('🔑 FCM Token:', token);
      
      // Store token
      await AsyncStorage.setItem('FCM_TOKEN', token);
    }
  } catch (error) {
    console.error('❌ FCM initialization error:', error);
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
      <TranslationProvider>
        <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      </TranslationProvider>
    );
  }

  // ✅ ADD THIS - Initialize FCM and show token

  return null;
};

// Enhanced helper function to update user login status
// Updated version of your updateUserLoginStatus function
export const updateUserLoginStatus = async (email, accessToken, userData = null) => {
  try {
    console.log('🔄 === UPDATING USER LOGIN STATUS ===');
    console.log('📧 Login Email (raw):', email);
    console.log('📧 Login Email (processed):', email?.trim().toLowerCase());
    console.log('🔑 Access Token Length:', accessToken?.length);
    
    // Process email consistently
    const processedEmail = email.trim().toLowerCase();
    
    // Store login credentials in both AsyncStorage and EncryptedStorage
    await AsyncStorage.setItem('userEmail', processedEmail);
    await AsyncStorage.setItem('user_email_id', processedEmail); // ADD THIS LINE for ProfileAPI
    await AsyncStorage.setItem('userAccessToken', accessToken);
    await AsyncStorage.setItem('jwt_token', accessToken); // ADD THIS LINE for consistency
    await EncryptedStorage.setItem('LOGGED_IN_EMAIL', processedEmail);
    await EncryptedStorage.setItem('ACCESS_TOKEN', accessToken);
    
    // Store additional user data if provided
    if (userData) {
      // Ensure email is in userData as well
      userData.email = userData.email || processedEmail;
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('💾 User data stored');
    }
    
    // Update global variable
    loggedin_email = processedEmail;
    global.loggedin_email = processedEmail;
    
    // Get owner email to determine admin status
    const storedOwnerEmail = await EncryptedStorage.getItem('OWNER_EMAIL');
    
    console.log('🔍 DETAILED ADMIN CHECK IN LOGIN UPDATE:');
    console.log('   📧 Login Email (processed):', processedEmail);
    console.log('   👑 Owner Email (from storage):', storedOwnerEmail);
    console.log('   🔄 Emails match (===):', processedEmail === storedOwnerEmail);
    console.log('   👑 Owner email exists:', !!storedOwnerEmail);
    console.log('   📧 Login email exists:', !!processedEmail);
    
    // Determine user role based on email comparison
    if (storedOwnerEmail && processedEmail === storedOwnerEmail) {
      userRole = 'admin';
      console.log('👑 ✅ ADMIN STATUS GRANTED - Owner logged in');
      console.log('   Matched emails: login=' + processedEmail + ' | owner=' + storedOwnerEmail);
    } else {
      userRole = 'user';
      console.log('👤 ❌ USER STATUS - Regular user logged in');
      if (!storedOwnerEmail) {
        console.log('   Reason: No owner email found in storage (app not bootstrapped?)');
      } else {
        console.log(`   Reason: Email mismatch - '${processedEmail}' !== '${storedOwnerEmail}'`);
      }
    }
    
    // Store updated role
    await EncryptedStorage.setItem('USER_ROLE', userRole);
    global.userRole = userRole;
    
    console.log('✅ === LOGIN STATUS UPDATE COMPLETE ===');
    console.log('   📧 Logged In Email:', processedEmail);
    console.log('   🔑 User Role:', userRole);
    console.log('   👑 Is Admin:', userRole === 'admin');
    console.log('   👑 Owner Email:', storedOwnerEmail);
    
    return { 
      success: true, 
      userRole, 
      loggedin_email: processedEmail,
      isAdmin: userRole === 'admin',
      owner_emailid: storedOwnerEmail
    };
    
  } catch (error) {
    console.error('❌ Error updating login status:', error);
    console.error('❌ Stack trace:', error.stack);
    return { success: false, error: error.message };
  }
};

// Add a debugging helper function
export const debugAdminStatus = async () => {
  try {
    console.log('🐛 === ADMIN STATUS DEBUG ===');
    
    // Get all relevant stored values
    const storedOwnerEmail = await EncryptedStorage.getItem('OWNER_EMAIL');
    const storedLoginEmail = await AsyncStorage.getItem('userEmail') || 
                           await EncryptedStorage.getItem('LOGGED_IN_EMAIL');
    const storedUserRole = await EncryptedStorage.getItem('USER_ROLE');
    const storedAppOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
    
    console.log('📊 STORED VALUES:');
    console.log('   Owner Email:', storedOwnerEmail);
    console.log('   Login Email:', storedLoginEmail);
    console.log('   User Role:', storedUserRole);
    console.log('   AppOwnerInfo exists:', !!storedAppOwnerInfo);
    
    if (storedAppOwnerInfo) {
      try {
        const parsedOwnerInfo = JSON.parse(storedAppOwnerInfo);
        console.log('   AppOwnerInfo keys:', Object.keys(parsedOwnerInfo));
        console.log('   AppOwnerInfo values:');
        Object.keys(parsedOwnerInfo).forEach(key => {
          console.log(`      ${key}: ${typeof parsedOwnerInfo[key]} = ${parsedOwnerInfo[key]}`);
        });
      } catch (e) {
        console.log('   AppOwnerInfo parse error:', e.message);
      }
    }
    
    console.log('🌍 GLOBAL VARIABLES:');
    console.log('   global.owner_emailid:', global.owner_emailid);
    console.log('   global.loggedin_email:', global.loggedin_email);
    console.log('   global.userRole:', global.userRole);
    console.log('   module owner_emailid:', owner_emailid);
    console.log('   module loggedin_email:', loggedin_email);
    console.log('   module userRole:', userRole);
    
    console.log('🔍 COMPARISON CHECK:');
    if (storedOwnerEmail && storedLoginEmail) {
      const ownerProcessed = storedOwnerEmail.trim().toLowerCase();
      const loginProcessed = storedLoginEmail.trim().toLowerCase();
      console.log('   Owner (processed):', ownerProcessed);
      console.log('   Login (processed):', loginProcessed);
      console.log('   Match (===):', ownerProcessed === loginProcessed);
      console.log('   Expected role:', ownerProcessed === loginProcessed ? 'admin' : 'user');
    } else {
      console.log('   Cannot compare - missing owner or login email');
    }
    
    return {
      storedOwnerEmail,
      storedLoginEmail,
      storedUserRole,
      hasAppOwnerInfo: !!storedAppOwnerInfo,
      globalValues: {
        owner_emailid: global.owner_emailid,
        loggedin_email: global.loggedin_email,
        userRole: global.userRole
      }
    };
    
  } catch (error) {
    console.error('❌ Error in admin status debug:', error);
    return { error: error.message };
  }
};

export const logoutUser = async () => {
  try {
    console.log('🔓 === LOGGING OUT USER ===');
    
    // Clear login credentials from both storages
    await AsyncStorage.removeItem('userEmail');
    await AsyncStorage.removeItem('userAccessToken');
    await AsyncStorage.removeItem('userData');
    await EncryptedStorage.removeItem('LOGGED_IN_EMAIL');
    await EncryptedStorage.removeItem('ACCESS_TOKEN');
    
    // Reset global variables (keep owner info, reset user session)
    loggedin_email = '';
    userRole = 'user';
    global.loggedin_email = '';
    global.userRole = 'user';
    
    // Update stored role to default user
    await EncryptedStorage.setItem('USER_ROLE', 'user');
    
    console.log('✅ User logged out successfully');
    console.log('   📧 Logged In Email: (cleared)');
    console.log('   🔑 User Role: user (default)');
    console.log('   👑 Owner Email: (preserved)', owner_emailid);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error logging out user:', error);
    return { success: false, error: error.message };
  }
};

export const getCurrentUserRole = async () => {
  try {
    const role = await EncryptedStorage.getItem('USER_ROLE') || userRole || 'user';
    const loggedInEmail = await AsyncStorage.getItem('userEmail') || 
                         await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || 
                         loggedin_email || '';
    
    const ownerEmail = await EncryptedStorage.getItem('OWNER_EMAIL') || owner_emailid;
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || owner_mobile;
    const ownerName = await EncryptedStorage.getItem('OWNER_NAME') || owner_name || '';
    const clientAppName = await EncryptedStorage.getItem('CLIENT_APP_NAME') || 'Leader App'; // ✅ ADD THIS
    
    return {
      userRole: role,
      loggedin_email: loggedInEmail,
      owner_emailid: ownerEmail,
      owner_mobile: ownerMobile,
      owner_name: ownerName,
      client_app_name: clientAppName, // ✅ ADD THIS LINE
      isAdmin: role === 'admin',
      isLoggedIn: !!loggedInEmail,
      isAppBootstrapped: global.isAppBootstrapped || isAppBootstrapped
    };
  } catch (error) {
    console.error('❌ Error getting user role:', error);
    return {
      userRole: 'user',
      loggedin_email: '',
      owner_emailid: '',
      owner_mobile: '',
      owner_name: '',
      client_app_name: 'Leader App', // ✅ ADD THIS LINE
      isAdmin: false,
      isLoggedIn: false,
      isAppBootstrapped: false
    };
  }
};

// Helper function to check if current user is admin
export const checkIfCurrentUserIsAdmin = async () => {
  try {
    const currentRole = await getCurrentUserRole();
    return {
      isAdmin: currentRole.isAdmin,
      reason: currentRole.isAdmin 
        ? 'Owner is currently logged in' 
        : 'User is not the app owner or not logged in',
      userRole: currentRole.userRole,
      loggedin_email: currentRole.loggedin_email,
      owner_emailid: currentRole.owner_emailid
    };
  } catch (error) {
    console.error('❌ Error checking admin status:', error);
    return {
      isAdmin: false,
      reason: 'Error checking admin status',
      userRole: 'user',
      loggedin_email: '',
      owner_emailid: ''
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

// Helper function for debugging - get all global variables
export const getGlobalVariablesDebug = () => {
  return {
    loggedin_email,
    owner_emailid,
    owner_mobile,
    userRole,
    isAppBootstrapped,
    global_loggedin_email: global.loggedin_email,
    global_owner_emailid: global.owner_emailid,
    global_owner_mobile: global.owner_mobile,
    global_userRole: global.userRole,
    global_isAppBootstrapped: global.isAppBootstrapped
  };
};

// NEW: Helper function to get user data for drawer (add this to your utils or App.js)
export const getUserDataForDrawer = () => {
  return {
    name: global.currentUserName || 'User',
    email: global.currentUserEmail || '',
    mobile: global.currentUserMobile || '',
    city: global.currentUserCity || '',
    profileImage: global.currentUserProfileImage || null,
    isLoggedIn: global.isUserLoggedin || false,
    isAdmin: global.isUserAdmin || false,
    fullUserData: global.currentUser || null
  };
};

// NEW: Add this to your App.js to load user data on app startup
export const initializeUserDataOnAppStart = async () => {
  try {
    const isLoggedin = await AsyncStorage.getItem('isLoggedin');
    const userData = await AsyncStorage.getItem('userData');
    
    if (isLoggedin === 'TRUE' && userData) {
      const parsedUserData = JSON.parse(userData);
      
      // Set global variables immediately
      global.currentUser = parsedUserData;
      global.currentUserName = parsedUserData.name || parsedUserData.fullName;
      global.currentUserEmail = parsedUserData.email;
      global.isUserAdmin = parsedUserData.isAdmin || false;
      global.isUserLoggedin = true;
      global.currentUserMobile = parsedUserData.mobile || parsedUserData.mobileNo;
      global.currentUserCity = parsedUserData.city;
      global.currentUserProfileImage = parsedUserData.profile_image;
      
      console.log('✅ User data initialized on app start:', {
        name: global.currentUserName,
        email: global.currentUserEmail,
        isAdmin: global.isUserAdmin
      });
      
      return parsedUserData;
    }
  } catch (error) {
    console.log('❌ Error initializing user data on app start:', error);
  }
  return null;
};


export default App;