import AsyncStorage from '@react-native-async-storage/async-storage';

class ConfigService {
  static BASE_URL_KEY = 'app_base_url';
  static DEFAULT_BASE_URL = 'https://38f7f39f9dc1.ngrok-free.app'; // 👈 Update this when ngrok gives new URL

  // Initialize configuration with default values (always enforce DEFAULT_BASE_URL)
  static async initializeConfig() {
    try {
      await this.setBaseUrl(this.DEFAULT_BASE_URL); // Force new ngrok URL
      console.log('✅ Configuration initialized with ngrok base URL:', this.DEFAULT_BASE_URL);
    } catch (error) {
      console.error('❌ Error initializing configuration:', error);
    }
  }

  // Set base URL
  static async setBaseUrl(baseUrl) {
    try {
      // Clean the URL (remove trailing slash)
      const cleanUrl = baseUrl.replace(/\/$/, '');
      await AsyncStorage.setItem(this.BASE_URL_KEY, cleanUrl);
      console.log('✅ Base URL saved:', cleanUrl);
      return true;
    } catch (error) {
      console.error('❌ Error saving base URL:', error);
      return false;
    }
  }

  // Get base URL
  static async getBaseUrl() {
    try {
      const baseUrl = await AsyncStorage.getItem(this.BASE_URL_KEY);
      return baseUrl || this.DEFAULT_BASE_URL;
    } catch (error) {
      console.error('❌ Error getting base URL:', error);
      return this.DEFAULT_BASE_URL;
    }
  }

  // Update base URL and validate it
  static async updateBaseUrl(newBaseUrl) {
    try {
      // Validate URL format
      if (!this.isValidUrl(newBaseUrl)) {
        return {
          success: false,
          message: 'Invalid URL format. Please use http:// or https://'
        };
      }

      // Test the URL by making a simple request
      console.log('🔍 Testing connection to:', newBaseUrl);
      const isReachable = await this.testConnection(newBaseUrl);
      
      if (!isReachable) {
        console.warn('⚠️ Server not reachable, but saving URL anyway...');
        // Still save the URL even if not reachable for offline scenarios
      }

      await this.setBaseUrl(newBaseUrl);
      return {
        success: true,
        message: isReachable 
          ? 'Base URL updated and server is reachable' 
          : 'Base URL updated (server may not be reachable)'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Validate URL format
  static isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  }

  // Test connection to server
  static async testConnection(baseUrl, timeout = 5000) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      // Try health endpoint first, then fallback to bootstrap endpoint
      let response;
      try {
        response = await fetch(`${baseUrl}/api/health`, {
          method: 'GET',
          signal: controller.signal,
        });
      } catch (healthError) {
        console.log('Health endpoint failed, trying bootstrap endpoint...');
        response = await fetch(`${baseUrl}/api/bootstrap`, {
          method: 'HEAD',
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      const isReachable = response.ok || response.status === 405;
      console.log(`Connection test result: ${isReachable ? 'SUCCESS' : 'FAILED'} (Status: ${response.status})`);
      return isReachable;
    } catch (error) {
      console.log('Connection test failed:', error.message);
      return false;
    }
  }

  // Get all API endpoints
  static async getApiEndpoints() {
    const baseUrl = await this.getBaseUrl();
    return {
      bootstrap: `${baseUrl}/api/bootstrap`,
      auth: {
        login: `${baseUrl}/api/auth/login`,
        register: `${baseUrl}/api/auth/register`,
        logout: `${baseUrl}/api/auth/logout`,
        refreshToken: `${baseUrl}/api/auth/refresh-token`,
        verifyEmail: `${baseUrl}/api/auth/verifyemail`,
        sendOTP: `${baseUrl}/api/auth/sendotp`,
        verifyEmailOTP: `${baseUrl}/api/auth/verifyemailotp`,
      },
      user: {
        profile: `${baseUrl}/api/profile`,
        updateProfile: `${baseUrl}/api/profile`,
      },
      location: {
        pincode: `${baseUrl}/api/pincodes`,
      },
      app: {
        health: `${baseUrl}/api/health`,
        bootstrap: `${baseUrl}/api/bootstrap`,
      }
    };
  }

  static async getBootstrapEndpoint() {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/api/bootstrap`;
  }

  static async getPincodeEndpoint(pincode) {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/api/pincodes/${pincode}`;
  }

  static async clearConfig() {
    try {
      await AsyncStorage.removeItem(this.BASE_URL_KEY);
      console.log('✅ Configuration cleared');
    } catch (error) {
      console.error('❌ Error clearing configuration:', error);
    }
  }

  static async getUploadUrl(path = '') {
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/uploads${path}`;
  }

  static async getProfileImageUrl(filename) {
    if (!filename || filename === 'placeholder') {
      return null;
    }
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/uploads/profile_images/${filename}`;
  }

  static async getConfigSummary() {
    try {
      const baseUrl = await this.getBaseUrl();
      const isReachable = await this.testConnection(baseUrl, 3000);
      
      return {
        baseUrl,
        isDefault: baseUrl === this.DEFAULT_BASE_URL,
        isReachable,
        status: isReachable ? 'Connected' : 'Not Reachable'
      };
    } catch (error) {
      console.error('❌ Error getting config summary:', error);
      return {
        baseUrl: this.DEFAULT_BASE_URL,
        isDefault: true,
        isReachable: false,
        status: 'Error',
        error: error.message
      };
    }
  }

  static async resetToDefault() {
    try {
      await this.setBaseUrl(this.DEFAULT_BASE_URL);
      console.log('✅ Configuration reset to default:', this.DEFAULT_BASE_URL);
      return {
        success: true,
        message: 'Configuration reset to default URL'
      };
    } catch (error) {
      console.error('❌ Error resetting configuration:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }
}

// 👇 Automatically initialize with current ngrok URL
ConfigService.initializeConfig();

export default ConfigService;
