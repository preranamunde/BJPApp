import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  BackHandler, 
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import AuthService from '../utils/AuthService';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { updateUserLoginStatus } from '../../App'; // Import the helper function
import bjpLogo from '../assets/logobjp.png';

// Enhanced Logging Service for Login
class LoginLoggingService {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  static currentLogLevel = __DEV__ ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;

  static colors = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m',  // Reset
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

  // Login-specific methods
  static loginDebug(message, data) { this.debug('LOGIN', message, data); }
  static loginInfo(message, data) { this.info('LOGIN', message, data); }
  static loginWarn(message, data) { this.warn('LOGIN', message, data); }
  static loginError(message, data) { this.error('LOGIN', message, data); }
}

// Image Service for handling profile images during login
class LoginImageService {
  static async testImageUrl(imageUrl) {
    try {
      LoginLoggingService.loginDebug('🧪 Testing image URL during login', { url: imageUrl });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      LoginLoggingService.loginInfo('Image URL test result during login', {
        url: imageUrl,
        status: response.status,
        accessible: response.ok
      });
      
      return response.ok;
    } catch (error) {
      LoginLoggingService.loginError('Image URL not accessible during login', {
        url: imageUrl,
        error: error.message
      });
      return false;
    }
  }
  
  static async getWorkingImageUrl(relativePath) {
    if (!relativePath || relativePath === 'placeholder') {
      LoginLoggingService.loginWarn('No valid image path provided during login', { relativePath });
      return null;
    }
    
    try {
      // Use ConfigService to get the proper image URL
      const imageUrl = await ConfigService.getProfileImageUrl(relativePath);
      
      LoginLoggingService.loginDebug('Testing ConfigService image URL during login', {
        relativePath,
        constructedUrl: imageUrl
      });
      
      if (imageUrl) {
        const isAccessible = await this.testImageUrl(imageUrl);
        
        if (isAccessible) {
          LoginLoggingService.loginInfo('✅ ConfigService image URL is working during login', { url: imageUrl });
          return imageUrl;
        } else {
          LoginLoggingService.loginWarn('❌ ConfigService image URL not accessible during login', { url: imageUrl });
        }
      }
      
      // Fallback: Try direct construction if ConfigService method fails
      const baseUrl = await ConfigService.getBaseUrl();
      const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      
      // Try different common upload paths
      const fallbackPaths = [
        `${baseUrl}/uploads/profile_images/${cleanPath}`,
        `${baseUrl}/uploads/${cleanPath}`,
        `${baseUrl}/${cleanPath}`,
      ];
      
      for (const fallbackUrl of fallbackPaths) {
        const isAccessible = await this.testImageUrl(fallbackUrl);
        if (isAccessible) {
          LoginLoggingService.loginInfo('✅ Found working fallback image URL during login', { url: fallbackUrl });
          return fallbackUrl;
        }
      }
      
      LoginLoggingService.loginWarn('❌ No accessible image URL found during login', { relativePath, testedUrls: fallbackPaths });
      return null;
      
    } catch (error) {
      LoginLoggingService.loginError('Error in getWorkingImageUrl during login', {
        error: error.message,
        relativePath
      });
      return null;
    }
  }
}

// Enhanced Admin Service for checking admin status during login
class LoginAdminService {
  static async checkIfUserIsAdmin(userEmail) {
    try {
      LoginLoggingService.loginInfo('🔍 === CHECKING ADMIN STATUS DURING LOGIN ===', { userEmail });
      
      // Get AppOwnerInfo from encrypted storage
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      
      if (!appOwnerInfoStr) {
        LoginLoggingService.loginWarn('⚠️ No AppOwnerInfo found in storage during login');
        return { isAdmin: false, ownerEmail: null };
      }
      
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      
      // Extract owner email from different possible fields
      const ownerEmail = appOwnerInfo.emailid || 
                        appOwnerInfo.email || 
                        appOwnerInfo.email_id || 
                        appOwnerInfo.owner_email;
      
      LoginLoggingService.loginDebug('Owner email comparison during login', {
        userEmail: userEmail?.toLowerCase(),
        ownerEmail: ownerEmail?.toLowerCase(),
        appOwnerInfoKeys: Object.keys(appOwnerInfo)
      });
      
      if (!ownerEmail) {
        LoginLoggingService.loginWarn('⚠️ No owner email found in AppOwnerInfo during login');
        return { isAdmin: false, ownerEmail: null };
      }
      
      // Compare emails (case-insensitive)
      const isAdmin = userEmail?.toLowerCase() === ownerEmail?.toLowerCase();
      
      LoginLoggingService.loginInfo(`${isAdmin ? '👑' : '👤'} Admin check result during login`, {
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
      LoginLoggingService.loginError('❌ Error checking admin status during login', {
        error: error.message,
        userEmail
      });
      return { isAdmin: false, ownerEmail: null };
    }
  }

  static async enhanceUserDataWithAdminStatus(userData, userEmail) {
    try {
      LoginLoggingService.loginInfo('🔧 === ENHANCING LOGIN DATA WITH ADMIN STATUS ===');
      
      const adminCheck = await this.checkIfUserIsAdmin(userEmail);
      
      // Clone userData to avoid mutations
      const enhancedUserData = { ...userData };
      
      // If user is admin, automatically set email as verified and add admin flags
      if (adminCheck.isAdmin) {
        LoginLoggingService.loginInfo('👑 User is admin - auto-verifying email and setting admin flags', {
          email: userEmail,
          originalEmailVerified: userData.emailVerified
        });
        
        enhancedUserData.emailVerified = true;
        enhancedUserData.isAdmin = true;
        enhancedUserData.userRole = 'admin';
        
        // Add admin-specific info if available
        if (adminCheck.appOwnerInfo) {
          enhancedUserData.adminInfo = {
            ownerEmail: adminCheck.ownerEmail,
            mobile: adminCheck.appOwnerInfo.mobile_no || adminCheck.appOwnerInfo.mobile_number,
            // Add other owner info if needed
          };
        }
        
        LoginLoggingService.loginInfo('✅ Login data enhanced for admin user', {
          emailVerified: enhancedUserData.emailVerified,
          isAdmin: enhancedUserData.isAdmin,
          userRole: enhancedUserData.userRole
        });
      } else {
        LoginLoggingService.loginInfo('👤 Regular user - keeping original email verification status', {
          email: userEmail,
          emailVerified: userData.emailVerified
        });
        
        enhancedUserData.isAdmin = false;
        enhancedUserData.userRole = 'user';
      }
      
      return enhancedUserData;
      
    } catch (error) {
      LoginLoggingService.loginError('❌ Error enhancing login data with admin status', error);
      // Return original data if enhancement fails
      return userData;
    }
  }
}

// Profile API Class for loading profile during login
class LoginProfileAPI {
  static async getProfile() {
    LoginLoggingService.loginInfo('🚀 Starting profile fetch during login using ConfigService');
    
    try {
      // Get profile endpoint from ConfigService
      const endpoints = await ConfigService.getApiEndpoints();
      const profileEndpoint = endpoints.user.profile;
      
      LoginLoggingService.loginDebug('Profile endpoint from ConfigService during login', { 
        endpoint: profileEndpoint 
      });

      // Use ApiService for the authenticated request
      const result = await ApiService.authGet(profileEndpoint);
      
      LoginLoggingService.loginDebug('Raw API response from ApiService during login', {
        success: result.success,
        status: result.status,
        hasData: !!result.data,
        dataStructure: result.data ? Object.keys(result.data) : []
      });

      if (result.success && result.data) {
        let userData;
        
        // Handle different possible response structures
        if (result.data.formattedData) {
          userData = result.data.formattedData;
          LoginLoggingService.loginDebug('✅ Using formattedData structure during login', { userData });
        } else if (result.data.user) {
          userData = result.data.user;
          LoginLoggingService.loginDebug('✅ Using user structure during login', { userData });
        } else if (result.data.data) {
          userData = result.data.data;
          LoginLoggingService.loginDebug('✅ Using data structure during login', { userData });
        } else if (result.data._id || result.data.email) {
          // Direct user object (fallback)
          userData = result.data;
          LoginLoggingService.loginDebug('✅ Using direct data structure during login', { userData });
        } else {
          LoginLoggingService.loginError('❌ No user data found in response during login', { data: result.data });
          return {
            success: false,
            message: 'No profile data found in server response',
          };
        }

        // Handle profile image using ConfigService
        if (userData.profile_image) {
          const workingImageUrl = await LoginImageService.getWorkingImageUrl(userData.profile_image);
          
          if (workingImageUrl) {
            userData.profile_image = workingImageUrl;
            LoginLoggingService.loginInfo('✅ Profile image URL resolved during login using ConfigService', { 
              url: workingImageUrl 
            });
          } else {
            LoginLoggingService.loginWarn('⚠️ Could not resolve profile image URL during login', { 
              originalPath: userData.profile_image 
            });
            // Keep original path in case it's already a full URL
          }
        }

        LoginLoggingService.loginInfo('✅ Profile fetch successful during login', {
          userId: userData._id,
          userName: userData.name,
          userEmail: userData.email,
          userMobile: userData.mobile,
          profileImageURL: userData.profile_image,
          hasAllRequiredFields: !!(userData._id && userData.name && userData.email)
        });
        
        return {
          success: true,
          data: userData,
        };
      } else {
        LoginLoggingService.loginError('❌ Profile fetch failed during login', {
          success: result.success,
          message: result.message,
          status: result.status
        });
        
        return {
          success: false,
          message: result.message || 'Failed to fetch profile',
          status: result.status
        };
      }
    } catch (error) {
      LoginLoggingService.loginError('💥 Profile API error during login', {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      });
      
      return {
        success: false,
        message: 'Network error. Please check your connection and try again.',
      };
    }
  }
}

const LoginScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Handle navigation parameters for success messages
  useEffect(() => {
    if (route?.params) {
      const { message, registrationSuccess } = route.params;
      
      if (message || registrationSuccess) {
        setSuccessMessage(message || 'Registration completed successfully!');
        setShowSuccessMessage(true);
        
        // Clear the parameter
        navigation.setParams({ 
          message: undefined, 
          registrationSuccess: undefined 
        });
        
        // Hide message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
      }
    }
  }, [route?.params]);

  // Handle hardware back button
useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    navigation.navigate('MainDrawer');
    return true;
  });

  return () => backHandler.remove();
}, [navigation]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

 const enhanceLoginResponse = async (loginResult) => {
  try {
    LoginLoggingService.loginInfo('🔧 === ENHANCING LOGIN RESPONSE WITH ADMIN CHECK ===');
    
    if (!loginResult.success || !loginResult.user) {
      LoginLoggingService.loginWarn('⚠️ Login was not successful or no user data');
      return loginResult;
    }

    setAdminCheckLoading(true);
    
    // ✅ GET LOGGED IN EMAIL
    const storedLoginEmail = formData.email.trim().toLowerCase();
    
    // ✅ GET OWNER EMAIL FROM STORAGE
    let storedOwnerEmail = '';
    try {
      // First try AppOwnerInfo
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        const appOwnerInfo = JSON.parse(appOwnerInfoStr);
        storedOwnerEmail = appOwnerInfo.emailid || 
                          appOwnerInfo.email || 
                          appOwnerInfo.email_id || 
                          appOwnerInfo.owner_email || 
                          '';
      }
      
      // Fallback to direct storage
      if (!storedOwnerEmail) {
        storedOwnerEmail = await EncryptedStorage.getItem('OWNER_EMAIL') || '';
      }
    } catch (error) {
      console.error('Error getting owner email:', error);
    }
    
    console.log('🔍 Admin Check During Login:', {
      loginEmail: storedLoginEmail,
      ownerEmail: storedOwnerEmail,
      match: storedLoginEmail === storedOwnerEmail?.toLowerCase()
    });
    
    // ✅ CHECK IF EMAILS MATCH (case-insensitive)
    const isAdminUser = storedLoginEmail === storedOwnerEmail?.toLowerCase() && storedOwnerEmail !== '';
    
    // ✅ UPDATE GLOBAL VARIABLES IMMEDIATELY
    global.loggedin_email = storedLoginEmail;
    global.owner_emailid = storedOwnerEmail;
    global.userRole = isAdminUser ? 'admin' : 'user';
    global.isUserAdmin = isAdminUser;
    global.isUserLoggedin = true;
    
    // ✅ STORE IN ENCRYPTED STORAGE
    await EncryptedStorage.setItem('USER_ROLE', isAdminUser ? 'admin' : 'user');
    await EncryptedStorage.setItem('LOGGED_IN_EMAIL', storedLoginEmail);
    if (storedOwnerEmail) {
      await EncryptedStorage.setItem('OWNER_EMAIL', storedOwnerEmail);
    }
    
    // ✅ ENHANCE USER DATA
    const enhancedUserData = {
      ...loginResult.user,
      isAdmin: isAdminUser,
      userRole: isAdminUser ? 'admin' : 'user',
      emailVerified: isAdminUser ? true : loginResult.user.emailVerified // Auto-verify admin
    };

    console.log('✅ Login Response Enhanced:', {
      isAdmin: isAdminUser,
      userRole: enhancedUserData.userRole,
      emailVerified: enhancedUserData.emailVerified,
      globalVars: {
        isUserAdmin: global.isUserAdmin,
        userRole: global.userRole
      }
    });

    return {
      ...loginResult,
      user: enhancedUserData,
      adminEnhanced: true
    };

  } catch (error) {
    LoginLoggingService.loginError('❌ Error enhancing login response', error);
    return loginResult;
  } finally {
    setAdminCheckLoading(false);
  }
};

  // ENHANCED: Silent Profile Loading Function with better error handling
 // ✅ ENHANCED: Load full profile from API with proper data structure
const silentProfileLoad = async (userEmail) => {
  try {
    LoginLoggingService.loginInfo('🔇 === LOADING FULL PROFILE FROM API ===', { userEmail });
    setProfileLoading(true);
    
    // Get owner mobile from EncryptedStorage
    let ownerMobile = '';
    try {
      ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '';
      console.log('📱 Owner mobile:', ownerMobile);
    } catch (error) {
      console.log('⚠️ Could not get owner mobile:', error.message);
    }
    
    // Get API endpoint
    const endpoints = await ConfigService.getApiEndpoints();
    const profileEndpoint = endpoints.user.profile;
    
    console.log('🌐 Profile endpoint:', profileEndpoint);
    
    // Build POST body (matching your ViewProfile API call)
    const requestBody = {
      leader_regd_mobile_no: ownerMobile,
      user_email_id: userEmail
    };
    
    console.log('📡 Profile API Request:', requestBody);
    
    // Call profile API
    const result = await ApiService.authPost(profileEndpoint, requestBody);
    
    console.log('📥 Profile API Response:', {
      success: result.success,
      status: result.status,
      hasData: !!result.data
    });
    
    if (result.success && result.data) {
      LoginLoggingService.loginInfo('✅ Profile API call successful');
      
      // Extract user data from response (matching your ViewProfile structure)
      let userData;
      
      if (result.data.formattedData) {
        userData = result.data.formattedData;
        console.log('✅ Using formattedData');
      } else if (result.data.user) {
        userData = result.data.user;
        console.log('✅ Using user data');
      } else if (result.data.data) {
        userData = result.data.data;
        console.log('✅ Using data field');
      } else if (result.data._id || result.data.email) {
        userData = result.data;
        console.log('✅ Using direct data');
      }
      
      if (!userData) {
        console.log('❌ No user data in response');
        return null;
      }
      
      // Enhance with admin status
      const enhancedProfile = await LoginAdminService.enhanceUserDataWithAdminStatus(
        userData, 
        userEmail
      );
      
      // ✅ CRITICAL: Normalize mobile field
      const mobile = enhancedProfile.mobile || 
                     enhancedProfile.mobileNo || 
                     enhancedProfile.mobile_no || 
                     enhancedProfile.mobileNumber || 
                     '';
      
      const normalizedProfile = {
        ...enhancedProfile,
        mobile: mobile,
        mobileNo: mobile
      };
      
      console.log('📋 Normalized profile data:', {
        name: normalizedProfile.name,
        email: normalizedProfile.email,
        mobile: mobile,
        hasImage: !!normalizedProfile.profile_image
      });
      
      // Handle profile image URL
      if (normalizedProfile.profile_image && normalizedProfile.profile_image !== 'placeholder') {
        try {
          const workingImageUrl = await LoginImageService.getWorkingImageUrl(normalizedProfile.profile_image);
          if (workingImageUrl) {
            normalizedProfile.profile_image = workingImageUrl;
            console.log('✅ Profile image URL resolved:', workingImageUrl);
          }
        } catch (imageError) {
          console.log('⚠️ Image resolution error:', imageError.message);
        }
      }
      
      // ✅ STORE with multiple keys for reliability
      await AsyncStorage.setItem('userData', JSON.stringify(normalizedProfile));
      await AsyncStorage.setItem('userProfile', JSON.stringify(normalizedProfile));
      await AsyncStorage.setItem('profileLastUpdated', new Date().toISOString());
      await AsyncStorage.setItem('userName', normalizedProfile.name || '');
      await AsyncStorage.setItem('userEmail', normalizedProfile.email || '');
      await AsyncStorage.setItem('userMobile', mobile);
      
      // ✅ UPDATE ALL GLOBAL VARIABLES
      global.currentUser = normalizedProfile;
      global.currentUserName = normalizedProfile.name || normalizedProfile.fullName;
      global.currentUserEmail = normalizedProfile.email;
      global.isUserAdmin = normalizedProfile.isAdmin || false;
      global.currentUserMobile = mobile;
      global.currentUserCity = normalizedProfile.city;
      global.currentUserProfileImage = normalizedProfile.profile_image;
      global.isUserLoggedin = true;
      
      console.log('✅ Profile loaded and stored - data ready for drawer:', {
        name: global.currentUserName,
        email: global.currentUserEmail,
        mobile: global.currentUserMobile,
        hasImage: !!global.currentUserProfileImage,
        imageUrl: global.currentUserProfileImage
      });
      
      // Trigger drawer refresh
      if (global.refreshDrawer && typeof global.refreshDrawer === 'function') {
        console.log('🔄 Triggering drawer refresh');
        global.refreshDrawer();
      }
      
      return normalizedProfile;
      
    } else {
      console.log('⚠️ Profile API failed:', result.message);
      return null;
    }
    
  } catch (error) {
    LoginLoggingService.loginError('❌ Profile load error', {
      error: error.message,
      userEmail
    });
    return null;
  } finally {
    setProfileLoading(false);
  }
};

  
// Add this helper function BEFORE handleLogin in LoginScreen.js

// ✅ IMPROVED: Store user data with proper mobile field handling
const storeUserDataReliably = async (userData) => {
  try {
    console.log('💾 storeUserDataReliably called');
    
    // Normalize mobile number - check ALL possible field names
    const mobile = userData.mobile || 
                   userData.mobileNo || 
                   userData.mobile_no || 
                   userData.mobileNumber || 
                   userData.mobile_number || 
                   userData.phone || 
                   userData.phoneNumber || 
                   '';
    
    const normalizedUserData = {
      ...userData,
      mobile: mobile,
      mobileNo: mobile
    };
    
    console.log('📋 Storing normalized data:', {
      name: normalizedUserData.name,
      email: normalizedUserData.email,
      mobile: mobile
    });
    
    // Store in AsyncStorage with multiple keys for redundancy
    await AsyncStorage.setItem('userData', JSON.stringify(normalizedUserData));
    await AsyncStorage.setItem('userProfile', JSON.stringify(normalizedUserData)); // Backup key
    await AsyncStorage.setItem('isLoggedin', 'TRUE');
    await AsyncStorage.setItem('userName', normalizedUserData.name || '');
    await AsyncStorage.setItem('userEmail', normalizedUserData.email || '');
    await AsyncStorage.setItem('userMobile', mobile);
    
    // Set ALL global variables
    global.currentUser = normalizedUserData;
    global.currentUserName = normalizedUserData.name || normalizedUserData.fullName;
    global.currentUserEmail = normalizedUserData.email;
    global.isUserAdmin = normalizedUserData.isAdmin || false;
    global.isUserLoggedin = true;
    global.currentUserMobile = mobile;
    global.currentUserCity = normalizedUserData.city;
    global.currentUserProfileImage = normalizedUserData.profile_image;
    
    console.log('✅ Storage complete. Global state:', {
      name: global.currentUserName,
      email: global.currentUserEmail,
      mobile: global.currentUserMobile,
      isLoggedIn: global.isUserLoggedin
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Storage error:', error);
    
    // Even if storage fails, set global variables as fallback
    const mobile = userData.mobile || userData.mobileNo || userData.mobile_number || '';
    global.currentUser = userData;
    global.currentUserName = userData.name || userData.fullName;
    global.currentUserEmail = userData.email;
    global.isUserLoggedin = true;
    global.currentUserMobile = mobile;
    
    return false;
  }
};
// ✅ COMPLETE FIXED handleLogin function for LoginScreen.js
// Replace your entire handleLogin function with this:

const handleLogin = async () => {
  if (!validateForm()) return;

  setLoading(true);

  try {
    LoginLoggingService.loginInfo('🚀 === STARTING LOGIN PROCESS ===', {
      email: formData.email.trim().toLowerCase()
    });
    
    // ✅ STEP 1: Get leader mobile number
    const getMobileNumberFromStorage = async () => {
      try {
        console.log('📱 === RETRIEVING OWNER MOBILE FROM BOOTSTRAP ===');
        
        // Method 1: Get from EncryptedStorage (stored during bootstrap)
        const storedOwnerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
        
        if (storedOwnerMobile && storedOwnerMobile !== '') {
          console.log('✅ Found owner mobile in storage:', storedOwnerMobile);
          console.log('   This was stored during app bootstrap from AppOwnerInfo');
          return storedOwnerMobile;
        }
        
        console.log('⚠️ OWNER_MOBILE not found in storage, checking AppOwnerInfo directly...');
        
        // Method 2: Fallback - Get from AppOwnerInfo directly
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          console.log('📋 AppOwnerInfo found, extracting mobile...');
          
          // Check all possible mobile fields (same order as App.js)
          const possibleMobileFields = [
            'client_mobile',
            'mobile_no',
            'mobile_number',
            'phone',
            'mobileNo',
            'regdMobileNo',
            'Mobile',
            'MobileNo',
            'MOBILE',
            'phoneNumber',
            'contactNumber',
            'mobile',
            'cell',
            'cellular',
            'contact',
            'phone_number'
          ];
          
          for (const field of possibleMobileFields) {
            const value = appOwnerInfo[field];
            if (value && (typeof value === 'string' || typeof value === 'number')) {
              const mobileNumber = String(value).trim();
              if (mobileNumber && mobileNumber !== '') {
                console.log(`✅ Found mobile in AppOwnerInfo field '${field}': ${mobileNumber}`);
                
                // Store it for next time
                await EncryptedStorage.setItem('OWNER_MOBILE', mobileNumber);
                
                return mobileNumber;
              }
            }
          }
          
          console.warn('⚠️ No mobile field found in AppOwnerInfo');
          console.log('📋 Available fields:', Object.keys(appOwnerInfo));
        } else {
          console.warn('⚠️ AppOwnerInfo not found in storage');
        }
        
        // Method 3: Final fallback - use default
        console.warn('⚠️ Using default mobile number: 7702000725');
        console.warn('   This means bootstrap may have failed or mobile not in AppOwnerInfo');
        
        return '7702000725';
        
      } catch (error) {
        console.error('❌ Error retrieving owner mobile:', error);
        console.error('❌ Stack:', error.stack);
        
        // Last resort fallback
        return '7702000725';
      }
    };

    const leaderMobileNo = await getMobileNumberFromStorage();

    // Validate mobile number
    console.log('📱 === LEADER MOBILE NUMBER FOR LOGIN API ===');
    console.log('   Mobile:', leaderMobileNo);
    console.log('   Length:', leaderMobileNo?.length);
    console.log('   Type:', typeof leaderMobileNo);

    if (!leaderMobileNo || leaderMobileNo === '' || leaderMobileNo === 'undefined') {
      console.error('❌ CRITICAL: Invalid mobile number!');
      Alert.alert(
        'Configuration Error',
        'Owner mobile number not found. The app may not have bootstrapped correctly.\n\n' +
        'Please restart the app.',
        [{ text: 'OK' }]
      );
      setLoading(false);
      return;
    }

    console.log('✅ Mobile number validated - proceeding with login');

    // ✅ STEP 2: Store leader mobile for profile API
    await EncryptedStorage.setItem('OWNER_MOBILE', leaderMobileNo);

    // ✅ STEP 3: Get APP_KEY (THIS WAS MISSING!)
    const appKey = await EncryptedStorage.getItem('APP_KEY');
    console.log('🔑 App Key:', appKey ? `Found: ${appKey.substring(0, 20)}...` : 'Not Found');

    if (!appKey) {
      Alert.alert('Error', 'APP_KEY not found. Please restart the app.');
      setLoading(false);
      return;
    }

    // ✅ STEP 4: Get login endpoint
    const endpoints = await ConfigService.getApiEndpoints();
    const loginEndpoint = endpoints.auth.login;
    console.log('🌐 Login Endpoint:', loginEndpoint);

    // ✅ STEP 5: Prepare request with leader mobile number
    const requestBody = {
      user_email_id: formData.email.trim().toLowerCase(),
      password: formData.password,
      leader_regd_mobile_no: leaderMobileNo,
    };

    console.log('📡 Login Request Body:', {
      user_email_id: requestBody.user_email_id,
      leader_regd_mobile_no: requestBody.leader_regd_mobile_no,
      password: '***'
    });

    // ✅ STEP 6: Make API call
    const response = await fetch(loginEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-app-key': appKey,
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json();
    
    console.log('📥 Full Response:', JSON.stringify(responseData, null, 2));

    if (!response.ok) {
      throw new Error(responseData.message || 'Login failed');
    }

    // ✅ STEP 7: Extract tokens
    const accessToken = responseData.accessToken || responseData.token;
    const refreshToken = responseData.refreshToken || responseData.refresh_token;

    console.log('🔍 Token extraction:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken?.length || 0,
      refreshTokenLength: refreshToken?.length || 0
    });

    if (!accessToken) {
      throw new Error('No access token received from server');
    }

    if (!refreshToken) {
      console.warn('⚠️ WARNING: No refresh token received!');
    }

    // ✅ STEP 8: Save tokens FIRST (before making any API calls)
    console.log('💾 === SAVING TOKENS ===');
    
    await Promise.all([
      AsyncStorage.setItem('jwt_token', accessToken),
      AsyncStorage.setItem('userAccessToken', accessToken),
    ]);
    console.log('✅ Access token saved');
    
    if (refreshToken) {
      await Promise.all([
        AsyncStorage.setItem('refresh_token', refreshToken),
        AsyncStorage.setItem('refreshToken', refreshToken),
        AsyncStorage.setItem('userRefreshToken', refreshToken),
      ]);
      console.log('✅ Refresh token saved');
    }

    // ✅ STEP 9: Extract user email and GET OWNER EMAIL FOR ADMIN CHECK
    const userEmail = formData.email.trim().toLowerCase();

    // ✅ CRITICAL: Get OWNER_EMAIL for admin check
    let ownerEmail = '';
    try {
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        const appOwnerInfo = JSON.parse(appOwnerInfoStr);
        ownerEmail = appOwnerInfo.emailid || 
                    appOwnerInfo.email || 
                    appOwnerInfo.email_id || 
                    appOwnerInfo.owner_email || 
                    '';
      }
      
      // Also try direct storage
      if (!ownerEmail) {
        ownerEmail = await EncryptedStorage.getItem('OWNER_EMAIL') || '';
      }
      
      console.log('📧 Email Comparison:', {
        userEmail,
        ownerEmail,
        match: userEmail === ownerEmail.toLowerCase()
      });
      
      // ✅ STORE OWNER EMAIL
      if (ownerEmail) {
        await EncryptedStorage.setItem('OWNER_EMAIL', ownerEmail);
      }
      
    } catch (error) {
      console.error('Error getting owner email:', error);
    }

    // Save user email to storage
    await Promise.all([
      AsyncStorage.setItem('userEmail', userEmail),
      EncryptedStorage.setItem('LOGGED_IN_EMAIL', userEmail)
    ]);
    console.log('✅ User email saved');

    // ✅ STEP 10: CHECK ADMIN STATUS IMMEDIATELY
    const isAdminUser = userEmail === ownerEmail.toLowerCase() && ownerEmail !== '';

    // ✅ STORE ADMIN STATUS IN ALL LOCATIONS
    await EncryptedStorage.setItem('USER_ROLE', isAdminUser ? 'admin' : 'user');

    // ✅ UPDATE ALL GLOBAL VARIABLES
    global.loggedin_email = userEmail;
    global.owner_emailid = ownerEmail;
    global.userRole = isAdminUser ? 'admin' : 'user';
    global.isUserAdmin = isAdminUser;
    global.isUserLoggedin = true;

    console.log('✅ Admin Status Set:', {
      isAdmin: isAdminUser,
      userRole: global.userRole,
      userEmail,
      ownerEmail,
      globalIsUserAdmin: global.isUserAdmin,
      globalUserRole: global.userRole
    });

    // ✅ STEP 11: Set login status
    await AsyncStorage.setItem('isLoggedin', 'TRUE');
    console.log('✅ Login status set');

    // ✅ STEP 12: NOW load profile from API (tokens and admin status are set)
    console.log('⏳ === LOADING FULL PROFILE FROM API ===');
    setProfileLoading(true);
    
    const fullProfile = await silentProfileLoad(userEmail);
    
    setProfileLoading(false);

    if (!fullProfile) {
      // If profile load fails, create minimal user data
      console.log('⚠️ Profile API failed, creating minimal user data');
      
      const minimalUserData = {
        email: userEmail,
        name: userEmail.split('@')[0],
        mobile: '',
        isAdmin: isAdminUser,
        userRole: isAdminUser ? 'admin' : 'user',
        emailVerified: isAdminUser ? true : false
      };
      
      await storeUserDataReliably(minimalUserData);
      
      const successMsg = isAdminUser ? '👑 Admin Login Successful!' : '✅ Login Successful!';
      const adminInfo = isAdminUser ? '\n\nAdmin privileges enabled.' : '';
      
      Alert.alert(
        'Login Successful', 
        `${successMsg}\nWelcome! Please complete your profile.${adminInfo}`,
        [
          {
            text: 'OK',
            onPress: async () => {
              const finalAdminCheck = global.loggedin_email?.toLowerCase() === global.owner_emailid?.toLowerCase();
              
              if (finalAdminCheck !== global.isUserAdmin) {
                console.log('⚠️ Admin status mismatch detected, correcting...');
                global.isUserAdmin = finalAdminCheck;
                global.userRole = finalAdminCheck ? 'admin' : 'user';
                await EncryptedStorage.setItem('USER_ROLE', finalAdminCheck ? 'admin' : 'user');
              }
              
              console.log('🔑 Final Admin Status Before Navigation:', {
                isAdmin: global.isUserAdmin,
                userRole: global.userRole,
                loginEmail: global.loggedin_email,
                ownerEmail: global.owner_emailid
              });
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'MainDrawer' }],
              });
              
              const refreshDelays = [0, 100, 300, 600, 1000];
              refreshDelays.forEach(delay => {
                setTimeout(() => {
                  if (global.refreshDrawer) {
                    console.log(`🔄 Drawer refresh at ${delay}ms`);
                    global.refreshDrawer();
                  }
                }, delay);
              });
            }
          }
        ]
      );
      return;
    }

    // ✅ STEP 13: Profile loaded successfully
    console.log('✅ Full profile loaded:', {
      name: fullProfile.name,
      email: fullProfile.email,
      mobile: fullProfile.mobile,
      isAdmin: fullProfile.isAdmin || isAdminUser
    });

    fullProfile.isAdmin = fullProfile.isAdmin || isAdminUser;
    fullProfile.userRole = fullProfile.isAdmin ? 'admin' : 'user';

    await new Promise(resolve => setTimeout(resolve, 300));

    // ✅ STEP 14: Show success and navigate
    const isAdmin = fullProfile.isAdmin;
    const successMsg = isAdmin ? '👑 Admin Login Successful!' : '✅ Login Successful!';
    const adminInfo = isAdmin ? '\n\nAdmin privileges enabled.' : '';
    const welcomeMsg = `Welcome back, ${fullProfile.name || userEmail}!${adminInfo}`;

    Alert.alert('Success', `${successMsg}\n${welcomeMsg}`, [
      {
        text: 'OK',
        onPress: async () => {
          console.log('🏠 Navigating to MainDrawer');
          
          const finalAdminCheck = global.loggedin_email?.toLowerCase() === global.owner_emailid?.toLowerCase();
          
          if (finalAdminCheck !== global.isUserAdmin) {
            console.log('⚠️ Admin status mismatch detected, correcting...');
            global.isUserAdmin = finalAdminCheck;
            global.userRole = finalAdminCheck ? 'admin' : 'user';
            await EncryptedStorage.setItem('USER_ROLE', finalAdminCheck ? 'admin' : 'user');
          }
          
          console.log('🔑 Final Admin Status Before Navigation:', {
            isAdmin: global.isUserAdmin,
            userRole: global.userRole,
            loginEmail: global.loggedin_email,
            ownerEmail: global.owner_emailid,
            match: global.loggedin_email === global.owner_emailid?.toLowerCase()
          });
          
          navigation.reset({
            index: 0,
            routes: [{ name: 'MainDrawer' }],
          });
          
          const refreshDelays = [0, 100, 300, 600, 1000];
          refreshDelays.forEach(delay => {
            setTimeout(() => {
              if (global.refreshDrawer) {
                console.log(`🔄 Drawer refresh at ${delay}ms`);
                global.refreshDrawer();
              }
            }, delay);
          });
        },
      },
    ]);
    
  } catch (error) {
    LoginLoggingService.loginError('💥 Login error', error);
    console.error('Full error:', error);
    
    let errorMessage = 'Login failed. Please try again.';
    
    if (error.message.includes('Network')) {
      errorMessage = 'Network error. Please check your connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
    setAdminCheckLoading(false);
    setProfileLoading(false);
  }
};

  const handleForgotPassword = () => {
  navigation.navigate('ForgotPassword'); // Navigate to forgot password screen
};

  const handleRegister = () => {
    navigation.navigate('Registration');
  };

  // Render success message banner
  const renderSuccessMessage = () => {
    if (!showSuccessMessage) return null;
    
    return (
      <View style={styles.successMessageContainer}>
        <Text style={styles.successMessageText}>✅ {successMessage}</Text>
        <Text style={styles.successMessageSubText}>Please login to continue</Text>
      </View>
    );
  };

  // Render loading indicators
  const renderLoadingIndicators = () => {
    if (!adminCheckLoading && !profileLoading) return null;
    
    return (
      <View style={styles.loadingIndicatorsContainer}>
        {adminCheckLoading && (
          <View style={styles.adminCheckContainer}>
            <ActivityIndicator size="small" color="#FFD700" />
            <Text style={styles.adminCheckText}>Checking admin status...</Text>
          </View>
        )}
        {profileLoading && (
          <View style={styles.profileLoadContainer}>
            <ActivityIndicator size="small" color="#4CAF50" />
            <Text style={styles.profileLoadText}>Loading full profile...</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
  <View style={styles.headerLogoContainer}>
    <Image 
      source={bjpLogo}
      style={styles.headerLogoImage}
      resizeMode="contain"
    />
  </View>
  <Text style={styles.title}>Login</Text>
         
        

        
        </View>

        <View style={styles.formContainer}>
          {/* Success Message Banner */}
          {renderSuccessMessage()}

          {/* Loading Indicators */}
          {renderLoadingIndicators()}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS *</Text>
            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#e16e2b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !adminCheckLoading && !profileLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD *</Text>
            <View style={styles.passwordContainer}>
              <Icon name="lock" size={20} color="#e16e2b" style={styles.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                editable={!loading && !adminCheckLoading && !profileLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading || adminCheckLoading || profileLoading}
              >
                <Icon
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={loading || adminCheckLoading || profileLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.loginButton, 
              (loading || adminCheckLoading || profileLoading) && styles.loginButtonDisabled
            ]} 
            onPress={handleLogin}
            disabled={loading || adminCheckLoading || profileLoading}
          >
            {(loading || adminCheckLoading || profileLoading) ? (
              <View style={styles.loginButtonLoading}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loginButtonText}>
                  {profileLoading ? 'Loading Profile...' : 
                   adminCheckLoading ? 'Checking Admin Status...' : 
                   'Logging in...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up Section */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={handleRegister}
              disabled={loading || adminCheckLoading || profileLoading}
            >
              <Text style={[
                styles.signUpLink,
                (loading || adminCheckLoading || profileLoading) && styles.signUpLinkDisabled
              ]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          
        
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#e16e2b',
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 10,
  },
  adminInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  adminInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  roleInfoContainer: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  roleInfoText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
  },
  formContainer: {
    padding: 25,
    paddingTop: 40,
  },
  // Success Message Styles
  successMessageContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  successMessageText: {
    color: '#155724',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  successMessageSubText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
  },
  // Loading Indicators Container
  loadingIndicatorsContainer: {
    marginBottom: 20,
  },
  // Admin Check Loading Styles
  adminCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    justifyContent: 'center',
  },
  adminCheckText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Profile Loading Styles
  profileLoadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e8',
    borderColor: '#4CAF50',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
  },
  profileLoadText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  inputIcon: {
    marginRight: 5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#e16e2b',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#e16e2b',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 30,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  // SIGN UP STYLES
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  signUpText: {
    color: '#666',
    fontSize: 16,
  },
  signUpLink: {
    color: '#e16e2b',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpLinkDisabled: {
    color: '#ccc',
  },
  headerLogoContainer: {
  width: 80,
  height: 80,
  borderRadius: 50,  // Half of width/height for perfect circle
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  overflow: 'hidden',  // CRITICAL - clips image to circular boundary
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  borderWidth: 3,
  borderColor: 'rgba(255, 255, 255, 0.8)',
},
headerLogoImage: {
  width: 100,   // Slightly smaller than container
  height: 100,  // Slightly smaller than container
},
});

export default LoginScreen;