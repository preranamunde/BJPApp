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
  Modal,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useFocusEffect } from '@react-navigation/native';
import ConfigService from '../services/ConfigService';
import { launchImageLibrary } from 'react-native-image-picker';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';
import ApiService from '../services/ApiService';
import Icon from 'react-native-vector-icons/MaterialIcons';


// ============================================
// THREE DOT MENU COMPONENT (Reusable)
// ============================================
const ThreeDotMenu = ({ visible, position, onEdit, onDelete, onDismiss }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={onDismiss}
      >
        <View style={[styles.dropdownMenu, {
          top: position.y,
          left: position.x - 120,
        }]}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownItemIcon}>✏️</Text>
            <Text style={styles.dropdownItemText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.dropdownSeparator} />
          
          <TouchableOpacity 
            style={[styles.dropdownItem, styles.dropdownDeleteItem]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownItemIcon}>🗑️</Text>
            <Text style={[styles.dropdownItemText, styles.dropdownDeleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// ============================================
// EDIT DASHBOARD BANNER MODAL COMPONENT
// ============================================
const EditDashboardBannerModal = ({ visible, item, onClose, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) { 
      setSelectedImage(null);
    }
  }, [item]);

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        console.log('Dashboard banner image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select a new banner image');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: item.media_header || '',
        media_narration: item.media_narration || '',
        media_url: item.media_url || '',
        media_type: 'Home',
        media_file: selectedImage,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update dashboard banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Dashboard Banner</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Dashboard Banner Image</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Banner Image' : 'Select New Banner Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageInfoText}>
                  {selectedImage.fileName || 'New banner image selected'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Banner</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add New Dashboard Banner Modal Component
const AddDashboardBannerModal = ({ visible, onClose, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedImage(null);
    }
  }, [visible]);

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        console.log('Image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedImage);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add dashboard banner');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Dashboard Banner</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Dashboard Banner Image *</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Choose Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageInfoText}>
                  {selectedImage.fileName || 'Image selected'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Add Banner</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


const DashboardBannerImage = React.memo(({ 
  item, 
  index, 
  memberId,
  onEdit,
  onDelete,
  isAdmin
}) => {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    
    const loadDashboardBannerImage = async () => {
      if (!item.media_file) {
        console.log('⚠️ No media_file for dashboard banner:', item._id);
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setImageError(false);
      
      try {
        const currentUserInfo = await getCurrentUserRole();
        const userEmailId = currentUserInfo.loggedin_email || '';
        
        let mediaUrl = item.media_file;
        
        // Handle different URL formats
        if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          // Handle ngrok URL with port
          if (mediaUrl.includes('ngrok-free.app:')) {
            mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
          }
          
          // Handle localhost URLs
          if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
            const baseUrl = await ConfigService.getBaseUrl();
            mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          }
        } else {
          // Construct full URL from relative path
          const baseUrl = await ConfigService.getBaseUrl();
          const cleanMediaFile = mediaUrl.replace(/^[\\\/]+/, '');
          const encodedMediaFile = encodeURIComponent(cleanMediaFile);
          const encodedEmail = encodeURIComponent(userEmailId);
          
          mediaUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${memberId}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
        }
        
        // Get auth headers
        const appKey = await EncryptedStorage.getItem('APP_KEY');
        const accessToken = await EncryptedStorage.getItem('ACCESS_TOKEN') ||
                           await AsyncStorage.getItem('userAccessToken') ||
                           await AsyncStorage.getItem('jwt_token');
        
        console.log('📊 Fetching dashboard banner from:', mediaUrl);
        
        // Fetch as blob and convert to base64
        const response = await fetch(mediaUrl, {
          method: 'GET',
          headers: {
            'x-app-key': appKey || '',
            'Authorization': `Bearer ${accessToken || ''}`,
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'image/*',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Convert blob to base64 using FileReader
        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (mounted) {
            setImageUri(reader.result); // Base64 data URL
            setLoading(false);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          if (mounted) {
            setImageError(true);
            setLoading(false);
          }
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('❌ Error loading Dashboard banner image:', error);
        if (mounted) {
          setImageError(true);
          setLoading(false);
        }
      }
    };
    
    loadDashboardBannerImage();
    
    return () => {
      mounted = false;
    };
  }, [item.media_file, memberId]);

  const handleMenuPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY + 10 });
    setMenuVisible(true);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit(item);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Dashboard Banner',
      'Are you sure you want to delete this banner?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => onDelete(item),
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.dashboardMediaItem}>
      {/* Three Dot Menu Button - Only show for admin */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.dashboardMediaMenuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.dashboardMediaMenuIcon}>⋮</Text>
        </TouchableOpacity>
      )}

      <ThreeDotMenu
        visible={menuVisible}
        position={menuPosition}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDismiss={() => setMenuVisible(false)}
      />

      {loading && (
        <View style={styles.dashboardMediaLoadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
        </View>
      )}

      {!loading && imageError && (
        <View style={styles.dashboardMediaErrorContainer}>
          <Text style={styles.dashboardMediaErrorIcon}>📷</Text>
          <Text style={styles.dashboardMediaErrorText}>Image unavailable</Text>
        </View>
      )}

      {/* ✅ UPDATED: Clickable Image that opens media_url */}
      {!loading && !imageError && imageUri && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.media_url && item.media_url.trim() !== '') {
              Linking.openURL(item.media_url).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the link');
              });
            } else {
              Alert.alert('Info', 'No URL available for this banner');
            }
          }}
        >
          <Image 
            source={{ uri: imageUri }}
            style={styles.dashboardMediaImage} 
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});


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
// Dashboard Banner States
const [dashboardBannersData, setDashboardBannersData] = useState([]);
const [dashboardBannersLoading, setDashboardBannersLoading] = useState(false);
const [editBannerModalVisible, setEditBannerModalVisible] = useState(false);
const [selectedBanner, setSelectedBanner] = useState(null);

// Role-based Access States
const [isAdmin, setIsAdmin] = useState(false);
const [userRole, setUserRole] = useState('user');
const [isLoggedIn, setIsLoggedIn] = useState(false);
// ADD THIS LINE with your other dashboard banner states:
const [addBannerModalVisible, setAddBannerModalVisible] = useState(false);

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

  // 👇 ADD THIS FUNCTION after getUserInfo
const checkAdminRole = async () => {
  try {
    console.log('🔍 === CHECKING ADMIN ROLE IN DASHBOARD ===');
    
    // Use the enhanced function from App.js
    const adminCheck = await checkIfCurrentUserIsAdmin();
    const currentRole = await getCurrentUserRole();
    
    console.log('👤 Dashboard User Role:', currentRole);
    console.log('👑 Dashboard Admin Check:', adminCheck);
    
    // Update state with role information
    setIsAdmin(adminCheck.isAdmin);
    setUserRole(currentRole.userRole);
    setIsLoggedIn(currentRole.isLoggedIn);
    
    console.log('✅ Dashboard role check completed:', {
      isAdmin: adminCheck.isAdmin,
      userRole: currentRole.userRole,
      isLoggedIn: currentRole.isLoggedIn,
    });
    
    return adminCheck.isAdmin;
    
  } catch (error) {
    console.error('❌ Error checking admin role in dashboard:', error);
    setIsAdmin(false);
    setUserRole('user');
    setIsLoggedIn(false);
    return false;
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
  // 👇 ADD THIS FUNCTION after getAuthHeaders
// ✅ Fetch Dashboard Banners with media_type = Dashboard
// ✅ UPDATE THIS FUNCTION (around line 230)
const fetchDashboardBanners = async (memberIdentifier, userEmailId) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();

    // ✅ CHANGE THIS: media_type=Dashboard (NOT Home)
    const url = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(
      memberIdentifier
    )}&user_email_id=${encodeURIComponent(
      userEmailId
    )}&media_type=Dashboard`; // ⬅️ CHANGED FROM Home TO Dashboard

    console.log("📊 Fetching Dashboard banners from:", url);

    const result = await ApiService.authGet(url);

    if (result?.success && Array.isArray(result.data)) {
      return { success: true, data: result.data };
    }

    return { success: true, data: [] };
  } catch (error) {
    console.error("❌ Dashboard banners error:", error);
    return { success: false, data: [] };
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

 // 👇 REPLACE EXISTING loadUserInfoAndCounts FUNCTION
const loadUserInfoAndCounts = async () => {
  setLoading(true);
  try {
    // 👑 STEP 1: Check admin role FIRST
    console.log('👑 Checking admin role...');
    await checkAdminRole();
    
    // STEP 2: Get user info
    const userInfoData = await getUserInfo();
    
    if (!userInfoData.leaderMobile || !userInfoData.userEmail) {
      console.log('❌ Missing user info, cannot fetch data');
      setCounts({ APPEAL: 0, APPOINTMENT: 0, GRIEVANCE: 0, COMPLAINTS: 0 });
      setDashboardBannersData([]);
      return;
    }

    console.log('📊 Starting to fetch dashboard data...');

    // 📸 STEP 3: Fetch dashboard banners
    setDashboardBannersLoading(true);
    const dashboardBanners = await fetchDashboardBanners(
      userInfoData.leaderMobile, 
      userInfoData.userEmail
    );
    
    if (dashboardBanners.success && dashboardBanners.data) {
      setDashboardBannersData(dashboardBanners.data);
      console.log('✅ Dashboard banners set:', dashboardBanners.data.length);
    } else {
      setDashboardBannersData([]);
    }
    setDashboardBannersLoading(false);

    // 📊 STEP 4: Fetch counts in parallel
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

    console.log('✅ Final dashboard data loaded:', {
      banners: dashboardBannersData.length,
      counts: finalCounts
    });
    setCounts(finalCounts);

  } catch (error) {
    console.error('❌ Error loading dashboard data:', error);
    Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    setCounts({ APPEAL: 0, APPOINTMENT: 0, GRIEVANCE: 0, COMPLAINTS: 0 });
    setDashboardBannersData([]);
  } finally {
    setLoading(false);
  }
};

// 👇 ADD THESE CRUD HANDLER FUNCTIONS

// 👑 ADMIN ONLY: Handle Edit Banner
const handleEditDashboardBanner = (item) => {
  console.log('✏️ Admin editing dashboard banner:', item._id);
  setSelectedBanner(item);
  setEditBannerModalVisible(true);
};

// 👑 ADMIN ONLY: Handle Save Banner
// ✅ UPDATE THIS FUNCTION (around line 670)
const handleSaveDashboardBanner = async (updatedData) => {
  try {
    console.log('💾 Admin saving dashboard banner...');
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('regd_mobile_no', userInfo.leaderMobile);
    formData.append('user_email_id', userInfo.userEmail);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url);
    formData.append('media_type', 'Dashboard'); // ⬅️ CHANGED FROM Home TO Dashboard
    formData.append('id', updatedData.id);

    // If new image selected, append it
    if (updatedData.media_file && updatedData.media_file.uri) {
      const fileUri = updatedData.media_file.uri;
      const fileName = updatedData.media_file.fileName || fileUri.split('/').pop();
      const fileType = updatedData.media_file.type || 'image/jpeg';

      formData.append('media_file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      });
    } else {
      formData.append('media_file', null);
    }

    console.log('📤 Sending PUT request to update dashboard banner...');

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Dashboard banner updated successfully');
      setEditBannerModalVisible(false);
      setSelectedBanner(null);
      loadUserInfoAndCounts(); // Refresh the list
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating dashboard banner:', error);
    Alert.alert('Error', error.message || 'Failed to update dashboard banner');
  }
};

// 👑 ADMIN ONLY: Handle Delete Banner
const handleDeleteDashboardBanner = async (item) => {
  try {
    console.log('🗑️ Admin deleting dashboard banner:', item._id);
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${userInfo.leaderMobile}&user_email_id=${encodeURIComponent(userInfo.userEmail)}&id=${item._id || item.id}`;
    
    const result = await ApiService.authDelete(apiUrl);

    if (result.success) {
      Alert.alert('Success', 'Dashboard banner deleted successfully');
      loadUserInfoAndCounts(); // Refresh the list
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('❌ Error deleting dashboard banner:', error);
    Alert.alert('Error', 'Failed to delete dashboard banner');
  }
};

// 👑 ADMIN ONLY: Handle Add New Banner
const handleAddDashboardBanner = async (selectedImage) => {
  try {
    console.log('➕ Admin adding new dashboard banner...');
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('regd_mobile_no', userInfo.leaderMobile);
    formData.append('user_email_id', userInfo.userEmail);
    formData.append('media_header', 'null');
    formData.append('media_narration', 'null');
    formData.append('media_url', 'null');
    formData.append('media_type', 'Dashboard');

    // Append the selected image file
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Sending POST request to create dashboard banner...');

    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Dashboard banner added successfully');
      setAddBannerModalVisible(false);
      loadUserInfoAndCounts(); // Refresh the data
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error adding dashboard banner:', error);
    Alert.alert('Error', error.message || 'Failed to add dashboard banner');
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

  // 👇 ADD THIS RENDER FUNCTION before the return statement

const renderDashboardBannerGallery = () => {
  // Loading State
  if (dashboardBannersLoading) {
    return (
      <View style={styles.dashboardBannerContainer}>
        <View style={styles.dashboardBannerLoadingState}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading dashboard banners...</Text>
        </View>
      </View>
    );
  }

  // ✅ UPDATED: Show "Add New" button if admin AND (0 banners OR 1+ banners)
  const showAddButton = isAdmin && (dashboardBannersData.length === 0 || dashboardBannersData.length >= 1);

  return (
    <>
      <View style={styles.dashboardBannerContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dashboardBannerScrollContent}
        >
          {/* Render existing dashboard banner items */}
          {dashboardBannersData && Array.isArray(dashboardBannersData) && dashboardBannersData.map((item, index) => {
            if (!item || !item.media_file) {
              return null;
            }
            
            return (
              <DashboardBannerImage
                key={item._id || item.id || `dashboard-banner-${index}`}
                item={item}
                index={index}
                memberId={userInfo.leaderMobile}
                onEdit={handleEditDashboardBanner}
                onDelete={handleDeleteDashboardBanner}
                isAdmin={isAdmin}
              />
            );
          })}

          {/* ✅ Add New Button - Show if admin AND (0 OR 1+ banners) */}
          {showAddButton && (
            <TouchableOpacity
              style={styles.dashboardBannerAddButton}
              onPress={() => setAddBannerModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dashboardBannerAddContent}>
                <Icon name="add-circle" size={48} color="#e16e2b" />
                <Text style={styles.dashboardBannerAddText}>
                  {dashboardBannersData.length === 0 ? 'Add Banner' : 'Add New'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Edit Modal for existing dashboard banners */}
      {isAdmin && (
        <EditDashboardBannerModal
          visible={editBannerModalVisible}
          item={selectedBanner}
          onClose={() => {
            setEditBannerModalVisible(false);
            setSelectedBanner(null);
          }}
          onSave={handleSaveDashboardBanner}
        />
      )}

      {/* ✅ Add Modal for new dashboard banners */}
      {isAdmin && (
        <AddDashboardBannerModal
          visible={addBannerModalVisible}
          onClose={() => setAddBannerModalVisible(false)}
          onSave={handleAddDashboardBanner}
        />
      )}
    </>
  );
};

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

       {renderDashboardBannerGallery()}

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
// Banner Gallery Styles
bannerContainer: { 
  paddingVertical: 15, 
  paddingLeft: 15, 
  backgroundColor: '#fff', 
  marginBottom: 20 
},
bannerScrollContent: { paddingRight: 15, paddingBottom: 5 },
dashboardMediaItem: {
  width: 330,
  height: 180,
  marginRight: 15,
  borderRadius: 12,
  backgroundColor: '#ffffff',
  overflow: 'hidden',
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  position: 'relative',
},
dashboardMediaImage: { width: '100%', height: '100%' },
dashboardMediaLoadingContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
},
dashboardMediaErrorContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#ffebee',
},
dashboardMediaErrorIcon: { fontSize: 40, marginBottom: 8 },
dashboardMediaErrorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },
bannerLoadingState: { 
  height: 180, 
  justifyContent: 'center', 
  alignItems: 'center' 
},

// Three Dot Menu Button
dashboardMediaMenuButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
dashboardMediaMenuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 18,
},

// Dropdown Menu Styles
dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
dropdownMenu: {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderRadius: 8,
  minWidth: 120,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  paddingVertical: 4,
},
dropdownItem: { 
  flexDirection: 'row', 
  alignItems: 'center', 
  paddingVertical: 12, 
  paddingHorizontal: 16 
},
dropdownItemIcon: { fontSize: 16, marginRight: 12 },
dropdownItemText: { fontSize: 15, color: '#2c3e50', fontWeight: '500' },
dropdownDeleteItem: {},
dropdownDeleteText: { color: '#e74c3c', fontWeight: '600' },
dropdownSeparator: { 
  height: 1, 
  backgroundColor: '#ecf0f1', 
  marginHorizontal: 8 
},

// Modal Styles
modalOverlay: { 
  flex: 1, 
  backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  justifyContent: 'center', 
  alignItems: 'center' 
},
modalContainer: { 
  width: '90%', 
  maxHeight: '80%', 
  backgroundColor: '#fff', 
  borderRadius: 12, 
  overflow: 'hidden',
  elevation: 10,
},
modalHeader: { 
  flexDirection: 'row', 
  justifyContent: 'space-between', 
  alignItems: 'center', 
  padding: 20, 
  borderBottomWidth: 1, 
  borderBottomColor: '#eee',
  backgroundColor: '#f8f9fa',
},
modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
closeButton: { fontSize: 28, color: '#7f8c8d', fontWeight: '300' },
modalContent: { padding: 20, maxHeight: 400 },
label: { 
  fontSize: 14, 
  fontWeight: '600', 
  color: '#34495e', 
  marginBottom: 8, 
  marginTop: 10 
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#e16e2b',
  borderRadius: 8,
  padding: 15,
  backgroundColor: '#fff5f0',
  marginBottom: 10,
},
imagePickerText: {
  fontSize: 14,
  color: '#e16e2b',
  fontWeight: '600',
  marginLeft: 10,
},
selectedImagePreview: {
  marginTop: 10,
  alignItems: 'center',
  backgroundColor: '#f9f9f9',
  padding: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
},
previewImage: {
  width: 200,
  height: 150,
  borderRadius: 8,
  marginBottom: 8,
},
imageInfoText: {
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
},
modalFooter: { 
  flexDirection: 'row', 
  padding: 20, 
  borderTopWidth: 1, 
  borderTopColor: '#eee', 
  gap: 10,
  backgroundColor: '#f8f9fa',
},
modalButton: { 
  flex: 1, 
  padding: 15, 
  borderRadius: 8, 
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 50,
},
cancelButton: { 
  backgroundColor: '#ecf0f1',
  borderWidth: 1,
  borderColor: '#bdc3c7',
},
cancelButtonText: { color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
saveButton: { 
  backgroundColor: '#e16e2b',
  elevation: 2,
},
saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Add these to your existing styles object in DashboardScreen.js
dashboardBannerContainer: { 
  paddingVertical: 15, 
  paddingLeft: 15, 
  backgroundColor: '#fff', 
  marginBottom: 20 
},


dashboardBannerScrollContent: { 
  paddingRight: 15, 
  paddingBottom: 5 
},
dashboardBannerLoadingState: { 
  height: 180, 
  justifyContent: 'center', 
  alignItems: 'center' 
},

// Menu button on banner
dashboardMediaMenuButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
dashboardMediaMenuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 18,
},
// Add these to the styles object (around line 1100):

dashboardBannerAddButton: {
  width: 330,
  height: 180,
  marginRight: 15,
  borderRadius: 12,
  backgroundColor: '#f8f9fa',
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
},
dashboardBannerAddContent: {
  alignItems: 'center',
},
dashboardBannerAddText: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '600',
  color: '#e16e2b',
},
loadingText: {
  marginTop: 10,
  fontSize: 14,
  color: '#7f8c8d',
},
});

export default DashboardScreen;