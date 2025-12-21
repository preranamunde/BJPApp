import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserRole } from '../../App';

const ChangePasswordScreen = ({ navigation }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Password visibility toggles
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Validation function
  const validatePasswords = () => {
    if (!oldPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter your old password');
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'New password must be at least 6 characters long');
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your new password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New password and confirm password do not match');
      return false;
    }

    if (oldPassword === newPassword) {
      Alert.alert('Validation Error', 'New password must be different from old password');
      return false;
    }

    return true;
  };

  // Handle password change
// Enhanced handleChangePassword with access token and app key in headers
const handleChangePassword = async () => {
  if (!validatePasswords()) {
    return;
  }

  setLoading(true);

  try {
    console.log('🔄 Starting password change process...');
    
    // ✅ GET FRESH USER INFO (SAME AS MEDIA CREATION)
    const currentUserInfo = await getCurrentUserRole();
    const freshEmail = currentUserInfo.loggedin_email || 
                       currentUserInfo.email || 
                       currentUserInfo.user_email_id || 
                       '';
    const freshMobile = currentUserInfo.mobile || 
                        currentUserInfo.regdMobileNo || 
                        currentUserInfo.leader_regd_mobile_no || 
                        '';
    
    console.log('✅ Fresh credentials from getCurrentUserRole:', {
      email: freshEmail,
      mobile: freshMobile
    });

    let loggedInEmail = freshEmail;
    let mobileNo = freshMobile;
    
    // STEP 1: Fallback - Get from AsyncStorage if getCurrentUserRole didn't work
    if (!loggedInEmail || !mobileNo) {
      console.log('⚠️ getCurrentUserRole incomplete, checking AsyncStorage...');
      
      if (!loggedInEmail) {
        loggedInEmail = await AsyncStorage.getItem('userEmail') || 
                        await AsyncStorage.getItem('user_email_id') ||
                        await EncryptedStorage.getItem('LOGGED_IN_EMAIL') ||
                        '';
      }
      
      const userData = await AsyncStorage.getItem('userData');
      
      if (userData) {
        try {
          const parsedUserData = JSON.parse(userData);
          
          if (!mobileNo) {
            mobileNo = parsedUserData.mobile || 
                      parsedUserData.mobileNo || 
                      parsedUserData.mobile_no ||
                      parsedUserData.client_mobile ||
                      parsedUserData.phone ||
                      parsedUserData.regdMobileNo ||
                      '';
          }
          
          // Also try to get email from userData if not found earlier
          if (!loggedInEmail) {
            loggedInEmail = parsedUserData.email ||
                           parsedUserData.emailid ||
                           parsedUserData.user_email_id ||
                           parsedUserData.email_id ||
                           parsedUserData.user_email ||
                           '';
          }
          
          console.log('📋 User data found:', {
            email: loggedInEmail,
            mobile: mobileNo,
            availableFields: Object.keys(parsedUserData)
          });
        } catch (parseError) {
          console.error('❌ Error parsing userData:', parseError);
        }
      }
    }
    
    // STEP 2: Final fallback to AppOwnerInfo
    if (!loggedInEmail || !mobileNo) {
      console.log('⚠️ Still incomplete, checking AppOwnerInfo...');
      
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        try {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          console.log('📋 AppOwnerInfo keys:', Object.keys(appOwnerInfo));
          
          if (!loggedInEmail) {
            loggedInEmail = appOwnerInfo.emailid || 
                           appOwnerInfo.email || 
                           appOwnerInfo.user_email_id ||
                           appOwnerInfo.email_id ||
                           appOwnerInfo.user_email ||
                           '';
          }
          
          if (!mobileNo) {
            mobileNo = appOwnerInfo.client_mobile || 
                      appOwnerInfo.mobile_no || 
                      appOwnerInfo.mobile ||
                      appOwnerInfo.regdMobileNo ||
                      appOwnerInfo.leader_regd_mobile_no ||
                      '';
          }
        } catch (parseError) {
          console.error('❌ Error parsing AppOwnerInfo:', parseError);
        }
      }
    }

    console.log('📧 Final Email:', loggedInEmail);
    console.log('📱 Final Mobile:', mobileNo);

    // STEP 3: Validate credentials
    if (!loggedInEmail || !mobileNo) {
      console.error('❌ Missing credentials after all attempts');
      
      Alert.alert(
        'Error', 
        'Unable to retrieve your account credentials. Please log out and log in again.\n\n' +
        `Email found: ${loggedInEmail || 'No'}\n` +
        `Mobile found: ${mobileNo || 'No'}`
      );
      return;
    }

    // STEP 4: Get access token and app key for headers
    const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                       await AsyncStorage.getItem('jwt_token') ||
                       await AsyncStorage.getItem('access_token') ||
                       await EncryptedStorage.getItem('ACCESS_TOKEN') ||
                       '';
    
    const appKey = await EncryptedStorage.getItem('APP_KEY') || '';

    console.log('🔑 Access Token exists:', !!accessToken);
    console.log('🔑 App Key exists:', !!appKey);

    if (!accessToken) {
      Alert.alert(
        'Authentication Error',
        'Access token not found. Please log in again.',
        [
          { 
            text: 'OK', 
            onPress: () => navigation.navigate('Login') 
          }
        ]
      );
      return;
    }

    // STEP 5: Prepare API request
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/profile/cp`;

    console.log('🔗 API URL:', apiUrl);

    // Request body with fresh credentials
    const requestPayload = {
      leader_regd_mobile_no: mobileNo,
      user_email_id: loggedInEmail,  // ✅ USING FRESH EMAIL
      opassword: oldPassword,
      npassword: newPassword
    };

    // Request headers with access token and app key
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-access-token': accessToken,
      ...(appKey && { 'x-app-key': appKey })
    };

    console.log('📤 Request headers:', {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ***',
      'x-access-token': '***',
      'x-app-key': appKey ? '***' : 'not included'
    });

    console.log('📤 Request body:', {
      leader_regd_mobile_no: mobileNo,
      user_email_id: loggedInEmail,
      opassword: '***',
      npassword: '***'
    });

    // STEP 6: Make API call with headers
    const result = await ApiService.authPut(
      apiUrl,
      requestPayload,
      headers
    );

    console.log('📥 Change password response:', result);

    // STEP 7: Handle response
    if (result.success || result.message === 'Password changed successfully') {
      Alert.alert(
        'Success',
        'Password changed successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Clear form
              setOldPassword('');
              setNewPassword('');
              setConfirmPassword('');
              
              // Navigate back
              navigation.goBack();
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Change Password Failed',
        result.message || 'Unable to change password. Please check your old password and try again.'
      );
    }

  } catch (error) {
    console.error('❌ Error changing password:', error);
    console.error('❌ Error details:', error.message);
    
    let errorMessage = 'An error occurred while changing password. Please try again later.';
    
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Handle specific error cases
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      errorMessage = 'Your session has expired. Please log in again.';
      Alert.alert('Session Expired', errorMessage, [
        { text: 'OK', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }
    
    if (error.message?.includes('Network') || error.message?.includes('timeout')) {
      errorMessage = 'Network error. Please check your internet connection and try again.';
    }
    
    if (error.message?.includes('Invalid email') || error.message?.includes('email')) {
      errorMessage = 'Invalid email address. Please log out and log in again.';
    }
    
    Alert.alert('Error', errorMessage);
  } finally {
    setLoading(false);
  }
};
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={24} color="#e16e2b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color="#3498db" />
          <Text style={styles.infoText}>
            Your new password must be at least 6 characters long and different from your old password.
          </Text>
        </View>

        {/* Old Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Old Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock-outline" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your old password"
              placeholderTextColor="#bdc3c7"
              value={oldPassword}
              onChangeText={setOldPassword}
              secureTextEntry={!showOldPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowOldPassword(!showOldPassword)}
            >
              <Icon
                name={showOldPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#7f8c8d"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* New Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>New Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your new password"
              placeholderTextColor="#bdc3c7"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowNewPassword(!showNewPassword)}
            >
              <Icon
                name={showNewPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#7f8c8d"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New Password *</Text>
          <View style={styles.inputContainer}>
            <Icon name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter your new password"
              placeholderTextColor="#bdc3c7"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                size={20}
                color="#7f8c8d"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirementItem}>
            <Icon 
              name={newPassword.length >= 6 ? 'check-circle' : 'radio-button-unchecked'} 
              size={16} 
              color={newPassword.length >= 6 ? '#27ae60' : '#bdc3c7'} 
            />
            <Text style={styles.requirementText}>At least 6 characters</Text>
          </View>
          <View style={styles.requirementItem}>
            <Icon 
              name={newPassword !== oldPassword && newPassword.length > 0 ? 'check-circle' : 'radio-button-unchecked'} 
              size={16} 
              color={newPassword !== oldPassword && newPassword.length > 0 ? '#27ae60' : '#bdc3c7'} 
            />
            <Text style={styles.requirementText}>Different from old password</Text>
          </View>
          <View style={styles.requirementItem}>
            <Icon 
              name={newPassword === confirmPassword && newPassword.length > 0 ? 'check-circle' : 'radio-button-unchecked'} 
              size={16} 
              color={newPassword === confirmPassword && newPassword.length > 0 ? '#27ae60' : '#bdc3c7'} 
            />
            <Text style={styles.requirementText}>Passwords match</Text>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleChangePassword}
          disabled={loading}
          activeOpacity={0.7}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="check-circle" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Password</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingVertical: 10,
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  placeholder: {
    width: 40,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2c3e50',
    marginLeft: 10,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34495e',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
  },
  eyeIcon: {
    padding: 5,
  },
  requirementsCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginLeft: 10,
  },
  saveButton: {
    backgroundColor: '#e16e2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#bdc3c7',
    elevation: 0,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#ecf0f1',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdc3c7',
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;