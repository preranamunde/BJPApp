// src/services/UpdatesTrackingService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class UpdatesTrackingService {
  static UPDATE_FLAGS_KEY = 'api_update_flags';
  
  /**
   * Get all update flags at once
   * Returns: { coordinates: false, social: true, education: true, ... }
   * On FIRST LAUNCH: All flags return TRUE (call all APIs)
   * On SUBSEQUENT LAUNCHES: Returns saved flags (true = call API, false = use cache)
   */
  static async getAllUpdateFlags(memberId) {
    try {
      const flagsKey = `${this.UPDATE_FLAGS_KEY}_${memberId}`;
      const flagsString = await AsyncStorage.getItem(flagsKey);
      
      if (!flagsString) {
        // ✅ FIRST LAUNCH - ALL APIs MUST BE CALLED
        console.log('🚀 FIRST LAUNCH: All APIs will be called');
        return {
          coordinates: true,      // Call API
          social: true,           // Call API
          personal: true,         // Call API
          education: true,        // Call API
          permanentAddress: true, // Call API
          presentAddress: true,   // Call API
          timeline: true,         // Call API
          kylMedia: true          // Call API
        };
      }
      
      // ✅ SUBSEQUENT LAUNCHES - Use saved flags
      const flags = JSON.parse(flagsString);
      console.log('📋 Saved update flags loaded:', flags);
      return flags;
      
    } catch (error) {
      console.error('❌ Error getting update flags:', error);
      // If error, return all true to be safe
      return {
        coordinates: true,
        social: true,
        personal: true,
        education: true,
        permanentAddress: true,
        presentAddress: true,
        timeline: true,
        kylMedia: true
      };
    }
  }
  
  /**
   * Set update flag for specific API
   * @param memberId - Member identifier
   * @param apiName - 'coordinates', 'social', 'education', etc.
   * @param needsUpdate - true (call API) or false (read from cache)
   */
  static async setUpdateFlag(memberId, apiName, needsUpdate) {
    try {
      const flagsKey = `${this.UPDATE_FLAGS_KEY}_${memberId}`;
      const currentFlags = await this.getAllUpdateFlags(memberId);
      
      currentFlags[apiName] = needsUpdate;
      
      await AsyncStorage.setItem(flagsKey, JSON.stringify(currentFlags));
      console.log(`✅ Update flag set: ${apiName} = ${needsUpdate}`);
      
      return true;
    } catch (error) {
      console.error('❌ Error setting update flag:', error);
      return false;
    }
  }
  
  /**
   * Mark API as fresh (called successfully, data cached)
   * Call this AFTER successful API call + cache save
   */
  static async markApiFresh(memberId, apiName) {
    console.log(`✨ Marking ${apiName} as FRESH (will use cache next time)`);
    return await this.setUpdateFlag(memberId, apiName, false);
  }
  
  /**
   * Mark API as stale (needs refresh on next load)
   * Call this AFTER successful edit/delete operations
   */
  static async markApiStale(memberId, apiName) {
    console.log(`♻️ Marking ${apiName} as STALE (will call API next time)`);
    return await this.setUpdateFlag(memberId, apiName, true);
  }
  
  /**
   * Reset all flags (call all APIs on next launch)
   * Useful for:
   * - Manual refresh button
   * - Logout
   * - Data sync issues
   */
  static async resetAllFlags(memberId) {
    try {
      const flagsKey = `${this.UPDATE_FLAGS_KEY}_${memberId}`;
      await AsyncStorage.removeItem(flagsKey);
      console.log('♻️ All update flags reset - will call all APIs on next load');
      return true;
    } catch (error) {
      console.error('❌ Error resetting flags:', error);
      return false;
    }
  }
  
  /**
   * Check if this is the first launch for this member
   * Returns: true if first launch, false if flags exist
   */
  static async isFirstLaunch(memberId) {
    try {
      const flagsKey = `${this.UPDATE_FLAGS_KEY}_${memberId}`;
      const flagsString = await AsyncStorage.getItem(flagsKey);
      return !flagsString; // true if no flags exist
    } catch (error) {
      console.error('❌ Error checking first launch:', error);
      return true; // Assume first launch on error
    }
  }
  
  /**
   * Get a summary of current flag states
   * Useful for debugging
   */
  static async getFlagsSummary(memberId) {
    try {
      const flags = await this.getAllUpdateFlags(memberId);
      const isFirst = await this.isFirstLaunch(memberId);
      
      const summary = {
        isFirstLaunch: isFirst,
        totalAPIs: Object.keys(flags).length,
        needsAPICall: Object.values(flags).filter(v => v === true).length,
        usesCache: Object.values(flags).filter(v => v === false).length,
        flags: flags
      };
      
      console.log('📊 Flags Summary:', summary);
      return summary;
    } catch (error) {
      console.error('❌ Error getting flags summary:', error);
      return null;
    }
  }
}

export default UpdatesTrackingService;