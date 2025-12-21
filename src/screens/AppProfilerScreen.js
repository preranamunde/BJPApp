import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Share
} from 'react-native';
import StorageProfiler from '../utils/StorageProfiler';
import { getCurrentUserRole } from '../../App';

const AppProfilerScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [largeItems, setLargeItems] = useState([]);
  const [bottlenecks, setBottlenecks] = useState([]);
  const [trends, setTrends] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    loadProfile();
    
    return () => {
      // Cleanup: stop monitoring when component unmounts
      StorageProfiler.stopMonitoring();
    };
  }, []);

  const checkAdminStatus = async () => {
    const userRole = await getCurrentUserRole();
    setIsAdmin(userRole.isAdmin);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const profile = await StorageProfiler.getCompleteProfile(false);
      setProfileData(profile);
      
      const large = await StorageProfiler.findLargeItems(5);
      setLargeItems(large);
      
      const issues = await StorageProfiler.findBottlenecks();
      setBottlenecks(issues);
      
      const performanceTrends = StorageProfiler.getPerformanceTrends();
      setTrends(performanceTrends);
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load storage profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleToggleMonitoring = () => {
    if (isMonitoring) {
      StorageProfiler.stopMonitoring();
      setIsMonitoring(false);
      Alert.alert('✅ Monitoring Stopped', 'Performance monitoring has been stopped');
    } else {
      StorageProfiler.startMonitoring(5000);
      setIsMonitoring(true);
      Alert.alert('✅ Monitoring Started', 'Performance monitoring every 5 seconds');
    }
  };

  const handleTestFrameRate = async () => {
    Alert.alert('⏱️ Testing FPS', 'Testing frame rate for 2 seconds...');
    try {
      const result = await StorageProfiler.profileFrameRate(2000);
      Alert.alert(
        '🎬 Frame Rate Test',
        `FPS: ${result.fps}\n` +
        `Performance: ${result.performance}\n` +
        `Frame Count: ${result.frameCount}\n` +
        `Duration: ${result.duration}ms`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to test frame rate');
    }
  };

  const handleClearStorage = (type) => {
    Alert.alert(
      '⚠️ Warning',
      `Are you sure you want to clear ${type === 'all' ? 'ALL' : type.toUpperCase()} storage?\n\nThis will log you out and reset the app.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            const result = await StorageProfiler.clearStorage(type);
            if (result.success) {
              Alert.alert('✅ Success', 'Storage cleared successfully', [
                { text: 'OK', onPress: () => navigation.replace('MainDrawer') }
              ]);
            }
          }
        }
      ]
    );
  };

  const handleExport = async () => {
    try {
      const exportData = await StorageProfiler.exportStorageData();
      const report = StorageProfiler.generateReport();
      
      Share.share({
        message: report,
        title: 'Performance Profile Report'
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const renderPerformanceCard = () => {
    if (!profileData?.memory && !profileData?.cpu) return null;

    const memory = profileData.memory;
    const cpu = profileData.cpu;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>⚡</Text>
          <Text style={styles.cardTitle}>Performance Metrics</Text>
        </View>
        
        <View style={styles.cardContent}>
          {/* Memory Section */}
          {memory && (
            <View style={styles.performanceSection}>
              <Text style={styles.performanceSectionTitle}>🧠 Memory</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Used:</Text>
                <Text style={styles.statValue}>
                  {memory.usedJSHeapSizeFormatted || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total:</Text>
                <Text style={styles.statValue}>
                  {memory.totalJSHeapSizeFormatted || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Usage:</Text>
                <Text style={[
                  styles.statValue,
                  memory.memoryUsagePercent > 80 && styles.warningValue
                ]}>
                  {memory.memoryUsagePercent || 0}%
                </Text>
              </View>

              {memory.warning && (
                <Text style={styles.warningText}>ℹ️ {memory.warning}</Text>
              )}

              {trends?.memory && trends.memory.trend !== 'insufficient data' && (
                <View style={styles.trendBox}>
                  <Text style={styles.trendLabel}>Trend:</Text>
                  <Text style={[
                    styles.trendValue,
                    trends.memory.trend === 'increasing' && styles.trendIncreasing,
                    trends.memory.trend === 'decreasing' && styles.trendDecreasing
                  ]}>
                    {trends.memory.trend === 'increasing' ? '📈' : 
                     trends.memory.trend === 'decreasing' ? '📉' : '➡️'} 
                    {' '}{trends.memory.trend}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* CPU Section */}
          {cpu && (
            <View style={styles.performanceSection}>
              <Text style={styles.performanceSectionTitle}>⚙️ CPU</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Score:</Text>
                <Text style={styles.statValue}>
                  {cpu.cpuScore || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Efficiency:</Text>
                <Text style={[
                  styles.statValue,
                  cpu.cpuEfficiency && parseFloat(cpu.cpuEfficiency) < 70 && styles.warningValue
                ]}>
                  {cpu.cpuEfficiency || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Iterations:</Text>
                <Text style={styles.statValue}>
                  {cpu.iterations ? cpu.iterations.toLocaleString() : 'N/A'}
                </Text>
              </View>

              {cpu.warning && (
                <Text style={styles.warningText}>ℹ️ {cpu.warning}</Text>
              )}

              {trends?.cpu && trends.cpu.trend !== 'insufficient data' && (
                <View style={styles.trendBox}>
                  <Text style={styles.trendLabel}>Trend:</Text>
                  <Text style={[
                    styles.trendValue,
                    trends.cpu.trend === 'increasing' && styles.trendIncreasing,
                    trends.cpu.trend === 'decreasing' && styles.trendDecreasing
                  ]}>
                    {trends.cpu.trend === 'increasing' ? '📈' : 
                     trends.cpu.trend === 'decreasing' ? '📉' : '➡️'} 
                    {' '}{trends.cpu.trend}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Frame Rate Section (if available) */}
          {profileData?.performance?.fps && (
            <View style={styles.performanceSection}>
              <Text style={styles.performanceSectionTitle}>🎬 Frame Rate</Text>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>FPS:</Text>
                <Text style={[
                  styles.statValue,
                  profileData.performance.fps < 45 && styles.warningValue
                ]}>
                  {profileData.performance.fps}
                </Text>
              </View>
              
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Performance:</Text>
                <Text style={styles.statValue}>
                  {profileData.performance.performance}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderBottlenecksCard = () => {
    if (!bottlenecks || bottlenecks.length === 0) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🚨</Text>
          <Text style={styles.cardTitle}>Performance Issues</Text>
        </View>
        
        <View style={styles.cardContent}>
          {bottlenecks.map((bottleneck, index) => (
            <View 
              key={index} 
              style={[
                styles.bottleneckItem,
                bottleneck.severity === 'high' && styles.bottleneckHigh,
                bottleneck.severity === 'medium' && styles.bottleneckMedium
              ]}
            >
              <View style={styles.bottleneckHeader}>
                <Text style={styles.bottleneckType}>
                  {bottleneck.type.toUpperCase()}
                </Text>
                <Text style={styles.bottleneckSeverity}>
                  {bottleneck.severity === 'high' ? '🔴' : '🟡'} 
                  {' '}{bottleneck.severity}
                </Text>
              </View>
              <Text style={styles.bottleneckMessage}>
                {bottleneck.message}
              </Text>
              {bottleneck.value && (
                <Text style={styles.bottleneckValue}>
                  Value: {bottleneck.value}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderStorageCard = (title, data, icon) => {
    if (!data) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Items:</Text>
            <Text style={styles.statValue}>{data.itemCount || 0}</Text>
          </View>
          
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Size:</Text>
            <Text style={styles.statValue}>{data.totalSize || '0 Bytes'}</Text>
          </View>

          {data.items && (
            <View style={styles.itemsList}>
              <Text style={styles.itemsTitle}>Stored Items:</Text>
              {Object.entries(data.items).slice(0, 5).map(([key, details]) => (
                details.exists !== false && (
                  <View key={key} style={styles.itemRow}>
                    <Text style={styles.itemKey} numberOfLines={1}>
                      {key}
                    </Text>
                    <Text style={styles.itemSize}>
                      {details.totalSize}
                    </Text>
                  </View>
                )
              ))}
              {Object.keys(data.items).length > 5 && (
                <Text style={styles.moreItems}>
                  +{Object.keys(data.items).length - 5} more items
                </Text>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderLargeItems = () => {
    if (!largeItems.length) return null;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>⚠️</Text>
          <Text style={styles.cardTitle}>Large Items ({'>'}5KB)</Text>
        </View>
        
        <View style={styles.cardContent}>
          {largeItems.map((item, index) => (
            <View key={index} style={styles.largeItem}>
              <View style={styles.largeItemHeader}>
                <Text style={styles.largeItemStorage}>{item.storage}</Text>
                <Text style={styles.largeItemSize}>{item.size}</Text>
              </View>
              <Text style={styles.largeItemKey}>{item.key}</Text>
              <Text style={styles.largeItemType}>{item.type}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  if (!isAdmin) {
    return (
      <View style={styles.container}>
        <View style={styles.accessDenied}>
          <Text style={styles.accessDeniedIcon}>🔒</Text>
          <Text style={styles.accessDeniedText}>
            Admin Access Required
          </Text>
          <Text style={styles.accessDeniedSubtext}>
            Only administrators can access the app profiler
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading && !profileData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading complete profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={['#e16e2b']}
        />
      }
    >
      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>📊 Complete System Profile</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryLabel}>Storage</Text>
            <Text style={styles.summaryValue}>
              {profileData ? StorageProfiler.formatBytes(profileData.totalSize) : '0 Bytes'}
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryLabel}>Memory</Text>
            <Text style={styles.summaryValue}>
              {profileData?.memory?.memoryUsagePercent || 0}%
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryLabel}>CPU Score</Text>
            <Text style={styles.summaryValue}>
              {profileData?.cpu?.cpuScore || 'N/A'}
            </Text>
          </View>
        </View>
        <Text style={styles.summaryTime}>
          Last updated: {profileData?.lastProfileTime ? 
            new Date(profileData.lastProfileTime).toLocaleString() : 'Never'}
        </Text>
        
        {isMonitoring && (
          <View style={styles.monitoringBadge}>
            <Text style={styles.monitoringText}>
              🔄 Monitoring Active
            </Text>
          </View>
        )}
      </View>

      {/* Performance Card */}
      {renderPerformanceCard()}

      {/* Bottlenecks Card */}
      {renderBottlenecksCard()}

      {/* Storage Cards */}
      {renderStorageCard('AsyncStorage', profileData?.asyncStorage, '💾')}
      {renderStorageCard('EncryptedStorage', profileData?.encryptedStorage, '🔐')}
      {renderLargeItems()}

      {/* Action Buttons */}
      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>🛠️ Actions</Text>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleRefresh}
        >
          <Text style={styles.actionButtonText}>🔄 Refresh Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isMonitoring && styles.activeMonitoring]}
          onPress={handleToggleMonitoring}
        >
          <Text style={styles.actionButtonText}>
            {isMonitoring ? '⏸️ Stop Monitoring' : '▶️ Start Monitoring'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleTestFrameRate}
        >
          <Text style={styles.actionButtonText}>🎬 Test Frame Rate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleExport}
        >
          <Text style={styles.actionButtonText}>📤 Export Report</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          style={[styles.actionButton, styles.warningButton]}
          onPress={() => handleClearStorage('async')}
        >
          <Text style={styles.actionButtonText}>🗑️ Clear AsyncStorage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.warningButton]}
          onPress={() => handleClearStorage('encrypted')}
        >
          <Text style={styles.actionButtonText}>🗑️ Clear EncryptedStorage</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.dangerButton]}
          onPress={() => handleClearStorage('all')}
        >
          <Text style={styles.actionButtonText}>⚠️ Clear ALL Storage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  accessDeniedIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  backButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e16e2b',
  },
  summaryTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  monitoringBadge: {
    backgroundColor: '#4caf50',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginTop: 10,
    alignSelf: 'center',
  },
  monitoringText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  cardContent: {
    padding: 15,
  },
  performanceSection: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  performanceSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  warningValue: {
    color: '#dc3545',
  },
  warningText: {
    fontSize: 12,
    color: '#856404',
    backgroundColor: '#fff3cd',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  trendBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
  },
  trendLabel: {
    fontSize: 14,
    color: '#666',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  trendIncreasing: {
    color: '#dc3545',
  },
  trendDecreasing: {
    color: '#28a745',
  },
  bottleneckItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  bottleneckHigh: {
    backgroundColor: '#f8d7da',
    borderLeftColor: '#dc3545',
  },
  bottleneckMedium: {
    backgroundColor: '#fff3cd',
    borderLeftColor: '#ffc107',
  },
  bottleneckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  bottleneckType: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  bottleneckSeverity: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  bottleneckMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
  },
  bottleneckValue: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  itemsList: {
    marginTop: 15,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
    marginBottom: 5,
  },
  itemKey: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  itemSize: {
    fontSize: 13,
    color: '#e16e2b',
    fontWeight: '500',
  },
  moreItems: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 5,
    textAlign: 'center',
  },
  largeItem: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  largeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  largeItemStorage: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '600',
  },
  largeItemSize: {
    fontSize: 12,
    color: '#e16e2b',
    fontWeight: 'bold',
  },
  largeItemKey: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  largeItemType: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  actionsCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  actionButton: {
    backgroundColor: '#e16e2b',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  activeMonitoring: {
    backgroundColor: '#4caf50',
  },
  warningButton: {
    backgroundColor: '#ffc107',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  bottomSpacer: {
    height: 30,
  },
});

export default AppProfilerScreen;