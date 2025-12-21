// src/services/TranslationService.js
// ✅ FRONTEND-ONLY SOLUTION (No Backend Required)
// Uses multiple free translation APIs with intelligent fallback
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TranslationService {
  SUPPORTED_LANGUAGES = {
    en: { name: 'English', code: 'en' },
    hi: { name: 'हिंदी (Hindi)', code: 'hi' },
    ta: { name: 'தமிழ் (Tamil)', code: 'ta' },
    te: { name: 'తెలుగు (Telugu)', code: 'te' },
    kn: { name: 'ಕನ್ನಡ (Kannada)', code: 'kn' },
    ml: { name: 'മലയാളം (Malayalam)', code: 'ml' },
    mr: { name: 'मराठी (Marathi)', code: 'mr' },
    gu: { name: 'ગુજરાતી (Gujarati)', code: 'gu' },
    bn: { name: 'বাংলা (Bengali)', code: 'bn' },
    pa: { name: 'ਪੰਜਾਬੀ (Punjabi)', code: 'pa' },
  };

  // Multiple API endpoints for redundancy
  APIs = [
    {
      name: 'Google',
      translate: (text, from, to) => this.translateWithGoogle(text, from, to),
      priority: 1,
    },
    {
      name: 'Lingva',
      translate: (text, from, to) => this.translateWithLingva(text, from, to),
      priority: 2,
    },
    {
      name: 'MyMemory',
      translate: (text, from, to) => this.translateWithMyMemory(text, from, to),
      priority: 3,
    },
    {
      name: 'LibreTranslate',
      translate: (text, from, to) => this.translateWithLibre(text, from, to),
      priority: 4,
    },
  ];

  // In-memory cache (fast)
  memoryCache = new Map();
  
  // Persistent cache
  CACHE_PREFIX = 'translation_';
  
  // Track which API is working best
  apiStats = {};
  
  // Stats
  stats = {
    cacheHits: 0,
    apiCalls: 0,
    errors: 0,
  };

  constructor() {
    this.initializeCache();
    this.initializeAPIStats();
  }

  /**
   * ✅ LOAD CACHE FROM STORAGE
   */
  async initializeCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        const items = await AsyncStorage.multiGet(cacheKeys);
        items.forEach(([key, value]) => {
          const cacheKey = key.replace(this.CACHE_PREFIX, '');
          this.memoryCache.set(cacheKey, value);
        });
        console.log(`✅ Loaded ${items.length} cached translations`);
      }
    } catch (error) {
      console.log('⚠️ Could not load cache');
    }
  }

  /**
   * ✅ INITIALIZE API STATS
   */
  async initializeAPIStats() {
    try {
      const stored = await AsyncStorage.getItem('api_stats');
      if (stored) {
        this.apiStats = JSON.parse(stored);
      } else {
        this.APIs.forEach(api => {
          this.apiStats[api.name] = {
            successes: 0,
            failures: 0,
            avgResponseTime: 0,
          };
        });
      }
    } catch (error) {
      console.log('⚠️ Could not load API stats');
    }
  }

  /**
   * ✅ SAVE API STATS
   */
  async saveAPIStats() {
    try {
      await AsyncStorage.setItem('api_stats', JSON.stringify(this.apiStats));
    } catch (error) {
      // Ignore
    }
  }

  /**
   * ✅ GET BEST WORKING API
   */
  getBestAPI() {
    // Sort APIs by success rate and response time
    return [...this.APIs].sort((a, b) => {
      const aStats = this.apiStats[a.name] || { successes: 0, failures: 0 };
      const bStats = this.apiStats[b.name] || { successes: 0, failures: 0 };
      
      const aTotal = aStats.successes + aStats.failures;
      const bTotal = bStats.successes + bStats.failures;
      
      const aRate = aTotal > 0 ? aStats.successes / aTotal : 0.5;
      const bRate = bTotal > 0 ? bStats.successes / bTotal : 0.5;
      
      return bRate - aRate;
    });
  }

  /**
   * ✅ MAIN TRANSLATION METHOD
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return text;
    }
    
    if (targetLanguage === sourceLanguage) {
      return text;
    }

    // Check cache
    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
    
    if (this.memoryCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.memoryCache.get(cacheKey);
    }

    // Try each API in order of reliability
    const sortedAPIs = this.getBestAPI();
    
    for (const api of sortedAPIs) {
      try {
        const startTime = Date.now();
        
        console.log(`🌐 Trying ${api.name}...`);
        
        const result = await Promise.race([
          api.translate(text, sourceLanguage, targetLanguage),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          ),
        ]);

        if (result && result !== text) {
          const responseTime = Date.now() - startTime;
          
          // Update stats
          const apiStat = this.apiStats[api.name];
          apiStat.successes++;
          apiStat.avgResponseTime = 
            (apiStat.avgResponseTime * (apiStat.successes - 1) + responseTime) / 
            apiStat.successes;
          this.saveAPIStats();
          
          // Cache result
          this.memoryCache.set(cacheKey, result);
          this.saveToStorage(cacheKey, result);
          
          this.stats.apiCalls++;
          console.log(`✅ Success with ${api.name} (${responseTime}ms)`);
          
          return result;
        }
      } catch (error) {
        console.log(`⚠️ ${api.name} failed: ${error.message}`);
        
        // Update failure stats
        this.apiStats[api.name].failures++;
        this.saveAPIStats();
        
        // Continue to next API
        continue;
      }
    }

    // All APIs failed
    this.stats.errors++;
    console.error('❌ All translation APIs failed');
    return text;
  }

  /**
   * ✅ GOOGLE TRANSLATE (Free)
   */
  async translateWithGoogle(text, from, to) {
    const params = {
      client: 'gtx',
      sl: from,
      tl: to,
      dt: 't',
      q: text,
    };

    const url = `https://translate.googleapis.com/translate_a/single?${new URLSearchParams(params)}`;
    
    const response = await axios.get(url, {
      timeout: 7000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (response.data && Array.isArray(response.data) && response.data[0]) {
      const translated = response.data[0].map(item => item[0]).join('');
      if (translated && translated !== text) {
        return translated;
      }
    }
    
    throw new Error('Invalid response');
  }

  /**
   * ✅ LINGVA TRANSLATE (Unlimited, Open Source)
   */
  async translateWithLingva(text, from, to) {
    // Multiple Lingva instances for redundancy
    const instances = [
      'https://lingva.ml',
      'https://translate.plausibility.cloud',
      'https://translate.igna.wtf',
    ];

    for (const instance of instances) {
      try {
        const url = `${instance}/api/v1/${from}/${to}/${encodeURIComponent(text)}`;
        const response = await axios.get(url, { timeout: 6000 });

        if (response.data?.translation) {
          return response.data.translation;
        }
      } catch (error) {
        continue; // Try next instance
      }
    }
    
    throw new Error('All Lingva instances failed');
  }

  /**
   * ✅ MYMEMORY API
   */
  async translateWithMyMemory(text, from, to) {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
    
    const response = await axios.get(url, { timeout: 6000 });

    if (response.data?.responseData?.translatedText) {
      const translated = response.data.responseData.translatedText;
      if (translated && translated !== text) {
        return translated;
      }
    }
    
    throw new Error('Invalid response');
  }

  /**
   * ✅ LIBRETRANSLATE
   */
  async translateWithLibre(text, from, to) {
    const instances = [
      'https://libretranslate.de',
      'https://translate.argosopentech.com',
    ];

    for (const instance of instances) {
      try {
        const response = await axios.post(
          `${instance}/translate`,
          {
            q: text,
            source: from,
            target: to,
            format: 'text',
          },
          {
            timeout: 6000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (response.data?.translatedText) {
          return response.data.translatedText;
        }
      } catch (error) {
        continue;
      }
    }
    
    throw new Error('All LibreTranslate instances failed');
  }

  /**
   * ✅ SAVE TO PERSISTENT STORAGE
   */
  async saveToStorage(cacheKey, value) {
    try {
      await AsyncStorage.setItem(this.CACHE_PREFIX + cacheKey, value);
    } catch (error) {
      // Ignore cache errors
    }
  }

  /**
   * ✅ BATCH TRANSLATE
   */
  async translateBatch(texts, targetLanguage, sourceLanguage = 'en') {
    return await Promise.all(
      texts.map(text => 
        this.translateText(text, targetLanguage, sourceLanguage)
      )
    );
  }

  /**
   * ✅ CLEAR CACHE
   */
  async clearCache() {
    try {
      this.memoryCache.clear();
      
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      console.log('🗑️ Cache cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  /**
   * ✅ GET STATISTICS
   */
  getStats() {
    const total = this.stats.cacheHits + this.stats.apiCalls;
    const cacheHitRate = total > 0 
      ? ((this.stats.cacheHits / total) * 100).toFixed(1)
      : 0;

    return {
      totalRequests: total,
      cacheHits: this.stats.cacheHits,
      apiCalls: this.stats.apiCalls,
      errors: this.stats.errors,
      cacheHitRate: `${cacheHitRate}%`,
      cacheSize: this.memoryCache.size,
      apiStats: this.apiStats,
    };
  }

  /**
   * ✅ DIAGNOSTICS
   */
  async getDiagnostics() {
    return {
      supportedLanguages: Object.keys(this.SUPPORTED_LANGUAGES),
      translationMethod: 'Multiple Free APIs with Auto-Fallback',
      availableAPIs: this.APIs.map(api => api.name),
      bestAPI: this.getBestAPI()[0].name,
      stats: this.getStats(),
      status: 'Active',
    };
  }

  /**
   * ✅ TEST TRANSLATION
   */
  async testTranslation() {
    console.log('\n🧪 === TESTING TRANSLATION ===');
    
    try {
      const testText = 'Hello, how are you?';
      const targetLang = 'hi';
      
      const result = await this.translateText(testText, targetLang, 'en');
      
      if (result && result !== testText) {
        console.log(`✅ Test PASSED: "${result}"`);
        return { 
          success: true, 
          original: testText, 
          translated: result,
          stats: this.getStats(),
        };
      } else {
        return { 
          success: false, 
          error: 'Translation returned original',
          stats: this.getStats(),
        };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Dummy methods for compatibility
  async downloadModelIfNeeded() { 
    return { success: true, message: 'Using online APIs' }; 
  }
  
  async getDownloadedModels() { 
    return Object.keys(this.SUPPORTED_LANGUAGES); 
  }
  
  async isModelDownloaded() { return true; }
  async deleteModel() { return true; }
  
  async deleteAllModels() { 
    await this.clearCache(); 
    return true; 
  }
}

export default new TranslationService();