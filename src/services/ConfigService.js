import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';

class ConfigService {
  static BASE_URL_KEY = 'app_base_url';
  static DEFAULT_BASE_URL = 'https://fbd26759be6f.ngrok-free.app'; // 👈 Update this when ngrok gives new URL


  

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
 // Get all API endpoints
// Add these methods to your ConfigService.js getApiEndpoints() function

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
      updateProfile: `${baseUrl}/api/profile/`,
      updateProfileImage: `${baseUrl}/api/profile/image`,
    },
    location: {
      pincode: `${baseUrl}/api/pincodes`,
    },
    app: {
      health: `${baseUrl}/api/health`,
      bootstrap: `${baseUrl}/api/bootstrap`,
    },
    coordinates: `${baseUrl}/api/coordinates`,
    assemblyConstituencies: {
  getAll: `${baseUrl}/api/assemblyconstituencies/`,
  create: `${baseUrl}/api/assemblyconstituencies`,
  update: `${baseUrl}/api/assemblyconstituencies/`,
  delete: `${baseUrl}/api/assemblyconstituencies/`,
},
    grievances: {
      // Updated to use GET methods with query parameters
      getAll: `${baseUrl}/api/grievances/search`, // GET method with query params
      getByStatus: `${baseUrl}/api/grievances/status`, // GET method with query params  
      search: `${baseUrl}/api/grievances/search`, // GET method with query params
      create: `${baseUrl}/api/grievances`, // POST method (remains same)
      update: `${baseUrl}/api/grievances/`, // PUT method (remains same)
      delete: `${baseUrl}/api/grievances/`, // DELETE method (remains same)
      count: `${baseUrl}/api/grievances/count`, // GET method
      countByStatus: `${baseUrl}/api/grievances/countstatus`, // GET method
    },
    appointments: {
      // Updated to use GET methods with query parameters
      getAll: `${baseUrl}/api/appointments/`, // GET method with query params
      getByStatus: `${baseUrl}/api/appointments/status`, // GET method with query params
      search: `${baseUrl}/api/appointments/search`, // GET method with query params  
      create: `${baseUrl}/api/appointments`, // POST method (remains same)
      update: `${baseUrl}/api/appointments/`, // PUT method (remains same)
      delete: `${baseUrl}/api/appointments/`, // DELETE method (remains same)
      count: `${baseUrl}/api/appointments/count`, // GET method
      countByStatus: `${baseUrl}/api/appointments/countstatus`, // GET method
    },
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

  // Add this method to ConfigService class (after getProfileImageUrl method)

// In ConfigService.js
// In ConfigService.js

static async getMediaAssetUrl(mediaFile, regdMobileNo, userEmail) {
  try {
    const baseUrl = await this.getBaseUrl();
    
    // If media_file is already a full URL, we need to use the asset endpoint
    // because direct media URLs require authentication
    const encodedMediaFile = encodeURIComponent(mediaFile);
    const encodedEmail = encodeURIComponent(userEmail);
    
    // Construct URL using the asset endpoint which handles authentication on backend
    return `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
    
  } catch (error) {
    console.error('Error constructing media asset URL:', error);
    throw error;
  }
}


  static async getProfileImageUrl(filename) {
    if (!filename || filename === 'placeholder') {
      return null;
    }
    const baseUrl = await this.getBaseUrl();
    return `${baseUrl}/uploads/profile_images/${filename}`;
  }

  // Add this method to ConfigService class (around line 150, after getProfileImageUrl)

// Add/Update this method in ConfigService class
// Replace the existing getMediaFileUrl method in ConfigService.js
static async getMediaFileUrl(mediaFile, regdMobileNo, userEmail) {
  try {
    const baseUrl = await this.getBaseUrl();
    
    // ✅ If it's already a full URL, normalize it
    if (mediaFile.startsWith('http://') || mediaFile.startsWith('https://')) {
      // Remove port from ngrok URLs (ngrok doesn't use ports in URLs)
      let normalizedUrl = mediaFile;
      
      if (normalizedUrl.includes('ngrok-free.app:')) {
        normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
        console.log('🔧 Removed port from ngrok URL:', normalizedUrl);
      }
      
      // Replace localhost with ngrok
      if (normalizedUrl.includes('localhost:5000') || normalizedUrl.includes('localhost:')) {
        normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
        console.log('🔧 Replaced localhost with:', normalizedUrl);
      }
      
      return normalizedUrl;
    }
    
    // ✅ For relative paths, construct full URL
    const cleanMediaFile = mediaFile.replace(/^[\\\/]+/, '');
    const encodedMediaFile = encodeURIComponent(cleanMediaFile);
    const encodedEmail = encodeURIComponent(userEmail);
    
    const apiUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
    
    console.log('🔗 Constructed Media URL:', apiUrl);
    
    return apiUrl;
  } catch (error) {
    console.error('❌ Error constructing media file URL:', error);
    throw error;
  }
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
