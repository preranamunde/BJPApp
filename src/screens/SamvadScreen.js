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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const SamvadScreen = ({ route, navigation }) => {
  const [activeMainTab, setActiveMainTab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [showRegistrationSuccess, setShowRegistrationSuccess] = useState(false);

  // Check login status whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkLoginStatus();
    }, [])
  );

  // Handle back button for logged in users
  useEffect(() => {
    if (isUserLoggedIn) {
      const backAction = () => {
        // Disable back button for logged in users
        // App can only be closed intentionally
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
        return true; // Prevent default back action
      };

      const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
      return () => backHandler.remove();
    }
  }, [isUserLoggedIn]);

  const checkLoginStatus = async () => {
    try {
      const loginStatus = await AsyncStorage.getItem('isLoggedin');
      const isLoggedIn = loginStatus === 'TRUE';
      
      // Set global variable
      global.isUserLoggedin = isLoggedIn;
      setIsUserLoggedIn(isLoggedIn);
      
      console.log('Login status:', isLoggedIn);
    } catch (error) {
      console.error('Error checking login status:', error);
      // Default to false if there's an error
      global.isUserLoggedin = false;
      setIsUserLoggedIn(false);
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
      
      // Handle registration success
      if (registrationSuccess || fromRegistration) {
        setShowRegistrationSuccess(true);
        // Clear the parameter after showing for 4 seconds
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

  // Separate form data for each tab
  const [formDataByTab, setFormDataByTab] = useState({
    APPEAL: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      postOffice: '',
      taluka: '',
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
      postOffice: '',
      taluka: '',
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
      postOffice: '',
      taluka: '',
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
      postOffice: '',
      taluka: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
  });

  const mainTabs = ['APPEAL', 'APPOINTMENT', 'GRIEVANCE', 'COMPLAINTS'];
  const subTabs = ['ADD', 'PREVIEW'];

  // Handle main tab click with login check
  const handleMainTabClick = (tab) => {
    setActiveMainTab(tab);
    
    // Check if user is logged in
    if (!isUserLoggedIn) {
      // Show sub tabs but don't allow form access
      setActiveSubTab('ADD');
    } else {
      // User is logged in, normal flow
      setActiveSubTab('ADD');
    }
  };

  // Handle sub tab click with login check
  const handleSubTabClick = (subTab) => {
    if (!isUserLoggedIn && subTab === 'ADD') {
      // Don't change the sub tab, just show login message
      return;
    }
    setActiveSubTab(subTab);
  };

  // Get current tab's form data
  const getCurrentFormData = () => activeMainTab ? formDataByTab[activeMainTab] : {};

  const handleChange = (field, value) => {
    if (!activeMainTab) return;
    
    setFormDataByTab(prev => ({
      ...prev,
      [activeMainTab]: {
        ...prev[activeMainTab],
        [field]: value
      }
    }));
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
    
    if (!currentFormData.postOffice || currentFormData.postOffice.trim().length < 2) {
      Alert.alert('Error', 'Please enter post office name.');
      return false;
    }
    
    if (!currentFormData.taluka || currentFormData.taluka.trim().length < 2) {
      Alert.alert('Error', 'Please enter taluka name.');
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

  const handleSubmit = () => {
    if (!activeMainTab) return;
    
    if (!validateForm()) {
      return;
    }
    
    const currentFormData = getCurrentFormData();
    console.log(`${activeMainTab} form submitted:`, currentFormData);
    
    Alert.alert(
      'Success', 
      `Your ${activeMainTab.toLowerCase()} has been submitted successfully! You will receive a confirmation shortly.`,
      [
        {
          text: 'View Preview',
          onPress: () => setActiveSubTab('PREVIEW')
        },
        {
          text: 'OK',
          style: 'default'
        }
      ]
    );
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
            // Clear only the current tab's form data
            setFormDataByTab(prev => ({
              ...prev,
              [activeMainTab]: {
                mobile: '',
                name: '',
                fatherHusbandName: '',
                address: '',
                pincode: '',
                postOffice: '',
                taluka: '',
                district: '',
                state: '',
                purpose: '',
                requestedDate: '',
                declarationAccepted: false,
              }
            }));
            setFocusedField(null);
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
                <Text style={styles.successText}>✅ Registration Successful!</Text>
                <Text style={styles.successSubText}>Your account has been created successfully</Text>
              </View>
            )}
            
            <Text style={styles.loginRequiredTitle}>🔒 Login Required</Text>
            <Text style={styles.loginRequiredMessage}>
              {justRegistered 
                ? "Great! Your account has been created successfully."
                : "Oops! You are not logged in."
              }
            </Text>
            <Text style={styles.loginRequiredSubMessage}>
              Please login to access {activeMainTab?.toLowerCase()} services and book appointments.
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

  // Render welcome content when no main tab is selected
  const renderWelcomeContent = () => (
    <ScrollView
      contentContainerStyle={styles.contentArea}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentCard}>
        {/* Registration Success Banner */}
        {showRegistrationSuccess && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>🎉 Welcome! Registration Successful!</Text>
            <Text style={styles.successSubText}>You can now access all Samvad services</Text>
          </View>
        )}
        
        <Text style={styles.welcomeTitle}>Welcome to Samvad</Text>
        <Text style={styles.welcomeSubtitle}>
          Connect with your representative through our digital platform
        </Text>
        <View style={styles.categoryContainer}>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>🔔 APPEAL</Text>
            <Text style={styles.categoryDescription}>Submit an appeal for review and resolution</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>📅 APPOINTMENT</Text>
            <Text style={styles.categoryDescription}>Schedule a meeting with your representative</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>📋 GRIEVANCE</Text>
            <Text style={styles.categoryDescription}>Register your grievance for prompt action</Text>
          </View>
          
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>📝 COMPLAINTS</Text>
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
      ) : activeSubTab === 'ADD' ? (
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

            {renderInputField(
              'pincode',
              'Pincode',
              '6-digit pincode',
              'numeric',
              false,
              true
            )}

            {renderInputField(
              'postOffice',
              'Post Office',
              'Enter post office name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'taluka',
              'Taluka',
              'Enter taluka name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'district',
              'District',
              'Enter district name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'state',
              'State',
              'Enter state name',
              'default',
              false,
              true
            )}

            {renderCheckbox()}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.buttonText}>Clear Form</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.contentArea}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>Preview - {getFormHeader()}</Text>
            <View style={styles.previewContainer}>
              <Text style={styles.previewHeader}>Submitted Information:</Text>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Mobile Number:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().mobile || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Name:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().name || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Father/Husband's Name:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().fatherHusbandName || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Address:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().address || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Pincode:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().pincode || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Post Office:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().postOffice || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Taluka:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().taluka || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>District:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().district || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>State:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().state || 'Not provided'}</Text>
              </View>
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>{getPurposeLabel()}:</Text>
                <Text style={styles.previewValue}>{getCurrentFormData().purpose || 'Not provided'}</Text>
              </View>
              
              {activeMainTab === 'APPOINTMENT' && (
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Requested Date:</Text>
                  <Text style={styles.previewValue}>{getCurrentFormData().requestedDate || 'Not provided'}</Text>
                </View>
              )}
              
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Declaration:</Text>
                <Text style={[styles.previewValue, getCurrentFormData().declarationAccepted ? styles.accepted : styles.notAccepted]}>
                  {getCurrentFormData().declarationAccepted ? 'Accepted ✓' : 'Not Accepted ✗'}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => setActiveSubTab('ADD')}
              >
                <Text style={styles.buttonText}>Edit Form</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.submitButton} 
                onPress={() => {
                  Alert.alert(
                    'Confirmed',
                    `Your ${activeMainTab.toLowerCase()} has been successfully recorded in the system.`,
                    [
                      {
                        text: 'New Form',
                        onPress: () => {
                          handleCancel();
                          setActiveSubTab('ADD');
                        }
                      },
                      {
                        text: 'Done',
                        onPress: () => navigation.goBack()
                      }
                    ]
                  );
                }}
              >
                <Text style={styles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fef6f2' 
  },
  mainTabContainer: {
    backgroundColor: '#f56c3aff',
    paddingTop: 12,
    paddingBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tabRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  mainTabButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.2,
    position: 'relative',
  },
  activeMainTabButton: {},
  mainTabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    textAlign: 'center',
  },
  activeMainTabText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    opacity: 1 
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  subTabContainer: {
    backgroundColor: '#f17232',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.25,
    position: 'relative',
    borderRadius: 8,
  },
  activeSubTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  subTabText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '500', 
    opacity: 0.9 
  },
  activeSubTabText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    opacity: 1 
  },
  subUnderline: {
    position: 'absolute',
    bottom: 2,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  contentArea: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    padding: 20,
    paddingTop: 25,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B35',
  },
  contentText: { 
    fontSize: 20, 
    color: '#333', 
    textAlign: 'center', 
    fontWeight: '600',
    marginBottom: 25,
  },
  
  // Success Banner Styles
  successBanner: {
    backgroundColor: '#d4edda',
    borderColor: '#c3e6cb',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  successText: {
    color: '#155724',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  successSubText: {
    color: '#155724',
    fontSize: 14,
    textAlign: 'center',
  },
  
  // Login Required Styles
  loginRequiredContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loginRequiredTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 15,
    textAlign: 'center',
  },
  loginRequiredMessage: {
    fontSize: 18,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  loginRequiredSubMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#e16e2b',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  
  // Welcome screen styles
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  categoryContainer: {
    width: '100%',
    marginTop: 10,
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    padding: 18,
    marginBottom: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  
  // Input Styles
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperFocused: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  inputFocused: {
    color: '#000',
  },
  multilineInput: {
    minHeight: 100,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.3,
  },
  requiredLabel: {
    color: '#2c3e50',
  },
  asterisk: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  fieldNote: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 4,
    lineHeight: 14,
  },
  
  // Declaration with checkbox styles
  declarationContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
  },
  checkbox: {
    width: 25,
    height: 25,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  declarationTextContainer: {
    flex: 1,
    paddingRight: 4,
  },
  declarationText: {
    fontSize: 13,
    color: '#444',
    textAlign: 'justify',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25,
    gap: 15,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  previewContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    marginTop: 15,
  },
  previewHeader: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    fontSize: 16,
  },
  previewRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  previewLabel: {
    fontWeight: '600',
    color: '#333',
    minWidth: '40%',
    fontSize: 14,
  },
  previewValue: {
    color: '#555',
    flex: 1,
    fontSize: 14,
  },
  accepted: {
    color: '#27ae60',
    fontWeight: '600',
  },
  notAccepted: {
    color: '#e74c3c',
    fontWeight: '600',
  },
});

export default SamvadScreen;