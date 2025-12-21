import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import ApiService from '../services/ApiService';
import ConfigService from '../services/ConfigService';
import EncryptedStorage from 'react-native-encrypted-storage';

// Enhanced JWT decode import with better fallback handling
let jwtDecode;
try {
  jwtDecode = require('jwt-decode').default;
} catch (e1) {
  try {
    const { jwtDecode: jwtDecodeNamed } = require('jwt-decode');
    jwtDecode = jwtDecodeNamed;
  } catch (e2) {
    try {
      jwtDecode = require('jwt-decode');
    } catch (e3) {
      console.error('Failed to import jwt-decode:', e3);
      jwtDecode = null;
    }
  }
}

class AuthService {
  static tokenKey = 'jwt_token';
  static refreshTokenKey = 'refresh_token';
  
  // Add session expiry callback
  static sessionExpiryCallback = null;
  
  // Method to set session expiry callback
  static setSessionExpiryCallback(callback) {
    this.sessionExpiryCallback = callback;
  }
  
  // ✅ MERGED: Method to trigger session expiry with soft/hard options
  static async triggerSessionExpiry(forceLogout = false) {
    console.log('🔥 Session expiry triggered, forceLogout:', forceLogout);
    
    // If not forced, just clear tokens but keep user logged in with cached data
    if (!forceLogout) {
      console.log('⚠️ Soft session expiry - keeping cached data');
      
      // Clear only the tokens, not the user data
      try {
        await AsyncStorage.multiRemove([
          this.tokenKey,
          this.refreshTokenKey,
        ]);
        console.log('✅ Expired tokens cleared, user data preserved');
      } catch (error) {
        console.error('❌ Error clearing expired tokens:', error);
      }
      
      // Mark session as needing renewal
      await AsyncStorage.setItem('sessionNeedsRenewal', 'true');
      
      return; // Don't call the callback - user can continue with cached data
    }
    
    // Full logout only if forced
    console.log('🚨 FORCED logout - clearing all data');
    await this.clearTokens();
    
    if (this.sessionExpiryCallback && typeof this.sessionExpiryCallback === 'function') {
      console.log('📞 Calling session expiry callback');
      this.sessionExpiryCallback();
    }
  }

  // ✅ MERGED: Check if session needs renewal
  static async doesSessionNeedRenewal() {
    try {
      const needsRenewal = await AsyncStorage.getItem('sessionNeedsRenewal');
      return needsRenewal === 'true';
    } catch (error) {
      console.error('Error checking session renewal status:', error);
      return false;
    }
  }

  // ✅ MERGED: Mark session as renewed (call after successful login)
  static async markSessionAsRenewed() {
    try {
      await AsyncStorage.removeItem('sessionNeedsRenewal');
      console.log('✅ Session marked as renewed');
    } catch (error) {
      console.error('Error marking session as renewed:', error);
    }
  }

  // Initialize the auth service
  static async initialize() {
    await ConfigService.initializeConfig();
    console.log('✅ AuthService initialized');
  }

  // Store token
  static async saveToken(token) {
    try {
      await AsyncStorage.setItem(this.tokenKey, token);
      console.log('✅ Token saved successfully');
    } catch (error) {
      console.error('❌ Error saving token:', error);
    }
  }

  // Store refresh token
  static async saveRefreshToken(refreshToken) {
    try {
      await AsyncStorage.setItem(this.refreshTokenKey, refreshToken);
      console.log('✅ Refresh token saved successfully');
    } catch (error) {
      console.error('❌ Error saving refresh token:', error);
    }
  }

  // Get token
  static async getToken() {
    try {
      return await AsyncStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('❌ Error getting token:', error);
      return null;
    }
  }

  // Get refresh token
  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(this.refreshTokenKey);
    } catch (error) {
      console.error('❌ Error getting refresh token:', error);
      return null;
    }
  }

  // Clear all tokens
  static async clearTokens() {
    try {
      await AsyncStorage.multiRemove([
        this.tokenKey,
        this.refreshTokenKey,
        'userData',
        'isLoggedin',
        'sessionNeedsRenewal' // Also clear the renewal flag
      ]);
      global.isUserLoggedin = false;
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  // Login method
  static async loginUser(email, password) {
    try {
      console.log('🔄 Attempting login for:', email);

      const endpoints = await ConfigService.getApiEndpoints();
      const result = await ApiService.post(
        endpoints.auth.login,
        {
          email: email.trim().toLowerCase(),
          password: password,
        }
      );

      if (result.success) {
        const body = result.data;
        console.log('🔍 Full login response:', JSON.stringify(body, null, 2));

        const accessToken = body.accessToken;
        const refreshToken = body.refreshToken;

        console.log('🔑 Extracted tokens:', {
          accessToken: accessToken ? 'Present' : 'Missing',
          refreshToken: refreshToken ? 'Present' : 'Missing'
        });

        if (!accessToken) {
          console.error('❌ No access token found in response');
          return {
            success: false,
            message: 'Access token not found in response',
          };
        }

        // Save tokens to AsyncStorage
        await this.saveToken(accessToken);
        console.log('💾 Access token saved');

        if (refreshToken) {
          await this.saveRefreshToken(refreshToken);
          console.log('💾 Refresh token saved');
        }

        // ✅ IMPORTANT: Mark session as renewed after successful login
        await this.markSessionAsRenewed();

        // Save login status and user data
        await AsyncStorage.setItem('isLoggedin', 'TRUE');
        const userData = body.user || body.data || body;
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
        global.isUserLoggedin = true;

        console.log('✅ Login successful');
        return {
          success: true,
          token: accessToken,
          refreshToken: refreshToken,
          message: body.message || 'Login successful',
          user: userData,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Login failed',
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // Register user
  static async registerUser(userData) {
    try {
      console.log('AuthService: Attempting registration for email:', userData.email);

      const endpoints = await ConfigService.getApiEndpoints();
      const result = await ApiService.post(endpoints.auth.register, userData);

      if (result.success) {
        return {
          success: true,
          message: result.data.message || 'Registration successful',
          data: result.data,
        };
      } else {
        return {
          success: false,
          message: result.message || 'Registration failed',
          errors: result.error?.errors || null,
        };
      }
    } catch (error) {
      console.error('AuthService: Registration error:', error);
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // Get headers with proper authorization format
  static async getAuthHeaders() {
    const token = await this.getToken();
    console.log('🔑 Getting auth headers:', {
      hasToken: !!token,
      tokenLength: token?.length || 0
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔐 Authorization header added');
    } else {
      console.warn('⚠️ No token available for auth headers');
    }

    return headers;
  }

  // ✅ MERGED: Refresh token method with soft expiry
 // ✅ REPLACE refreshAccessToken in AuthService.js
static async refreshAccessToken(refreshToken) {
  try {
    console.log('🔄 Attempting to refresh access token');

    const endpoints = await ConfigService.getApiEndpoints();
    
    // Get user email and leader mobile for refresh request
    let userEmail = '';
    let leaderMobile = '';
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsed = JSON.parse(userData);
        userEmail = parsed.email || parsed.user_email_id || '';
      }
      leaderMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '7702000725';
    } catch (e) {
      console.error('Error getting user data for refresh:', e);
      leaderMobile = '7702000725';
    }

    const result = await ApiService.post(
      endpoints.auth.refreshToken,
      {
        leader_regd_mobile_no: leaderMobile,
        user_email_id: userEmail,
        refresh_token: refreshToken
      }
    );

    if (result.success && (result.data.accessToken || result.data.token)) {
      const newAccessToken = result.data.accessToken || result.data.token;
      const newRefreshToken = result.data.refreshToken || refreshToken;
      
      console.log('✅ Token refresh successful');
      
      // Save new tokens
      await this.saveToken(newAccessToken);
      if (newRefreshToken) {
        await this.saveRefreshToken(newRefreshToken);
      }
      
      // Mark session as renewed after successful refresh
      await this.markSessionAsRenewed();
      
      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } else {
      console.error('❌ Token refresh failed:', result.message);
      
      // ✅ CRITICAL: Check if refresh token expired
      if (result.status === 401) {
        console.log('🔴 REFRESH TOKEN EXPIRED - Force logout required');
        // Trigger HARD logout when refresh token expires
        await this.triggerSessionExpiry(true); // ✅ CHANGED: Force logout
      } else {
        // Soft expiry for other errors
        await this.triggerSessionExpiry(false);
      }
      
      throw new Error(result.message || 'Token refresh failed');
    }
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    
    // ✅ CHANGED: Always force logout on refresh token errors
    await this.triggerSessionExpiry(true); // ✅ Force logout
    
    return null;
  }
}

  // ✅ MERGED: Validate and refresh token (no change needed - already correct)
  static async validateAndRefreshToken() {
    try {
      const token = await this.getToken();

      if (!token) {
        console.log('❌ No access token found');
        return { valid: false, expired: false, reason: 'No access token' };
      }

      // If jwt-decode is not available, assume token is valid
      if (!jwtDecode) {
        console.log('⚠️ jwt-decode not available, assuming token is valid');
        return { valid: true, expired: false, reason: 'Token assumed valid' };
      }

      try {
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        const isExpired = decodedToken.exp < currentTime;

        console.log('🕒 Token expiry check:', {
          currentTime,
          tokenExp: decodedToken.exp,
          isExpired
        });

        if (isExpired) {
          console.log('⏰ Access token expired, attempting refresh');
          const refreshToken = await this.getRefreshToken();

          if (!refreshToken) {
            console.log('❌ No refresh token found');
            await this.triggerSessionExpiry(false); // Soft expiry
            return { valid: false, expired: true, reason: 'No refresh token' };
          }

          console.log('🔄 Attempting to refresh access token');
          const newTokens = await this.refreshAccessToken(refreshToken);
          if (newTokens) {
            console.log('✅ Successfully refreshed tokens');
            await this.saveToken(newTokens.accessToken);
            if (newTokens.refreshToken) {
              await this.saveRefreshToken(newTokens.refreshToken);
            }
            return { valid: true, expired: false, reason: 'Token refreshed' };
          } else {
            console.log('❌ Token refresh failed');
            return { valid: false, expired: true, reason: 'Token refresh failed' };
          }
        }

        console.log('✅ Access token is valid');
        return { valid: true, expired: false, reason: 'Token valid' };
      } catch (decodeError) {
        console.error('❌ Error decoding token:', decodeError);
        return { valid: true, expired: false, reason: 'Token decode failed, assumed valid' };
      }
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return { valid: true, expired: false, reason: 'Validation error, assumed valid' };
    }
  }

  // Validate token by making an API call
  static async validateTokenWithAPI(token) {
    try {
      console.log('🔍 Validating token with API call');
      
      const endpoints = await ConfigService.getApiEndpoints();
      const result = await ApiService.authGet(endpoints.user.profile);

      if (result.success) {
        console.log('✅ Token is valid (API validation)');
        return { valid: true, expired: false, reason: 'Token valid via API' };
      } else if (result.status === 401) {
        console.log('❌ Token is invalid/expired (API validation)');
        await this.triggerSessionExpiry(false); // Soft expiry
        return { valid: false, expired: true, reason: 'Token invalid via API' };
      } else {
        console.log('⚠️ API validation inconclusive, assuming token is valid');
        return { valid: true, expired: false, reason: 'API validation inconclusive' };
      }
    } catch (error) {
      console.error('❌ Error validating token with API:', error);
      await this.triggerSessionExpiry(false); // Soft expiry
      return { valid: false, expired: true, reason: 'API validation failed' };
    }
  }

  // Authenticated request with better error handling
  static async authenticatedRequest(url, options = {}) {
    try {
      return await ApiService.authenticatedRequest(url, options);
    } catch (error) {
      console.error('❌ Authenticated request error:', error);
      
      if (error.message && (error.message.includes('401') || error.message.includes('session'))) {
        await this.triggerSessionExpiry(false); // Soft expiry
      }
      
      throw error;
    }
  }

  // ✅ MERGED: Logout with correct request structure
  static async logout() {
    try {
      console.log('🔄 Starting logout process...');
      
      const refreshToken = await this.getRefreshToken();
      const accessToken = await this.getToken();
      
      if (refreshToken && accessToken) {
        try {
          let userEmail = '';
          try {
            userEmail = await AsyncStorage.getItem('userEmail');
            if (!userEmail) {
              const userData = await AsyncStorage.getItem('userData');
              if (userData) {
                const parsed = JSON.parse(userData);
                userEmail = parsed.email || parsed.user_email_id || '';
              }
            }
          } catch (e) {
            console.error('Error getting user email:', e);
          }
          
          let leaderMobile = '';
          try {
            leaderMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '7702000725';
          } catch (e) {
            console.warn('Could not get owner mobile:', e);
            leaderMobile = '7702000725';
          }
          
          let appKey = '';
          try {
            appKey = await EncryptedStorage.getItem('APP_KEY') || '';
          } catch (e) {
            console.error('Could not get APP_KEY:', e);
          }
          
          console.log('📞 Calling logout API...');
          
          const endpoints = await ConfigService.getApiEndpoints();
          
          const requestBody = {
            leader_regd_mobile_no: leaderMobile,
            user_email_id: userEmail,
            refresh_token: refreshToken
          };
          
          const response = await fetch(endpoints.auth.logout, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'x-app-key': appKey
            },
            body: JSON.stringify(requestBody)
          });

          const responseData = await response.json();
          console.log('📥 Logout response:', responseData);

          if (response.ok) {
            console.log('✅ Logout successful - refresh token removed from database');
          } else {
            console.log('⚠️ Server logout failed:', responseData.message);
          }
        } catch (apiError) {
          console.error('❌ Logout API error:', apiError);
        }
      }

      // Always clear local tokens
      await this.clearTokens();
      console.log('✅ Local tokens cleared');

      return { success: true, message: 'Logout successful' };
    } catch (error) {
      console.error('❌ Logout error:', error);
      await this.clearTokens();
      return { success: false, message: 'Logout completed with errors' };
    }
  }

  // Check and handle session
  static async checkAndHandleSession(navigation) {
    try {
      const tokenStatus = await this.validateAndRefreshToken();
      if (!tokenStatus.valid) {
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session check error:', error);
      await this.triggerSessionExpiry(false); // Soft expiry
      return false;
    }
  }

  static async isAuthenticated() {
    try {
      const tokenStatus = await this.validateAndRefreshToken();
      return tokenStatus.valid;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  static async getCurrentUser() {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        return JSON.parse(userData);
      }

      return await this.getUserFromToken();
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  static async getUserFromToken() {
    try {
      const token = await this.getToken();
      if (!token) return null;

      if (!jwtDecode) {
        console.log('jwt-decode not available, cannot decode token');
        return null;
      }

      const decodedToken = jwtDecode(token);
      return decodedToken;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  static async updateProfile(profileData, isFormData = false) {
    try {
      const endpoints = await ConfigService.getApiEndpoints();
      
      let result;
      if (isFormData) {
        result = await ApiService.uploadFile(endpoints.user.updateProfile, profileData);
      } else {
        result = await ApiService.authPut(endpoints.user.updateProfile, profileData);
      }

      if (result.success) {
        await AsyncStorage.setItem('userData', JSON.stringify(result.data.user || result.data.data || {}));
        return {
          success: true,
          message: result.data.message || 'Profile updated successfully',
          data: result.data.user || result.data.data || {},
        };
      } else {
        return {
          success: false,
          message: result.message || 'Profile update failed',
          errors: result.error?.errors || null,
        };
      }
    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
        error: error.message,
      };
    }
  }
}

export default AuthService;