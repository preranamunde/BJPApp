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

  // FIXED: Updated grievance count API calls based on Postman collection
  const fetchGrievanceCounts = async (userInfo) => {
    // Based on Postman collection, these are the correct request types and approach
    const requestTypes = [
      { type: 'Appeal', key: 'APPEAL' },
      { type: 'Grievance', key: 'GRIEVANCE' }, 
      { type: 'Complaints', key: 'COMPLAINTS' }
    ];
    const counts = {};

    try {
      const headers = await getAuthHeaders();
      const baseUrl = await ConfigService.getBaseUrl();

      for (const { type, key } of requestTypes) {
        try {
          const encodedMobile = encodeURIComponent(userInfo.leaderMobile);
          const encodedEmail = encodeURIComponent(userInfo.userEmail);
          
          // FIXED: Use the correct API endpoint structure from Postman
          // Option 1: Try countstatus endpoint with request_type and status (as shown in Postman)
          const encodedRequestType = encodeURIComponent(type);
          const encodedStatus = encodeURIComponent('Open');
          
          const apiUrl = `${baseUrl}/api/grievances/countstatus?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&request_type=${encodedRequestType}&status=${encodedStatus}`;
          
          console.log(`📊 Fetching ${type} count from:`, apiUrl);

          const response = await fetch(apiUrl, {
            method: 'GET',
            headers: headers,
          });

          const responseText = await response.text();
          console.log(`${type} Count API Response:`, responseText);

          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch (parseError) {
            console.error(`Failed to parse ${type} count response:`, parseError);
            counts[key] = 0;
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
            } else if (responseData.message && responseData.message.includes('Status: Open')) {
              // Parse count from message like "Request Type: Appeal/Grievance/Complaints, Status: Open"
              // Look for a count field in the response
              count = responseData.count || 0;
            }

            counts[key] = count || 0;
            console.log(`✅ ${type} count:`, count);
          } else {
            console.error(`❌ Failed to fetch ${type} count:`, response.status, responseData);
            counts[key] = 0;
          }
        } catch (error) {
          console.error(`❌ Error fetching ${type} count:`, error);
          counts[key] = 0;
        }
      }

      return counts;
    } catch (error) {
      console.error('❌ Error in fetchGrievanceCounts:', error);
      return { APPEAL: 0, GRIEVANCE: 0, COMPLAINTS: 0 };
    }
  };

  // FIXED: Updated appointment count API call
  const fetchAppointmentCount = async (userInfo) => {
    try {
      const headers = await getAuthHeaders();
      const baseUrl = await ConfigService.getBaseUrl();

      const encodedMobile = encodeURIComponent(userInfo.leaderMobile);
      const encodedEmail = encodeURIComponent(userInfo.userEmail);
      
      // FIXED: Try both approaches - first countstatus with Open status, then fallback to count
      let apiUrl = `${baseUrl}/api/appointments/countstatus?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&status=Open`;
      
      console.log('📊 Fetching appointment count (with Open status) from:', apiUrl);

      let response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });

      let responseText = await response.text();
      console.log('Appointment Count (Open) API Response:', responseText);

      if (!response.ok) {
        // Fallback to total count API
        console.log('⚠️ Trying fallback - total appointment count API...');
        apiUrl = `${baseUrl}/api/appointments/count?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}`;
        
        console.log('📊 Fetching total appointment count from:', apiUrl);
        
        response = await fetch(apiUrl, {
          method: 'GET',
          headers: headers,
        });
        
        responseText = await response.text();
        console.log('Total Appointment Count API Response:', responseText);
      }

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

        console.log('✅ Appointment count:', count);
        return count || 0;
      } else {
        console.error('❌ Failed to fetch appointment count:', response.status, responseData);
        return 0;
      }
    } catch (error) {
      console.error('❌ Error fetching appointment count:', error);
      return 0;
    }
  };

  // ALTERNATIVE: If the above doesn't work, try the combined approach
  const fetchGrievanceCountsAlternative = async (userInfo) => {
    try {
      const headers = await getAuthHeaders();
      const baseUrl = await ConfigService.getBaseUrl();

      const encodedMobile = encodeURIComponent(userInfo.leaderMobile);
      const encodedEmail = encodeURIComponent(userInfo.userEmail);
      
      // Try the combined request_type approach from Postman
      const encodedRequestType = encodeURIComponent('Appeal/Grievance/Complaints');
      const encodedStatus = encodeURIComponent('Open');
      
      const apiUrl = `${baseUrl}/api/grievances/countstatus?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&request_type=${encodedRequestType}&status=${encodedStatus}`;
      
      console.log('📊 Fetching combined grievance count from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: headers,
      });

      const responseText = await response.text();
      console.log('Combined Grievance Count API Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse combined grievance count response:', parseError);
        return { APPEAL: 0, GRIEVANCE: 0, COMPLAINTS: 0 };
      }

      if (response.ok) {
        // Extract total count and distribute evenly or use as total
        let totalCount = 0;
        if (typeof responseData === 'number') {
          totalCount = responseData;
        } else if (responseData.count !== undefined) {
          totalCount = responseData.count;
        } else if (responseData.data !== undefined) {
          totalCount = responseData.data;
        } else if (responseData.total !== undefined) {
          totalCount = responseData.total;
        }

        console.log('✅ Combined grievance count:', totalCount);
        
        // For now, distribute the total count among the three types
        // In a real app, you might want to make separate API calls or modify the backend
        const distributedCount = Math.floor(totalCount / 3);
        const remainder = totalCount % 3;
        
        return {
          APPEAL: distributedCount + (remainder > 0 ? 1 : 0),
          GRIEVANCE: distributedCount + (remainder > 1 ? 1 : 0),
          COMPLAINTS: distributedCount
        };
      } else {
        console.error('❌ Failed to fetch combined grievance count:', response.status, responseData);
        return { APPEAL: 0, GRIEVANCE: 0, COMPLAINTS: 0 };
      }
    } catch (error) {
      console.error('❌ Error in fetchGrievanceCountsAlternative:', error);
      return { APPEAL: 0, GRIEVANCE: 0, COMPLAINTS: 0 };
    }
  };

  const loadUserInfoAndCounts = async () => {
    setLoading(true);
    try {
      const userInfoData = await getUserInfo();
      
      if (!userInfoData.leaderMobile || !userInfoData.userEmail) {
        console.log('❌ Missing user info, cannot fetch counts');
        setCounts({ APPEAL: 0, APPOINTMENT: 0, GRIEVANCE: 0, COMPLAINTS: 0 });
        return;
      }

      console.log('📊 Starting to fetch counts...');

      // Fetch counts in parallel - try primary approach first
      let grievanceCounts;
      try {
        grievanceCounts = await fetchGrievanceCounts(userInfoData);
      } catch (error) {
        console.log('⚠️ Primary grievance count approach failed, trying alternative...');
        grievanceCounts = await fetchGrievanceCountsAlternative(userInfoData);
      }

      const appointmentCount = await fetchAppointmentCount(userInfoData);

      const finalCounts = {
        ...grievanceCounts,
        APPOINTMENT: appointmentCount
      };

      console.log('✅ Final counts:', finalCounts);
      setCounts(finalCounts);

    } catch (error) {
      console.error('❌ Error loading dashboard counts:', error);
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