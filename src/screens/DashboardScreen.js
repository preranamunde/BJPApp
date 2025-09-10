import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useFocusEffect } from '@react-navigation/native';
import ConfigService from '../services/ConfigService';

const DashboardScreen = ({ navigation }) => {
  const [counts, setCounts] = useState({
    APPEAL: 0,
    APPOINTMENT: 0,
    GRIEVANCE: 0,
    COMPLAINTS: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userInfo, setUserInfo] = useState({
    leaderMobile: '',
    userEmail: ''
  });

  // Load counts when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserInfoAndCounts();
    }, [])
  );

  const getUserInfo = async () => {
    try {
      console.log('🔍 === GETTING USER INFO FOR DASHBOARD ===');
      
      let leaderMobile = '';
      
      // Try AsyncStorage first
      try {
        const appOwnerInfo = await AsyncStorage.getItem('appOwnerInfo');
        if (appOwnerInfo) {
          const ownerInfo = JSON.parse(appOwnerInfo);
          const mobileFields = ['client_mobile', 'mobile', 'mobile_no', 'phone', 'contact'];
          for (const field of mobileFields) {
            if (ownerInfo[field]) {
              leaderMobile = String(ownerInfo[field]).trim();
              break;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Error reading AppOwnerInfo from AsyncStorage:', error.message);
      }

      // Try EncryptedStorage if no mobile found
      if (!leaderMobile) {
        try {
          const encryptedAppOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
          if (encryptedAppOwnerInfo) {
            const ownerInfo = JSON.parse(encryptedAppOwnerInfo);
            const mobileFields = ['client_mobile', 'mobile', 'mobile_no', 'phone', 'contact'];
            for (const field of mobileFields) {
              if (ownerInfo[field]) {
                leaderMobile = String(ownerInfo[field]).trim();
                break;
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Error reading AppOwnerInfo from EncryptedStorage:', error.message);
        }
      }

      // Try direct owner mobile storage
      if (!leaderMobile) {
        try {
          leaderMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '';
        } catch (error) {
          console.log('⚠️ Error reading OWNER_MOBILE:', error.message);
        }
      }

      // Get user email
      let userEmail = '';
      try {
        userEmail = await AsyncStorage.getItem('userEmail') || 
                   await AsyncStorage.getItem('user_email') || 
                   await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || '';
      } catch (error) {
        console.log('⚠️ Error reading user email:', error.message);
      }

      const userInfoData = {
        leaderMobile: leaderMobile || '',
        userEmail: userEmail || ''
      };

      setUserInfo(userInfoData);
      
      console.log('✅ Dashboard User Info:', {
        leaderMobile: leaderMobile || '(EMPTY)',
        userEmail: userEmail || '(EMPTY)'
      });

      return userInfoData;
      
    } catch (error) {
      console.error('❌ Error getting user info for dashboard:', error);
      return { leaderMobile: '', userEmail: '' };
    }
  };

  const getAuthHeaders = async () => {
    try {
      const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                         await AsyncStorage.getItem('jwt_token') ||
                         await EncryptedStorage.getItem('ACCESS_TOKEN');

      const appKey = await EncryptedStorage.getItem('APP_KEY');

      if (!accessToken || !appKey) {
        throw new Error('Missing authentication credentials');
      }

      return {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-app-key': appKey,
      };
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw error;
    }
  };

  const fetchGrievanceCounts = async (userInfo) => {
    const requestTypes = ['Appeal', 'Grievance', 'Complaints'];
    const counts = {};

    try {
      const headers = await getAuthHeaders();
      const baseUrl = await ConfigService.getBaseUrl();

      for (const requestType of requestTypes) {
        try {
          const encodedMobile = encodeURIComponent(userInfo.leaderMobile);
          const encodedEmail = encodeURIComponent(userInfo.userEmail);
          const encodedRequestType = encodeURIComponent(requestType);
          
          const apiUrl = `${baseUrl}/api/grievances/count?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&request_type=${encodedRequestType}&status=Open`;
          
          console.log(`Fetching ${requestType} count from:`, apiUrl);

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers,
          });

          const responseText = await response.text();
          console.log(`${requestType} Count API Response:`, responseText);

          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error(`Failed to parse ${requestType} count response:`, parseError);
            counts[requestType.toUpperCase()] = 0;
            continue;
          }

          if (response.ok) {
            // Extract count from different possible response structures
            let count = 0;
            if (typeof responseData === 'number') {
              count = responseData;
            } else if (responseData.count !== undefined) {
              count = responseData.count;
            } else if (responseData.data !== undefined) {
              count = responseData.data;
            } else if (responseData.total !== undefined) {
              count = responseData.total;
            }

            counts[requestType.toUpperCase()] = count || 0;
            console.log(`${requestType} count:`, count);
          } else {
            console.error(`Failed to fetch ${requestType} count:`, response.status, responseData);
            counts[requestType.toUpperCase()] = 0;
          }
        } catch (error) {
          console.error(`Error fetching ${requestType} count:`, error);
          counts[requestType.toUpperCase()] = 0;
        }
      }

      return counts;
    } catch (error) {
      console.error('Error in fetchGrievanceCounts:', error);
      return { APPEAL: 0, GRIEVANCE: 0, COMPLAINTS: 0 };
    }
  };

  const fetchAppointmentCount = async (userInfo) => {
    try {
      const headers = await getAuthHeaders();
      const baseUrl = await ConfigService.getBaseUrl();

      const encodedMobile = encodeURIComponent(userInfo.leaderMobile);
      const encodedEmail = encodeURIComponent(userInfo.userEmail);
      
      const apiUrl = `${baseUrl}/api/appointments/count?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}`;
      
      console.log('Fetching appointment count from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });

      const responseText = await response.text();
      console.log('Appointment Count API Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse appointment count response:', parseError);
        return 0;
      }

      if (response.ok) {
        // Extract count from different possible response structures
        let count = 0;
        if (typeof responseData === 'number') {
          count = responseData;
        } else if (responseData.count !== undefined) {
          count = responseData.count;
        } else if (responseData.data !== undefined) {
          count = responseData.data;
        } else if (responseData.total !== undefined) {
          count = responseData.total;
        }

        console.log('Appointment count:', count);
        return count || 0;
      } else {
        console.error('Failed to fetch appointment count:', response.status, responseData);
        return 0;
      }
    } catch (error) {
      console.error('Error fetching appointment count:', error);
      return 0;
    }
  };

  const loadUserInfoAndCounts = async () => {
    setLoading(true);
    try {
      const userInfoData = await getUserInfo();
      
      if (!userInfoData.leaderMobile || !userInfoData.userEmail) {
        console.log('Missing user info, cannot fetch counts');
        setCounts({ APPEAL: 0, APPOINTMENT: 0, GRIEVANCE: 0, COMPLAINTS: 0 });
        return;
      }

      // Fetch counts in parallel
      const [grievanceCounts, appointmentCount] = await Promise.all([
        fetchGrievanceCounts(userInfoData),
        fetchAppointmentCount(userInfoData)
      ]);

      setCounts({
        ...grievanceCounts,
        APPOINTMENT: appointmentCount
      });

    } catch (error) {
      console.error('Error loading dashboard counts:', error);
      Alert.alert('Error', 'Failed to load dashboard counts. Please try again.');
      setCounts({ APPEAL: 0, APPOINTMENT: 0, GRIEVANCE: 0, COMPLAINTS: 0 });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserInfoAndCounts();
    setRefreshing(false);
  };

  const handleGridItemPress = (type) => {
    navigation.navigate('Samvad', {
      initialTab: type,
      initialSubTab: 'PREVIEW'
    });
  };

  const renderGridItem = (title, count, onPress) => (
    <TouchableOpacity
      key={title}
      style={styles.gridItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.gridTitle}>{title}</Text>
      {loading ? (
        <ActivityIndicator size="small" color="#e16e2b" />
      ) : (
        <Text style={styles.gridCount}>{count}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ 
              uri: 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180' 
            }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>Dr. Sanjay Jaiswal</Text>
        <Text style={styles.degree}>MBBS, MD</Text>
        <View style={styles.positionCard}>
          <Text style={styles.position}>Member of Parliament</Text>
          <Text style={styles.constituency}>Paschim Champaran (Lok Sabha), Bihar</Text>
        </View>
      </View>

      {/* Dashboard Action Boxes */}
      <View style={styles.gridContainer}>
        <View style={styles.row}>
          {renderGridItem(
            'APPEAL', 
            counts.APPEAL, 
            () => handleGridItemPress('APPEAL')
          )}
          {renderGridItem(
            'APPOINTMENT', 
            counts.APPOINTMENT, 
            () => handleGridItemPress('APPOINTMENT')
          )}
        </View>

        <View style={styles.row}>
          {renderGridItem(
            'GRIEVANCE', 
            counts.GRIEVANCE, 
            () => handleGridItemPress('GRIEVANCE')
          )}
          {renderGridItem(
            'COMPLAINTS', 
            counts.COMPLAINTS, 
            () => handleGridItemPress('COMPLAINTS')
          )}
        </View>
      </View>

      {/* Debug Info (Remove in production) */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>Debug Info:</Text>
          <Text style={styles.debugText}>Mobile: {userInfo.leaderMobile || 'Not found'}</Text>
          <Text style={styles.debugText}>Email: {userInfo.userEmail || 'Not found'}</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileImageContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 5,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  degree: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 15,
  },
  positionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  constituency: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 2,
  },

  // Grid Styles
  gridContainer: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 5,
    paddingVertical: 25,
    borderRadius: 15,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 12,
    textAlign: 'center',
  },
  gridCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e16e2b',
  },

  // Debug Styles (Remove in production)
  debugContainer: {
    margin: 20,
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
});

export default DashboardScreen;