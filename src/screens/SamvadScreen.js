import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  BackHandler,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import { useFocusEffect } from '@react-navigation/native';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import styles from '../styles/Samvadstyles';
import DeviceService from '../services/DeviceService';

const { width } = Dimensions.get('window');

const SamvadScreen = ({ route, navigation }) => {
  const [activeMainTab, setActiveMainTab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [submittedData, setSubmittedData] = useState([]);
  const [userRole, setUserRole] = useState('user');

  // Add admin status filter states
const [selectedStatus, setSelectedStatus] = useState('Open');
const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

const statusOptions = [
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Cancelled', value: 'Cancelled' }
];

// Add this function to check user role
const checkUserRole = async () => {
  try {
    const role = await EncryptedStorage.getItem('USER_ROLE') || 'user';
    setUserRole(role);
    console.log('Current user role:', role);
    return role;
  } catch (error) {
    console.error('Error checking user role:', error);
    setUserRole('user');
    return 'user';
  }
};

  // FIXED: Separate pincode verification states for each tab
  const [pincodeVerificationStates, setPincodeVerificationStates] = useState({
    APPEAL: 'input',
    APPOINTMENT: 'input',
    GRIEVANCE: 'input',
    COMPLAINTS: 'input'
  });
  
  const [pincodeVerifiedStates, setPincodeVerifiedStates] = useState({
    APPEAL: false,
    APPOINTMENT: false,
    GRIEVANCE: false,
    COMPLAINTS: false
  });

  // User info from AppOwnerInfo and login
  const [userInfo, setUserInfo] = useState({
    leaderMobile: '',
    userEmail: ''
  });

  // Check login status whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkLoginStatus();
      getUserInfo();
        checkUserRole(); // Add this line
        DeviceService.initializeDeviceIP();
    }, [])
  );

  // FIXED: Enhanced getUserInfo function with better error handling and multiple storage checks
  const getUserInfo = async () => {
    try {
      console.log('🔍 === GETTING USER INFO ===');
      
      // Get leader mobile from AppOwnerInfo (client mobile) - Multiple possible sources
      let leaderMobile = '';
      
      // Try to get from AsyncStorage first (AppOwnerInfo)
      try {
        const appOwnerInfo = await AsyncStorage.getItem('appOwnerInfo');
        console.log('📱 AppOwnerInfo raw from AsyncStorage:', appOwnerInfo);
        
        if (appOwnerInfo) {
          const ownerInfo = JSON.parse(appOwnerInfo);
          console.log('📱 Parsed AppOwnerInfo:', ownerInfo);
          console.log('📱 AppOwnerInfo keys:', Object.keys(ownerInfo));
          
          // Try multiple possible mobile field names
          const mobileFields = ['client_mobile', 'mobile', 'mobile_no', 'phone', 'contact'];
          for (const field of mobileFields) {
            if (ownerInfo[field]) {
              leaderMobile = String(ownerInfo[field]).trim();
              console.log(`✅ Found mobile in field '${field}': ${leaderMobile}`);
              break;
            }
          }
          
          if (!leaderMobile) {
            console.log('⚠️ No mobile found in AppOwnerInfo, available fields:', Object.keys(ownerInfo));
          }
        } else {
          console.log('⚠️ No AppOwnerInfo found in AsyncStorage');
        }
      } catch (error) {
        console.log('⚠️ Error reading AppOwnerInfo from AsyncStorage:', error.message);
      }

      // If still no mobile, try EncryptedStorage
      if (!leaderMobile) {
        try {
          const encryptedAppOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
          console.log('📱 AppOwnerInfo from EncryptedStorage exists:', !!encryptedAppOwnerInfo);
          
          if (encryptedAppOwnerInfo) {
            const ownerInfo = JSON.parse(encryptedAppOwnerInfo);
            console.log('📱 Parsed EncryptedStorage AppOwnerInfo keys:', Object.keys(ownerInfo));
            
            const mobileFields = ['client_mobile', 'mobile', 'mobile_no', 'phone', 'contact'];
            for (const field of mobileFields) {
              if (ownerInfo[field]) {
                leaderMobile = String(ownerInfo[field]).trim();
                console.log(`✅ Found mobile in EncryptedStorage field '${field}': ${leaderMobile}`);
                break;
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Error reading AppOwnerInfo from EncryptedStorage:', error.message);
        }
      }

      // If still no mobile, try direct owner mobile storage
      if (!leaderMobile) {
        try {
          leaderMobile = await EncryptedStorage.getItem('OWNER_MOBILE') || '';
          if (leaderMobile) {
            console.log('✅ Found mobile in OWNER_MOBILE storage:', leaderMobile);
          }
        } catch (error) {
          console.log('⚠️ Error reading OWNER_MOBILE:', error.message);
        }
      }

      // Get user email from login session - Multiple possible sources
      let userEmail = '';
      try {
        userEmail = await AsyncStorage.getItem('userEmail') || 
                   await AsyncStorage.getItem('user_email') || 
                   await EncryptedStorage.getItem('LOGGED_IN_EMAIL') || '';
        
        console.log('📧 User email found:', userEmail);
      } catch (error) {
        console.log('⚠️ Error reading user email:', error.message);
      }

      // Update state
      const userInfoData = {
        leaderMobile: leaderMobile || '',
        userEmail: userEmail || ''
      };

      setUserInfo(userInfoData);

      console.log('✅ === USER INFO RESULT ===');
      console.log('📱 Leader Mobile:', leaderMobile || '(EMPTY)');
      console.log('📧 User Email:', userEmail || '(EMPTY)');
      console.log('✅ Has Leader Mobile:', !!leaderMobile);
      console.log('✅ Has User Email:', !!userEmail);

      // Store in AsyncStorage for easy access (backup)
      if (leaderMobile) {
        await AsyncStorage.setItem('leaderMobile', leaderMobile);
      }

      return userInfoData;
      
    } catch (error) {
      console.error('❌ Error getting user info:', error);
      const fallbackUserInfo = {
        leaderMobile: '',
        userEmail: ''
      };
      setUserInfo(fallbackUserInfo);
      return fallbackUserInfo;
    }
  };

  // Handle back button for logged in users
  useEffect(() => {
    if (isUserLoggedIn) {
      const backAction = () => {
        Alert.alert(
          "Exit App", 
          "Are you sure you want to exit?", 
          [
            {
              text: "Cancel",
              onPress: () => null,
              style: "cancel"
            },
            { 
              text: "YES", 
              onPress: () => BackHandler.exitApp() 
            }
          ]
        );
        return true;
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }
  }, [isUserLoggedIn]);

  const checkLoginStatus = async () => {
    try {
      const loginStatus = await AsyncStorage.getItem('isLoggedin');
      const isLoggedIn = loginStatus === 'TRUE';
      
      global.isUserLoggedin = isLoggedIn;
      setIsUserLoggedIn(isLoggedIn);
      
      console.log('Login status:', isLoggedIn);
    } catch (error) {
      console.error('Error checking login status:', error);
      global.isUserLoggedin = false;
      setIsUserLoggedIn(false);
    }
  };

  // FIXED: Updated getAuthHeaders to include request type
  const getAuthHeaders = async (requestType = null) => {
    try {
      const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                         await AsyncStorage.getItem('jwt_token') ||
                         await EncryptedStorage.getItem('ACCESS_TOKEN');

      const appKey = await EncryptedStorage.getItem('APP_KEY');

      console.log('Auth Headers Debug:', {
        hasAccessToken: !!accessToken,
        hasAppKey: !!appKey,
        accessTokenLength: accessToken?.length || 0,
        appKeyLength: appKey?.length || 0,
        requestType: requestType
      });

      if (!accessToken) {
        throw new Error('Access token not found');
      }

      if (!appKey) {
        throw new Error('App key not found');
      }

      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'x-app-key': appKey,
      };

      // Add request type to headers if provided
      if (requestType) {
        headers['x-request-type'] = requestType;
      }

      return headers;
    } catch (error) {
      console.error('Error getting auth headers:', error);
      throw error;
    }
  };

  // Handle navigation parameters
  useEffect(() => {
    if (route?.params) {
      const { initialTab, initialSubTab, registrationSuccess, fromRegistration } = route.params;
      
      if (initialTab) {
        setActiveMainTab(initialTab);
      }
      if (initialSubTab) {
        setActiveSubTab(initialSubTab);
      }
      
      if (registrationSuccess || fromRegistration) {
        setShowRegistrationSuccess(true);
        setTimeout(() => {
          setShowRegistrationSuccess(false);
          navigation.setParams({ 
            registrationSuccess: undefined, 
            fromRegistration: undefined 
          });
        }, 4000);
      }
    }
  }, [route?.params]);

  // Load data when PREVIEW tab is selected
 // Load data when PREVIEW or LIST tab is selected
useEffect(() => {
  if (['APPEAL', 'GRIEVANCE', 'COMPLAINTS'].includes(activeMainTab) && 
      isUserLoggedIn && (activeSubTab === 'PREVIEW' || activeSubTab === 'LIST')) {
    loadSubmittedData();
  } else if (activeMainTab === 'APPOINTMENT' && isUserLoggedIn && (activeSubTab === 'PREVIEW' || activeSubTab === 'LIST')) {
    loadAppointments();
  }
}, [activeMainTab, activeSubTab, isUserLoggedIn]);

  const [formDataByTab, setFormDataByTab] = useState({
    APPEAL: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    APPOINTMENT: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    GRIEVANCE: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    COMPLAINTS: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
  });

  const mainTabs = ['APPEAL', 'APPOINTMENT', 'GRIEVANCE', 'COMPLAINTS'];
// Dynamic sub-tabs based on user role
const getSubTabs = () => {
  if (userRole === 'admin') {
    return ['LIST', 'PREVIEW'];
  } else {
    return ['ADD', 'PREVIEW', 'LIST'];
  }
};

const subTabs = getSubTabs();

const handleMainTabClick = (tab) => {
  setActiveMainTab(tab);
  
  if (!isUserLoggedIn) {
    setActiveSubTab('ADD');
  } else {
    // Set default sub-tab based on user role
    if (userRole === 'admin') {
      setActiveSubTab('LIST');
    } else {
      setActiveSubTab('ADD');
    }
  }
};

const handleSubTabClick = (subTab) => {
  // For non-logged users, only allow ADD
  if (!isUserLoggedIn && subTab !== 'ADD') {
    return;
  }
  
  // For admin users, don't allow ADD tab
  if (userRole === 'admin' && subTab === 'ADD') {
    return;
  }
  
  setActiveSubTab(subTab);
};

  const getCurrentFormData = () => activeMainTab ? formDataByTab[activeMainTab] : {};

  const handleChange = (field, value) => {
    if (!activeMainTab) return;
    
    // FIXED: Reset pincode verification for current tab only when pincode changes
    if (field === 'pincode' && value !== getCurrentFormData().pincode) {
      setPincodeVerificationStates(prev => ({
        ...prev,
        [activeMainTab]: 'input'
      }));
      
      setPincodeVerifiedStates(prev => ({
        ...prev,
        [activeMainTab]: false
      }));
      
      // Clear district and state fields when pincode changes
      if (value.length !== 6) {
        setFormDataByTab(prev => ({
          ...prev,
          [activeMainTab]: {
            ...prev[activeMainTab],
            [field]: value,
            district: '',
            state: '',
          }
        }));
        return;
      }
    }
    
    setFormDataByTab(prev => ({
      ...prev,
      [activeMainTab]: {
        ...prev[activeMainTab],
        [field]: value
      }
    }));
  };

  // FIXED: Pincode verification function now works per tab
  const handlePincodeVerification = async () => {
    const currentFormData = getCurrentFormData();
    
    if (!currentFormData.pincode || currentFormData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    setPincodeVerificationStates(prev => ({
      ...prev,
      [activeMainTab]: 'loading'
    }));

    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const result = await ApiService.get(`${baseUrl}/api/pincodes/${currentFormData.pincode}`);

      if (result.success && result.data && result.data.length > 0) {
        console.log('Pincode API Response:', result.data);

        const data = result.data[0];
        const district = data?.district || '';
        const state = data?.statename || '';

        if (district && state) {
          setFormDataByTab(prev => ({
            ...prev,
            [activeMainTab]: {
              ...prev[activeMainTab],
              district,
              state,
            }
          }));

          setPincodeVerifiedStates(prev => ({
            ...prev,
            [activeMainTab]: true
          }));

          setPincodeVerificationStates(prev => ({
            ...prev,
            [activeMainTab]: 'verified'
          }));
        } else {
          setPincodeVerificationStates(prev => ({
            ...prev,
            [activeMainTab]: 'error'
          }));
          Alert.alert('Error', 'Enter a valid pincode.');
        }
      } else {
        setPincodeVerificationStates(prev => ({
          ...prev,
          [activeMainTab]: 'error'
        }));
        Alert.alert('Error', result.message || 'Enter a valid pincode.');
      }
    } catch (error) {
      console.error('Pincode Fetch Error:', error);
      setPincodeVerificationStates(prev => ({
        ...prev,
        [activeMainTab]: 'error'
      }));
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  const getFormHeader = () => {
    switch (activeMainTab) {
      case 'APPEAL':
        return 'Raise an Appeal';
      case 'APPOINTMENT':
        return 'Book an Appointment';
      case 'GRIEVANCE':
        return 'Raise a Grievance';
      case 'COMPLAINTS':
        return 'Raise a Complaint';
      default:
        return '';
    }
  };

  const getPurposeLabel = () => {
    switch (activeMainTab) {
      case 'APPEAL':
        return 'Description';
      case 'APPOINTMENT':
        return 'Purpose Of Meeting';
      case 'GRIEVANCE':
        return 'Description';
      case 'COMPLAINTS':
        return 'Description';
      default:
        return '';
    }
  };

  const getRequestType = () => {
    switch (activeMainTab) {
      case 'APPEAL':
        return 'Appeal';
      case 'GRIEVANCE':
        return 'Grievance';
      case 'COMPLAINTS':
        return 'Complaints';
      default:
        return activeMainTab;
    }
  };

  const validateForm = () => {
    const currentFormData = getCurrentFormData();
    
    if (!currentFormData.mobile || currentFormData.mobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number.');
      return false;
    }
    
    if (!currentFormData.name || currentFormData.name.trim().length < 2) {
      Alert.alert('Error', 'Please enter a valid name.');
      return false;
    }
    
    if (!currentFormData.fatherHusbandName || currentFormData.fatherHusbandName.trim().length < 2) {
      Alert.alert('Error', 'Please enter father/husband name.');
      return false;
    }
    
    if (!currentFormData.address || currentFormData.address.trim().length < 10) {
      Alert.alert('Error', 'Please enter a complete address.');
      return false;
    }
    
    if (!currentFormData.pincode || currentFormData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode.');
      return false;
    }

    // FIXED: Check if pincode is verified for current tab only
    if (!pincodeVerifiedStates[activeMainTab]) {
      Alert.alert('Error', 'Please verify your pincode first.');
      return false;
    }
    
    if (!currentFormData.district || currentFormData.district.trim().length < 2) {
      Alert.alert('Error', 'Please enter district name.');
      return false;
    }
    
    if (!currentFormData.state || currentFormData.state.trim().length < 2) {
      Alert.alert('Error', 'Please enter state name.');
      return false;
    }
    
    if (!currentFormData.purpose || currentFormData.purpose.trim().length < 10) {
      Alert.alert('Error', 'Please provide a detailed description (minimum 10 characters).');
      return false;
    }
    
    if (activeMainTab === 'APPOINTMENT' && (!currentFormData.requestedDate || currentFormData.requestedDate.trim().length < 8)) {
      Alert.alert('Error', 'Please enter a valid requested date.');
      return false;
    }
    
    if (!currentFormData.declarationAccepted) {
      Alert.alert('Error', 'Please accept the declaration to proceed.');
      return false;
    }
    
    return true;
  };

  // FIXED: Updated to include request type in headers
  const submitGrievance = async (grievanceData) => {
    try {
      console.log("Submitting grievance...", grievanceData);

      const headers = await getAuthHeaders(getRequestType()); // Pass request type
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/grievances`;

      console.log("API URL:", apiUrl);
      console.log("Headers:", headers);
      console.log("Request payload:", JSON.stringify(grievanceData, null, 2));

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(grievanceData),
      });

      const status = response.status;
      console.log("Response Status:", status);

      const responseText = await response.text();
      console.log("Raw API Response:", responseText);

      let responseData = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error("Failed to parse response as JSON:", parseError);
          console.log("Response was not valid JSON:", responseText);
          
          return {
            success: false,
            message: `Server error (${status}): ${responseText.substring(0, 200)}`,
            status,
          };
        }
      }

      console.log("Parsed Grievance API Response:", responseData);

      if (response.ok) {
        return {
          success: true,
          data: responseData,
          status,
        };
      } else {
        return {
          success: false,
          message: responseData.message || 
                   responseData.error || 
                   responseData.details || 
                   `Request failed with status ${status}`,
          status,
          data: responseData,
        };
      }
    } catch (error) {
      console.error("Network Error submitting grievance:", error);
      return {
        success: false,
        message: error.message.includes('Network request failed') 
          ? "Cannot connect to server. Please check your internet connection."
          : "Network error. Please try again.",
        error: error.message,
      };
    }
  };

  // FIXED: Updated to include request type in headers
  const submitAppointment = async (appointmentData) => {
    try {
      console.log('Submitting appointment...', appointmentData);
      
      const headers = await getAuthHeaders('APPOINTMENT'); // Pass APPOINTMENT as request type
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/appointments`;
      
      console.log('API URL:', apiUrl);
      console.log('Headers:', headers);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(appointmentData),
      });

      const responseText = await response.text();
      console.log('Raw API Response:', responseText);

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        return { 
          success: false, 
          message: 'Invalid response from server',
          status: response.status 
        };
      }

      console.log('Parsed Appointment API Response:', responseData);

      if (response.ok) {
        return { success: true, data: responseData };
      } else {
        return { 
          success: false, 
          message: responseData.message || responseData.error || 'Failed to submit appointment',
          status: response.status 
        };
      }
    } catch (error) {
      console.error('Error submitting appointment:', error);
      return { 
        success: false, 
        message: 'Network error. Please check your connection.',
        error: error.message 
      };
    }
  };

  // Updated loadSubmittedData function
const loadSubmittedData = async () => {
  try {
    setIsLoadingData(true);
    
    // Refresh user info before making API call
    const currentUserInfo = await getUserInfo();
    
    console.log('Loading submitted data - User Info Check:', {
      leaderMobile: currentUserInfo.leaderMobile,
      userEmail: currentUserInfo.userEmail,
      hasLeaderMobile: !!currentUserInfo.leaderMobile,
      hasUserEmail: !!currentUserInfo.userEmail
    });
    
    // Validate required parameters
    if (!currentUserInfo.leaderMobile || !currentUserInfo.userEmail) {
      console.error('Missing required parameters for API call:', {
        leaderMobile: currentUserInfo.leaderMobile || '(MISSING)',
        userEmail: currentUserInfo.userEmail || '(MISSING)'
      });
      
      Alert.alert(
        'Missing Information', 
        'Unable to load data. Required information is missing:\n' +
        `Leader Mobile: ${currentUserInfo.leaderMobile ? '✓' : '✗'}\n` +
        `User Email: ${currentUserInfo.userEmail ? '✓' : '✗'}\n\n` +
        'Please ensure you are logged in and the app is properly configured.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const headers = await getAuthHeaders(getRequestType());
    const baseUrl = await ConfigService.getBaseUrl();
    
    // FIXED: Use the correct endpoint format matching Postman
    const encodedMobile = encodeURIComponent(currentUserInfo.leaderMobile);
    const encodedEmail = encodeURIComponent(currentUserInfo.userEmail);
    
    // Use the same endpoint format as Postman (without /search)
    const apiUrl = `${baseUrl}/api/grievances/?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}`;
    
    console.log('API Call Details:', {
      url: apiUrl,
      method: 'GET',
      headers: headers,
      leaderMobile: currentUserInfo.leaderMobile,
      userEmail: currentUserInfo.userEmail
    });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    console.log('API Response Status:', response.status);
    console.log('API Response Status Text:', response.statusText);

    // Handle different content types
    let responseData;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const responseText = await response.text();
      console.log('Non-JSON Response:', responseText);
      
      try {
        responseData = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        Alert.alert('Error', 'Invalid response format from server');
        return;
      }
    }

    console.log('Parsed Response Data:', responseData);

    if (response.ok) {
      // Handle different response structures
      let dataArray = [];
      
      if (Array.isArray(responseData)) {
        dataArray = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        dataArray = responseData.data;
      } else if (responseData.grievances && Array.isArray(responseData.grievances)) {
        dataArray = responseData.grievances;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        dataArray = responseData.results;
      } else {
        console.log('Unexpected response structure:', responseData);
        dataArray = [];
      }

      console.log('Data array length:', dataArray.length);

      if (dataArray.length > 0) {
        const requestType = getRequestType();
        console.log('Filtering for request type:', requestType);
        
        const filteredData = dataArray.filter(item => {
          const itemRequestType = item.request_type || item.type || '';
          const matches = itemRequestType === requestType || 
                         itemRequestType.includes(requestType) ||
                         itemRequestType.toLowerCase() === requestType.toLowerCase();
          
          if (matches) {
            console.log('Matched item:', {
              id: item.id || item.regn_no,
              request_type: itemRequestType,
              applicant_name: item.applicant_name
            });
          }
          
          return matches;
        });
        
        console.log('Filtered data length:', filteredData.length);
        setSubmittedData(filteredData);
        
        if (filteredData.length === 0) {
          console.log('No data found for request type:', requestType);
          console.log('Available request types:', dataArray.map(item => item.request_type || item.type));
        }
      } else {
        console.log('No data found in response');
        setSubmittedData([]);
      }
    } else {
      console.error('API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      let errorMessage = 'Failed to load submitted data';
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (response.status === 404) {
        errorMessage = 'Service not found. Please contact support.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (responseData && responseData.message) {
        errorMessage = responseData.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  } catch (error) {
    console.error('Network Error loading submitted data:', {
      message: error.message,
      stack: error.stack,
      userInfo: userInfo
    });
    
    let errorMessage = 'Network error while loading data';
    
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    }
    
    Alert.alert('Network Error', errorMessage);
  } finally {
    setIsLoadingData(false);
  }
};

 // Updated loadAppointments function
const loadAppointments = async () => {
  try {
    setIsLoadingData(true);
    
    // Refresh user info before making API call
    const currentUserInfo = await getUserInfo();
    
    console.log('Loading appointments - User Info Check:', {
      leaderMobile: currentUserInfo.leaderMobile,
      userEmail: currentUserInfo.userEmail
    });
    
    // Validate required parameters for appointments too
    if (!currentUserInfo.leaderMobile || !currentUserInfo.userEmail) {
      Alert.alert(
        'Missing Information', 
        'Unable to load appointments. Required user information is missing.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const headers = await getAuthHeaders('APPOINTMENT');
    const baseUrl = await ConfigService.getBaseUrl();
    
    // FIXED: Add query parameters to appointments endpoint
    const encodedMobile = encodeURIComponent(currentUserInfo.leaderMobile);
    const encodedEmail = encodeURIComponent(currentUserInfo.userEmail);
    const apiUrl = `${baseUrl}/api/appointments/?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}`;
    
    console.log('Loading appointments from:', apiUrl);
    console.log('Headers:', headers);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    console.log('Appointments API Response Status:', response.status);

    const responseText = await response.text();
    console.log('Raw Appointments Response:', responseText);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse appointments response as JSON:', parseError);
      Alert.alert('Error', 'Invalid response format from server');
      return;
    }

    console.log('Parsed Appointments Response:', responseData);

    if (response.ok) {
      // Handle different response structures for appointments
      let appointmentsArray = [];
      
      if (Array.isArray(responseData)) {
        appointmentsArray = responseData;
      } else if (responseData.appointments && Array.isArray(responseData.appointments)) {
        appointmentsArray = responseData.appointments;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        appointmentsArray = responseData.data;
      } else if (responseData.results && Array.isArray(responseData.results)) {
        appointmentsArray = responseData.results;
      } else {
        console.log('Unexpected appointments response structure:', responseData);
        appointmentsArray = [];
      }

      console.log('Appointments array length:', appointmentsArray.length);
      setSubmittedData(appointmentsArray);
    } else {
      console.error('Failed to load appointments:', {
        status: response.status,
        statusText: response.statusText,
        data: responseData
      });
      
      let errorMessage = 'Failed to load appointments';
      
      if (response.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (response.status === 403) {
        errorMessage = 'Access denied. Please check your permissions.';
      } else if (response.status === 404) {
        errorMessage = 'Appointments service not found.';
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (responseData && responseData.message) {
        errorMessage = responseData.message;
      }
      
      Alert.alert('Error', errorMessage);
    }
  } catch (error) {
    console.error('Error loading appointments:', {
      message: error.message,
      stack: error.stack
    });
    
    let errorMessage = 'Network error while loading appointments';
    
    if (error.message.includes('Network request failed')) {
      errorMessage = 'Cannot connect to server. Please check your internet connection.';
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout. Please try again.';
    }
    
    Alert.alert('Network Error', errorMessage);
  } finally {
    setIsLoadingData(false);
  }
};
// Add this function after loadAppointments function
const loadDataByStatus = async (status = selectedStatus) => {
  try {
    setIsLoadingData(true);
    
    const currentUserInfo = await getUserInfo();
    
    console.log('Loading data by status:', {
      leaderMobile: currentUserInfo.leaderMobile,
      userEmail: currentUserInfo.userEmail,
      status: status,
      requestType: getRequestType()
    });
    
    if (!currentUserInfo.leaderMobile || !currentUserInfo.userEmail) {
      Alert.alert('Missing Information', 'Unable to load data. Required information is missing.');
      return;
    }
    
    const headers = await getAuthHeaders(getRequestType());
    const baseUrl = await ConfigService.getBaseUrl();
    
    let apiUrl;
    const encodedMobile = encodeURIComponent(currentUserInfo.leaderMobile);
    const encodedEmail = encodeURIComponent(currentUserInfo.userEmail);
    
    if (activeMainTab === 'APPOINTMENT') {
      apiUrl = `${baseUrl}/api/appointments/status/?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&status=${encodeURIComponent(status)}`;
    } else {
      const requestType = getRequestType();
      apiUrl = `${baseUrl}/api/grievances/status/?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&request_type=${encodeURIComponent(requestType)}&status=${encodeURIComponent(status)}`;
    }
    
    console.log('Status Filter API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers,
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', parseError);
      Alert.alert('Error', 'Invalid response from server');
      return;
    }

    if (response.ok) {
      let dataArray = [];
      
      if (Array.isArray(responseData)) {
        dataArray = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        dataArray = responseData.data;
      } else if (responseData.grievances && Array.isArray(responseData.grievances)) {
        dataArray = responseData.grievances;
      } else if (responseData.appointments && Array.isArray(responseData.appointments)) {
        dataArray = responseData.appointments;
      }

      setSubmittedData(dataArray);
    } else {
      console.error('API Error:', response.status, responseData);
      Alert.alert('Error', responseData.message || 'Failed to load data by status');
      setSubmittedData([]);
    }
  } catch (error) {
    console.error('Network Error:', error);
    Alert.alert('Network Error', 'Failed to connect to server');
    setSubmittedData([]);
  } finally {
    setIsLoadingData(false);
  }
};

const handleStatusFilterSubmit = () => {
  console.log('Filtering by status:', selectedStatus);
  loadDataByStatus(selectedStatus);
};

const renderAdminStatusFilter = () => {
  return (
    <View style={styles.adminFilterContainer}>
      <Text style={styles.filterLabel}>Filter by Status:</Text>
      
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
        >
          <Text style={styles.dropdownButtonText}>{selectedStatus}</Text>
          <Text style={styles.dropdownArrow}>{isStatusDropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {isStatusDropdownOpen && (
          <View style={styles.dropdownOptions}>
            {statusOptions.map((option, index) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.dropdownOption,
                  selectedStatus === option.value && styles.selectedOption,
                  index === statusOptions.length - 1 && styles.lastOption
                ]}
                onPress={() => {
                  setSelectedStatus(option.value);
                  setIsStatusDropdownOpen(false);
                }}
              >
                <Text style={[
                  styles.dropdownOptionText,
                  selectedStatus === option.value && styles.selectedOptionText
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.filterSubmitButton}
        onPress={handleStatusFilterSubmit}
        disabled={isLoadingData}
      >
        {isLoadingData ? (
          <View style={styles.loadingButtonContent}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.filterSubmitButtonText}>Loading...</Text>
          </View>
        ) : (
          <Text style={styles.filterSubmitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};
  // FIXED: Added getDeviceIP function
  const getDeviceIP = async () => {
  try {
    return await DeviceService.getDeviceIP();
  } catch (error) {
    console.error('Error getting device IP:', error);
    return "192.168.1.100"; // Fallback IP
  }
};

  const handleSubmit = async () => {
    if (!activeMainTab) return;
    
    // FIXED: Refresh user info before validation
    await getUserInfo();
    
    // FIXED: Enhanced user info validation with detailed logging
    console.log('Current userInfo before submit:', userInfo);
    
    if (!userInfo.leaderMobile || !userInfo.userEmail) {
      console.error('User info validation failed:', {
        leaderMobile: userInfo.leaderMobile,
        userEmail: userInfo.userEmail,
        hasLeaderMobile: !!userInfo.leaderMobile,
        hasUserEmail: !!userInfo.userEmail
      });
      
      Alert.alert(
        'User Information Missing', 
        'Unable to get your account information. Please logout and login again to continue.',
        [
          {
            text: 'Go to Login',
            onPress: () => navigation.navigate('Login')
          },
          {
            text: 'Try Again',
            onPress: async () => {
              await getUserInfo();
              console.log('Refreshed userInfo:', userInfo);
            }
          }
        ]
      );
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    const currentFormData = getCurrentFormData();
    setIsSubmitting(true);
    
    try {
      const currentDeviceIP = await getDeviceIP();
      
      if (['APPEAL', 'GRIEVANCE', 'COMPLAINTS'].includes(activeMainTab)) {
        let requestTypeValue;
        switch (activeMainTab) {
          case 'APPEAL':
            requestTypeValue = 'Appeal';
            break;
          case 'GRIEVANCE':
            requestTypeValue = 'Grievance';
            break;
          case 'COMPLAINTS':
            requestTypeValue = 'Complaints';
            break;
          default:
            requestTypeValue = activeMainTab;
        }

        const grievanceData = {
          leader_regd_mobile_no: userInfo.leaderMobile,
          user_email_id: userInfo.userEmail,
          request_type: requestTypeValue,
          applicant_mobile: currentFormData.mobile,
          applicant_name: currentFormData.name,
          fh_name: currentFormData.fatherHusbandName,
          address: currentFormData.address,
          pincode: currentFormData.pincode,
          district: currentFormData.district,
          state: currentFormData.state,
          description: currentFormData.purpose,
          device_ip_number: currentDeviceIP
        };

        console.log('Submitting grievance data:', grievanceData);

        const result = await submitGrievance(grievanceData);
        
        console.log('Full API response:', result);
        
        if (result.success) {
        const regnNo = result.regn_no || result.data?.regn_no || 'N/A';
          
          // Clear form data after successful submission
          setFormDataByTab(prev => ({
            ...prev,
            [activeMainTab]: {
              mobile: '',
              name: '',
              fatherHusbandName: '',
              address: '',
              pincode: '',
              district: '',
              state: '',
              purpose: '',
              requestedDate: '',
              declarationAccepted: false,
            }
          }));

          // Reset pincode verification states
          setPincodeVerificationStates(prev => ({
            ...prev,
            [activeMainTab]: 'input'
          }));
          
          setPincodeVerifiedStates(prev => ({
            ...prev,
            [activeMainTab]: false
          }));

        const successMessage = `Your ${requestTypeValue} has been registered successfully with Registration No: ${regnNo}`;


Alert.alert(
  'Success', 
  successMessage,
  [
    {
      text: 'View Submitted',
      onPress: () => setActiveSubTab('PREVIEW')
    },
    {
      text: 'OK',
      style: 'default'
    }
  ]
);
        } else {
          console.error('Submission failed:', result);
          
          let errorMessage = 'Failed to submit request. Please try again.';
          
          if (result.status === 400) {
            errorMessage = result.message || 'Invalid data provided. Please check your input.';
          } else if (result.status === 401) {
            errorMessage = 'Session expired. Please login again.';
          } else if (result.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (result.status === 404) {
            errorMessage = 'Service not found. Please contact support.';
          } else if (result.status === 422) {
            errorMessage = result.message || 'Data validation failed. Please check your input.';
          } else if (result.status === 500) {
            errorMessage = 'Server error. Please try again later or contact support.';
            console.error('500 Error Details:', {
              status: result.status,
              message: result.message,
              error: result.error,
              data: grievanceData
            });
          } else if (result.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
          } else if (result.message) {
            errorMessage = result.message;
          }

          Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
        }
      } else if (activeMainTab === 'APPOINTMENT') {
        const appointmentData = {
          leader_regd_mobile_no: userInfo.leaderMobile,
          user_email_id: userInfo.userEmail,
          applicant_mobile: currentFormData.mobile,
          applicant_name: currentFormData.name,
          fh_name: currentFormData.fatherHusbandName,
          address: currentFormData.address,
          pincode: currentFormData.pincode,
          district: currentFormData.district,
          state: currentFormData.state,
          req_meeting_date: currentFormData.requestedDate,
          meeting_purpose: currentFormData.purpose,
          device_ip_number: currentDeviceIP
        };

        console.log('Submitting appointment data:', appointmentData);

        const result = await submitAppointment(appointmentData);
        console.log('Appointment API response:', result);
        
        if (result.success) {
         const regnNo = result.data?.regn_no || 'N/A';
          
          // Clear form data after successful submission
          setFormDataByTab(prev => ({
            ...prev,
            [activeMainTab]: {
              mobile: '',
              name: '',
              fatherHusbandName: '',
              address: '',
              pincode: '',
              district: '',
              state: '',
              purpose: '',
              requestedDate: '',
              declarationAccepted: false,
            }
          }));

          // Reset pincode verification states
          setPincodeVerificationStates(prev => ({
            ...prev,
            [activeMainTab]: 'input'
          }));
          
          setPincodeVerifiedStates(prev => ({
            ...prev,
            [activeMainTab]: false
          }));

          Alert.alert(
            'Success', 
            `Your appointment has been submitted successfully! Registration No: ${regnNo}`,
            [
              {
                text: 'View Appointments',
                onPress: () => setActiveSubTab('PREVIEW')
              },
              {
                text: 'OK',
                style: 'default'
              }
            ]
          );
        } else {
          console.error('Appointment submission failed:', result);
          
          let errorMessage = 'Failed to submit appointment. Please try again.';
          
          if (result.status === 400) {
            errorMessage = result.message || 'Invalid data provided. Please check your input.';
          } else if (result.status === 401) {
            errorMessage = 'Session expired. Please login again.';
          } else if (result.status === 403) {
            errorMessage = 'Access denied. Please check your permissions.';
          } else if (result.status === 404) {
            errorMessage = 'Service not found. Please contact support.';
          } else if (result.status === 422) {
            errorMessage = result.message || 'Data validation failed. Please check your input.';
          } else if (result.status === 500) {
            errorMessage = 'Server error. Please try again later or contact support.';
            console.error('500 Error Details:', {
              status: result.status,
              message: result.message,
              error: result.error,
              data: appointmentData
            });
          } else if (result.status === 503) {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
          } else if (result.message) {
            errorMessage = result.message;
          }
          
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        activeMainTab,
        formData: currentFormData,
        userInfo
      });
      
      Alert.alert(
        'Error', 
        'An unexpected error occurred. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!activeMainTab) return;
    
    Alert.alert(
      'Confirm',
      'Are you sure you want to clear all the form data?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Yes, Clear',
          style: 'destructive',
          onPress: () => {
            setFormDataByTab(prev => ({
              ...prev,
              [activeMainTab]: {
                mobile: '',
                name: '',
                fatherHusbandName: '',
                address: '',
                pincode: '',
                district: '',
                state: '',
                purpose: '',
                requestedDate: '',
                declarationAccepted: false,
              }
            }));
            setFocusedField(null);
            
            // FIXED: Reset pincode verification state for current tab only
            setPincodeVerificationStates(prev => ({
              ...prev,
              [activeMainTab]: 'input'
            }));
            
            setPincodeVerifiedStates(prev => ({
              ...prev,
              [activeMainTab]: false
            }));
            
            Alert.alert('Cleared', `${activeMainTab} form has been cleared.`);
          }
        }
      ]
    );
  };

  const handleLoginRedirect = () => {
    navigation.navigate('Login');
  };

  // Render login required message
  const renderLoginRequired = () => {
    const justRegistered = route?.params?.fromRegistration;
    
    return (
      <ScrollView contentContainerStyle={styles.contentArea} showsVerticalScrollIndicator={false}>
        <View style={styles.contentCard}>
          <View style={styles.loginRequiredContainer}>
            {justRegistered && (
              <View style={styles.successBanner}>
                <Text style={styles.successText}>Registration Successful!</Text>
                <Text style={styles.successSubText}>Your account has been created successfully</Text>
              </View>
            )}
            
            <Text style={styles.loginRequiredTitle}>Login Required</Text>
            <Text style={styles.loginRequiredMessage}>
              {justRegistered 
                ? "Great! Your account has been created successfully."
                : "Oops! You are not logged in."
              }
            </Text>
            <Text style={styles.loginRequiredSubMessage}>
              Please login to access {activeMainTab?.toLowerCase()} services and submit requests.
            </Text>
            
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLoginRedirect}
            >
              <Text style={styles.loginButtonText}>
                {justRegistered ? "Login to Continue" : "Click here to Login"}
              </Text>
            </TouchableOpacity>
            
            {!justRegistered && (
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Registration')}>
                  <Text style={styles.registerLink}>Register here</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    required = false,
    note = null
  ) => {
    const currentFormData = getCurrentFormData();
    const isFocused = focusedField === field;
    const hasValue = currentFormData[field] && currentFormData[field].length > 0;
    
    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.label, required && styles.requiredLabel]}>
          {label}
          {required && <Text style={styles.asterisk}> *</Text>}
        </Text>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasValue && styles.inputWrapperFilled
        ]}>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              isFocused && styles.inputFocused
            ]}
            value={currentFormData[field] || ''}
            onChangeText={(text) => handleChange(field, text)}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField(null)}
            maxLength={field === 'mobile' ? 10 : field === 'pincode' ? 6 : undefined}
          />
        </View>
        {note && (
          <Text style={styles.fieldNote}>
            {note}
          </Text>
        )}
      </View>
    );
  };

  // FIXED: Pincode field now uses tab-specific verification state
  const renderPincodeField = () => {
    const currentFormData = getCurrentFormData();
    const isFocused = focusedField === 'pincode';
    const hasValue = currentFormData.pincode && currentFormData.pincode.length > 0;
    const currentTabVerificationState = pincodeVerificationStates[activeMainTab];
    
    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.label, styles.requiredLabel]}>
          Pincode
          <Text style={styles.asterisk}> *</Text>
        </Text>
        <View style={styles.pincodeContainer}>
          <View style={[
            styles.pincodeInputWrapper,
            isFocused && styles.inputWrapperFocused,
            hasValue && styles.inputWrapperFilled,
            currentTabVerificationState === 'verified' && styles.inputWrapperVerified
          ]}>
            <TextInput
              style={[
                styles.pincodeInput,
                isFocused && styles.inputFocused
              ]}
              value={currentFormData.pincode || ''}
              onChangeText={(text) => handleChange('pincode', text)}
              placeholder="6-digit pincode"
              placeholderTextColor="#999"
              keyboardType="numeric"
              onFocus={() => setFocusedField('pincode')}
              onBlur={() => setFocusedField(null)}
              maxLength={6}
            />
          </View>
          <TouchableOpacity
            style={[
              styles.verifyButton,
              currentTabVerificationState === 'loading' && styles.verifyButtonLoading,
              currentTabVerificationState === 'verified' && styles.verifyButtonVerified,
              currentTabVerificationState === 'error' && styles.verifyButtonError
            ]}
            onPress={handlePincodeVerification}
            disabled={currentTabVerificationState === 'loading' || currentFormData.pincode?.length !== 6}
          >
            {currentTabVerificationState === 'loading' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : currentTabVerificationState === 'verified' ? (
              <Text style={styles.verifyButtonText}>✓ Verified</Text>
            ) : (
              <Text style={styles.verifyButtonText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>
        {currentTabVerificationState === 'error' && (
          <Text style={styles.errorText}>Please enter a valid pincode</Text>
        )}
      </View>
    );
  };

  const renderCheckbox = () => {
    const currentFormData = getCurrentFormData();
    const isChecked = currentFormData.declarationAccepted;

    return (
      <View style={styles.declarationContainer}>
        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            onPress={() => handleChange('declarationAccepted', !isChecked)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
              {isChecked && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.declarationTextContainer}
            onPress={() => handleChange('declarationAccepted', !isChecked)}
            activeOpacity={0.7}
          >
            <Text style={styles.declarationText}>
              I hereby declare that the information provided above is true to the best of my knowledge and I'm aware that if any part of information submitted is found to be false, my application will be rejected.
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

// Enhanced renderSubmittedDataList function with clean UI
const renderSubmittedDataList = () => {
  return (
    <View style={styles.dataContainer}>
      {/* Add admin filter at the top if user is admin */}
      {userRole === 'admin' && renderAdminStatusFilter()}
      
      {isLoadingData ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading {getRequestType().toLowerCase()}s...</Text>
        </View>
      ) : submittedData.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No {getRequestType().toLowerCase()} found</Text>
          <Text style={styles.emptySubText}>
            {userRole === 'admin' 
              ? `No ${getRequestType().toLowerCase()}s found with status: ${selectedStatus}`
              : `Submit a new ${getRequestType().toLowerCase()} to see it here`
            }
          </Text>
          {userRole !== 'admin' && (
            <TouchableOpacity 
              style={styles.addNewButton}
              onPress={() => setActiveSubTab('ADD')}
            >
              <Text style={styles.addNewButtonText}>
                Add New {getRequestType()}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>{activeMainTab} RECORDS</Text>
            <Text style={styles.dataCount}>
              ({submittedData.length} Items{userRole === 'admin' ? ` - ${selectedStatus}` : ''})
            </Text>
          </View>
          
          <ScrollView 
            style={styles.cardsContainer}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {submittedData.map((item, index) => {
              const regnNo = item.regn_no || item.registration_number || item.id || `${activeMainTab}${String(index + 1).padStart(4, '0')}`;
              const applicantName = item.applicant_name || item.name || 'N/A';
              const description = item.description || item.meeting_purpose || item.purpose || 'No description available';
              const requestDate = item.created_at || item.requested_date || item.req_meeting_date || new Date().toISOString();
              const status = item.status || 'pending';
              const mobile = item.applicant_mobile || item.mobile || 'N/A';
              
              const formatDate = (dateString) => {
                try {
                  const date = new Date(dateString);
                  const options = { 
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  };
                  return date.toLocaleDateString('en-US', options);
                } catch (error) {
                  return new Date().toLocaleDateString('en-US', { 
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                }
              };

              const formattedDate = formatDate(requestDate);
              
              return (
                <View key={`${regnNo}-${index}`} style={styles.enhancedDataCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.regnContainer}>
                      <Text style={styles.regnLabel}>REG NO</Text>
                      <Text style={styles.regnNumber}>{regnNo}</Text>
                    </View>
                    <View style={styles.statusContainer}>
                      <Text style={[
                        styles.statusBadge,
                        status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed' 
                          ? styles.statusApproved
                          : status.toLowerCase() === 'rejected' 
                            ? styles.statusRejected 
                            : styles.statusPending
                      ]}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardContent}>
                    <View style={styles.applicantSection}>
                      <Text style={styles.sectionLabel}>APPLICANT</Text>
                      <Text style={styles.applicantName}>{applicantName}</Text>
                      <Text style={styles.applicantMobile}>{mobile}</Text>
                    </View>

                    <View style={styles.descriptionSection}>
                      <Text style={styles.sectionLabel}>
                        {activeMainTab === 'APPOINTMENT' ? 'MEETING PURPOSE' : 'DESCRIPTION'}
                      </Text>
                      <Text style={styles.descriptionText} numberOfLines={3}>
                        {description}
                      </Text>
                    </View>

                    {activeMainTab === 'APPOINTMENT' && item.req_meeting_date && (
                      <View style={styles.meetingDateSection}>
                        <Text style={styles.sectionLabel}>REQUESTED DATE</Text>
                        <Text style={styles.meetingDate}>{item.req_meeting_date}</Text>
                      </View>
                    )}

                    <View style={styles.cardFooter}>
                      <View style={styles.dateSection}>
                        <Text style={styles.dateLabel}>SUBMITTED</Text>
                        <Text style={styles.dateText}>{formattedDate}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={styles.viewDetailsButton}
                        onPress={() => showItemDetails(item)}
                      >
                        <Text style={styles.viewDetailsText}>VIEW DETAILS</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
};
// New function to render LIST view
const renderListView = () => {
  if (isLoadingData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading {getRequestType().toLowerCase()}s...</Text>
      </View>
    );
  }

  if (submittedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No {getRequestType().toLowerCase()} found</Text>
        <Text style={styles.emptySubText}>No submissions available for this category</Text>
        <TouchableOpacity 
          style={styles.addNewButton}
          onPress={() => {
            if (activeMainTab === 'APPOINTMENT') {
              loadAppointments();
            } else {
              loadSubmittedData();
            }
          }}
        >
          <Text style={styles.addNewButtonText}>Refresh Data</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Show simplified list view - different from PREVIEW
  return (
    <View style={styles.dataContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>{activeMainTab} LIST</Text>
        <Text style={styles.dataCount}>({submittedData.length} Total)</Text>
      </View>
      
      <ScrollView 
        style={styles.cardsContainer}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {submittedData.map((item, index) => {
          const regnNo = item.regn_no || item.registration_number || item.id || `${activeMainTab}${String(index + 1).padStart(4, '0')}`;
          const applicantName = item.applicant_name || item.name || 'N/A';
          const status = item.status || 'pending';
          const mobile = item.applicant_mobile || item.mobile || 'N/A';
          
          return (
            <TouchableOpacity 
              key={`list-${regnNo}-${index}`} 
              style={styles.listItemCard}
              onPress={() => showItemDetails(item)}
            >
              <View style={styles.listItemHeader}>
                <Text style={styles.listRegnNo}>{regnNo}</Text>
                <Text style={[
                  styles.listStatus,
                  status.toLowerCase() === 'approved' || status.toLowerCase() === 'completed' 
                    ? styles.statusApproved
                    : status.toLowerCase() === 'rejected' 
                      ? styles.statusRejected 
                      : styles.statusPending
                ]}>
                  {status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.listApplicantName}>{applicantName}</Text>
              <Text style={styles.listMobile}>{mobile}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
// Add this function after renderSubmittedDataList
// Updated showItemDetails function in SamvadScreen.js
// Replace the existing function with this updated version

// Replace the existing showItemDetails function in your SamvadScreen with this:

const showItemDetails = (item) => {
  try {
    const regnNo = item.regn_no || item.registration_number || item.id || 'N/A';
    
    // Determine the request type based on current activeMainTab
    let requestType = activeMainTab;
    if (activeMainTab === 'APPEAL') {
      requestType = 'Appeal';
    } else if (activeMainTab === 'GRIEVANCE') {
      requestType = 'Grievance';  
    } else if (activeMainTab === 'COMPLAINTS') {
      requestType = 'Complaints';
    } else if (activeMainTab === 'APPOINTMENT') {
      requestType = 'APPOINTMENT';
    }
    
    const navigationParams = {
      regnNo,
      requestType, // For API header
      type: activeMainTab, // For determining which endpoint to use
      userEmail: userInfo.userEmail,
      leaderMobile: userInfo.leaderMobile,
    };
    
    console.log('Navigating to details with params:', navigationParams);
    
    // Check if navigation object exists and has navigate method
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('DetailedFormScreen', navigationParams);
    } else {
      console.error('Navigation object is not available');
      Alert.alert('Error', 'Navigation not available. Please try again.');
    }
    
  } catch (error) {
    console.error('Error in showItemDetails:', error);
    Alert.alert('Error', 'Failed to open details. Please try again.');
  }
};


  // Render welcome content when no main tab is selected
  const renderWelcomeContent = () => (
    <ScrollView
      contentContainerStyle={styles.contentArea}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentCard}>
        {showRegistrationSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>Welcome! Registration Successful!</Text>
            <Text style={styles.successSubText}>You can now access all Samvad services</Text>
          </View>
        )}
        
        <Text style={styles.welcomeTitle}>Welcome to Samvad</Text>
        <Text style={styles.welcomeSubtitle}>
          Connect with your representative through our digital platform
        </Text>
        <View style={styles.categoryContainer}>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>APPEAL</Text>
            <Text style={styles.categoryDescription}>Submit an appeal for review and resolution</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>APPOINTMENT</Text>
            <Text style={styles.categoryDescription}>Schedule a meeting with your representative</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>GRIEVANCE</Text>
            <Text style={styles.categoryDescription}>Register your grievance for prompt action</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>COMPLAINTS</Text>
            <Text style={styles.categoryDescription}>File a complaint and track its status</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      
      {/* Main Tabs */}
      <View style={styles.mainTabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {mainTabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleMainTabClick(tab)}
                style={[
                  styles.mainTabButton,
                  activeMainTab === tab && styles.activeMainTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.mainTabText,
                    activeMainTab === tab && styles.activeMainTabText,
                  ]}
                >
                  {tab}
                </Text>
                {activeMainTab === tab && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sub Tabs - Only show when a main tab is selected */}
      {activeMainTab && (
        <View style={styles.subTabContainer}>
          <View style={styles.tabRow}>
            {subTabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleSubTabClick(tab)}
                style={[
                  styles.subTabButton,
                  activeSubTab === tab && styles.activeSubTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeSubTab === tab && styles.activeSubTabText,
                  ]}
                >
                  {tab}
                </Text>
                {activeSubTab === tab && <View style={styles.subUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Content Area */}
     {!activeMainTab ? (
  renderWelcomeContent()
) : !isUserLoggedIn && activeSubTab === 'ADD' ? (
  renderLoginRequired()
) : activeSubTab === 'ADD' && userRole !== 'admin' ? (
  // Only show ADD form for non-admin users
  <ScrollView 
    contentContainerStyle={styles.contentArea} 
    keyboardShouldPersistTaps="handled"
    showsVerticalScrollIndicator={false}
  >
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{getFormHeader()}</Text>

            {renderInputField(
              'mobile',
              "Applicant's Mobile No.",
              'Enter 10-digit mobile number',
              'phone-pad',
              false,
              true
            )}

            {activeMainTab === 'APPOINTMENT' && renderInputField(
              'requestedDate',
              'Requested Date of Meeting',
              'DD/MM/YYYY',
              'default',
              false,
              true,
              '*Actual Date of Meeting may differ based on availability of Hon\'ble MP'
            )}

            {renderInputField(
              'purpose',
              getPurposeLabel(),
              'Please describe your purpose in detail...',
              'default',
              true,
              true
            )}

            {renderInputField(
              'name',
              "Applicant's Name",
              'Enter your full name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'fatherHusbandName',
              "Father/Husband's Name",
              'Enter father/husband full name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'address',
              'Address',
              'Enter your complete address',
              'default',
              true,
              true
            )}

            {/* Use pincode field with verification */}
            {renderPincodeField()}

            {renderInputField(
              'district',
              'District',
              'District will be auto-filled after pincode verification',
              'default',
              false,
              true
            )}

            {renderInputField(
              'state',
              'State',
              'State will be auto-filled after pincode verification',
              'default',
              false,
              true
            )}

            {renderCheckbox()}

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.submitButton, isSubmitting && styles.disabledButton]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <View style={styles.loadingButtonContent}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.buttonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={styles.buttonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
    ) : activeSubTab === 'PREVIEW' ? (
  <ScrollView 
    contentContainerStyle={styles.contentArea}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.contentCard}>
      <Text style={styles.contentText}>Preview - {getFormHeader()}</Text>
      {renderSubmittedDataList()}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.cancelButton} 
          onPress={() => setActiveSubTab(userRole === 'admin' ? 'LIST' : 'ADD')}
        >
          <Text style={styles.buttonText}>
            {userRole === 'admin' ? 'Back to List' : `New ${getRequestType()}`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={() => {
            if (activeMainTab === 'APPOINTMENT') {
              loadAppointments();
            } else {
              loadSubmittedData();
            }
          }}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
) : activeSubTab === 'LIST' ? (
  <ScrollView 
    contentContainerStyle={styles.contentArea}
    showsVerticalScrollIndicator={false}
  >
    <View style={styles.contentCard}>
      <Text style={styles.contentText}>List - {getFormHeader()}</Text>
      {renderListView()}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={() => {
            if (activeMainTab === 'APPOINTMENT') {
              loadAppointments();
            } else {
              loadSubmittedData();
            }
          }}
        >
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    </View>
  </ScrollView>
) : null}
      
    </View>
  );
};



export default SamvadScreen;