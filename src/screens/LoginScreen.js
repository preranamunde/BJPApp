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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import AuthService from '../utils/AuthService';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { updateUserLoginStatus } from '../../App'; // Import the helper function

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
      LoginLoggingService.loginInfo('🔧 === ENHANCING LOGIN RESPONSE ===');
      
      if (!loginResult.success || !loginResult.user) {
        LoginLoggingService.loginWarn('⚠️ Login was not successful or no user data, skipping enhancement');
        return loginResult;
      }

      setAdminCheckLoading(true);
      
      // Enhance user data with admin status and auto email verification
      const enhancedUserData = await LoginAdminService.enhanceUserDataWithAdminStatus(
        loginResult.user, 
        formData.email.trim().toLowerCase()
      );

      // Create enhanced login result
      const enhancedResult = {
        ...loginResult,
        user: enhancedUserData,
        adminEnhanced: true
      };

      LoginLoggingService.loginInfo('✅ Login response enhanced successfully', {
        isAdmin: enhancedUserData.isAdmin,
        emailVerified: enhancedUserData.emailVerified,
        userRole: enhancedUserData.userRole
      });

      return enhancedResult;

    } catch (error) {
      LoginLoggingService.loginError('❌ Error enhancing login response', error);
      // Return original result if enhancement fails
      return loginResult;
    } finally {
      setAdminCheckLoading(false);
    }
  };

  // ENHANCED: Silent Profile Loading Function with better error handling
  const silentProfileLoad = async (userEmail) => {
    try {
      LoginLoggingService.loginInfo('🔇 === SILENT PROFILE LOAD STARTED ===', { userEmail });
      setProfileLoading(true);
      
      // Get profile data from API using LoginProfileAPI
      const result = await LoginProfileAPI.getProfile();
      
      if (result.success && result.data) {
        LoginLoggingService.loginInfo('✅ Silent profile API call successful');
        
        // Enhance profile with admin status
        const enhancedProfile = await LoginAdminService.enhanceUserDataWithAdminStatus(
          result.data, 
          userEmail
        );
        
        // Update stored data with full profile
        await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
        await AsyncStorage.setItem('profileLastUpdated', new Date().toISOString());
        
        // Update global variables with complete profile
        global.currentUser = enhancedProfile;
        global.currentUserName = enhancedProfile.name || enhancedProfile.fullName;
        global.currentUserEmail = enhancedProfile.email;
        global.isUserAdmin = enhancedProfile.isAdmin || false;
        global.currentUserMobile = enhancedProfile.mobile || enhancedProfile.mobileNo;
        global.currentUserCity = enhancedProfile.city;
        global.currentUserProfileImage = enhancedProfile.profile_image;
        global.isUserLoggedin = true;
        
        // Fix profile image URL if needed
        if (enhancedProfile.profile_image && enhancedProfile.profile_image !== 'placeholder') {
          const workingImageUrl = await LoginImageService.getWorkingImageUrl(enhancedProfile.profile_image);
          if (workingImageUrl) {
            global.currentUserProfileImage = workingImageUrl;
            enhancedProfile.profile_image = workingImageUrl;
            await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
          }
        }
        
        LoginLoggingService.loginInfo('✅ Silent profile load completed - data ready for drawer', {
          userName: global.currentUserName,
          userEmail: global.currentUserEmail,
          isAdmin: global.isUserAdmin,
          hasProfileImage: !!global.currentUserProfileImage,
          profileImageUrl: global.currentUserProfileImage
        });
        
        // Trigger drawer refresh if needed
        if (global.refreshDrawer && typeof global.refreshDrawer === 'function') {
          LoginLoggingService.loginInfo('🔄 Triggering drawer refresh');
          global.refreshDrawer();
        }
        
        return enhancedProfile;
      } else {
        LoginLoggingService.loginWarn('⚠️ Silent profile API call failed, keeping existing data');
        return null;
      }
    } catch (error) {
      LoginLoggingService.loginError('❌ Silent profile load error', {
        error: error.message,
        userEmail
      });
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      LoginLoggingService.loginInfo('🚀 === STARTING LOGIN PROCESS ===', {
        email: formData.email.trim().toLowerCase()
      });
      
      // Call the original login service
      const result = await AuthService.loginUser(formData.email, formData.password);
      
      LoginLoggingService.loginDebug('Login service result', {
        success: result.success,
        hasUser: !!result.user,
        message: result.message
      });

      if (result.success) {
        LoginLoggingService.loginInfo('✅ Login successful, enhancing with admin status...');

        // Enhance the login result with admin status checking
        const enhancedResult = await enhanceLoginResponse(result);

        LoginLoggingService.loginInfo('🎉 Login process completed successfully', {
          isAdmin: enhancedResult.user?.isAdmin,
          emailVerified: enhancedResult.user?.emailVerified,
          userRole: enhancedResult.user?.userRole
        });

        // Update global user login status using App.js helper function
        const updateResult = await updateUserLoginStatus(
          formData.email.trim().toLowerCase(),
          result.accessToken || result.token,
          enhancedResult.user
        );

        LoginLoggingService.loginInfo('🔄 Global login status update result', {
          success: updateResult.success,
          userRole: updateResult.userRole,
          isAdmin: updateResult.isAdmin
        });

        // STORE USER DATA IMMEDIATELY
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(enhancedResult.user));
          await AsyncStorage.setItem('isLoggedin', 'TRUE');
          
          // Set global variables for immediate drawer access
          global.currentUser = enhancedResult.user;
          global.currentUserName = enhancedResult.user.name || enhancedResult.user.fullName;
          global.currentUserEmail = enhancedResult.user.email;
          global.isUserAdmin = enhancedResult.user.isAdmin || false;
          global.isUserLoggedin = true;
          
          LoginLoggingService.loginInfo('💾 User data stored and global variables set');
        } catch (storageError) {
          LoginLoggingService.loginError('❌ Error storing user data', storageError);
        }

        // ENHANCED: Load full profile and WAIT for it to complete before navigation
        LoginLoggingService.loginInfo('⏳ Loading full profile before navigation...');
        
        try {
          const fullProfile = await silentProfileLoad(formData.email.trim().toLowerCase());
          
          if (fullProfile) {
            LoginLoggingService.loginInfo('✅ Full profile loaded successfully before navigation');
          } else {
            LoginLoggingService.loginWarn('⚠️ Full profile load failed, but proceeding with navigation');
          }
        } catch (profileError) {
          LoginLoggingService.loginError('❌ Profile load error, but proceeding with navigation', profileError);
        }

        // Show success message and navigate
        const isAdmin = enhancedResult.user?.isAdmin || updateResult.isAdmin;
        const successMsg = isAdmin 
          ? '👑 Admin Login Successful!' 
          : '✅ Login Successful!';

        const detailMsg = isAdmin
          ? 'Welcome back, Administrator! Your profile has been loaded and you have full system access.'
          : 'Welcome back! Your profile has been loaded successfully.';

        const debugInfo = __DEV__ ? 
          `\n\n🔧 DEBUG INFO:\n` +
          `User Role: ${updateResult.userRole}\n` +
          `Is Admin: ${updateResult.isAdmin}\n` +
          `Owner Email: ${updateResult.owner_emailid}\n` +
          `Login Email: ${updateResult.loggedin_email}\n` +
          `Profile Loaded: ${!!global.currentUser}\n` +
          `Username Ready: ${!!global.currentUserName}`
          : '';

        Alert.alert(
          'Success', 
          `${successMsg}\n${detailMsg}${debugInfo}`, 
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to main app - drawer should now have user data
                LoginLoggingService.loginInfo('🏠 Navigating to MainDrawer with loaded profile');
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainDrawer' }],
                });
              },
            },
          ]
        );
      } else {
        LoginLoggingService.loginError('❌ Login failed', { message: result.message });
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      LoginLoggingService.loginError('💥 Login error', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Forgot password functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
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
          <Icon name="account-circle" size={80} color="#fff" />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Access Your Account</Text>
          
          {/* Enhanced admin info indicator */}
          <View style={styles.adminInfoContainer}>
            <Icon name="info" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.adminInfoText}>
              Profile data will be loaded automatically
            </Text>
          </View>

          {/* Additional info about profile loading */}
          <View style={styles.roleInfoContainer}>
            <Text style={styles.roleInfoText}>
              • User profile loaded during login{'\n'}
              • Username ready for drawer display{'\n'}
              • Admin status determined automatically
            </Text>
          </View>
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

          {/* Enhanced Profile Loading Info */}
          <View style={styles.profileLoadingInfoContainer}>
            <View style={styles.profileLoadingInfoHeader}>
              <Icon name="account-circle" size={20} color="#4CAF50" />
              <Text style={styles.profileLoadingInfoTitle}>Profile Auto-Loading</Text>
            </View>
            <Text style={styles.profileLoadingInfoText}>
              • Complete profile data loaded during login{'\n'}
              • Username immediately available in navigation drawer{'\n'}
              • No waiting time when accessing View Profile{'\n'}
              • Profile image URLs automatically resolved{'\n'}
              • Admin privileges applied instantly{'\n'}
              • Offline profile data cached for faster access
            </Text>
          </View>

          {/* Enhanced Admin Features Info */}
          <View style={styles.adminFeaturesContainer}>
            <View style={styles.adminFeaturesHeader}>
              <Icon name="admin-panel-settings" size={20} color="#FFD700" />
              <Text style={styles.adminFeaturesTitle}>Admin Features</Text>
            </View>
            <Text style={styles.adminFeaturesText}>
              • App owners automatically become administrators{'\n'}
              • Email verification is bypassed for admins{'\n'}
              • Full system access and user management{'\n'}
              • Edit capabilities enabled in all screens{'\n'}
              • Role determined by matching owner email{'\n'}
              • Profile data enhanced with admin privileges
            </Text>
          </View>

          {/* Login Flow Info */}
          {__DEV__ && (
            <View style={styles.debugInfoContainer}>
              <View style={styles.debugInfoHeader}>
                <Icon name="bug-report" size={18} color="#666" />
                <Text style={styles.debugInfoTitle}>Enhanced Login Flow (Debug)</Text>
              </View>
              <Text style={styles.debugInfoText}>
                1. User enters credentials{'\n'}
                2. AuthService validates login{'\n'}
                3. Admin status checked against owner email{'\n'}
                4. Basic user data stored immediately{'\n'}
                5. Global variables set for drawer access{'\n'}
                6. Full profile loaded from API{'\n'}
                7. Profile image URLs resolved{'\n'}
                8. Enhanced profile data cached{'\n'}
                9. Drawer refresh triggered{'\n'}
                10. Navigation to MainDrawer with ready profile
              </Text>
            </View>
          )}
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
  // Profile Loading Info Styles
  profileLoadingInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  profileLoadingInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileLoadingInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginLeft: 8,
  },
  profileLoadingInfoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  // Admin Features Info Styles
  adminFeaturesContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  adminFeaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminFeaturesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginLeft: 8,
  },
  adminFeaturesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  // Debug Info Styles
  debugInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginLeft: 6,
  },
  debugInfoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

export default LoginScreen;