import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import AuthService from '../utils/AuthService'; // Import the new AuthService

// Enhanced Logging Service for Login
class LoginLoggingService {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  static currentLogLevel = __DEV__ ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;

  static colors = {
    DEBUG: '\x1b[36m', // Cyan
    INFO: '\x1b[32m',  // Green
    WARN: '\x1b[33m',  // Yellow
    ERROR: '\x1b[31m', // Red
    RESET: '\x1b[0m',  // Reset
  };

  static log(level, category, message, data = null) {
    if (this.LOG_LEVELS[level] >= this.currentLogLevel) {
      const timestamp = new Date().toISOString().slice(11, 23);
      const color = this.colors[level] || this.colors.RESET;
      const resetColor = this.colors.RESET;
      
      console.log(
        `${color}[${timestamp}] [${level}] [${category}]${resetColor} ${message}`
      );
      
      if (data) {
        console.log(`${color}📊 Data:${resetColor}`, data);
      }
    }
  }

  static debug(category, message, data) { this.log('DEBUG', category, message, data); }
  static info(category, message, data) { this.log('INFO', category, message, data); }
  static warn(category, message, data) { this.log('WARN', category, message, data); }
  static error(category, message, data) { this.log('ERROR', category, message, data); }

  // Login-specific methods
  static loginDebug(message, data) { this.debug('LOGIN', message, data); }
  static loginInfo(message, data) { this.info('LOGIN', message, data); }
  static loginWarn(message, data) { this.warn('LOGIN', message, data); }
  static loginError(message, data) { this.error('LOGIN', message, data); }
}

// Admin Service for checking admin status during login
class LoginAdminService {
  static async checkIfUserIsAdmin(userEmail) {
    try {
      LoginLoggingService.loginInfo('🔍 === CHECKING ADMIN STATUS DURING LOGIN ===', { userEmail });
      
      // Get AppOwnerInfo from encrypted storage
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      
      if (!appOwnerInfoStr) {
        LoginLoggingService.loginWarn('⚠️ No AppOwnerInfo found in storage during login');
        return { isAdmin: false, ownerEmail: null };
      }
      
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      
      // Extract owner email from different possible fields
      const ownerEmail = appOwnerInfo.emailid || appOwnerInfo.email || appOwnerInfo.email_id;
      
      LoginLoggingService.loginDebug('Owner email comparison during login', {
        userEmail: userEmail?.toLowerCase(),
        ownerEmail: ownerEmail?.toLowerCase(),
        appOwnerInfoKeys: Object.keys(appOwnerInfo)
      });
      
      if (!ownerEmail) {
        LoginLoggingService.loginWarn('⚠️ No owner email found in AppOwnerInfo during login');
        return { isAdmin: false, ownerEmail: null };
      }
      
      // Compare emails (case-insensitive)
      const isAdmin = userEmail?.toLowerCase() === ownerEmail?.toLowerCase();
      
      LoginLoggingService.loginInfo(`${isAdmin ? '👑' : '👤'} Admin check result during login`, {
        isAdmin,
        userEmail,
        ownerEmail,
        match: isAdmin
      });
      
      return { 
        isAdmin, 
        ownerEmail: ownerEmail,
        appOwnerInfo: appOwnerInfo
      };
      
    } catch (error) {
      LoginLoggingService.loginError('❌ Error checking admin status during login', {
        error: error.message,
        userEmail
      });
      return { isAdmin: false, ownerEmail: null };
    }
  }

  static async enhanceUserDataWithAdminStatus(userData, userEmail) {
    try {
      LoginLoggingService.loginInfo('🔧 === ENHANCING LOGIN DATA WITH ADMIN STATUS ===');
      
      const adminCheck = await this.checkIfUserIsAdmin(userEmail);
      
      // Clone userData to avoid mutations
      const enhancedUserData = { ...userData };
      
      // If user is admin, automatically set email as verified and add admin flags
      if (adminCheck.isAdmin) {
        LoginLoggingService.loginInfo('👑 User is admin - auto-verifying email and setting admin flags', {
          email: userEmail,
          originalEmailVerified: userData.emailVerified
        });
        
        enhancedUserData.emailVerified = true;
        enhancedUserData.isAdmin = true;
        enhancedUserData.userRole = 'admin';
        
        // Add admin-specific info if available
        if (adminCheck.appOwnerInfo) {
          enhancedUserData.adminInfo = {
            ownerEmail: adminCheck.ownerEmail,
            mobile: adminCheck.appOwnerInfo.mobile_no || adminCheck.appOwnerInfo.mobile_number,
            // Add other owner info if needed
          };
        }
        
        // Store admin role in encrypted storage for future reference
        try {
          await EncryptedStorage.setItem('USER_ROLE', 'admin');
          LoginLoggingService.loginDebug('💾 Admin role saved to encrypted storage');
        } catch (roleError) {
          LoginLoggingService.loginError('Failed to save admin role', roleError);
        }
        
        LoginLoggingService.loginInfo('✅ Login data enhanced for admin user', {
          emailVerified: enhancedUserData.emailVerified,
          isAdmin: enhancedUserData.isAdmin,
          userRole: enhancedUserData.userRole
        });
      } else {
        LoginLoggingService.loginInfo('👤 Regular user - keeping original email verification status', {
          email: userEmail,
          emailVerified: userData.emailVerified
        });
        
        enhancedUserData.isAdmin = false;
        enhancedUserData.userRole = 'user';
        
        // Store user role in encrypted storage
        try {
          await EncryptedStorage.setItem('USER_ROLE', 'user');
          LoginLoggingService.loginDebug('💾 User role saved to encrypted storage');
        } catch (roleError) {
          LoginLoggingService.loginError('Failed to save user role', roleError);
        }
      }
      
      return enhancedUserData;
      
    } catch (error) {
      LoginLoggingService.loginError('❌ Error enhancing login data with admin status', error);
      // Return original data if enhancement fails
      return userData;
    }
  }
}

const LoginScreen = ({ navigation, route }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [adminCheckLoading, setAdminCheckLoading] = useState(false);

  // Handle navigation parameters for success messages
  useEffect(() => {
    if (route?.params) {
      const { message, registrationSuccess } = route.params;
      
      if (message || registrationSuccess) {
        setSuccessMessage(message || 'Registration completed successfully!');
        setShowSuccessMessage(true);
        
        // Clear the parameter
        navigation.setParams({ 
          message: undefined, 
          registrationSuccess: undefined 
        });
        
        // Hide message after 5 seconds
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
      }
    }
  }, [route?.params]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!formData.email.trim() || !emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    return true;
  };

  const enhanceLoginResponse = async (loginResult) => {
    try {
      LoginLoggingService.loginInfo('🔧 === ENHANCING LOGIN RESPONSE ===');
      
      if (!loginResult.success || !loginResult.user) {
        LoginLoggingService.loginWarn('⚠️ Login was not successful or no user data, skipping enhancement');
        return loginResult;
      }

      setAdminCheckLoading(true);
      
      // Enhance user data with admin status and auto email verification
      const enhancedUserData = await LoginAdminService.enhanceUserDataWithAdminStatus(
        loginResult.user, 
        formData.email.trim().toLowerCase()
      );

      // Update the stored user data with enhanced information
      await AsyncStorage.setItem('userData', JSON.stringify(enhancedUserData));
      LoginLoggingService.loginInfo('💾 Enhanced user data saved to AsyncStorage');

      // Create enhanced login result
      const enhancedResult = {
        ...loginResult,
        user: enhancedUserData,
        adminEnhanced: true
      };

      LoginLoggingService.loginInfo('✅ Login response enhanced successfully', {
        isAdmin: enhancedUserData.isAdmin,
        emailVerified: enhancedUserData.emailVerified,
        userRole: enhancedUserData.userRole
      });

      return enhancedResult;

    } catch (error) {
      LoginLoggingService.loginError('❌ Error enhancing login response', error);
      // Return original result if enhancement fails
      return loginResult;
    } finally {
      setAdminCheckLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);

    try {
      LoginLoggingService.loginInfo('🚀 === STARTING LOGIN PROCESS ===', {
        email: formData.email.trim().toLowerCase()
      });
      
      // Call the original login service
      const result = await AuthService.loginUser(formData.email, formData.password);
      
      LoginLoggingService.loginDebug('Login service result', {
        success: result.success,
        hasUser: !!result.user,
        message: result.message
      });

      if (result.success) {
        LoginLoggingService.loginInfo('✅ Login successful, enhancing with admin status...');

        // Enhance the login result with admin status checking
        const enhancedResult = await enhanceLoginResponse(result);

        LoginLoggingService.loginInfo('🎉 Login process completed successfully', {
          isAdmin: enhancedResult.user?.isAdmin,
          emailVerified: enhancedResult.user?.emailVerified,
          userRole: enhancedResult.user?.userRole
        });

        // Show success message with admin indication if applicable
        const successMsg = enhancedResult.user?.isAdmin 
          ? '👑 Admin Login Successful!' 
          : '✅ Login Successful!';

        const detailMsg = enhancedResult.user?.isAdmin
          ? 'Welcome back, Administrator! Your email has been auto-verified.'
          : 'Welcome back!';

        Alert.alert(
          'Success', 
          `${successMsg}\n${detailMsg}`, 
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainDrawer' }],
                });
              },
            },
          ]
        );
      } else {
        LoginLoggingService.loginError('❌ Login failed', { message: result.message });
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      LoginLoggingService.loginError('💥 Login error', error);
      Alert.alert('Error', 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Forgot Password',
      'Forgot password functionality will be implemented soon.',
      [{ text: 'OK' }]
    );
  };

  const handleRegister = () => {
    navigation.navigate('Registration');
  };

  // Render success message banner
  const renderSuccessMessage = () => {
    if (!showSuccessMessage) return null;
    
    return (
      <View style={styles.successMessageContainer}>
        <Text style={styles.successMessageText}>✅ {successMessage}</Text>
        <Text style={styles.successMessageSubText}>Please login to continue</Text>
      </View>
    );
  };

  // Render admin checking indicator
  const renderAdminCheckIndicator = () => {
    if (!adminCheckLoading) return null;
    
    return (
      <View style={styles.adminCheckContainer}>
        <ActivityIndicator size="small" color="#FFD700" />
        <Text style={styles.adminCheckText}>Checking admin status...</Text>
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
          <Icon name="account-circle" size={80} color="#fff" />
          <Text style={styles.title}>Login</Text>
          <Text style={styles.subtitle}>Access Your Account</Text>
          
          {/* Admin info indicator */}
          <View style={styles.adminInfoContainer}>
            <Icon name="info" size={16} color="rgba(255,255,255,0.8)" />
            <Text style={styles.adminInfoText}>
              App owners get admin privileges automatically
            </Text>
          </View>
        </View>

        <View style={styles.formContainer}>
          {/* Success Message Banner */}
          {renderSuccessMessage()}

          {/* Admin Check Loading Indicator */}
          {renderAdminCheckIndicator()}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS *</Text>
            <View style={styles.inputContainer}>
              <Icon name="email" size={20} color="#e16e2b" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => handleInputChange('email', text)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading && !adminCheckLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD *</Text>
            <View style={styles.passwordContainer}>
              <Icon name="lock" size={20} color="#e16e2b" style={styles.inputIcon} />
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                editable={!loading && !adminCheckLoading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading || adminCheckLoading}
              >
                <Icon
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.forgotPasswordContainer}
            onPress={handleForgotPassword}
            disabled={loading || adminCheckLoading}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.loginButton, 
              (loading || adminCheckLoading) && styles.loginButtonDisabled
            ]} 
            onPress={handleLogin}
            disabled={loading || adminCheckLoading}
          >
            {(loading || adminCheckLoading) ? (
              <View style={styles.loginButtonLoading}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.loginButtonText}>
                  {adminCheckLoading ? 'Checking Admin Status...' : 'Logging in...'}
                </Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>Login</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Updated Sign Up Section */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity 
              onPress={handleRegister}
              disabled={loading || adminCheckLoading}
            >
              <Text style={[
                styles.signUpLink,
                (loading || adminCheckLoading) && styles.signUpLinkDisabled
              ]}>
                Sign Up
              </Text>
            </TouchableOpacity>
          </View>

          {/* Admin Features Info */}
          <View style={styles.adminFeaturesContainer}>
            <View style={styles.adminFeaturesHeader}>
              <Icon name="admin-panel-settings" size={20} color="#FFD700" />
              <Text style={styles.adminFeaturesTitle}>Admin Features</Text>
            </View>
            <Text style={styles.adminFeaturesText}>
              • App owners automatically become administrators{'\n'}
              • Email verification is bypassed for admins{'\n'}
              • Full system access and user management{'\n'}
              • No additional setup required
            </Text>
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
    padding: 30,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 10,
  },
  adminInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  adminInfoText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '500',
  },
  formContainer: {
    padding: 25,
    paddingTop: 40,
  },
  // Success Message Styles
  successMessageContainer: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  successMessageText: {
    color: '#155724',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  successMessageSubText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
  },
  // Admin Check Loading Styles
  adminCheckContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderColor: '#FFD700',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  adminCheckText: {
    color: '#FF8C00',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  inputGroup: {
    marginBottom: 25,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  inputIcon: {
    marginRight: 5,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  eyeIcon: {
    padding: 10,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: 30,
  },
  forgotPasswordText: {
    color: '#e16e2b',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: '#e16e2b',
    borderRadius: 10,
    padding: 18,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    marginBottom: 30,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
  },
  loginButtonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  // SIGN UP STYLES
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  signUpText: {
    color: '#666',
    fontSize: 16,
  },
  signUpLink: {
    color: '#e16e2b',
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpLinkDisabled: {
    color: '#ccc',
  },
  // Admin Features Info Styles
  adminFeaturesContainer: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFD700',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  adminFeaturesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  adminFeaturesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginLeft: 8,
  },
  adminFeaturesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});

export default LoginScreen;