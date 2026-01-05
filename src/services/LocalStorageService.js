import AsyncStorage from '@react-native-async-storage/async-storage';

class LocalStorageService {
  
  // Store data with a key
  static async storeData(key, data) {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
      console.log(`✅ Stored ${key} locally`);
    } catch (error) {
      console.error(`❌ Error storing ${key}:`, error);
    }
  }
  
  // Get stored data
  static async getData(key) {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`❌ Error getting ${key}:`, error);
      return null;
    }
  }
  
  // Clear specific data
  static async clearData(key) {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`✅ Cleared ${key}`);
    } catch (error) {
      console.error(`❌ Error clearing ${key}:`, error);
    }
  }
  
  // Clear all local data
  static async clearAll() {
  try {
    const keys = [
      'LEADER_COORDINATES',
      'SOCIAL_MEDIA',
      'PERSONAL_DETAILS',
      'EDUCATION_DATA',
      'PERMANENT_ADDRESS',
      'PRESENT_ADDRESS',
      'TIMELINE_DATA',
      'KYL_MEDIA',
       'CONSTITUENCY_PROFILE',
        'ASSEMBLY_CONSTITUENCIES',
        'CONSTITUENCY_MEMBER_IMAGE',
        'AC_MEDIA',
        'UPDATE_FLAGS'
    ];
      await AsyncStorage.multiRemove(keys);
      console.log('✅ Cleared all local data');
    } catch (error) {
      console.error('❌ Error clearing all data:', error);
    }
  }

  
  // Add this method to LocalStorageService.js

// ✅ ADD THIS NEW METHOD
 static async hasCachedData() {
  try {
    const keys = [
      'LEADER_COORDINATES',
      'SOCIAL_MEDIA', 
      'PERSONAL_DETAILS',
      'EDUCATION_DATA',
      'PERMANENT_ADDRESS',
      'PRESENT_ADDRESS',
      'TIMELINE_DATA',
      'KYL_MEDIA',
      'CONSTITUENCY_PROFILE',
        'ASSEMBLY_CONSTITUENCIES',
        'CONSTITUENCY_MEMBER_IMAGE',
        'AC_MEDIA',
        'CONTACT_OFFICE'
    ];
      
      // Check if at least one key has data
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        if (data) {
          console.log(`✅ Found cached data for ${key}`);
          return true; // Found at least one cached item
        }
      }
      
      console.log('⚠️ No cached data found');
      return false;
    } catch (error) {
      console.error('❌ Error checking cached data:', error);
      return false;
    }
  }

  // ✅ REPLACE YOUR EXISTING isFirstLaunch METHOD WITH THIS
  static async isFirstLaunch() {
    try {
      const hasLaunched = await AsyncStorage.getItem('HAS_LAUNCHED');
      const hasCached = await this.hasCachedData();
      
      // It's first launch ONLY if:
      // 1. HAS_LAUNCHED flag is not set AND
      // 2. No cached data exists
      const isFirst = !hasLaunched && !hasCached;
      
      console.log('🔍 Launch Check:', {
        hasLaunchedFlag: !!hasLaunched,
        hasCachedData: hasCached,
        isFirstLaunch: isFirst
      });
      
      return isFirst;
    } catch (error) {
      console.error('❌ Error checking first launch:', error);
      return true;
    }
  }
  
  // Mark that app has launched
  static async setHasLaunched() {
    try {
      await AsyncStorage.setItem('HAS_LAUNCHED', 'true');
      console.log('✅ Marked app as launched');
    } catch (error) {
      console.error('❌ Error setting launch flag:', error);
    }
  }
}

export default LocalStorageService;