import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Try different import methods for jwt-decode
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
  static loginUrl = 'http://192.168.1.100:5000/api/auth/login';
  static refreshTokenUrl = 'http://192.168.1.100:5000/api/auth/refresh-token';

  // Store token
  static async saveToken(token) {
    try {
      await AsyncStorage.setItem(this.tokenKey, token);
      console.log('Token saved successfully');
    } catch (error) {
      console.error('Error saving token:', error);
    }
  }

  // Store refresh token
  static async saveRefreshToken(refreshToken) {
    try {
      await AsyncStorage.setItem(this.refreshTokenKey, refreshToken);
      console.log('Refresh token saved successfully');
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  }

  // Get token
  static async getToken() {
    try {
      return await AsyncStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Get refresh token
  static async getRefreshToken() {
    try {
      return await AsyncStorage.getItem(this.refreshTokenKey);
    } catch (error) {
      console.error('Error getting refresh token:', error);
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
      console.log('Tokens cleared successfully');
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  // Check if token exists and is valid
  static async isTokenValid() {
    try {
      const token = await this.getToken();
      if (!token) {
        console.log('No token found');
        return false;
      }

      // If jwt-decode is not available, assume token is valid if it exists
      if (!jwtDecode) {
        console.log('jwt-decode not available, assuming token is valid');
        return true;
      }

      // Decode and check expiration
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const isExpired = decodedToken.exp < currentTime;
      
      console.log('Token expired:', isExpired);
      return !isExpired;
    } catch (error) {
      console.error('Error checking token validity:', error);
      // If decoding fails but token exists, assume it's valid
      return true;
    }
  }

  // Get user data from token
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

  // Login request - Updated to match your LoginScreen expectations
  static async loginUser(email, password) {
    try {
      console.log('Attempting login for:', email);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(this.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(), // Changed from username to email
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

        // Check different possible response structures
        let token = null;
        if (body.token) {
          token = body.token;
        } else if (body.access_token) {
          token = body.access_token;
        } else if (body.accessToken) {
          token = body.accessToken;
        } else if (body.data && body.data.token) {
          token = body.data.token;
        } else if (body.data && body.data.accessToken) {
          token = body.data.accessToken;
        }

        console.log('Response keys:', Object.keys(body));
        console.log('Found token:', !!token);

        if (token) {
          await this.saveToken(token);

          // Save refresh token if available
          const refreshToken = body.refresh_token || body.refreshToken || 
                             (body.data && (body.data.refresh_token || body.data.refreshToken));
          if (refreshToken) {
            await this.saveRefreshToken(refreshToken);
          }

          // Save user data and login status
          await AsyncStorage.setItem('isLoggedin', 'TRUE');
          await AsyncStorage.setItem('userData', JSON.stringify(body.user || body.data || {}));
          global.isUserLoggedin = true;

          return {
            success: true,
            token: token,
            message: body.message || 'Login successful',
            user: body.user || body.data || {}
          };
        } else {
          return {
            success: false,
            message: 'Token not found in response'
          };
        }
      } else if (response.status === 401) {
        const body = JSON.parse(responseText);
        return {
          success: false,
          message: body.message || 'Invalid email or password'
        };
      } else if (response.status === 422) {
        const body = JSON.parse(responseText);
        return {
          success: false,
          message: body.message || 'Validation failed'
        };
      } else {
        const body = JSON.parse(responseText);
        return {
          success: false,
          message: body.message || 'Login failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      
      if (error.name === 'AbortError') {
        return {
          success: false,
          message: 'Request timeout. Please try again.'
        };
      }
      
      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        return {
          success: false,
          message: 'Network error. Please check your internet connection and ensure the server is running.'
        };
      }
      
      return {
        success: false,
        message: 'An unexpected error occurred. Please try again.'
      };
    }
  }

  // Register new user - for compatibility with registration screen
  static async registerUser(userData) {
    try {
      console.log('AuthService: Attempting registration for email:', userData.email);
      
      const response = await fetch(`http://192.168.1.100:5000/api/auth/register`, {
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

  // Check session and redirect if needed
  static async checkAndHandleSession(navigation) {
    try {
      const isValid = await this.isTokenValid();
      if (!isValid) {
        await this.clearTokens();

        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              },
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

  // Logout
  static async logout(navigation) {
    try {
      // Try to logout from server (optional - may not exist)
      try {
        const token = await this.getToken();
        if (token) {
          await fetch(`http://192.168.1.100:5000/api/auth/logout`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
        }
      } catch (logoutError) {
        console.log('Server logout failed, proceeding with local logout:', logoutError);
      }

      await this.clearTokens();

      // Delay ensures tokens are actually cleared before next screen builds
      await new Promise(resolve => setTimeout(resolve, 300));

      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  }

  // Get headers with authorization
  static async getAuthHeaders() {
    const token = await this.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  // Refresh token method
  static async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch(this.refreshTokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshToken,
        }),
      });

      const data = await response.json();

      if (response.ok && data.accessToken) {
        return {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken || refreshToken,
        };
      } else {
        throw new Error(data.message || 'Token refresh failed');
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
  }

  // Validate and refresh token if needed
  static async validateAndRefreshToken() {
    try {
      const token = await this.getToken();
      
      if (!token) {
        console.log('No access token found');
        return { valid: false, expired: false, reason: 'No access token' };
      }

      // If jwt-decode is not available, assume token is valid
      if (!jwtDecode) {
        console.log('jwt-decode not available, assuming token is valid');
        return { valid: true, expired: false, reason: 'Token validation skipped (no jwt-decode)' };
      }

      // Check if token is expired
      const decodedToken = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      const isExpired = decodedToken.exp < (currentTime + 30); // 30 second buffer

      if (isExpired) {
        console.log('Access token expired, checking refresh token');
        const refreshToken = await this.getRefreshToken();
        
        if (!refreshToken) {
          console.log('No refresh token found');
          await this.clearTokens();
          return { valid: false, expired: true, reason: 'No refresh token' };
        }

        // Check if refresh token is expired
        try {
          const decodedRefreshToken = jwtDecode(refreshToken);
          const isRefreshExpired = decodedRefreshToken.exp < currentTime;

          if (isRefreshExpired) {
            console.log('Refresh token also expired');
            await this.clearTokens();
            return { valid: false, expired: true, reason: 'Refresh token expired' };
          } else {
            // Try to refresh the access token
            console.log('Attempting to refresh access token');
            const newTokens = await this.refreshAccessToken(refreshToken);
            if (newTokens) {
              console.log('Successfully refreshed tokens');
              await this.saveToken(newTokens.accessToken);
              if (newTokens.refreshToken) {
                await this.saveRefreshToken(newTokens.refreshToken);
              }
              return { valid: true, expired: false, reason: 'Token refreshed' };
            } else {
              console.log('Token refresh failed');
              await this.clearTokens();
              return { valid: false, expired: true, reason: 'Token refresh failed' };
            }
          }
        } catch (refreshTokenError) {
          console.log('Error decoding refresh token:', refreshTokenError);
          await this.clearTokens();
          return { valid: false, expired: true, reason: 'Invalid refresh token' };
        }
      }
      
      console.log('Access token is valid');
      return { valid: true, expired: false, reason: 'Token valid' };
    } catch (error) {
      console.error('Error validating token:', error);
      // If validation fails but token exists, assume it's valid for now
      const token = await this.getToken();
      if (token) {
        return { valid: true, expired: false, reason: 'Token validation error but token exists' };
      }
      return { valid: false, expired: true, reason: 'Validation error: ' + error.message };
    }
  }

  // Make authenticated API request
  static async authenticatedRequest(url, options = {}) {
    try {
      // Validate token first
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

      return fetch(url, {
        ...options,
        headers,
      });
    } catch (error) {
      console.error('Authenticated request error:', error);
      throw error;
    }
  }

  // Check if user is authenticated
  static async isAuthenticated() {
    try {
      const tokenStatus = await this.validateAndRefreshToken();
      return tokenStatus.valid;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  // Get current user data
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
}

export default AuthService;