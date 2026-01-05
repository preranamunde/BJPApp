import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet,TextInput, ScrollView, TouchableOpacity, Linking, ActivityIndicator,Alert,Modal,SafeAreaView,KeyboardAvoidingView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { getCurrentUserRole,checkIfCurrentUserIsAdmin} from '../../App';
import { useTranslation } from '../context/TranslationContext';
import TranslatableText from '../components/TranslatableText';
import LocalStorageService from '../services/LocalStorageService';
import UpdateStatusService from '../services/UpdateStatusService';
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

const ContactUsScreen = () => {

    const { 
    currentLanguage, 
    changeLanguage, 
    isTranslating, 
    setIsTranslating,
    availableLanguages 
  } = useTranslation();
  // Add state for social media data
  const [socialMediaData, setSocialMediaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [memberId, setMemberId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
const [userRole, setUserRole] = useState('user');
const [isLoggedIn, setIsLoggedIn] = useState(false);

// Add dropdown states
const [dropdownVisible, setDropdownVisible] = useState(false);
const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
const [editSocialMediaModalVisible, setEditSocialMediaModalVisible] = useState(false);
const [editingSocialMediaData, setEditingSocialMediaData] = useState({
  facebook: '',
  twitter: '',
  linkedin: '',
  instagram: ''
});
// Add state for contact office data
const [contactOfficeData, setContactOfficeData] = useState(null);
// Add these states after the existing social media states
const [editContactOfficeModalVisible, setEditContactOfficeModalVisible] = useState(false);
const [editingContactOfficeData, setEditingContactOfficeData] = useState({
  const_off_address1: '',
  const_off_address2: '',
  const_off_address3: '',
  const_off_pincode: '',
  const_off_state: '',
  const_off_isd_code: '',
  const_off_std_code: '',
  const_off_tel_number1: '',
  const_off_mobile_number1: '',
  capital_off_address1: '',
  capital_off_address2: '',
  capital_off_address3: '',
  capital_off_pincode: '',
  capital_off_state: '',
  capital_off_isd_code: '',
  capital_off_std_code: '',
  capital_off_tel_number1: '',
  capital_off_mobile_number1: ''
});
const [contactOfficeDropdownVisible, setContactOfficeDropdownVisible] = useState(false);
const [contactOfficeDropdownPosition, setContactOfficeDropdownPosition] = useState({ x: 0, y: 0 });
const [isDeleting, setIsDeleting] = useState(false);
const [addContactOfficeModalVisible, setAddContactOfficeModalVisible] = useState(false);
const [addingContactOfficeData, setAddingContactOfficeData] = useState({
  const_off_address1: '',
  const_off_address2: '',
  const_off_address3: '',
  const_off_pincode: '',
  const_off_state: '',
  const_off_isd_code: '+91',
  const_off_std_code: '',
  const_off_tel_number1: '',
  const_off_mobile_number1: '',
  capital_off_address1: '',
  capital_off_address2: '',
  capital_off_address3: '',
  capital_off_pincode: '',
  capital_off_state: '',
  capital_off_isd_code: '+91',
  capital_off_std_code: '',
  capital_off_tel_number1: '',
  capital_off_mobile_number1: ''
});

const [addSocialMediaModalVisible, setAddSocialMediaModalVisible] = useState(false);
const [addSocialMediaData, setAddSocialMediaData] = useState({
  facebook: '',
  twitter: '',
  linkedin: '',
  instagram: ''
});
const [addSocialMediaLoading, setAddSocialMediaLoading] = useState(false);

  // Fetch social media data on component mount
  useEffect(() => {
    loadSocialMediaData();
  }, []);

  // Get member ID from storage (same as KnowYourLeaderScreen)
 const getMemberInfoFromStorage = async () => {
  try {
    console.log('📱 [ContactUs] Fetching owner mobile number...');
    
    // Method 1: Try to get from OWNER_MOBILE (set during bootstrap)
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    if (ownerMobile && ownerMobile.trim() !== '') {
      console.log('✅ [ContactUs] Found owner mobile from OWNER_MOBILE:', ownerMobile);
      return { memberId: ownerMobile };
    }
    
    // Method 2: Try to get from AppOwnerInfo
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      console.log('📋 [ContactUs] AppOwnerInfo keys:', Object.keys(appOwnerInfo));
      
      // Try multiple possible field names for mobile number
      const possibleMobileFields = [
        'mobile_no',
        'regdMobileNo', 
        'mobile_number',
        'client_mobile',  // ✅ Added this
        'owner_mobile',
        'Mobile',
        'MobileNo',
        'phone',
        'phoneNumber',
        'mobileNo',
        'member_id',
        'user_id'
      ];
      
      for (const field of possibleMobileFields) {
        if (appOwnerInfo[field]) {
          const mobileValue = String(appOwnerInfo[field]).trim();
          console.log(`✅ [ContactUs] Found owner mobile in field '${field}':`, mobileValue);
          
          // Store it for future use
          await EncryptedStorage.setItem('OWNER_MOBILE', mobileValue);
          
          return { memberId: mobileValue };
        }
      }
      
      console.warn('⚠️ [ContactUs] No mobile field found in AppOwnerInfo');
    }
    
    // Method 3: Fallback - Get from global variable (set during bootstrap)
    if (global.owner_mobile && global.owner_mobile.trim() !== '') {
      console.log('✅ [ContactUs] Found owner mobile from global variable:', global.owner_mobile);
      return { memberId: global.owner_mobile };
    }
    
    // Method 4: Last resort - use default
    console.warn('⚠️ [ContactUs] No owner mobile found, using default: 7702000725');
    return { memberId: '7702000725' };
    
  } catch (error) {
    console.error('❌ [ContactUs] Error retrieving member info:', error);
    return { memberId: '7702000725' };
  }
};

const debugMobileNumber = async () => {
  try {
    console.log('🔍 [ContactUs] === DEBUGGING MOBILE NUMBER ===');
    
    // Check all possible sources
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    
    console.log('📱 [ContactUs] OWNER_MOBILE storage:', ownerMobile);
    console.log('🌍 [ContactUs] global.owner_mobile:', global.owner_mobile);
    
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      console.log('📋 [ContactUs] AppOwnerInfo mobile fields:');
      ['mobile_no', 'regdMobileNo', 'mobile_number', 'client_mobile', 'owner_mobile'].forEach(field => {
        if (appOwnerInfo[field]) {
          console.log(`   ${field}:`, appOwnerInfo[field]);
        }
      });
    }
    
    const finalMemberInfo = await getMemberInfoFromStorage();
    console.log('✅ [ContactUs] Final mobile number being used:', finalMemberInfo.memberId);
    
    return finalMemberInfo;
  } catch (error) {
    console.error('❌ [ContactUs] Debug error:', error);
    return { memberId: '7702000725' };
  }
};


  const checkAdminRole = async () => {
  try {
    console.log('🔍 Checking admin role in Contact Us screen');
    const adminCheck = await checkIfCurrentUserIsAdmin();
    const currentRole = await getCurrentUserRole();
    
    setIsAdmin(adminCheck.isAdmin);
    setUserRole(currentRole.userRole);
    setIsLoggedIn(currentRole.isLoggedIn);
    
    console.log('✅ Admin check result:', adminCheck.isAdmin);
    return adminCheck.isAdmin;
  } catch (error) {
    console.error('❌ Error checking admin role:', error);
    setIsAdmin(false);
    return false;
  }
};

  // Fetch social media from API (same as KnowYourLeaderScreen)
  const fetchSocialMedia = async (memberIdentifier) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      
      const currentUserInfo = await getCurrentUserRole();
      const userEmailId = currentUserInfo.loggedin_email || '';
      
      const endpoint = `${baseUrl}/api/socialmedia/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
      
      console.log('📱 Fetching social media for Contact Us:', endpoint);
      
      const result = await ApiService.authGet(endpoint);
      
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (socialmedia in ContactUs):', error);
      return { success: false, error: error.message };
    }
  };

  const updateSocialMedia = async (memberIdentifier, data) => {
  try {
    console.log('Updating social media as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/socialmedia/`;
    
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      social_media: {
        ...data
      }
    };
    
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
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/socialmedia/?${queryParams}`;
    
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
const createSocialMedia = async (memberIdentifier, data) => {
  try {
    console.log('Creating social media as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/socialmedia/`;
    
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      social_media: {
        ...data
      }
    };
    
    console.log('📝 Creating social media with data:', requestBody);
    
    const result = await ApiService.authPost(endpoint, requestBody);
    
    console.log('Social media create result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (create social media):', error);
    return { success: false, error: error.message };
  }
};

const updateContactOffice = async (memberIdentifier, data) => {
  try {
    console.log('Updating contact office as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/contactus/`;
    
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      contactus: {
        ...data
      }
    };
    
    const result = await ApiService.authPut(endpoint, requestBody);
    
    console.log('Contact office update result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (update contact office):', error);
    return { success: false, error: error.message };
  }
};

const deleteContactOffice = async (memberIdentifier) => {
  try {
    console.log('Deleting contact office as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const queryParams = new URLSearchParams({
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId
    }).toString();
    
    const endpoint = `${baseUrl}/api/contactus/?${queryParams}`;
    
    console.log('🗑️ Deleting contact office:', endpoint);
    
    const result = await ApiService.authDelete(endpoint);
    
    if (result.success) {
      console.log('Contact office deleted successfully');
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
    console.error('API Error (delete contact office):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

// Fetch contact office data from API
const fetchContactOffice = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/contactus/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}`;
    
    console.log('🏢 Fetching contact office data:', endpoint);
    
    const result = await ApiService.authGet(endpoint);
    
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (contactus):', error);
    return { success: false, error: error.message };
  }
};

  // Load social media data
 // Load social media data
const loadSocialMediaData = async () => {
  try {
    setLoading(true);

    await checkAdminRole();
    
    const memberInfo = await debugMobileNumber();
    setMemberId(memberInfo.memberId);
    
    console.log('📞 [ContactUs] Using mobile for API calls:', memberInfo.memberId);
    
    // ✅ STEP 1: CHECK IF FIRST LAUNCH
    const isFirstLaunch = await LocalStorageService.isFirstLaunch();
    console.log('🚀 Is First Launch (ContactUs):', isFirstLaunch);

    // ✅ STEP 2: GET UPDATE FLAGS (only if NOT first launch)
    let updateFlags = null;
    
    if (!isFirstLaunch) {
      console.log('\n🔄 === SUBSEQUENT LAUNCH - CHECKING UPDATE FLAGS (ContactUs) ===');
      
      // Get current user email
      const currentUserInfo = await getCurrentUserRole();
      const userEmailId = currentUserInfo.loggedin_email || '';
      
      updateFlags = await UpdateStatusService.checkUpdateStatus(
        memberInfo.memberId,
        userEmailId
      );
      
      if (updateFlags) {
        console.log('\n📊 === UPDATE FLAGS ANALYSIS (ContactUs) ===');
        console.log('updatedSM:', updateFlags.updatedSM, '→', updateFlags.updatedSM === true ? '🔴 FETCH' : '🟢 CACHE');
        console.log('updatedContactus:', updateFlags.updatedContactus, '→', updateFlags.updatedContactus === true ? '🔴 FETCH' : '🟢 CACHE');
        console.log('===========================\n');
        
        await UpdateStatusService.clearUpdatedCaches(updateFlags);
      } else {
        console.log('⚠️ No update flags received - will fetch all data fresh');
        updateFlags = {
          updatedSM: true,
          updatedContactus: true
        };
      }
    } else {
      console.log('\n🆕 === FIRST LAUNCH - FETCHING ALL DATA (ContactUs) ===');
    }

    // ✅ STEP 3: LOAD DATA (from cache or fetch based on flags)
    console.log('\n📦 === LOADING DATA WITH CACHING LOGIC (ContactUs) ===');
    
    const [socialMedia, contactOffice] = await Promise.all([
      loadDataWithCache(
        'SOCIAL_MEDIA',
        fetchSocialMedia,
        memberInfo.memberId,
        updateFlags?.updatedSM || isFirstLaunch
      ),
      loadDataWithCache(
        'CONTACT_OFFICE',
        fetchContactOffice,
        memberInfo.memberId,
        updateFlags?.updatedContactus || isFirstLaunch
      )
    ]);
    
    // ✅ STEP 4: SET STATE
    if (socialMedia.success && socialMedia.data?.social_media) {
      setSocialMediaData(socialMedia.data.social_media);
      console.log('✅ [ContactUs] Social media loaded');
    } else {
      console.error('❌ [ContactUs] Failed to load social media:', socialMedia.error);
    }
    
    if (contactOffice.success && contactOffice.data?.contactus) {
      setContactOfficeData(contactOffice.data.contactus);
      console.log('✅ [ContactUs] Contact office loaded');
    } else {
      console.error('❌ [ContactUs] Failed to load contact office:', contactOffice.error);
    }

    // ✅ STEP 5: MARK AS LAUNCHED (if first launch)
    if (isFirstLaunch) {
      await LocalStorageService.setHasLaunched();
      console.log('✅ First launch completed (ContactUs)');
      
      const initialFlags = {
        updatedSM: false,
        updatedContactus: false
      };
      await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(initialFlags));
      console.log('✅ Initial update flags set to false');
    }

    console.log('\n✅ ========================================');
    console.log('✅ CONTACT DATA LOADED SUCCESSFULLY');
    console.log('✅ ========================================\n');
    
  } catch (error) {
    console.error('❌ [ContactUs] Error loading data:', error);
  } finally {
    setLoading(false);
  }
};

// ✅ ADD THIS HELPER FUNCTION
const loadDataWithCache = async (cacheKey, fetchFunction, ...params) => {
  try {
    const updateFlag = params[params.length - 1]; // Last param is the flag
    const fetchParams = params.slice(0, -1); // All params except flag
    
    const cached = await LocalStorageService.getData(cacheKey);
    const hasCachedData = !!cached;
    
    console.log(`\n🔍 ${cacheKey}:`);
    console.log(`   💾 Cache exists: ${hasCachedData}`);
    console.log(`   🚩 Flag: ${updateFlag}`);
    
    // Convert flag to boolean
    let booleanFlag = null;
    if (updateFlag === true || updateFlag === 'true' || updateFlag === 1 || updateFlag === '1') {
      booleanFlag = true;
    } else if (updateFlag === false || updateFlag === 'false' || updateFlag === 0 || updateFlag === '0') {
      booleanFlag = false;
    }
    
    // Decision logic
    let shouldFetchFresh;
    
    if (!hasCachedData) {
      shouldFetchFresh = true;
      console.log(`   ❌ No cache → FETCH`);
    } else if (booleanFlag === true) {
      shouldFetchFresh = true;
      console.log(`   🔴 Flag TRUE → FETCH`);
    } else if (booleanFlag === false) {
      shouldFetchFresh = false;
      console.log(`   🟢 Flag FALSE → CACHE`);
    } else {
      shouldFetchFresh = false;
      console.log(`   ⚪ No flag (backend didn't send) → CACHE`);
    }
    
    if (shouldFetchFresh) {
      console.log(`   📡 Calling API...`);
      const result = await fetchFunction(...fetchParams);
      
      if (result.success && result.data) {
        await LocalStorageService.storeData(cacheKey, result.data);
        
        // Mark as updated (false) in local flags
        const flagName = Object.keys(UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY).find(
          key => UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY[key] === cacheKey
        );
        if (flagName) {
          await UpdateStatusService.markAsUpdated(flagName);
        }
        
        return result;
      } else {
        // API failed but we have cache - use cache as fallback
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
    // On error, try to use cache if available
    const cached = await LocalStorageService.getData(cacheKey);
    if (cached) {
      console.log(`   ⚠️ Error occurred, using cache as fallback`);
      return { success: true, data: cached };
    }
    return { success: false, error: error.message };
  }
};

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleSocialMedia = (url) => {
    if (url && url.trim() !== '') {
      Linking.openURL(url);
    }
  };

  const handleMenuPress = (event) => {
  const { pageX, pageY } = event.nativeEvent;
  setDropdownPosition({ x: pageX, y: pageY + 10 });
  setDropdownVisible(true);
};

const handleEdit = () => {
  setDropdownVisible(false);
  setEditingSocialMediaData({
    facebook: socialMediaData?.facebook || '',
    twitter: socialMediaData?.twitter || '',
    linkedin: socialMediaData?.linkedin || '',
    instagram: socialMediaData?.instagram || ''
  });
  setEditSocialMediaModalVisible(true);
};

const handleDelete = () => {
  setDropdownVisible(false);
  Alert.alert(
    'Delete Social Media',
    'Are you sure you want to delete all social media links? This action cannot be undone.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            const result = await deleteSocialMedia(memberId);
            if (result.success) {
              await UpdateStatusService.markApiStale(memberId, 'updatedSM');
        console.log('✅ Marked SOCIAL_MEDIA cache as stale');
              setSocialMediaData(null); // Clear immediately
              Alert.alert('Success', 'Social media deleted successfully');
              await loadSocialMediaData();
            } else {
              Alert.alert('Error', result.error || 'Failed to delete social media');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete social media');
          } finally {
            setIsDeleting(false);
          }
        }
      }
    ]
  );
};

const handleAddSocialMedia = () => {
  // Reset form with empty values
  setAddSocialMediaData({
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: ''
  });
  setAddSocialMediaModalVisible(true);
};

const handleSaveAddSocialMedia = async () => {
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

    const result = await createSocialMedia(memberId, addSocialMediaData);
    
    if (result.success) {
      await UpdateStatusService.markApiStale(memberId, 'updatedSM');
      console.log('✅ Marked SOCIAL_MEDIA cache as stale');
      Alert.alert('Success', 'Social media added successfully');
      setAddSocialMediaModalVisible(false);
      await loadSocialMediaData(); // Reload to show new data
    } else {
      Alert.alert('Error', result.error || 'Failed to add social media');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to add social media');
  } finally {
    setAddSocialMediaLoading(false);
  }
};
const handleAddContactOffice = () => {
  // Reset form with default values
  setAddingContactOfficeData({
    const_off_address1: '',
    const_off_address2: '',
    const_off_address3: '',
    const_off_pincode: '',
    const_off_state: '',
    const_off_isd_code: '+91',
    const_off_std_code: '',
    const_off_tel_number1: '',
    const_off_mobile_number1: '',
    capital_off_address1: '',
    capital_off_address2: '',
    capital_off_address3: '',
    capital_off_pincode: '',
    capital_off_state: '',
    capital_off_isd_code: '+91',
    capital_off_std_code: '',
    capital_off_tel_number1: '',
    capital_off_mobile_number1: ''
  });
  setAddContactOfficeModalVisible(true);
};

const handleSaveAddContactOffice = async () => {
  try {
    // ✅ VALIDATE CONSTITUENCY OFFICE MOBILE NUMBERS
    if (addingContactOfficeData.const_off_mobile_number1.trim()) {
      const validation1 = validateMobileNumber(addingContactOfficeData.const_off_mobile_number1);
      if (!validation1.valid) {
        Alert.alert('Validation Error', `Constituency Mobile: ${validation1.message}`);
        return;
      }
    }

    // ✅ VALIDATE CONSTITUENCY OFFICE TELEPHONE
    if (addingContactOfficeData.const_off_tel_number1.trim()) {
      const telValidation = validateTelephoneNumber(addingContactOfficeData.const_off_tel_number1);
      if (!telValidation.valid) {
        Alert.alert('Validation Error', `Constituency Telephone: ${telValidation.message}`);
        return;
      }
    }

    // ✅ VALIDATE CONSTITUENCY OFFICE STD CODE
    if (addingContactOfficeData.const_off_std_code.trim()) {
      const stdValidation = validateSTDCode(addingContactOfficeData.const_off_std_code);
      if (!stdValidation.valid) {
        Alert.alert('Validation Error', `Constituency STD Code: ${stdValidation.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE MOBILE NUMBERS
    if (addingContactOfficeData.capital_off_mobile_number1.trim()) {
      const validation2 = validateMobileNumber(addingContactOfficeData.capital_off_mobile_number1);
      if (!validation2.valid) {
        Alert.alert('Validation Error', `Capital Mobile: ${validation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE TELEPHONE
    if (addingContactOfficeData.capital_off_tel_number1.trim()) {
      const telValidation2 = validateTelephoneNumber(addingContactOfficeData.capital_off_tel_number1);
      if (!telValidation2.valid) {
        Alert.alert('Validation Error', `Capital Telephone: ${telValidation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE STD CODE
    if (addingContactOfficeData.capital_off_std_code.trim()) {
      const stdValidation2 = validateSTDCode(addingContactOfficeData.capital_off_std_code);
      if (!stdValidation2.valid) {
        Alert.alert('Validation Error', `Capital STD Code: ${stdValidation2.message}`);
        return;
      }
    }

    const result = await createContactOffice(memberId, addingContactOfficeData);
    if (result.success) {
      await UpdateStatusService.markApiStale(memberId, 'updatedContactus');
      console.log('✅ Marked CONTACT_OFFICE cache as stale');
      Alert.alert('Success', 'Contact office added successfully');
      setAddContactOfficeModalVisible(false);
      await loadSocialMediaData(); // Reload to show new data
    } else {
      Alert.alert('Error', result.error || 'Failed to add contact office');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to add contact office');
  }
};
const handleSaveSocialMedia = async () => {
  try {
    const result = await updateSocialMedia(memberId, editingSocialMediaData);
    if (result.success) {
      // ✅ ADD THIS LINE
      await UpdateStatusService.markApiStale(memberId, 'updatedSM');
      console.log('✅ Marked SOCIAL_MEDIA cache as stale');
      
      Alert.alert('Success', 'Social media updated successfully');
      setEditSocialMediaModalVisible(false);
      await loadSocialMediaData();
    } else {
      Alert.alert('Error', result.error || 'Failed to update social media');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to update social media');
  }
};

const handleContactOfficeMenuPress = (event) => {
  const { pageX, pageY } = event.nativeEvent;
  setContactOfficeDropdownPosition({ x: pageX, y: pageY + 10 });
  setContactOfficeDropdownVisible(true);
};

const handleEditContactOffice = () => {
  setContactOfficeDropdownVisible(false);
  setEditingContactOfficeData({
    const_off_address1: contactOfficeData?.const_off_address1 || '',
    const_off_address2: contactOfficeData?.const_off_address2 || '',
    const_off_address3: contactOfficeData?.const_off_address3 || '',
    const_off_pincode: contactOfficeData?.const_off_pincode || '',
    const_off_state: contactOfficeData?.const_off_state || '',
    const_off_isd_code: contactOfficeData?.const_off_isd_code || '',
    const_off_std_code: contactOfficeData?.const_off_std_code || '',
    const_off_tel_number1: contactOfficeData?.const_off_tel_number1 || '',
    const_off_mobile_number1: contactOfficeData?.const_off_mobile_number1 || '',
    capital_off_address1: contactOfficeData?.capital_off_address1 || '',
    capital_off_address2: contactOfficeData?.capital_off_address2 || '',
    capital_off_address3: contactOfficeData?.capital_off_address3 || '',
    capital_off_pincode: contactOfficeData?.capital_off_pincode || '',
    capital_off_state: contactOfficeData?.capital_off_state || '',
    capital_off_isd_code: contactOfficeData?.capital_off_isd_code || '',
    capital_off_std_code: contactOfficeData?.capital_off_std_code || '',
    capital_off_tel_number1: contactOfficeData?.capital_off_tel_number1 || '',
    capital_off_mobile_number1: contactOfficeData?.capital_off_mobile_number1 || ''
  });
  setEditContactOfficeModalVisible(true);
};

const handleSaveContactOffice = async () => {
  try {
    // ✅ VALIDATE CONSTITUENCY OFFICE MOBILE NUMBERS
    if (editingContactOfficeData.const_off_mobile_number1.trim()) {
      const validation1 = validateMobileNumber(editingContactOfficeData.const_off_mobile_number1);
      if (!validation1.valid) {
        Alert.alert('Validation Error', `Constituency Mobile: ${validation1.message}`);
        return;
      }
    }

    // ✅ VALIDATE CONSTITUENCY OFFICE TELEPHONE
    if (editingContactOfficeData.const_off_tel_number1.trim()) {
      const telValidation = validateTelephoneNumber(editingContactOfficeData.const_off_tel_number1);
      if (!telValidation.valid) {
        Alert.alert('Validation Error', `Constituency Telephone: ${telValidation.message}`);
        return;
      }
    }

    // ✅ VALIDATE CONSTITUENCY OFFICE STD CODE
    if (editingContactOfficeData.const_off_std_code.trim()) {
      const stdValidation = validateSTDCode(editingContactOfficeData.const_off_std_code);
      if (!stdValidation.valid) {
        Alert.alert('Validation Error', `Constituency STD Code: ${stdValidation.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE MOBILE NUMBERS
    if (editingContactOfficeData.capital_off_mobile_number1.trim()) {
      const validation2 = validateMobileNumber(editingContactOfficeData.capital_off_mobile_number1);
      if (!validation2.valid) {
        Alert.alert('Validation Error', `Capital Mobile: ${validation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE TELEPHONE
    if (editingContactOfficeData.capital_off_tel_number1.trim()) {
      const telValidation2 = validateTelephoneNumber(editingContactOfficeData.capital_off_tel_number1);
      if (!telValidation2.valid) {
        Alert.alert('Validation Error', `Capital Telephone: ${telValidation2.message}`);
        return;
      }
    }

    // ✅ VALIDATE CAPITAL OFFICE STD CODE
    if (editingContactOfficeData.capital_off_std_code.trim()) {
      const stdValidation2 = validateSTDCode(editingContactOfficeData.capital_off_std_code);
      if (!stdValidation2.valid) {
        Alert.alert('Validation Error', `Capital STD Code: ${stdValidation2.message}`);
        return;
      }
    }

    const result = await updateContactOffice(memberId, editingContactOfficeData);
    if (result.success) {
      await UpdateStatusService.markApiStale(memberId, 'updatedContactus');
      console.log('✅ Marked CONTACT_OFFICE cache as stale');
      Alert.alert('Success', 'Contact office updated successfully');
      setEditContactOfficeModalVisible(false);
      await loadSocialMediaData(); // This also reloads contact office data
    } else {
      Alert.alert('Error', result.error || 'Failed to update contact office');
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to update contact office');
  }
};

const handleDeleteContactOffice = () => {
  setContactOfficeDropdownVisible(false);
  Alert.alert(
    'Delete Contact Office',
    'Are you sure you want to delete all contact office information? This action cannot be undone.',
    [
      { 
        text: 'Cancel', 
        style: 'cancel' 
      },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          try {
            const result = await deleteContactOffice(memberId);
            if (result.success) {
              await UpdateStatusService.markApiStale(memberId, 'updatedContactus');
        console.log('✅ Marked CONTACT_OFFICE cache as stale');
              // Clear the state immediately
              setContactOfficeData(null);
              Alert.alert('Success', 'Contact office deleted successfully');
              await loadSocialMediaData(); // Reload to confirm
            } else {
              Alert.alert('Error', result.error || 'Failed to delete contact office');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete contact office');
          }
        }
      }
    ]
  );
};

const createContactOffice = async (memberIdentifier, data) => {
  try {
    console.log('Creating contact office as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const endpoint = `${baseUrl}/api/contactus/`;
    
    const requestBody = {
      leader_regd_mobile_no: memberIdentifier,
      user_email_id: userEmailId,
      contactus: {
        ...data
      }
    };
    
    console.log('📝 Creating contact office with data:', requestBody);
    
    const result = await ApiService.authPost(endpoint, requestBody);
    
    console.log('Contact office create result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('API Error (create contact office):', error);
    return { success: false, error: error.message };
  }
};

  // Create social media items from API data
  const getSocialMediaItems = () => {
    if (!socialMediaData) return [];
    
    const items = [];
    
    if (socialMediaData.facebook) {
      items.push({
        icon: 'facebook',
        label: 'Facebook',
        handle: socialMediaData.facebook.replace(/^https?:\/\/(www\.)?/, ''),
        url: socialMediaData.facebook
      });
    }
    
    if (socialMediaData.twitter) {
      items.push({
        icon: 'alternate-email',
        label: 'X (Twitter)',
        handle: socialMediaData.twitter.replace(/^https?:\/\/(www\.)?/, ''),
        url: socialMediaData.twitter
      });
    }
    
    if (socialMediaData.linkedin) {
      items.push({
        icon: 'work',
        label: 'LinkedIn',
        handle: socialMediaData.linkedin.replace(/^https?:\/\/(www\.)?/, ''),
        url: socialMediaData.linkedin
      });
    }
    
    if (socialMediaData.instagram) {
      items.push({
        icon: 'photo-camera',
        label: 'Instagram',
        handle: socialMediaData.instagram.replace(/^https?:\/\/(www\.)?/, ''),
        url: socialMediaData.instagram
      });
    }
    
    return items;
  };

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading contact information...</Text>
      </View>
    );
  }

  const socialMediaItems = getSocialMediaItems();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="support-agent" size={40} color="white" />
        </View>
        <TranslatableText style={styles.pageTitle}>Contact Us</TranslatableText>
        <TranslatableText style={styles.subtitle}>We're here to help you</TranslatableText>
      </View>

    {/* Office Cards - NOW FROM API */}
<View style={styles.cardContainer}>
   {contactOfficeData && isAdmin && (
    <View style={styles.officeHeaderContainer}>
      <TranslatableText style={styles.officeHeaderTitle}>Our Offices</TranslatableText>
      <TouchableOpacity
        style={styles.threeDotButton}
        onPress={handleContactOfficeMenuPress}
      >
        <Text style={styles.threeDotButtonText}>⋮</Text>
      </TouchableOpacity>
    </View>
  )}
  {/* Constituency Office */}
  {contactOfficeData && (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Icon name="location-city" size={24} color="#e16e2b" />
        </View>
        <TranslatableText style={styles.cardTitle}>Constituency Office</TranslatableText>
      </View>
      
     <Text style={styles.cardText}>
  {[
    contactOfficeData.const_off_address1,
    contactOfficeData.const_off_address2,
    contactOfficeData.const_off_address3,
  ]
    .filter(Boolean) // removes null / undefined / empty
    .join(', ')}
</Text>

      {isTranslating && (
  <View style={styles.translationLoadingBar}>
    <ActivityIndicator size="small" color="#e16e2b" />
    <Text style={styles.translationLoadingText}>Translating...</Text>
  </View>
)}
      {/* State and Pincode */}
      {(contactOfficeData.const_off_state || contactOfficeData.const_off_pincode) && (
        <Text style={styles.cardText}>
          {contactOfficeData.const_off_state}
          {contactOfficeData.const_off_state && contactOfficeData.const_off_pincode && ' - '}
          {contactOfficeData.const_off_pincode}
        </Text>
      )}
      
      {/* Contact Numbers */}
     {/* Contact Numbers */}
{(contactOfficeData.const_off_tel_number1 || contactOfficeData.const_off_mobile_number1) && (
  <View style={styles.officeContactButtons}>
    {contactOfficeData.const_off_tel_number1 && (
      <TouchableOpacity 
        style={styles.officeContactBtn}
        onPress={() => {
          const formattedNumber = formatPhoneNumberForCall(
            contactOfficeData.const_off_isd_code,
            contactOfficeData.const_off_std_code,
            contactOfficeData.const_off_tel_number1
          );
          handleCall(formattedNumber);
        }}
      >
        <Icon name="phone" size={14} color="#e16e2b" />
        <Text style={styles.officeContactText}>Landline</Text>
      </TouchableOpacity>
    )}
    
    {contactOfficeData.const_off_mobile_number1 && (
      <TouchableOpacity 
        style={styles.officeContactBtn}
        onPress={() => {
          // For mobile, just use ISD + Mobile (no STD code)
          const isd = (contactOfficeData.const_off_isd_code || '+91').replace(/^0+/, '').replace('+', '');
          handleCall(`+${isd}${contactOfficeData.const_off_mobile_number1}`);
        }}
      >
        <Icon name="smartphone" size={14} color="#e16e2b" />
        <Text style={styles.officeContactText}>Mobile</Text>
      </TouchableOpacity>
    )}
  </View>
)}
      
      <View style={styles.badge}>
        <TranslatableText style={styles.badgeText}>Main Office</TranslatableText>
      </View>
    </View>
  )}

  {/* Capital Office (New Delhi) */}
  {contactOfficeData && (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Icon name="account-balance" size={24} color="#e16e2b" />
        </View>
        <TranslatableText style={styles.cardTitle}>Capital Office</TranslatableText>
      </View>
      
      {/* Address Lines */}
     <Text style={styles.cardText}>
  {[
    contactOfficeData.capital_off_address1,
    contactOfficeData.capital_off_address2,
    contactOfficeData.capital_off_address3,
  ]
    .filter(Boolean)
    .join(', ')}
</Text>

      
      {/* State and Pincode */}
      {(contactOfficeData.capital_off_state || contactOfficeData.capital_off_pincode) && (
        <Text style={styles.cardText}>
          {contactOfficeData.capital_off_state}
          {contactOfficeData.capital_off_state && contactOfficeData.capital_off_pincode && ' - '}
          {contactOfficeData.capital_off_pincode}
        </Text>
      )}
      
      {/* Contact Numbers */}
     {/* Contact Numbers */}
{(contactOfficeData.capital_off_tel_number1 || contactOfficeData.capital_off_mobile_number1) && (
  <View style={styles.officeContactButtons}>
    {contactOfficeData.capital_off_tel_number1 && (
      <TouchableOpacity 
        style={styles.officeContactBtn}
        onPress={() => {
          const formattedNumber = formatPhoneNumberForCall(
            contactOfficeData.capital_off_isd_code,
            contactOfficeData.capital_off_std_code,
            contactOfficeData.capital_off_tel_number1
          );
          handleCall(formattedNumber);
        }}
      >
        <Icon name="phone" size={14} color="#e16e2b" />
        <Text style={styles.officeContactText}>Landline</Text>
      </TouchableOpacity>
    )}
    
    {contactOfficeData.capital_off_mobile_number1 && (
      <TouchableOpacity 
        style={styles.officeContactBtn}
        onPress={() => {
          // For mobile, just use ISD + Mobile (no STD code)
          const isd = (contactOfficeData.capital_off_isd_code || '+91').replace(/^0+/, '').replace('+', '');
          handleCall(`+${isd}${contactOfficeData.capital_off_mobile_number1}`);
        }}
      >
        <Icon name="smartphone" size={14} color="#e16e2b" />
        <Text style={styles.officeContactText}>Mobile</Text>
      </TouchableOpacity>
    )}
  </View>
)}
      
      <View style={styles.badge}>
        <TranslatableText style={styles.badgeText}>Parliament</TranslatableText>
      </View>
    </View>

  )}
  
  {/* Show placeholder if no data */}
 {/* Show placeholder if no data */}
{!contactOfficeData && (
  <View style={styles.card}>
    <View style={styles.emptyStateContainer}>
      <Icon name="location-off" size={48} color="#bdc3c7" />
      <TranslatableText style={styles.emptyStateTitle}>No Office Information</TranslatableText>
      <TranslatableText style={styles.emptyStateText}>
        No office details have been added yet.
      </TranslatableText>
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addOfficeButton}
          onPress={handleAddContactOffice}
        >
          <Icon name="add" size={20} color="white" />
          <TranslatableText style={styles.addOfficeButtonText}>Add Office Details</TranslatableText>
        </TouchableOpacity>
      )}
    </View>
  </View>
)}
</View>
<ThreeDotMenu
  visible={contactOfficeDropdownVisible}
  position={contactOfficeDropdownPosition}
  onEdit={handleEditContactOffice}
  onDelete={handleDeleteContactOffice}
  onDismiss={() => setContactOfficeDropdownVisible(false)}
/>

      {/* Contact Methods */}
      <View style={styles.contactSection}>
        <TranslatableText style={styles.sectionTitle}>Get In Touch</TranslatableText>
        
        {/* Phone Numbers */}
       {/* Phone Numbers - NOW FROM API */}
<View style={styles.contactCard}>
  <View style={styles.contactHeader}>
    <View style={styles.contactIconContainer}>
      <Icon name="call" size={20} color="white" />
    </View>
    <TranslatableText style={styles.contactTitle}>Phone Numbers</TranslatableText>
  </View>
  
  {/* Show constituency office mobile if available */}
  {contactOfficeData?.const_off_mobile_number1 && (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleCall(`${contactOfficeData.const_off_isd_code || '+91'}${contactOfficeData.const_off_mobile_number1}`)}
    >
      <View style={styles.contactItemIcon}>
        <Icon name="phone" size={18} color="#e16e2b" />
      </View>
      <View style={styles.phoneTextContainer}>
        <Text style={styles.contactItemText}>
          {contactOfficeData.const_off_isd_code || '+91'} {contactOfficeData.const_off_mobile_number1}
        </Text>
        <Text style={styles.phoneLabel}>Constituency Office</Text>
      </View>
      <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
    </TouchableOpacity>
  )}

  {/* Show capital office mobile if available */}
  {contactOfficeData?.capital_off_mobile_number1 && (
    <TouchableOpacity 
      style={styles.contactItem}
      onPress={() => handleCall(`${contactOfficeData.capital_off_isd_code || '+91'}${contactOfficeData.capital_off_mobile_number1}`)}
    >
      <View style={styles.contactItemIcon}>
        <Icon name="phone" size={18} color="#e16e2b" />
      </View>
      <View style={styles.phoneTextContainer}>
        <Text style={styles.contactItemText}>
          {contactOfficeData.capital_off_isd_code || '+91'} {contactOfficeData.capital_off_mobile_number1}
        </Text>
        <Text style={styles.phoneLabel}>Capital Office</Text>
      </View>
      <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
    </TouchableOpacity>
  )}

  {/* Show message if no phone numbers available */}
  {!contactOfficeData?.const_off_mobile_number1 && !contactOfficeData?.capital_off_mobile_number1 && (
    <View style={styles.contactItem}>
      <TranslatableText style={styles.emptyContactText}>
        No phone numbers available
      </TranslatableText>
    </View>
  )}
</View>

        {/* Email IDs */}
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconContainer}>
              <Icon name="email" size={20} color="white" />
            </View>
            <TranslatableText style={styles.contactTitle}>Email IDs</TranslatableText>
          </View>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleEmail('drsanjayjaiswal@gmail.com')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="mail-outline" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>drsanjayjaiswal@gmail.com</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleEmail('sanjayjaiswal@mpls.sansad.in')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="support" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>sanjayjaiswal@mpls.sansad.in</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>
        </View>

      
{/* Social Media - NOW WITH ADD BUTTON */}
<View style={styles.contactCard}>
  <View style={styles.cardWithMenu}>
    {/* Three Dot Menu - Only show if social media exists */}
    {isAdmin && socialMediaItems.length > 0 && (
      <TouchableOpacity
        style={styles.cardMenuButton}
        onPress={handleMenuPress}
      >
        <Text style={styles.cardMenuButtonText}>⋮</Text>
      </TouchableOpacity>
    )}
    
    <View style={styles.contactHeader}>
      <View style={styles.contactIconContainer}>
        <Icon name="share" size={20} color="white" />
      </View>
      <TranslatableText style={styles.contactTitle}>Social Media</TranslatableText>
    </View>
  </View>
  
  {socialMediaItems.length > 0 ? (
    socialMediaItems.map((item, index) => (
      <TouchableOpacity
        key={index}
        style={styles.contactItem}
        onPress={() => handleSocialMedia(item.url)}
      >
        <View style={styles.contactItemIcon}>
          <Icon name={item.icon} size={18} color="#e16e2b" />
        </View>
        <View style={styles.socialTextContainer}>
          <Text style={styles.socialLabel}>{item.label}</Text>
          <Text style={styles.socialHandle}>{item.handle}</Text>
        </View>
        <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
      </TouchableOpacity>
    ))
  ) : (
    <View style={styles.emptyStateContainer}>
      <Icon name="link-off" size={48} color="#bdc3c7" />
      <TranslatableText style={styles.emptyStateTitle}>No Social Media Links</TranslatableText>
      <TranslatableText style={styles.emptyStateText}>
        No social media information has been added yet.
      </TranslatableText>
      {isAdmin && (
        <TouchableOpacity 
          style={styles.addOfficeButton}
          onPress={handleAddSocialMedia}
        >
          <Icon name="add" size={20} color="white" />
          <TranslatableText style={styles.addOfficeButtonText}>Add Social Media</TranslatableText>
        </TouchableOpacity>
      )}
    </View>
  )}
</View>

{/* Three Dot Menu Dropdown */}
<ThreeDotMenu
  visible={dropdownVisible}
  position={dropdownPosition}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onDismiss={() => setDropdownVisible(false)}
/>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <TranslatableText style={styles.footerText}>Available 24/7 for your support</TranslatableText>
        <View style={styles.footerDivider} />
        <TranslatableText style={styles.footerSubtext}>Response time: Within 2-4 hours</TranslatableText>
      </View>

      {/* Edit Social Media Modal */}
<Modal
  visible={editSocialMediaModalVisible}
  animationType="slide"
  presentationStyle="formSheet"
  onRequestClose={() => setEditSocialMediaModalVisible(false)}
>
  <SafeAreaView style={styles.editModalContainer}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.editModalContent}
    >
      <View style={styles.editModalHeader}>
        <TouchableOpacity
          onPress={() => setEditSocialMediaModalVisible(false)}
          style={styles.editModalCloseButton}
        >
          <Text style={styles.editModalCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.editModalTitleContainer}>
          <Text style={styles.editModalTitle}>Edit Social Media</Text>
        </View>
        <TouchableOpacity
          onPress={handleSaveSocialMedia}
          style={styles.editModalSaveButton}
        >
          <Text style={styles.editModalSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editModalBody}>
        <View style={styles.editFormContainer}>
          <Text style={styles.editSectionTitle}>Social Media Links</Text>
          
          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>FACEBOOK</Text>
            <TextInput
              style={styles.editInput}
              value={editingSocialMediaData.facebook}
              onChangeText={(text) => setEditingSocialMediaData({
                ...editingSocialMediaData,
                facebook: text
              })}
              placeholder="Facebook URL"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>TWITTER/X</Text>
            <TextInput
              style={styles.editInput}
              value={editingSocialMediaData.twitter}
              onChangeText={(text) => setEditingSocialMediaData({
                ...editingSocialMediaData,
                twitter: text
              })}
              placeholder="Twitter/X URL"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>LINKEDIN</Text>
            <TextInput
              style={styles.editInput}
              value={editingSocialMediaData.linkedin}
              onChangeText={(text) => setEditingSocialMediaData({
                ...editingSocialMediaData,
                linkedin: text
              })}
              placeholder="LinkedIn URL"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>INSTAGRAM</Text>
            <TextInput
              style={styles.editInput}
              value={editingSocialMediaData.instagram}
              onChangeText={(text) => setEditingSocialMediaData({
                ...editingSocialMediaData,
                instagram: text
              })}
              placeholder="Instagram URL"
            />
          </View>
        </View>
    
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>

{/* Add Social Media Modal */}
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
      <View style={styles.editModalHeader}>
        <TouchableOpacity
          onPress={() => setAddSocialMediaModalVisible(false)}
          style={styles.editModalCloseButton}
        >
          <Text style={styles.editModalCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.editModalTitleContainer}>
          <TranslatableText style={styles.editModalTitle}>Add Social Media</TranslatableText>
        </View>
        <TouchableOpacity
          onPress={handleSaveAddSocialMedia}
          style={styles.editModalSaveButton}
          disabled={addSocialMediaLoading}
        >
          {addSocialMediaLoading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <TranslatableText style={styles.editModalSaveText}>Save</TranslatableText>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editModalBody}>
        <View style={styles.editFormContainer}>
          <TranslatableText style={styles.editSectionTitle}>Social Media Links</TranslatableText>
          
          {/* Facebook Field */}
          <View style={styles.editInputContainer}>
            <View style={styles.socialMediaLabelContainer}>
              <Text style={styles.socialMediaIcon}>📘</Text>
              <TranslatableText style={styles.editInputLabel}>FACEBOOK</TranslatableText>
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
              <TranslatableText style={styles.editInputLabel}>TWITTER / X</TranslatableText>
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
              <TranslatableText style={styles.editInputLabel}>LINKEDIN</TranslatableText>
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
              <TranslatableText style={styles.editInputLabel}>INSTAGRAM</TranslatableText>
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
    {/* Edit Contact Office Modal */}
<Modal
  visible={editContactOfficeModalVisible}
  animationType="slide"
  presentationStyle="formSheet"
  onRequestClose={() => setEditContactOfficeModalVisible(false)}
>
  <SafeAreaView style={styles.editModalContainer}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.editModalContent}
    >
      <View style={styles.editModalHeader}>
        <TouchableOpacity
          onPress={() => setEditContactOfficeModalVisible(false)}
          style={styles.editModalCloseButton}
        >
          <Text style={styles.editModalCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.editModalTitleContainer}>
          <Text style={styles.editModalTitle}>Edit Contact Offices</Text>
        </View>
        <TouchableOpacity
          onPress={handleSaveContactOffice}
          style={styles.editModalSaveButton}
        >
          <Text style={styles.editModalSaveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editModalBody}>
        <View style={styles.editFormContainer}>
          {/* Constituency Office Section */}
          <Text style={styles.editSectionTitle}>Constituency Office</Text>
          
          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 1</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.const_off_address1}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                const_off_address1: text
              })}
              placeholder="Address Line 1"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 2</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.const_off_address2}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                const_off_address2: text
              })}
              placeholder="Address Line 2"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 3</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.const_off_address3}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                const_off_address3: text
              })}
              placeholder="Address Line 3"
            />
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <Text style={styles.editInputLabel}>STATE</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.const_off_state}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  const_off_state: text
                })}
                placeholder="State"
              />
            </View>

            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <Text style={styles.editInputLabel}>PINCODE</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.const_off_pincode}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  const_off_pincode: text
                })}
                placeholder="Pincode"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.threeColumnRow}>
            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <Text style={styles.editInputLabel}>ISD</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.const_off_isd_code}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  const_off_isd_code: text
                })}
                placeholder="+91"
              />
            </View>

            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <Text style={styles.editInputLabel}>STD</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.const_off_std_code}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  const_off_std_code: text
                })}
                placeholder="0622"
              />
            </View>

            <View style={[styles.editInputContainer, styles.largeWidth]}>
              <Text style={styles.editInputLabel}>TEL NUMBER</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.const_off_tel_number1}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  const_off_tel_number1: text
                })}
                placeholder="Telephone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>MOBILE NUMBER</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.const_off_mobile_number1}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                const_off_mobile_number1: text
              })}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Capital Office Section */}
          <View style={styles.sectionDivider} />
          <Text style={styles.editSectionTitle}>Capital Office</Text>
          
          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 1</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.capital_off_address1}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                capital_off_address1: text
              })}
              placeholder="Address Line 1"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 2</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.capital_off_address2}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                capital_off_address2: text
              })}
              placeholder="Address Line 2"
            />
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>ADDRESS LINE 3</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.capital_off_address3}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                capital_off_address3: text
              })}
              placeholder="Address Line 3"
            />
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <Text style={styles.editInputLabel}>STATE</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.capital_off_state}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  capital_off_state: text
                })}
                placeholder="State"
              />
            </View>

            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <Text style={styles.editInputLabel}>PINCODE</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.capital_off_pincode}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  capital_off_pincode: text
                })}
                placeholder="Pincode"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.threeColumnRow}>
            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <Text style={styles.editInputLabel}>ISD</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.capital_off_isd_code}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  capital_off_isd_code: text
                })}
                placeholder="+91"
              />
            </View>

            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <Text style={styles.editInputLabel}>STD</Text>
              <TextInput
  style={styles.editInput}
  value={addingContactOfficeData.const_off_std_code}
  onChangeText={(text) => {
    // Only allow numbers and limit to 5 digits
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 5);
    setAddingContactOfficeData({
      ...addingContactOfficeData,
      const_off_std_code: cleaned
    });
  }}
  placeholder="0622"
  keyboardType="numeric"
  maxLength={5}  // ✅ ADD THIS
/>
            </View>

            <View style={[styles.editInputContainer, styles.largeWidth]}>
              <Text style={styles.editInputLabel}>TEL NUMBER</Text>
              <TextInput
                style={styles.editInput}
                value={editingContactOfficeData.capital_off_tel_number1}
                onChangeText={(text) => setEditingContactOfficeData({
                  ...editingContactOfficeData,
                  capital_off_tel_number1: text
                })}
                placeholder="Telephone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.editInputContainer}>
            <Text style={styles.editInputLabel}>MOBILE NUMBER</Text>
            <TextInput
              style={styles.editInput}
              value={editingContactOfficeData.capital_off_mobile_number1}
              onChangeText={(text) => setEditingContactOfficeData({
                ...editingContactOfficeData,
                capital_off_mobile_number1: text
              })}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>
{/* Add Contact Office Modal */}
<Modal
  visible={addContactOfficeModalVisible}
  animationType="slide"
  presentationStyle="formSheet"
  onRequestClose={() => setAddContactOfficeModalVisible(false)}
>
  <SafeAreaView style={styles.editModalContainer}>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.editModalContent}
    >
      <View style={styles.editModalHeader}>
        <TouchableOpacity
          onPress={() => setAddContactOfficeModalVisible(false)}
          style={styles.editModalCloseButton}
        >
          <Text style={styles.editModalCloseText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.editModalTitleContainer}>
          <TranslatableText style={styles.editModalTitle}>Add Contact Offices</TranslatableText>
        </View>
        <TouchableOpacity
          onPress={handleSaveAddContactOffice}
          style={styles.editModalSaveButton}
        >
          <TranslatableText style={styles.editModalSaveText}>Save</TranslatableText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.editModalBody}>
        <View style={styles.editFormContainer}>
          {/* Constituency Office Section */}
          <TranslatableText style={styles.editSectionTitle}>Constituency Office</TranslatableText>
          
          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 1</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.const_off_address1}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                const_off_address1: text
              })}
              placeholder="Address Line 1"
            />
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 2</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.const_off_address2}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                const_off_address2: text
              })}
              placeholder="Address Line 2"
            />
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 3</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.const_off_address3}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                const_off_address3: text
              })}
              placeholder="Address Line 3"
            />
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <TranslatableText style={styles.editInputLabel}>STATE</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.const_off_state}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  const_off_state: text
                })}
                placeholder="State"
              />
            </View>

            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <TranslatableText style={styles.editInputLabel}>PINCODE</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.const_off_pincode}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  const_off_pincode: text
                })}
                placeholder="Pincode"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.threeColumnRow}>
            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <TranslatableText style={styles.editInputLabel}>ISD</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.const_off_isd_code}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  const_off_isd_code: text
                })}
                placeholder="+91"
              />
            </View>

            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <TranslatableText style={styles.editInputLabel}>STD</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.const_off_std_code}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  const_off_std_code: text
                })}
                placeholder="0622"
              />
            </View>

            <View style={[styles.editInputContainer, styles.largeWidth]}>
              <TranslatableText style={styles.editInputLabel}>TEL NUMBER</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.const_off_tel_number1}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  const_off_tel_number1: text
                })}
                placeholder="Telephone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>MOBILE NUMBER</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.const_off_mobile_number1}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                const_off_mobile_number1: text
              })}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
            />
          </View>

          {/* Capital Office Section */}
          <View style={styles.sectionDivider} />
          <TranslatableText style={styles.editSectionTitle}>Capital Office</TranslatableText>
          
          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 1</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.capital_off_address1}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                capital_off_address1: text
              })}
              placeholder="Address Line 1"
            />
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 2</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.capital_off_address2}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                capital_off_address2: text
              })}
              placeholder="Address Line 2"
            />
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>ADDRESS LINE 3</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.capital_off_address3}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                capital_off_address3: text
              })}
              placeholder="Address Line 3"
            />
          </View>

          <View style={styles.twoColumnRow}>
            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <TranslatableText style={styles.editInputLabel}>STATE</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.capital_off_state}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  capital_off_state: text
                })}
                placeholder="State"
              />
            </View>

            <View style={[styles.editInputContainer, styles.halfWidth]}>
              <TranslatableText style={styles.editInputLabel}>PINCODE</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.capital_off_pincode}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  capital_off_pincode: text
                })}
                placeholder="Pincode"
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.threeColumnRow}>
            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <TranslatableText style={styles.editInputLabel}>ISD</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.capital_off_isd_code}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  capital_off_isd_code: text
                })}
                placeholder="+91"
              />
            </View>

            <View style={[styles.editInputContainer, styles.smallWidth]}>
              <TranslatableText style={styles.editInputLabel}>STD</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.capital_off_std_code}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  capital_off_std_code: text
                })}
                placeholder="0622"
              />
            </View>

            <View style={[styles.editInputContainer, styles.largeWidth]}>
              <TranslatableText style={styles.editInputLabel}>TEL NUMBER</TranslatableText>
              <TextInput
                style={styles.editInput}
                value={addingContactOfficeData.capital_off_tel_number1}
                onChangeText={(text) => setAddingContactOfficeData({
                  ...addingContactOfficeData,
                  capital_off_tel_number1: text
                })}
                placeholder="Telephone"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.editInputContainer}>
            <TranslatableText style={styles.editInputLabel}>MOBILE NUMBER</TranslatableText>
            <TextInput
              style={styles.editInput}
              value={addingContactOfficeData.capital_off_mobile_number1}
              onChangeText={(text) => setAddingContactOfficeData({
                ...addingContactOfficeData,
                capital_off_mobile_number1: text
              })}
              placeholder="Mobile Number"
              keyboardType="phone-pad"
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
</Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#e16e2b',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  cardContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  cardText: {
    fontSize: 15,
    color: '#5a6c7d',
    lineHeight: 22,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  contactSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e16e2b',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactItemText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
    fontWeight: '500',
  },
  socialTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  socialLabel: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  socialHandle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  footer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e16e2b',
    textAlign: 'center',
  },
  footerDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#e16e2b',
    marginVertical: 8,
    borderRadius: 1,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
dropdownOverlay: {
  flex: 1,
  backgroundColor: 'transparent',
},
dropdownMenu: {
  position: 'absolute',
  backgroundColor: 'white',
  borderRadius: 12,
  paddingVertical: 8,
  paddingHorizontal: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  elevation: 8,
  minWidth: 140,
},
dropdownItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 12,
},
dropdownItemIcon: {
  fontSize: 16,
  marginRight: 12,
},
dropdownItemText: {
  fontSize: 15,
  color: '#2c3e50',
  fontWeight: '500',
},
dropdownSeparator: {
  height: 1,
  backgroundColor: '#ecf0f1',
  marginHorizontal: 8,
},
dropdownDeleteItem: {
  backgroundColor: 'rgba(231, 76, 60, 0.05)',
},
dropdownDeleteText: {
  color: '#e74c3c',
},
editModalContainer: {
  flex: 1,
  backgroundColor: '#f8f9fa',
},
editModalContent: {
  flex: 1,
},
editModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingHorizontal: 16,
  paddingVertical: 12,
  backgroundColor: 'white',
  borderBottomWidth: 1,
  borderBottomColor: '#ecf0f1',
},
editModalCloseButton: {
  padding: 8,
},
editModalCloseText: {
  fontSize: 24,
  color: '#7f8c8d',
},
editModalTitleContainer: {
  flex: 1,
  alignItems: 'center',
},
editModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2c3e50',
},
editModalSaveButton: {
  paddingHorizontal: 16,
  paddingVertical: 8,
  backgroundColor: '#e16e2b',
  borderRadius: 8,
},
editModalSaveText: {
  color: 'white',
  fontWeight: '600',
  fontSize: 15,
},
editModalBody: {
  flex: 1,
  padding: 16,
},
editFormContainer: {
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 16,
},
editSectionTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: 16,
},
editInputContainer: {
  marginBottom: 16,
},
editInputLabel: {
  fontSize: 12,
  fontWeight: '600',
  color: '#7f8c8d',
  marginBottom: 6,
  letterSpacing: 0.5,
},
editInput: {
  backgroundColor: '#f8f9fa',
  borderWidth: 1,
  borderColor: '#ecf0f1',
  borderRadius: 8,
  padding: 12,
  fontSize: 15,
  color: '#2c3e50',
},
officeContactButtons: {
  flexDirection: 'row',
  marginTop: 12,
  gap: 8,
},
officeContactBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(225, 110, 43, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 6,
  gap: 4,
},
officeContactText: {
  fontSize: 12,
  color: '#e16e2b',
  fontWeight: '600',
},
officeHeaderContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 16,
  paddingHorizontal: 4,
},
officeHeaderTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#2c3e50',
},
editOfficeButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: 'rgba(225, 110, 43, 0.1)',
  paddingHorizontal: 12,
  paddingVertical: 8,
  borderRadius: 8,
  gap: 6,
},
editOfficeButtonText: {
  fontSize: 14,
  color: '#e16e2b',
  fontWeight: '600',
},
sectionDivider: {
  height: 1,
  backgroundColor: '#ecf0f1',
  marginVertical: 24,
},
twoColumnRow: {
  flexDirection: 'row',
  gap: 12,
},
threeColumnRow: {
  flexDirection: 'row',
  gap: 8,
},
halfWidth: {
  flex: 1,
},
smallWidth: {
  flex: 0.3,
},
largeWidth: {
  flex: 1.4,
},
threeDotButton: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(225, 110, 43, 0.1)',
  justifyContent: 'center',
  alignItems: 'center',
},
threeDotButtonText: {
  fontSize: 24,
  color: '#e16e2b',
  fontWeight: 'bold',
  lineHeight: 24,
},
emptyStateContainer: {
  alignItems: 'center',
  paddingVertical: 40,
},
emptyStateTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2c3e50',
  marginTop: 16,
  marginBottom: 8,
},
emptyStateText: {
  fontSize: 14,
  color: '#7f8c8d',
  textAlign: 'center',
  marginBottom: 20,
},
addOfficeButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e16e2b',
  paddingHorizontal: 20,
  paddingVertical: 12,
  borderRadius: 8,
  gap: 8,
},
addOfficeButtonText: {
  color: 'white',
  fontSize: 15,
  fontWeight: '600',
},
cardWithMenu: {
  position: 'relative',
},
cardMenuButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  width: 32,
  height: 32,
  borderRadius: 16,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
cardMenuButtonText: {
  fontSize: 20,
  color: '#e16e2b',
  fontWeight: 'bold',
  lineHeight: 20,
},
socialMediaLabelContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  marginBottom: 4,
},
socialMediaIcon: {
  fontSize: 16,
},
infoContainer: {
  backgroundColor: 'rgba(52, 152, 219, 0.1)',
  padding: 12,
  borderRadius: 8,
  marginTop: 8,
},
infoText: {
  fontSize: 13,
  color: '#3498db',
  lineHeight: 18,
},
});

export default ContactUsScreen;