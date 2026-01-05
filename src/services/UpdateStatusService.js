// src/services/UpdateStatusService.js
import ApiService from './ApiService';
import ConfigService from './ConfigService';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UpdateStatusService {
  
  // Map update flag names to cache keys
  static UPDATE_FLAG_TO_CACHE_KEY = {
    // KYL flags
    'updatedContactus': 'LEADER_COORDINATES',
    'updatedSM': 'SOCIAL_MEDIA',
    'updatedPersdet': 'PERSONAL_DETAILS',
    'updatedEducation': 'EDUCATION_DATA',
    'updatedPermaddr': 'PERMANENT_ADDRESS',
    'updatedPresadd': 'PRESENT_ADDRESS',
    'updatedTimeline': 'TIMELINE_DATA',
    'updatedKYL': 'KYL_MEDIA',
    
    // Constituency flags
    'updatedCP': 'CONSTITUENCY_PROFILE',
    'updatedAC': 'ASSEMBLY_CONSTITUENCIES',
    'updatedCPImage': 'CONSTITUENCY_MEMBER_IMAGE',
    'updatedACMedia': 'AC_MEDIA'
  };
  
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
  
  // ✅ ADD THIS FUNCTION - THIS IS WHAT'S MISSING!
  static async markApiStale(memberIdentifier, flagName) {
    try {
      console.log(`♻️ Marking ${flagName} as STALE (will call API next time)`);
      
      const flags = await this.getStoredUpdateFlags();
      if (!flags) {
        console.log('⚠️ No flags found, creating new flags object');
        const newFlags = { [flagName]: true };
        await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(newFlags));
        return true;
      }
      
      flags[flagName] = true; // Set to true = needs refresh
      await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(flags));
      console.log(`✅ ${flagName} marked as stale (set to true)`);
      return true;
    } catch (error) {
      console.error(`❌ Error marking ${flagName} as stale:`, error);
      return false;
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