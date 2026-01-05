import DeviceInfo from 'react-native-device-info';
import CryptoJS from 'crypto-js';
import EncryptedStorage from 'react-native-encrypted-storage';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FINGERPRINT_KEY = 'device_fingerprint';
const DEVICE_IP_KEY = 'device_ip_address';

// Global variable to store device IP
global.deviceIP = null;

const DeviceService = {
  async getDeviceInfo() {
    const os = DeviceInfo.getSystemName();
    const version = DeviceInfo.getSystemVersion();
    const model = DeviceInfo.getModel();
    return `${os} ${version} - ${model}`;
  },

  async getDeviceFingerprint() {
    const cached = await EncryptedStorage.getItem(FINGERPRINT_KEY);
    if (cached) return cached;

    let rawId = DeviceInfo.getUniqueId();
    if (!rawId || rawId === 'unknown') {
      const model = DeviceInfo.getModel();
      const os = DeviceInfo.getSystemName();
      const timestamp = Date.now().toString();
      rawId = `${model}-${os}-${timestamp}`;
    }

    const fingerprint = CryptoJS.SHA256(rawId).toString();
    
    await EncryptedStorage.setItem(FINGERPRINT_KEY, fingerprint);
    return fingerprint;
  },

  // ✅ UPDATED: Get complete device information including user email
  async getCompleteDeviceInfo() {
    try {
      console.log('📱 Collecting complete device information...');
      
      // ✅ Get user email first
      const userEmail = await AsyncStorage.getItem('userEmail') || 
                       await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || 
                       'null';
      
      console.log('📧 User Email for device info:', userEmail);
      
      // Helper function to safely get device info
      const safeGet = async (fn, fallback = 'unknown') => {
        try {
          const result = await fn();
          return result || fallback;
        } catch (error) {
          console.log(`Error getting device info field: ${error.message}`);
          return fallback;
        }
      };

      const safeGetSync = (fn, fallback = 'unknown') => {
        try {
          const result = fn();
          return result || fallback;
        } catch (error) {
          console.log(`Error getting device info field: ${error.message}`);
          return fallback;
        }
      };
      
      // Get all device information with error handling for each field
      const device_aaid = await safeGet(
        async () => {
          try {
            if (typeof DeviceInfo.getAdvertisingId === 'function') {
              const aaid = await DeviceInfo.getAdvertisingId();
              console.log('📱 AAID retrieved successfully:', aaid);
              return aaid || 'empty-response';
            } else {
              console.log('⚠️ getAdvertisingId method not found in DeviceInfo');
              const uniqueId = await DeviceInfo.getUniqueId();
              console.log('📱 Using unique device ID as fallback:', uniqueId);
              return `fallback-${uniqueId}`;
            }
          } catch (error) {
            console.log('❌ Error getting AAID:', error.message);
            const model = DeviceInfo.getModel();
            const brand = DeviceInfo.getBrand();
            return `device-${brand}-${model}`;
          }
        },
        'method-not-available'
      );
      
      const device_manufacturer_name = await safeGet(
        () => DeviceInfo.getManufacturer(),
        'unknown'
      );
      
      const device_model = safeGetSync(
        () => DeviceInfo.getModel(),
        'unknown'
      );
      
      const device_brand_name = safeGetSync(
        () => DeviceInfo.getBrand(),
        'unknown'
      );
      
      const device_os_version = safeGetSync(
        () => DeviceInfo.getSystemVersion(),
        'unknown'
      );
      
      const device_api_level = await safeGet(
        () => DeviceInfo.getApiLevel(),
        '0'
      );
      
      const device_type = await safeGet(
        () => DeviceInfo.getDeviceType(),
        'unknown'
      );
      
      const device_app_version = safeGetSync(
        () => DeviceInfo.getVersion(),
        '1.0.0'
      );
      
      const device_type_str = safeGetSync(
        () => DeviceInfo.getType ? DeviceInfo.getType() : 'unknown',
        'unknown'
      );
      
      const device_os_codename = await safeGet(
        () => DeviceInfo.getCodename ? DeviceInfo.getCodename() : Promise.resolve('unknown'),
        'unknown'
      );
      
      const device_screen_density = await safeGet(
        () => DeviceInfo.getDeviceName ? DeviceInfo.getDeviceName() : Promise.resolve('unknown'),
        'unknown'
      );

      // ✅ UPDATED: Include user_email_id in device info object
      const deviceInfo = {
        user_email_id: String(userEmail),  // ✅ ADD THIS LINE
        device_aaid: String(device_aaid),
        device_manufacturer_name: String(device_manufacturer_name),
        device_model: String(device_model),
        device_brand_name: String(device_brand_name),
        device_os_version: String(device_os_version),
        device_api_level: String(device_api_level),
        device_type: String(device_type),
        device_app_version: String(device_app_version),
        device_type_str: String(device_type_str),
        device_os_codename: String(device_os_codename),
        device_screen_density: String(device_screen_density)
      };

      console.log('✅ Device information collected:', JSON.stringify(deviceInfo, null, 2));
      return deviceInfo;

    } catch (error) {
      console.error('❌ Error collecting device info:', error);
      
      // ✅ UPDATED: Include user_email_id in fallback data
      const fallbackEmail = await AsyncStorage.getItem('userEmail') || 
                           await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || 
                           'null';
      
      return {
        user_email_id: String(fallbackEmail),  // ✅ ADD THIS LINE
        device_aaid: 'unknown',
        device_manufacturer_name: 'unknown',
        device_model: 'unknown',
        device_brand_name: 'unknown',
        device_os_version: 'unknown',
        device_api_level: '0',
        device_type: 'unknown',
        device_app_version: '1.0.0',
        device_type_str: 'unknown',
        device_os_codename: 'unknown',
        device_screen_density: 'unknown'
      };
    }
  },

  // Get device IP using multiple methods
  async getDeviceIP() {
    try {
      // First try to get from global variable if already set
      if (global.deviceIP) {
        console.log('Using cached global IP:', global.deviceIP);
        return global.deviceIP;
      }

      // Try to get from encrypted storage
      const cachedIP = await EncryptedStorage.getItem(DEVICE_IP_KEY);
      if (cachedIP && this.isValidIP(cachedIP)) {
        global.deviceIP = cachedIP;
        console.log('Using cached IP from storage:', cachedIP);
        return cachedIP;
      }

      console.log('Fetching fresh device IP...');
      
      // Method 1: Try NetInfo (most reliable for local network IP)
      const netInfo = await NetInfo.fetch();
      if (netInfo.details && netInfo.details.ipAddress) {
        const ip = netInfo.details.ipAddress;
        if (this.isValidIP(ip) && !this.isLoopback(ip)) {
          await this.cacheIP(ip);
          console.log('IP from NetInfo:', ip);
          return ip;
        }
      }

      // Method 2: Try external IP service as fallback
      const externalIP = await this.getExternalIP();
      if (externalIP) {
        await this.cacheIP(externalIP);
        console.log('IP from external service:', externalIP);
        return externalIP;
      }

      // Method 3: Try getting local network IP using different approach
      const localIP = await this.getLocalNetworkIP();
      if (localIP) {
        await this.cacheIP(localIP);
        console.log('Local network IP:', localIP);
        return localIP;
      }

      // Fallback: Generate a pseudo-IP based on device info
      const fallbackIP = await this.generateFallbackIP();
      await this.cacheIP(fallbackIP);
      console.log('Using fallback IP:', fallbackIP);
      return fallbackIP;

    } catch (error) {
      console.error('Error getting device IP:', error);
      
      // Return fallback IP in case of error
      const fallbackIP = await this.generateFallbackIP();
      await this.cacheIP(fallbackIP);
      return fallbackIP;
    }
  },

  // Method to get external IP
  async getExternalIP() {
    try {
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );

      const response = await Promise.race([
        fetch('https://api.ipify.org?format=json', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        }),
        timeout
      ]);

      if (response.ok) {
        const data = await response.json();
        if (data.ip && this.isValidIP(data.ip)) {
          return data.ip;
        }
      }
    } catch (error) {
      console.log('External IP fetch failed:', error.message);
    }

    // Try alternative service
    try {
      const response = await fetch('https://httpbin.org/ip', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.origin && this.isValidIP(data.origin)) {
          return data.origin;
        }
      }
    } catch (error) {
      console.log('Alternative IP service failed:', error.message);
    }

    return null;
  },

  // Method to get local network IP (implementation depends on your network library)
  async getLocalNetworkIP() {
    try {
      // This would require additional network libraries like react-native-network-info
      // For now, return null - can be implemented based on available libraries
      return null;
    } catch (error) {
      console.log('Local network IP detection failed:', error);
      return null;
    }
  },

  // Generate fallback IP based on device characteristics
  async generateFallbackIP() {
    try {
      const deviceId = await DeviceInfo.getUniqueId();
      const model = DeviceInfo.getModel();
      
      // Create a hash from device info
      const combined = `${deviceId}-${model}-${Date.now()}`;
      const hash = CryptoJS.SHA256(combined).toString();
      
      // Convert hash to IP-like format (but ensure it's in private range)
      const segments = [];
      for (let i = 0; i < 4; i++) {
        const byte = parseInt(hash.substr(i * 2, 2), 16);
        segments.push(byte);
      }
      
      // Ensure it's in a private IP range (192.168.x.x)
      segments[0] = 192;
      segments[1] = 168;
      
      return segments.join('.');
    } catch (error) {
      console.error('Error generating fallback IP:', error);
      return '192.168.1.100'; // Ultimate fallback
    }
  },

  // Validate IP format
  isValidIP(ip) {
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
  },

  // Check if IP is loopback
  isLoopback(ip) {
    return ip.startsWith('127.') || ip === '::1';
  },

  // Cache IP in both global variable and encrypted storage
  async cacheIP(ip) {
    try {
      global.deviceIP = ip;
      await EncryptedStorage.setItem(DEVICE_IP_KEY, ip);
      console.log('IP cached successfully:', ip);
    } catch (error) {
      console.error('Error caching IP:', error);
    }
  },

  // Initialize IP on app start
  async initializeDeviceIP() {
    try {
      const ip = await this.getDeviceIP();
      console.log('Device IP initialized:', ip);
      return ip;
    } catch (error) {
      console.error('Error initializing device IP:', error);
      return await this.generateFallbackIP();
    }
  },

  // Force refresh IP (useful when network changes)
  async refreshDeviceIP() {
    try {
      // Clear cached values
      global.deviceIP = null;
      await EncryptedStorage.removeItem(DEVICE_IP_KEY);
      
      // Get fresh IP
      const ip = await this.getDeviceIP();
      console.log('Device IP refreshed:', ip);
      return ip;
    } catch (error) {
      console.error('Error refreshing device IP:', error);
      return await this.generateFallbackIP();
    }
  }
};

export default DeviceService;