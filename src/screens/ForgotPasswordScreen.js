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

const handleForgotPassword = async () => {
  if (!validateForm()) return;
  setLoading(true);

  try {
    // ✅ Get Access Token
    const accessToken = await AsyncStorage.getItem("userAccessToken")
      || await AsyncStorage.getItem("jwt_token")
      || await EncryptedStorage.getItem("ACCESS_TOKEN");

    if (!accessToken) {
      Alert.alert("Error", "Session expired. Please log in again.");
      navigation.navigate("Login");
      return;
    }

    // ✅ Get App Key
    const appKey = await EncryptedStorage.getItem("APP_KEY");

    // ✅ Get App Owner Info (mobile + email)
    const ownerInfoString = await EncryptedStorage.getItem("AppOwnerInfo");
    const ownerInfo = ownerInfoString ? JSON.parse(ownerInfoString) : null;

    const leaderMobile = ownerInfo?.client_mobile || "";
    const leaderEmail = ownerInfo?.client_email || "";

    if (!leaderMobile) {
      Alert.alert("Error", "Owner mobile not found. Restart app.");
      return;
    }

    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/profile/fp`;

    // ✅ Required API Body
    const requestPayload = {
      leader_regd_mobile_no: leaderMobile, // ✅ from storage
      user_email_id: email.trim().toLowerCase(),
      npassword: newPassword
    };

    // ✅ Headers
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
            Enter your registered email to reset your password.
          </Text>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email *</Text>
          <View style={styles.inputContainer}>
            <Icon name="email" size={20} color="#7f8c8d" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="#bdc3c7"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        {/* New Password */}
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