import React, { useState, useEffect,useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import styles from '../styles/KnowYourLeaderstyle';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin} from '../../App'; // Import helper functions
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTranslation } from '../context/TranslationContext';
import TranslatableText from '../components/TranslatableText';
import UpdateStatusService from '../services/UpdateStatusService';
import LocalStorageService from '../services/LocalStorageService';

// ✅ ADD THESE VALIDATION HELPER FUNCTIONS
const validateMobileNumber = (mobile) => {
  // Remove any spaces or special characters
  const cleanMobile = mobile.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Must be exactly 10 digits
  if (cleanMobile.length !== 10) {
    return { valid: false, message: 'Mobile number must be exactly 10 digits' };
  }
  
  // First digit must be 6, 7, 8, or 9 (Indian mobile numbers)
  const firstDigit = cleanMobile.charAt(0);
  if (!['6', '7', '8', '9'].includes(firstDigit)) {
    return { valid: false, message: 'Mobile number must start with 6, 7, 8, or 9' };
  }
  
  return { valid: true, cleanNumber: cleanMobile };
};

const validateTelephoneNumber = (telephone) => {
  // Remove any spaces or special characters
  const cleanTel = telephone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Must be maximum 8 digits
  if (cleanTel.length > 8) {
    return { valid: false, message: 'Telephone number cannot exceed 8 digits' };
  }
  
  // Must be at least 6 digits (typical landline length)
  if (cleanTel.length > 0 && cleanTel.length < 6) {
    return { valid: false, message: 'Telephone number must be at least 6 digits' };
  }
  
  return { valid: true, cleanNumber: cleanTel };
};

const validateSTDCode = (stdCode) => {
  // Remove any spaces or special characters
  const cleanSTD = stdCode.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Must be between 2 to 5 digits
  if (cleanSTD.length > 0 && (cleanSTD.length < 2 || cleanSTD.length > 5)) {
    return { valid: false, message: 'STD code must be between 2 to 5 digits' };
  }
  
  return { valid: true, cleanNumber: cleanSTD };
};

const formatPhoneNumberForCall = (isd, std, telephone) => {
  if (!telephone) return null;
  
  // Clean all inputs
  const cleanISD = (isd || '').replace(/\s+/g, '').replace(/[^0-9+]/g, '');
  const cleanSTD = (std || '').replace(/\s+/g, '').replace(/[^0-9]/g, '');
  const cleanTel = telephone.replace(/\s+/g, '').replace(/[^0-9]/g, '');
  
  // Remove leading zeros from ISD (convert 0091 to 91)
  let formattedISD = cleanISD.replace(/^0+/, '');
  if (!formattedISD.startsWith('+')) {
    formattedISD = '+' + formattedISD;
  }
  
  // Remove leading zero from STD (convert 011 to 11, 022 to 22)
  const formattedSTD = cleanSTD.replace(/^0+/, '');
  
  // Combine: +[ISD][STD][Telephone]
  return `${formattedISD}${formattedSTD}${cleanTel}`;
};

// ✅ ADD THIS DATE FORMATTING HELPER
const formatDateInput = (text) => {
  // Remove all non-numeric characters
  const cleaned = text.replace(/\D/g, '');
  
  // Apply formatting based on length
  let formatted = cleaned;
  
  if (cleaned.length >= 2) {
    formatted = cleaned.slice(0, 2);
    
    if (cleaned.length >= 3) {
      formatted += '/' + cleaned.slice(2, 4);
      
      if (cleaned.length >= 5) {
        formatted += '/' + cleaned.slice(4, 8);
      }
    }
  }
  
  return formatted;
};

// ✅ ADD THIS DATE VALIDATION HELPER
const validateDateFormat = (dateStr) => {
  // Check format DD/MM/YYYY
  const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = dateStr.match(datePattern);
  
  if (!match) {
    return { valid: false, message: 'Date must be in DD/MM/YYYY format' };
  }
  
  const [, day, month, year] = match;
  const dayNum = parseInt(day, 10);
  const monthNum = parseInt(month, 10);
  const yearNum = parseInt(year, 10);
  
  // Validate month
  if (monthNum < 1 || monthNum > 12) {
    return { valid: false, message: 'Month must be between 01 and 12' };
  }
  
  // Validate day
  if (dayNum < 1 || dayNum > 31) {
    return { valid: false, message: 'Day must be between 01 and 31' };
  }
  
  // Validate year (reasonable range)
  const currentYear = new Date().getFullYear();
  if (yearNum < 1900 || yearNum > currentYear + 10) {
    return { valid: false, message: `Year must be between 1900 and ${currentYear + 10}` };
  }
  
  // Validate days in month
  const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
  if (dayNum > daysInMonth) {
    return { valid: false, message: `${month} can have maximum ${daysInMonth} days` };
  }
  
  return { valid: true };
};

// ✅ ADD this helper function in KnowYourLeaderScreen
const handleApiError = async (result, operationName) => {
  if (result.shouldLogout || result.status === 401) {
    console.log(`❌ ${operationName} failed with 401`);
    
    // Check if session needs renewal
    const needsRenewal = await AuthService.doesSessionNeedRenewal();
    
    if (needsRenewal) {
      Alert.alert(
        'Session Expired',
        'Your session has expired. Please login again to perform this action.',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => {
              AuthService.triggerSessionExpiry(true); // Force logout
            }
          }
        ]
      );
      return false;
    }
  }
  
  if (!result.success) {
    Alert.alert('Error', result.message || `${operationName} failed`);
    return false;
  }
  
  return true;
};

// ✅ Three Dot Menu Component (add this before KnowYourLeaderScreen component)
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
// Add this ImageService class after your imports and before KnowYourLeaderScreen component
class ImageService {
  static async normalizeImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'placeholder') {
      console.log('⚠️ No valid image URL provided');
      return null;
    }
    
    try {
      // If it's already a full URL, normalize it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        let normalizedUrl = imageUrl;
        
        // ✅ CRITICAL FIX: Remove port from ANY URL (not just ngrok-free.app)
        if (normalizedUrl.includes(':5000') || normalizedUrl.includes('ngrok-free.dev:')) {
          normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
          console.log('🔧 Removed port from URL:', normalizedUrl);
        }
        
        // Replace localhost with current base URL
        if (normalizedUrl.includes('localhost')) {
          const baseUrl = await ConfigService.getBaseUrl();
          normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          console.log('🔧 Replaced localhost with base URL:', normalizedUrl);
        }
        
        return normalizedUrl;
      }
      
      // For relative paths, construct full URL
      const baseUrl = await ConfigService.getBaseUrl();
      const cleanPath = imageUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const filename = cleanPath.split('/').pop();
      
      // Try different possible paths
      const possibleUrls = [
        `${baseUrl}/leader/${filename}`,
        `${baseUrl}/uploads/leader/${filename}`,
        `${baseUrl}/${cleanPath}`,
      ];
      
      console.log('🔍 Trying leader image URLs:', possibleUrls);
      return possibleUrls[0]; // Return first possible URL
      
    } catch (error) {
      console.error('❌ Error normalizing image URL:', error);
      return null;
    }
  }
}

const { width } = Dimensions.get('window');

const KnowYourLeaderScreen = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('profile');
  
  // Member ID and Role state - Enhanced
  const [memberId, setMemberId] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminCheckResult, setAdminCheckResult] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleCheckLoading, setRoleCheckLoading] = useState(false);
  
  // Data states for Profile Tab
  const [memberData, setMemberData] = useState(null);
  const [socialMediaData, setSocialMediaData] = useState(null);
  const [personalData, setPersonalData] = useState(null);
  const [educationData, setEducationData] = useState(null);
  const [addressData, setAddressData] = useState(null);
  
  // Data state for Timeline Tab
  const [timelineData, setTimelineData] = useState(null);
  
  // Error states
  const [errors, setErrors] = useState({});

  // Edit Modal States
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editType, setEditType] = useState('');
  const [editData, setEditData] = useState({});
  const [editLoading, setEditLoading] = useState(false);

  // Developer mode states (keeping for backward compatibility)
  const [showDevInput, setShowDevInput] = useState(false);
  const [devInput, setDevInput] = useState('');
  const [devClickCount, setDevClickCount] = useState(0);
  // Add this with your other state declarations
const [dropdownVisible, setDropdownVisible] = useState(false);
const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
const [currentDropdownType, setCurrentDropdownType] = useState('');
const [currentDropdownData, setCurrentDropdownData] = useState(null);
const [addEducationModalVisible, setAddEducationModalVisible] = useState(false);
const [addEducationData, setAddEducationData] = useState({
  degree: '',
  college: '',
  university: '',
  place: ''
});
const [addEducationLoading, setAddEducationLoading] = useState(false);
const [editEducationModalVisible, setEditEducationModalVisible] = useState(false);
const [currentEducationIndex, setCurrentEducationIndex] = useState(0);
const [editingEducationData, setEditingEducationData] = useState({
  degree: '',
  college: '',
  university: '',
  place: ''
});

// Add these with your existing state declarations
const [addTimelineModalVisible, setAddTimelineModalVisible] = useState(false);
const [addTimelineData, setAddTimelineData] = useState({
  date: '',
  title: '',
  title_details: '',
  additional_info: ''
});
const [addTimelineLoading, setAddTimelineLoading] = useState(false);

// Add these with your existing state declarations
const [editTimelineModalVisible, setEditTimelineModalVisible] = useState(false);
const [currentTimelineIndex, setCurrentTimelineIndex] = useState(0);
const [editingTimelineData, setEditingTimelineData] = useState({
  date: '',
  title: '',
  title_details: '',
  additional_info: ''
});
const [timelineEditLoading, setTimelineEditLoading] = useState(false);
const [educationEditLoading, setEducationEditLoading] = useState(false);

const [kylMediaData, setKylMediaData] = useState([]);
const [kylMediaLoading, setKylMediaLoading] = useState(false);
// Add these states after your existing state declarations
const [editKYLModalVisible, setEditKYLModalVisible] = useState(false);
const [selectedKYLItem, setSelectedKYLItem] = useState(null);

const [addKYLModalVisible, setAddKYLModalVisible] = useState(false);
const [addKYLLoading, setAddKYLLoading] = useState(false);
const [addPersonalModalVisible, setAddPersonalModalVisible] = useState(false);
const [addPersonalData, setAddPersonalData] = useState({
  birth_place: '',
  dob: '',
  father_name: '',
  mother_name: '',
  profession: ''
});
const [addPersonalLoading, setAddPersonalLoading] = useState(false);
// Add these states with your other state declarations
const [addPermanentAddressModalVisible, setAddPermanentAddressModalVisible] = useState(false);
const [addPermanentAddressData, setAddPermanentAddressData] = useState({
  address1: '',
  address2: '',
  address3: '',
  pincode: '',
  state: '',
  isd_code: '',
  std_code: '',
  tel_number1: '',
  mobile_number1: '',
  tel_number2: '',
  mobile_number2: ''
});
const [addPermanentAddressLoading, setAddPermanentAddressLoading] = useState(false);

const [addPresentAddressModalVisible, setAddPresentAddressModalVisible] = useState(false);
const [addPresentAddressData, setAddPresentAddressData] = useState({
  address1: '',
  address2: '',
  address3: '',
  pincode: '',
  state: '',
  isd_code: '',
  std_code: '',
  tel_number1: '',
  mobile_number1: '',
  tel_number2: '',
  mobile_number2: ''
});
const [addPresentAddressLoading, setAddPresentAddressLoading] = useState(false);
// Add Profile Image Edit States
const [editProfileImageModalVisible, setEditProfileImageModalVisible] = useState(false);
const [selectedProfileImage, setSelectedProfileImage] = useState(null);
const [profileImageLoading, setProfileImageLoading] = useState(false);
// Auto-scroll states for KYL media banners
const kylMediaScrollViewRef = useRef(null);
const [currentKYLMediaIndex, setCurrentKYLMediaIndex] = useState(0);
const kylMediaAutoScrollInterval = useRef(null);
// Add these states with your existing state declarations (around line 100)
const [addSocialMediaModalVisible, setAddSocialMediaModalVisible] = useState(false);
const [addSocialMediaData, setAddSocialMediaData] = useState({
  facebook: '',
  twitter: '',
  linkedin: '',
  instagram: ''
});
const [addSocialMediaLoading, setAddSocialMediaLoading] = useState(false);
// Add these states with your existing state declarations
const [addLeaderCoordinatesModalVisible, setAddLeaderCoordinatesModalVisible] = useState(false);
const [addLeaderCoordinatesData, setAddLeaderCoordinatesData] = useState({
  title: '',
  member_name: '',
  party: '',
  constituency: '',
  state: '',
  email_id: '',
  digital_sansad_url: ''
});
const [addLeaderCoordinatesLoading, setAddLeaderCoordinatesLoading] = useState(false);
  useEffect(() => {
    initializeApp();
  }, []);

//translation hook
  const { isTranslating } = useTranslation();
const fontSize = 16;

  // Enhanced admin role checking using App.js functions
  const checkAdminRole = async () => {
    try {
      setRoleCheckLoading(true);
      console.log('🔍 === CHECKING ADMIN ROLE IN CONSTITUENCY SCREEN ===');
      
      // Use the enhanced function from App.js
      const adminCheck = await checkIfCurrentUserIsAdmin();
      const currentRole = await getCurrentUserRole();
      
      console.log('👤 Current User Role Info:', currentRole);
      console.log('👑 Admin Check Result:', adminCheck);
      
      setAdminCheckResult(adminCheck);
      setIsAdmin(adminCheck.isAdmin);
      setUserRole(currentRole.userRole);
      setIsLoggedIn(currentRole.isLoggedIn);
      
      console.log('✅ Role check completed:', {
        isAdmin: adminCheck.isAdmin,
        userRole: currentRole.userRole,
        isLoggedIn: currentRole.isLoggedIn,
        reason: adminCheck.reason
      });
      
      return adminCheck.isAdmin;
      
    } catch (error) {
      console.error('❌ Error checking admin role:', error);
      setIsAdmin(false);
      setUserRole('user');
      setIsLoggedIn(false);
      return false;
    } finally {
      setRoleCheckLoading(false);
    }
  };

  // Developer mode functions (enhanced with better integration)
  const handleLeaderNamePress = () => {
    // If already admin, show admin info instead of dev mode
    if (isAdmin) {
      Alert.alert(
        'Admin Status',
        `You are currently logged in as an administrator.\n\n` +
        `Reason: ${adminCheckResult?.reason || 'Owner privileges'}\n` +
        `User Role: ${userRole}\n` +
        `Logged In: ${isLoggedIn ? 'Yes' : 'No'}\n` +
        `Owner Email: ${adminCheckResult?.owner_emailid || 'Not available'}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setDevClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        Alert.alert(
          'Developer Mode',
          'Developer mode is deprecated. Please log in as the app owner to get admin privileges.',
          [
            { text: 'OK' },
            { text: 'Check Status', onPress: () => showCurrentStatus() }
          ]
        );
        return 0; // Reset count
      }
      return newCount;
    });
  };

  // Handle KYL Media Edit
const handleKYLEdit = (item) => {
  setSelectedKYLItem(item);
  setEditKYLModalVisible(true);
};

// Handle KYL Media Save
// ✅ REPLACE handleKYLSave in KnowYourLeaderScreen
const handleKYLSave = async (updatedData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';

    const formData = new FormData();
    // ✅ CRITICAL: Send BOTH field names for backend compatibility
    formData.append('regd_mobile_no', memberId);          // For media corner schema
    formData.append('leader_regd_mobile_no', memberId);   // For authentication middleware
    formData.append('user_email_id', userEmailId);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url);
    formData.append('media_type', 'KYL');
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

    console.log('📤 Sending PUT request to:', apiUrl);
    console.log('📤 Request fields:', {
      regd_mobile_no: memberId,
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      media_type: 'KYL',
      id: updatedData.id
    });

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    // ✅ ADD ERROR HANDLER
    const success = await handleApiError(result, 'Update KYL media');
    if (!success) {
      return;
    }

    Alert.alert('✅ Success', 'KYL media updated successfully');
    setEditKYLModalVisible(false);
    setSelectedKYLItem(null);
    loadInitialData(memberId);
  } catch (error) {
    console.error('❌ Error updating KYL media:', error);
    Alert.alert('Error', error.message || 'Failed to update KYL media');
  }
};

// Handle KYL Media Delete
// ✅ REPLACE handleKYLDelete in KnowYourLeaderScreen
const handleKYLDelete = async (item) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // ✅ CRITICAL: Send BOTH field names in query parameters
    const apiUrl = `${baseUrl}/api/mediacorner/?regd_mobile_no=${memberId}&leader_regd_mobile_no=${memberId}&user_email_id=${encodeURIComponent(userEmailId)}&id=${item._id || item.id}`;
    
    console.log('🗑️ Deleting KYL media:', apiUrl);
    
    const result = await ApiService.authDelete(apiUrl);

    // ✅ ADD ERROR HANDLER
    const success = await handleApiError(result, 'Delete KYL media');
    if (!success) {
      return;
    }

    Alert.alert('Success', 'KYL media deleted successfully');
    loadInitialData(memberId);
  } catch (error) {
    console.error('Error deleting KYL media:', error);
    Alert.alert('Error', 'Failed to delete KYL media');
  }
};

// Handle KYL Media Add/Create
// ✅ REPLACE handleKYLAdd in KnowYourLeaderScreen
const handleKYLAdd = async (selectedImage) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';

    console.log('📤 Creating new KYL media with:', {
      mobile: memberId,
      email: userEmailId,
      mediaType: 'KYL',
      fileName: selectedImage.fileName
    });

    const formData = new FormData();
    // ✅ CRITICAL: Send BOTH field names for backend compatibility
    formData.append('regd_mobile_no', memberId);          // For media corner schema
    formData.append('leader_regd_mobile_no', memberId);   // For authentication middleware
    formData.append('user_email_id', userEmailId);
    formData.append('media_header', 'null');
    formData.append('media_narration', 'null');
    formData.append('media_url', 'null');
    formData.append('media_type', 'KYL');

    // Append the selected image file
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Sending POST request to:', apiUrl);
    console.log('📤 Request fields:', {
      regd_mobile_no: memberId,
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      media_type: 'KYL'
    });

    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    console.log('📥 POST Response:', result);

    // ✅ ADD ERROR HANDLER
    const success = await handleApiError(result, 'Add KYL media');
    if (!success) {
      return;
    }

    Alert.alert('✅ Success', 'KYL media added successfully');
    setAddKYLModalVisible(false);
    loadInitialData(memberId);
  } catch (error) {
    console.error('❌ Error adding KYL media:', error);
    Alert.alert('Error', error.message || 'Failed to add KYL media');
  }
};

// Handle Profile Image Update
// ✅ REPLACE your handleUpdateProfileImage function with this:
const handleUpdateProfileImage = async (selectedImage) => {
  try {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    setProfileImageLoading(true);

    const baseUrl = await ConfigService.getBaseUrl();
    
    // ✅ FIX 1: Add trailing slash to match backend route
    const apiUrl = `${baseUrl}/api/leaderimage/`;  
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';

    console.log('📤 Updating leader profile image:', {
      mobile: memberId,
      email: userEmailId,
      endpoint: apiUrl,
      fileName: selectedImage.fileName
    });

    // ✅ FIX 2: Create FormData with BOTH mobile field names (like KYL media)
    const formData = new FormData();
    formData.append('regd_mobile_no', memberId);           // For schema
    formData.append('leader_regd_mobile_no', memberId);    // For middleware
    formData.append('user_email_id', userEmailId);

    // ✅ FIX 3: Append image file correctly
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    // ✅ Try both possible field names the backend might accept
    formData.append('leader_image', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 FormData prepared:', {
      regd_mobile_no: memberId,
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      fileName: fileName
    });

    // ✅ FIX 4: Use authPut with multipart flag
    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    console.log('📥 PUT Response:', result);

    // ✅ FIX 5: Add error handler (like you have for KYL media)
    const success = await handleApiError(result, 'Update profile image');
    if (!success) {
      return;
    }

    // ✅ FIX 6: Mark cache as stale after successful update
    await UpdateStatusService.markApiStale(memberId, 'updatedLeaderImage');
    console.log('✅ Marked LEADER_IMAGE cache as stale');

    Alert.alert('✅ Success', 'Profile image updated successfully', [
      {
        text: 'OK',
        onPress: async () => {
          setEditProfileImageModalVisible(false);
          setSelectedProfileImage(null);
          
          // Force reload with delay
          setTimeout(async () => {
            console.log('🔄 Reloading profile data after image update...');
            await loadInitialData(memberId);
            
            setRefreshing(true);
            setTimeout(() => {
              setRefreshing(false);
              console.log('✅ Profile data reloaded with new image');
            }, 100);
          }, 500);
        }
      }
    ]);
  } catch (error) {
    console.error('❌ Error updating profile image:', error);
    Alert.alert('Error', error.message || 'Failed to update profile image');
  } finally {
    setProfileImageLoading(false);
  }
};
  // Show current user status
  const showCurrentStatus = async () => {
    try {
      const currentRole = await getCurrentUserRole();
      const adminCheck = await checkIfCurrentUserIsAdmin();
      
      Alert.alert(
        'Current User Status',
        `User Role: ${currentRole.userRole}\n` +
        `Is Admin: ${adminCheck.isAdmin ? 'Yes' : 'No'}\n` +
        `Is Logged In: ${currentRole.isLoggedIn ? 'Yes' : 'No'}\n` +
        `Logged In Email: ${currentRole.loggedin_email || 'None'}\n` +
        `Owner Email: ${currentRole.owner_emailid || 'Not available'}\n` +
        `App Bootstrapped: ${currentRole.isAppBootstrapped ? 'Yes' : 'No'}\n\n` +
        `${adminCheck.reason}`,
        [
          { text: 'OK' },
          { text: 'Refresh', onPress: () => checkAdminRole() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get current status: ' + error.message);
    }
  };

  const handleDevInputSubmit = async () => {
    Alert.alert(
      'Developer Mode Deprecated',
      'Please log in as the app owner to get admin privileges instead of using developer codes.',
      [{ text: 'OK' }]
    );
    setShowDevInput(false);
    setDevInput('');
  };

  const closeDevInput = () => {
    setShowDevInput(false);
    setDevInput('');
  };

  // Function to get member ID and role from EncryptedStorage (Enhanced)
  const getMemberInfoFromStorage = async () => {
  try {
    console.log('🔍 Retrieving owner mobile from EncryptedStorage...');
    
    // ✅ STEP 1: Get OWNER_MOBILE directly (stored during bootstrap)
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    
    if (ownerMobile && ownerMobile.trim() !== '') {
      console.log('✅ Owner mobile found from OWNER_MOBILE:', ownerMobile);
      return {
        memberId: ownerMobile.trim()
      };
    }
    
    // ✅ STEP 2: Fallback - Get from AppOwnerInfo
    const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
    if (appOwnerInfo) {
      const parsedData = JSON.parse(appOwnerInfo);
      console.log('📱 AppOwnerInfo keys:', Object.keys(parsedData));
      
      // Try all possible mobile field names
      const possibleFields = [
        'mobile_no', 'mobile_number', 'regdMobileNo', 'regd_mobile_no',
        'owner_mobile', 'client_mobile', 'phone', 'mobileNo', 'Mobile'
      ];
      
      for (const field of possibleFields) {
        if (parsedData[field]) {
          const mobile = String(parsedData[field]).trim();
          console.log(`✅ Owner mobile found in AppOwnerInfo.${field}:`, mobile);
          return {
            memberId: mobile
          };
        }
      }
    }
    
    // ✅ STEP 3: Last fallback - default
    console.error('❌ No owner mobile found - using default');
    return {
      memberId: '7702000726' // Your owner mobile as fallback
    };
    
  } catch (error) {
    console.error('❌ Error retrieving owner mobile:', error);
    return {
      memberId: '7702000726' // Your owner mobile as fallback
    };
  }
};

  const getUserInfoForEducation = async () => {
  try {
    console.log('🔍 Getting user info for education entry...');
    
    // Get mobile number (reuse existing logic)
    const memberInfo = await getMemberInfoFromStorage();
    
    // Get current user role for email
    const currentUserInfo = await getCurrentUserRole();
    
    return {
      regdMobileNo: memberInfo.memberId,
      userEmailId: currentUserInfo.loggedin_email || ''
    };
  } catch (error) {
    console.error('❌ Error getting user info for education:', error);
    throw error;
  }
};

 const initializeApp = async () => {
  try {
    setLoading(true);
    
    // Get member info from storage
    const memberInfo = await getMemberInfoFromStorage();
    setMemberId(memberInfo.memberId);
    
    console.log('📱 ===================================');
    console.log('📱 USING OWNER MOBILE FOR ALL APIS:', memberInfo.memberId);
    console.log('📱 ===================================');
    
    // Check admin role using enhanced App.js functions
    const adminStatus = await checkAdminRole();
    
    console.log('🔑 Admin Status:', adminStatus);
    
    // Load initial data with owner's mobile
    await loadInitialData(memberInfo.memberId);
    
  } catch (error) {
    console.error('❌ App initialization error:', error);
    Alert.alert('Initialization Error', 'Failed to initialize app. Using default settings.');
    await loadInitialData('7702000726'); // Use your owner mobile
  } finally {
    setLoading(false);
  }
};

  // Individual API calls using ApiService and ConfigService (unchanged)
const fetchMemberCoordinates = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build the endpoint with query parameters
    const endpoint = `${baseUrl}/api/coordinates/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching coordinates data from:', endpoint);

    // Use authGet which should include x-app-key header
    const result = await ApiService.authGet(endpoint);

    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (coordinates):', error);
    return { success: false, error: error.message };
  }
};

const fetchSocialMedia = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Use query parameters
    const endpoint = `${baseUrl}/api/socialmedia/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    // Use authGet to include Authorization + x-app-key headers
    const result = await ApiService.authGet(endpoint);
    
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (socialmedia):', error);
    return { success: false, error: error.message };
  }
};

const fetchPersonalDetails = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/personaldetails/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching personal details from:', endpoint);
    console.log('📧 Using email:', userEmailId);
    console.log('📱 Using mobile:', memberIdentifier);

    // ✅ GET ALL THREE: app-key, AAID, fingerprint
    const EncryptedStorage = require('react-native-encrypted-storage').default;
    const appKey = await EncryptedStorage.getItem('APP_KEY');
    const deviceAAID = await EncryptedStorage.getItem('DEVICE_AAID');
    const deviceFingerprint = await EncryptedStorage.getItem('DEVICE_FINGERPRINT');
    
    // ✅ ADD ALL THREE TO HEADERS
    const headers = {
      'x-app-key': appKey,
      'x-device-aaid': deviceAAID,           // ✅ ADD THIS
      'x-device-fingerprint': deviceFingerprint  // ✅ ADD THIS
    };

    console.log('📤 Headers:', {
      'x-app-key': appKey ? '✅' : '❌',
      'x-device-aaid': deviceAAID || '❌ NULL',
      'x-device-fingerprint': deviceFingerprint ? '✅' : '❌'
    });

    // Use authGet to include headers
    const result = await ApiService.authGet(endpoint);

    console.log('👤 Personal Details API Response:', result);

    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (personaldetails):', error);
    return { success: false, error: error.message };
  }
};

const fetchEducationalDetails = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build the endpoint with query parameters (note the trailing slash after /api/edudata/)
    const endpoint = `${baseUrl}/api/edudata/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching education data from:', endpoint);
    console.log('📧 Using email:', userEmailId);
    console.log('📱 Using mobile:', memberIdentifier);

    // Use authGet to include Authorization + x-app-key headers
    const result = await ApiService.authGet(endpoint);

    console.log('📚 Education API Response:', result);

    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (edudata):', error);
    return { success: false, error: error.message };
  }
};


const fetchPermanentAddress = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/permaddress/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching permanent address from:', endpoint);
    console.log('📧 Using email:', userEmailId);
    console.log('📱 Using mobile:', memberIdentifier);
    
    const result = await ApiService.authGet(endpoint);
    
    console.log('🏠 Permanent Address API Response:', result);
    
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (permaddress):', error);
    return { success: false, error: error.message };
  }
};

const fetchPresentAddress = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/preaddress/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching present address from:', endpoint);
    console.log('📧 Using email:', userEmailId);
    console.log('📱 Using mobile:', memberIdentifier);
    
    const result = await ApiService.authGet(endpoint);
    
    console.log('🏢 Present Address API Response:', result);
    
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (preaddress):', error);
    return { success: false, error: error.message };
  }
};

const fetchTimeline = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build the endpoint with query parameters (similar to education API)
    const endpoint = `${baseUrl}/api/leadertimeline/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🔍 Fetching timeline data from:', endpoint);
    console.log('📧 Using email:', userEmailId);
    console.log('📱 Using mobile:', memberIdentifier);

    // Use authGet to include Authorization + x-app-key headers
    const result = await ApiService.authGet(endpoint);

    console.log('📅 Timeline API Response:', result);

    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (leadertimeline):', error);
    return { success: false, error: error.message };
  }
};

const fetchKYLMedia = async (memberIdentifier) => {
  try {
    console.log('📸 Fetching KYL media for member:', memberIdentifier);
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build the endpoint with KYL media_type
    const endpoint = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}&media_type=KYL`;
    
    console.log('🔍 Fetching KYL media from:', endpoint);

    // Use authGet which includes Authorization + x-app-key headers
    const result = await ApiService.authGet(endpoint);

    console.log('📸 KYL Media API Response:', result);

    if (result.success && result.data) {
      // Handle different response structures
      let items = [];
      
      if (Array.isArray(result.data)) {
        items = result.data;
      } else if (result.data.media_items) {
        items = result.data.media_items;
      } else if (result.data.items) {
        items = result.data.items;
      }

      console.log('✅ KYL Media items found:', items.length);
      return {
        success: true,
        data: items,
        error: null
      };
    } else {
      console.log('⚠️ No KYL media data found');
      return {
        success: true,
        data: [],
        error: null
      };
    }
  } catch (error) {
    console.error('❌ API Error (KYL media):', error);
    return { 
      success: false, 
      data: [],
      error: error.message 
    };
  }
};

// ✅ Auto-scroll effect for KYL media banners (only for non-admin users)
useEffect(() => {
  // Only auto-scroll if user is NOT admin and has KYL media data
  if (!isAdmin && kylMediaData && kylMediaData.length > 1 && !kylMediaLoading) {
    // Clear any existing interval
    if (kylMediaAutoScrollInterval.current) {
      clearInterval(kylMediaAutoScrollInterval.current);
    }

    // Start auto-scroll interval (every 3 seconds)
    kylMediaAutoScrollInterval.current = setInterval(() => {
      setCurrentKYLMediaIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % kylMediaData.length;
        
        // Scroll to next banner
        if (kylMediaScrollViewRef.current) {
          kylMediaScrollViewRef.current.scrollTo({
            x: nextIndex * (330 + 15), // banner width + margin
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 3000); // Change banner every 3 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (kylMediaAutoScrollInterval.current) {
        clearInterval(kylMediaAutoScrollInterval.current);
      }
    };
  }
}, [isAdmin, kylMediaData, kylMediaLoading]);

const submitEducationEntry = async () => {
  try {
    // Validate form data
    if (!addEducationData.degree.trim()) {
      Alert.alert('Validation Error', 'Please enter degree');
      return;
    }
    if (!addEducationData.college.trim()) {
      Alert.alert('Validation Error', 'Please enter college name');
      return;
    }
    if (!addEducationData.university.trim()) {
      Alert.alert('Validation Error', 'Please enter university name');
      return;
    }
    if (!addEducationData.place.trim()) {
      Alert.alert('Validation Error', 'Please enter place');
      return;
    }

    setAddEducationLoading(true);

    // Get user information
    const userInfo = await getUserInfoForEducation();
    
    if (!userInfo.regdMobileNo || !userInfo.userEmailId) {
      Alert.alert('Error', 'User information not available. Please try refreshing the screen.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    // ✅ CHECK: Is this the FIRST education entry or additional entry?
    const isFirstEntry = !educationData || !Array.isArray(educationData) || educationData.length === 0;

    let endpoint;
    let requestPayload;

 if (isFirstEntry) {
  // ✅ FIRST ENTRY: Use POST /api/edudata (POST Create Education)
  console.log('📤 Creating FIRST education entry (POST /api/edudata)');
  
  endpoint = `${baseUrl}/api/edudata`;
  
  requestPayload = {
    leader_regd_mobile_no: userInfo.regdMobileNo,
    user_email_id: userInfo.userEmailId,
    edu_qual: [  // ✅ DIRECTLY AT ROOT LEVEL
      {
        degree: addEducationData.degree.trim(),
        college: addEducationData.college.trim(),
        university: addEducationData.university.trim(),
        place: addEducationData.place.trim()
      }
    ]
  };
} else {
      // ✅ ADDITIONAL ENTRY: Use POST /api/edudata/entry (Add Education Entry)
      console.log('📤 Adding ADDITIONAL education entry (POST /api/edudata/entry)');
      
      endpoint = `${baseUrl}/api/edudata/entry`;
      
      requestPayload = {
        leader_regd_mobile_no: userInfo.regdMobileNo,
        user_email_id: userInfo.userEmailId,
        edu_qual: {
          degree: addEducationData.degree.trim(),
          college: addEducationData.college.trim(),
          university: addEducationData.university.trim(),
          place: addEducationData.place.trim()
        }
      };
    }

    console.log('📤 Submitting to endpoint:', endpoint);
    console.log('📤 Request payload:', requestPayload);

    // Use authPost for both cases
    const result = await ApiService.authPost(endpoint, requestPayload);

    if (result.success) {
      Alert.alert(
        'Success', 
        isFirstEntry 
          ? 'First education entry created successfully!' 
          : 'Education entry added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddEducationData({
                degree: '',
                college: '',
                university: '',
                place: ''
              });
              
              // Close modal
              setAddEducationModalVisible(false);
              
              // Refresh education data
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || 'Failed to add education entry');
    }

  } catch (error) {
    console.error('❌ Error submitting education entry:', error);
    
    // Handle specific error cases
    if (error.message && error.message.includes('Duplicate education entry')) {
      Alert.alert('Duplicate Entry', 'This education entry already exists.');
    } else if (error.message && error.message.includes('network')) {
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
    } else {
      Alert.alert('Error', `Failed to add education entry: ${error.message}`);
    }
  } finally {
    setAddEducationLoading(false);
  }
};

const openEducationEditModal = () => {
  if (!educationData || !Array.isArray(educationData) || educationData.length === 0) {
    Alert.alert('No Education Data', 'No education entries found to edit.');
    return;
  }

  // Start with the first education entry
  setCurrentEducationIndex(0);
  setEditingEducationData({
    degree: educationData[0].degree || '',
    college: educationData[0].college || '',
    university: educationData[0].university || '',
    place: educationData[0].place || ''
  });
  setEditEducationModalVisible(true);
};
const openTimelineEditModal = () => {
  if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
    Alert.alert('No Timeline Data', 'No timeline entries found to edit.');
    return;
  }

  // Start with the first timeline entry
  setCurrentTimelineIndex(0);
  setEditingTimelineData({
    date: timelineData[0].date || '',
    title: timelineData[0].title || '',
    title_details: timelineData[0].title_details || '',
    additional_info: timelineData[0].additional_info || ''
  });
  setEditTimelineModalVisible(true);
};

const navigateTimeline = (direction) => {
  if (!timelineData || !Array.isArray(timelineData)) return;

  let newIndex;
  if (direction === 'next') {
    newIndex = currentTimelineIndex < timelineData.length - 1 ? currentTimelineIndex + 1 : 0;
  } else {
    newIndex = currentTimelineIndex > 0 ? currentTimelineIndex - 1 : timelineData.length - 1;
  }

  setCurrentTimelineIndex(newIndex);
  setEditingTimelineData({
    date: timelineData[newIndex].date || '',
    title: timelineData[newIndex].title || '',
    title_details: timelineData[newIndex].title_details || '',
    additional_info: timelineData[newIndex].additional_info || ''
  });
};

const handleTimelineInputChange = (field, value) => {
  setEditingTimelineData(prev => ({
    ...prev,
    [field]: value
  }));
};

const saveCurrentTimeline = async () => {
  try {
    // Validate current timeline data
    if (!editingTimelineData.date.trim()) {
      Alert.alert('Validation Error', 'Please enter date');
      return;
    }
    if (!editingTimelineData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter title');
      return;
    }
    if (!editingTimelineData.title_details.trim()) {
      Alert.alert('Validation Error', 'Please enter title details');
      return;
    }

    // ✅ IMPROVED DATE VALIDATION
    const dateValidation = validateDateFormat(editingTimelineData.date.trim());
    if (!dateValidation.valid) {
      Alert.alert('Invalid Date', dateValidation.message);
      return;
    }

    setTimelineEditLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      return;
    }

    // Get the current timeline entry to extract timelineId
    const currentTimelineEntry = timelineData[currentTimelineIndex];
    if (!currentTimelineEntry._id && !currentTimelineEntry.timelineId) {
      Alert.alert('Error', 'Timeline ID not found. Cannot update entry.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      timelineId: currentTimelineEntry._id || currentTimelineEntry.timelineId,
      timeline: {
        date: editingTimelineData.date.trim(),
        title: editingTimelineData.title.trim(),
        title_details: editingTimelineData.title_details.trim(),
        additional_info: editingTimelineData.additional_info.trim() || ''
      }
    };

    console.log('📤 Updating timeline entry:', requestPayload);

    const result = await ApiService.authPut(
      `${baseUrl}/api/leadertimeline/`,
      requestPayload
    );

    if (result.success) {
      Alert.alert('Success', 'Timeline entry updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            loadInitialData(memberId);
          }
        }
      ]);
    } else {
      throw new Error(result.message || result.error || 'Failed to update timeline entry');
    }

  } catch (error) {
    console.error('❌ Error updating timeline entry:', error);
    Alert.alert('Update Failed', `Failed to update timeline entry: ${error.message}`);
  } finally {
    setTimelineEditLoading(false);
  }
};

const deleteCurrentTimeline = async () => {
  const currentTimelineEntry = timelineData[currentTimelineIndex];
  
  Alert.alert(
    'Delete Timeline Entry',
    `Are you sure you want to delete this timeline entry?\n\n${editingTimelineData.title}`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setTimelineEditLoading(true);

            // Get user information
            const currentUserInfo = await getCurrentUserRole();
            const userEmailId = currentUserInfo.loggedin_email || 'sanjay.jaiswal@gmail.com';
            
            if (!memberId) {
              Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
              return;
            }

            // Check if timeline ID exists
            if (!currentTimelineEntry._id && !currentTimelineEntry.timelineId) {
              Alert.alert('Error', 'Timeline ID not found. Cannot delete entry.');
              return;
            }

            // Get base URL
            const baseUrl = await ConfigService.getBaseUrl();

            // Build query parameters based on your Postman DELETE structure
            const queryParams = new URLSearchParams({
              leader_regd_mobile_no: memberId,
              user_email_id: userEmailId,
              timelineId: currentTimelineEntry._id || currentTimelineEntry.timelineId
            }).toString();

            console.log('🗑️ Deleting timeline entry with query params:', queryParams);

            // Use authDelete which automatically includes Authorization and x-app-key headers
            const result = await ApiService.authDelete(
              `${baseUrl}/api/leadertimeline/entry?${queryParams}`
            );

            if (result.success) {
              Alert.alert('Success', 'Timeline entry deleted successfully!', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Check if this was the last timeline entry
                    if (timelineData.length <= 1) {
                      // Close modal if no more entries
                      setEditTimelineModalVisible(false);
                    } else {
                      // Adjust current index if needed
                      const newIndex = currentTimelineIndex >= timelineData.length - 1 ? 
                        0 : currentTimelineIndex;
                      
                      setCurrentTimelineIndex(newIndex);
                    }
                    
                    // Refresh timeline data
                    loadInitialData(memberId);
                  }
                }
              ]);
            } else {
              throw new Error(result.message || result.error || 'Failed to delete timeline entry');
            }

          } catch (error) {
            console.error('❌ Error deleting timeline entry:', error);
            Alert.alert('Delete Failed', `Failed to delete timeline entry: ${error.message}`);
          } finally {
            setTimelineEditLoading(false);
          }
        }
      }
    ]
  );
};
const navigateEducation = (direction) => {
  if (!educationData || !Array.isArray(educationData)) return;

  let newIndex;
  if (direction === 'next') {
    newIndex = currentEducationIndex < educationData.length - 1 ? currentEducationIndex + 1 : 0;
  } else {
    newIndex = currentEducationIndex > 0 ? currentEducationIndex - 1 : educationData.length - 1;
  }

  setCurrentEducationIndex(newIndex);
  setEditingEducationData({
    degree: educationData[newIndex].degree || '',
    college: educationData[newIndex].college || '',
    university: educationData[newIndex].university || '',
    place: educationData[newIndex].place || ''
  });
};

const handleEducationInputChange = (field, value) => {
  setEditingEducationData(prev => ({
    ...prev,
    [field]: value
  }));
};

const saveCurrentEducation = async () => {
  try {
    // Validate current education data
    if (!editingEducationData.degree.trim()) {
      Alert.alert('Validation Error', 'Please enter degree');
      return;
    }
    if (!editingEducationData.college.trim()) {
      Alert.alert('Validation Error', 'Please enter college name');
      return;
    }
    if (!editingEducationData.university.trim()) {
      Alert.alert('Validation Error', 'Please enter university name');
      return;
    }
    if (!editingEducationData.place.trim()) {
      Alert.alert('Validation Error', 'Please enter place');
      return;
    }

    setEducationEditLoading(true);

    // Get user information
    const userInfo = await getUserInfoForEducation();
    
    if (!userInfo.regdMobileNo || !userInfo.userEmailId) {
      Alert.alert('Error', 'User information not available. Please try refreshing the screen.');
      return;
    }

    // Get the current education entry to extract eduId
    const currentEducationEntry = educationData[currentEducationIndex];
    if (!currentEducationEntry._id && !currentEducationEntry.eduId) {
      Alert.alert('Error', 'Education ID not found. Cannot update entry.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    // Prepare request payload for PUT method (matching your Postman request)
    const requestPayload = {
      leader_regd_mobile_no: userInfo.regdMobileNo,
      user_email_id: userInfo.userEmailId,
      eduId: currentEducationEntry._id || currentEducationEntry.eduId, // Use the education ID
      edu_qual: {
        degree: editingEducationData.degree.trim(),
        college: editingEducationData.college.trim(),
        university: editingEducationData.university.trim(),
        place: editingEducationData.place.trim()
      }
    };

    console.log('📤 Updating education entry:', requestPayload);

    // Use authPut since education endpoint requires authentication
    const result = await ApiService.authPut(
      `${baseUrl}/api/edudata/entry`,
      requestPayload
    );

    if (result.success) {
      Alert.alert('Success', 'Education entry updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            // Refresh education data
            loadInitialData(memberId);
          }
        }
      ]);
    } else {
      throw new Error(result.message || 'Failed to update education entry');
    }

  } catch (error) {
    console.error('❌ Error updating education entry:', error);
    Alert.alert('Update Failed', `Failed to update education entry: ${error.message}`);
  } finally {
    setEducationEditLoading(false);
  }
};

const deleteCurrentEducation = async () => {
  // Get the current education entry to show in confirmation
  const currentEducationEntry = educationData[currentEducationIndex];
  
  Alert.alert(
    'Delete Education Entry',
    `Are you sure you want to delete this education entry?\n\n${editingEducationData.degree} from ${editingEducationData.college}`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setEducationEditLoading(true);

            // Get user information
            const userInfo = await getUserInfoForEducation();
            
            if (!userInfo.regdMobileNo || !userInfo.userEmailId) {
              Alert.alert('Error', 'User information not available. Please try refreshing the screen.');
              return;
            }

            // Check if education ID exists
            if (!currentEducationEntry._id && !currentEducationEntry.eduId) {
              Alert.alert('Error', 'Education ID not found. Cannot delete entry.');
              return;
            }

            // Get base URL
            const baseUrl = await ConfigService.getBaseUrl();

            // Build query parameters instead of request body
            const queryParams = new URLSearchParams({
              leader_regd_mobile_no: userInfo.regdMobileNo,
              user_email_id: userInfo.userEmailId,
              eduId: currentEducationEntry._id || currentEducationEntry.eduId
            }).toString();

            console.log('🗑️ Deleting education entry with query params:', queryParams);

            // Use authDelete with query parameters (no body)
            const result = await ApiService.authDelete(
              `${baseUrl}/api/edudata/entry?${queryParams}`
            );

            if (result.success) {
              Alert.alert('Success', 'Education entry deleted successfully!', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Check if this was the last education entry
                    if (educationData.length <= 1) {
                      // Close modal if no more entries
                      setEditEducationModalVisible(false);
                    } else {
                      // Adjust current index if needed
                      const newIndex = currentEducationIndex >= educationData.length - 1 ? 
                        0 : currentEducationIndex;
                      
                      setCurrentEducationIndex(newIndex);
                    }
                    
                    // Refresh education data
                    loadInitialData(memberId);
                  }
                }
              ]);
            } else {
              throw new Error(result.message || 'Failed to delete education entry');
            }

          } catch (error) {
            console.error('❌ Error deleting education entry:', error);
            Alert.alert('Delete Failed', `Failed to delete education entry: ${error.message}`);
          } finally {
            setEducationEditLoading(false);
          }
        }
      }
    ]
  );
};
  // PUT API calls for updating data using ApiService (unchanged but with enhanced logging)
const updateMemberCoordinates = async (memberIdentifier, data) => {
  try {
    console.log('Updating member coordinates as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/coordinates/`;
    
    // ✅ ADD THIS: Remove image fields from data before sending
    const cleanedData = { ...data };
    delete cleanedData.leader_photo;
    delete cleanedData.profile_image;
    delete cleanedData.member_photo;
    
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      leader_coordinates: cleanedData  // ✅ Use cleanedData instead of data
    };
    
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('Member coordinates update result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (update coordinates):', error);
    return { success: false, error: error.message };
  }
};

const deleteMemberCoordinates = async (memberIdentifier) => {
  try {
    console.log('Deleting member coordinates as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/coordinates/?${queryParams}`;
    
    // Use authDelete to include Authorization + x-app-key headers
    const result = await ApiService.authDelete(endpoint);
    
    console.log('Delete API Response:', result);
    
    if (result.success) {
      console.log('Member coordinates deleted successfully');
      return {
        success: true,
        data: result.data,
        error: null
      };
    } else {
      let errorMessage = 'Delete failed';
      
      if (result.error) {
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (typeof result.error === 'object') {
          errorMessage = result.error.message || result.error.error || JSON.stringify(result.error);
        }
      } else if (result.message) {
        errorMessage = result.message;
      }
      
      console.log('Delete failed:', errorMessage);
      return {
        success: false,
        data: null,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error('API Error (delete coordinates):', error);
    return { 
      success: false, 
      error: error.message || 'Network error occurred' 
    };
  }
};
 const updateSocialMedia = async (memberIdentifier, data) => {
  try {
    console.log('Updating social media as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/socialmedia/`;
    
    // Request body structure from Postman
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      social_media: {
        ...data
      }
    };
    
    // Use authPut to include Authorization + x-app-key headers
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('Social media update result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (update social media):', error);
    return { success: false, error: error.message };
  }
};

const deleteSocialMedia = async (memberIdentifier) => {
  try {
    console.log('Deleting social media as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/socialmedia/?${queryParams}`;
    
    // Use authDelete to include Authorization + x-app-key headers
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('Social media deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('API Error (delete social media):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

const updatePersonalDetails = async (memberIdentifier, data) => {
  try {
    console.log('Updating personal details as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Simple endpoint without query parameters
    const endpoint = `${baseUrl}/api/personaldetails/`;
    
    // Request body - fields at root level (NOT nested in personal_details)
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      ...data  // Spread data at root level
    };
    
    console.log('PUT request payload:', requestBody);
    
    // Use authPut to include Authorization + x-app-key headers
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('Personal details update result:', result.success);
    
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (update personal details):', error);
    return { success: false, error: error.message };
  }
};

const deletePersonalDetails = async (memberIdentifier) => {
  try {
    console.log('Deleting personal details as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build query parameters (NOT path parameter)
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/personaldetails/?${queryParams}`;
    
    // Use authDelete to include Authorization + x-app-key headers
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('Personal details deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('API Error (delete personal details):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};
  const updateEducationalDetails = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating educational details as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/edudata/${memberIdentifier}`;
      
      const requestBody = {
        leader_edu_data: {
          regd_mobile_no: memberIdentifier,
          edu_qual: Array.isArray(data.edu_qual) ? data.edu_qual : [data]
        }
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Educational details update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update education):', error);
      return { success: false, error: error.message };
    }
  };

const deleteEducationalDetails = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting ALL educational details as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // ✅ CRITICAL: Build query parameters (NOT path parameter)
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
      // ❌ NO eduId here - we're deleting ALL education data
    }).toString();
    
    const endpoint = `${baseUrl}/api/edudata/?${queryParams}`;
    
    console.log('🗑️ Deleting ALL education data:', endpoint);
    
    // ✅ Use authDelete (requires authentication)
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('✅ ALL Educational details deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('❌ API Error (delete ALL educational details):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

const updatePermanentAddress = async (memberIdentifier, data) => {
  try {
    console.log('Updating permanent address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/permaddress/`;
    
    // ✅ FIX: leader_regd_mobile_no should be at ROOT, not inside perm_address
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,  // ✅ ROOT LEVEL
      user_email_id: userEmailId,
      perm_address: {
        ...data  // ❌ Don't add regd_mobile_no here
        // Remove the line that adds regd_mobile_no inside perm_address
      }
    };
    
    console.log('📤 Sending permanent address update:', requestBody);
    console.log('📱 Mobile number being sent:', memberIdentifier);
    
    // Use authPut to include Authorization + x-app-key headers
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('📥 Permanent address API response:', result);
    
    // Check for success in multiple ways
    const isSuccess = result.success || 
                     (result.message && result.message.toLowerCase().includes('success')) ||
                     (result.message && result.message.toLowerCase().includes('updated'));
    
    if (isSuccess) {
      console.log('✅ Permanent address update successful');
      return {
        success: true,
        data: result.data || result,
        error: null
      };
    } else {
      throw new Error(result.message || result.error || 'Update failed');
    }
  } catch (error) {
    console.error('❌ API Error (update permanent address):', error);
    const errorMessage = error.message || 
                        (error.error && error.error.message) || 
                        JSON.stringify(error);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};
const deletePermanentAddress = async (memberIdentifier) => {
  try {
    console.log('Deleting permanent address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/permaddress/?${queryParams}`;
    
    // Use authDelete to include Authorization + x-app-key headers
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('Permanent address deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('API Error (delete permanent address):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

const updatePresentAddress = async (memberIdentifier, data) => {
  try {
    console.log('Updating present address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/preaddress/`;
    
    // ✅ FIX: leader_regd_mobile_no should be at ROOT, not inside present_address
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,  // ✅ ROOT LEVEL
      user_email_id: userEmailId,
      present_address: {
        ...data  // ❌ Don't add regd_mobile_no here
      }
    };
    
    console.log('📤 Sending present address update:', requestBody);
    console.log('📱 Mobile number being sent:', memberIdentifier);
    
    // Use authPut to include Authorization + x-app-key headers
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('📥 Present address API response:', result);
    
    // Check for success in multiple ways
    const isSuccess = result.success || 
                     (result.message && result.message.toLowerCase().includes('success')) ||
                     (result.message && result.message.toLowerCase().includes('updated'));
    
    if (isSuccess) {
      console.log('✅ Present address update successful');
      return {
        success: true,
        data: result.data || result,
        error: null
      };
    } else {
      throw new Error(result.message || result.error || 'Update failed');
    }
  } catch (error) {
    console.error('❌ API Error (update present address):', error);
    const errorMessage = error.message || 
                        (error.error && error.error.message) || 
                        JSON.stringify(error);
    return { 
      success: false, 
      error: errorMessage 
    };
  }
};

const deletePresentAddress = async (memberIdentifier) => {
  try {
    console.log('Deleting present address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build query parameters
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/preaddress/?${queryParams}`;
    
    // Use authDelete to include Authorization + x-app-key headers
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('Present address deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('API Error (delete present address):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

  const updateTimeline = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating timeline as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/leadertimeline/${memberIdentifier}`;
      
      const requestBody = {
        timeline: Array.isArray(data) ? data : [data]
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Timeline update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update timeline):', error);
      return { success: false, error: error.message };
    }
  };

// ✅ REPLACE THIS ENTIRE FUNCTION:
const deleteTimeline = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting ALL timeline data as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // ✅ FIXED: Use query parameters (matching your Postman DELETE)
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
      // ❌ NO timelineId here - we're deleting ALL timeline data
    }).toString();
    
    const endpoint = `${baseUrl}/api/leadertimeline/?${queryParams}`;
    
    console.log('🗑️ Deleting ALL timeline data:', endpoint);
    
    // Use authDelete (requires authentication)
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('✅ ALL Timeline data deleted successfully');
      return { success: true, data: result.data, error: null };
    } else {
      let errorMessage = 'Delete failed';
      if (result.error) {
        errorMessage = typeof result.error === 'string' ? result.error : 
                      result.error.message || JSON.stringify(result.error);
      }
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('❌ API Error (delete ALL timeline):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};


 const loadInitialData = async (memberIdentifier) => {
  if (!memberIdentifier) {
    console.error('❌ No member identifier provided');
    return;
  }
  await loadProfileData(memberIdentifier);
  // ✅ REMOVED: await loadTimelineData(memberIdentifier); 
  // Timeline is already loaded inside loadProfileData with caching
};


const loadProfileData = async (memberIdentifier) => {
  try {
    console.log('📡 ========================================');
    console.log('📡 LOADING PROFILE DATA');
    console.log('📡 ========================================');
    console.log('📱 Member ID:', memberIdentifier);

    setKylMediaLoading(true);

    // ✅ Get current user info
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    console.log('📧 User Email:', userEmailId);

    // ✅ STEP 1: CHECK IF FIRST LAUNCH (with better detection)
    const isFirstLaunch = await LocalStorageService.isFirstLaunch();
    console.log('🚀 Is First Launch:', isFirstLaunch);

    // ✅ DEBUG: Show what data exists in cache
    if (!isFirstLaunch) {
      console.log('📦 Checking existing cache contents...');
      const cacheKeys = [
        'LEADER_COORDINATES', 'SOCIAL_MEDIA', 'PERSONAL_DETAILS',
        'EDUCATION_DATA', 'PERMANENT_ADDRESS', 'PRESENT_ADDRESS', 'TIMELINE_DATA', 'KYL_MEDIA'
      ];
      for (const key of cacheKeys) {
        const cached = await LocalStorageService.getData(key);
        console.log(`   ${key}: ${cached ? '✅ EXISTS' : '❌ MISSING'}`);
      }
    }

    let updateFlags = null;
    
    if (isFirstLaunch) {
      // ✅ FIRST LAUNCH: Fetch ALL APIs and store data
      console.log('\n🆕 === FIRST LAUNCH - FETCHING ALL DATA ===');
      
      // Fetch all data in parallel
      const results = await Promise.allSettled([
        fetchAndStoreData('LEADER_COORDINATES', fetchMemberCoordinates, memberIdentifier),
        fetchAndStoreData('SOCIAL_MEDIA', fetchSocialMedia, memberIdentifier),
        fetchAndStoreData('PERSONAL_DETAILS', fetchPersonalDetails, memberIdentifier),
        fetchAndStoreData('EDUCATION_DATA', fetchEducationalDetails, memberIdentifier),
        fetchAndStoreData('PERMANENT_ADDRESS', fetchPermanentAddress, memberIdentifier),
        fetchAndStoreData('PRESENT_ADDRESS', fetchPresentAddress, memberIdentifier),
        fetchAndStoreData('TIMELINE_DATA', fetchTimeline, memberIdentifier),
        fetchAndStoreData('KYL_MEDIA', fetchKYLMedia, memberIdentifier)
      ]);
      
      // Log any failures
      results.forEach((result, index) => {
        const keys = ['LEADER_COORDINATES', 'SOCIAL_MEDIA', 'PERSONAL_DETAILS', 'EDUCATION_DATA', 
                      'PERMANENT_ADDRESS', 'PRESENT_ADDRESS', 'TIMELINE_DATA', 'KYL_MEDIA'];
        if (result.status === 'rejected') {
          console.log(`   ⚠️ ${keys[index]} fetch failed:`, result.reason);
        }
      });
      
      // Mark as launched
      await LocalStorageService.setHasLaunched();
      console.log('✅ First launch completed - App marked as launched');
      
      // Create initial update flags (all false since we just fetched everything)
      const initialFlags = {
        updatedContactus: false,
        updatedSM: false,
        updatedPersdet: false,
        updatedEducation: false,
        updatedPermaddr: false,
        updatedPresadd: false,
        updatedTimeline: false,
        updatedKYL: false
      };
      await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(initialFlags));
      console.log('✅ Initial update flags set to false');
      
   } else {
  console.log('\n🔄 === SUBSEQUENT LAUNCH ===');
  
  updateFlags = await UpdateStatusService.checkUpdateStatus(
    memberIdentifier,
    userEmailId
  );
  
  // ✅ ADD THIS BLOCK HERE:
  if (updateFlags) {
    console.log('\n📊 === FLAG ANALYSIS ===');
    console.log('updatedContactus:', updateFlags.updatedContactus, '→', updateFlags.updatedContactus === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedSM:', updateFlags.updatedSM, '→', updateFlags.updatedSM === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedPersdet:', updateFlags.updatedPersdet, '→', updateFlags.updatedPersdet === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedEducation:', updateFlags.updatedEducation, '→', updateFlags.updatedEducation === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedPermaddr:', updateFlags.updatedPermaddr, '→', updateFlags.updatedPermaddr === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedPresadd:', updateFlags.updatedPresadd, '→', updateFlags.updatedPresadd === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedTimeline:', updateFlags.updatedTimeline, '→', updateFlags.updatedTimeline === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('updatedKYL:', updateFlags.updatedKYL, '→', updateFlags.updatedKYL === true ? '🔴 FETCH' : '🟢 CACHE');
    console.log('===========================\n');
    
    await UpdateStatusService.clearUpdatedCaches(updateFlags);
  } else {
    console.log('⚠️ No update flags received - will fetch all data fresh');
    // If we can't get update flags, fetch everything fresh
    updateFlags = {
      updatedContactus: true,
      updatedSM: true,
      updatedPersdet: true,
      updatedEducation: true,
      updatedPermaddr: true,
      updatedPresadd: true,
      updatedTimeline: true,
      updatedKYL: true
    };
  }
}

    // ✅ STEP 2: LOAD DATA (from cache or fetch fresh based on flags)
    console.log('\n📦 === LOADING DATA WITH CACHING LOGIC ===');
    
    const [
      memberCoordinates,
      socialMedia,
      personalDetails,
      educationalDetails,
      permanentAddress,
      presentAddress,
      timelineResult,
      kylMedia
    ] = await Promise.all([
      loadDataWithCache('LEADER_COORDINATES', fetchMemberCoordinates, memberIdentifier, updateFlags?.updatedContactus),
      loadDataWithCache('SOCIAL_MEDIA', fetchSocialMedia, memberIdentifier, updateFlags?.updatedSM),
      loadDataWithCache('PERSONAL_DETAILS', fetchPersonalDetails, memberIdentifier, updateFlags?.updatedPersdet),
      loadDataWithCache('EDUCATION_DATA', fetchEducationalDetails, memberIdentifier, updateFlags?.updatedEducation),
      loadDataWithCache('PERMANENT_ADDRESS', fetchPermanentAddress, memberIdentifier, updateFlags?.updatedPermaddr),
      loadDataWithCache('PRESENT_ADDRESS', fetchPresentAddress, memberIdentifier, updateFlags?.updatedPresadd),
      loadDataWithCache('TIMELINE_DATA', fetchTimeline, memberIdentifier, updateFlags?.updatedTimeline),
      loadDataWithCache('KYL_MEDIA', fetchKYLMedia, memberIdentifier, updateFlags?.updatedKYL)
    ]);

    // ❌ DELETE THIS ENTIRE SECTION - IT'S DUPLICATE:
    // // ✅ STEP 3: KYL Media - Always fetch fresh (not cached)
    // console.log('\n📸 === FETCHING KYL MEDIA (ALWAYS FRESH) ===');
    // const kylMedia = await fetchKYLMedia(memberIdentifier);

    // ✅ STEP 3: SET ALL DATA TO STATE
    console.log('\n💾 === SETTING DATA TO STATE ===');
    
    // Set Leader Coordinates
    if (memberCoordinates.success && memberCoordinates.data?.leader_coordinates) {
      console.log('   ✅ Setting Leader Coordinates');
      const leaderData = memberCoordinates.data.leader_coordinates;
      
      // Handle profile image
      if (leaderData.leader_photo || leaderData.profile_image) {
        const originalPhotoUrl = leaderData.leader_photo || leaderData.profile_image;
        let normalizedPhotoUrl = await ImageService.normalizeImageUrl(originalPhotoUrl);
        
        if (normalizedPhotoUrl) {
          normalizedPhotoUrl = `${normalizedPhotoUrl}?t=${Date.now()}`;
        }
        
        leaderData.profile_image = normalizedPhotoUrl;
        leaderData.leader_photo = normalizedPhotoUrl;
      }
      
      setMemberData(leaderData);
    } else {
      console.log('   ⚠️ No Leader Coordinates data');
      setMemberData(null);
    }

    // Set Social Media
    if (socialMedia.success && socialMedia.data?.social_media) {
      console.log('   ✅ Setting Social Media');
      setSocialMediaData(socialMedia.data.social_media);
    } else {
      console.log('   ⚠️ No Social Media data');
      setSocialMediaData(null);
    }

    // Set Personal Details
    if (personalDetails.success && personalDetails.data?.personal_details) {
      console.log('   ✅ Setting Personal Details');
      setPersonalData(personalDetails.data.personal_details);
    } else {
      console.log('   ⚠️ No Personal Details data');
      setPersonalData(null);
    }

    // Set Education Data
    if (educationalDetails.success && educationalDetails.data?.leader_edu_data) {
      console.log('   ✅ Setting Education Data');
      setEducationData(educationalDetails.data.leader_edu_data.edu_qual);
    } else {
      console.log('   ⚠️ No Education data');
      setEducationData(null);
    }

    // Set KYL Media
    if (kylMedia.success && kylMedia.data) {
      console.log('   ✅ Setting KYL Media:', kylMedia.data.length, 'items');
      setKylMediaData(kylMedia.data);
    } else {
      console.log('   ⚠️ No KYL Media data');
      setKylMediaData([]);
    }

    setKylMediaLoading(false);

    // Set Address Data
    const addresses = {
      permanent: permanentAddress.success ? permanentAddress.data.perm_address : null,
      present: presentAddress.success ? presentAddress.data.present_address : null
    };
    
    if (addresses.permanent) {
      console.log('   ✅ Setting Permanent Address');
    } else {
      console.log('   ⚠️ No Permanent Address data');
    }
    
    if (addresses.present) {
      console.log('   ✅ Setting Present Address');
    } else {
      console.log('   ⚠️ No Present Address data');
    }
    
    setAddressData(addresses);

    // Set Timeline Data
    if (timelineResult.success && timelineResult.data?.timeline) {
      console.log('   ✅ Setting Timeline Data:', timelineResult.data.timeline.length, 'entries');
      setTimelineData(timelineResult.data.timeline);
    } else {
      console.log('   ⚠️ No Timeline data');
      setTimelineData(null);
    }

    console.log('\n✅ ========================================');
    console.log('✅ PROFILE DATA LOADED SUCCESSFULLY');
    console.log('✅ ========================================\n');
    
  } catch (error) {
    console.error('\n❌ ========================================');
    console.error('❌ PROFILE DATA LOADING ERROR');
    console.error('❌ ========================================');
    console.error('❌ Error:', error.message);
    console.error('❌ Stack:', error.stack);
    
    setKylMediaLoading(false);
    
    Alert.alert(
      'Error Loading Data', 
      `Failed to load profile data:\n\n${error.message}\n\nPlease try again.`,
      [
        { text: 'Cancel' },
        { text: 'Retry', onPress: () => loadProfileData(memberIdentifier) }
      ]
    );
  }
};

// ✅ HELPER: Fetch and store data (for first launch)
const fetchAndStoreData = async (cacheKey, fetchFunction, memberIdentifier) => {
  try {
    console.log(`   🔄 Fetching ${cacheKey}...`);
    const result = await fetchFunction(memberIdentifier);
    
    if (result.success && result.data) {
      await LocalStorageService.storeData(cacheKey, result.data);
      console.log(`   ✅ ${cacheKey} fetched and stored`);
    } else {
      console.log(`   ⚠️ ${cacheKey} fetch failed:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Error fetching ${cacheKey}:`, error);
    throw error;
  }
};

// ✅ HELPER: Load data with caching logic
// ✅ IMPROVED: Load data with proper caching logic
// ✅ HELPER: Load data with caching logic
const loadDataWithCache = async (cacheKey, fetchFunction, memberIdentifier, updateFlag) => {
  try {
    const cached = await LocalStorageService.getData(cacheKey);
    const hasCachedData = !!cached;
    
    // ✅ CRITICAL FIX: Convert any type to boolean
    let booleanFlag = null;
    
    if (updateFlag === true || updateFlag === 'true' || updateFlag === 1 || updateFlag === '1') {
      booleanFlag = true;
    } else if (updateFlag === false || updateFlag === 'false' || updateFlag === 0 || updateFlag === '0') {
      booleanFlag = false;
    } else if (updateFlag === undefined || updateFlag === null) {
      booleanFlag = null;
    }
    
    console.log(`\n🔍 ${cacheKey}:`);
    console.log(`   💾 Cache exists: ${hasCachedData}`);
    console.log(`   🚩 Flag: ${updateFlag} → ${booleanFlag}`);
    
    // ✅ IMPROVED Decision logic
    let shouldFetchFresh;
    
    if (!hasCachedData) {
      // No cache at all - must fetch fresh
      shouldFetchFresh = true;
      console.log(`   ❌ No cache → FETCH`);
    } else if (booleanFlag === true) {
      // Flag is TRUE - data was updated on backend, fetch fresh
      shouldFetchFresh = true;
      console.log(`   🔴 Flag TRUE → FETCH`);
    } else if (booleanFlag === false) {
      // Flag is FALSE - data NOT updated, use cache
      shouldFetchFresh = false;
      console.log(`   🟢 Flag FALSE → CACHE`);
    } else {
      // ✅ FIX: Flag is null/undefined - means backend didn't send this flag
      // Since we have cache, use it (assume no changes)
      shouldFetchFresh = false;
      console.log(`   ⚪ No flag (backend didn't send) → CACHE`);
    }
    
    if (shouldFetchFresh) {
      console.log(`   📡 Calling API...`);
      const result = await fetchFunction(memberIdentifier);
      
      if (result.success && result.data) {
        await LocalStorageService.storeData(cacheKey, result.data);
        
        // ✅ Mark as updated (false) in local flags
        const flagName = Object.keys(UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY).find(
          key => UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY[key] === cacheKey
        );
        if (flagName) {
          await UpdateStatusService.markAsUpdated(flagName);
        }
        
        return result;
      } else {
        // ✅ API failed but we have cache - use cache as fallback
        if (hasCachedData) {
          console.log(`   ⚠️ API failed, using cache as fallback`);
          return { success: true, data: cached };
        }
        return result;
      }
    } else {
      console.log(`   💾 Using cache - NO API CALL`);
      return { success: true, data: cached };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    // ✅ On error, try to use cache if available
    const cached = await LocalStorageService.getData(cacheKey);
    if (cached) {
      console.log(`   ⚠️ Error occurred, using cache as fallback`);
      return { success: true, data: cached };
    }
    return { success: false, error: error.message };
  }
};


 /* const loadTimelineData = async (memberIdentifier) => {
    try {
      console.log('📡 Loading timeline data for member:', memberIdentifier);
      const result = await fetchTimeline(memberIdentifier);
      
      if (result.success && result.data.timeline) {
        setTimelineData(result.data.timeline);
        console.log('✅ Timeline data loaded successfully:', result.data.timeline);
      } else {
        console.error('Failed to load timeline data:', result.error);
        setTimelineData([]);
      }
    } catch (error) {
      console.error('Timeline data loading error:', error);
      setTimelineData([]);
    }
  };*/

  const onRefresh = async () => {
    setRefreshing(true);
    // Refresh admin status first
    await checkAdminRole();
    if (memberId) {
      await loadInitialData(memberId);
    } else {
      await initializeApp();
    }
    setRefreshing(false);
  };

  // Enhanced edit functionality with better admin checking
  const openEditModal = (type, data) => {
    // Real-time admin check
    if (!isAdmin) {
      Alert.alert(
        'Access Denied', 
        `You need admin privileges to edit this data.\n\n` +
        `Current Status:\n` +
        `• Role: ${userRole}\n` +
        `• Logged In: ${isLoggedIn ? 'Yes' : 'No'}\n` +
        `• Admin: ${isAdmin ? 'Yes' : 'No'}\n\n` +
        `To get admin access, please log in as the app owner.`,
        [
          { text: 'OK' },
          { text: 'Check Status', onPress: () => showCurrentStatus() }
        ]
      );
      return;
    }

    console.log(`🔓 Opening edit modal for: ${type} (Admin verified)`);
    setEditType(type);
    setEditData({ ...data });
    setEditModalVisible(true);
  };

  // Enhanced renderEditForm with comprehensive field filtering
const renderEditForm = () => {
  const renderInput = (key, value, placeholder) => (
    <View key={key} style={styles.editInputContainer}>
      <Text style={styles.editInputLabel}>
        {key.replace(/_/g, ' ').toUpperCase()}
      </Text>
      <TextInput
        style={styles.editInput}
        value={String(value || '')} 
        onChangeText={(text) => setEditData({...editData, [key]: text})}
        placeholder={placeholder}
        multiline={key.includes('address') || key.includes('details') || key.includes('desc')}
        numberOfLines={key.includes('address') || key.includes('details') || key.includes('desc') ? 3 : 1}
      />
    </View>
  );

  if (!editData) return null;

  // Handle educational data specially
  if (editType.startsWith('education')) {
    const educationFields = ['degree', 'college', 'university', 'place'];
    return (
      <View style={styles.editFormContainer}>
        <Text style={styles.editSectionTitle}>
          {editType === 'education_new' ? 'Add New Education' : 'Edit Education Entry'}
        </Text>
        {educationFields.map((field) => (
          renderInput(
            field,
            editData[field],
            `Enter ${field.replace(/_/g, ' ')}`
          )
        ))}
      </View>
    );
  }
  
  // ✅ UPDATE THIS SECTION - Add leader_photo and profile_image to excluded fields
 const excludedFields = [
    'id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
    '__v', 'version', 'regd_mobile_no', 'regdMobileNo', 'regd_mobile_number',
    'registered_mobile_no', 'registered_mobile_number', 'reg_mobile_no',
    'reg_mobile_number', 'member_id', 'user_id', 'created_by', 'updated_by',
    'modified_at', 'modified_by', 'created_date', 'updated_date',
    'timestamp', 'last_modified', 'edu_qual',
    'leader_photo', 'profile_image', 'member_photo'  // ✅ ADD THESE
  ];

  // Get filterable fields
  const editableFields = Object.keys(editData).filter(key => {
    const lowerKey = key.toLowerCase();
    const value = editData[key];
    
    // Exclude arrays and objects (except simple objects)
    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
      return false;
    }
    
    // Check if field should be excluded
    const shouldExclude = excludedFields.some(excludedField => 
      lowerKey === excludedField.toLowerCase() || 
      lowerKey.includes(excludedField.toLowerCase())
    );
    
    return !shouldExclude;
  });

  return (
    <View style={styles.editFormContainer}>
      {editableFields.length > 0 ? (
        editableFields.map((key) => {
          return renderInput(
            key,
            editData[key],
            `Enter ${key.replace(/_/g, ' ')}`
          );
        })
      ) : (
        <View style={styles.noEditableFieldsContainer}>
          <Text style={styles.noEditableFieldsText}>
            No editable fields available for this data type.
          </Text>
          <Text style={styles.noEditableFieldsSubText}>
            All fields are system-generated or non-editable.
          </Text>
        </View>
      )}
    </View>
  );
};

  // Enhanced save function with field filtering
 const handleSaveEdit = async () => {
  if (!memberId || !editType) return;

  // Double-check admin status before saving
  if (!isAdmin) {
    Alert.alert('Access Denied', 'Admin privileges required to save changes.');
    return;
  }

  setEditLoading(true);
  
  try {
    console.log(`💾 Saving edit as admin: ${editType}`);
    
    let result;
    
    // Handle educational data specially
    if (editType.startsWith('education')) {
      if (editType === 'education_new') {
        // Add new education entry
        const newEducationData = [...(educationData || []), editData];
        result = await updateEducationalDetails(memberId, { edu_qual: newEducationData });
      } else {
        // Update existing education entry
        const index = parseInt(editType.split('_')[1]);
        const updatedEducationData = [...educationData];
        updatedEducationData[index] = editData;
        result = await updateEducationalDetails(memberId, { edu_qual: updatedEducationData });
      }
    } else {
      // Filter out system fields before sending to API for other data types
      const excludedFields = [
        'id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
        '__v', 'version', 'regd_mobile_no', 'regdMobileNo', 'regd_mobile_number',
        'registered_mobile_no', 'registered_mobile_number', 'reg_mobile_no',
        'reg_mobile_number', 'created_by', 'updated_by', 'modified_at',
        'modified_by', 'created_date', 'updated_date', 'timestamp', 'last_modified'
      ];

      const cleanedData = Object.keys(editData)
        .filter(key => {
          const lowerKey = key.toLowerCase();
          const value = editData[key];
          
          // Exclude arrays and complex objects
          if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
            return false;
          }
          
          return !excludedFields.some(excludedField => 
            lowerKey === excludedField.toLowerCase() || 
            lowerKey.includes(excludedField.toLowerCase())
          );
        })
        .reduce((obj, key) => {
          obj[key] = editData[key];
          return obj;
        }, {});

      console.log('Cleaned data for API:', cleanedData);
      
      switch (editType) {
        case 'coordinates':
          result = await updateMemberCoordinates(memberId, cleanedData);
          break;
        case 'social':
          result = await updateSocialMedia(memberId, cleanedData);
          break;
        case 'personal':
          result = await updatePersonalDetails(memberId, cleanedData);
          break;
        case 'permanent_address':
          result = await updatePermanentAddress(memberId, cleanedData);
          break;
        case 'present_address':
          result = await updatePresentAddress(memberId, cleanedData);
          break;
        case 'timeline':
          result = await updateTimeline(memberId, cleanedData);
          break;
        default:
          throw new Error('Unknown edit type');
      }
    }

    if (result.success) {
      Alert.alert('Success', 'Data updated successfully!');
      setEditModalVisible(false);
      // Reload the specific data section
      await loadInitialData(memberId);
    } else {
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('Error updating data:', error);
    Alert.alert('Update Failed', error.message || 'Failed to update data. Please try again.');
  } finally {
    setEditLoading(false);
  }
};

const handleUniversalDelete = async (type, data) => {
  const typeLabels = {
    'coordinates': 'Leader Coordinates',
    'social': 'Social Media',
    'personal': 'Personal Details',
    'education': 'Educational Details',
    'permanent_address': 'Permanent Address',
    'present_address': 'Present Address',
    'timeline': 'Career Timeline'
  };

  Alert.alert(
    'Delete Confirmation',
    `Are you sure you want to delete the ${typeLabels[type]} information? This action cannot be undone.`,
    [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          if (!isAdmin) {
            Alert.alert('Access Denied', 'Admin privileges required to delete data.');
            return;
          }
          
          if (!memberId) {
            Alert.alert('Error', 'Member ID not available.');
            return;
          }
          
          try {
            setLoading(true);
            console.log(`🗑️ Deleting ${type} for member:`, memberId);
            
            let result;
            switch (type) {
              case 'coordinates':
                result = await deleteMemberCoordinates(memberId);
                break;
              case 'social':
                result = await deleteSocialMedia(memberId);
                break;
              case 'personal':
                result = await deletePersonalDetails(memberId);
                break;
              case 'education':
                result = await deleteEducationalDetails(memberId);
                break;
              case 'permanent_address':
                result = await deletePermanentAddress(memberId);
                break;
              case 'present_address':
                result = await deletePresentAddress(memberId);
                break;
              case 'timeline':
                result = await deleteTimeline(memberId);
                break;
              default:
                throw new Error('Unknown delete type');
            }
            
            if (result.success) {
              Alert.alert('Success', `${typeLabels[type]} deleted successfully!`);
              
              // Clear the appropriate state data
              switch (type) {
                case 'coordinates':
                  setMemberData(null);
                  break;
                case 'social':
                  setSocialMediaData(null);
                  break;
                case 'personal':
                  setPersonalData(null);
                  break;
                case 'education':
                  setEducationData(null);
                  break;
                case 'permanent_address':
                  setAddressData(prev => ({ ...prev, permanent: null }));
                  break;
                case 'present_address':
                  setAddressData(prev => ({ ...prev, present: null }));
                  break;
                case 'timeline':
                  setTimelineData(null);
                  break;
              }
              
              // Reload all data
              await loadInitialData(memberId);
            } else {
              const errorMessage = result.error || `Failed to delete ${typeLabels[type]}`;
              Alert.alert('Delete Failed', errorMessage);
            }
          } catch (error) {
            console.error(`❌ Delete ${type} error:`, error);
            const errorMessage = error.message || String(error) || 'An unexpected error occurred';
            Alert.alert('Delete Failed', errorMessage);
          } finally {
            setLoading(false);
          }
        },
      },
    ]
  );
};


const renderActionDropdown = (type, data) => {
  if (!isAdmin || !data) return null;

  const handleDropdownPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setDropdownPosition({ x: pageX - 100, y: pageY + 10 });
    setCurrentDropdownType(type);
    setCurrentDropdownData(data);
    setDropdownVisible(true);
  };

  return (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={handleDropdownPress}
    >
      <Text style={styles.actionButtonText}>⋮</Text>
    </TouchableOpacity>
  );
};




const renderDropdownModal = () => {
  if (!dropdownVisible || !currentDropdownType) return null;

  return (
    <Modal
      visible={dropdownVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setDropdownVisible(false)}
    >
      <TouchableOpacity
        style={styles.dropdownOverlay}
        activeOpacity={1}
        onPress={() => setDropdownVisible(false)}
      >
        <View style={[styles.dropdownMenu, { 
          top: dropdownPosition.y, 
          left: dropdownPosition.x 
        }]}>
         <TouchableOpacity
  style={styles.dropdownItem}
  onPress={() => {
    setDropdownVisible(false);
    // Handle education and timeline edit differently
    if (currentDropdownType === 'education') {
      openEducationEditModal();
    } else if (currentDropdownType === 'timeline') {
      openTimelineEditModal();
    } else {
      openEditModal(currentDropdownType, currentDropdownData);
    }
  }}
>
  <Text style={styles.dropdownItemIcon}>✏️</Text>
  <Text style={styles.dropdownItemText}>Edit</Text>
</TouchableOpacity>
          
          <View style={styles.dropdownSeparator} />
          
          <TouchableOpacity
            style={[styles.dropdownItem, styles.dropdownDeleteItem]}
            onPress={() => {
              setDropdownVisible(false);
              handleUniversalDelete(currentDropdownType, currentDropdownData);
            }}
          >
            <Text style={styles.dropdownItemIcon}>🗑️</Text>
            <Text style={[styles.dropdownItemText, styles.dropdownDeleteText]}>Delete All</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};


const renderAddEducationModal = () => {
  return (
    <Modal
      visible={addEducationModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddEducationModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddEducationModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
             <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Add New Education
</TranslatableText>
            </View>
            <TouchableOpacity
              onPress={submitEducationEntry}
              style={styles.editModalSaveButton}
              disabled={addEducationLoading}
            >
              {addEducationLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <Text style={styles.editSectionTitle}>Education Details</Text>
              
              {/* Degree Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  DEGREE *
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addEducationData.degree}
                  onChangeText={(text) => setAddEducationData({
                    ...addEducationData,
                    degree: text
                  })}
                  placeholder="e.g., B.Tech, M.Tech, MBA, PhD"
                  multiline={false}
                />
              </View>

              {/* College Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  COLLEGE *
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addEducationData.college}
                  onChangeText={(text) => setAddEducationData({
                    ...addEducationData,
                    college: text
                  })}
                  placeholder="e.g., IIT Delhi, DU, etc."
                  multiline={false}
                />
              </View>

              {/* University Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  UNIVERSITY *
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addEducationData.university}
                  onChangeText={(text) => setAddEducationData({
                    ...addEducationData,
                    university: text
                  })}
                  placeholder="e.g., IIT, University of Delhi, etc."
                  multiline={false}
                />
              </View>

              {/* Place Field */}
              <View style={styles.editInputContainer}>
               <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  PLACE *
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addEducationData.place}
                  onChangeText={(text) => setAddEducationData({
                    ...addEducationData,
                    place: text
                  })}
                  placeholder="e.g., Delhi, Mumbai, etc."
                  multiline={false}
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  All fields are required. Please fill in your educational qualification details.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const renderEducationEditModal = () => {
  if (!educationData || !Array.isArray(educationData) || educationData.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={editEducationModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setEditEducationModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setEditEducationModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Edit Education
</TranslatableText>
            </View>
            <View style={styles.headerButtonsContainer}>
              <TouchableOpacity
                onPress={saveCurrentEducation}
                style={styles.editModalSaveButton}
                disabled={educationEditLoading}
              >
                {educationEditLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.editModalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Education Navigation Header */}
          <View style={styles.educationNavHeader}>
            <View style={styles.navigationControls}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  educationData.length <= 1 && styles.navButtonDisabled
                ]}
                onPress={() => navigateEducation('previous')}
                disabled={educationData.length <= 1 || educationEditLoading}
              >
                <TranslatableText
  style={[
    styles.navButtonText,
    { fontSize: fontSize - 2 },
    educationData.length <= 1 && styles.navButtonTextDisabled
  ]}
>
  Previous
</TranslatableText>

              </TouchableOpacity>

              <View style={styles.navIndicator}>
                <Text style={styles.navIndicatorText}>
                  {currentEducationIndex + 1} of {educationData.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  educationData.length <= 1 && styles.navButtonDisabled
                ]}
                onPress={() => navigateEducation('next')}
                disabled={educationData.length <= 1 || educationEditLoading}
              >
               <TranslatableText
  style={[
    styles.navButtonText,
    { fontSize: fontSize - 2 },
    educationData.length <= 1 && styles.navButtonTextDisabled
  ]}
>
  Next
</TranslatableText>

              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <Text style={styles.editSectionTitle}>
                Education Entry {currentEducationIndex + 1}
              </Text>
              
              {/* Degree Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>DEGREE *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingEducationData.degree}
                  onChangeText={(text) => handleEducationInputChange('degree', text)}
                  placeholder="e.g., B.Tech, M.Tech, MBA, PhD"
                  multiline={false}
                />
              </View>

              {/* College Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>COLLEGE *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingEducationData.college}
                  onChangeText={(text) => handleEducationInputChange('college', text)}
                  placeholder="e.g., IIT Delhi, DU, etc."
                  multiline={false}
                />
              </View>

              {/* University Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>UNIVERSITY *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingEducationData.university}
                  onChangeText={(text) => handleEducationInputChange('university', text)}
                  placeholder="e.g., IIT, University of Delhi, etc."
                  multiline={false}
                />
              </View>

              {/* Place Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>PLACE *</Text>
                <TextInput
                  style={styles.editInput}
                  value={editingEducationData.place}
                  onChangeText={(text) => handleEducationInputChange('place', text)}
                  placeholder="e.g., Delhi, Mumbai, etc."
                  multiline={false}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.deleteEducationButton}
                  onPress={deleteCurrentEducation}
                  disabled={educationEditLoading}
                >
                 <TranslatableText style={[styles.deleteEducationButtonText, { fontSize: fontSize }]}>
  Delete This Entry
</TranslatableText>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Use Previous/Next to navigate between education entries. 
                  Save to update current entry or Delete to remove it permanently.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const renderTimelineEditModal = () => {
  if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={editTimelineModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setEditTimelineModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setEditTimelineModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Edit Timeline
</TranslatableText>
            </View>
            <View style={styles.headerButtonsContainer}>
              <TouchableOpacity
                onPress={saveCurrentTimeline}
                style={styles.editModalSaveButton}
                disabled={timelineEditLoading}
              >
                {timelineEditLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.editModalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Timeline Navigation Header */}
          <View style={styles.educationNavHeader}>
            <View style={styles.navigationControls}>
              <TouchableOpacity
                style={[
                  styles.navButton,
                  timelineData.length <= 1 && styles.navButtonDisabled
                ]}
                onPress={() => navigateTimeline('previous')}
                disabled={timelineData.length <= 1 || timelineEditLoading}
              >
                <Text style={[
                  styles.navButtonText,
                  timelineData.length <= 1 && styles.navButtonTextDisabled
                ]}>
                  Previous
                </Text>
              </TouchableOpacity>

              <View style={styles.navIndicator}>
                <Text style={styles.navIndicatorText}>
                  {currentTimelineIndex + 1} of {timelineData.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.navButton,
                  timelineData.length <= 1 && styles.navButtonDisabled
                ]}
                onPress={() => navigateTimeline('next')}
                disabled={timelineData.length <= 1 || timelineEditLoading}
              >
                <Text style={[
                  styles.navButtonText,
                  timelineData.length <= 1 && styles.navButtonTextDisabled
                ]}>
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <Text style={styles.editSectionTitle}>
                Timeline Entry {currentTimelineIndex + 1}
              </Text>
              
{/* Date Field */}
<View style={styles.editInputContainer}>
  <Text style={styles.editInputLabel}>DATE *</Text>
  <TextInput
    style={styles.editInput}
    value={editingTimelineData.date}
    onChangeText={(text) => {
      // ✅ AUTO-FORMAT DATE AS USER TYPES
      const formatted = formatDateInput(text);
      handleTimelineInputChange('date', formatted);
    }}
    placeholder="DD/MM/YYYY (e.g., 25/05/2024)"
    keyboardType="numeric"
    maxLength={10}  // ✅ DD/MM/YYYY = 10 characters
    multiline={false}
  />
  <Text style={styles.inputHelperText}>
    Enter date in DD/MM/YYYY format (slashes will be added automatically)
  </Text>
</View>

              {/* Title Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  TITLE *
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={editingTimelineData.title}
                  onChangeText={(text) => handleTimelineInputChange('title', text)}
                  placeholder="e.g., Member of Lok Sabha"
                  multiline={false}
                />
              </View>

              {/* Title Details Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  TITLE DETAILS *
</TranslatableText>
                <TextInput
                  style={[styles.editInput, { height: 80 }]}
                  value={editingTimelineData.title_details}
                  onChangeText={(text) => handleTimelineInputChange('title_details', text)}
                  placeholder="e.g., Elected to Lok Sabha during General Election 2024"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Additional Info Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  ADDITIONAL INFO
</TranslatableText>
                <TextInput
                  style={[styles.editInput, { height: 80 }]}
                  value={editingTimelineData.additional_info}
                  onChangeText={(text) => handleTimelineInputChange('additional_info', text)}
                  placeholder="e.g., Key contributions and impact on citizens"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.deleteEducationButton}
                  onPress={deleteCurrentTimeline}
                  disabled={timelineEditLoading}
                >
                  <Text style={styles.deleteEducationButtonText}>
                    Delete This Entry
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Use Previous/Next to navigate between timeline entries. 
                  Save to update current entry or Delete to remove it permanently.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
  const renderEditModal = () => {
    return (
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <SafeAreaView style={styles.editModalContainer}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editModalContent}
          >
            {/* Modal Header */}
            <View style={styles.editModalHeader}>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.editModalCloseButton}
              >
                <Text style={styles.editModalCloseText}>✕</Text>
              </TouchableOpacity>
              <View style={styles.editModalTitleContainer}>
                <Text style={styles.editModalTitle}>
                  Edit {editType.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleSaveEdit}
                style={styles.editModalSaveButton}
                disabled={editLoading}
              >
                {editLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.editModalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.editModalBody}>
              {renderEditForm()}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    );
  };

  // Developer Input Modal (deprecated but kept for compatibility)
  const renderDeveloperInputModal = () => {
    return (
      <Modal
        visible={showDevInput}
        animationType="fade"
        transparent={true}
        onRequestClose={closeDevInput}
      >
        <View style={styles.devModalOverlay}>
          <View style={styles.devModalContent}>
            <View style={styles.devModalHeader}>
              <Text style={styles.devModalTitle}>Developer Mode Deprecated</Text>
              <TouchableOpacity onPress={closeDevInput} style={styles.devModalCloseButton}>
                <Text style={styles.devModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.devModalBody}>
              <Text style={styles.devModalDescription}>
                Developer mode has been deprecated. Please log in as the app owner to get admin privileges.
                {'\n\n'}Current Status:{'\n'}
                • Role: {userRole}{'\n'}
                • Admin: {isAdmin ? 'Yes' : 'No'}{'\n'}
                • Logged In: {isLoggedIn ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.devModalFooter}>
              <TouchableOpacity
                style={[styles.devModalButton, styles.devCancelButton]}
                onPress={closeDevInput}
              >
                <Text style={styles.devCancelButtonText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.devModalButton, styles.devSaveButton]}
                onPress={showCurrentStatus}
              >
                <Text style={styles.devSaveButtonText}>Check Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatPhoneNumber = (isd, std, number) => {
    if (!number) return null;
    return `${isd || ''} ${std || ''} ${number}`.trim();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading leader information...</Text>
        </View>
      </View>
    );
  }

const renderModernHeader = () => {
  // If no member data exists, show "Add Leader Coordinates" button
  if (!memberData && isAdmin) {
    return (
      <View style={styles.modernHeader}>
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -30 }]} />
          <View style={[styles.patternCircle, { bottom: -40, left: -20 }]} />
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>👤</Text>
            <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
              No leader coordinates available
            </TranslatableText>
            
            <TouchableOpacity
              style={styles.addEducationButton}
              onPress={() => setAddLeaderCoordinatesModalVisible(true)}
            >
              <Text style={styles.addEducationIcon}>+</Text>
              <TranslatableText style={[styles.addEducationText, { fontSize: fontSize - 2 }]}>
                Add Leader Coordinates
              </TranslatableText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Existing header code when member data exists
  const profileImageUrl = memberData?.profile_image 
    ? `${memberData.profile_image}?t=${Date.now()}` 
    : 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180';
  
  return (
    <View style={styles.modernHeader}>
      {/* Background Pattern */}
      <View style={styles.headerPattern}>
        <View style={[styles.patternCircle, { top: -20, right: -30 }]} />
        <View style={[styles.patternCircle, { bottom: -40, left: -20 }]} />
      </View>
      
      {/* Header Content */}
      <View style={styles.headerContent}>
        <View style={styles.profileRow}>
          <View style={styles.avatarContainer}>
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.avatarImage}
              onError={() => console.log('Failed to load profile image')}
            />
            
            {isAdmin && (
              <TouchableOpacity 
                style={styles.avatarEditButton}
                onPress={() => setEditProfileImageModalVisible(true)}
                activeOpacity={0.7}
              >
                <Icon name="edit" size={14} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.basicInfo}>
            <View style={styles.nameRow}>
              <TouchableOpacity
                style={styles.nameContainer}
                onPress={handleLeaderNamePress}
                activeOpacity={0.8}
              >
                <TranslatableText style={[styles.leaderName, { fontSize: fontSize + 4 }]}>
                  {memberData ? 
                    `${memberData.title || ''} ${memberData.member_name || ''}`.trim() : 
                    'Loading...'
                  }
                </TranslatableText>
              </TouchableOpacity>
              <View style={styles.headerButtonsContainer}>
                {renderActionDropdown('coordinates', memberData)}
              </View>
            </View>
            <TranslatableText style={[styles.designation, { fontSize: fontSize }]}>
              Member of Parliament
            </TranslatableText>
            <View style={styles.locationRow}>
              <Text style={styles.locationText}>
                {memberData ? 
                  `${memberData.constituency || ''}, ${memberData.state || ''}`.replace(', ,', ',').trim() : 
                  'Loading...'
                }
              </Text>
            </View>
          </View>
        </View>
        
        {memberData?.party && (
          <View style={styles.partyContainer}>
            <Text style={styles.partyName}>{memberData.party}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

  const renderSegmentedControl = () => (
    <View style={styles.segmentedContainer}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'profile' && styles.activeSegment
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <TranslatableText 
  style={[
    styles.segmentText,
    activeTab === 'profile' && styles.activeSegmentText,
    { fontSize: fontSize }
  ]}
  cacheKey="profile_details"
>
  Profile Details
</TranslatableText>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'timeline' && styles.activeSegment
          ]}
          onPress={() => setActiveTab('timeline')}
        >
         <TranslatableText 
  style={[
    styles.segmentText,
    activeTab === 'timeline' && styles.activeSegmentText,
    { fontSize: fontSize }
  ]}
  cacheKey="career_timeline"
>
  Career Timeline
</TranslatableText>
        </TouchableOpacity>
      </View>
    </View>
  );

 // Updated renderInfoCard to include dropdown for all cards
const renderInfoCard = (title, icon, children, backgroundColor = '#ffffff', editType = null, editData = null) => (
  <View style={[styles.infoCard, { backgroundColor }]}>
    <View style={styles.cardHeader}>
      <View style={styles.cardTitleContainer}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <TranslatableText style={[styles.cardTitle, { fontSize: fontSize }]}>
  {title}
</TranslatableText>
      </View>
      <View style={styles.cardHeaderRight}>
        <View style={styles.cardAccent} />
        {editType && editData && renderActionDropdown(editType, editData)}
      </View>
    </View>
    <View style={styles.cardBody}>
      {children}
    </View>
  </View>
);


const renderPersonalInfo = () => {
  // If no personal data exists, show "Add Personal Information" button
  if (!personalData) {
    return renderInfoCard('Personal Information', '👤',
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>👤</Text>
       <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
  No personal data available
</TranslatableText>
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.addEducationButton}
            onPress={() => setAddPersonalModalVisible(true)}
          >
            <Text style={styles.addEducationIcon}>+</Text>
            <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Add Personal Information
</TranslatableText>
          </TouchableOpacity>
        )}
      </View>,
      '#ffffff'
    );
  }

  // If personal data exists, show it with edit/delete options
  return renderInfoCard('Personal Information', '👤',
    <View style={styles.infoRows}>
      {personalData.birth_place && (
        <View style={styles.infoRow}>
          <TranslatableText style={[styles.infoLabel, { fontSize: fontSize - 2 }]}>
  Birthplace
</TranslatableText>
          <Text style={styles.infoValue}>{personalData.birth_place}</Text>
        </View>
      )}
      {personalData.dob && (
        <View style={styles.infoRow}>
          <TranslatableText style={[styles.infoLabel, { fontSize: fontSize - 2 }]}>
  Date of Birth
</TranslatableText>
          <Text style={styles.infoValue}>{personalData.dob}</Text>
        </View>
      )}
      {personalData.father_name && (
        <View style={styles.infoRow}>
          <TranslatableText style={[styles.infoLabel, { fontSize: fontSize - 2 }]}>
  Father's Name
</TranslatableText>
          <Text style={styles.infoValue}>{personalData.father_name}</Text>
        </View>
      )}
      {personalData.mother_name && (
        <View style={styles.infoRow}>
          <TranslatableText style={[styles.infoLabel, { fontSize: fontSize - 2 }]}>
  Mother's Name
</TranslatableText>
          <Text style={styles.infoValue}>{personalData.mother_name}</Text>
        </View>
      )}
      {personalData.profession && (
        <View style={styles.infoRow}>
          <TranslatableText style={[styles.infoLabel, { fontSize: fontSize - 2 }]}>
  Profession
</TranslatableText>
          <Text style={styles.infoValue}>{personalData.profession}</Text>
        </View>
      )}
    </View>,
    '#ffffff',
    'personal',
    personalData
  );
};
const submitPersonalEntry = async () => {
  try {
    // Validate form data - at least one field should be filled
    if (!addPersonalData.birth_place.trim() && 
        !addPersonalData.dob.trim() && 
        !addPersonalData.father_name.trim() && 
        !addPersonalData.mother_name.trim() && 
        !addPersonalData.profession.trim()) {
      Alert.alert('Validation Error', 'Please fill at least one field');
      return;
    }

    setAddPersonalLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    // Prepare request payload matching your Postman request
    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      birth_place: addPersonalData.birth_place.trim() || '',
      dob: addPersonalData.dob.trim() || '',
      father_name: addPersonalData.father_name.trim() || '',
      mother_name: addPersonalData.mother_name.trim() || '',
      profession: addPersonalData.profession.trim() || ''
    };

    console.log('📤 Submitting personal information:', requestPayload);
    console.log('📱 Using member ID:', memberId);
    console.log('📧 Using email:', userEmailId);

    // Get tokens to verify they exist
    const accessToken = await EncryptedStorage.getItem('accessToken');
    const appKey = await EncryptedStorage.getItem('APP_KEY');
    
    console.log('🔑 Access Token exists:', !!accessToken);
    console.log('🔑 App Key exists:', !!appKey);

    // Use authPost - this automatically includes Authorization and x-app-key headers
    const result = await ApiService.authPost(
      `${baseUrl}/api/personaldetails/`,
      requestPayload
    );

    console.log('📥 API Response:', result);

    if (result.success) {
      Alert.alert(
        'Success', 
        'Personal information added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddPersonalData({
                birth_place: '',
                dob: '',
                father_name: '',
                mother_name: '',
                profession: ''
              });
              
              // Close modal
              setAddPersonalModalVisible(false);
              
              // Refresh personal data
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add personal information');
    }

  } catch (error) {
    console.error('❌ Error submitting personal information:', error);
    
    // More detailed error handling
    let errorMessage = 'Failed to add personal information';
    
    if (error.message) {
      if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = 'You do not have permission to perform this action.';
      } else {
        errorMessage = error.message;
      }
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setAddPersonalLoading(false);
  }
};

// Submit Permanent Address
// ✅ REPLACE submitPermanentAddressEntry function
const submitPermanentAddressEntry = async () => {
  try {
    // Validate - at least address1 should be filled
    if (!addPermanentAddressData.address1.trim()) {
      Alert.alert('Validation Error', 'Please enter at least Address Line 1');
      return;
    }

    // ✅ VALIDATE MOBILE NUMBERS
    if (addPermanentAddressData.mobile_number1.trim()) {
      const validation1 = validateMobileNumber(addPermanentAddressData.mobile_number1);
      if (!validation1.valid) {
        Alert.alert('Validation Error', `Mobile 1: ${validation1.message}`);
        return;
      }
    }

    if (addPermanentAddressData.mobile_number2.trim()) {
      const validation2 = validateMobileNumber(addPermanentAddressData.mobile_number2);
      if (!validation2.valid) {
        Alert.alert('Validation Error', `Mobile 2: ${validation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE TELEPHONE NUMBERS
    if (addPermanentAddressData.tel_number1.trim()) {
      const telValidation1 = validateTelephoneNumber(addPermanentAddressData.tel_number1);
      if (!telValidation1.valid) {
        Alert.alert('Validation Error', `Telephone 1: ${telValidation1.message}`);
        return;
      }
    }

    if (addPermanentAddressData.tel_number2.trim()) {
      const telValidation2 = validateTelephoneNumber(addPermanentAddressData.tel_number2);
      if (!telValidation2.valid) {
        Alert.alert('Validation Error', `Telephone 2: ${telValidation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE STD CODE
    if (addPermanentAddressData.std_code.trim()) {
      const stdValidation = validateSTDCode(addPermanentAddressData.std_code);
      if (!stdValidation.valid) {
        Alert.alert('Validation Error', `STD Code: ${stdValidation.message}`);
        return;
      }
    }

    setAddPermanentAddressLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    let accessToken = await AsyncStorage.getItem('jwt_token');
    let appKey = await EncryptedStorage.getItem('APP_KEY');

    if (!accessToken || !appKey) {
      Alert.alert('Authentication Error', 'Missing authentication credentials. Please log in again.');
      return;
    }

    // Prepare request payload
    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      perm_address: {
        address1: addPermanentAddressData.address1.trim(),
        address2: addPermanentAddressData.address2.trim() || '',
        address3: addPermanentAddressData.address3.trim() || '',
        pincode: addPermanentAddressData.pincode.trim() || '',
        state: addPermanentAddressData.state.trim() || '',
        isd_code: addPermanentAddressData.isd_code.trim() || '+91',
        std_code: addPermanentAddressData.std_code.trim() || '',
        tel_number1: addPermanentAddressData.tel_number1.trim() || '',
        mobile_number1: addPermanentAddressData.mobile_number1.trim() || '',
        tel_number2: addPermanentAddressData.tel_number2.trim() || '',
        mobile_number2: addPermanentAddressData.mobile_number2.trim() || ''
      }
    };

    const result = await ApiService.authPost(
      `${baseUrl}/api/permaddress/`,
      requestPayload
    );

    if (result.success) {
      Alert.alert(
        'Success', 
        'Permanent address added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddPermanentAddressData({
                address1: '',
                address2: '',
                address3: '',
                pincode: '',
                state: '',
                isd_code: '',
                std_code: '',
                tel_number1: '',
                mobile_number1: '',
                tel_number2: '',
                mobile_number2: ''
              });
              
              setAddPermanentAddressModalVisible(false);
              
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add permanent address');
    }

  } catch (error) {
    console.error('❌ Error submitting permanent address:', error);
    Alert.alert('Error', `Failed to add permanent address: ${error.message}`);
  } finally {
    setAddPermanentAddressLoading(false);
  }
};
// Submit Present Address - CORRECTED VERSION
// ✅ REPLACE submitPresentAddressEntry function
const submitPresentAddressEntry = async () => {
  try {
    if (!addPresentAddressData.address1.trim()) {
      Alert.alert('Validation Error', 'Please enter at least Address Line 1');
      return;
    }

    // ✅ VALIDATE MOBILE NUMBERS
    if (addPresentAddressData.mobile_number1.trim()) {
      const validation1 = validateMobileNumber(addPresentAddressData.mobile_number1);
      if (!validation1.valid) {
        Alert.alert('Validation Error', `Mobile 1: ${validation1.message}`);
        return;
      }
    }

    if (addPresentAddressData.mobile_number2.trim()) {
      const validation2 = validateMobileNumber(addPresentAddressData.mobile_number2);
      if (!validation2.valid) {
        Alert.alert('Validation Error', `Mobile 2: ${validation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE TELEPHONE NUMBERS
    if (addPresentAddressData.tel_number1.trim()) {
      const telValidation1 = validateTelephoneNumber(addPresentAddressData.tel_number1);
      if (!telValidation1.valid) {
        Alert.alert('Validation Error', `Telephone 1: ${telValidation1.message}`);
        return;
      }
    }

    if (addPresentAddressData.tel_number2.trim()) {
      const telValidation2 = validateTelephoneNumber(addPresentAddressData.tel_number2);
      if (!telValidation2.valid) {
        Alert.alert('Validation Error', `Telephone 2: ${telValidation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE STD CODE
    if (addPresentAddressData.std_code.trim()) {
      const stdValidation = validateSTDCode(addPresentAddressData.std_code);
      if (!stdValidation.valid) {
        Alert.alert('Validation Error', `STD Code: ${stdValidation.message}`);
        return;
      }
    }

    setAddPresentAddressLoading(true);

    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      return;
    }

    const baseUrl = await ConfigService.getBaseUrl();

    let accessToken = await AsyncStorage.getItem('jwt_token');
    let appKey = await EncryptedStorage.getItem('APP_KEY');

    if (!accessToken || !appKey) {
      Alert.alert('Authentication Error', 'Missing authentication credentials. Please log in again.');
      return;
    }

    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      present_address: {
        address1: addPresentAddressData.address1.trim(),
        address2: addPresentAddressData.address2.trim() || '',
        address3: addPresentAddressData.address3.trim() || '',
        pincode: addPresentAddressData.pincode.trim() || '',
        state: addPresentAddressData.state.trim() || '',
        isd_code: addPresentAddressData.isd_code.trim() || '+91',
        std_code: addPresentAddressData.std_code.trim() || '',
        tel_number1: addPresentAddressData.tel_number1.trim() || '',
        mobile_number1: addPresentAddressData.mobile_number1.trim() || '',
        tel_number2: addPresentAddressData.tel_number2.trim() || '',
        mobile_number2: addPresentAddressData.mobile_number2.trim() || ''
      }
    };

    const result = await ApiService.authPost(
      `${baseUrl}/api/preaddress/`,
      requestPayload
    );

    if (result.success) {
      Alert.alert(
        'Success', 
        'Present address added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              setAddPresentAddressData({
                address1: '',
                address2: '',
                address3: '',
                pincode: '',
                state: '',
                isd_code: '',
                std_code: '',
                tel_number1: '',
                mobile_number1: '',
                tel_number2: '',
                mobile_number2: ''
              });
              
              setAddPresentAddressModalVisible(false);
              
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add present address');
    }

  } catch (error) {
    console.error('❌ Error submitting present address:', error);
    Alert.alert('Error', `Failed to add present address: ${error.message}`);
  } finally {
    setAddPresentAddressLoading(false);
  }
};

const renderEducationInfo = () => {
  return renderInfoCard('Educational Qualifications', '🎓',
    <View style={styles.educationList}>
      {/* Show existing education data */}
      {educationData && Array.isArray(educationData) && educationData.length > 0 ? (
        educationData.map((edu, index) => (
          <View key={index} style={styles.educationItem}>
            <View style={styles.educationLeft}>
              <View style={styles.educationNumber}>
                <Text style={styles.educationNumberText}>{index + 1}</Text>
              </View>
            </View>
            <View style={styles.educationRight}>
              <Text style={styles.educationDegree}>{edu.degree}</Text>
              <Text style={styles.educationInstitute}>
                {edu.college}{edu.university ? `, ${edu.university}` : ''}
              </Text>
              {edu.place && (
                <Text style={styles.educationPlace}>📍 {edu.place}</Text>
              )}
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🎓</Text>
         <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
  No education data available
</TranslatableText>
        </View>
      )}
      
      {/* Add Education Button - Show for both admin and regular users */}
      {/* Add Education Button - Show only for admin */}
{isAdmin && (
  <TouchableOpacity
    style={styles.addEducationButton}
    onPress={() => setAddEducationModalVisible(true)}
  >
    <Text style={styles.addEducationIcon}>+</Text>
   <TranslatableText style={[styles.addEducationText, { fontSize: fontSize - 2 }]}>
  Add New Education
</TranslatableText>
  </TouchableOpacity>
)}
    </View>,
    '#ffffff',
    'education',
    educationData
  );
};


// ✅ REPLACE renderContactInfo function
const renderContactInfo = () => {
  if (!addressData) return null;

  return (
    <>
      {/* Permanent Address */}
      {addressData.permanent ? (
        renderInfoCard('Permanent Address', '🏠',
          <View style={styles.contactSection}>
            <Text style={styles.addressLine}>
              {[
                addressData.permanent.address1,
                addressData.permanent.address2,
                addressData.permanent.address3
              ].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addressLine}>
              {addressData.permanent.state} - {addressData.permanent.pincode}
            </Text>
            
            <View style={styles.contactButtons}>
              {addressData.permanent.tel_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => {
                    const formattedNumber = formatPhoneNumberForCall(
                      addressData.permanent.isd_code,
                      addressData.permanent.std_code,
                      addressData.permanent.tel_number1
                    );
                    openLink(`tel:${formattedNumber}`);
                  }}
                >
                  <TranslatableText style={[styles.contactBtnText, { fontSize: fontSize - 2 }]}>
                    Call Landline
                  </TranslatableText>
                </TouchableOpacity>
              )}
              {addressData.permanent.mobile_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => {
                    // For mobile, just use ISD + Mobile (no STD code)
                    const isd = (addressData.permanent.isd_code || '+91').replace(/^0+/, '').replace('+', '');
                    openLink(`tel:+${isd}${addressData.permanent.mobile_number1}`);
                  }}
                >
                  <TranslatableText 
                    style={[styles.contactBtnText, { fontSize: fontSize - 2 }]}
                    cacheKey="call_mobile_permanent"
                  >
                    Call Mobile
                  </TranslatableText>
                </TouchableOpacity>
              )}
            </View>
          </View>,
          '#ffffff',
          'permanent_address',
          addressData.permanent
        )
      ) : (
        renderInfoCard('Permanent Address', '🏠',
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏠</Text>
            <Text style={styles.emptyStateText}>No permanent address available</Text>
            
            {isAdmin && (
              <TouchableOpacity
                style={styles.addEducationButton}
                onPress={() => setAddPermanentAddressModalVisible(true)}
              >
                <Text style={styles.addEducationIcon}>+</Text>
                <TranslatableText style={styles.addEducationText}>Add Permanent Address</TranslatableText>
              </TouchableOpacity>
            )}
          </View>,
          '#ffffff'
        )
      )}

      {/* Present Address */}
      {addressData.present ? (
        renderInfoCard('Present Address', '🏢',
          <View style={styles.contactSection}>
            <Text style={styles.addressLine}>
              {[
                addressData.present.address1,
                addressData.present.address2,
                addressData.present.address3
              ].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addressLine}>
              {addressData.present.state} - {addressData.present.pincode}
            </Text>
            
            <View style={styles.contactButtons}>
              {addressData.present.tel_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => {
                    const formattedNumber = formatPhoneNumberForCall(
                      addressData.present.isd_code,
                      addressData.present.std_code,
                      addressData.present.tel_number1
                    );
                    openLink(`tel:${formattedNumber}`);
                  }}
                >
                  <TranslatableText style={[styles.contactBtnText, { fontSize: fontSize - 2 }]}>
                    Call Office
                  </TranslatableText>
                </TouchableOpacity>
              )}
              {addressData.present.mobile_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => {
                    // For mobile, just use ISD + Mobile (no STD code)
                    const isd = (addressData.present.isd_code || '+91').replace(/^0+/, '').replace('+', '');
                    openLink(`tel:+${isd}${addressData.present.mobile_number1}`);
                  }}
                >
                  <Text style={styles.contactBtnText}>Call Mobile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>,
          '#ffffff',
          'present_address',
          addressData.present
        )
      ) : (
        renderInfoCard('Present Address', '🏢',
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🏢</Text>
            <Text style={styles.emptyStateText}>No present address available</Text>
            
            {isAdmin && (
              <TouchableOpacity
                style={styles.addEducationButton}
                onPress={() => setAddPresentAddressModalVisible(true)}
              >
                <Text style={styles.addEducationIcon}>+</Text>
                <TranslatableText style={styles.addEducationText}>Add Present Address</TranslatableText>
              </TouchableOpacity>
            )}
          </View>,
          '#ffffff'
        )
      )}
    </>
  );
};

const renderSocialMedia = () => {
  const socialPlatforms = [
    { key: 'facebook', icon: '📘', name: 'Facebook' },
    { key: 'twitter', icon: '🐦', name: 'Twitter/X' },
    { key: 'linkedin', icon: '💼', name: 'LinkedIn' },
    { key: 'instagram', icon: '📸', name: 'Instagram' }
  ];

  // If no social media data exists, show "Add Social Media" button
  if (!socialMediaData) {
    return renderInfoCard('Social Media Presence', '🌐',
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>🌐</Text>
        <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
          No social media data available
        </TranslatableText>
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.addEducationButton}
            onPress={() => setAddSocialMediaModalVisible(true)}
          >
            <Text style={styles.addEducationIcon}>+</Text>
            <TranslatableText style={[styles.addEducationText, { fontSize: fontSize - 2 }]}>
              Add Social Media
            </TranslatableText>
          </TouchableOpacity>
        )}
      </View>,
      '#ffffff'
    );
  }

  // If social media data exists, show it with edit/delete options
  const activePlatforms = socialPlatforms.filter(platform => 
    socialMediaData[platform.key] && socialMediaData[platform.key].trim() !== ''
  );

  if (activePlatforms.length === 0) {
    return renderInfoCard('Social Media Presence', '🌐',
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>🌐</Text>
        <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
          No social media links added
        </TranslatableText>
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.addEducationButton}
            onPress={() => setAddSocialMediaModalVisible(true)}
          >
            <Text style={styles.addEducationIcon}>+</Text>
            <TranslatableText style={[styles.addEducationText, { fontSize: fontSize - 2 }]}>
              Add Social Media
            </TranslatableText>
          </TouchableOpacity>
        )}
      </View>,
      '#ffffff'
    );
  }

  return renderInfoCard('Social Media Presence', '🌐',
    <View style={styles.socialGrid}>
      {activePlatforms.map((platform, index) => (
        <TouchableOpacity
          key={index}
          style={styles.socialItem}
          onPress={() => openLink(socialMediaData[platform.key])}
        >
          <Text style={styles.socialIcon}>{platform.icon}</Text>
          <View style={styles.socialInfo}>
            <Text style={styles.socialPlatform}>{platform.name}</Text>
            <Text style={styles.socialHandle}>
              {socialMediaData[platform.key].replace(/^https?:\/\/(www\.)?/, '')}
            </Text>
          </View>
          <Text style={styles.socialArrow}>→</Text>
        </TouchableOpacity>
      ))}
    </View>,
    '#ffffff',
    'social',
    socialMediaData
  );
};

// Add this function after submitPresentAddressEntry (around line 800)
const submitSocialMediaEntry = async () => {
  try {
    // Validate - at least one field should be filled
    if (!addSocialMediaData.facebook.trim() && 
        !addSocialMediaData.twitter.trim() && 
        !addSocialMediaData.linkedin.trim() && 
        !addSocialMediaData.instagram.trim()) {
      Alert.alert('Validation Error', 'Please fill at least one social media link');
      return;
    }

    setAddSocialMediaLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    // Prepare request payload matching Postman structure
    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      social_media: {
        facebook: addSocialMediaData.facebook.trim() || '',
        twitter: addSocialMediaData.twitter.trim() || '',
        linkedin: addSocialMediaData.linkedin.trim() || '',
        instagram: addSocialMediaData.instagram.trim() || ''
      }
    };

    console.log('📤 Submitting social media:', requestPayload);

    // Use authPost which includes Authorization + x-app-key headers
    const result = await ApiService.authPost(
      `${baseUrl}/api/socialmedia/`,
      requestPayload
    );

    console.log('📥 API Response:', result.success);

    if (result.success) {
      Alert.alert(
        'Success', 
        'Social media information added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddSocialMediaData({
                facebook: '',
                twitter: '',
                linkedin: '',
                instagram: ''
              });
              
              // Close modal
              setAddSocialMediaModalVisible(false);
              
              // Refresh data
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add social media');
    }

  } catch (error) {
    console.error('❌ Error submitting social media:', error);
    Alert.alert('Error', `Failed to add social media: ${error.message}`);
  } finally {
    setAddSocialMediaLoading(false);
  }
};

const submitLeaderCoordinatesEntry = async () => {
  try {
    // Validate form data
    if (!addLeaderCoordinatesData.member_name.trim()) {
      Alert.alert('Validation Error', 'Please enter member name');
      return;
    }
    if (!addLeaderCoordinatesData.party.trim()) {
      Alert.alert('Validation Error', 'Please enter party name');
      return;
    }
    if (!addLeaderCoordinatesData.constituency.trim()) {
      Alert.alert('Validation Error', 'Please enter constituency');
      return;
    }
    if (!addLeaderCoordinatesData.state.trim()) {
      Alert.alert('Validation Error', 'Please enter state');
      return;
    }

    setAddLeaderCoordinatesLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      setAddLeaderCoordinatesLoading(false);
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    // ✅ MATCH POSTMAN POST REQUEST - Fields at ROOT level (no leader_coordinates wrapper)
    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      title: addLeaderCoordinatesData.title.trim() || '',
      member_name: addLeaderCoordinatesData.member_name.trim(),
      party: addLeaderCoordinatesData.party.trim(),
      constituency: addLeaderCoordinatesData.constituency.trim(),
      state: addLeaderCoordinatesData.state.trim(),
      email_id: addLeaderCoordinatesData.email_id.trim() || '',
      digital_sansad_url: addLeaderCoordinatesData.digital_sansad_url.trim() || ''
    };

    console.log('📤 Submitting leader coordinates (matching Postman POST):');
    console.log(JSON.stringify(requestPayload, null, 2));

    // Use authPost which includes Authorization + x-app-key headers
    const result = await ApiService.authPost(
      `${baseUrl}/api/coordinates`,  // ✅ NO trailing slash (matching Postman)
      requestPayload
    );

    console.log('📥 POST Response:', JSON.stringify(result, null, 2));

    if (result.success) {
      Alert.alert(
        '✅ Success', 
        'Leader coordinates added successfully!',
        [
          {
            text: 'OK',
            onPress: async () => {
              // Reset form
              setAddLeaderCoordinatesData({
                title: '',
                member_name: '',
                party: '',
                constituency: '',
                state: '',
                email_id: '',
                digital_sansad_url: ''
              });
              
              // Close modal
              setAddLeaderCoordinatesModalVisible(false);
              
              // Clear old state
              setMemberData(null);
              
              // Force reload with delay
              setTimeout(async () => {
                console.log('🔄 Reloading data after leader coordinates creation...');
                await loadInitialData(memberId);
                
                setRefreshing(true);
                setTimeout(() => {
                  setRefreshing(false);
                  console.log('✅ Data reloaded with new leader coordinates');
                }, 500);
              }, 500);
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add leader coordinates');
    }

  } catch (error) {
    console.error('❌ Error submitting leader coordinates:', error);
    
    let errorMessage = 'Failed to add leader coordinates';
    
    if (error.message) {
      if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid data format. Please check all fields.';
      } else {
        errorMessage = error.message;
      }
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setAddLeaderCoordinatesLoading(false);
  }
};
const renderKYLMediaGallery = () => {
  if (kylMediaLoading) {
    return (
      <View style={styles.kylMediaContainer}>
        <View style={styles.kylMediaLoadingState}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  const showAddButton = isAdmin && (kylMediaData.length === 0 || kylMediaData.length >= 1);

  return (
    <>
      <View style={styles.kylMediaContainer}>
        <ScrollView 
          ref={kylMediaScrollViewRef} // ✅ Add ref
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kylMediaScrollContent}
          // ✅ Allow manual scrolling for all users
          scrollEnabled={true}
          // ✅ Handle manual scroll (pause auto-scroll temporarily)
          onScrollBeginDrag={() => {
            if (!isAdmin && kylMediaAutoScrollInterval.current) {
              clearInterval(kylMediaAutoScrollInterval.current);
            }
          }}
          // ✅ Resume auto-scroll after manual scroll ends
          onScrollEndDrag={() => {
            if (!isAdmin && kylMediaData && kylMediaData.length > 1) {
              setTimeout(() => {
                kylMediaAutoScrollInterval.current = setInterval(() => {
                  setCurrentKYLMediaIndex((prevIndex) => {
                    const nextIndex = (prevIndex + 1) % kylMediaData.length;
                    if (kylMediaScrollViewRef.current) {
                      kylMediaScrollViewRef.current.scrollTo({
                        x: nextIndex * (330 + 15),
                        animated: true,
                      });
                    }
                    return nextIndex;
                  });
                }, 3000);
              }, 5000); // Resume after 5 seconds
            }
          }}
        >
          {/* Render existing KYL media items */}
          {kylMediaData && kylMediaData.map((item, index) => (
            <KYLMediaImage
              key={item._id || item.id || index}
              item={item}
              index={index}
              isAdmin={isAdmin}
            />
          ))}

          {/* Add New Button - Show if admin AND (0 OR 1+ banners) */}
          {showAddButton && (
            <TouchableOpacity
              style={styles.kylMediaAddButton}
              onPress={() => setAddKYLModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.kylMediaAddContent}>
                <Icon name="add-circle" size={48} color="#e16e2b" />
                <Text style={styles.kylMediaAddText}>
                  {kylMediaData.length === 0 ? 'Add Banner' : 'Add New'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ✅ Optional: Add pagination dots for non-admin users */}
        {!isAdmin && kylMediaData && kylMediaData.length > 1 && (
          <View style={styles.paginationDots}>
            {kylMediaData.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  index === currentKYLMediaIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Edit Modal for existing KYL media */}
      {isAdmin && (
        <EditKYLMediaModal
          visible={editKYLModalVisible}
          item={selectedKYLItem}
          onClose={() => {
            setEditKYLModalVisible(false);
            setSelectedKYLItem(null);
          }}
          onSave={handleKYLSave}
        />
      )}

      {/* Add Modal for new KYL media */}
      {isAdmin && (
        <AddKYLMediaModal
          visible={addKYLModalVisible}
          onClose={() => setAddKYLModalVisible(false)}
          onSave={handleKYLAdd}
        />
      )}
    </>
  );
};

const KYLMediaImage = React.memo(({ item, index, isAdmin }) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    
    const loadKYLImage = async () => {
      if (!item.media_file) {
        console.log('⚠️ No media_file for item:', item._id);
        setImageLoading(false);
        return;
      }
      
      setImageLoading(true);
      setImageError(false);
      
      try {
        const currentUserInfo = await getCurrentUserRole();
        const userEmailId = currentUserInfo.loggedin_email || '';
        
        let mediaUrl = item.media_file;
        
        if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          if (mediaUrl.includes('ngrok-free.app:')) {
            mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
          }
          
          if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
            const baseUrl = await ConfigService.getBaseUrl();
            mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          }
        } else {
          const baseUrl = await ConfigService.getBaseUrl();
          const cleanMediaFile = mediaUrl.replace(/^[\\\/]+/, '');
          const encodedMediaFile = encodeURIComponent(cleanMediaFile);
          const encodedEmail = encodeURIComponent(userEmailId);
          
          mediaUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${memberId}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
        }
        
        const appKey = await EncryptedStorage.getItem('APP_KEY');
        const accessToken = await EncryptedStorage.getItem('accessToken');
        
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

        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (mounted) {
            setImageUri(reader.result);
            setImageLoading(false);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          if (mounted) {
            setImageError(true);
            setImageLoading(false);
          }
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('❌ Error loading KYL image:', error);
        if (mounted) {
          setImageError(true);
          setImageLoading(false);
        }
      }
    };
    
    loadKYLImage();
    
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
    handleKYLEdit(item);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete KYL Media',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => handleKYLDelete(item),
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.kylMediaItem}>
      {/* ✅ Three Dot Menu Button - Only show for admin */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.kylMediaMenuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.kylMediaMenuIcon}>⋮</Text>
        </TouchableOpacity>
      )}

      {/* ✅ Only show menu dropdown for admin */}
      {isAdmin && (
        <ThreeDotMenu
          visible={menuVisible}
          position={menuPosition}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismiss={() => setMenuVisible(false)}
        />
      )}

      {imageLoading && (
        <View style={styles.kylMediaLoadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
        </View>
      )}

      {!imageLoading && imageError && (
        <View style={styles.kylMediaErrorContainer}>
          <Text style={styles.kylMediaErrorIcon}>📷</Text>
          <Text style={styles.kylMediaErrorText}>Image unavailable</Text>
        </View>
      )}

      {/* ✅ WRAP IMAGE IN TOUCHABLE OPACITY TO MAKE IT CLICKABLE */}
      {!imageLoading && !imageError && imageUri && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.media_url && item.media_url.trim() !== '') {
              Linking.openURL(item.media_url).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the link');
              });
            } else {
              Alert.alert('Info', 'No URL available for this image');
            }
          }}
        >
          <Image 
            source={{ uri: imageUri }}
            style={styles.kylMediaImage} 
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

const submitTimelineEntry = async () => {
  try {
    // Validate form data
    if (!addTimelineData.date.trim()) {
      Alert.alert('Validation Error', 'Please enter date');
      return;
    }
    if (!addTimelineData.title.trim()) {
      Alert.alert('Validation Error', 'Please enter title');
      return;
    }
    if (!addTimelineData.title_details.trim()) {
      Alert.alert('Validation Error', 'Please enter title details');
      return;
    }

    // ✅ IMPROVED DATE VALIDATION
    const dateValidation = validateDateFormat(addTimelineData.date.trim());
    if (!dateValidation.valid) {
      Alert.alert('Invalid Date', dateValidation.message);
      return;
    }

    setAddTimelineLoading(true);

    // Get user information
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    if (!memberId) {
      Alert.alert('Error', 'Member ID not available. Please try refreshing the screen.');
      setAddTimelineLoading(false);
      return;
    }

    // Get base URL
    const baseUrl = await ConfigService.getBaseUrl();

    const requestPayload = {
      leader_regd_mobile_no: memberId,
      user_email_id: userEmailId,
      timeline: [
        {
          date: addTimelineData.date.trim(),
          title: addTimelineData.title.trim(),
          title_details: addTimelineData.title_details.trim(),
          additional_info: addTimelineData.additional_info.trim() || ''
        }
      ]
    };

    console.log('📤 Submitting timeline entry:', JSON.stringify(requestPayload, null, 2));

    const result = await ApiService.authPost(
      `${baseUrl}/api/leadertimeline`,
      requestPayload
    );

    console.log('📥 Timeline POST Response:', result);

    if (result.success) {
      Alert.alert(
        '✅ Success', 
        'Timeline entry added successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setAddTimelineData({
                date: '',
                title: '',
                title_details: '',
                additional_info: ''
              });
              
              // Close modal
              setAddTimelineModalVisible(false);
              
              // Refresh timeline data
              if (memberId) {
                loadInitialData(memberId);
              }
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to add timeline entry');
    }

  } catch (error) {
    console.error('❌ Error submitting timeline entry:', error);
    
    let errorMessage = 'Failed to add timeline entry';
    
    if (error.message) {
      if (error.message.includes('network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.message.includes('400')) {
        errorMessage = 'Invalid data format. Please check all fields.';
      } else {
        errorMessage = error.message;
      }
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setAddTimelineLoading(false);
  }
};
const renderTimeline = () => {
  return renderInfoCard('Career Timeline', '📅',
    <View style={styles.timelineContainer}>
      {/* Show existing timeline data */}
      {timelineData && Array.isArray(timelineData) && timelineData.length > 0 ? (
        timelineData.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineItemLeft}>
              <View style={styles.timelineDateContainer}>
                <Text style={styles.timelineDate}>{item.date || 'N/A'}</Text>
              </View>
              <View style={styles.timelineConnector}>
                <View style={styles.timelineDot} />
                {index < timelineData.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
            </View>
            
            <View style={styles.timelineItemRight}>
              <View style={styles.timelineContentCard}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>
                    {item.title || 'Position'}
                  </Text>
                </View>
                <Text style={styles.timelineDetails}>
                  {item.title_details || 'No details available'}
                </Text>
                {item.additional_info && (
                  <Text style={styles.timelineAdditionalInfo}>
                    {item.additional_info}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
         <TranslatableText style={[styles.emptyStateText, { fontSize: fontSize - 2 }]}>
  No timeline data available
</TranslatableText>
        </View>
      )}
      
   
     {/* Add Timeline Button - Show only for admin */}
{isAdmin && (
  <TouchableOpacity
    style={styles.addEducationButton}
    onPress={() => setAddTimelineModalVisible(true)}
  >
    <Text style={styles.addEducationIcon}>+</Text>
    <TranslatableText style={[styles.addEducationText, { fontSize: fontSize - 2 }]}>
  Add New Timeline Entry
</TranslatableText>
  </TouchableOpacity>
)}
    </View>,
    '#ffffff',
    'timeline',
    timelineData
  );
};
  const renderContent = () => {
    if (activeTab === 'profile') {
      return (
        <>
          {renderPersonalInfo()}
          {renderEducationInfo()}
          {renderContactInfo()}
          {renderSocialMedia()}
        </>
      );
    } else {
      return renderTimeline();
    }
  };

  const renderAddTimelineModal = () => {
  return (
    <Modal
      visible={addTimelineModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddTimelineModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddTimelineModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <Text style={styles.editModalTitle}>Add New Timeline Entry</Text>
            </View>
            <TouchableOpacity
              onPress={submitTimelineEntry}
              style={styles.editModalSaveButton}
              disabled={addTimelineLoading}
            >
              {addTimelineLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <Text style={styles.editSectionTitle}>Timeline Details</Text>
              
              {/* Date Field */}
             {/* Date Field */}
<View style={styles.editInputContainer}>
  <Text style={styles.editInputLabel}>DATE *</Text>
  <TextInput
    style={styles.editInput}
    value={addTimelineData.date}
    onChangeText={(text) => {
      // ✅ AUTO-FORMAT DATE AS USER TYPES
      const formatted = formatDateInput(text);
      setAddTimelineData({
        ...addTimelineData,
        date: formatted
      });
    }}
    placeholder="DD/MM/YYYY (e.g., 25/05/2024)"
    keyboardType="numeric"
    maxLength={10}  // ✅ DD/MM/YYYY = 10 characters
    multiline={false}
  />
  <Text style={styles.inputHelperText}>
    Enter date in DD/MM/YYYY format (slashes will be added automatically)
  </Text>
</View>

              {/* Title Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>TITLE *</Text>
                <TextInput
                  style={styles.editInput}
                  value={addTimelineData.title}
                  onChangeText={(text) => setAddTimelineData({
                    ...addTimelineData,
                    title: text
                  })}
                  placeholder="e.g., Member of Lok Sabha"
                  multiline={false}
                />
              </View>

              {/* Title Details Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>TITLE DETAILS *</Text>
                <TextInput
                  style={[styles.editInput, { height: 80 }]}
                  value={addTimelineData.title_details}
                  onChangeText={(text) => setAddTimelineData({
                    ...addTimelineData,
                    title_details: text
                  })}
                  placeholder="e.g., Elected to Lok Sabha during General Election 2024"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Additional Info Field */}
              <View style={styles.editInputContainer}>
                <Text style={styles.editInputLabel}>ADDITIONAL INFO</Text>
                <TextInput
                  style={[styles.editInput, { height: 80 }]}
                  value={addTimelineData.additional_info}
                  onChangeText={(text) => setAddTimelineData({
                    ...addTimelineData,
                    additional_info: text
                  })}
                  placeholder="e.g., Key contributions and impact on citizens"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Date, Title, and Title Details are required. Additional Info is optional but recommended for better context.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Add KYL Media Modal Component
const AddKYLMediaModal = ({ visible, onClose, onSave }) => {
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
      Alert.alert('Error', 'Failed to add KYL media');
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
        <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Add New KYL Media
</TranslatableText>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <TranslatableText style={[styles.label, { fontSize: fontSize - 2 }]}>
  Select Image *
</TranslatableText>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
            <TranslatableText style={[styles.imagePickerText, { fontSize: fontSize - 2 }]}>
  {selectedImage ? 'Change Image' : 'Choose Image'}
</TranslatableText>
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
                <Text style={styles.saveButtonText}>Add Media</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// Edit Modal for KYL Media (Image Only)
// Edit Modal for KYL Media (Image Only)
const EditKYLMediaModal = ({ visible, item, onClose, onSave }) => {
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
        console.log('Image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select a new image');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: item.media_header || '',
        media_narration: item.media_narration || '',
        media_url: item.media_url || '',
        media_type: 'KYL',
        media_file: selectedImage,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update KYL media');
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
        <View style={[styles.modalContainer, { maxHeight: '80%' }]}>
          <View style={styles.modalHeader}>
            <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Update KYL Image
</TranslatableText>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Select New Image *</Text>
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
                  {selectedImage.fileName || 'New image selected'}
                </Text>
              </View>
            )}
          </ScrollView>

          {/* ✅ ADD THIS FOOTER SECTION */}
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
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const renderAddPersonalModal = () => {
  return (
    <Modal
      visible={addPersonalModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddPersonalModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddPersonalModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <Text style={styles.editModalTitle}>Add Personal Information</Text>
            </View>
            <TouchableOpacity
              onPress={submitPersonalEntry}
              style={styles.editModalSaveButton}
              disabled={addPersonalLoading}
            >
              {addPersonalLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <TranslatableText style={[styles.editSectionTitle, { fontSize: fontSize + 2 }]}>
  Personal Details
</TranslatableText>
              
              {/* Birth Place Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  BIRTH PLACE
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPersonalData.birth_place}
                  onChangeText={(text) => setAddPersonalData({
                    ...addPersonalData,
                    birth_place: text
                  })}
                  placeholder="e.g., Patna"
                  multiline={false}
                />
              </View>

              {/* Date of Birth Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  DATE OF BIRTH
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addPersonalData.dob}
                  onChangeText={(text) => setAddPersonalData({
                    ...addPersonalData,
                    dob: text
                  })}
                  placeholder="e.g., 12/08/1965"
                  multiline={false}
                />
              </View>

              {/* Father's Name Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  FATHER'S NAME
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPersonalData.father_name}
                  onChangeText={(text) => setAddPersonalData({
                    ...addPersonalData,
                    father_name: text
                  })}
                  placeholder="e.g., Dr. Madan Prasad Jaiswal"
                  multiline={false}
                />
              </View>

              {/* Mother's Name Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  MOTHER'S NAME
</TranslatableText>

                <TextInput
                  style={styles.editInput}
                  value={addPersonalData.mother_name}
                  onChangeText={(text) => setAddPersonalData({
                    ...addPersonalData,
                    mother_name: text
                  })}
                  placeholder="e.g., Dr. Saroj Jaiswal"
                  multiline={false}
                />
              </View>

              {/* Profession Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  PROFESSION
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPersonalData.profession}
                  onChangeText={(text) => setAddPersonalData({
                    ...addPersonalData,
                    profession: text
                  })}
                  placeholder="e.g., Politician"
                  multiline={false}
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Fill in at least one field to add personal information.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
// Add Permanent Address Modal
const renderAddPermanentAddressModal = () => {
  return (
    <Modal
      visible={addPermanentAddressModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddPermanentAddressModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddPermanentAddressModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
             <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Add Permanent Address
</TranslatableText>
            </View>
            <TouchableOpacity
              onPress={submitPermanentAddressEntry}
              style={styles.editModalSaveButton}
              disabled={addPermanentAddressLoading}
            >
              {addPermanentAddressLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
             <TranslatableText style={[styles.editSectionTitle, { fontSize: fontSize + 2 }]}>
  Address Details
</TranslatableText>
              
              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 1 *</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.address1}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    address1: text
                  })}
                  placeholder="e.g., Road No. 5"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 2</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.address2}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    address2: text
                  })}
                  placeholder="e.g., Ramna"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 3</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.address3}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    address3: text
                  })}
                  placeholder="e.g., Bettiah"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>PINCODE</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.pincode}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    pincode: text
                  })}
                  placeholder="e.g., 851223"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>STATE</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.state}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    state: text
                  })}
                  placeholder="e.g., Bihar"
                />
              </View>

              <TranslatableText style={[styles.editSectionTitle, { fontSize: fontSize + 2 }]}>
  Contact Details
</TranslatableText>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ISD CODE</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.isd_code}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    isd_code: text
                  })}
                  placeholder="e.g., +91"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>STD CODE</TranslatableText>
                <TextInput
  style={styles.editInput}
  value={addPermanentAddressData.std_code}
  onChangeText={(text) => {
    // Only allow numbers and limit to 5 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
    setAddPermanentAddressData({
      ...addPermanentAddressData,
      std_code: cleaned
    });
  }}
  placeholder="e.g., 0622"
  keyboardType="numeric"
  maxLength={5}  // ✅ ADD THIS
/>
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>TELEPHONE 1</TranslatableText>
                <TextInput
  style={styles.editInput}
  value={addPermanentAddressData.tel_number1}
  onChangeText={(text) => {
    // Only allow numbers and limit to 8 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 8);
    setAddPermanentAddressData({
      ...addPermanentAddressData,
      tel_number1: cleaned
    });
  }}
  placeholder="e.g., 2345672"
  keyboardType="phone-pad"
  maxLength={8}  // ✅ ADD THIS
/>
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>MOBILE 1</TranslatableText>
                <TextInput
  style={styles.editInput}
  value={addPermanentAddressData.mobile_number1}
  onChangeText={(text) => {
    // Only allow numbers and limit to 10 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
    setAddPermanentAddressData({
      ...addPermanentAddressData,
      mobile_number1: cleaned
    });
  }}
  placeholder="e.g., 8907896789"
  keyboardType="phone-pad"
  maxLength={10}  // ✅ ADD THIS
/>
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>TELEPHONE 2</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.tel_number2}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    tel_number2: text
                  })}
                  placeholder="e.g., 2345672"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>MOBILE 2</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPermanentAddressData.mobile_number2}
                  onChangeText={(text) => setAddPermanentAddressData({
                    ...addPermanentAddressData,
                    mobile_number2: text
                  })}
                  placeholder="e.g., 8907896789"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.infoContainer}>
                <TranslatableText style={styles.infoText}>
                  Address Line 1 is required. Other fields are optional.
                </TranslatableText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Add Present Address Modal
const renderAddPresentAddressModal = () => {
  return (
    <Modal
      visible={addPresentAddressModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddPresentAddressModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddPresentAddressModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
  Add Present Address
</TranslatableText>
            </View>
            <TouchableOpacity
              onPress={submitPresentAddressEntry}
              style={styles.editModalSaveButton}
              disabled={addPresentAddressLoading}
            >
              {addPresentAddressLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <Text style={styles.editSectionTitle}>Address Details</Text>
              
              <View style={styles.editInputContainer}>
               <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  ADDRESS LINE 1 *
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.address1}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    address1: text
                  })}
                  placeholder="e.g., 5 Talkatora Road"
                />
              </View>

              <View style={styles.editInputContainer}>
               <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  ADDRESS LINE 2
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.address2}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    address2: text
                  })}
                  placeholder="e.g., New Delhi"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 3</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.address3}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    address3: text
                  })}
                  placeholder="Optional"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  PINCODE
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.pincode}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    pincode: text
                  })}
                  placeholder="e.g., 110001"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.editInputContainer}>
               <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  STATE
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.state}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    state: text
                  })}
                  placeholder="e.g., NCT of Delhi"
                />
              </View>

              <TranslatableText style={styles.editSectionTitle}>Contact Details</TranslatableText>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>ISD CODE</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.isd_code}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    isd_code: text
                  })}
                  placeholder="e.g., +91"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>STD CODE</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.std_code}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    std_code: text
                  })}
                  placeholder="e.g., 011"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  TELEPHONE 1
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.tel_number1}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    tel_number1: text
                  })}
                  placeholder="e.g., 23456712"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
  MOBILE 1
</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.mobile_number1}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    mobile_number1: text
                  })}
                  placeholder="e.g., 7907896789"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>TELEPHONE 2</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.tel_number2}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    tel_number2: text
                  })}
                  placeholder="e.g., 23457221"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editInputContainer}>
                <TranslatableText style={styles.editInputLabel}>MOBILE 2</TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addPresentAddressData.mobile_number2}
                  onChangeText={(text) => setAddPresentAddressData({
                    ...addPresentAddressData,
                    mobile_number2: text
                  })}
                  placeholder="e.g., 9907896789"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.infoContainer}>
                <TranslatableText style={styles.infoText}>
                  Address Line 1 is required. Other fields are optional.
                </TranslatableText>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Add Social Media Modal
const renderAddSocialMediaModal = () => {
  return (
    <Modal
      visible={addSocialMediaModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddSocialMediaModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddSocialMediaModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
                Add Social Media
              </TranslatableText>
            </View>
            <TouchableOpacity
              onPress={submitSocialMediaEntry}
              style={styles.editModalSaveButton}
              disabled={addSocialMediaLoading}
            >
              {addSocialMediaLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <TranslatableText style={[styles.editSectionTitle, { fontSize: fontSize + 2 }]}>
                Social Media Links
              </TranslatableText>
              
              {/* Facebook Field */}
              <View style={styles.editInputContainer}>
                <View style={styles.socialMediaLabelContainer}>
                  <Text style={styles.socialMediaIcon}>📘</Text>
                  <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                    FACEBOOK
                  </TranslatableText>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={addSocialMediaData.facebook}
                  onChangeText={(text) => setAddSocialMediaData({
                    ...addSocialMediaData,
                    facebook: text
                  })}
                  placeholder="e.g., fb.com/leaderprofile"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Twitter Field */}
              <View style={styles.editInputContainer}>
                <View style={styles.socialMediaLabelContainer}>
                  <Text style={styles.socialMediaIcon}>🐦</Text>
                  <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                    TWITTER / X
                  </TranslatableText>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={addSocialMediaData.twitter}
                  onChangeText={(text) => setAddSocialMediaData({
                    ...addSocialMediaData,
                    twitter: text
                  })}
                  placeholder="e.g., @leaderhandle"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* LinkedIn Field */}
              <View style={styles.editInputContainer}>
                <View style={styles.socialMediaLabelContainer}>
                  <Text style={styles.socialMediaIcon}>💼</Text>
                  <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                    LINKEDIN
                  </TranslatableText>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={addSocialMediaData.linkedin}
                  onChangeText={(text) => setAddSocialMediaData({
                    ...addSocialMediaData,
                    linkedin: text
                  })}
                  placeholder="e.g., linkedin.com/in/leaderprofile"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Instagram Field */}
              <View style={styles.editInputContainer}>
                <View style={styles.socialMediaLabelContainer}>
                  <Text style={styles.socialMediaIcon}>📸</Text>
                  <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                    INSTAGRAM
                  </TranslatableText>
                </View>
                <TextInput
                  style={styles.editInput}
                  value={addSocialMediaData.instagram}
                  onChangeText={(text) => setAddSocialMediaData({
                    ...addSocialMediaData,
                    instagram: text
                  })}
                  placeholder="e.g., @leadergram"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Fill in at least one social media link. You can add full URLs or just usernames/handles.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const renderAddLeaderCoordinatesModal = () => {
  return (
    <Modal
      visible={addLeaderCoordinatesModalVisible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={() => setAddLeaderCoordinatesModalVisible(false)}
    >
      <SafeAreaView style={styles.editModalContainer}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.editModalContent}
        >
          {/* Modal Header */}
          <View style={styles.editModalHeader}>
            <TouchableOpacity
              onPress={() => setAddLeaderCoordinatesModalVisible(false)}
              style={styles.editModalCloseButton}
            >
              <Text style={styles.editModalCloseText}>✕</Text>
            </TouchableOpacity>
            <View style={styles.editModalTitleContainer}>
              <TranslatableText style={[styles.modalTitle, { fontSize: fontSize + 4 }]}>
                Add Leader Coordinates
              </TranslatableText>
            </View>
            <TouchableOpacity
              onPress={submitLeaderCoordinatesEntry}
              style={styles.editModalSaveButton}
              disabled={addLeaderCoordinatesLoading}
            >
              {addLeaderCoordinatesLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.editModalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Modal Body */}
          <ScrollView style={styles.editModalBody}>
            <View style={styles.editFormContainer}>
              <TranslatableText style={[styles.editSectionTitle, { fontSize: fontSize + 2 }]}>
                Leader Information
              </TranslatableText>
              
              {/* Title Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  TITLE
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.title}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    title: text
                  })}
                  placeholder="e.g., Hon'ble Shri"
                  multiline={false}
                />
              </View>

              {/* Member Name Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  MEMBER NAME *
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.member_name}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    member_name: text
                  })}
                  placeholder="e.g., Sanjay Jaiswal"
                  multiline={false}
                />
              </View>

              {/* Party Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  PARTY *
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.party}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    party: text
                  })}
                  placeholder="e.g., Bharatiya Janata Party"
                  multiline={false}
                />
              </View>

              {/* Constituency Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  CONSTITUENCY *
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.constituency}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    constituency: text
                  })}
                  placeholder="e.g., Paschim Champaran"
                  multiline={false}
                />
              </View>

              {/* State Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  STATE *
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.state}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    state: text
                  })}
                  placeholder="e.g., Bihar"
                  multiline={false}
                />
              </View>

              {/* Email ID Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  EMAIL ID
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.email_id}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    email_id: text
                  })}
                  placeholder="e.g., leader@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Digital Sansad URL Field */}
              <View style={styles.editInputContainer}>
                <TranslatableText style={[styles.editInputLabel, { fontSize: fontSize - 2 }]}>
                  DIGITAL SANSAD URL
                </TranslatableText>
                <TextInput
                  style={styles.editInput}
                  value={addLeaderCoordinatesData.digital_sansad_url}
                  onChangeText={(text) => setAddLeaderCoordinatesData({
                    ...addLeaderCoordinatesData,
                    digital_sansad_url: text
                  })}
                  placeholder="e.g., https://digitalsansad.gov.in/"
                  keyboardType="url"
                  autoCapitalize="none"
                />
              </View>

              {/* Info Text */}
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  Fields marked with * are required. Member Name, Party, Constituency, and State are mandatory.
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

// Profile Image Edit Modal
// Profile Image Edit Modal - UPDATED WITH MODERN UI
const renderProfileImageEditModal = () => {
  return (
    <Modal
      visible={editProfileImageModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setEditProfileImageModalVisible(false);
        setSelectedProfileImage(null);
      }}
    >
      <View style={styles.profileImageModalOverlay}>
        <View style={styles.profileImageModalCard}>
          
          {/* ✅ MODERN HEADER WITH GRADIENT */}
          <View style={styles.profileImageModalHeader}>
            <View style={styles.profileImageHeaderContent}>
              <View style={styles.profileImageIconContainer}>
                <Icon name="account-circle" size={24} color="#e16e2b" />
              </View>
              <View style={styles.profileImageTitleContainer}>
                <TranslatableText style={[styles.profileImageModalTitle, { fontSize: fontSize + 2 }]}>
  Update Profile Photo
</TranslatableText>
               <TranslatableText style={[styles.profileImageModalSubtitle, { fontSize: fontSize - 2 }]}>
  Choose a new profile picture
</TranslatableText>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setEditProfileImageModalVisible(false);
                setSelectedProfileImage(null);
              }} 
              style={styles.profileImageCloseButton}
            >
              <Icon name="close" size={20} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          {/* ✅ BODY WITH CURRENT AND NEW IMAGE SIDE BY SIDE */}
          <View style={styles.profileImageModalBody}>
            
            {/* Current Image Section */}
            <View style={styles.profileImageSection}>
              <TranslatableText style={[styles.profileImageSectionLabel, { fontSize: fontSize - 2 }]}>
  Current Photo
</TranslatableText>
              <View style={styles.profileImagePreviewContainer}>
                <Image 
                  source={{ 
                    uri: memberData?.profile_image?.split('?')[0] || 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180'
                  }} 
                  style={styles.profileImagePreview}
                  resizeMode="cover"
                />
                <View style={styles.profileImageBadge}>
                  <Icon name="check-circle" size={16} color="#27ae60" />
                </View>
              </View>
            </View>

            {/* Arrow Icon */}
            <View style={styles.profileImageArrowContainer}>
              <Icon name="arrow-forward" size={24} color="#e16e2b" />
            </View>

            {/* New Image Section */}
            <View style={styles.profileImageSection}>
              <Text style={styles.profileImageSectionLabel}>
                {selectedProfileImage ? 'New Photo' : 'Select New'}
              </Text>
              <TouchableOpacity
                style={styles.profileImagePreviewContainer}
                onPress={() => {
                  const options = {
                    mediaType: 'photo',
                    quality: 0.8,
                    maxWidth: 1024,
                    maxHeight: 1024,
                  };

                  launchImageLibrary(options, (response) => {
                    if (response.didCancel) {
                      console.log('User cancelled image picker');
                    } else if (response.errorCode) {
                      Alert.alert('Error', response.errorMessage);
                    } else if (response.assets && response.assets[0]) {
                      setSelectedProfileImage(response.assets[0]);
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                {selectedProfileImage ? (
                  <>
                    <Image 
                      source={{ uri: selectedProfileImage.uri }} 
                      style={styles.profileImagePreview}
                      resizeMode="cover"
                    />
                    <View style={styles.profileImageNewBadge}>
                      <Text style={styles.profileImageNewBadgeText}>NEW</Text>
                    </View>
                  </>
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Icon name="add-a-photo" size={32} color="#e16e2b" />
                    <TranslatableText style={[styles.profileImagePlaceholderText, { fontSize: fontSize - 2 }]}>
  Tap to Choose
</TranslatableText>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>

          {/* ✅ INFO BOX */}
          {selectedProfileImage && (
            <View style={styles.profileImageInfoBox}>
              <Icon name="info" size={16} color="#3498db" />
              <Text style={styles.profileImageInfoText}>
                {selectedProfileImage.fileName || 'Image selected'} • {(selectedProfileImage.fileSize / 1024).toFixed(0)} KB
              </Text>
            </View>
          )}

          {/* ✅ TIPS SECTION */}
          <View style={styles.profileImageTips}>
           
<TranslatableText style={[styles.profileImageTipsTitle, { fontSize: fontSize - 1 }]}>
  📸 Photo Tips:
</TranslatableText>
            <TranslatableText style={[styles.profileImageTipItem, { fontSize: fontSize - 2 }]}>
  • Use a clear, well-lit photo
</TranslatableText>
            <Text style={styles.profileImageTipItem}>• Face should be clearly visible</Text>
            <Text style={styles.profileImageTipItem}>• Square format works best</Text>
          </View>

          {/* ✅ ACTION BUTTONS */}
          <View style={styles.profileImageModalFooter}>
            <TouchableOpacity 
              style={styles.profileImageCancelButton}
              onPress={() => {
                setEditProfileImageModalVisible(false);
                setSelectedProfileImage(null);
              }}
              disabled={profileImageLoading}
            >
              <Icon name="close" size={18} color="#7f8c8d" />
              <TranslatableText style={[styles.profileImageCancelButtonText, { fontSize: fontSize }]}>
  Cancel
</TranslatableText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.profileImageSaveButton,
                (!selectedProfileImage || profileImageLoading) && styles.profileImageSaveButtonDisabled
              ]}
              onPress={() => handleUpdateProfileImage(selectedProfileImage)}
              disabled={profileImageLoading || !selectedProfileImage}
              activeOpacity={0.8}
            >
              {profileImageLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.profileImageSaveButtonText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Icon name="cloud-upload" size={18} color="#fff" />
                  <TranslatableText
  style={[
    styles.profileImageSaveButtonText,
    { fontSize: fontSize }
  ]}
>
  {selectedProfileImage ? 'Update Photo' : 'Select Photo'}
</TranslatableText>

                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};
return (

   <>
    {/* Translation Loading Bar */}
    {isTranslating && (
      <View style={styles.translationLoadingBar}>
        <ActivityIndicator size="small" color="#e16e2b" />
        <Text style={styles.translationLoadingText}>Translating...</Text>
      </View>
    )}

  <ScrollView 
    style={styles.container}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl 
        refreshing={refreshing} 
        onRefresh={onRefresh}
        title="Refreshing..."
        tintColor="transparent"           // ADD THIS - hides the spinner
        colors={['transparent']}          // ADD THIS - for Android
        progressBackgroundColor="transparent"  // ADD THIS - for Android
        progressViewOffset={-100}         // ADD THIS - moves it off screen
      />
    }
  >
    {renderModernHeader()}
    {renderKYLMediaGallery()}
    {renderSegmentedControl()}
    
    <View style={styles.contentArea}>
      {renderContent()}
    </View>
    
    <View style={styles.bottomSpacing} />
    
    {/* Edit Modal */}
    {renderEditModal()}

    {/* Developer Input Modal */}
    {renderDeveloperInputModal()}

    {/* Dropdown Modal */}
    {renderDropdownModal()}

    {/* Add Education Modal */}
    {renderAddEducationModal()}

    {/* Education Edit Modal */}
    {renderEducationEditModal()}

    {/* Add Timeline Modal */}
    {renderAddTimelineModal()}

    {/* Timeline Edit Modal - ADD THIS LINE */}
    {renderTimelineEditModal()}
    {renderAddPersonalModal()}
    {renderAddPermanentAddressModal()}

{/* Add Present Address Modal - ADD THIS */}
{renderAddPresentAddressModal()}
{renderAddSocialMediaModal()}
{renderAddLeaderCoordinatesModal()}
{renderProfileImageEditModal()} 
  </ScrollView>
  </>
);

};
export default KnowYourLeaderScreen;