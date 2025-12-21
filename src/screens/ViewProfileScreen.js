import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import AuthService from '../utils/AuthService';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';

// Enhanced Logging Service
class LoggingService {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  static currentLogLevel = __DEV__ ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;

  static colors = {
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m',
  };

  static log(level, category, message, data = null) {
    if (this.LOG_LEVELS[level] >= this.currentLogLevel) {
      const timestamp = new Date().toISOString().slice(11, 23);
      const color = this.colors[level] || this.colors.RESET;
      const resetColor = this.colors.RESET;
      
      console.log(
        `${color}[${timestamp}] [${level}] [${category}]${resetColor} ${message}`
      );
      
      if (data) {
        console.log(`${color}📊 Data:${resetColor}`, data);
      }
    }
  }

  static debug(category, message, data) { this.log('DEBUG', category, message, data); }
  static info(category, message, data) { this.log('INFO', category, message, data); }
  static warn(category, message, data) { this.log('WARN', category, message, data); }
  static error(category, message, data) { this.log('ERROR', category, message, data); }

  static profileDebug(message, data) { this.debug('PROFILE', message, data); }
  static profileInfo(message, data) { this.info('PROFILE', message, data); }
  static profileWarn(message, data) { this.warn('PROFILE', message, data); }
  static profileError(message, data) { this.error('PROFILE', message, data); }
}

// Updated Image Service
class ImageService {
  static async testImageUrl(imageUrl) {
    try {
      LoggingService.profileDebug('Testing image URL accessibility', { url: imageUrl });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      LoggingService.profileInfo('Image URL test result', {
        url: imageUrl,
        status: response.status,
        accessible: response.ok
      });
      
      return response.ok;
    } catch (error) {
      LoggingService.profileError('Image URL not accessible', {
        url: imageUrl,
        error: error.message
      });
      return false;
    }
  }
  
 static async getWorkingImageUrl(imageUrl) {
  if (!imageUrl || imageUrl === 'placeholder') {
    LoggingService.profileWarn('No valid image path provided', { imageUrl });
    return null;
  }
  
  try {
    // If it's already a full URL, normalize it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      let normalizedUrl = imageUrl;
      
      // Remove port from ngrok URLs (ngrok doesn't use ports in URLs)
      if (normalizedUrl.includes('ngrok-free.app:')) {
        normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
        LoggingService.profileInfo('Removed port from ngrok URL', { 
          original: imageUrl, 
          normalized: normalizedUrl 
        });
      }
      
      // Replace localhost with current base URL
      if (normalizedUrl.includes('localhost:5000') || normalizedUrl.includes('localhost:')) {
        const baseUrl = await ConfigService.getBaseUrl();
        normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
        LoggingService.profileInfo('Replaced localhost with base URL', { 
          original: imageUrl, 
          normalized: normalizedUrl 
        });
      }
      
      // Test if the normalized URL is accessible
      const isAccessible = await this.testImageUrl(normalizedUrl);
      
      if (isAccessible) {
        LoggingService.profileInfo('Image URL is working', { url: normalizedUrl });
        return normalizedUrl;
      } else {
        LoggingService.profileWarn('Normalized URL not accessible, trying fallbacks', { 
          url: normalizedUrl 
        });
      }
    }
    
    // If URL is relative or previous attempts failed, try fallback paths
    const baseUrl = await ConfigService.getBaseUrl();
    const cleanPath = imageUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    
    // Extract just the filename if it's a full path
    const filename = cleanPath.split('/').pop();
    
    const fallbackPaths = [
      `${baseUrl}/uploads/profile_images/${filename}`,
      `${baseUrl}/profile/${filename}`,
      `${baseUrl}/uploads/${filename}`,
      `${baseUrl}/${cleanPath}`,
    ];
    
    for (const fallbackUrl of fallbackPaths) {
      const isAccessible = await this.testImageUrl(fallbackUrl);
      if (isAccessible) {
        LoggingService.profileInfo('Found working fallback image URL', { url: fallbackUrl });
        return fallbackUrl;
      }
    }
    
    LoggingService.profileWarn('No accessible image URL found', { 
      originalUrl: imageUrl, 
      testedUrls: fallbackPaths 
    });
    return null;
    
  } catch (error) {
    LoggingService.profileError('Error in getWorkingImageUrl', {
      error: error.message,
      imageUrl
    });
    return null;
  }
}
}

// Enhanced Admin Service
class AdminService {
  static async checkIfUserIsAdmin(userEmail) {
    try {
      LoggingService.profileInfo('Checking if user is admin', { userEmail });
      
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      
      if (!appOwnerInfoStr) {
        LoggingService.profileWarn('No AppOwnerInfo found in storage');
        return { isAdmin: false, ownerEmail: null };
      }
      
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      const ownerEmail = appOwnerInfo.emailid || appOwnerInfo.email || appOwnerInfo.email_id;
      
      LoggingService.profileDebug('Owner email comparison', {
        userEmail: userEmail?.toLowerCase(),
        ownerEmail: ownerEmail?.toLowerCase(),
        appOwnerInfoKeys: Object.keys(appOwnerInfo)
      });
      
      if (!ownerEmail) {
        LoggingService.profileWarn('No owner email found in AppOwnerInfo');
        return { isAdmin: false, ownerEmail: null };
      }
      
      const isAdmin = userEmail?.toLowerCase() === ownerEmail?.toLowerCase();
      
      LoggingService.profileInfo(`Admin check result: ${isAdmin ? 'Admin' : 'User'}`, {
        isAdmin,
        userEmail,
        ownerEmail,
        match: isAdmin
      });
      
      return { 
        isAdmin, 
        ownerEmail: ownerEmail,
        appOwnerInfo: appOwnerInfo
      };
      
    } catch (error) {
      LoggingService.profileError('Error checking admin status', {
        error: error.message,
        userEmail
      });
      return { isAdmin: false, ownerEmail: null };
    }
  }
  
  static async getUserRoleInfo(userEmail) {
    try {
      const adminCheck = await this.checkIfUserIsAdmin(userEmail);
      const storedRole = await EncryptedStorage.getItem('USER_ROLE') || 'user';
      
      LoggingService.profileDebug('Complete user role info', {
        adminCheckResult: adminCheck.isAdmin,
        storedRole: storedRole,
        userEmail: userEmail
      });
      
      return {
        isAdmin: adminCheck.isAdmin,
        userRole: adminCheck.isAdmin ? 'admin' : 'user',
        storedRole: storedRole,
        ownerEmail: adminCheck.ownerEmail,
        appOwnerInfo: adminCheck.appOwnerInfo
      };
      
    } catch (error) {
      LoggingService.profileError('Error getting user role info', error);
      return {
        isAdmin: false,
        userRole: 'user',
        storedRole: 'user',
        ownerEmail: null
      };
    }
  }
}

// Updated Profile API Class
// Updated Profile API Class to match Postman structure - Replace the existing ProfileAPI class in ViewProfileScreen
class ProfileAPI {
static async getUserEmail() {
  console.log('🔍 Starting email search based on App.js storage patterns...');
  
  // 1. AsyncStorage 'userEmail' (primary location)
  try {
    const userEmail = await AsyncStorage.getItem('userEmail');
    if (userEmail && userEmail.trim() !== '') {
      console.log('✅ Email found in AsyncStorage[userEmail]:', userEmail);
      return userEmail.trim();
    }
  } catch (error) {
    console.log('⚠️ Error reading AsyncStorage[userEmail]:', error.message);
  }
  
  // 2. EncryptedStorage 'LOGGED_IN_EMAIL'
  try {
    const encryptedEmail = await EncryptedStorage.getItem('LOGGED_IN_EMAIL');
    if (encryptedEmail && encryptedEmail.trim() !== '') {
      console.log('✅ Email found in EncryptedStorage[LOGGED_IN_EMAIL]:', encryptedEmail);
      return encryptedEmail.trim();
    }
  } catch (error) {
    console.log('⚠️ Error reading EncryptedStorage[LOGGED_IN_EMAIL]:', error.message);
  }
  
  // 3. Check userData object
  try {
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsed = JSON.parse(userData);
      console.log('📋 userData available, checking email fields...');
      
      // ✅ FIXED: Check user_email_id FIRST (primary field from your API)
      const emailFields = ['user_email_id', 'email', 'emailid', 'email_id'];
      for (const field of emailFields) {
        if (parsed[field] && parsed[field].trim() !== '') {
          console.log(`✅ Email found in userData[${field}]:`, parsed[field]);
          return parsed[field].trim();
        }
      }
      
      console.log('📋 Available userData keys:', Object.keys(parsed));
    }
  } catch (error) {
    console.log('⚠️ Error reading userData:', error.message);
  }
  
  // 4. Check JWT token for email (fallback)
  try {
    const accessToken = await AsyncStorage.getItem('jwt_token') || 
                       await AsyncStorage.getItem('userAccessToken');
    
    if (accessToken) {
      console.log('🔑 JWT token found, attempting decode...');
      const parts = accessToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        console.log('🔑 JWT payload keys:', Object.keys(payload));
        
        // ✅ FIXED: Check user_email_id first
        const emailFields = ['user_email_id', 'email', 'emailid', 'user_email', 'sub'];
        for (const field of emailFields) {
          if (payload[field] && payload[field].includes && payload[field].includes('@')) {
            console.log(`✅ Email found in JWT[${field}]:`, payload[field]);
            return payload[field].trim();
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Error decoding JWT:', error.message);
  }
  
  // 5. Check global variables
  if (global.loggedin_email && global.loggedin_email.trim() !== '') {
    console.log('✅ Email found in global.loggedin_email:', global.loggedin_email);
    return global.loggedin_email.trim();
  }
  
  console.log('🚫 NO EMAIL FOUND ANYWHERE!');
  return null;
}

  static async getOwnerMobile() {
    console.log('Getting owner mobile for profile API...');
    
    // Check EncryptedStorage first (primary location from bootstrap)
    try {
      const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
      if (ownerMobile && ownerMobile.trim() !== '') {
        console.log('Owner mobile found in EncryptedStorage:', ownerMobile);
        return ownerMobile.trim();
      }
    } catch (error) {
      console.log('Error reading EncryptedStorage[OWNER_MOBILE]:', error.message);
    }
    
    // Check global variable as fallback
    if (global.owner_mobile && global.owner_mobile.trim() !== '') {
      console.log('Owner mobile found in global variable:', global.owner_mobile);
      return global.owner_mobile.trim();
    }
    
    console.log('No owner mobile found - using empty string');
    return '';
  }

// ✅ REPLACE ProfileAPI.getProfile() in ViewProfileScreen.js

static async getProfile() {
  console.log('=====================================');
  console.log('🚀 PROFILE FETCH START - FIXED VERSION');
  console.log('=====================================');
  
  try {
    // Step 1: Get user email
    console.log('📧 STEP 1: Getting user email...');
    const userEmail = await this.getUserEmail();
    console.log('📧 Result - User email:', userEmail);
    
    if (!userEmail) {
      console.log('❌ NO EMAIL - Aborting profile fetch');
      return {
        success: false,
        message: 'No user email found. Please login again.',
        status: 400
      };
    }
    
    // Step 2: Get owner mobile
    console.log('📱 STEP 2: Getting owner mobile...');
    let ownerMobile = '';
    
    try {
      ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '';
      console.log('📱 EncryptedStorage OWNER_MOBILE:', ownerMobile);
    } catch (error) {
      console.log('⚠️ EncryptedStorage error:', error.message);
    }
    
    if (!ownerMobile || ownerMobile.trim() === '') {
      ownerMobile = '7702000725';
      console.log('📱 Using DEFAULT mobile:', ownerMobile);
    }
    
    console.log('📱 FINAL owner mobile:', ownerMobile);
    
    // Step 3: Get base URL
    console.log('🌐 STEP 3: Getting base URL...');
    const baseUrl = await ConfigService.getBaseUrl();
    console.log('🌐 Base URL:', baseUrl);
    
    // Step 4: Construct endpoint
    const profileEndpoint = `${baseUrl}/api/profile`;
    
    // ✅ CRITICAL FIX: Build query params properly
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: ownerMobile,
      user_email_id: userEmail
    }).toString();
    
    const fullUrl = `${profileEndpoint}?${queryParams}`;
    
    console.log('=====================================');
    console.log('📡 API CALL DETAILS:');
    console.log('   Full URL:', fullUrl);
    console.log('   Query Params:', queryParams);
    console.log('=====================================');
    
    // Step 5: Get auth headers
    console.log('🔐 STEP 5: Getting auth headers...');
    const accessToken = await AsyncStorage.getItem('jwt_token');
    const appKey = await EncryptedStorage.getItem('APP_KEY');
    
    console.log('🔐 Has access token:', !!accessToken);
    console.log('🔑 Has app key:', !!appKey);
    
    if (!accessToken) {
      console.log('❌ NO ACCESS TOKEN!');
      return {
        success: false,
        message: 'No access token. Please login.',
        status: 401
      };
    }
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-app-key': appKey || ''
    };
    
    console.log('📋 Request headers:', {
      'Content-Type': headers['Content-Type'],
      'Authorization': 'Bearer ***' + accessToken.slice(-20),
      'x-app-key': appKey ? 'Present' : 'Missing'
    });
    
    // Step 6: Make API call
    console.log('📞 STEP 6: Making API call...');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: headers,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    console.log('=====================================');
    console.log('📥 API RESPONSE RECEIVED:');
    console.log('   Status:', response.status);
    console.log('   OK:', response.ok);
    console.log('=====================================');
    
    const responseData = await response.json();
    
    console.log('📋 Response data structure:', {
      hasFormattedData: !!responseData.formattedData,
      hasUser: !!responseData.user,
      hasData: !!responseData.data,
      topLevelKeys: Object.keys(responseData)
    });
    
    if (response.ok && responseData) {
      console.log('✅ Profile fetch successful');
      return this.processProfileResponse({ success: true, data: responseData, status: response.status });
    } else {
      console.log('❌ Profile fetch failed');
      return {
        success: false,
        message: responseData.message || `Request failed with status ${response.status}`,
        status: response.status
      };
    }
    
  } catch (error) {
    console.log('=====================================');
    console.log('💥 PROFILE FETCH ERROR:');
    console.log('   Error:', error.message);
    console.log('   Stack:', error.stack);
    console.log('=====================================');
    return {
      success: false,
      message: 'Network error occurred. Please check your connection.',
    };
  }
}

  static async processProfileResponse(result) {
  console.log('📊 Processing profile response...');
  console.log('   Response data keys:', result.data ? Object.keys(result.data) : 'No data');

  if (result.success && result.data) {
    let userData;
    
    // Based on Postman response structure: { formattedData: {...} }
    if (result.data.formattedData) {
      console.log('✅ Using formattedData from response');
      userData = result.data.formattedData;
    } 
    // Fallback structures
    else if (result.data.user) {
      console.log('✅ Using user data from response');
      userData = result.data.user;
    } 
    else if (result.data.data) {
      console.log('✅ Using data field from response');
      userData = result.data.data;
    } 
    // Direct user data
    else if (result.data._id || result.data.user_email_id || result.data.email) {
      console.log('✅ Using direct data from response');
      userData = result.data;
    } 
    else {
      console.log('❌ No recognizable user data structure');
      console.log('   Available keys:', Object.keys(result.data));
      return {
        success: false,
        message: 'No profile data found in server response',
      };
    }

    // ✅ UPDATED: Normalize email field
    if (userData.user_email_id && !userData.email) {
      userData.email = userData.user_email_id;
    }

    console.log('📋 Extracted user data:', {
      id: userData._id,
      name: userData.name,
      email: userData.email || userData.user_email_id,
      mobile: userData.mobile,
      hasProfileImage: !!userData.profile_image
    });

    // Handle profile image if present
    if (userData.profile_image && userData.profile_image !== 'placeholder') {
      try {
        const workingImageUrl = await ImageService.getWorkingImageUrl(userData.profile_image);
        if (workingImageUrl) {
          userData.profile_image = workingImageUrl;
          console.log('🖼️ Profile image URL resolved successfully');
        } else {
          console.log('⚠️ Could not resolve profile image URL');
        }
      } catch (imageError) {
        console.log('⚠️ Error resolving profile image:', imageError.message);
      }
    }

    console.log('✅ Profile processing completed successfully');
    
    return {
      success: true,
      data: userData,
    };
  }
  
  console.log('❌ Profile response processing failed');
  return result;
}

  // Helper method to refresh profile data
 static async refreshProfile() {
  console.log('Refreshing user profile...');
  
  try {
    const result = await this.getProfile();
    
    if (result.success) {
      console.log('Profile refreshed successfully');
      
      // Update global user data if available
      if (result.data) {
        global.currentUser = result.data;
        global.currentUserName = result.data.name || result.data.fullName;
        // ✅ UPDATED: Check both email fields
        global.currentUserEmail = result.data.email || result.data.user_email_id || result.data.emailid;
        global.currentUserMobile = result.data.mobile || result.data.mobileNo;
        global.currentUserCity = result.data.city;
        global.currentUserProfileImage = result.data.profile_image;
      }
    }
    
    return result;
  } catch (error) {
    console.log('Error refreshing profile:', error.message);
    return {
      success: false,
      message: 'Failed to refresh profile',
      error: error.message
    };
  }
}

  // Helper method to get cached profile
  static async getCachedProfile() {
    try {
      const cachedProfile = await AsyncStorage.getItem('userProfile');
      if (cachedProfile) {
        return {
          success: true,
          data: JSON.parse(cachedProfile),
          cached: true
        };
      }
      
      return {
        success: false,
        message: 'No cached profile found'
      };
    } catch (error) {
      console.log('Error getting cached profile:', error.message);
      return {
        success: false,
        message: 'Error reading cached profile',
        error: error.message
      };
    }
  }
}

// UPDATED ViewProfileScreen component with FIXED session management
const ViewProfileScreen = ({ navigation, route }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Add ref to track navigation state
  const navigationRef = useRef(null);
  const sessionExpiryHandled = useRef(false);

  useEffect(() => {
    LoggingService.profileInfo('ViewProfileScreen mounted, starting session check');
    
    // Reset session expiry handled flag
    sessionExpiryHandled.current = false;
    
    // Set up session expiry callback
    AuthService.setSessionExpiryCallback(handleSessionExpiry);
    
    checkSessionAndLoadProfile();
    
    if (route?.params?.justRegistered) {
      LoggingService.profileInfo('User just registered flag detected');
      setJustRegistered(true);
    }

    // Cleanup function
    return () => {
      AuthService.setSessionExpiryCallback(null);
      sessionExpiryHandled.current = false;
    };
  }, []);

  // FIXED session expiry handler
  const handleSessionExpiry = async () => {
    // Prevent multiple executions
    if (sessionExpiryHandled.current) {
      LoggingService.profileWarn('Session expiry already being handled, skipping');
      return;
    }
    
    sessionExpiryHandled.current = true;
    
    try {
      LoggingService.profileWarn('Session expired - starting automatic logout process');
      setIsLoggingOut(true);
      
      // Perform logout
      await AuthService.logout();
      
      // Update UI state immediately
      setIsUserLoggedIn(false);
      setUserProfile(null);
      setSessionExpired(true);
      setIsLoggingOut(false);
      
      // Show alert with proper navigation handling
      Alert.alert(
        'Session Expired',
        'Your session has expired for security reasons. Please login again to continue.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate immediately without delay
              try {
                LoggingService.profileInfo('Navigating to Login after session expiry confirmation');
                
                // Reset navigation stack to Login screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
                
                // Reset the flag after successful navigation
                setTimeout(() => {
                  sessionExpiryHandled.current = false;
                }, 1000);
                
              } catch (navError) {
                LoggingService.profileError('Navigation error after session expiry', navError);
                
                // Fallback navigation
                try {
                  navigation.navigate('Login');
                } catch (fallbackError) {
                  LoggingService.profileError('Fallback navigation also failed', fallbackError);
                }
                
                // Reset flag even if navigation fails
                setTimeout(() => {
                  sessionExpiryHandled.current = false;
                }, 1000);
              }
            },
          },
        ],
        { 
          cancelable: false,
          onDismiss: () => {
            // This ensures dialog is properly dismissed
            LoggingService.profileDebug('Session expiry dialog dismissed');
          }
        }
      );
      
    } catch (error) {
      LoggingService.profileError('Error during automatic logout', error);
      
      // Even if logout fails, still reset states and navigate
      setIsLoggingOut(false);
      setIsUserLoggedIn(false);
      setUserProfile(null);
      
      // Force navigation to login
      try {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } catch (navError) {
        LoggingService.profileError('Emergency navigation failed', navError);
        navigation.navigate('Login');
      }
      
      // Reset flag
      setTimeout(() => {
        sessionExpiryHandled.current = false;
      }, 1000);
    }
  };

// ✅ REPLACE checkSessionAndLoadProfile in ViewProfileScreen.js

const checkSessionAndLoadProfile = async () => {
  try {
    LoggingService.profileInfo('=== STARTING SESSION CHECK ===');
    
    setLoading(true);
    setSessionExpired(false);
    
    // Check login status first
    const loginStatus = await AsyncStorage.getItem('isLoggedin');
    const isLoggedIn = loginStatus === 'TRUE' || global.isUserLoggedin;
    
    LoggingService.profileDebug('Login status check', { 
      asyncStorageValue: loginStatus,
      globalValue: global.isUserLoggedin,
      finalIsLoggedIn: isLoggedIn
    });
    
    if (!isLoggedIn) {
      LoggingService.profileWarn('User not logged in');
      setIsUserLoggedIn(false);
      setLoading(false);
      return;
    }

    // Check if tokens exist
    const accessToken = await AuthService.getToken();
    const refreshToken = await AuthService.getRefreshToken();
    
    LoggingService.profileDebug('Token availability', { 
      hasAccessToken: !!accessToken, 
      hasRefreshToken: !!refreshToken
    });

    if (!accessToken && !refreshToken) {
      LoggingService.profileWarn('No tokens found');
      
      if (justRegistered) {
        LoggingService.profileInfo('User just registered, loading local profile');
        setIsUserLoggedIn(true);
        await loadLocalUserProfile();
        return;
      }
      
      setIsUserLoggedIn(false);
      setLoading(false);
      return;
    }

    // ✅ CHANGED: Load local profile FIRST (instant display)
    setIsUserLoggedIn(true);
    await loadLocalUserProfile();
    setLoading(false); // Stop loading spinner
    
    // ✅ CHANGED: Try to fetch from API WITHOUT token validation
    // Let the API call handle token refresh automatically
    try {
      LoggingService.profileInfo('🔄 Fetching fresh profile from API...');
      await fetchProfileFromAPIQuietly();
    } catch (backgroundError) {
      LoggingService.profileWarn('Background refresh failed, using cached data', backgroundError);
      // Don't show error to user - cached data is already displayed
    }
    
  } catch (error) {
    LoggingService.profileError('Error during session check', error);
    setLoading(false);
    
    // Try to load local data even on error
    try {
      await loadLocalUserProfile();
    } catch (localError) {
      LoggingService.profileError('Failed to load local data', localError);
    }
  }
};

 const checkAdminStatus = async (userEmail) => {
  try {
    LoggingService.profileInfo('=== CHECKING ADMIN STATUS ===');
    
    if (!userEmail) {
      LoggingService.profileWarn('No user email provided for admin check');
      return { isAdmin: false };
    }

    const roleInfo = await AdminService.getUserRoleInfo(userEmail);
    
    LoggingService.profileInfo(`Admin status determined: ${roleInfo.isAdmin ? 'Admin' : 'User'}`, {
      userEmail: userEmail,
      isAdmin: roleInfo.isAdmin,
      userRole: roleInfo.userRole,
      ownerEmail: roleInfo.ownerEmail
    });

    setIsAdmin(roleInfo.isAdmin);
    setAdminInfo(roleInfo);
    
    return roleInfo;
    
  } catch (error) {
    LoggingService.profileError('Error checking admin status', error);
    setIsAdmin(false);
    setAdminInfo(null);
    return { isAdmin: false };
  }
};

 const enhanceUserProfileWithAdminStatus = async (userData) => {
  try {
    LoggingService.profileInfo('=== ENHANCING PROFILE WITH ADMIN STATUS ===');
    
    // ✅ UPDATED: Get email from either field
    const userEmail = userData.email || userData.user_email_id;
    
    const adminStatus = await checkAdminStatus(userEmail);
    const enhancedProfile = { ...userData };
    
    // ✅ UPDATED: Ensure email field exists
    if (!enhancedProfile.email && enhancedProfile.user_email_id) {
      enhancedProfile.email = enhancedProfile.user_email_id;
    }
    
    if (adminStatus.isAdmin) {
      LoggingService.profileInfo('User is admin - auto-verifying email', {
        email: userEmail,
        originalEmailVerified: userData.emailVerified || userData.isEmailVerified
      });
      
      enhancedProfile.emailVerified = true;
      enhancedProfile.isAdmin = true;
      enhancedProfile.userRole = 'admin';
      
      if (adminStatus.appOwnerInfo) {
        enhancedProfile.adminInfo = {
          ownerEmail: adminStatus.ownerEmail,
          mobile: adminStatus.appOwnerInfo.mobile_no || adminStatus.appOwnerInfo.mobile_number,
        };
      }
      
      LoggingService.profileInfo('Profile enhanced for admin user', {
        emailVerified: enhancedProfile.emailVerified,
        isAdmin: enhancedProfile.isAdmin,
        userRole: enhancedProfile.userRole
      });
    } else {
      LoggingService.profileInfo('Regular user - keeping original email verification status', {
        email: userEmail,
        emailVerified: userData.emailVerified || userData.isEmailVerified
      });
      
      enhancedProfile.isAdmin = false;
      enhancedProfile.userRole = 'user';
      // ✅ UPDATED: Check both field names
      enhancedProfile.emailVerified = userData.emailVerified || userData.isEmailVerified || false;
    }
    
    return enhancedProfile;
    
  } catch (error) {
    LoggingService.profileError('Error enhancing profile with admin status', error);
    return userData;
  }
};

const fetchProfileFromAPIQuietly = async () => {
  try {
    LoggingService.profileInfo('=== QUIET PROFILE REFRESH FROM API ===');
    
    const result = await ProfileAPI.getProfile();
    
    if (result.success && result.data) {
      LoggingService.profileInfo('✅ Background refresh successful');
      
      const enhancedProfile = await enhanceUserProfileWithAdminStatus(result.data);
      
      // Update state with fresh data
      setUserProfile(enhancedProfile);
      
      // Save to storage
      await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
      await AsyncStorage.setItem('profileLastUpdated', new Date().toISOString());
      
    } else if (result.status === 401) {
      LoggingService.profileWarn('⚠️ Background refresh got 401 - session may be expired');
      // Don't trigger logout - user can continue with cached data
    } else {
      LoggingService.profileWarn('⚠️ Background refresh failed, keeping cached data');
    }
    
  } catch (error) {
    LoggingService.profileError('❌ Quiet refresh error (non-critical)', error);
    // Don't propagate error - cached data is fine
  }
};


 const fetchProfileFromAPI = async () => {
  try {
    LoggingService.profileInfo('=== FETCHING PROFILE FROM API ===');
    
    const result = await ProfileAPI.getProfile();
    
    LoggingService.profileDebug('API call completed', {
      success: result.success,
      hasData: !!result.data,
      message: result.message
    });
    
    if (result.success && result.data) {
      const enhancedProfile = await enhanceUserProfileWithAdminStatus(result.data);
      setUserProfile(enhancedProfile);
      
      await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
      LoggingService.profileDebug('Profile saved to local storage');
      
    } else {
      // ✅ CHANGED: Don't trigger session expiry on 401
      if (result.status === 401) {
        LoggingService.profileWarn('Got 401 - loading cached data instead');
        await loadLocalUserProfile();
        return; // Don't show error
      }
      
      LoggingService.profileError('API returned failure', result);
      Alert.alert('Info', 'Could not fetch latest profile. Showing cached data.');
      await loadLocalUserProfile();
    }
  } catch (error) {
    LoggingService.profileError('Error during API fetch', error);
    
    // ✅ CHANGED: Don't trigger session expiry on network errors
    if (error.message && error.message.includes('401')) {
      LoggingService.profileWarn('Network error - loading cached data');
      await loadLocalUserProfile();
      return;
    }
    
    Alert.alert('Info', 'Could not connect to server. Showing cached data.');
    await loadLocalUserProfile();
  } finally {
    setLoading(false);
  }
};


  const loadLocalUserProfile = async () => {
    try {
      LoggingService.profileInfo('Loading profile from local storage');
      
      const userData = await AsyncStorage.getItem('userData');
      LoggingService.profileDebug('Local storage data check', {
        hasData: !!userData,
        dataLength: userData?.length || 0
      });
      
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        if (parsedData.profile_image) {
          const workingImageUrl = await ImageService.getWorkingImageUrl(parsedData.profile_image);
          if (workingImageUrl) {
            parsedData.profile_image = workingImageUrl;
          }
        }
        
        const enhancedLocalProfile = await enhanceUserProfileWithAdminStatus(parsedData);
        
        LoggingService.profileInfo('Local profile loaded and enhanced successfully', {
          profileId: enhancedLocalProfile._id || enhancedLocalProfile.id,
          profileName: enhancedLocalProfile.name,
          isAdmin: enhancedLocalProfile.isAdmin,
          emailVerified: enhancedLocalProfile.emailVerified,
          profileImage: enhancedLocalProfile.profile_image
        });
        setUserProfile(enhancedLocalProfile);
      } else {
        LoggingService.profileWarn('No local profile data found');
      }
    } catch (error) {
      LoggingService.profileError('Error loading local profile', {
        errorMessage: error.message,
        errorName: error.name
      });
    }
  };

  const handleEditProfile = () => {
    LoggingService.profileInfo('Edit profile requested');
    Alert.alert(
      'Edit Profile',
      'Do you want to edit your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Edit', 
          onPress: () => {
            navigation.navigate('Registration', { 
              isEditMode: true,
              userProfile: userProfile 
            });
          }
        },
      ]
    );
  };

  const handleLoginRedirect = () => {
    LoggingService.profileInfo('Redirecting to login screen');
    navigation.navigate('Login');
  };

  const handleRefresh = () => {
    LoggingService.profileInfo('Manual refresh triggered');
    setImageError(false);
    checkSessionAndLoadProfile();
  };

  const renderProfileImage = () => {
    const imageUri = userProfile?.profile_image || userProfile?.photo;
    
    LoggingService.profileDebug('Rendering profile image', {
      imageUri: imageUri,
      imageError: imageError,
      imageLoading: imageLoading
    });
    
    if (imageUri && imageUri !== 'placeholder' && !imageError) {
      return (
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: imageUri }}
            style={styles.profileImage}
            onLoadStart={() => {
              LoggingService.profileDebug('Profile image loading started');
              setImageLoading(true);
            }}
            onLoad={() => {
              LoggingService.profileInfo('Profile image loaded successfully', {
                uri: imageUri
              });
              setImageLoading(false);
              setImageError(false);
            }}
            onError={(error) => {
              LoggingService.profileError('Profile image load failed', {
                uri: imageUri,
                error: error.nativeEvent?.error || 'Unknown error'
              });
              setImageLoading(false);
              setImageError(true);
            }}
            onLoadEnd={() => {
              LoggingService.profileDebug('Profile image load ended');
              setImageLoading(false);
            }}
          />
          {imageLoading && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color="#e16e2b" />
            </View>
          )}
        </View>
      );
    }
    
    LoggingService.profileWarn('Showing profile image placeholder', {
      reason: !imageUri ? 'No image URI' : imageError ? 'Image load error' : 'Placeholder URI'
    });
    
    return (
      <View style={styles.profileImagePlaceholder}>
        <Icon name="person" size={60} color="#e16e2b" />
      </View>
    );
  };

  const renderInfoRow = (label, value, iconName) => {
    if (!value || value.toString().trim() === '') return null;
    
    return (
      <View style={styles.infoRow}>
        <View style={styles.infoIconContainer}>
          <Icon name={iconName} size={20} color="#e16e2b" />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.infoLabel}>{label}</Text>
          <Text style={styles.infoValue}>{value}</Text>
        </View>
      </View>
    );
  };

  // Loading State (including logout process)
  if (loading || isLoggingOut) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>
          {isLoggingOut ? 'Logging out...' : 'Loading Profile...'}
        </Text>
      </View>
    );
  }

  // Not Logged In State
  if (!isUserLoggedIn) {
    return (
      <View style={styles.loginRequiredContainer}>
        <View style={styles.loginRequiredContent}>
          <Icon name="lock-outline" size={80} color="#e16e2b" />
          
          <Text style={styles.loginRequiredTitle}>Login Required</Text>

          <Text style={styles.loginRequiredMessage}>
            {justRegistered 
              ? "Great! Your account has been created successfully."
              : "Oops! You are not logged in."
            }
          </Text>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleLoginRedirect}
          >
            <Text style={styles.loginButtonText}>
              {justRegistered ? "Login to Continue" : "Click here to Login"}
            </Text>
          </TouchableOpacity>
          
          {!justRegistered && (
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                <Text style={styles.registerLink}>Register here</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Error State - No Profile Data
  if (!userProfile) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error" size={50} color="#e16e2b" />
        <Text style={styles.errorText}>Profile not found</Text>

        <TouchableOpacity 
          style={styles.retryButton}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Main Profile UI
  return (
    <ScrollView style={styles.container}>
      {/* HEADER SECTION */}
      <View style={styles.header}>
        {/* Edit Button - Top Right */}
        <TouchableOpacity 
          style={styles.editIconButton} 
          onPress={handleEditProfile}
        >
          <Icon name="edit" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Refresh Button - Top Left */}
        <TouchableOpacity 
          style={styles.refreshIconButton} 
          onPress={handleRefresh}
        >
          <Icon name="refresh" size={22} color="#fff" />
        </TouchableOpacity>

        {/* Admin Badge - Top Center (if admin) */}
        {userProfile?.isAdmin && (
          <View style={styles.adminBadge}>
            <Icon name="admin-panel-settings" size={16} color="#FFD700" />
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        )}

        {/* Profile Image */}
        <View style={styles.profileImageContainer}>
          {renderProfileImage()}
        </View>

        {/* User Info */}
        <Text style={styles.userName}>
          {userProfile.name || userProfile.fullName || 'User'}
        </Text>
        <Text style={styles.userMobile}>
          {userProfile.mobile || userProfile.mobileNo || 'No mobile'}
        </Text>
        
        {/* Email with verification status */}
       {/* Email with verification status */}
<View style={styles.emailContainer}>
  <Text style={styles.userEmail}>
    {userProfile.email || userProfile.user_email_id}
  </Text>
  {userProfile.emailVerified && (
    <View style={styles.verifiedBadgeHeader}>
      <Icon name="verified" size={16} color="#4CAF50" />
      <Text style={styles.verifiedTextHeader}>
        {userProfile.isAdmin ? 'Admin - Auto Verified' : 'Verified'}
      </Text>
    </View>
  )}
  {userProfile.isAdmin && !userProfile.emailVerified && (
    <View style={styles.verifiedBadgeHeader}>
      <Icon name="admin-panel-settings" size={16} color="#FFD700" />
      <Text style={styles.adminAutoVerifyText}>Admin Account</Text>
    </View>
  )}
</View>

        {/* User Role Indicator */}
        <View style={styles.roleContainer}>
          <Icon 
            name={userProfile.isAdmin ? "admin-panel-settings" : "person"} 
            size={16} 
            color={userProfile.isAdmin ? "#FFD700" : "#fff"} 
          />
          <Text style={[styles.roleText, userProfile.isAdmin && styles.adminRoleText]}>
            {userProfile.isAdmin ? 'Administrator' : 'User'}
          </Text>
        </View>
      </View>

      {/* PROFILE INFORMATION SECTION */}

<View style={styles.infoContainer}>
  {/* Personal Information */}
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Personal Information</Text>
    {renderInfoRow('Full Name', userProfile.name || userProfile.fullName, 'person')}
    {renderInfoRow('Mobile Number', userProfile.mobile || userProfile.mobileNo, 'phone')}
    {renderInfoRow('Email Address', userProfile.email || userProfile.user_email_id, 'email')}
    {/* Address removed from here */}
  </View>
  
  {/* Location Details */}
 
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Location Details</Text>
  {renderInfoRow('Address', userProfile.address, 'location-on')}
  {renderInfoRow('Pincode', userProfile.pincode, 'pin-drop')}
  {renderInfoRow('City', userProfile.city, 'location-city')}
  {renderInfoRow('District', userProfile.district, 'place')}
  {renderInfoRow('State', userProfile.state, 'public')}
</View>

{/* Social Media Links */}
        {(userProfile.facebook || userProfile.twitter || userProfile.instagram) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Social Media</Text>
            {renderInfoRow('Facebook', userProfile.facebook, 'facebook')}
            {renderInfoRow('Twitter', userProfile.twitter, 'alternate-email')}
            {renderInfoRow('Instagram', userProfile.instagram, 'camera-alt')}
          </View>
        )}

  {/* Admin Information Section (Only for Admins) */}
  {userProfile.isAdmin && adminInfo && (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, styles.adminSectionTitle]}>
        Administrator Information
      </Text>
      {renderInfoRow('Owner Email', adminInfo.ownerEmail, 'admin-panel-settings')}
      {adminInfo.appOwnerInfo?.mobile_no && renderInfoRow(
        'Owner Mobile', 
        adminInfo.appOwnerInfo.mobile_no, 
        'phone'
      )}
      
      <View style={styles.adminPrivilegesBox}>
        <Text style={styles.adminPrivilegesTitle}>Administrator Privileges:</Text>
        <Text style={styles.adminPrivilegeItem}>• Full system access</Text>
        <Text style={styles.adminPrivilegeItem}>• Email auto-verification</Text>
        <Text style={styles.adminPrivilegeItem}>• User management capabilities</Text>
        <Text style={styles.adminPrivilegeItem}>• System configuration access</Text>
      </View>
    </View>
  )}
</View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5' },
  loadingText: { fontSize: 16, color: '#666', marginTop: 15 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f5f5f5', padding: 20 },
  errorText: { fontSize: 18, color: '#666', marginTop: 15, marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#666', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 10 },
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  loginRequiredContainer: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', padding: 20 },
  loginRequiredContent: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, width: '100%', maxWidth: 350 },
  loginRequiredTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 15, textAlign: 'center' },
  loginRequiredMessage: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
  loginButton: { backgroundColor: '#e16e2b', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, marginBottom: 20 },
  loginButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  registerContainer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  registerText: { fontSize: 14, color: '#666' },
  registerLink: { fontSize: 14, color: '#e16e2b', fontWeight: 'bold', textDecorationLine: 'underline' },
  header: { backgroundColor: '#e16e2b', alignItems: 'center', paddingVertical: 30, paddingTop: 50, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, position: 'relative' },
  editIconButton: { position: 'absolute', top: 20, right: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', zIndex: 1 },
  refreshIconButton: { position: 'absolute', top: 20, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', zIndex: 1 },
  
  // Admin Badge Style
  adminBadge: {
    position: 'absolute',
    top: 20,
    left: '50%',
    marginLeft: -40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  adminBadgeText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  
  profileImageContainer: { marginBottom: 15, position: 'relative' },
  profileImage: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#fff' },
  profileImagePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#fff' },
  imageLoadingOverlay: { position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginBottom: 5, textAlign: 'center' },
  userMobile: { fontSize: 16, color: '#fff', opacity: 0.9, marginBottom: 8 },
  emailContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  userEmail: { fontSize: 14, color: '#fff', opacity: 0.9, marginRight: 8 },
  verifiedBadgeHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(76, 175, 80, 0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(76, 175, 80, 0.5)' },
  verifiedTextHeader: { color: '#4CAF50', fontSize: 10, fontWeight: '600', marginLeft: 3 },
  
  // Admin Auto Verify Style
  adminAutoVerifyText: { color: '#FFD700', fontSize: 10, fontWeight: '600', marginLeft: 3 },

  // Role Container Style
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  adminRoleText: {
    color: '#FFD700',
  },

  infoContainer: { padding: 20 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#e16e2b', marginBottom: 15, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: '#e16e2b' },
  
  // Admin Section Title Style
  adminSectionTitle: {
    color: '#FFD700',
    borderBottomColor: '#FFD700',
  },

  infoRow: { flexDirection: 'row', backgroundColor: '#fff', marginBottom: 12, borderRadius: 12, padding: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  infoIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff3e0', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContent: { flex: 1, justifyContent: 'center' },
  infoLabel: { fontSize: 12, color: '#666', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 16, color: '#333', fontWeight: '500', lineHeight: 22 },
  
  // Status Text Styles
  adminText: { color: '#FFD700', fontWeight: 'bold' },
  verifiedText: { color: '#4CAF50', fontWeight: '600' },
  unverifiedText: { color: '#FF5722', fontWeight: '600' },

  // Admin Privileges Box
  adminPrivilegesBox: {
    backgroundColor: '#fff9e6',
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  adminPrivilegesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginBottom: 8,
  },
  adminPrivilegeItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 18,
  },

  debugButton: { backgroundColor: '#666', padding: 10, borderRadius: 8, marginTop: 10 },
  debugButtonText: { color: '#fff', fontSize: 14, textAlign: 'center' },
});

export default ViewProfileScreen;