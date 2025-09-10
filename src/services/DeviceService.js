import DeviceInfo from 'react-native-device-info';
import CryptoJS from 'crypto-js';
import EncryptedStorage from 'react-native-encrypted-storage';
import NetInfo from '@react-native-community/netinfo';

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