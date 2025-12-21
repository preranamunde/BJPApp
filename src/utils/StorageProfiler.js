import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { Platform, Alert, InteractionManager } from 'react-native';

class StorageProfiler {
  constructor() {
    this.metrics = {
      asyncStorage: {},
      encryptedStorage: {},
      totalSize: 0,
      itemCount: 0,
      lastProfileTime: null,
      memory: {},
      cpu: {},
      performance: {}
    };
    
    // Performance monitoring
    this.performanceMarks = {};
    this.cpuUsageHistory = [];
    this.memoryUsageHistory = [];
    this.monitoringInterval = null;
  }

  /**
   * Get size of a string in bytes
   */
  getByteSize(str) {
    if (!str) return 0;
    // Use Buffer for React Native, Blob for web
    try {
      if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(str, 'utf8');
      } else if (typeof Blob !== 'undefined') {
        return new Blob([str]).size;
      } else {
        // Fallback: approximate byte size
        return new TextEncoder().encode(str).length;
      }
    } catch (error) {
      // Fallback calculation
      let bytes = 0;
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 0x80) bytes += 1;
        else if (code < 0x800) bytes += 2;
        else if (code < 0x10000) bytes += 3;
        else bytes += 4;
      }
      return bytes;
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Profile Memory Usage
   */
 // Add this to your StorageProfiler.js

/**
 * Profile Memory Usage with multiple methods
 */
async profileMemory() {
  try {
    console.log('🧠 Profiling Memory...');
    
    const memoryInfo = {
      timestamp: Date.now(),
      jsHeapSizeLimit: 0,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
      platform: Platform.OS,
      method: 'unknown'
    };

    let memoryAvailable = false;

    // ===== METHOD 1: Native Memory Module (RECOMMENDED) =====
    // Install: npm install react-native-device-info
    try {
      const DeviceInfo = require('react-native-device-info');
      
      // Get total memory
      const totalMemory = await DeviceInfo.getTotalMemory();
      
      // Get used memory (Android only, iOS returns total)
      const usedMemory = Platform.OS === 'android' 
        ? await DeviceInfo.getUsedMemory()
        : totalMemory * 0.5; // Estimate for iOS
      
      memoryInfo.totalJSHeapSize = totalMemory;
      memoryInfo.usedJSHeapSize = usedMemory;
      memoryInfo.jsHeapSizeLimit = totalMemory;
      memoryInfo.method = 'react-native-device-info';
      memoryAvailable = true;
      
      console.log('✅ Using react-native-device-info for memory');
    } catch (e) {
      console.log('⚠️ react-native-device-info not available:', e.message);
    }

    // ===== METHOD 2: Performance Memory API (Web/Debug only) =====
    if (!memoryAvailable) {
      if (global.performance?.memory) {
        memoryInfo.jsHeapSizeLimit = global.performance.memory.jsHeapSizeLimit || 0;
        memoryInfo.totalJSHeapSize = global.performance.memory.totalJSHeapSize || 0;
        memoryInfo.usedJSHeapSize = global.performance.memory.usedJSHeapSize || 0;
        memoryInfo.method = 'performance.memory';
        memoryAvailable = true;
        console.log('✅ Using performance.memory API');
      }
    }

    // ===== METHOD 3: Native Modules (Custom Bridge) =====
    if (!memoryAvailable) {
      try {
        const { NativeModules } = require('react-native');
        if (NativeModules.MemoryInfo) {
          const nativeMemory = await NativeModules.MemoryInfo.getMemoryInfo();
          memoryInfo.totalJSHeapSize = nativeMemory.totalMemory;
          memoryInfo.usedJSHeapSize = nativeMemory.usedMemory;
          memoryInfo.jsHeapSizeLimit = nativeMemory.totalMemory;
          memoryInfo.method = 'native-module';
          memoryAvailable = true;
          console.log('✅ Using custom native module');
        }
      } catch (e) {
        console.log('⚠️ Custom native module not available');
      }
    }

    // ===== METHOD 4: Hermes Specific API =====
    if (!memoryAvailable && global.HermesInternal) {
      try {
        const hermesMemory = global.HermesInternal.getInstrumentedStats();
        if (hermesMemory) {
          // Hermes provides heap statistics
          memoryInfo.usedJSHeapSize = hermesMemory.js_numAllocatedBytes || 0;
          memoryInfo.totalJSHeapSize = hermesMemory.js_allocatedBytes || 0;
          memoryInfo.jsHeapSizeLimit = hermesMemory.js_heapSize || 0;
          memoryInfo.method = 'hermes-internal';
          memoryAvailable = true;
          console.log('✅ Using Hermes internal stats');
        }
      } catch (e) {
        console.log('⚠️ Hermes internal not available');
      }
    }

    // ===== METHOD 5: Estimate from Storage Size =====
    if (!memoryAvailable) {
      // Estimate based on storage usage and typical app overhead
      const storageSize = this.metrics.totalSize || 0;
      const baseMemory = 50 * 1024 * 1024; // 50 MB base
      const estimatedUsed = baseMemory + (storageSize * 2);
      const estimatedTotal = 512 * 1024 * 1024; // 512 MB estimate
      
      memoryInfo.usedJSHeapSize = estimatedUsed;
      memoryInfo.totalJSHeapSize = estimatedTotal;
      memoryInfo.jsHeapSizeLimit = estimatedTotal;
      memoryInfo.method = 'estimated';
      memoryInfo.warning = 'Memory values are estimated (native APIs unavailable)';
      memoryAvailable = true;
      console.log('⚠️ Using estimated memory values');
    }

    // Calculate percentages
    const memoryUsagePercent = memoryInfo.totalJSHeapSize > 0
      ? ((memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100).toFixed(2)
      : 0;

      
    this.metrics.memory = {
      ...memoryInfo,
      usedJSHeapSizeFormatted: this.formatBytes(memoryInfo.usedJSHeapSize),
      totalJSHeapSizeFormatted: this.formatBytes(memoryInfo.totalJSHeapSize),
      jsHeapSizeLimitFormatted: this.formatBytes(memoryInfo.jsHeapSizeLimit),
      memoryUsagePercent,
      available: memoryAvailable,
      warning: memoryInfo.warning || null
    };

    // Add to history
    if (memoryAvailable) {
      this.memoryUsageHistory.push({
        timestamp: Date.now(),
        used: memoryInfo.usedJSHeapSize,
        total: memoryInfo.totalJSHeapSize
      });

      if (this.memoryUsageHistory.length > 100) {
        this.memoryUsageHistory.shift();
      }
    }

    console.log('✅ Memory Profile:', {
      method: memoryInfo.method,
      available: memoryAvailable,
      used: this.metrics.memory.usedJSHeapSizeFormatted,
      total: this.metrics.memory.totalJSHeapSizeFormatted,
      usage: `${memoryUsagePercent}%`
    });

    return this.metrics.memory;
  } catch (error) {
    console.error('❌ Error profiling memory:', error);
    return { 
      error: error.message,
      available: false,
      warning: 'Memory profiling failed',
      usedJSHeapSizeFormatted: 'N/A',
      totalJSHeapSizeFormatted: 'N/A',
      memoryUsagePercent: 0
    };
  }
}

/**
 * Get process memory (Android specific)
 */
async getProcessMemoryAndroid() {
  if (Platform.OS !== 'android') return null;
  
  try {
    const { NativeModules } = require('react-native');
    
    // Try using built-in APIs
    const memoryClass = await NativeModules.PlatformConstants?.getConstants()?.memoryClass;
    
    return {
      memoryClass: memoryClass || 'unknown',
      available: !!memoryClass
    };
  } catch (e) {
    return null;
  }

}


  /**
   * Profile CPU Usage (approximation)
   */
  async profileCPU() {
    try {
      console.log('⚙️ Profiling CPU...');
      
      const startTime = Date.now();
      
      // Perform CPU-intensive operation to measure
      let iterations = 0;
      const testDuration = 100; // 100ms test
      const targetTime = startTime + testDuration;
      
      while (Date.now() < targetTime) {
        iterations++;
        // Simple calculation to simulate work
        Math.sqrt(iterations) * Math.random();
      }
      
      const endTime = Date.now();
      const actualDuration = endTime - startTime;
      
      // CPU score: higher iterations = better CPU performance
      const cpuScore = Math.round(iterations / testDuration);
      
      // Estimate CPU usage (rough approximation)
      // If it took longer than expected, CPU might be under load
      const expectedIterations = cpuScore * actualDuration;
      const cpuEfficiency = Math.min(100, ((iterations / expectedIterations) * 100)).toFixed(2);

      this.metrics.cpu = {
        timestamp: Date.now(),
        cpuScore,
        iterations,
        testDuration: actualDuration,
        cpuEfficiency: `${cpuEfficiency}%`,
        platform: Platform.OS,
        warning: 'CPU metrics are approximations in React Native'
      };

      // Add to history
      this.cpuUsageHistory.push({
        timestamp: Date.now(),
        score: cpuScore,
        efficiency: parseFloat(cpuEfficiency)
      });

      // Keep only last 100 readings
      if (this.cpuUsageHistory.length > 100) {
        this.cpuUsageHistory.shift();
      }

      console.log('✅ CPU Profile:', {
        score: cpuScore,
        efficiency: `${cpuEfficiency}%`,
        iterations
      });

      return this.metrics.cpu;
    } catch (error) {
      console.error('❌ Error profiling CPU:', error);
      return { 
        error: error.message,
        cpuScore: 'N/A',
        cpuEfficiency: 'N/A',
        warning: 'CPU profiling failed'
      };
    }
  }

  /**
   * Get performance mark (for CPU profiling)
   */
  getPerformanceMark() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  /**
   * Profile Frame Rate / UI Performance
   */
  async profileFrameRate(duration = 1000) {
    return new Promise((resolve) => {
      try {
        console.log('🎬 Profiling Frame Rate...');
        
        let frameCount = 0;
        const startTime = Date.now();
        let animationFrameId;
        
        const countFrame = () => {
          frameCount++;
          const elapsed = Date.now() - startTime;
          
          if (elapsed < duration) {
            animationFrameId = requestAnimationFrame(countFrame);
          } else {
            const fps = Math.round((frameCount / elapsed) * 1000);
            const result = {
              timestamp: Date.now(),
              fps,
              frameCount,
              duration: elapsed,
              performance: fps >= 55 ? 'Excellent' : fps >= 45 ? 'Good' : fps >= 30 ? 'Fair' : 'Poor',
              targetFPS: 60
            };
            
            this.metrics.performance = result;
            
            console.log('✅ Frame Rate Profile:', {
              fps,
              performance: result.performance
            });
            
            resolve(result);
          }
        };
        
        // Start counting frames
        if (typeof requestAnimationFrame !== 'undefined') {
          animationFrameId = requestAnimationFrame(countFrame);
        } else {
          // Fallback if requestAnimationFrame is not available
          resolve({
            timestamp: Date.now(),
            fps: 'N/A',
            frameCount: 0,
            duration: 0,
            performance: 'Unknown',
            targetFPS: 60,
            warning: 'requestAnimationFrame not available'
          });
        }
      } catch (error) {
        console.error('❌ Error profiling frame rate:', error);
        resolve({
          error: error.message,
          fps: 'N/A',
          warning: 'Frame rate profiling failed'
        });
      }
    });
  }

  /**
   * Start continuous performance monitoring
   */
  startMonitoring(intervalMs = 5000) {
    if (this.monitoringInterval) {
      console.log('⚠️ Monitoring already running');
      return;
    }

    console.log('🔄 Starting performance monitoring...');
    
    this.monitoringInterval = setInterval(async () => {
      await this.profileMemory();
      await this.profileCPU();
    }, intervalMs);

    console.log(`✅ Monitoring started (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop continuous performance monitoring
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Monitoring stopped');
    }
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends() {
    try {
      const memoryTrend = this.calculateTrend(this.memoryUsageHistory.map(h => h.used || 0));
      const cpuTrend = this.calculateTrend(this.cpuUsageHistory.map(h => h.score || 0));

      return {
        memory: {
          trend: memoryTrend,
          history: this.memoryUsageHistory.slice(-10), // Last 10 readings
          average: this.calculateAverage(this.memoryUsageHistory.map(h => h.used || 0)),
          peak: this.memoryUsageHistory.length > 0 
            ? Math.max(...this.memoryUsageHistory.map(h => h.used || 0))
            : 0
        },
        cpu: {
          trend: cpuTrend,
          history: this.cpuUsageHistory.slice(-10),
          average: this.calculateAverage(this.cpuUsageHistory.map(h => h.score || 0)),
          peak: this.cpuUsageHistory.length > 0
            ? Math.max(...this.cpuUsageHistory.map(h => h.score || 0))
            : 0
        }
      };
    } catch (error) {
      console.error('Error getting trends:', error);
      return {
        memory: { trend: 'insufficient data', history: [], average: 0, peak: 0 },
        cpu: { trend: 'insufficient data', history: [], average: 0, peak: 0 }
      };
    }
  }

  /**
   * Calculate trend (increasing, decreasing, stable)
   */
  calculateTrend(values) {
    if (values.length < 2) return 'insufficient data';
    
    const recent = values.slice(-5);
    const older = values.slice(-10, -5);
    
    if (older.length === 0) return 'insufficient data';
    
    const recentAvg = this.calculateAverage(recent);
    const olderAvg = this.calculateAverage(older);
    
    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    if (Math.abs(change) < 5) return 'stable';
    return change > 0 ? 'increasing' : 'decreasing';
  }

  /**
   * Calculate average
   */
  calculateAverage(values) {
    if (!values || values.length === 0) return 0;
    const validValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    if (validValues.length === 0) return 0;
    return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
  }

  /**
   * Profile AsyncStorage
   */
  async profileAsyncStorage() {
    try {
      console.log('📊 Profiling AsyncStorage...');
      const keys = await AsyncStorage.getAllKeys();
      const items = await AsyncStorage.multiGet(keys);
      
      let totalSize = 0;
      const itemDetails = {};

      items.forEach(([key, value]) => {
        const keySize = this.getByteSize(key);
        const valueSize = this.getByteSize(value || '');
        const itemSize = keySize + valueSize;
        
        totalSize += itemSize;
        
        itemDetails[key] = {
          keySize: this.formatBytes(keySize),
          valueSize: this.formatBytes(valueSize),
          totalSize: this.formatBytes(itemSize),
          valueLength: (value || '').length,
          valueType: this.detectValueType(value)
        };
      });

      this.metrics.asyncStorage = {
        itemCount: keys.length,
        totalSize: this.formatBytes(totalSize),
        totalSizeBytes: totalSize,
        items: itemDetails,
        keys: keys
      };

      console.log('✅ AsyncStorage Profile:', {
        itemCount: keys.length,
        totalSize: this.formatBytes(totalSize)
      });

      return this.metrics.asyncStorage;
    } catch (error) {
      console.error('❌ Error profiling AsyncStorage:', error);
      return null;
    }
  }

  /**
   * Profile EncryptedStorage
   */
  async profileEncryptedStorage() {
    try {
      console.log('🔐 Profiling EncryptedStorage...');
      
      const knownKeys = [
        'APP_KEY', 'OWNER_EMAIL', 'OWNER_MOBILE', 'OWNER_NAME',
        'LOGGED_IN_EMAIL', 'ACCESS_TOKEN', 'USER_ROLE',
        'AppOwnerInfo', 'CLIENT_APP_NAME'
      ];

      let totalSize = 0;
      const itemDetails = {};
      let successCount = 0;

      for (const key of knownKeys) {
        try {
          const value = await EncryptedStorage.getItem(key);
          if (value !== null && value !== undefined) {
            const keySize = this.getByteSize(key);
            const valueSize = this.getByteSize(value);
            const itemSize = keySize + valueSize;
            
            totalSize += itemSize;
            successCount++;
            
            itemDetails[key] = {
              keySize: this.formatBytes(keySize),
              valueSize: this.formatBytes(valueSize),
              totalSize: this.formatBytes(itemSize),
              valueLength: value.length,
              valueType: this.detectValueType(value),
              exists: true
            };
          } else {
            itemDetails[key] = { exists: false };
          }
        } catch (err) {
          itemDetails[key] = { exists: false, error: err.message };
        }
      }

      this.metrics.encryptedStorage = {
        itemCount: successCount,
        totalSize: this.formatBytes(totalSize),
        totalSizeBytes: totalSize,
        items: itemDetails,
        keys: knownKeys
      };

      console.log('✅ EncryptedStorage Profile:', {
        itemCount: successCount,
        totalSize: this.formatBytes(totalSize)
      });

      return this.metrics.encryptedStorage;
    } catch (error) {
      console.error('❌ Error profiling EncryptedStorage:', error);
      return null;
    }
  }

  /**
   * Detect value type
   */
  detectValueType(value) {
    if (!value) return 'null/undefined';
    
    try {
      JSON.parse(value);
      return 'JSON';
    } catch {
      if (value.includes('@')) return 'Email/String';
      if (!isNaN(value)) return 'Number/String';
      return 'String';
    }
  }

  /**
   * Get complete profile including performance metrics
   */
  async getCompleteProfile(includeFrameRate = false) {
    console.log('📊 Starting Complete Profile (Storage + Performance)...');
    
    // Storage profiling
    await this.profileAsyncStorage();
    await this.profileEncryptedStorage();
    
    // Performance profiling
    await this.profileMemory();
    await this.profileCPU();
    
    if (includeFrameRate) {
      await this.profileFrameRate();
    }
    
    this.metrics.totalSize = 
      (this.metrics.asyncStorage?.totalSizeBytes || 0) + 
      (this.metrics.encryptedStorage?.totalSizeBytes || 0);
    
    this.metrics.itemCount = 
      (this.metrics.asyncStorage?.itemCount || 0) + 
      (this.metrics.encryptedStorage?.itemCount || 0);
    
    this.metrics.lastProfileTime = new Date().toISOString();

    console.log('✅ Complete Profile:', {
      totalItems: this.metrics.itemCount,
      totalSize: this.formatBytes(this.metrics.totalSize),
      memoryUsed: this.metrics.memory.usedJSHeapSizeFormatted,
      cpuScore: this.metrics.cpu.cpuScore,
      fps: this.metrics.performance?.fps || 'N/A'
    });

    return this.metrics;
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    const { asyncStorage, encryptedStorage, totalSize, itemCount, memory, cpu, performance } = this.metrics;

    let report = '\n📊 === COMPLETE PERFORMANCE REPORT ===\n\n';
    
    report += `📅 Profile Time: ${new Date(this.metrics.lastProfileTime).toLocaleString()}\n`;
    report += `📱 Platform: ${Platform.OS}\n\n`;

    // Performance Metrics
    report += '--- PERFORMANCE METRICS ---\n';
    report += `🧠 Memory Used: ${memory.usedJSHeapSizeFormatted || 'N/A'}\n`;
    report += `🧠 Memory Total: ${memory.totalJSHeapSizeFormatted || 'N/A'}\n`;
    report += `🧠 Memory Usage: ${memory.memoryUsagePercent || 'N/A'}%\n`;
    report += `⚙️  CPU Score: ${cpu.cpuScore || 'N/A'}\n`;
    report += `⚙️  CPU Efficiency: ${cpu.cpuEfficiency || 'N/A'}\n`;
    if (performance.fps) {
      report += `🎬 FPS: ${performance.fps} (${performance.performance})\n`;
    }
    report += '\n';

    // Storage Metrics
    report += '--- STORAGE METRICS ---\n';
    report += `💾 Total Storage: ${this.formatBytes(totalSize)}\n`;
    report += `📦 Total Items: ${itemCount}\n\n`;

    // AsyncStorage
    report += '--- AsyncStorage ---\n';
    report += `Items: ${asyncStorage?.itemCount || 0}\n`;
    report += `Size: ${asyncStorage?.totalSize || '0 Bytes'}\n`;
    if (asyncStorage?.items) {
      report += 'Top 10 Largest Items:\n';
      const sortedItems = Object.entries(asyncStorage.items)
        .sort(([, a], [, b]) => {
          const aBytes = this.parseSize(a.totalSize);
          const bBytes = this.parseSize(b.totalSize);
          return bBytes - aBytes;
        })
        .slice(0, 10);
      
      sortedItems.forEach(([key, details]) => {
        report += `  • ${key}: ${details.totalSize} (${details.valueType})\n`;
      });
    }
    report += '\n';

    // EncryptedStorage
    report += '--- EncryptedStorage ---\n';
    report += `Items: ${encryptedStorage?.itemCount || 0}\n`;
    report += `Size: ${encryptedStorage?.totalSize || '0 Bytes'}\n`;
    if (encryptedStorage?.items) {
      report += 'Items:\n';
      Object.entries(encryptedStorage.items).forEach(([key, details]) => {
        if (details.exists) {
          report += `  • ${key}: ${details.totalSize} (${details.valueType})\n`;
        }
      });
    }
    report += '\n';

    // Performance Trends
    if (this.memoryUsageHistory.length > 0 || this.cpuUsageHistory.length > 0) {
      const trends = this.getPerformanceTrends();
      report += '--- PERFORMANCE TRENDS ---\n';
      report += `Memory Trend: ${trends.memory.trend}\n`;
      report += `CPU Trend: ${trends.cpu.trend}\n`;
      report += '\n';
    }

    report += '=== END REPORT ===\n';
    
    return report;
  }

  /**
   * Show comprehensive alert
   */
  async showStorageAlert() {
    const profile = await this.getCompleteProfile();
    const report = this.generateReport();
    
    console.log(report);
    
    Alert.alert(
      '📊 Performance Profile',
      `STORAGE:\n` +
      `Total: ${this.formatBytes(profile.totalSize)} (${profile.itemCount} items)\n` +
      `AsyncStorage: ${profile.asyncStorage?.itemCount || 0} items\n` +
      `EncryptedStorage: ${profile.encryptedStorage?.itemCount || 0} items\n\n` +
      `PERFORMANCE:\n` +
      `Memory: ${profile.memory?.usedJSHeapSizeFormatted || 'N/A'}\n` +
      `CPU Score: ${profile.cpu?.cpuScore || 'N/A'}\n\n` +
      `Check console for detailed report.`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Find performance bottlenecks
   */
  async findBottlenecks() {
    await this.getCompleteProfile();
    
    const bottlenecks = [];
    
    // Memory bottlenecks
    if (this.metrics.memory.memoryUsagePercent > 80) {
      bottlenecks.push({
        type: 'memory',
        severity: 'high',
        message: `Memory usage is ${this.metrics.memory.memoryUsagePercent}% - consider optimization`,
        value: this.metrics.memory.usedJSHeapSizeFormatted
      });
    }
    
    // CPU bottlenecks
    if (this.metrics.cpu.cpuEfficiency && parseFloat(this.metrics.cpu.cpuEfficiency) < 70) {
      bottlenecks.push({
        type: 'cpu',
        severity: 'medium',
        message: `CPU efficiency is low (${this.metrics.cpu.cpuEfficiency}) - possible background load`,
        value: this.metrics.cpu.cpuScore
      });
    }
    
    // Storage bottlenecks
    const largeItems = await this.findLargeItems(10);
    if (largeItems.length > 0) {
      bottlenecks.push({
        type: 'storage',
        severity: 'medium',
        message: `Found ${largeItems.length} storage items larger than 10KB`,
        items: largeItems.slice(0, 5)
      });
    }
    
    // FPS bottlenecks
    if (this.metrics.performance?.fps && this.metrics.performance.fps < 45) {
      bottlenecks.push({
        type: 'fps',
        severity: 'high',
        message: `Low frame rate detected: ${this.metrics.performance.fps} FPS`,
        value: this.metrics.performance.fps
      });
    }
    
    return bottlenecks;
  }

  /**
   * Find large storage items
   */
  async findLargeItems(thresholdKB = 10) {
    const thresholdBytes = thresholdKB * 1024;
    const largeItems = [];

    if (this.metrics.asyncStorage?.items) {
      Object.entries(this.metrics.asyncStorage.items).forEach(([key, details]) => {
        const sizeBytes = this.parseSize(details.totalSize);
        if (sizeBytes > thresholdBytes) {
          largeItems.push({
            storage: 'AsyncStorage',
            key,
            size: details.totalSize,
            sizeBytes,
            type: details.valueType
          });
        }
      });
    }

    if (this.metrics.encryptedStorage?.items) {
      Object.entries(this.metrics.encryptedStorage.items).forEach(([key, details]) => {
        if (details.exists) {
          const sizeBytes = this.parseSize(details.totalSize);
          if (sizeBytes > thresholdBytes) {
            largeItems.push({
              storage: 'EncryptedStorage',
              key,
              size: details.totalSize,
              sizeBytes,
              type: details.valueType
            });
          }
        }
      });
    }

    return largeItems.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  /**
   * Parse size string back to bytes
   */
  parseSize(sizeStr) {
    const units = { 'Bytes': 1, 'KB': 1024, 'MB': 1024*1024, 'GB': 1024*1024*1024 };
    const match = sizeStr.match(/^([\d.]+)\s*(\w+)$/);
    if (match) {
      return parseFloat(match[1]) * (units[match[2]] || 1);
    }
    return 0;
  }

  /**
   * Clear specific storage type
   */
  async clearStorage(storageType = 'async') {
    try {
      if (storageType === 'async') {
        await AsyncStorage.clear();
        console.log('✅ AsyncStorage cleared');
      } else if (storageType === 'encrypted') {
        await EncryptedStorage.clear();
        console.log('✅ EncryptedStorage cleared');
      } else if (storageType === 'all') {
        await AsyncStorage.clear();
        await EncryptedStorage.clear();
        console.log('✅ All storage cleared');
      }
      return { success: true };
    } catch (error) {
      console.error('❌ Error clearing storage:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Export complete performance data
   */
  async exportStorageData() {
    const profile = await this.getCompleteProfile();
    const trends = this.getPerformanceTrends();
    const bottlenecks = await this.findBottlenecks();
    
    const exportData = {
      timestamp: new Date().toISOString(),
      platform: Platform.OS,
      metrics: profile,
      trends,
      bottlenecks,
      report: this.generateReport()
    };
    
    console.log('📤 Complete Export:', JSON.stringify(exportData, null, 2));
    return exportData;
  }
}

// Export singleton instance
export default new StorageProfiler();