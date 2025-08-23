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

const RegistrationScreen = ({ navigation, route }) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [originalData, setOriginalData] = useState({}); // Store original data for comparison
  const [isProfileImageChanged, setIsProfileImageChanged] = useState(false); // Track if profile image changed
  const [apiEndpoints, setApiEndpoints] = useState(null);
  const [formData, setFormData] = useState({
    profile_image: null,
    mobile: '',
    name: '',
    email: '',
    address: '',
    pincode: '',
    district: '', // Changed from 'city' to 'district'
    city: '', // ✅ Added city field
    state: '',
    facebookId: '',
    instagramId: '',
    xId: '',
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

  // Initialize API endpoints
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

  // Check if this is edit profile mode
  useEffect(() => {
    if (route?.params?.isEditMode) {
      setIsEditMode(true);
      loadUserProfile();
    }
  }, [route?.params]);

  // OTP timer countdown
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
          facebookId: profileData.facebookId || '',
          instagramId: profileData.instagramId || '',
          xId: profileData.xId || '',
          email: profileData.email || '',
          district: profileData.district || '',
          city: profileData.city || '', // ✅ Load city field
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
    setFormData(prev => ({
      ...prev,
      [field]: value
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
          city: '', // ✅ Clear city field
          state: '',
        }));
        return; // Return early to avoid double state update
      }
    }
  };

  // ✅ UPDATED PINCODE VERIFICATION USING APISERVICE
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
        const city = data?.city || data?.taluka || ''; // ✅ Get city from API response
        const state = data?.statename || '';

        if (district && state) {
          setFormData(prev => ({
            ...prev,
            district,
            city, // ✅ Set city field
            state,
          }));

          setIsPincodeVerified(true);
          setPincodeVerificationState('verified');
          // ✅ Do not show success alert
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

  // ✅ UPDATED EMAIL VERIFICATION USING APISERVICE
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
      const result = await ApiService.post(apiEndpoints.auth.verifyEmail, {
        email: formData.email,
      });

      if (result.success) {
        setEmailVerificationState('verify');
        Alert.alert('Email Verified', 'You can now send OTP');
      } else {
        setEmailVerificationState('input');
        Alert.alert('Error', result.message || 'Failed to verify email. Please try again.');
      }
    } catch (error) {
      setEmailVerificationState('input');
      Alert.alert('Error', 'Failed to verify email. Please try again.');
    }
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  // ✅ UPDATED SEND EMAIL OTP USING APISERVICE
  const sendEmailOTP = async () => {
    if (isEditMode) return; // Disabled in edit mode

    if (!apiEndpoints) {
      Alert.alert('Error', 'API configuration not loaded');
      return;
    }

    try {
      setEmailVerificationState('loading');

      const result = await ApiService.post(apiEndpoints.auth.sendOTP, {
        email: formData.email,
      });

      console.log('OTP Send API response:', result);
      
      if (result.success && (result.data?.message === 'OTP sent to email successfully' || result.message === 'OTP sent to email successfully')) {
        setVerificationToken('dummy-token');
        setEmailVerificationState('otp');
        setOtpTimer(300);
        Alert.alert('OTP Sent', `Verification code has been sent to ${formData.email}.`);
      } else {
        throw new Error(result.message || 'Unexpected response');
      }
    } catch (error) {
      console.log('OTP send error:', error);
      setEmailVerificationState('verify');
      Alert.alert('Error', 'Failed to send OTP. Please try again.');
    }
  };

  // ✅ UPDATED VERIFY EMAIL OTP USING APISERVICE
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

      const result = await ApiService.post(apiEndpoints.auth.verifyEmailOTP, {
        email: formData.email,
        otp: emailOtp,
        verificationToken: verificationToken,
      });

      console.log('Verification response:', result);

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
      console.log('Verification error:', error);
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

  // ✅ REQUEST CAMERA PERMISSIONS
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

  // ✅ FIXED IMAGE PICKER FUNCTION
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

  // ✅ FIXED IMAGE SELECTION WITH PROPER URI HANDLING
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

        // ✅ Store the complete image asset for later use
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
    if (!formData.pincode.trim() || formData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return false;
    }
    if (!formData.district.trim()) {
      Alert.alert('Error', 'Please enter your district');
      return false;
    }
    if (!formData.city.trim()) { // ✅ Add city validation
      Alert.alert('Error', 'Please enter your city');
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

  // ✅ UPDATED EDIT PROFILE HANDLER USING AUTHSERVICE (UNCHANGED - ALREADY OPTIMIZED)
  const handleEditProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        Alert.alert('Error', 'User session not found. Please login again.');
        return;
      }

      const parsedUserData = JSON.parse(userData);
      const userId = parsedUserData.id || parsedUserData.userId;

      if (isProfileImageChanged && formData.profile_image) {
        // POST with FormData (when image is updated)
        console.log('🔄 Updating profile with image...');
        
        const formDataToSend = new FormData();
        formDataToSend.append('userId', userId);
        formDataToSend.append('name', formData.name);
        formDataToSend.append('mobile', formData.mobile);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('address', formData.address);
        formDataToSend.append('district', formData.district);
        formDataToSend.append('city', formData.city);
        formDataToSend.append('state', formData.state);
        formDataToSend.append('pincode', formData.pincode);
        formDataToSend.append('facebookId', formData.facebookId || '');
        formDataToSend.append('instagramId', formData.instagramId || '');
        formDataToSend.append('xId', formData.xId || '');

        if (formData.profile_image && typeof formData.profile_image === 'object') {
          formDataToSend.append('profile_image', {
            uri: formData.profile_image.uri,
            type: formData.profile_image.type || 'image/jpeg',
            name: formData.profile_image.fileName || `profile-${Date.now()}.jpg`,
          });
        }

        // Use AuthService for the request
        const result = await AuthService.updateProfile(formDataToSend, true);
        
        if (result.success) {
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
        // PUT with JSON (when no image is updated)
        console.log('🔄 Updating profile without image...');
        
        const updateData = {
          userId,
          name: formData.name,
          mobile: formData.mobile,
          email: formData.email,
          address: formData.address,
          district: formData.district,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          facebookId: formData.facebookId || '',
          instagramId: formData.instagramId || '',
          xId: formData.xId || '',
        };

        // Use AuthService for the request
        const result = await AuthService.updateProfile(updateData, false);
        
        if (result.success) {
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
      
      if (error.message.includes('Session expired') || error.message.includes('Authentication failed')) {
        // Handle session expiration
        Alert.alert('Session Expired', 'Your session has expired. Please login again.', [
          {
            text: 'OK',
            onPress: () => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            }
          }
        ]);
      } else if (error.message.includes('Network request failed') || error.name === 'TypeError') {
        Alert.alert('Network Error', 'Unable to connect to server. Please check your internet connection and try again.');
      } else {
        Alert.alert('Error', error.message || 'Failed to update profile. Please try again.');
      }
    }
  };

  // ✅ UPDATED REGISTRATION HANDLER USING APISERVICE
  const handleRegistration = async () => {
    if (!apiEndpoints) {
      Alert.alert('Error', 'API configuration not loaded');
      return;
    }

    try {
      const formDataToSend = new FormData();

      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('mobile', formData.mobile);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('district', formData.district);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('state', formData.state);
      formDataToSend.append('pincode', formData.pincode);

      if (formData.profile_image) {
        formDataToSend.append('profile_image', {
          uri: formData.profile_image.uri,
          type: formData.profile_image.type || 'image/jpeg',
          name: formData.profile_image.fileName || `profile-${Date.now()}.jpg`,
        });
      }

      const result = await ApiService.post(apiEndpoints.auth.register, formDataToSend, {}, true);

      console.log('Registration Response:', result);

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
      console.error('Registration Error:', error);
      Alert.alert('Error', error.message || 'Something went wrong during registration');
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
              isEditMode && styles.disabledInput // Disabled style in edit mode
            ]}
            value={formData.email}
            onChangeText={(text) => handleInputChange('email', text)}
            placeholder="Enter your email address"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEditMode} // Disabled in edit mode
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

        {/* Show helper text in edit mode */}
        {isEditMode && (
          <Text style={styles.helperText}>
            Email address cannot be changed in edit mode
          </Text>
        )}

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

  // ✅ SIMPLIFIED PINCODE VERIFICATION UI SECTION
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
            placeholder="Enter 6-digit pincode"
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

        {pincodeVerificationState === 'error' && (
          <Text style={styles.errorText}>
            Pincode verification failed. You can enter district, city and state manually below.
          </Text>
        )}

        {isPincodeVerified && (
          <Text style={styles.successText}>
            ✓ Pincode verified - District, City & State auto-filled
          </Text>
        )}

        {formData.pincode.length === 6 && pincodeVerificationState === 'input' && (
          <Text style={styles.helperText}>
            Tap the verify icon to auto-fill district, city & state, or enter manually below
          </Text>
        )}
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
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
              editable={!isEditMode}
            />
            {isEditMode && (
              <Text style={styles.helperText}>
                Mobile number cannot be changed as it's your identity
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
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
              placeholder="Enter your complete address"
              multiline
              numberOfLines={3}
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
              placeholder={isPincodeVerified ? "Auto-filled from pincode verification" : "Enter your district"}
              editable={true} // Always allow manual input
            />
            {isPincodeVerified && (
              <Text style={styles.helperText}>
                Auto-filled from pincode. You can edit if needed.
              </Text>
            )}
          </View>

          {/* ✅ ADDED CITY FIELD */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>CITY *</Text>
            <TextInput
              style={[
                styles.input,
                isPincodeVerified && styles.autoFilledInput
              ]}
              value={formData.city}
              onChangeText={(text) => handleInputChange('city', text)}
              placeholder={isPincodeVerified ? "Auto-filled from pincode verification" : "Enter your city"}
              editable={true} // Always allow manual input
            />
            {isPincodeVerified && (
              <Text style={styles.helperText}>
                Auto-filled from pincode. You can edit if needed.
              </Text>
            )}
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
              placeholder={isPincodeVerified ? "Auto-filled from pincode verification" : "Enter your state"}
              editable={true} // Always allow manual input
            />
            {isPincodeVerified && (
              <Text style={styles.helperText}>
                Auto-filled from pincode. You can edit if needed.
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FACEBOOK ID</Text>
            <TextInput
              style={styles.input}
              value={formData.facebookId}
              onChangeText={(text) => handleInputChange('facebookId', text)}
              placeholder="Enter Facebook ID (optional)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>INSTAGRAM ID</Text>
            <TextInput
              style={styles.input}
              value={formData.instagramId}
              onChangeText={(text) => handleInputChange('instagramId', text)}
              placeholder="Enter Instagram ID (optional)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>X ID</Text>
            <TextInput
              style={styles.input}
              value={formData.xId}
              onChangeText={(text) => handleInputChange('xId', text)}
              placeholder="Enter X ID (optional)"
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
                    placeholder="Enter password (min 6 characters)"
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
                    placeholder="Confirm your password"
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