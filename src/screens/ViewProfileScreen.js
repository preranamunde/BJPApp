import React, { useState, useEffect } from 'react';
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

  // Profile-specific methods
  static profileDebug(message, data) { this.debug('PROFILE', message, data); }
  static profileInfo(message, data) { this.info('PROFILE', message, data); }
  static profileWarn(message, data) { this.warn('PROFILE', message, data); }
  static profileError(message, data) { this.error('PROFILE', message, data); }
}

// Image Service for handling image URLs
class ImageService {
  static baseUrls = [
    'http://192.168.1.104:5000/',
    'http://localhost:5000/',
    'http://10.0.2.2:5000/', // Android emulator
  ];
  
  static async testImageUrl(imageUrl) {
    try {
      LoggingService.profileDebug('🧪 Testing image URL accessibility', { url: imageUrl });
      
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
    if (!relativePath) return null;
    
    // Clean the path - handle both Windows and Unix separators
    const cleanPath = relativePath
      .replace(/\\/g, '/')
      .replace(/^\/+|\/+$/g, '');
    
    LoggingService.profileDebug('Cleaning image path', {
      original: relativePath,
      cleaned: cleanPath
    });
    
    for (const baseUrl of this.baseUrls) {
      const fullUrl = `${baseUrl}${cleanPath}`;
      const isAccessible = await this.testImageUrl(fullUrl);
      
      if (isAccessible) {
        LoggingService.profileInfo('✅ Found working image URL', { url: fullUrl });
        return fullUrl;
      }
    }
    
    LoggingService.profileWarn('❌ No accessible image URL found for path', { relativePath });
    return null;
  }
  
  static constructImageUrl(imagePath, baseUrl = 'http://192.168.1.104:5000/') {
    if (!imagePath) return null;
    
    // If already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Clean path and construct URL
    const cleanPath = imagePath.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const finalUrl = `${baseUrl}${cleanPath}`;
    
    LoggingService.profileDebug('Constructing image URL', {
      originalPath: imagePath,
      baseUrl: baseUrl,
      finalUrl: finalUrl
    });
    
    return finalUrl;
  }
}

// Enhanced Admin Service for handling admin verification
class AdminService {
  static async checkIfUserIsAdmin(userEmail) {
    try {
      LoggingService.profileInfo('🔍 Checking if user is admin', { userEmail });
      
      // Get AppOwnerInfo from encrypted storage
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      
      if (!appOwnerInfoStr) {
        LoggingService.profileWarn('⚠️ No AppOwnerInfo found in storage');
        return { isAdmin: false, ownerEmail: null };
      }
      
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      
      // Extract owner email from different possible fields
      const ownerEmail = appOwnerInfo.emailid || appOwnerInfo.email || appOwnerInfo.email_id;
      
      LoggingService.profileDebug('Owner email comparison', {
        userEmail: userEmail?.toLowerCase(),
        ownerEmail: ownerEmail?.toLowerCase(),
        appOwnerInfoKeys: Object.keys(appOwnerInfo)
      });
      
      if (!ownerEmail) {
        LoggingService.profileWarn('⚠️ No owner email found in AppOwnerInfo');
        return { isAdmin: false, ownerEmail: null };
      }
      
      // Compare emails (case-insensitive)
      const isAdmin = userEmail?.toLowerCase() === ownerEmail?.toLowerCase();
      
      LoggingService.profileInfo(`${isAdmin ? '👑' : '👤'} Admin check result`, {
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
      LoggingService.profileError('❌ Error checking admin status', {
        error: error.message,
        userEmail
      });
      return { isAdmin: false, ownerEmail: null };
    }
  }
  
  static async getUserRoleInfo(userEmail) {
    try {
      const adminCheck = await this.checkIfUserIsAdmin(userEmail);
      
      // Also check stored user role for additional verification
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
      LoggingService.profileError('❌ Error getting user role info', error);
      return {
        isAdmin: false,
        userRole: 'user',
        storedRole: 'user',
        ownerEmail: null
      };
    }
  }
}

// Enhanced Profile API Class
class ProfileAPI {
  static baseURL = 'http://192.168.1.104:5000/api/profile';
  static imageBaseURL = 'http://192.168.1.104:5000/';

  static async getProfile() {
    LoggingService.profileInfo('🚀 Starting profile fetch from API');
    
    try {
      // Get proper auth headers
      const headers = await AuthService.getAuthHeaders();
      
      LoggingService.profileDebug('Auth headers prepared', { 
        hasAuthorization: !!headers.Authorization,
        authorizationPreview: headers.Authorization ? `${headers.Authorization.slice(0, 20)}...` : 'Missing',
        contentType: headers['Content-Type']
      });

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

      const response = await fetch(this.baseURL, {
        method: 'GET',
        headers: headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      LoggingService.profileDebug('API Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      // Handle different response types
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        LoggingService.profileError('Non-JSON response received', {
          contentType,
          responseText: text.substring(0, 500) // First 500 chars
        });
        
        // Try to parse as JSON anyway
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          return {
            success: false,
            message: 'Server returned invalid response format',
          };
        }
      }
      
      LoggingService.profileDebug('Raw API response data', {
        status: response.status,
        ok: response.ok,
        dataKeys: data ? Object.keys(data) : [],
        dataStructure: data,
        hasFormattedData: !!data?.formattedData,
        hasUser: !!data?.user,
        hasData: !!data?.data
      });

      if (response.ok) {
        // Handle the correct response structure from your API
        let userData;
        
        // Check different possible response structures
        if (data.formattedData) {
          userData = data.formattedData;
          LoggingService.profileDebug('✅ Using formattedData structure', { userData });
        } else if (data.user) {
          userData = data.user;
          LoggingService.profileDebug('✅ Using user structure', { userData });
        } else if (data.data) {
          userData = data.data;
          LoggingService.profileDebug('✅ Using data structure', { userData });
        } else if (data._id || data.email) {
          // Direct user object (fallback)
          userData = data;
          LoggingService.profileDebug('✅ Using direct data structure', { userData });
        } else {
          LoggingService.profileError('❌ No user data found in response', { data });
          return {
            success: false,
            message: 'No profile data found in server response',
          };
        }

        // Better image URL handling
        if (userData.profile_image) {
          const workingImageUrl = await ImageService.getWorkingImageUrl(userData.profile_image);
          
          if (workingImageUrl) {
            userData.profile_image = workingImageUrl;
            LoggingService.profileInfo('✅ Profile image URL resolved', { url: workingImageUrl });
          } else {
            // Fallback: try direct construction
            userData.profile_image = ImageService.constructImageUrl(userData.profile_image, this.imageBaseURL);
            LoggingService.profileWarn('⚠️ Using fallback image URL', { url: userData.profile_image });
          }
        }

        LoggingService.profileInfo('✅ Profile fetch successful', {
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
        // Better error handling for different status codes
        let errorMessage = 'Failed to fetch profile';
        
        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please login again.';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view this profile.';
        } else if (response.status === 404) {
          errorMessage = 'Profile not found.';
        } else if (response.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.message || data.error || errorMessage;
        }
        
        LoggingService.profileError('❌ Profile fetch failed - Server error', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
          fullResponse: data
        });
        
        return {
          success: false,
          message: errorMessage,
          status: response.status
        };
      }
    } catch (error) {
      // Better error categorization
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error.message.includes('Network request failed')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('Authentication failed')) {
        errorMessage = 'Authentication failed. Please login again.';
      }
      
      LoggingService.profileError('💥 Profile API network error', {
        errorMessage: error.message,
        errorName: error.name,
        errorStack: error.stack
      });
      
      return {
        success: false,
        message: errorMessage,
      };
    }
  }
}

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

  useEffect(() => {
    LoggingService.profileInfo('🔄 ViewProfileScreen mounted, starting session check');
    checkSessionAndLoadProfile();
    
    // Check if user just registered
    if (route?.params?.justRegistered) {
      LoggingService.profileInfo('👤 User just registered flag detected');
      setJustRegistered(true);
    }
  }, []);

  const checkAdminStatus = async (userEmail) => {
    try {
      LoggingService.profileInfo('🔍 === CHECKING ADMIN STATUS ===');
      
      if (!userEmail) {
        LoggingService.profileWarn('⚠️ No user email provided for admin check');
        return { isAdmin: false };
      }

      const roleInfo = await AdminService.getUserRoleInfo(userEmail);
      
      LoggingService.profileInfo(`${roleInfo.isAdmin ? '👑' : '👤'} Admin status determined`, {
        userEmail: userEmail,
        isAdmin: roleInfo.isAdmin,
        userRole: roleInfo.userRole,
        ownerEmail: roleInfo.ownerEmail
      });

      setIsAdmin(roleInfo.isAdmin);
      setAdminInfo(roleInfo);
      
      return roleInfo;
      
    } catch (error) {
      LoggingService.profileError('❌ Error checking admin status', error);
      setIsAdmin(false);
      setAdminInfo(null);
      return { isAdmin: false };
    }
  };

  const enhanceUserProfileWithAdminStatus = async (userData) => {
    try {
      LoggingService.profileInfo('🔧 === ENHANCING PROFILE WITH ADMIN STATUS ===');
      
      const adminStatus = await checkAdminStatus(userData.email);
      
      // Clone userData to avoid mutations
      const enhancedProfile = { ...userData };
      
      // If user is admin, automatically set email as verified
      if (adminStatus.isAdmin) {
        LoggingService.profileInfo('👑 User is admin - auto-verifying email', {
          email: userData.email,
          originalEmailVerified: userData.emailVerified
        });
        
        enhancedProfile.emailVerified = true;
        enhancedProfile.isAdmin = true;
        enhancedProfile.userRole = 'admin';
        
        // Add admin-specific info if available
        if (adminStatus.appOwnerInfo) {
          enhancedProfile.adminInfo = {
            ownerEmail: adminStatus.ownerEmail,
            mobile: adminStatus.appOwnerInfo.mobile_no || adminStatus.appOwnerInfo.mobile_number,
            // Add other owner info if needed
          };
        }
        
        LoggingService.profileInfo('✅ Profile enhanced for admin user', {
          emailVerified: enhancedProfile.emailVerified,
          isAdmin: enhancedProfile.isAdmin,
          userRole: enhancedProfile.userRole
        });
      } else {
        LoggingService.profileInfo('👤 Regular user - keeping original email verification status', {
          email: userData.email,
          emailVerified: userData.emailVerified
        });
        
        enhancedProfile.isAdmin = false;
        enhancedProfile.userRole = 'user';
      }
      
      return enhancedProfile;
      
    } catch (error) {
      LoggingService.profileError('❌ Error enhancing profile with admin status', error);
      // Return original data if enhancement fails
      return userData;
    }
  };

  const checkSessionAndLoadProfile = async () => {
    try {
      LoggingService.profileInfo('🔍 === STARTING SESSION CHECK ===');
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
        LoggingService.profileWarn('❌ User not logged in - showing login required screen');
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
        LoggingService.profileWarn('⚠️ No tokens found');
        
        // Special case: If user just registered, they might not have JWT tokens yet
        if (justRegistered) {
          LoggingService.profileInfo('🆕 User just registered, attempting local profile load');
          setIsUserLoggedIn(true);
          await loadLocalUserProfile();
          return;
        }
        
        LoggingService.profileWarn('🔐 User needs to login');
        setIsUserLoggedIn(false);
        setLoading(false);
        return;
      }

      // Validate JWT token
      LoggingService.profileDebug('🔑 Starting token validation');
      const tokenValidation = await AuthService.validateAndRefreshToken();
      LoggingService.profileDebug('Token validation result', tokenValidation);
      
      if (!tokenValidation.valid) {
        if (tokenValidation.expired) {
          LoggingService.profileWarn('⏰ Tokens expired - showing session expired screen');
          setSessionExpired(true);
          setIsUserLoggedIn(false);
        } else {
          LoggingService.profileWarn('❌ Token validation failed - user not logged in');
          setIsUserLoggedIn(false);
        }
        setLoading(false);
        return;
      }

      // Token is valid, fetch profile from API
      LoggingService.profileInfo('✅ Tokens valid - fetching profile from API');
      setIsUserLoggedIn(true);
      await fetchProfileFromAPI();
      
    } catch (error) {
      LoggingService.profileError('💥 Error during session check', {
        errorMessage: error.message,
        errorName: error.name
      });
      setIsUserLoggedIn(false);
      setLoading(false);
    }
  };

  const fetchProfileFromAPI = async () => {
    try {
      LoggingService.profileInfo('📡 === FETCHING PROFILE FROM API ===');
      
      const result = await ProfileAPI.getProfile();
      
      LoggingService.profileDebug('API call completed', {
        success: result.success,
        hasData: !!result.data,
        message: result.message
      });
      
      if (result.success && result.data) {
        LoggingService.profileInfo('✅ Profile data received, enhancing with admin status', {
          profileId: result.data._id,
          profileName: result.data.name,
          profileEmail: result.data.email,
          profileImage: result.data.profile_image
        });
        
        // Enhance profile with admin status and email verification logic
        const enhancedProfile = await enhanceUserProfileWithAdminStatus(result.data);
        
        LoggingService.profileInfo('✅ Setting enhanced user profile', {
          profileId: enhancedProfile._id,
          profileName: enhancedProfile.name,
          isAdmin: enhancedProfile.isAdmin,
          emailVerified: enhancedProfile.emailVerified,
          userRole: enhancedProfile.userRole
        });
        
        setUserProfile(enhancedProfile);
        
        // Also save enhanced profile to local storage for backup
        try {
          await AsyncStorage.setItem('userData', JSON.stringify(enhancedProfile));
          LoggingService.profileDebug('💾 Enhanced profile saved to local storage successfully');
        } catch (saveError) {
          LoggingService.profileError('Failed to save profile to local storage', saveError);
        }
        
      } else {
        LoggingService.profileError('❌ API returned failure or no data', {
          success: result.success,
          message: result.message
        });
        
        Alert.alert('Error', result.message || 'Failed to load profile');
        // Fallback to local storage if API fails
        await loadLocalUserProfile();
      }
    } catch (error) {
      LoggingService.profileError('💥 Error during API fetch', {
        errorMessage: error.message,
        errorName: error.name
      });
      Alert.alert('Error', 'Failed to load profile from server. Loading local data.');
      // Fallback to local storage
      await loadLocalUserProfile();
    } finally {
      LoggingService.profileInfo('🏁 Profile fetch process completed');
      setLoading(false);
    }
  };

  const loadLocalUserProfile = async () => {
    try {
      LoggingService.profileInfo('📂 Loading profile from local storage');
      
      const userData = await AsyncStorage.getItem('userData');
      LoggingService.profileDebug('Local storage data check', {
        hasData: !!userData,
        dataLength: userData?.length || 0
      });
      
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        // Fix image URL if it exists in local data
        if (parsedData.profile_image) {
          parsedData.profile_image = ImageService.constructImageUrl(parsedData.profile_image);
        }
        
        // Enhance local profile with admin status too
        const enhancedLocalProfile = await enhanceUserProfileWithAdminStatus(parsedData);
        
        LoggingService.profileInfo('✅ Local profile loaded and enhanced successfully', {
          profileId: enhancedLocalProfile._id || enhancedLocalProfile.id,
          profileName: enhancedLocalProfile.name,
          isAdmin: enhancedLocalProfile.isAdmin,
          emailVerified: enhancedLocalProfile.emailVerified,
          profileImage: enhancedLocalProfile.profile_image
        });
        setUserProfile(enhancedLocalProfile);
      } else {
        LoggingService.profileWarn('⚠️ No local profile data found');
      }
    } catch (error) {
      LoggingService.profileError('💥 Error loading local profile', {
        errorMessage: error.message,
        errorName: error.name
      });
    }
  };

  const handleSessionExpiredLogin = () => {
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please login again to continue.',
      [
        {
          text: 'OK',
          onPress: () => {
            AuthService.logout(navigation);
          },
        },
      ]
    );
  };

  const handleEditProfile = () => {
    LoggingService.profileInfo('✏️ Edit profile requested');
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
    LoggingService.profileInfo('🔐 Redirecting to login screen');
    navigation.navigate('Login');
  };

  const handleRefresh = () => {
    LoggingService.profileInfo('🔄 Manual refresh triggered');
    setImageError(false);
    checkSessionAndLoadProfile();
  };

  const renderProfileImage = () => {
    const imageUri = userProfile?.profile_image || userProfile?.photo;
    
    LoggingService.profileDebug('🖼️ Rendering profile image', {
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
              LoggingService.profileDebug('📡 Profile image loading started');
              setImageLoading(true);
            }}
            onLoad={() => {
              LoggingService.profileInfo('✅ Profile image loaded successfully', {
                uri: imageUri
              });
              setImageLoading(false);
              setImageError(false);
            }}
            onError={(error) => {
              LoggingService.profileError('❌ Profile image load failed', {
                uri: imageUri,
                error: error.nativeEvent?.error || 'Unknown error'
              });
              setImageLoading(false);
              setImageError(true);
            }}
            onLoadEnd={() => {
              LoggingService.profileDebug('🏁 Profile image load ended');
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
    
    LoggingService.profileWarn('📷 Showing profile image placeholder', {
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

  // Loading State
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading Profile...</Text>
      </View>
    );
  }

  // Session Expired State
  if (sessionExpired) {
    return (
      <View style={styles.sessionExpiredContainer}>
        <View style={styles.sessionExpiredContent}>
          <Icon name="access-time" size={80} color="#e16e2b" />
          
          <Text style={styles.sessionExpiredTitle}>⏰ Session Expired</Text>
          <Text style={styles.sessionExpiredMessage}>
            Your session has expired for security reasons. Please login again to continue using the app.
          </Text>
          
          <TouchableOpacity 
            style={styles.loginButton} 
            onPress={handleSessionExpiredLogin}
          >
            <Text style={styles.loginButtonText}>Login Again</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Not Logged In State
  if (!isUserLoggedIn) {
    return (
      <View style={styles.loginRequiredContainer}>
        <View style={styles.loginRequiredContent}>
          <Icon name="lock-outline" size={80} color="#e16e2b" />
          
          <Text style={styles.loginRequiredTitle}>🔒 Login Required</Text>
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
        
        {/* Account Status Section (New) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Status</Text>
          
          {/* User Role */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Icon 
                name={userProfile.isAdmin ? "admin-panel-settings" : "person"} 
                size={20} 
                color="#e16e2b" 
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account Type</Text>
              <Text style={[styles.infoValue, userProfile.isAdmin && styles.adminText]}>
                {userProfile.isAdmin ? 'Administrator (Owner)' : 'Standard User'}
              </Text>
            </View>
          </View>

          {/* Email Verification Status */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Icon 
                name={userProfile.emailVerified ? "verified" : "error"} 
                size={20} 
                color={userProfile.emailVerified ? "#4CAF50" : "#FF5722"} 
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email Verification</Text>
              <Text style={[styles.infoValue, 
                userProfile.emailVerified ? styles.verifiedText : styles.unverifiedText
              ]}>
                {userProfile.emailVerified 
                  ? (userProfile.isAdmin ? 'Verified (Auto - Admin)' : 'Verified') 
                  : 'Not Verified'
                }
              </Text>
            </View>
          </View>
        </View>

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
        
        {/* Account Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          {userProfile.createdAt && renderInfoRow(
            'Member Since', 
            new Date(userProfile.createdAt).toLocaleDateString('en-IN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }), 
            'calendar-today'
          )}
        </View>

        {/* Admin Information Section (Only for Admins) */}
        {userProfile.isAdmin && adminInfo && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.adminSectionTitle]}>
              👑 Administrator Information
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

        {/* Debug Information (Development Only) */}
        {__DEV__ && userProfile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Debug Info</Text>
            {renderInfoRow('User ID', userProfile._id, 'fingerprint')}
            {renderInfoRow('Image Path', userProfile.profile_image, 'image')}
            {renderInfoRow('Is Admin', userProfile.isAdmin ? 'Yes' : 'No', 'admin-panel-settings')}
            {renderInfoRow('Email Verified', userProfile.emailVerified ? 'Yes' : 'No', 'verified')}
            {renderInfoRow('User Role', userProfile.userRole, 'person')}
            
            <TouchableOpacity 
              style={styles.debugButton}
              onPress={() => {
                console.log('🔍 Full User Profile:', JSON.stringify(userProfile, null, 2));
                console.log('🔍 Admin Info:', JSON.stringify(adminInfo, null, 2));
                Alert.alert('Debug', 'Check console for full profile data');
              }}
            >
              <Text style={styles.debugButtonText}>Log Full Profile Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.debugButton}
              onPress={async () => {
                console.log('🧪 Testing Admin Check for current user...');
                const adminCheck = await AdminService.checkIfUserIsAdmin(userProfile.email);
                console.log('🧪 Admin Check Result:', adminCheck);
                Alert.alert(
                  'Admin Check Result',
                  `Is Admin: ${adminCheck.isAdmin}\nOwner Email: ${adminCheck.ownerEmail}`
                );
              }}
            >
              <Text style={styles.debugButtonText}>Test Admin Check</Text>
            </TouchableOpacity>
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
  sessionExpiredContainer: { flex: 1, backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center', padding: 20 },
  sessionExpiredContent: { backgroundColor: '#fff', borderRadius: 20, padding: 30, alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, width: '100%', maxWidth: 350 },
  sessionExpiredTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 20, marginBottom: 15, textAlign: 'center' },
  sessionExpiredMessage: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 25 },
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
  
  // New Admin Badge Style
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
  
  // New Admin Auto Verify Style
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