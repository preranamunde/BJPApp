import ConfigService from './ConfigService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ApiService {
  static DEFAULT_TIMEOUT = 30000; // 30 seconds
  static RETRY_ATTEMPTS = 2;

  // Common headers
  static getCommonHeaders() {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // Get authorization headers
  static async getAuthHeaders() {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      const headers = this.getCommonHeaders();
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('🔐 Authorization header added');
      } else {
        console.warn('⚠️ No token available for auth headers');
      }

      return headers;
    } catch (error) {
      console.error('❌ Error getting auth headers:', error);
      return this.getCommonHeaders();
    }
  }

  // Generic request method with error handling and retry logic
  static async makeRequest(endpoint, options = {}, requiresAuth = false, retryCount = 0) {
    try {
      const {
        method = 'GET',
        body = null,
        headers = {},
        timeout = this.DEFAULT_TIMEOUT,
        isFormData = false,
      } = options;

      // Get appropriate headers
      const requestHeaders = requiresAuth 
        ? await this.getAuthHeaders()
        : this.getCommonHeaders();

      // Merge custom headers
      const finalHeaders = {
        ...requestHeaders,
        ...headers,
      };

      // Don't set Content-Type for FormData
      if (isFormData) {
        delete finalHeaders['Content-Type'];
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      console.log(`📞 Making ${method} request to:`, endpoint);
      console.log('📋 Request headers:', {
        ...finalHeaders,
        Authorization: finalHeaders.Authorization ? `Bearer ***${finalHeaders.Authorization.slice(-10)}` : 'Not set'
      });

      const requestOptions = {
        method,
        headers: finalHeaders,
        signal: controller.signal,
      };

      // Add body for non-GET requests
      if (body && method !== 'GET') {
        requestOptions.body = isFormData ? body : JSON.stringify(body);
      }

      const response = await fetch(endpoint, requestOptions);
      clearTimeout(timeoutId);

      console.log(`📨 Response status: ${response.status}`);

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let responseData;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (response.ok) {
        console.log('✅ Request successful');
        return {
          success: true,
          data: responseData,
          status: response.status,
          headers: response.headers,
        };
      } else {
        console.log('❌ Request failed:', responseData);
        return {
          success: false,
          error: responseData,
          status: response.status,
          message: responseData.message || `Request failed with status ${response.status}`,
        };
      }
    } catch (error) {
      console.error('❌ Request error:', error);

      // Handle specific error types
      if (error.name === 'AbortError') {
        return {
          success: false,
          error: 'Request timeout',
          message: 'Request timeout. Please try again.',
        };
      }

      if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
        // Retry logic for network errors
        if (retryCount < this.RETRY_ATTEMPTS) {
          console.log(`🔄 Retrying request (attempt ${retryCount + 1}/${this.RETRY_ATTEMPTS})`);
          await this.delay(1000 * (retryCount + 1)); // Progressive delay
          return this.makeRequest(endpoint, options, requiresAuth, retryCount + 1);
        }

        return {
          success: false,
          error: 'Network error',
          message: 'Network error. Please check your internet connection and ensure the server is running.',
        };
      }

      return {
        success: false,
        error: error.message,
        message: 'An unexpected error occurred. Please try again.',
      };
    }
  }

  // Authenticated request with token refresh capability
  static async authenticatedRequest(endpoint, options = {}) {
    try {
      // First attempt with current token
      let result = await this.makeRequest(endpoint, options, true);

      // If unauthorized, try to refresh token and retry
      if (!result.success && result.status === 401) {
        console.log('🔄 Got 401, attempting token refresh...');
        
        const refreshResult = await this.refreshToken();
        if (refreshResult.success) {
          console.log('✅ Token refreshed, retrying request');
          result = await this.makeRequest(endpoint, options, true);
        } else {
          console.log('❌ Token refresh failed');
          return {
            success: false,
            error: 'Authentication failed',
            message: 'Your session has expired. Please login again.',
          };
        }
      }

      return result;
    } catch (error) {
      console.error('❌ Authenticated request error:', error);
      return {
        success: false,
        error: error.message,
        message: 'An error occurred while making authenticated request.',
      };
    }
  }

  // Refresh token method
  static async refreshToken() {
    try {
      const refreshToken = await AsyncStorage.getItem('refresh_token');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const endpoints = await ConfigService.getApiEndpoints();
      const result = await this.makeRequest(
        endpoints.auth.refreshToken,
        {
          method: 'POST',
          body: { token: refreshToken },
        },
        false
      );

      if (result.success && (result.data.accessToken || result.data.token)) {
        const newAccessToken = result.data.accessToken || result.data.token;
        const newRefreshToken = result.data.refreshToken || refreshToken;

        // Save new tokens
        await AsyncStorage.setItem('jwt_token', newAccessToken);
        await AsyncStorage.setItem('refresh_token', newRefreshToken);

        console.log('✅ Tokens refreshed successfully');
        return { success: true, tokens: { accessToken: newAccessToken, refreshToken: newRefreshToken } };
      } else {
        throw new Error('Invalid response from refresh token endpoint');
      }
    } catch (error) {
      console.error('❌ Token refresh error:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility method for delays
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // GET request
  static async get(endpoint, headers = {}) {
    return this.makeRequest(endpoint, { method: 'GET', headers }, false);
  }

  // Authenticated GET request
  static async authGet(endpoint, headers = {}) {
    return this.authenticatedRequest(endpoint, { method: 'GET', headers });
  }

  // POST request
  static async post(endpoint, body = null, headers = {}, isFormData = false) {
    return this.makeRequest(endpoint, { method: 'POST', body, headers, isFormData }, false);
  }

  // Authenticated POST request
  static async authPost(endpoint, body = null, headers = {}, isFormData = false) {
    return this.authenticatedRequest(endpoint, { method: 'POST', body, headers, isFormData });
  }

  // PUT request
  static async put(endpoint, body = null, headers = {}, isFormData = false) {
    return this.makeRequest(endpoint, { method: 'PUT', body, headers, isFormData }, false);
  }

  // Authenticated PUT request
  static async authPut(endpoint, body = null, headers = {}, isFormData = false) {
    return this.authenticatedRequest(endpoint, { method: 'PUT', body, headers, isFormData });
  }

  // DELETE request
  static async delete(endpoint, headers = {}) {
    return this.makeRequest(endpoint, { method: 'DELETE', headers }, false);
  }

  // Authenticated DELETE request
  static async authDelete(endpoint, headers = {}) {
    return this.authenticatedRequest(endpoint, { method: 'DELETE', headers });
  }

  // PATCH request
  static async patch(endpoint, body = null, headers = {}, isFormData = false) {
    return this.makeRequest(endpoint, { method: 'PATCH', body, headers, isFormData }, false);
  }

  // Authenticated PATCH request
  static async authPatch(endpoint, body = null, headers = {}, isFormData = false) {
    return this.authenticatedRequest(endpoint, { method: 'PATCH', body, headers, isFormData });
  }

  // Upload file method
  static async uploadFile(endpoint, formData, onProgress = null) {
    try {
      const headers = await this.getAuthHeaders();
      delete headers['Content-Type']; // Let browser set the Content-Type for multipart/form-data

      return this.authenticatedRequest(endpoint, {
        method: 'POST',
        body: formData,
        headers,
        isFormData: true,
      });
    } catch (error) {
      console.error('❌ File upload error:', error);
      return {
        success: false,
        error: error.message,
        message: 'File upload failed. Please try again.',
      };
    }
  }

  // Download file method
  static async downloadFile(endpoint, filename) {
    try {
      const result = await this.authenticatedRequest(endpoint);
      
      if (result.success) {
        // Handle file download based on your requirements
        // This is a basic implementation
        return {
          success: true,
          data: result.data,
          filename: filename,
        };
      }

      return result;
    } catch (error) {
      console.error('❌ File download error:', error);
      return {
        success: false,
        error: error.message,
        message: 'File download failed. Please try again.',
      };
    }
  }
}

export default ApiService;