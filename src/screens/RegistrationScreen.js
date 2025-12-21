import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Add these imports for image picker functionality
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import AuthService from '../utils/AuthService';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import EncryptedStorage from 'react-native-encrypted-storage';

const RegistrationScreen = ({ navigation, route }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalData, setOriginalData] = useState({});
  const [isProfileImageChanged, setIsProfileImageChanged] = useState(false);
  const [apiEndpoints, setApiEndpoints] = useState(null);
  const [formData, setFormData] = useState({
    profile_image: null,
    mobile: '',
    name: '',
    email: '',
    address: '',
    city: '',
    pincode: '',
    district: '',
    state: '',
    facebook: '',
    instagram: '',
    twitter: '',
    password: '',
    confirmPassword: '',
    declaration: false,
  });

  // Email verification states
  const [emailVerificationState, setEmailVerificationState] = useState('input');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');

  // Pincode verification states
  const [pincodeVerificationState, setPincodeVerificationState] = useState('input');
  const [isPincodeVerified, setIsPincodeVerified] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // ✅ LOGIN NAVIGATION STATES
 

  // ✅ useEffect 1: Initialize API endpoints
  useEffect(() => {
    const initializeEndpoints = async () => {
      try {
        const endpoints = await ConfigService.getApiEndpoints();
        setApiEndpoints(endpoints);
        console.log('✅ API endpoints initialized');
      } catch (error) {
        console.error('❌ Error initializing API endpoints:', error);
        Alert.alert('Configuration Error', 'Failed to load API configuration');
      }
    };

    initializeEndpoints();
  }, []);

  // ✅ useEffect 2: Check if edit profile mode
  useEffect(() => {
    if (route?.params?.isEditMode) {
      setIsEditMode(true);
      loadUserProfile();
    }
  }, [route?.params]);

  // ✅ useEffect 3: OTP timer countdown (SINGLE INSTANCE - REMOVED DUPLICATE)
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(timer => timer - 1);
      }, 1000);
    } else if (otpTimer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  

  // Add this utility function
  const capitalizeAfterSpace = (text) => {
    return text.replace(/\b\w/g, (char) => char.toUpperCase());
  };
  const loadUserProfile = async () => {
    try {
      let profileData = route?.params?.userProfile;

      if (!profileData) {
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          const parsedData = JSON.parse(userData);
          const storedUser = await AsyncStorage.getItem(`user_${parsedData.mobile}`);
          if (storedUser) {
            profileData = JSON.parse(storedUser);
          } else {
            profileData = parsedData;
          }
        }
      }

      if (profileData) {
        const loadedData = {
          ...profileData,
          // Map old field names to new API field names if they exist
          facebook: profileData.facebook || profileData.facebookId || '',
          instagram: profileData.instagram || profileData.instagramId || '',
          twitter: profileData.twitter || profileData.xId || '',
          email: profileData.email || '',
          city: profileData.city || '',
          district: profileData.district || '',
          password: '',
          confirmPassword: '',
          declaration: true,
        };

        setFormData(loadedData);
        setOriginalData(loadedData); // Store original data for comparison

        // In edit mode, email is always verified (cannot be changed)
        if (profileData.email) {
          setIsEmailVerified(true);
          setEmailVerificationState('verified');
        }

        if (profileData.pincode && profileData.pincodeVerified) {
          setIsPincodeVerified(true);
          setPincodeVerificationState('verified');
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    }
  };

  const handleInputChange = (field, value) => {
    // Apply capitalization to text fields (but not mobile, pincode, email, or social media)
    const fieldsToCapitalize = ['name', 'address', 'city', 'district', 'state'];
    let processedValue = value;

    if (fieldsToCapitalize.includes(field)) {
      processedValue = capitalizeAfterSpace(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: processedValue
    }));

    // Reset email verification when email changes (only in registration mode)
    if (field === 'email' && value !== formData.email && !isEditMode) {
      setEmailVerificationState('input');
      setIsEmailVerified(false);
      setEmailOtp('');
      setVerificationToken('');
    }

    // Reset pincode verification when pincode changes
    if (field === 'pincode' && value !== formData.pincode) {
      setPincodeVerificationState('input');
      setIsPincodeVerified(false);

      // Clear district, city and state fields when pincode changes
      if (value.length !== 6) {
        setFormData(prev => ({
          ...prev,
          pincode: value,
          district: '',
          city: '',
          state: '',
        }));
        return; // Return early to avoid double state update
      }
    }
  };

  // UPDATED PINCODE VERIFICATION USING APISERVICE
  const handlePincodeVerification = async () => {
    if (!formData.pincode || formData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (!apiEndpoints) {
      Alert.alert('Error', 'API configuration not loaded');
      return;
    }

    setPincodeVerificationState('loading');

    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const result = await ApiService.get(`${baseUrl}/api/pincodes/${formData.pincode}`);

      if (result.success && result.data && result.data.length > 0) {
        console.log('Pincode API Response:', result.data);

        const data = result.data[0];
        const district = data?.district || '';
        const city = data?.city || data?.taluka || '';
        const state = data?.statename || '';

        if (district && state) {
          setFormData(prev => ({
            ...prev,
            district,
            city,
            state,
          }));

          setIsPincodeVerified(true);
          setPincodeVerificationState('verified');
        } else {
          setPincodeVerificationState('error');
          Alert.alert('Error', 'Enter a valid pincode.');
        }
      } else {
        setPincodeVerificationState('error');
        Alert.alert('Error', result.message || 'Enter a valid pincode.');
      }
    } catch (error) {
      console.error('❌ Pincode Fetch Error:', error);
      setPincodeVerificationState('error');
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
  };

  // UPDATED EMAIL VERIFICATION USING APISERVICE
  const handleEmailVerification = async () => {
  if (isEditMode) return; // Disabled in edit mode

  if (!formData.email || !validateEmail(formData.email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  setEmailVerificationState('loading');

  try {
    // ✅ GET LEADER MOBILE NUMBER from storage
    const getMobileNumberFromStorage = async () => {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          const memberIdentifier = appOwnerInfo.mobile_no || 
                                  appOwnerInfo.regdMobileNo || 
                                  appOwnerInfo.mobile_number || 
                                  '7702000725';
          return memberIdentifier;
        }
        
        const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                              await EncryptedStorage.getItem('OWNER_MOBILE') ||
                              '7702000725';
        return storedMemberId;
      } catch (error) {
        console.error('Error retrieving mobile number:', error);
        return '7702000725';
      }
    };

    const leaderMobileNo = await getMobileNumberFromStorage();
    console.log('📱 Leader Mobile No for registration email verification:', leaderMobileNo);

    // ✅ PREPARE REQUEST BODY
    const requestBody = {
      leader_regd_mobile_no: leaderMobileNo,
      user_email_id: formData.email.trim().toLowerCase(), // ✅ CHANGED: email -> user_email_id
    };

    console.log('📡 Registration Email Verification Request:', requestBody);

    // ✅ Use authPost instead of post
    const result = await ApiService.authPost(
      apiEndpoints.auth.verifyEmail, 
      requestBody
    );

    console.log('✅ Registration Email Verification Response:', result);

    if (result.success) {
      setEmailVerificationState('verify');
      // Removed: Alert for "You can now send OTP"
      // Instead, enable OTP input/button in UI
    } else {
      setEmailVerificationState('input');
      Alert.alert('Error', result.message || 'Failed to verify email. Please try again.');
    }
  } catch (error) {
    console.error('❌ Registration Email Verification Error:', error);
    setEmailVerificationState('input');
    Alert.alert('Error', 'Failed to verify email. Please try again.');
  }
};

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  // UPDATED SEND EMAIL OTP USING APISERVICE
 const sendEmailOTP = async () => {
  if (isEditMode) return; // Disabled in edit mode

  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  try {
    setEmailVerificationState('loading');

    // ✅ GET LEADER MOBILE NUMBER from storage
    const getMobileNumberFromStorage = async () => {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          const memberIdentifier = appOwnerInfo.mobile_no || 
                                  appOwnerInfo.regdMobileNo || 
                                  appOwnerInfo.mobile_number || 
                                  '7702000725';
          return memberIdentifier;
        }
        
        const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                              await EncryptedStorage.getItem('OWNER_MOBILE') ||
                              '7702000725';
        return storedMemberId;
      } catch (error) {
        console.error('Error retrieving mobile number:', error);
        return '7702000725';
      }
    };

    const leaderMobileNo = await getMobileNumberFromStorage();
    console.log('📱 Leader Mobile No for registration OTP:', leaderMobileNo);

    // ✅ PREPARE REQUEST BODY
    const requestBody = {
      leader_regd_mobile_no: leaderMobileNo,
      user_email_id: formData.email.trim().toLowerCase(), // ✅ CHANGED: email -> user_email_id
    };

    console.log('📡 Registration Send OTP Request:', requestBody);

    // ✅ Use authPost instead of post
    const result = await ApiService.authPost(
      apiEndpoints.auth.sendOTP, 
      requestBody
    );

    console.log('✅ OTP Send API response:', result);

    if (result.success && (result.data?.message === 'OTP sent to email successfully' || result.message === 'OTP sent to email successfully')) {
      setVerificationToken('dummy-token');
      setEmailVerificationState('otp');
      setOtpTimer(300);
      Alert.alert('OTP Sent', `Verification code has been sent to ${formData.email}.`);
    } else {
      throw new Error(result.message || 'Unexpected response');
    }
  } catch (error) {
    console.error('❌ OTP send error:', error);
    setEmailVerificationState('verify');
    Alert.alert('Error', 'Failed to send OTP. Please try again.');
  }
};

  // UPDATED VERIFY EMAIL OTP USING APISERVICE
  const verifyEmailOTP = async () => {
  if (isEditMode) return; // Disabled in edit mode

  if (!emailOtp || emailOtp.length !== 6) {
    Alert.alert('Error', 'Please enter the 6-digit OTP');
    return;
  }

  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  try {
    setEmailVerificationState('loading');

    // ✅ GET LEADER MOBILE NUMBER from storage
    const getMobileNumberFromStorage = async () => {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          const memberIdentifier = appOwnerInfo.mobile_no || 
                                  appOwnerInfo.regdMobileNo || 
                                  appOwnerInfo.mobile_number || 
                                  '7702000725';
          return memberIdentifier;
        }
        
        const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                              await EncryptedStorage.getItem('OWNER_MOBILE') ||
                              '7702000725';
        return storedMemberId;
      } catch (error) {
        console.error('Error retrieving mobile number:', error);
        return '7702000725';
      }
    };

    const leaderMobileNo = await getMobileNumberFromStorage();
    console.log('📱 Leader Mobile No for registration OTP verification:', leaderMobileNo);

    // ✅ PREPARE REQUEST BODY (removed verificationToken)
    const requestBody = {
      leader_regd_mobile_no: leaderMobileNo,
      user_email_id: formData.email.trim().toLowerCase(), // ✅ CHANGED: email -> user_email_id
      otp: emailOtp,
    };

    console.log('📡 Registration Verify OTP Request:', requestBody);

    // ✅ Use authPost instead of post
    const result = await ApiService.authPost(
      apiEndpoints.auth.verifyEmailOTP, 
      requestBody
    );

    console.log('✅ Verification response:', result);

    if (result.success && (result.data?.message === 'Email verified and greeted!' || result.message === 'Email verified and greeted!')) {
      setIsEmailVerified(true);
      setEmailVerificationState('verified');
      Alert.alert('Success', 'Email verified successfully!');
      setEmailOtp('');
      setVerificationToken('');
    } else {
      setEmailVerificationState('otp');
      Alert.alert('Error', result.message || 'OTP verification failed. Please try again.');
    }
  } catch (error) {
    console.error('❌ Verification error:', error);
    setEmailVerificationState('otp');
    Alert.alert('Error', 'Failed to verify OTP. Please try again.');
  }
};

  const resendEmailOTP = () => {
    if (isEditMode) return; // Disabled in edit mode

    Alert.alert(
      'Resend OTP',
      'Do you want to resend the verification code?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resend', onPress: sendEmailOTP }
      ]
    );
  };

  // REQUEST CAMERA PERMISSIONS
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to camera to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // FIXED IMAGE PICKER FUNCTION
  const handleImagePicker = async () => {
    Alert.alert(
      isEditMode ? "Update Photo" : "Select Photo",
      "Choose an option",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Camera",
          onPress: () => handleImageSelection("camera")
        },
        {
          text: "Gallery",
          onPress: () => handleImageSelection("gallery")
        }
      ]
    );
  };

  // FIXED IMAGE SELECTION WITH PROPER URI HANDLING
  const handleImageSelection = async (source) => {
    try {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 800,
        maxWidth: 800,
        quality: 0.8,
      };

      let result;

      if (source === 'camera') {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos');
          return;
        }
        result = await new Promise((resolve, reject) => {
          launchCamera(options, (response) => {
            if (response.didCancel || response.errorMessage) {
              reject(new Error(response.errorMessage || 'Camera cancelled'));
            } else {
              resolve(response);
            }
          });
        });
      } else {
        result = await new Promise((resolve, reject) => {
          launchImageLibrary(options, (response) => {
            if (response.didCancel || response.errorMessage) {
              reject(new Error(response.errorMessage || 'Gallery cancelled'));
            } else {
              resolve(response);
            }
          });
        });
      }

      if (result && result.assets && result.assets.length > 0) {
        const imageAsset = result.assets[0];

        console.log('📸 Selected image:', imageAsset);

        // Store the complete image asset for later use
        setFormData((prev) => ({
          ...prev,
          profile_image: imageAsset,  // Store the full asset object
        }));

        // Mark that profile image has been changed in edit mode
        if (isEditMode) {
          setIsProfileImageChanged(true);
        }
      }

    } catch (error) {
      console.error('Error in image selection:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!formData.mobile.trim() || formData.mobile.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!formData.email.trim() || !validateEmail(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!isEmailVerified) {
      Alert.alert('Error', 'Please verify your email address');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return false;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter your city');
      return false;
    }
    if (!formData.pincode.trim() || formData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return false;
    }

    // UPDATED: Enforce pincode verification in both registration AND edit mode
    if (!isPincodeVerified) {
      Alert.alert('Error', 'Please verify your pincode to auto-fill district and state information');
      return false;
    }

    if (!formData.district.trim()) {
      Alert.alert('Error', 'Please enter your district');
      return false;
    }
    if (!formData.state.trim()) {
      Alert.alert('Error', 'Please enter your state');
      return false;
    }

    if (!isEditMode) {
      if (!formData.password.trim() || formData.password.length < 6) {
        Alert.alert('Error', 'Password must be at least 6 characters long');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return false;
      }
    }

    if (!formData.declaration) {
      Alert.alert('Error', 'Please accept the declaration');
      return false;
    }
    return true;
  };

  // UPDATED EDIT PROFILE HANDLER USING AUTHSERVICE
  // UPDATED EDIT PROFILE HANDLER USING APISERVICE WITH PROPER HEADERS
 // ✅ REPLACE your handleEditProfile function in RegistrationScreen.js

const handleEditProfile = async () => {
  try {
    console.log('📝 Starting profile edit...');
    
    const userData = await AsyncStorage.getItem('userData');
    if (!userData) {
      Alert.alert('Error', 'User session not found. Please login again.');
      return;
    }

    const parsedUserData = JSON.parse(userData);
    console.log('👤 User data:', parsedUserData);
    
    // ✅ Get user email for authentication
    const userEmail = parsedUserData.email || parsedUserData.user_email_id;

    if (!userEmail) {
      console.error('❌ Missing user email:', { userEmail });
      Alert.alert('Error', 'User session incomplete. Please login again.');
      return;
    }

    console.log('📧 User email:', userEmail);

    // ✅ CRITICAL FIX: Get OWNER mobile number (not user's mobile)
    let ownerMobile = '';
    try {
      // First try EncryptedStorage
      ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
      
      // Fallback: Try AppOwnerInfo
      if (!ownerMobile) {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          ownerMobile = appOwnerInfo.mobile_no || 
                       appOwnerInfo.regdMobileNo || 
                       appOwnerInfo.mobile_number || 
                       appOwnerInfo.client_mobile ||
                       '';
        }
      }
    } catch (error) {
      console.error('Error getting owner mobile:', error);
    }

    if (!ownerMobile) {
      console.error('❌ Owner mobile not found in storage');
      Alert.alert(
        'Configuration Error', 
        'Owner mobile number not found. Please restart the app or contact support.'
      );
      return;
    }

    console.log('📱 Owner mobile (for leader_regd_mobile_no):', ownerMobile);
    console.log('📱 User mobile (for profile update):', formData.mobile);

    const baseUrl = await ConfigService.getBaseUrl();
    console.log('🌐 Base URL:', baseUrl);

    if (isProfileImageChanged && formData.profile_image) {
      // ✅ POST with FormData (when image is updated)
      console.log('🖼️ Updating profile with image...');

      const formDataToSend = new FormData();
      formDataToSend.append('leader_regd_mobile_no', ownerMobile); // ✅ OWNER mobile
      formDataToSend.append('user_email_id', userEmail);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('mobile', formData.mobile); // ✅ USER mobile for profile
      formDataToSend.append('address', formData.address);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('pincode', formData.pincode);
      formDataToSend.append('district', formData.district);
      formDataToSend.append('facebook', formData.facebook || '');
      formDataToSend.append('instagram', formData.instagram || '');
      formDataToSend.append('twitter', formData.twitter || '');

      if (formData.profile_image && typeof formData.profile_image === 'object') {
        formDataToSend.append('profile_image', {
          uri: formData.profile_image.uri,
          type: formData.profile_image.type || 'image/jpeg',
          name: formData.profile_image.fileName || `profile-${Date.now()}.jpg`,
        });
      }

      console.log('📤 Sending POST request with FormData...');
      console.log('📱 Using owner mobile for leader_regd_mobile_no:', ownerMobile);
      console.log('📱 Using user mobile for profile mobile field:', formData.mobile);
      
      // ✅ Use authPost for FormData
      const result = await ApiService.authPost(
        `${baseUrl}/api/profile/`,
        formDataToSend,
        {}, 
        true // isFormData = true
      );

      console.log('📥 POST Response:', result);

      if (result.success) {
        // Update local storage with new user data if returned
        if (result.data && result.data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
          
          // ✅ Update global variables
          global.currentUser = result.data.user;
          global.currentUserName = result.data.user.name;
          global.currentUserMobile = result.data.user.mobile;
          
          // Trigger drawer refresh if available
          if (global.refreshDrawer) {
            global.refreshDrawer();
          }
        }
        
        Alert.alert('Success!', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(result.message || 'Failed to update profile');
      }
    } else {
      // ✅ PUT with JSON (when no image is updated)
      console.log('📝 Updating profile without image...');

      const updateData = {
        leader_regd_mobile_no: ownerMobile, // ✅ OWNER mobile
        user_email_id: userEmail,
        name: formData.name,
        mobile: formData.mobile, // ✅ USER mobile for profile
        address: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.pincode,
        district: formData.district,
        facebook: formData.facebook || '',
        instagram: formData.instagram || '',
        twitter: formData.twitter || '',
      };

      console.log('📤 Sending PUT request with JSON:', updateData);
      console.log('📱 Using owner mobile for leader_regd_mobile_no:', ownerMobile);
      console.log('📱 Using user mobile for profile mobile field:', formData.mobile);

      // ✅ Use authPut for JSON data
      const result = await ApiService.authPut(
        `${baseUrl}/api/profile/`,
        updateData
      );

      console.log('📥 PUT Response:', result);

      if (result.success) {
        // Update local storage with new user data if returned
        if (result.data && result.data.user) {
          await AsyncStorage.setItem('userData', JSON.stringify(result.data.user));
          
          // ✅ Update global variables
          global.currentUser = result.data.user;
          global.currentUserName = result.data.user.name;
          global.currentUserMobile = result.data.user.mobile;
          
          // Trigger drawer refresh if available
          if (global.refreshDrawer) {
            global.refreshDrawer();
          }
        }

        Alert.alert('Success!', 'Profile updated successfully!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        throw new Error(result.message || 'Failed to update profile');
      }
    }
  } catch (error) {
    console.error('❌ Edit Profile Error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    // ✅ IMPROVED ERROR HANDLING
    if (error.message && (
      error.message.includes('Session expired') || 
      error.message.includes('Authentication failed') ||
      error.message.includes('401') ||
      error.message.includes('Token')
    )) {
      // Handle session expiration
      Alert.alert(
        'Session Expired', 
        'Your session has expired. Please login again.', 
        [
          {
            text: 'OK',
            onPress: async () => {
              // Clear all stored data
              try {
                await AsyncStorage.multiRemove([
                  'jwt_token',
                  'refresh_token',
                  'userData',
                  'isLoggedin'
                ]);
                global.isUserLoggedin = false;
              } catch (clearError) {
                console.error('Error clearing storage:', clearError);
              }
              
              // Navigate to login
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ],
        { cancelable: false }
      );
    } else if (error.message && error.message.includes('Leader mobile number mismatch')) {
      // ✅ HANDLE SPECIFIC MOBILE MISMATCH ERROR
      Alert.alert(
        'Configuration Error',
        'There was an issue with the app configuration. Please try restarting the app.\n\nIf the issue persists, please contact support.',
        [
          {
            text: 'Restart App',
            onPress: async () => {
              try {
                // Force app to re-bootstrap
                await EncryptedStorage.removeItem('APP_KEY');
                await EncryptedStorage.removeItem('OWNER_MOBILE');
                
                // Restart the app (navigate to splash or reload)
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Splash' }],
                });
              } catch (err) {
                console.error('Error restarting app:', err);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } else if (error.message && (
      error.message.includes('Network request failed') || 
      error.name === 'TypeError' ||
      error.message.includes('fetch')
    )) {
      Alert.alert(
        'Network Error', 
        'Unable to connect to server. Please check your internet connection and try again.'
      );
    } else {
      Alert.alert(
        'Error', 
        error.message || 'Failed to update profile. Please try again.'
      );
    }
  }
};

  // UPDATED REGISTRATION HANDLER USING APISERVICE
// UPDATED REGISTRATION HANDLER USING APISERVICE
// ✅ UPDATED REGISTRATION HANDLER - Replace your handleRegistration function

const handleRegistration = async () => {
  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  try {
    // ✅ GET LEADER MOBILE NUMBER from storage
    const getMobileNumberFromStorage = async () => {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          const memberIdentifier = appOwnerInfo.mobile_no || 
                                  appOwnerInfo.regdMobileNo || 
                                  appOwnerInfo.mobile_number || 
                                  '7702000725';
          return memberIdentifier;
        }
        
        const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                              await EncryptedStorage.getItem('OWNER_MOBILE') ||
                              '7702000725';
        return storedMemberId;
      } catch (error) {
        console.error('Error retrieving mobile number:', error);
        return '7702000725';
      }
    };

    const leaderMobileNo = await getMobileNumberFromStorage();
    console.log('📱 Leader Mobile No for registration:', leaderMobileNo);

    const formDataToSend = new FormData();

    // ✅ ADD THESE TWO REQUIRED FIELDS FIRST
    formDataToSend.append('leader_regd_mobile_no', leaderMobileNo);
    formDataToSend.append('user_email_id', formData.email.trim().toLowerCase()); // ✅ CHANGED: email -> user_email_id

    // ✅ REST OF THE FIELDS
    formDataToSend.append('name', formData.name);
    formDataToSend.append('mobile', formData.mobile);
    formDataToSend.append('password', formData.password);
    formDataToSend.append('address', formData.address);
    formDataToSend.append('city', formData.city);
    formDataToSend.append('district', formData.district);
    formDataToSend.append('state', formData.state);
    formDataToSend.append('pincode', formData.pincode);
    formDataToSend.append('facebook', formData.facebook || '');
    formDataToSend.append('instagram', formData.instagram || '');
    formDataToSend.append('twitter', formData.twitter || '');

    // ✅ PROFILE IMAGE
    if (formData.profile_image) {
      formDataToSend.append('profile_image', {
        uri: formData.profile_image.uri,
        type: formData.profile_image.type || 'image/jpeg',
        name: formData.profile_image.fileName || `profile-${Date.now()}.jpg`,
      });
    }

    console.log('📡 Registration Request - Form Data Fields:');
    console.log('  - leader_regd_mobile_no:', leaderMobileNo);
    console.log('  - user_email_id:', formData.email.trim().toLowerCase());
    console.log('  - name:', formData.name);
    console.log('  - mobile:', formData.mobile);
    console.log('  - Has profile_image:', !!formData.profile_image);

    // ✅ USE authPost (not post) for authenticated request
    const result = await ApiService.authPost(
      apiEndpoints.auth.register, 
      formDataToSend, 
      {}, 
      true // isFormData = true
    );

    console.log('✅ Registration Response:', result);

    if (result.success) {
      Alert.alert(
        'Success!',
        'Your account has been created successfully!',
        [
          {
            text: 'Continue to Login',
            onPress: () => navigation.navigate('Login', {
              message: 'Registration completed successfully! Please login to continue.',
              registrationSuccess: true
            })
          }
        ]
      );
    } else {
      throw new Error(result.message || 'Registration failed');
    }
  } catch (error) {
    console.error('❌ Registration Error:', error);
    console.error('Error message:', error.message);
    
    // ✅ GET THE ERROR MESSAGE
    const errorMessage = error.message || 'Something went wrong during registration';
    
    // ✅ CHECK FOR EXACT MESSAGE OR SIMILAR VARIATIONS
    const isEmailAlreadyRegistered = 
      errorMessage.includes('Email Id already registered') ||
      errorMessage.includes('email already registered') ||
      errorMessage.includes('Email already exists') ||
      errorMessage.includes('already registered');
    
    if (isEmailAlreadyRegistered) {
      console.log('✅ Email already registered detected!');
      
      Alert.alert(
        'Already Registered',
        'This email is already registered. Please proceed to Login.',
        [
          {
            text: 'Go to Login',
            onPress: () => {
              console.log('🚀 Navigating to Login with email:', formData.email);
              
              navigation.navigate('Login', {
                email: formData.email,
                message: 'This email is already registered. Please login with your credentials.'
              });
            }
          }
        ],
        { cancelable: false }
      );
    } else {
      // ✅ SHOW GENERIC ERROR FOR OTHER CASES
      Alert.alert('Error', errorMessage);
    }
  }
};

  const handleSubmit = async () => {
    if (validateForm()) {
      try {
        if (isEditMode) {
          await handleEditProfile();
        } else {
          await handleRegistration();
        }
      } catch (error) {
        console.error('Error:', error);
        Alert.alert('Error', error.message || 'Something went wrong');
      }
    }
  };

  const handleCancel = () => {
    const action = isEditMode ? 'Cancel Profile Update' : 'Cancel Registration';
    const message = isEditMode
      ? 'Are you sure you want to cancel? Changes will not be saved.'
      : 'Are you sure you want to cancel? All entered data will be lost.';

    Alert.alert(
      action,
      message,
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  const handleBackPress = () => {
    handleCancel();
  };

  const renderProfileImage = () => {
    if (formData.profile_image) {
      let imageSource;

      // Check if it's a new image (object with uri) or existing image (string filename)
      if (typeof formData.profile_image === 'object' && formData.profile_image.uri) {
        imageSource = { uri: formData.profile_image.uri };
      } else if (typeof formData.profile_image === 'string' && formData.profile_image !== 'placeholder') {
        // Use ConfigService to get the base URL dynamically
        const getImageUrl = async () => {
          const baseUrl = await ConfigService.getBaseUrl();
          return `${baseUrl}/uploads/profile_images/${formData.profile_image}`;
        };

        // For existing images, we'll use the async pattern or fallback
        imageSource = { uri: `${apiEndpoints?.user?.profile || ''}/uploads/profile_images/${formData.profile_image}` };
      }

      if (imageSource) {
        return (
          <View style={styles.photoSelectedContainer}>
            <Image
              source={imageSource}
              style={styles.photo}
              onError={(error) => {
                console.log('❌ Image load error:', error.nativeEvent);
              }}
              onLoad={() => {
                console.log('✅ Image loaded successfully');
              }}
            />
            <View style={styles.photoOverlay}>
              <Icon name="check-circle" size={16} color="#4CAF50" />
              <Text style={[styles.photoText, { color: '#fff', fontSize: 10 }]}>
                {isEditMode ? (isProfileImageChanged ? 'Updated' : 'Current') : 'Uploaded'}
              </Text>
            </View>
          </View>
        );
      }
    }

    return (
      <View style={styles.photoPlaceholder}>
        <Icon name="camera-alt" size={40} color="#e16e2b" />
        <Text style={styles.photoText}>Upload / Camera</Text>
      </View>
    );
  };

  const renderEmailVerificationSection = () => {
    return (
      <View style={styles.emailVerificationContainer}>
        <View style={styles.emailInputContainer}>
          <TextInput
            style={[
              styles.emailInput,
              isEmailVerified && styles.verifiedInput,
              isEditMode && styles.disabledInput
            ]}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            placeholder=""
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEditMode}
          />

          {/* Always show verified icon in edit mode */}
          {isEditMode ? (
            <View style={styles.verifiedIconButton}>
              <Icon name="verified" size={24} color="#4CAF50" />
            </View>
          ) : (
            <>
              {emailVerificationState === 'input' && (
                <TouchableOpacity
                  style={styles.verifyIconButton}
                  onPress={handleEmailVerification}
                >
                  <Icon name="mail-outline" size={24} color="#e16e2b" />
                </TouchableOpacity>
              )}

              {emailVerificationState === 'loading' && (
                <View style={styles.loadingIconButton}>
                  <ActivityIndicator size="small" color="#e16e2b" />
                </View>
              )}

              {emailVerificationState === 'verify' && (
                <TouchableOpacity
                  style={styles.sendOtpIconButton}
                  onPress={sendEmailOTP}
                >
                  <Icon name="send" size={24} color="#2196F3" />
                </TouchableOpacity>
              )}

              {isEmailVerified && (
                <View style={styles.verifiedIconButton}>
                  <Icon name="verified" size={24} color="#4CAF50" />
                </View>
              )}
            </>
          )}
        </View>



        {/* OTP section only shown in registration mode */}
        {!isEditMode && emailVerificationState === 'otp' && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter verification code sent to your email</Text>
            <View style={styles.otpInputContainer}>
              <TextInput
                style={styles.otpInput}
                value={emailOtp}
                onChangeText={setEmailOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity
                style={styles.verifyOtpButton}
                onPress={verifyEmailOTP}
                disabled={emailVerificationState === 'loading'}
              >
                {emailVerificationState === 'loading' ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Icon name="check-circle" size={24} color="#fff" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.otpFooter}>
              {otpTimer > 0 ? (
                <Text style={styles.timerText}>
                  Resend OTP in {Math.floor(otpTimer / 60)}:{(otpTimer % 60).toString().padStart(2, '0')}
                </Text>
              ) : (
                <TouchableOpacity onPress={resendEmailOTP} style={styles.resendButton}>
                  <Icon name="refresh" size={16} color="#2196F3" />
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  // SIMPLIFIED PINCODE VERIFICATION UI SECTION
  const renderPincodeVerificationSection = () => {
    return (
      <View style={styles.pincodeVerificationContainer}>
        <View style={styles.pincodeInputContainer}>
          <TextInput
            style={[
              styles.pincodeInput,
              isPincodeVerified && styles.verifiedInput,
              pincodeVerificationState === 'error' && styles.errorInput
            ]}
            value={formData.pincode}
            onChangeText={(text) => handleInputChange('pincode', text)}
            placeholder=""
            keyboardType="numeric"
            maxLength={6}
            editable={!isPincodeVerified}
          />

          {pincodeVerificationState === 'input' && formData.pincode.length === 6 && (
            <TouchableOpacity
              style={styles.verifyIconButton}
              onPress={handlePincodeVerification}
            >
              <Icon name="verified-user" size={24} color="#e16e2b" />
            </TouchableOpacity>
          )}

          {pincodeVerificationState === 'loading' && (
            <View style={styles.loadingIconButton}>
              <ActivityIndicator size="small" color="#e16e2b" />
            </View>
          )}

          {pincodeVerificationState === 'verified' && (
            <View style={styles.verifiedIconButton}>
              <Icon name="verified" size={24} color="#4CAF50" />
            </View>
          )}

          {pincodeVerificationState === 'error' && (
            <TouchableOpacity
              style={styles.errorIconButton}
              onPress={handlePincodeVerification}
            >
              <Icon name="error" size={24} color="#f44336" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isEditMode ? 'Edit Profile' : 'User Registration'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode ? 'Update Your Information' : 'Create Your Profile'}
            </Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* Photo Upload Section */}
          <View style={styles.photoSection}>
            <Text style={styles.label}>PHOTO *</Text>
            <TouchableOpacity style={styles.photoContainer} onPress={handleImagePicker}>
              {renderProfileImage()}
            </TouchableOpacity>
            {isEditMode && isProfileImageChanged && (
              <Text style={styles.successText}>
                ✓ Profile image updated - will be saved when you submit
              </Text>
            )}
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MOBILE NO. *</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.disabledInput]}
              value={formData.mobile}
              onChangeText={(text) => handleInputChange('mobile', text)}
              placeholder=""
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isEditMode}
            />
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={[styles.input, isEditMode && styles.disabledInput]}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder=""
              editable={!isEditMode}
            />
          </View>


          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS *</Text>
            {renderEmailVerificationSection()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADDRESS *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder=""
              multiline
              numberOfLines={3}
            />
          </View>

          {/* MOVED: CITY field now appears right after ADDRESS */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CITY *</Text>
            <TextInput
              style={[
                styles.input,
                isPincodeVerified && styles.autoFilledInput
              ]}
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
              placeholder=""
              editable={true}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PINCODE *</Text>
            {renderPincodeVerificationSection()}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DISTRICT *</Text>
            <TextInput
              style={[
                styles.input,
                isPincodeVerified && styles.autoFilledInput
              ]}
              value={formData.district}
              onChangeText={(text) => handleInputChange('district', text)}
              placeholder=""
              editable={true}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>STATE *</Text>
            <TextInput
              style={[
                styles.input,
                isPincodeVerified && styles.autoFilledInput
              ]}
              value={formData.state}
              onChangeText={(text) => handleInputChange('state', text)}
              placeholder=""
              editable={true}
            />
          </View>

          {/* Updated Social Media Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>FACEBOOK</Text>
            <TextInput
              style={styles.input}
              value={formData.facebook}
              onChangeText={(text) => handleInputChange('facebook', text)}
              placeholder=""
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>INSTAGRAM</Text>
            <TextInput
              style={styles.input}
              value={formData.instagram}
              onChangeText={(text) => handleInputChange('instagram', text)}
              placeholder=""
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TWITTER</Text>
            <TextInput
              style={styles.input}
              value={formData.twitter}
              onChangeText={(text) => handleInputChange('twitter', text)}
              placeholder=""
            />
          </View>

          {/* Password fields only for registration mode */}
          {!isEditMode && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.password}
                    onChangeText={(text) => handleInputChange('password', text)}
                    placeholder=""
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Icon
                      name={showPassword ? 'visibility' : 'visibility-off'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>CONFIRM PASSWORD *</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    value={formData.confirmPassword}
                    onChangeText={(text) => handleInputChange('confirmPassword', text)}
                    placeholder=""
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <Icon
                      name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                      size={24}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {/* Declaration */}
          <View style={styles.declarationContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleInputChange('declaration', !formData.declaration)}
            >
              <View style={[styles.checkbox, formData.declaration && styles.checkboxChecked]}>
                {formData.declaration && <Icon name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.declarationText}>
                <Text style={styles.declarationTitle}>DECLARATION: </Text>
                I hereby declare that the information provided above are true to the best of my knowledge and I'm aware that if any part of information submitted is found to be false, my profile will be blocked.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>
                {isEditMode ? 'Save Changes' : 'Submit'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
    padding: 5,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginRight: 44,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  formContainer: {
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#fff',
  },
  photo: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  photoSelectedContainer: {
    width: 116,
    height: 116,
    borderRadius: 58,
    overflow: 'hidden',
    position: 'relative',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    marginTop: 5,
    fontSize: 12,
    color: '#e16e2b',
    fontWeight: '600',
  },
  photoIdText: {
    marginTop: 2,
    fontSize: 10,
    color: '#999',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
  },
  autoFilledInput: {
    backgroundColor: '#f8f9fa',
    color: '#666',
    borderColor: '#e9ecef',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 5,
    fontStyle: 'italic',
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    fontStyle: 'italic',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  // Email verification styles
  emailVerificationContainer: {
    marginTop: 5,
  },
  emailInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emailInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  verifiedInput: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  errorInput: {
    borderColor: '#f44336',
    backgroundColor: '#fff5f5',
  },
  verifyIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e16e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledIconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpContainer: {
    marginTop: 15,
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  otpInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    color: '#333',
    marginRight: 15,
    textAlign: 'center',
    letterSpacing: 4,
    fontWeight: '600',
  },
  verifyOtpButton: {
    backgroundColor: '#4CAF50',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpFooter: {
    marginTop: 15,
    alignItems: 'center',
  },
  timerText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
  },
  resendText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    marginLeft: 5,
  },
  // Pincode verification styles
  pincodeVerificationContainer: {
    marginTop: 5,
  },
  pincodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pincodeInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginRight: 10,
    textAlign: 'center',
    letterSpacing: 2,
    fontWeight: '600',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 15,
  },
  declarationContainer: {
    marginVertical: 25,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderRadius: 6,
    marginRight: 15,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e16e2b',
  },
  declarationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  declarationTitle: {
    fontWeight: 'bold',
    color: '#e16e2b',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderRadius: 12,
    padding: 18,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e16e2b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#e16e2b',
    borderRadius: 12,
    padding: 18,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegistrationScreen;