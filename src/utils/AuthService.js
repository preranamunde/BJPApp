import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Enhanced JWT decode import with better fallback handling
let jwtDecode;
try {
  // Method 1: Default import
  jwtDecode = require('jwt-decode').default;
} catch (e1) {
  try {
    // Method 2: Named import  
    const { jwtDecode: jwtDecodeNamed } = require('jwt-decode');
    jwtDecode = jwtDecodeNamed;
  } catch (e2) {
    try {
      // Method 3: Direct require
      jwtDecode = require('jwt-decode');
    } catch (e3) {
      console.error('Failed to import jwt-decode:', e3);
      // Fallback: Simple token validation without decoding
      jwtDecode = null;
    }
  }
}

class AuthService {
  static tokenKey = 'jwt_token';
  static refreshTokenKey = 'refresh_token';
  static baseURL = 'http://192.168.0.108:5000'; // Centralized base URL
  static loginUrl = `${this.baseURL}/api/auth/login`;
  static refreshTokenUrl = `${this.baseURL}/api/auth/refresh-token`;
  static logoutUrl = `${this.baseURL}/api/auth/logout`;

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
        'isLoggedin'
      ]);
      global.isUserLoggedin = false;
      console.log('✅ Tokens cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
    }
  }

  // ENHANCED: Login method with better response handling
  static async loginUser(email, password) {
    try {
      console.log('🔄 Attempting login for:', email);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      const response = await fetch(this.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log('Response status:', response.status);
      const responseText = await response.text();
      console.log('Response body:', responseText);

      if (response.status === 200) {
        const body = JSON.parse(responseText);
        console.log('🔍 Full login response:', JSON.stringify(body, null, 2));

        // FIXED: Extract tokens based on your Postman response structure
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
        const body = JSON.parse(responseText);
        return {
          success: false,
          message: body.message || `Login failed with status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('❌ Login error:', error);

      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout. Please try again.',
        };
      }

      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection and ensure the server is running.',
        };
      }

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // ENHANCED: Get headers with proper authorization format
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

  // ENHANCED: Refresh token method with proper body structure
  static async refreshAccessToken(refreshToken) {
    try {
      console.log('🔄 Attempting to refresh access token');

      const response = await fetch(this.refreshTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: refreshToken, // Based on your Postman collection structure
        }),
      });

      const data = await response.json();
      console.log('🔄 Refresh token response:', data);

      if (response.ok && (data.accessToken || data.token)) {
        const newAccessToken = data.accessToken || data.token;
        const newRefreshToken = data.refreshToken || refreshToken;
        
        console.log('✅ Token refresh successful');
        return {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        };
      } else {
        console.error('❌ Token refresh failed:', data.message);
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('❌ Error refreshing token:', error);
      return null;
    }
  }

  // ENHANCED: Validate and refresh token with better JWT handling
  static async validateAndRefreshToken() {
    try {
      const token = await this.getToken();

      if (!token) {
        console.log('❌ No access token found');
        return { valid: false, expired: false, reason: 'No access token' };
      }

      // If jwt-decode is not available, make a test API call to validate token
      if (!jwtDecode) {
        console.log('⚠️ jwt-decode not available, testing token with API call');
        return await this.validateTokenWithAPI(token);
      }

      try {
        // Check if token is expired
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        const isExpired = decodedToken.exp < (currentTime + 30); // 30 second buffer

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
            await this.clearTokens();
            return { valid: false, expired: true, reason: 'No refresh token' };
          }

          // Check if refresh token is expired
          try {
            const decodedRefreshToken = jwtDecode(refreshToken);
            const isRefreshExpired = decodedRefreshToken.exp < currentTime;

            if (isRefreshExpired) {
              console.log('❌ Refresh token also expired');
              await this.clearTokens();
              return { valid: false, expired: true, reason: 'Refresh token expired' };
            } else {
              // Try to refresh the access token
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
                await this.clearTokens();
                return { valid: false, expired: true, reason: 'Token refresh failed' };
              }
            }
          } catch (refreshTokenError) {
            console.log('❌ Error decoding refresh token:', refreshTokenError);
            await this.clearTokens();
            return { valid: false, expired: true, reason: 'Invalid refresh token' };
          }
        }

        console.log('✅ Access token is valid');
        return { valid: true, expired: false, reason: 'Token valid' };
      } catch (decodeError) {
        console.error('❌ Error decoding token:', decodeError);
        // If decoding fails, try API validation as fallback
        return await this.validateTokenWithAPI(token);
      }
    } catch (error) {
      console.error('❌ Error validating token:', error);
      return { valid: false, expired: true, reason: 'Validation error: ' + error.message };
    }
  }

  // NEW: Validate token by making an API call (fallback when jwt-decode isn't available)
  static async validateTokenWithAPI(token) {
    try {
      console.log('🔍 Validating token with API call');
      
      const response = await fetch(`${this.baseURL}/api/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        console.log('✅ Token is valid (API validation)');
        return { valid: true, expired: false, reason: 'Token valid via API' };
      } else if (response.status === 401) {
        console.log('❌ Token is invalid/expired (API validation)');
        return { valid: false, expired: true, reason: 'Token invalid via API' };
      } else {
        console.log('⚠️ API validation inconclusive, assuming token is valid');
        return { valid: true, expired: false, reason: 'API validation inconclusive' };
      }
    } catch (error) {
      console.error('❌ Error validating token with API:', error);
      // If API call fails, assume token is valid to avoid blocking the user
      return { valid: true, expired: false, reason: 'API validation failed, assuming valid' };
    }
  }

  // ENHANCED: Authenticated request with better error handling
  static async authenticatedRequest(url, options = {}) {
    try {
      // Validate token first and refresh if needed
      const tokenStatus = await this.validateAndRefreshToken();

      if (!tokenStatus.valid) {
        throw new Error('Authentication failed: ' + tokenStatus.reason);
      }

      const token = await this.getToken();

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      };

      console.log('📞 Making authenticated request to:', url);
      console.log('🔐 With headers:', {
        ...headers,
        Authorization: headers.Authorization ? `Bearer ***${headers.Authorization.slice(-10)}` : 'Missing'
      });

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 responses by attempting token refresh
      if (response.status === 401) {
        console.log('🔄 Got 401, attempting token refresh...');
        const refreshResult = await this.validateAndRefreshToken();
        
        if (refreshResult.valid) {
          console.log('✅ Token refreshed, retrying request');
          const newToken = await this.getToken();
          headers['Authorization'] = `Bearer ${newToken}`;
          
          return fetch(url, {
            ...options,
            headers,
          });
        } else {
          throw new Error('Authentication failed after token refresh attempt');
        }
      }

      return response;
    } catch (error) {
      console.error('❌ Authenticated request error:', error);
      throw error;
    }
  }

  // Rest of your existing methods remain the same...
  static async registerUser(userData) {
    try {
      console.log('AuthService: Attempting registration for email:', userData.email);

      const response = await fetch(`${this.baseURL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('AuthService: Registration response status:', response.status);

      const data = await response.json();
      console.log('AuthService: Registration response data:', data);

      if (response.ok) {
        return {
          success: true,
          message: data.message || 'Registration successful',
          data: data,
        };
      } else {
        return {
          success: false,
          message: data.message || data.error || 'Registration failed',
          errors: data.errors || null,
        };
      }
    } catch (error) {
      console.error('AuthService: Registration error:', error);

      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your connection and ensure the server is running.',
        };
      }

      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // ENHANCED: Logout with proper request body structure
  static async logout() {
    try {
      console.log('🔄 Starting logout process...');
      
      const refreshToken = await this.getRefreshToken();
      
      if (refreshToken) {
        try {
          console.log('📞 Calling logout API with refresh token...');
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 seconds timeout

          const response = await fetch(this.logoutUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({
              token: refreshToken, // Based on your Postman collection structure
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log('🔄 Logout API response status:', response.status);
          
          if (response.ok) {
            console.log('✅ Successfully logged out from server');
          } else {
            console.log('⚠️ Server logout failed, but continuing with local logout');
          }
        } catch (apiError) {
          console.log('❌ Logout API error (proceeding with local logout):', apiError.message);
        }
      } else {
        console.log('⚠️ No refresh token found, skipping API logout');
      }

      // Always clear local tokens regardless of API success/failure
      await this.clearTokens();
      console.log('✅ Local tokens cleared successfully');

      return {
        success: true,
        message: 'Logout successful'
      };
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Ensure tokens are cleared even if logout fails
      await this.clearTokens();
      
      return {
        success: false,
        message: 'Logout completed with errors',
        error: error.message
      };
    }
  }

  // Utility methods remain the same
  static async checkAndHandleSession(navigation) {
    try {
      const tokenStatus = await this.validateAndRefreshToken();
      if (!tokenStatus.valid) {
        await this.clearTokens();

        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                setTimeout(() => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                }, 0);
              }
            },
          ]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Session check error:', error);
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

      // Fallback to token data
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

      // If jwt-decode is not available, return null
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
      const url = `${this.baseURL}/api/profile`;

      const options = {
        method: isFormData ? 'POST' : 'PUT',
        headers: {
          // Do NOT set 'Content-Type' if FormData, let fetch handle it automatically
          ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        },
        body: isFormData ? profileData : JSON.stringify(profileData),
      };

      const response = await this.authenticatedRequest(url, options);
      const result = await response.json();

      if (response.ok) {
        await AsyncStorage.setItem('userData', JSON.stringify(result.user || result.data || {}));
        return {
          success: true,
          message: result.message || 'Profile updated successfully',
          data: result.user || result.data || {},
        };
      } else {
        return {
          success: false,
          message: result.message || 'Profile update failed',
          errors: result.errors || null,
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