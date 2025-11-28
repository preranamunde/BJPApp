import React, { useState, useEffect } from 'react';
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
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email verification states
  const [emailVerificationState, setEmailVerificationState] = useState('input');
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [verificationToken, setVerificationToken] = useState('');
  const [apiEndpoints, setApiEndpoints] = useState(null);

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

  // Validation function
  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email');
      return false;
    }

    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email');
      return false;
    }

    if (!isEmailVerified) {
      Alert.alert('Validation Error', 'Please verify your email address');
      return false;
    }

    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password');
      return false;
    }

    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters');
      return false;
    }

    if (!confirmPassword.trim()) {
      Alert.alert('Validation Error', 'Please confirm your password');
      return false;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    return emailRegex.test(email);
  };

  // Email verification
 const handleEmailVerification = async () => {
  if (!email || !validateEmail(email)) {
    Alert.alert('Error', 'Please enter a valid email address');
    return;
  }

  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  setEmailVerificationState('loading');

  try {
    // ✅ Change from post to authPost
    // Change from ApiService.post to ApiService.authPost
const result = await ApiService.authPost(apiEndpoints.profile.verifyEmail, {
  email: email.trim().toLowerCase(),
});

    if (result.success) {
      setEmailVerificationState('verify');
    } else {
      setEmailVerificationState('input');
      Alert.alert('Error', result.message || 'Failed to verify email. Please try again.');
    }
  } catch (error) {
    setEmailVerificationState('input');
    Alert.alert('Error', 'Failed to verify email. Please try again.');
  }
};

  // Send OTP
  const sendEmailOTP = async () => {
  if (!apiEndpoints) {
    Alert.alert('Error', 'API configuration not loaded');
    return;
  }

  try {
    setEmailVerificationState('loading');

    // ✅ Change from post to authPost
    // Change from ApiService.post to ApiService.authPost
const result = await ApiService.authPost(apiEndpoints.profile.sendOTP, {
  email: email.trim().toLowerCase(),
});

    console.log('OTP Send API response:', result);

    if (result.success && (result.data?.message === 'OTP sent to email successfully' || result.message === 'OTP sent to email successfully')) {
      setVerificationToken('dummy-token');
      setEmailVerificationState('otp');
      setOtpTimer(300);
      Alert.alert('OTP Sent', `Verification code has been sent to ${email}.`);
    } else {
      throw new Error(result.message || 'Unexpected response');
    }
  } catch (error) {
    console.log('OTP send error:', error);
    setEmailVerificationState('verify');
    Alert.alert('Error', 'Failed to send OTP. Please try again.');
  }
};

const verifyEmailOTP = async () => {
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

    // get APP_KEY from secure storage
    const appKey = await EncryptedStorage.getItem('APP_KEY');

    if (!appKey) {
      Alert.alert('Error', 'APP KEY not found');
      return;
    }

    const result = await ApiService.authPost(
      apiEndpoints.profile.verifyEmailOTP,
      {
        email: email.trim().toLowerCase(),
        otp: emailOtp,
        verificationToken: verificationToken,
      },
      {
        'x-app-key': appKey,       // ✔ SAME AS POSTMAN
        'Content-Type': 'application/json',
      }
    );

    console.log("Verification response:", result);

    if (
      result.success ||
      result.message === 'Email verified successfully!' ||
      result.data?.message === 'Email verified successfully!'
    ) {
      setIsEmailVerified(true);
      setEmailVerificationState('verified');
      Alert.alert('Success', 'Email verified successfully!');
      setEmailOtp('');
      setVerificationToken('');
    } else {
      setEmailVerificationState('otp');
      Alert.alert('Error', result.message || 'OTP verification failed.');
    }

  } catch (error) {
    console.log("Verification error:", error);
    setEmailVerificationState('otp');
    Alert.alert('Error', 'Failed to verify OTP. Please try again.');
  }
};




  // Resend OTP
  const resendEmailOTP = () => {
    Alert.alert(
      'Resend OTP',
      'Do you want to resend the verification code?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Resend', onPress: sendEmailOTP }
      ]
    );
  };

  // Handle email change
  const handleEmailChange = (text) => {
    setEmail(text);
    // Reset email verification when email changes
    if (text !== email) {
      setEmailVerificationState('input');
      setIsEmailVerified(false);
      setEmailOtp('');
      setVerificationToken('');
    }
  };

  const handleForgotPassword = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      // Get Access Token
      const accessToken = await AsyncStorage.getItem("userAccessToken")
        || await AsyncStorage.getItem("jwt_token")
        || await EncryptedStorage.getItem("ACCESS_TOKEN");

      if (!accessToken) {
        Alert.alert("Error", "Session expired. Please log in again.");
        navigation.navigate("Login");
        return;
      }

      // Get App Key
      const appKey = await EncryptedStorage.getItem("APP_KEY");

      // Get App Owner Info (mobile + email)
      const ownerInfoString = await EncryptedStorage.getItem("AppOwnerInfo");
      const ownerInfo = ownerInfoString ? JSON.parse(ownerInfoString) : null;

      const leaderMobile = ownerInfo?.client_mobile || "";

      if (!leaderMobile) {
        Alert.alert("Error", "Owner mobile not found. Restart app.");
        return;
      }

      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/profile/fp`;

      // Required API Body
      const requestPayload = {
        leader_regd_mobile_no: leaderMobile,
        user_email_id: email.trim().toLowerCase(),
        npassword: newPassword
      };

      // Headers
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "x-access-token": accessToken,
        ...(appKey && { "x-app-key": appKey })
      };

      console.log("📤 Forgot Password Request:", requestPayload);

      const result = await ApiService.authPut(apiUrl, requestPayload, headers);

      if (result?.success || result?.message === "Password updated successfully") {
        Alert.alert(
          "Success",
          "Password reset successfully!",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }]
        );
      } else {
        Alert.alert("Error", result?.message || "Failed to reset password");
      }

    } catch (error) {
      Alert.alert("Error", error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // Render email verification section
  const renderEmailVerificationSection = () => {
    return (
      <View style={styles.emailVerificationContainer}>
        <View style={styles.emailInputContainer}>
          <Icon name="email" size={20} color="#7f8c8d" style={styles.inputIcon} />
          <TextInput
            style={[
              styles.emailInput,
              isEmailVerified && styles.verifiedInput
            ]}
            placeholder="Enter your email"
            placeholderTextColor="#bdc3c7"
            value={email}
            onChangeText={handleEmailChange}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isEmailVerified}
          />

          {emailVerificationState === 'input' && (
            <TouchableOpacity
              style={styles.verifyIconButton}
              onPress={handleEmailVerification}
            >
              <Icon name="verified-user" size={24} color="#e16e2b" />
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
        </View>

        {/* Helper text */}
        {emailVerificationState === 'input' && (
          <Text style={styles.helperText}>Tap verify icon to check email</Text>
        )}
        {emailVerificationState === 'verify' && (
          <Text style={styles.helperText}>Tap send icon to receive OTP</Text>
        )}
        {isEmailVerified && (
          <Text style={styles.successText}>✓ Email verified successfully</Text>
        )}

        {/* OTP section */}
        {emailVerificationState === 'otp' && (
          <View style={styles.otpContainer}>
            <Text style={styles.otpLabel}>Enter verification code sent to your email</Text>
            <View style={styles.otpInputContainer}>
              <TextInput
                style={styles.otpInput}
                value={emailOtp}
                onChangeText={setEmailOtp}
                placeholder="Enter 6-digit OTP"
                placeholderTextColor="#bdc3c7"
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="#e16e2b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Forgot Password</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Icon name="info" size={20} color="#3498db" />
          <Text style={styles.infoText}>
            Enter your registered email and verify it to reset your password.
          </Text>
        </View>

        {/* Email with Verification */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          {renderEmailVerificationSection()}
        </View>

        {/* New Password - Only show if email is verified */}
        {isEmailVerified && (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password *</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#bdc3c7"
                  secureTextEntry={!showNewPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                  <Icon name={showNewPassword ? 'visibility' : 'visibility-off'} size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password *</Text>
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color="#7f8c8d" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="#bdc3c7"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                  <Icon name={showConfirmPassword ? 'visibility' : 'visibility-off'} size={20} color="#7f8c8d" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
              onPress={handleForgotPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> 
              : <>
                  <Icon name="lock-reset" size={20} color="#fff" />
                  <Text style={styles.resetButtonText}>Reset Password</Text>
                </>
              }
            </TouchableOpacity>
          </>
        )}

        {/* Back Button */}
        <TouchableOpacity style={styles.backToLoginButton} onPress={() => navigation.navigate('Login')}>
          <Icon name="arrow-back" size={18} color="#e16e2b" />
          <Text style={styles.backToLoginText}>Back to Login</Text>
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
  // Email verification styles
  emailVerificationContainer: {
    marginTop: 5,
  },
  emailInputContainer: {
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
  emailInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#2c3e50',
    marginHorizontal: 10,
  },
  verifiedInput: {
    color: '#4CAF50',
  },
  verifyIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendOtpIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 5,
    marginLeft: 5,
    fontStyle: 'italic',
  },
  successText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 5,
    marginLeft: 5,
    fontWeight: '600',
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
  resetButton: {
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
  resetButtonDisabled: {
    backgroundColor: '#bdc3c7',
    elevation: 0,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e16e2b',
  },
  backToLoginText: {
    color: '#e16e2b',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default ForgotPasswordScreen;