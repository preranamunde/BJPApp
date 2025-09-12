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
  
  static async getWorkingImageUrl(relativePath) {
    if (!relativePath || relativePath === 'placeholder') {
      LoggingService.profileWarn('No valid image path provided', { relativePath });
      return null;
    }
    
    try {
      const imageUrl = await ConfigService.getProfileImageUrl(relativePath);
      
      LoggingService.profileDebug('Testing ConfigService image URL', {
        relativePath,
        constructedUrl: imageUrl
      });
      
      if (imageUrl) {
        const isAccessible = await this.testImageUrl(imageUrl);
        
        if (isAccessible) {
          LoggingService.profileInfo('ConfigService image URL is working', { url: imageUrl });
          return imageUrl;
        } else {
          LoggingService.profileWarn('ConfigService image URL not accessible', { url: imageUrl });
        }
      }
      
      const baseUrl = await ConfigService.getBaseUrl();
      const cleanPath = relativePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      
      const fallbackPaths = [
        `${baseUrl}/uploads/profile_images/${cleanPath}`,
        `${baseUrl}/uploads/${cleanPath}`,
        `${baseUrl}/${cleanPath}`,
      ];
      
      for (const fallbackUrl of fallbackPaths) {
        const isAccessible = await this.testImageUrl(fallbackUrl);
        if (isAccessible) {
          LoggingService.profileInfo('Found working fallback image URL', { url: fallbackUrl });
          return fallbackUrl;
        }
      }
      
      LoggingService.profileWarn('No accessible image URL found', { relativePath, testedUrls: fallbackPaths });
      return null;
      
    } catch (error) {
      LoggingService.profileError('Error in getWorkingImageUrl', {
        error: error.message,
        relativePath
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
class ProfileAPI {
  static async getProfile() {
    LoggingService.profileInfo('Starting profile fetch from API using ConfigService');
    
    try {
      const endpoints = await ConfigService.getApiEndpoints();
      const profileEndpoint = endpoints.user.profile;
      
      LoggingService.profileDebug('Profile endpoint from ConfigService', { 
        endpoint: profileEndpoint 
      });

      const result = await ApiService.authGet(profileEndpoint);
      
      LoggingService.profileDebug('Raw API response from ApiService', {
        success: result.success,
        status: result.status,
        hasData: !!result.data,
        dataStructure: result.data ? Object.keys(result.data) : []
      });

      if (result.success && result.data) {
        let userData;
        
        if (result.data.formattedData) {
          userData = result.data.formattedData;
          LoggingService.profileDebug('Using formattedData structure', { userData });
        } else if (result.data.user) {
          userData = result.data.user;
          LoggingService.profileDebug('Using user structure', { userData });
        } else if (result.data.data) {
          userData = result.data.data;
          LoggingService.profileDebug('Using data structure', { userData });
        } else if (result.data._id || result.data.email) {
          userData = result.data;
          LoggingService.profileDebug('Using direct data structure', { userData });
        } else {
          LoggingService.profileError('No user data found in response', { data: result.data });
          return {
            success: false,
            message: 'No profile data found in server response',
          };
        }

        if (userData.profile_image) {
          const workingImageUrl = await ImageService.getWorkingImageUrl(userData.profile_image);
          
          if (workingImageUrl) {
            userData.profile_image = workingImageUrl;
            LoggingService.profileInfo('Profile image URL resolved using ConfigService', { 
              url: workingImageUrl 
            });
          } else {
            LoggingService.profileWarn('Could not resolve profile image URL', { 
              originalPath: userData.profile_image 
            });
          }
        }

        LoggingService.profileInfo('Profile fetch successful', {
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
        LoggingService.profileError('Profile fetch failed', {
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
      LoggingService.profileError('Profile API error', {
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
        LoggingService.profileWarn('User not logged in - showing login required screen');
        setIsUserLoggedIn(false);
        setLoading(false);
        return;
      }

      // Check if tokens exist
      const accessToken = await AuthService.getToken();
      const refreshToken = await AuthService.getRefreshToken();
      
      LoggingService.profileDebug('Token availability check', { 
        hasAccessToken: !!accessToken, 
        hasRefreshToken: !!refreshToken,
        accessTokenLength: accessToken?.length || 0
      });

      if (!accessToken && !refreshToken) {
        LoggingService.profileWarn('No tokens found');
        
        if (justRegistered) {
          LoggingService.profileInfo('User just registered, attempting local profile load');
          setIsUserLoggedIn(true);
          await loadLocalUserProfile();
          return;
        }
        
        LoggingService.profileWarn('User needs to login');
        setIsUserLoggedIn(false);
        setLoading(false);
        return;
      }

      // Validate JWT token - The AuthService will handle automatic logout if needed
      LoggingService.profileDebug('Starting token validation');
      const tokenValidation = await AuthService.validateAndRefreshToken();
      LoggingService.profileDebug('Token validation result', tokenValidation);
      
      if (!tokenValidation.valid) {
        // Session expiry is already handled by AuthService callback
        // Just update local state
        LoggingService.profileWarn('Token validation failed - session handled by AuthService');
        setLoading(false);
        return;
      }

      // Token is valid, fetch profile from API
      LoggingService.profileInfo('Tokens valid - fetching profile from API');
      setIsUserLoggedIn(true);
      await fetchProfileFromAPI();
      
    } catch (error) {
      LoggingService.profileError('Error during session check', {
        errorMessage: error.message,
        errorName: error.name
      });
      
      // Error handling is now managed by AuthService
      setLoading(false);
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
      
      const adminStatus = await checkAdminStatus(userData.email);
      const enhancedProfile = { ...userData };
      
      if (adminStatus.isAdmin) {
        LoggingService.profileInfo('User is admin - auto-verifying email', {
          email: userData.email,
          originalEmailVerified: userData.emailVerified
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
          email: userData.email,
          emailVerified: userData.emailVerified
        });
        
        enhancedProfile.isAdmin = false;
        enhancedProfile.userRole = 'user';
      }
      
      return enhancedProfile;
      
    } catch (error) {
      LoggingService.profileError('Error enhancing profile with admin status', error);
      return userData;
    }
  };

  const fetchProfileFromAPI = async () => {
    try {
      LoggingService.profileInfo('=== FETCHING PROFILE FROM API USING CONFIGSERVICE ===');
      
      const result = await ProfileAPI.getProfile();
      
      LoggingService.profileDebug('API call completed', {
        success: result.success,
        hasData: !!result.data,
        message: result.message
      });
      
      if (result.success && result.data) {
        LoggingService.profileInfo('Profile data received, enhancing with admin status', {
          profileId: result.data._id,
          profileName: result.data.name,
          profileEmail: result.data.email,
          profileImage: result.data.profile_image
        });
        
        const enhancedProfile = await enhanceUserProfileWithAdminStatus(result.data);
        
        LoggingService.profileInfo('Setting enhanced user profile', {
          profileId: enhancedProfile._id,
          profileName: enhancedProfile.name,
          isAdmin: enhancedProfile.isAdmin,
          emailVerified: enhancedProfile.emailVerified,
          userRole: enhancedProfile.userRole
        });
        
        setUserProfile(enhancedProfile);
        
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
          LoggingService.profileDebug('Enhanced profile saved to local storage successfully');
        } catch (saveError) {
          LoggingService.profileError('Failed to save profile to local storage', saveError);
        }
        
      } else {
        // Check if the error is due to session expiry (401 status)
        if (result.status === 401) {
          LoggingService.profileWarn('API returned 401 - session will be handled by AuthService');
          return; // AuthService callback will handle this
        }
        
        LoggingService.profileError('API returned failure or no data', {
          success: result.success,
          message: result.message
        });
        
        Alert.alert('Error', result.message || 'Failed to load profile');
        await loadLocalUserProfile();
      }
    } catch (error) {
      LoggingService.profileError('Error during API fetch', {
        errorMessage: error.message,
        errorName: error.name
      });
      
      // Check if error indicates session expiry
      if (error.message && error.message.includes('401')) {
        // AuthService callback will handle this
        return;
      }
      
      Alert.alert('Error', 'Failed to load profile from server. Loading local data.');
      await loadLocalUserProfile();
    } finally {
      LoggingService.profileInfo('Profile fetch process completed');
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
        <View style={styles.emailContainer}>
          <Text style={styles.userEmail}>{userProfile.email}</Text>
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
          {renderInfoRow('Email Address', userProfile.email, 'email')}
          {renderInfoRow('Address', userProfile.address, 'location-on')}
        </View>
        
        {/* Location Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location Details</Text>
          {renderInfoRow('Pincode', userProfile.pincode, 'pin-drop')}
          {renderInfoRow('City', userProfile.city, 'location-city')}
          {renderInfoRow('State', userProfile.state, 'public')}
        </View>

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