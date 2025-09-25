import React, { useState, useEffect } from 'react';
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
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import styles from '../styles/KnowYourLeaderstyle';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin} from '../../App'; // Import helper functions

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
const [educationEditLoading, setEducationEditLoading] = useState(false);
  useEffect(() => {
    initializeApp();
  }, []);

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
      console.log('🔍 Retrieving member info from EncryptedStorage...');
      
      // Get AppOwnerInfo for member ID and role
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        console.log('📱 AppOwnerInfo found:', Object.keys(parsedData));
        
        // Get member identifier
        const memberIdentifier = parsedData.mobile_no || 
                                parsedData.regdMobileNo || 
                                parsedData.mobile_number || 
                                parsedData.phone ||
                                parsedData.mobileNo ||
                                parsedData.member_id ||
                                parsedData.user_id;
        
        console.log('✅ Member ID found:', memberIdentifier);
        
        return {
          memberId: memberIdentifier || '7702000725'
        };
      }
      
      // Fallback: Try to get from individual storage items
      const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                            await EncryptedStorage.getItem('OWNER_MOBILE') ||
                            await EncryptedStorage.getItem('MEMBER_ID') || 
                            '7702000725';
      
      return {
        memberId: storedMemberId
      };
      
    } catch (error) {
      console.error('❌ Error retrieving member info from storage:', error);
      return {
        memberId: '7702000725'
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
      
      // Check admin role using enhanced App.js functions
      const adminStatus = await checkAdminRole();
      
      console.log('📱 Using member ID:', memberInfo.memberId);
      console.log('🔑 Final Admin Status:', adminStatus);
      
      // Load initial data
      await loadInitialData(memberInfo.memberId);
      
    } catch (error) {
      console.error('❌ App initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Using default settings.');
      await loadInitialData('7702000725');
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
      const endpoint = `${baseUrl}/api/socialmedia/${memberIdentifier}`;
      const result = await ApiService.get(endpoint);
      
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
      const endpoint = `${baseUrl}/api/personaldetails/${memberIdentifier}`;
      const result = await ApiService.get(endpoint);
      
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('API Error (personaldetails):', error);
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
      const endpoint = `${baseUrl}/api/permaddress/${memberIdentifier}`;
      const result = await ApiService.get(endpoint);
      
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('API Error (permaddress):', error);
      return { success: false, error: error.message };
    }
  };

  const fetchPresentAddress = async (memberIdentifier) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/preaddress/${memberIdentifier}`;
      const result = await ApiService.get(endpoint);
      
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('API Error (preaddress):', error);
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

    // Prepare request payload matching your Postman request
    const requestPayload = {
      leader_regd_mobile_no: userInfo.regdMobileNo,
      user_email_id: userInfo.userEmailId,
      edu_qual: {
        degree: addEducationData.degree.trim(),
        college: addEducationData.college.trim(),
        university: addEducationData.university.trim(),
        place: addEducationData.place.trim()
      }
    };

    console.log('📤 Submitting education entry:', requestPayload);

    // Use authPost since education endpoint requires authentication
    const result = await ApiService.authPost(
      `${baseUrl}/api/edudata/entry`,
      requestPayload
    );

    if (result.success) {
      Alert.alert(
        'Success', 
        'Education entry added successfully!',
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
    console.log('🔄 Updating member coordinates as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/coordinates/${memberIdentifier}`;
    
    const requestBody = {
      user_email_id: 'sanjay.jaiswal@gmail.com',
      leader_coordinates: {
        regd_mobile_no: memberIdentifier,
        ...data
      }
    };
    
    // Use authPut instead of put
    const result = await ApiService.authPut(endpoint, requestBody);
    console.log('✅ Member coordinates update result:', result.success);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (update coordinates):', error);
    return { success: false, error: error.message };
  }
};

const deleteMemberCoordinates = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting member coordinates as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/coordinates/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    console.log('🔍 Delete API Response:', result);
    
    if (result.success) {
      console.log('✅ Member coordinates deleted successfully');
      return {
        success: true,
        data: result.data,
        error: null
      };
    } else {
      // Handle the error properly - the error might be an object
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
      
      console.log('❌ Delete failed:', errorMessage);
      return {
        success: false,
        data: null,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error('❌ API Error (delete coordinates):', error);
    return { 
      success: false, 
      error: error.message || 'Network error occurred' 
    };
  }
};
  const updateSocialMedia = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating social media as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/socialmedia/${memberIdentifier}`;
      
      const requestBody = {
        social_media: {
          regd_mobile_no: memberIdentifier,
          ...data
        }
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Social media update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update social media):', error);
      return { success: false, error: error.message };
    }
  };

  const deleteSocialMedia = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting social media as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/socialmedia/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    console.log('🔍 Delete Social Media API Response:', result);
    
    if (result.success) {
      console.log('✅ Social media deleted successfully');
      return { success: true, data: result.data, error: null };
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
      
      console.log('❌ Delete failed:', errorMessage);
      return { success: false, data: null, error: errorMessage };
    }
  } catch (error) {
    console.error('❌ API Error (delete social media):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};


  const updatePersonalDetails = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating personal details as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/personaldetails/${memberIdentifier}`;
      
      const requestBody = {
        personal_details: {
          regd_mobile_no: memberIdentifier,
          ...data
        }
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Personal details update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update personal details):', error);
      return { success: false, error: error.message };
    }
  };

  const deletePersonalDetails = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting personal details as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/personaldetails/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    
    if (result.success) {
      console.log('✅ Personal details deleted successfully');
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
    console.error('❌ API Error (delete personal details):', error);
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
    console.log('🗑️ Deleting educational details as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/edudata/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    
    if (result.success) {
      console.log('✅ Educational details deleted successfully');
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
    console.error('❌ API Error (delete educational details):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

  const updatePermanentAddress = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating permanent address as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/permaddress/${memberIdentifier}`;
      
      const requestBody = {
        perm_address: {
          regd_mobile_no: memberIdentifier,
          ...data
        }
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Permanent address update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update permanent address):', error);
      return { success: false, error: error.message };
    }
  };

  const deletePermanentAddress = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting permanent address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/permaddress/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    
    if (result.success) {
      console.log('✅ Permanent address deleted successfully');
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
    console.error('❌ API Error (delete permanent address):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};

  const updatePresentAddress = async (memberIdentifier, data) => {
    try {
      console.log('🔄 Updating present address as admin...');
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/preaddress/${memberIdentifier}`;
      
      const requestBody = {
        present_address: {
          regd_mobile_no: memberIdentifier,
          ...data
        }
      };
      
      const result = await ApiService.put(endpoint, requestBody);
      console.log('✅ Present address update result:', result.success);
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('❌ API Error (update present address):', error);
      return { success: false, error: error.message };
    }
  };

  const deletePresentAddress = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting present address as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/preaddress/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    
    if (result.success) {
      console.log('✅ Present address deleted successfully');
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
    console.error('❌ API Error (delete present address):', error);
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

  const deleteTimeline = async (memberIdentifier) => {
  try {
    console.log('🗑️ Deleting timeline as admin...');
    const baseUrl = await ConfigService.getBaseUrl();
    const endpoint = `${baseUrl}/api/leadertimeline/${memberIdentifier}`;
    
    const result = await ApiService.delete(endpoint);
    
    if (result.success) {
      console.log('✅ Timeline deleted successfully');
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
    console.error('❌ API Error (delete timeline):', error);
    return { success: false, error: error.message || 'Network error occurred' };
  }
};


  const loadInitialData = async (memberIdentifier) => {
    if (!memberIdentifier) {
      console.error('❌ No member identifier provided');
      return;
    }

    await loadProfileData(memberIdentifier);
    await loadTimelineData(memberIdentifier);
  };

  const loadProfileData = async (memberIdentifier) => {
    try {
      console.log('📡 Loading profile data for member:', memberIdentifier);

      // Fetch all profile data concurrently
      const [
        memberCoordinates,
        socialMedia,
        personalDetails,
        educationalDetails,
        permanentAddress,
        presentAddress
      ] = await Promise.all([
        fetchMemberCoordinates(memberIdentifier),
        fetchSocialMedia(memberIdentifier),
        fetchPersonalDetails(memberIdentifier),
        fetchEducationalDetails(memberIdentifier),
        fetchPermanentAddress(memberIdentifier),
        fetchPresentAddress(memberIdentifier)
      ]);

      // Set member data
      if (memberCoordinates.success && memberCoordinates.data.leader_coordinates) {
        setMemberData(memberCoordinates.data.leader_coordinates);
      } else {
        console.error('Failed to load member coordinates:', memberCoordinates.error);
      }

      // Set social media data
      if (socialMedia.success && socialMedia.data.social_media) {
        setSocialMediaData(socialMedia.data.social_media);
      } else {
        console.error('Failed to load social media:', socialMedia.error);
      }

      // Set personal data
      if (personalDetails.success && personalDetails.data.personal_details) {
        setPersonalData(personalDetails.data.personal_details);
      } else {
        console.error('Failed to load personal details:', personalDetails.error);
      }

      // Set education data
      if (educationalDetails.success && educationalDetails.data.leader_edu_data) {
        setEducationData(educationalDetails.data.leader_edu_data.edu_qual);
      } else {
        console.error('Failed to load educational details:', educationalDetails.error);
      }

      // Combine address data
      const addresses = {
        permanent: permanentAddress.success ? permanentAddress.data.perm_address : null,
        present: presentAddress.success ? presentAddress.data.present_address : null
      };
      setAddressData(addresses);

      // Set errors for debugging
      const apiErrors = {
        memberCoordinates: !memberCoordinates.success ? memberCoordinates.error : null,
        socialMedia: !socialMedia.success ? socialMedia.error : null,
        personalDetails: !personalDetails.success ? personalDetails.error : null,
        educationalDetails: !educationalDetails.success ? educationalDetails.error : null,
        permanentAddress: !permanentAddress.success ? permanentAddress.error : null,
        presentAddress: !presentAddress.success ? presentAddress.error : null,
      };
      setErrors(apiErrors);

      console.log('✅ Profile data loaded successfully');
    } catch (error) {
      console.error('Profile data loading error:', error);
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
    }
  };

  const loadTimelineData = async (memberIdentifier) => {
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
  };

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
        value={String(value || '')} // Ensure value is always a string
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
  // Comprehensive field filtering - exclude system fields and non-editable fields
  const excludedFields = [
    'id', '_id', 'created_at', 'updated_at', 'createdAt', 'updatedAt',
    '__v', 'version', 'regd_mobile_no', 'regdMobileNo', 'regd_mobile_number',
    'registered_mobile_no', 'registered_mobile_number', 'reg_mobile_no',
    'reg_mobile_number', 'member_id', 'user_id', 'created_by', 'updated_by',
    'modified_at', 'modified_by', 'created_date', 'updated_date',
    'timestamp', 'last_modified', 'edu_qual' // Exclude nested arrays
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
              // Handle education edit differently
              if (currentDropdownType === 'education') {
                openEducationEditModal();
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
              <Text style={styles.editModalTitle}>Add New Education</Text>
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
                <Text style={styles.editInputLabel}>DEGREE *</Text>
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
                <Text style={styles.editInputLabel}>COLLEGE *</Text>
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
                <Text style={styles.editInputLabel}>UNIVERSITY *</Text>
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
                <Text style={styles.editInputLabel}>PLACE *</Text>
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
              <Text style={styles.editModalTitle}>Edit Education</Text>
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
                <Text style={[
                  styles.navButtonText,
                  educationData.length <= 1 && styles.navButtonTextDisabled
                ]}>
                  Previous
                </Text>
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
                <Text style={[
                  styles.navButtonText,
                  educationData.length <= 1 && styles.navButtonTextDisabled
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
                  <Text style={styles.deleteEducationButtonText}>
                    Delete This Entry
                  </Text>
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
    const profileImageUrl = memberData?.profile_image || 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180';
    
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
              <View style={styles.onlineIndicator} />
            </View>
            
            <View style={styles.basicInfo}>
<View style={styles.nameRow}>
  <TouchableOpacity
    style={styles.nameContainer}
    onPress={handleLeaderNamePress}
    activeOpacity={0.8}
  >
    <Text style={styles.leaderName}>
      {memberData ? 
        `${memberData.title || ''} ${memberData.member_name || ''}`.trim() : 
        'Loading...'
      }
    </Text>
  </TouchableOpacity>
  <View style={styles.headerButtonsContainer}>
    {renderActionDropdown('coordinates', memberData)}
  </View>
</View>
              <Text style={styles.designation}>Member of Parliament</Text>
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
        
        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          {memberData?.email_id && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`mailto:${memberData.email_id}`)}
            >
              <Text style={styles.quickActionIcon}>✉️</Text>
            </TouchableOpacity>
          )}
          
          {addressData?.present?.mobile_number1 && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`tel:${addressData.present.isd_code}${addressData.present.mobile_number1}`)}
            >
              <Text style={styles.quickActionIcon}>📞</Text>
            </TouchableOpacity>
          )}
          
          {addressData?.present?.mobile_number1 && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`https://wa.me/${addressData.present.isd_code.replace('+', '')}${addressData.present.mobile_number1}`)}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
            </TouchableOpacity>
          )}
          
          {memberData?.digital_sansad_url && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(memberData.digital_sansad_url)}
            >
              <Text style={styles.quickActionIcon}>🏛️</Text>
            </TouchableOpacity>
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
          <Text style={[
            styles.segmentText,
            activeTab === 'profile' && styles.activeSegmentText
          ]}>
            Profile Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'timeline' && styles.activeSegment
          ]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[
            styles.segmentText,
            activeTab === 'timeline' && styles.activeSegmentText
          ]}>
            Career Timeline
          </Text>
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
        <Text style={styles.cardTitle}>{title}</Text>
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
  if (!personalData) return null;

  return renderInfoCard('Personal Information', '👤',
    <View style={styles.infoRows}>
      {personalData.birth_place && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Birthplace</Text>
          <Text style={styles.infoValue}>{personalData.birth_place}</Text>
        </View>
      )}
      {personalData.dob && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date of Birth</Text>
          <Text style={styles.infoValue}>{personalData.dob}</Text>
        </View>
      )}
      {personalData.father_name && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Father's Name</Text>
          <Text style={styles.infoValue}>{personalData.father_name}</Text>
        </View>
      )}
      {personalData.mother_name && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Mother's Name</Text>
          <Text style={styles.infoValue}>{personalData.mother_name}</Text>
        </View>
      )}
      {personalData.profession && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Profession</Text>
          <Text style={styles.infoValue}>{personalData.profession}</Text>
        </View>
      )}
    </View>,
    '#ffffff',
    'personal',    // editType
    personalData   // editData
  );
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
          <Text style={styles.emptyStateText}>No education data available</Text>
        </View>
      )}
      
      {/* Add Education Button - Show for both admin and regular users */}
      <TouchableOpacity
        style={styles.addEducationButton}
        onPress={() => setAddEducationModalVisible(true)}
      >
        <Text style={styles.addEducationIcon}>+</Text>
        <Text style={styles.addEducationText}>Add New Education</Text>
      </TouchableOpacity>
    </View>,
    '#ffffff',
    'education',
    educationData
  );
};


 const renderContactInfo = () => {
  if (!addressData) return null;

  return (
    <>
      {/* Permanent Address */}
      {addressData.permanent && renderInfoCard('Permanent Address', '🏠',
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
                onPress={() => openLink(`tel:${formatPhoneNumber(
                  addressData.permanent.isd_code,
                  addressData.permanent.std_code,
                  addressData.permanent.tel_number1
                )}`)}
              >
                <Text style={styles.contactBtnText}>Call Landline</Text>
              </TouchableOpacity>
            )}
            {addressData.permanent.mobile_number1 && (
              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => openLink(`tel:${addressData.permanent.isd_code}${addressData.permanent.mobile_number1}`)}
              >
                <Text style={styles.contactBtnText}>Call Mobile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>,
        '#ffffff',
        'permanent_address',    // editType
        addressData.permanent   // editData
      )}

      {/* Present Address */}
      {addressData.present && renderInfoCard('Present Address', '🏢',
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
                onPress={() => openLink(`tel:${formatPhoneNumber(
                  addressData.present.isd_code,
                  addressData.present.std_code,
                  addressData.present.tel_number1
                )}`)}
              >
                <Text style={styles.contactBtnText}>Call Office</Text>
              </TouchableOpacity>
            )}
            {addressData.present.mobile_number1 && (
              <TouchableOpacity 
                style={styles.contactBtn}
                onPress={() => openLink(`tel:${addressData.present.isd_code}${addressData.present.mobile_number1}`)}
              >
                <Text style={styles.contactBtnText}>Call Mobile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>,
        '#ffffff',
        'present_address',    // editType
        addressData.present   // editData
      )}
    </>
  );
};

 const renderSocialMedia = () => {
  if (!socialMediaData) return null;

  const socialPlatforms = [
    { key: 'facebook', icon: '📘', name: 'Facebook' },
    { key: 'twitter', icon: '🐦', name: 'Twitter/X' },
    { key: 'linkedin', icon: '💼', name: 'LinkedIn' },
    { key: 'instagram', icon: '📸', name: 'Instagram' }
  ];

  const activePlatforms = socialPlatforms.filter(platform => 
    socialMediaData[platform.key] && socialMediaData[platform.key].trim() !== ''
  );

  if (activePlatforms.length === 0) return null;

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
    'social',        // editType
    socialMediaData  // editData
  );
};


 const renderTimeline = () => {
  if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
    return renderInfoCard('Career Timeline', '📅',
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateIcon}>📋</Text>
        <Text style={styles.emptyStateText}>No timeline data available</Text>
      </View>
    );
  }

  return renderInfoCard('Career Timeline', '📅',
    <View style={styles.timelineContainer}>
      {timelineData.map((item, index) => (
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
      ))}
    </View>,
    '#ffffff',
    'timeline',   // editType
    timelineData  // editData
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

return (
  <ScrollView 
    style={styles.container}
    showsVerticalScrollIndicator={false}
    refreshControl={
      <RefreshControl 
        refreshing={refreshing} 
        onRefresh={onRefresh}
        title="Refreshing..."
      />
    }
  >
    {renderModernHeader()}
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

    {/* ADD THIS NEW LINE: Education Edit Modal */}
    {renderEducationEditModal()}
  </ScrollView>
);

};



export default KnowYourLeaderScreen;