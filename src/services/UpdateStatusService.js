import ApiService from './ApiService';
import ConfigService from './ConfigService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UpdateStatusService {
  
  // Map update flag names to cache keys
  static UPDATE_FLAG_TO_CACHE_KEY = {
  'updatedContactus': 'LEADER_COORDINATES',
  'updatedSM': 'SOCIAL_MEDIA',
  'updatedPersdet': 'PERSONAL_DETAILS',
  'updatedEducation': 'EDUCATION_DATA',
  'updatedPermaddr': 'PERMANENT_ADDRESS',
  'updatedPresadd': 'PRESENT_ADDRESS',
  'updatedTimeline': 'TIMELINE_DATA',
  'updatedKYL': 'KYL_MEDIA'
};
  
  // ✅ ADD THIS: Check if API should be called
  static shouldFetchFresh(cacheKey, updateFlags) {
    if (!updateFlags) return true; // No flags = fetch fresh
    
    // Find the flag name for this cache key
    const flagName = Object.keys(this.UPDATE_FLAG_TO_CACHE_KEY).find(
      key => this.UPDATE_FLAG_TO_CACHE_KEY[key] === cacheKey
    );
    
    if (!flagName) return true; // Unknown cache key = fetch fresh
    
    // Return the flag value (true = updated, need fresh data)
    return updateFlags[flagName] === true;
  }
  
 static async checkUpdateStatus(memberIdentifier, userEmailId) {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/updates/status`;
    
    console.log('\n🔍 === CHECKING UPDATE STATUS ===');
    console.log('   📱 Member:', memberIdentifier);
    console.log('   📧 Email:', userEmailId);
    
    const result = await ApiService.authGet(endpoint);
    
    if (result.success && result.data) {
      console.log('📥 Backend Response:');
      console.log(JSON.stringify(result.data, null, 2));
      
      // Clear old flags
      await AsyncStorage.removeItem('UPDATE_FLAGS');
      
      // Store new flags
      await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(result.data));
      console.log('✅ Flags stored\n');
      
      return result.data;
    } else {
      console.log('⚠️ No flags received\n');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}
  
  static async getStoredUpdateFlags() {
    try {
      const flags = await AsyncStorage.getItem('UPDATE_FLAGS');
      return flags ? JSON.parse(flags) : null;
    } catch (error) {
      console.error('❌ Error getting stored flags:', error);
      return null;
    }
  }
  
  static async markAsUpdated(dataType) {
    try {
      const flags = await this.getStoredUpdateFlags();
      if (flags && flags[dataType] !== undefined) {
        flags[dataType] = false;
        await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(flags));
        console.log(`✅ Marked ${dataType} as updated (set to false)`);
      }
    } catch (error) {
      console.error('❌ Error marking as updated:', error);
    }
  }
  
  static async clearUpdatedCaches(updateFlags) {
    try {
      const LocalStorageService = require('./LocalStorageService').default;
      
      for (const [flagName, isUpdated] of Object.entries(updateFlags)) {
        if (isUpdated) {
          const cacheKey = this.UPDATE_FLAG_TO_CACHE_KEY[flagName];
          if (cacheKey) {
            await LocalStorageService.clearData(cacheKey);
            console.log(`🗑️ Cleared cache for ${cacheKey} (${flagName} was true)`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error clearing updated caches:', error);
    }
  }
}

export default UpdateStatusService;