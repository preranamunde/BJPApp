import DeviceInfo from 'react-native-device-info';
import CryptoJS from 'crypto-js';
import EncryptedStorage from 'react-native-encrypted-storage';

const FINGERPRINT_KEY = 'device_fingerprint';

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
  }
};

export default DeviceService;
