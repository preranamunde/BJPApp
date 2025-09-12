import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Linking, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  Alert,
  RefreshControl,
  Dimensions 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';

// Enhanced Logging Service similar to LoginScreen
class ConstituencyLoggingService {
  static LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  };

  static currentLogLevel = __DEV__ ? this.LOG_LEVELS.DEBUG : this.LOG_LEVELS.INFO;

  static colors = {
    DEBUG: '\x1b[36m',
    INFO: '\x1b[32m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    RESET: '\x1b[0m',
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

  // Constituency-specific methods
  static constDebug(message, data) { this.debug('CONSTITUENCY', message, data); }
  static constInfo(message, data) { this.info('CONSTITUENCY', message, data); }
  static constWarn(message, data) { this.warn('CONSTITUENCY', message, data); }
  static constError(message, data) { this.error('CONSTITUENCY', message, data); }
}

// Screen dimensions for responsive design
const { width } = Dimensions.get('window');

const AboutConstituencyScreen = ({ navigation }) => {
  // State management
  const [constituencyData, setConstituencyData] = useState(null);
  const [assemblyConstituencies, setAssemblyConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  
  // Admin states following App.js patterns
  const [userRole, setUserRole] = useState('user');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loggedInEmail, setLoggedInEmail] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConstituency, setEditingConstituency] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editingAssemblyId, setEditingAssemblyId] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Developer mode states following App.js patterns
  const [showDevInput, setShowDevInput] = useState(false);
  const [devInput, setDevInput] = useState('');
  const [devClickCount, setDevClickCount] = useState(0);

  // Initialize component data
  useEffect(() => {
    initializeComponent();
  }, []);

  // Initialize component with role checking and data fetching
  const initializeComponent = async () => {
    try {
      ConstituencyLoggingService.constInfo('🚀 === INITIALIZING ABOUT CONSTITUENCY SCREEN ===');
      
      setLoading(true);
      
      // Step 1: Check user role and admin status
      await checkUserRoleAndPermissions();
      
      // Step 2: Get mobile number and initialize data
      await initializeData();
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Component initialization failed', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Check user role and permissions following App.js patterns
  const checkUserRoleAndPermissions = async () => {
    try {
      ConstituencyLoggingService.constInfo('🔍 === CHECKING USER ROLE AND PERMISSIONS ===');
      
      // Use getCurrentUserRole from App.js
      const currentUserInfo = await getCurrentUserRole();
      
      ConstituencyLoggingService.constDebug('User role information retrieved', {
        userRole: currentUserInfo.userRole,
        isAdmin: currentUserInfo.isAdmin,
        isLoggedIn: currentUserInfo.isLoggedIn,
        loggedin_email: currentUserInfo.loggedin_email,
        owner_emailid: currentUserInfo.owner_emailid
      });
      
      // Update state with user information
      setUserRole(currentUserInfo.userRole);
      setIsAdmin(currentUserInfo.isAdmin);
      setIsLoggedIn(currentUserInfo.isLoggedIn);
      setLoggedInEmail(currentUserInfo.loggedin_email);
      setOwnerEmail(currentUserInfo.owner_emailid);
      
      // Additional check using checkIfCurrentUserIsAdmin
      const adminCheck = await checkIfCurrentUserIsAdmin();
      
      ConstituencyLoggingService.constInfo('Admin status verification', {
        isAdminFromRole: currentUserInfo.isAdmin,
        isAdminFromCheck: adminCheck.isAdmin,
        reason: adminCheck.reason
      });
      
      // Use the most restrictive check
      const finalAdminStatus = currentUserInfo.isAdmin && adminCheck.isAdmin;
      setIsAdmin(finalAdminStatus);
      
      if (finalAdminStatus) {
        ConstituencyLoggingService.constInfo('👑 ADMIN ACCESS GRANTED - Edit features enabled');
      } else {
        ConstituencyLoggingService.constInfo('👤 USER ACCESS - Read-only mode');
      }
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error checking user permissions', error);
      // Default to user role on error
      setUserRole('user');
      setIsAdmin(false);
      setIsLoggedIn(false);
    }
  };

  // Get mobile number from storage following App.js patterns
  const getMobileNumberFromStorage = async () => {
    try {
      ConstituencyLoggingService.constInfo('🔍 Retrieving mobile number from storage...');
      
      // First try to get from AppOwnerInfo (following App.js pattern)
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        const appOwnerInfo = JSON.parse(appOwnerInfoStr);
        ConstituencyLoggingService.constDebug('AppOwnerInfo found', Object.keys(appOwnerInfo));
        
        // Check various possible keys for mobile number (following App.js pattern)
        const possibleMobileFields = [
          'mobile_no', 'regdMobileNo', 'mobile_number', 'phone', 'mobileNo',
          'Mobile', 'MobileNo', 'MOBILE', 'phoneNumber', 'contactNumber',
          'mobile', 'cell', 'cellular', 'contact', 'phone_number'
        ];
        
        let extractedMobile = '';
        for (const field of possibleMobileFields) {
          if (appOwnerInfo[field] && (typeof appOwnerInfo[field] === 'string' || typeof appOwnerInfo[field] === 'number')) {
            extractedMobile = String(appOwnerInfo[field]).trim();
            ConstituencyLoggingService.constInfo(`✅ Mobile found in field '${field}': ${extractedMobile}`);
            break;
          }
        }
        
        if (extractedMobile) {
          return extractedMobile;
        }
      }
      
      // Fallback to direct storage
      const storedMobile = await EncryptedStorage.getItem('MOBILE_NUMBER') ||
                          await EncryptedStorage.getItem('OWNER_MOBILE') ||
                          await AsyncStorage.getItem('userMobile');
      
      if (storedMobile) {
        ConstituencyLoggingService.constInfo('✅ Mobile found in direct storage:', storedMobile);
        return storedMobile;
      }
      
      // Final fallback - ask user
      ConstituencyLoggingService.constWarn('⚠️ No mobile number found in storage');
      return await promptForMobileNumber();
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error retrieving mobile number', error);
      return await promptForMobileNumber();
    }
  };

  // Prompt user for mobile number if not found
  const promptForMobileNumber = () => {
    return new Promise((resolve) => {
      Alert.prompt(
        '📱 Mobile Number Required',
        'Please enter your registered mobile number to view constituency information:',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setError('Mobile number is required to view constituency data');
              resolve(null);
            }
          },
          {
            text: 'Submit',
            onPress: async (inputMobile) => {
              if (inputMobile && inputMobile.trim().length >= 10) {
                const mobile = inputMobile.trim();
                // Store for future use
                try {
                  await AsyncStorage.setItem('userMobile', mobile);
                  ConstituencyLoggingService.constInfo('📱 User provided mobile number stored:', mobile);
                  resolve(mobile);
                } catch (error) {
                  ConstituencyLoggingService.constError('Error storing mobile number', error);
                  resolve(mobile);
                }
              } else {
                Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number');
                resolve(await promptForMobileNumber());
              }
            }
          }
        ],
        'plain-text',
        '',
        'numeric'
      );
    });
  };

  // Initialize data with mobile number
  const initializeData = async () => {
    try {
      ConstituencyLoggingService.constInfo('📱 === INITIALIZING CONSTITUENCY DATA ===');
      
      // Get mobile number from storage
      const mobileNo = await getMobileNumberFromStorage();
      
      if (!mobileNo) {
        throw new Error('Mobile number is required to fetch constituency data');
      }
      
      setRegdMobileNo(mobileNo);
      ConstituencyLoggingService.constInfo('📱 Using mobile number for API calls:', mobileNo);
      
      // Fetch data with the retrieved mobile number
      await fetchConstituencyData(mobileNo);
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Data initialization error', error);
      setError(error.message);
    }
  };

  // Fetch constituency data from API
  const fetchConstituencyData = async (mobileNo) => {
    try {
      setError(null);
      
      ConstituencyLoggingService.constInfo('📡 === FETCHING CONSTITUENCY DATA ===', { mobileNo });
      
      // Get base URL from ConfigService (following App.js pattern)
      const baseUrl = await ConfigService.getBaseUrl();
      ConstituencyLoggingService.constInfo('🌐 Using base URL:', baseUrl);
      
      // Fetch constituency profile data
      const profileResult = await ApiService.get(
        `${baseUrl}/api/constituencyprofile/${mobileNo}`,
        {
          'x-user-id': loggedInEmail || 'anonymous_user',
          'x-user-role': userRole,
        }
      );
      
      if (!profileResult.success) {
        throw new Error(`Failed to fetch constituency profile: ${profileResult.message}`);
      }
      
      ConstituencyLoggingService.constInfo('✅ Constituency profile fetched successfully');
      setConstituencyData(profileResult.data);
      
      // Fetch assembly constituencies data
      const assemblyResult = await ApiService.get(
        `${baseUrl}/api/assemblyconstituencies/${mobileNo}`,
        {
          'x-user-id': loggedInEmail || 'anonymous_user',
          'x-user-role': userRole,
        }
      );
      
      if (assemblyResult.success) {
        const assemblyData = assemblyResult.data;
        
        let constituencies = [];
        if (assemblyData && assemblyData.assembly_constituencies && Array.isArray(assemblyData.assembly_constituencies.assembly_const)) {
          constituencies = assemblyData.assembly_constituencies.assembly_const;
        } else if (assemblyData && Array.isArray(assemblyData.assembly_const)) {
          constituencies = assemblyData.assembly_const;
        } else if (Array.isArray(assemblyData)) {
          constituencies = assemblyData;
        }
        
        ConstituencyLoggingService.constInfo('✅ Assembly constituencies fetched', { count: constituencies.length });
        setAssemblyConstituencies(constituencies);
      } else {
        ConstituencyLoggingService.constWarn('⚠️ Assembly constituencies data not available', assemblyResult.message);
      }
      
    } catch (err) {
      ConstituencyLoggingService.constError('❌ Error fetching constituency data', err);
      setError(err.message);
    }
  };

  // Refresh data with pull-to-refresh
  const onRefresh = useCallback(async () => {
    if (!regdMobileNo) {
      await initializeComponent();
      return;
    }
    
    setRefreshing(true);
    try {
      await checkUserRoleAndPermissions();
      await fetchConstituencyData(regdMobileNo);
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Refresh failed', error);
      Alert.alert('Refresh Failed', error.message);
    } finally {
      setRefreshing(false);
    }
  }, [regdMobileNo]);

  // Developer mode functions (following App.js patterns)
  const handleTitlePress = () => {
    if (!__DEV__) return; // Only in development
    
    setDevClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        setShowDevInput(true);
        return 0; // Reset count
      }
      return newCount;
    });
  };

  const handleDevInputSubmit = async () => {
    if (devInput.toLowerCase() === 'admin') {
      try {
        await EncryptedStorage.setItem('developerMode', 'enabled');
        setIsAdmin(true);
        setUserRole('admin');
        setShowDevInput(false);
        setDevInput('');
        ConstituencyLoggingService.constInfo('🔧 Developer mode enabled - Admin features activated');
        Alert.alert('Developer Mode', 'Admin features enabled for testing!');
      } catch (error) {
        ConstituencyLoggingService.constError('Error enabling developer mode', error);
        Alert.alert('Error', 'Failed to enable developer mode');
      }
    } else {
      Alert.alert('Invalid Input', 'Please enter the correct developer code');
      setDevInput('');
    }
  };

  const closeDevInput = () => {
    setShowDevInput(false);
    setDevInput('');
  };

  // Admin Edit Functions (enhanced with proper error handling)
  const openEditConstituencyForm = () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required for editing');
      return;
    }
    
    if (!constituencyData) {
      Alert.alert('No Data', 'No constituency data available to edit');
      return;
    }
    
    ConstituencyLoggingService.constInfo('📝 Opening constituency edit form');
    
    setEditFormData({
      const_name: constituencyData.const_name || '',
      const_no: constituencyData.const_no || '',
      state: constituencyData.state || '',
      district: constituencyData.district || '',
      constituency_type: constituencyData.constituency_type || '',
      reservation_status: constituencyData.reservation_status || '',
      established: constituencyData.established || '',
      sitting_member: constituencyData.sitting_member || '',
      member_party: constituencyData.member_party || '',
      overview: constituencyData.overview || '',
      geography: constituencyData.geography || '',
      eci_url: constituencyData.eci_url || '',
      assembly_segment_count: constituencyData.assembly_segment_count || '',
      election_year: constituencyData.election_year || '',
      electon_header: constituencyData.electon_header || '',
      total_no_voters_data: constituencyData.total_no_voters_data || '',
      voter_trunout_ratio_data: constituencyData.voter_trunout_ratio_data || '',
      polling_station_count: constituencyData.polling_station_count || '',
      avg_no_electors_per_ps_data: constituencyData.avg_no_electors_per_ps_data || ''
    });
    
    setEditingConstituency(true);
    setEditingAssembly(false);
    setEditModalVisible(true);
  };

  const openEditAssemblyForm = (assembly) => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required for editing');
      return;
    }
    
    if (!assembly) {
      Alert.alert('No Data', 'No assembly constituency data available to edit');
      return;
    }
    
    ConstituencyLoggingService.constInfo('📝 Opening assembly edit form', { assembly: assembly.ac_name });
    
    setEditFormData({
      ac_number: assembly.ac_number || '',
      ac_name: assembly.ac_name || assembly.name || '',
      district: assembly.district || '',
      type: assembly.type || ''
    });
    
    setEditingAssemblyId(assembly._id || assembly.id);
    setEditingConstituency(false);
    setEditingAssembly(true);
    setEditModalVisible(true);
  };

  // Handle constituency update
  const handleUpdateConstituency = async () => {
    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not found. Please refresh the screen.');
      return;
    }
    
    setUpdateLoading(true);
    try {
      ConstituencyLoggingService.constInfo('🔄 === UPDATING CONSTITUENCY PROFILE ===', { mobileNo: regdMobileNo });
      
      // Clean the form data - remove empty strings and null values
      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });
      
      // Get base URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      
      // The backend expects "constitency_profile" (with typo), not "constituency_profile"
      const requestPayload = {
        constitency_profile: cleanedFormData
      };
      
      ConstituencyLoggingService.constDebug('Update payload prepared', {
        url: `${baseUrl}/api/constituencyprofile/${regdMobileNo}`,
        fieldsCount: Object.keys(cleanedFormData).length
      });
      
      const result = await ApiService.put(
        `${baseUrl}/api/constituencyprofile/${regdMobileNo}`,
        requestPayload,
        {
          'x-user-id': loggedInEmail || 'admin_user',
          'x-user-role': userRole,
        }
      );
      
      if (!result.success) {
        throw new Error(`Failed to update constituency profile: ${result.message}`);
      }
      
      ConstituencyLoggingService.constInfo('✅ Constituency profile updated successfully');
      
      // Update local state with new data
      if (result.data && result.data.constituency_profile) {
        setConstituencyData(result.data.constituency_profile);
      } else if (result.data && result.data.constitency_profile) {
        setConstituencyData(result.data.constitency_profile);
      } else if (result.data) {
        setConstituencyData(result.data);
      }
      
      // Close modal and refresh data
      setEditModalVisible(false);
      await fetchConstituencyData(regdMobileNo);
      
      Alert.alert('Success', 'Constituency profile updated successfully!');
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error updating constituency profile', error);
      Alert.alert('Update Failed', `Failed to update constituency profile: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle assembly update
  const handleUpdateAssembly = async () => {
    if (!regdMobileNo || !editingAssemblyId) {
      Alert.alert('Error', 'Missing required data. Please try again.');
      return;
    }
    
    setUpdateLoading(true);
    try {
      ConstituencyLoggingService.constInfo('🔄 === UPDATING ASSEMBLY CONSTITUENCY ===', { 
        mobileNo: regdMobileNo, 
        assemblyId: editingAssemblyId 
      });
      
      // Clean the form data
      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });
      
      // Create updated assembly constituencies array
      const updatedAssemblyConstituencies = assemblyConstituencies.map(assembly => {
        if ((assembly._id || assembly.id) === editingAssemblyId) {
          return {
            ...assembly,
            ac_number: cleanedFormData.ac_number || assembly.ac_number,
            ac_name: cleanedFormData.ac_name || assembly.ac_name,
            district: cleanedFormData.district || assembly.district,
            type: cleanedFormData.type || assembly.type || ''
          };
        }
        return assembly;
      });
      
      // Get base URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      
      // Structure the payload according to backend API
      const requestPayload = {
        assembly_constituencies: {
          narration: "Updated assembly constituencies",
          assembly_const_count: updatedAssemblyConstituencies.length,
          assembly_const: updatedAssemblyConstituencies.map(assembly => ({
            ac_number: parseInt(assembly.ac_number) || 0,
            ac_name: assembly.ac_name || '',
            district: assembly.district || '',
            ...(assembly.type && { type: assembly.type })
          }))
        }
      };
      
      const result = await ApiService.put(
        `${baseUrl}/api/assemblyconstituencies/${regdMobileNo}`,
        requestPayload,
        {
          'x-user-id': loggedInEmail || 'admin_user',
          'x-user-role': userRole,
        }
      );
      
      if (!result.success) {
        throw new Error(`Failed to update assembly constituency: ${result.message}`);
      }
      
      ConstituencyLoggingService.constInfo('✅ Assembly constituency updated successfully');
      
      // Close modal and refresh data
      setEditModalVisible(false);
      await fetchConstituencyData(regdMobileNo);
      
      Alert.alert('Success', 'Assembly constituency updated successfully!');
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error updating assembly constituency', error);
      Alert.alert('Update Failed', `Failed to update assembly constituency: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmitEdit = () => {
    if (editingConstituency) {
      handleUpdateConstituency();
    } else if (editingAssembly) {
      handleUpdateAssembly();
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingConstituency(false);
    setEditingAssembly(false);
    setEditFormData({});
    setEditingAssemblyId(null);
  };

  // Utility functions for data display
  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        ConstituencyLoggingService.constError('Failed to open URL', err);
        Alert.alert('Error', 'Failed to open the link');
      });
    }
  };

  const formatEstablishedYear = (established) => {
    if (!established) return 'N/A';
    return established.toString();
  };

  const getCurrentMP = () => {
    if (!constituencyData?.sitting_member) return 'N/A';
    return constituencyData.sitting_member;
  };

  const getMemberParty = () => {
    if (!constituencyData?.member_party) return '';
    return constituencyData.member_party.toUpperCase();
  };

  const getOverviewText = () => {
    // First check if overview exists and is not empty
    if (constituencyData?.overview && constituencyData.overview.trim() !== '') {
      return constituencyData.overview;
    }
    
    // If no overview, create a default one
    const constName = constituencyData?.const_name || 'This constituency';
    const state = constituencyData?.state || 'India';
    const established = constituencyData?.established || 'post-delimitation';
    const district = constituencyData?.district || 'the region';
    
    return `${constName} is a Lok Sabha constituency in ${state}. Created in ${established}, it covers major parts of ${district} district.`;
  };

  // Render functions
  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.titleContainer}
          onPress={handleTitlePress}
          activeOpacity={0.8}
        >
          <Text style={styles.title}>
            {`${constituencyData?.const_no || ''}${constituencyData?.const_no ? ', ' : ''}${constituencyData?.const_name || 'Constituency Name'}`}
          </Text>
        </TouchableOpacity>
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.headerEditButton}
            onPress={openEditConstituencyForm}
            activeOpacity={0.7}
          >
            <Icon name="edit" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        {`${constituencyData?.constituency_type || 'Lok Sabha'} Constituency`}
      </Text>

      {constituencyData?.reservation_status && (
        <View style={[styles.badge, { backgroundColor: '#27ae60', marginTop: 10 }]}>
          <Text style={styles.badgeText}>
            {constituencyData.reservation_status}
          </Text>
        </View>
      )}

      <View style={[styles.badge, { marginTop: 8 }]}>
        <Text style={styles.badgeText}>
          {constituencyData?.state || 'State'}
        </Text>
      </View>

      {/* User Role Indicator */}
      <View style={styles.roleIndicatorContainer}>
        <View style={[styles.roleIndicator, { backgroundColor: isAdmin ? '#f39c12' : '#3498db' }]}>
          <Icon name={isAdmin ? 'admin-panel-settings' : 'person'} size={12} color="#fff" />
          <Text style={styles.roleIndicatorText}>
            {isAdmin ? 'ADMIN MODE' : 'USER MODE'}
          </Text>
        </View>
        
        {isLoggedIn && (
          <View style={[styles.roleIndicator, { backgroundColor: '#27ae60', marginLeft: 8 }]}>
            <Icon name="verified-user" size={12} color="#fff" />
            <Text style={styles.roleIndicatorText}>LOGGED IN</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderInfoCards = () => (
    <>
      {/* Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="place" size={20} color="#3498db" />
          <Text style={styles.cardTitle}>Overview</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.overviewText}>
            {getOverviewText()}
          </Text>
        </View>
      </View>

      {/* Info Cards Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Icon name="account-balance" size={24} color="#e67e22" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Established</Text>
          <Text style={styles.infoValue}>
            {formatEstablishedYear(constituencyData?.established)}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.established ? 'After delimitation' : 'Historical'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="person" size={24} color="#9b59b6" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Current MP</Text>
          <Text style={styles.infoValue} numberOfLines={3}>
            {getCurrentMP()}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.sitting_member ? 
              `Member Of ${constituencyData?.constituency_type || 'Lok Sabha'}` : 
              ''}
          </Text>
          {constituencyData?.member_party && (
            <Text style={styles.infoSubtext}>
              {getMemberParty()}
            </Text>
          )}
        </View>
      </View>

      {/* Additional Info Cards */}
      <View style={styles.infoGrid}>
        {constituencyData?.district && (
          <View style={styles.infoCard}>
            <Icon name="map" size={24} color="#16a085" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.district}
            </Text>
          </View>
        )}
        
        {constituencyData?.assembly_segment_count && (
          <View style={styles.infoCard}>
            <Icon name="how-to-vote" size={24} color="#2980b9" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Assembly Constituencies</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.assembly_segment_count}
            </Text>
            {constituencyData?.eci_url && (
              <TouchableOpacity 
                onPress={() => openLink(constituencyData.eci_url)}
                style={styles.eciUrlContainer}
              >
                <Text style={styles.eciUrlText} numberOfLines={1}>
                  View ECI Data
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </>
  );

  const renderElectionTable = () => {
    if (!constituencyData) return null;

    // Create election results table
    const createElectorsTable = () => {
      const tableData = [];

      // Add General row if data exists
      if (constituencyData.electors_general_male_data || constituencyData.electors_general_female_data) {
        tableData.push({
          category: 'GENERAL',
          men: constituencyData.electors_general_male_data || '0',
          women: constituencyData.electors_general_female_data || '0',
          thirdGender: constituencyData.electors_general_tg_data || '0',
          total: constituencyData.electors_general_total_data || '0'
        });
      }

      // Add Overseas row if data exists
      if (constituencyData.electors_overseas_male_data || constituencyData.electors_overseas_female_data) {
        tableData.push({
          category: 'OVERSEAS',
          men: constituencyData.electors_overseas_male_data || '0',
          women: constituencyData.electors_overseas_female_data || '0',
          thirdGender: constituencyData.electors_overseas_tg_data || '0',
          total: constituencyData.electors_overseas_total_data || '0'
        });
      }

      // Add Service row if data exists
      if (constituencyData.electors_service_male_data || constituencyData.electors_service_female_data) {
        tableData.push({
          category: 'SERVICE',
          men: constituencyData.electors_service_male_data || '0',
          women: constituencyData.electors_service_female_data || '0',
          thirdGender: constituencyData.electors_service_tg_data || '0',
          total: constituencyData.electors_service_total_data || '0'
        });
      }

      // Add Total row if data exists
      if (constituencyData.electors_total_male_data || constituencyData.electors_total_female_data || constituencyData.electors_grand_total_data) {
        tableData.push({
          category: 'TOTAL',
          men: constituencyData.electors_total_male_data || '0',
          women: constituencyData.electors_total_female_data || '0',
          thirdGender: constituencyData.electors_total_tg_data || '0',
          total: constituencyData.electors_grand_total_data || '0'
        });
      }

      return tableData;
    };

    // Create basic election info
    const createBasicInfoTable = () => {
      const basicInfo = [];

      if (constituencyData.const_no) {
        basicInfo.push({ label: 'Constituency Number', value: constituencyData.const_no });
      }
      if (constituencyData.election_year) {
        basicInfo.push({ label: 'Election Year', value: constituencyData.election_year });
      }
      if (constituencyData.electon_header) {
        basicInfo.push({ label: 'Election', value: constituencyData.electon_header });
      }
      if (constituencyData.total_no_voters_data) {
        basicInfo.push({ label: 'Total Voters', value: constituencyData.total_no_voters_data });
      }
      if (constituencyData.voter_trunout_ratio_data) {
        basicInfo.push({ label: 'Voter Turnout', value: constituencyData.voter_trunout_ratio_data });
      }
      if (constituencyData.polling_station_count) {
        basicInfo.push({ label: 'Polling Stations', value: constituencyData.polling_station_count });
      }
      if (constituencyData.avg_no_electors_per_ps_data) {
        basicInfo.push({ label: 'Avg Electors per PS', value: constituencyData.avg_no_electors_per_ps_data });
      }

      return basicInfo;
    };

    const electorsTableData = createElectorsTable();
    const basicInfoData = createBasicInfoTable();

    return (
      <>
        {/* Basic Election Information */}
        {basicInfoData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>BASIC INFORMATION</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Parameter</Text>
              <Text style={styles.tableHeaderText}>Value</Text>
            </View>
            {basicInfoData.map((item, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={styles.tableCellLeft}>{item.label}</Text>
                <Text style={styles.tableCellRight}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Electors Table */}
        {electorsTableData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>ELECTORS BREAKDOWN</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>CATEGORY</Text>
              <Text style={styles.tableHeaderText}>MEN</Text>
              <Text style={styles.tableHeaderText}>WOMEN</Text>
              <Text style={styles.tableHeaderText}>3RD GENDER</Text>
              <Text style={styles.tableHeaderText}>TOTAL</Text>
            </View>
            {electorsTableData.map((item, index) => {
              const isTotalRow = item.category === 'TOTAL';
              return (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowEven,
                    isTotalRow && styles.totalRow
                  ]}
                >
                  <Text
                    style={[
                      styles.tableCellLeft,
                      { flex: 1.5, fontWeight: isTotalRow ? 'bold' : 'normal' }
                    ]}
                  >
                    {item.category}
                  </Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.men}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.women}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.thirdGender}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.total}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Show message if no election data is available */}
        {electorsTableData.length === 0 && basicInfoData.length === 0 && (
          <View style={styles.noDataContainer}>
            <Icon name="info" size={24} color="#95a5a6" />
            <Text style={styles.noDataText}>No election information available</Text>
          </View>
        )}
      </>
    );
  };

  const renderAssemblySegments = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3498db" />
          <Text style={styles.loadingText}>Loading assembly constituencies...</Text>
        </View>
      );
    }

    if (error && assemblyConstituencies.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="error" size={24} color="#e74c3c" />
          <Text style={styles.errorText}>Assembly constituency data not available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (assemblyConstituencies.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="info" size={24} color="#95a5a6" />
          <Text style={styles.errorText}>No assembly constituencies found</Text>
        </View>
      );
    }

    return (
      <View style={styles.segmentsList}>
        {assemblyConstituencies.map((segment, index) => (
          <View key={segment._id || segment.id || index} style={styles.segmentItem}>
            <View style={styles.segmentNumber}>
              <Text style={styles.segmentNumberText}>{segment.ac_number || index + 1}</Text>
            </View>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentName}>
                {segment.ac_name || segment.name || 'Unknown'}
              </Text>
              <View style={styles.segmentRightSection}>
                {segment.district && (
                  <Text style={styles.segmentDistrict}>
                    {segment.district}
                  </Text>
                )}
                {segment.type === 'SC' && (
                  <View style={styles.scBadge}>
                    <Text style={styles.scBadgeText}>SC</Text>
                  </View>
                )}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditAssemblyForm(segment)}
                    activeOpacity={0.7}
                  >
                    <Icon name="edit" size={12} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderGeographyCard = () => {
    if (!constituencyData?.geography) return null;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="public" size={20} color="#27ae60" />
          <Text style={styles.cardTitle}>Geography</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.overviewText}>
            {constituencyData.geography}
          </Text>
        </View>
      </View>
    );
  };

  const renderExternalLinks = () => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name="link" size={20} color="#9b59b6" />
        <Text style={styles.cardTitle}>External Links</Text>
      </View>
      <View style={styles.linksContainer}>
        {constituencyData?.eci_url && (
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink(constituencyData.eci_url)}
            activeOpacity={0.7}
          >
            <Icon name="account-balance" size={20} color="#e67e22" />
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Election Commission</Text>
              <Text style={styles.linkDescription}>Official ECI information</Text>
            </View>
            <Icon name="open-in-new" size={16} color="#3498db" />
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => openLink(`https://en.wikipedia.org/wiki/${(constituencyData?.const_name || '').replace(/ /g, '_')}_Lok_Sabha_constituency`)}
          activeOpacity={0.7}
        >
          <Icon name="public" size={20} color="#3498db" />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Wikipedia</Text>
            <Text style={styles.linkDescription}>Detailed information and history</Text>
          </View>
          <Icon name="open-in-new" size={16} color="#3498db" />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => openLink(`https://chanakyya.com/Parliament-Details/${(constituencyData?.const_name || '').replace(/ /g, '_')}`)}
          activeOpacity={0.7}
        >
          <Icon name="bar-chart" size={20} color="#f39c12" />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Chanakyya Election Data</Text>
            <Text style={styles.linkDescription}>Election statistics and analysis</Text>
          </View>
          <Icon name="open-in-new" size={16} color="#3498db" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEditModal = () => (
    <Modal
      visible={editModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={closeEditModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingConstituency ? 'Edit Constituency Profile' : 'Edit Assembly Constituency'}
            </Text>
            <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {editingConstituency ? renderConstituencyEditForm() : renderAssemblyEditForm()}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeEditModal}
              disabled={updateLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSubmitEdit}
              disabled={updateLoading}
              activeOpacity={0.7}
            >
              {updateLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderConstituencyEditForm = () => {
    const fields = [
      { key: 'const_name', label: 'Constituency Name', required: true },
      { key: 'const_no', label: 'Constituency Number', required: true },
      { key: 'state', label: 'State', required: true },
      { key: 'district', label: 'District', required: true },
      { key: 'constituency_type', label: 'Constituency Type' },
      { key: 'reservation_status', label: 'Reservation Status' },
      { key: 'established', label: 'Established Year' },
      { key: 'sitting_member', label: 'Current MP' },
      { key: 'member_party', label: 'Member Party' },
      { key: 'overview', label: 'Overview', multiline: true },
      { key: 'geography', label: 'Geography', multiline: true },
      { key: 'eci_url', label: 'ECI URL' },
      { key: 'assembly_segment_count', label: 'Assembly Segment Count' },
      { key: 'election_year', label: 'Election Year' },
      { key: 'electon_header', label: 'Election Header' },
      { key: 'total_no_voters_data', label: 'Total Voters' },
      { key: 'voter_trunout_ratio_data', label: 'Voter Turnout Ratio' },
      { key: 'polling_station_count', label: 'Polling Station Count' },
      { key: 'avg_no_electors_per_ps_data', label: 'Avg Electors per PS' }
    ];

    return (
      <View>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGroup}>
            <Text style={[styles.formLabel, field.required && styles.requiredLabel]}>
              {field.label}{field.required && ' *'}
            </Text>
            <TextInput
              style={[styles.formInput, field.multiline && styles.textArea]}
              value={editFormData[field.key] || ''}
              onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 4 : 1}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              placeholderTextColor="#bdc3c7"
            />
          </View>
        ))}
      </View>
    );
  };

  const renderAssemblyEditForm = () => {
    const fields = [
      { key: 'ac_number', label: 'Assembly Constituency Number', required: true },
      { key: 'ac_name', label: 'Assembly Constituency Name', required: true },
      { key: 'district', label: 'District', required: true },
      { key: 'type', label: 'Type (SC/General)' }
    ];

    return (
      <View>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGroup}>
            <Text style={[styles.formLabel, field.required && styles.requiredLabel]}>
              {field.label}{field.required && ' *'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={editFormData[field.key] || ''}
              onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              placeholderTextColor="#bdc3c7"
            />
          </View>
        ))}
      </View>
    );
  };

  const renderDeveloperInputModal = () => (
    <Modal
      visible={showDevInput}
      animationType="fade"
      transparent={true}
      onRequestClose={closeDevInput}
    >
      <View style={styles.devModalOverlay}>
        <View style={styles.devModalContent}>
          <View style={styles.devModalHeader}>
            <Text style={styles.devModalTitle}>Developer Access</Text>
            <TouchableOpacity onPress={closeDevInput} style={styles.closeButton}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.devModalBody}>
            <Icon name="developer-mode" size={48} color="#f39c12" style={styles.devIcon} />
            <Text style={styles.devModalDescription}>
              Enter developer code to enable admin features for testing:
            </Text>
            <TextInput
              style={styles.devInput}
              value={devInput}
              onChangeText={setDevInput}
              placeholder="Enter code..."
              placeholderTextColor="#bdc3c7"
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.devModalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeDevInput}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleDevInputSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Main loading state
  if (loading && !constituencyData) {
    return (
      <View style={styles.fullLoadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.fullLoadingText}>Loading constituency information...</Text>
        <Text style={styles.fullLoadingSubText}>
          {userRole === 'admin' ? 'Preparing admin features...' : 'Fetching data...'}
        </Text>
      </View>
    );
  }

  // Main error state
  if (error && !constituencyData) {
    return (
      <View style={styles.fullErrorContainer}>
        <Icon name="error" size={48} color="#e74c3c" />
        <Text style={styles.fullErrorTitle}>Unable to Load Data</Text>
        <Text style={styles.fullErrorText}>{error}</Text>
        <TouchableOpacity style={styles.fullRetryButton} onPress={initializeComponent}>
          <Icon name="refresh" size={16} color="#fff" />
          <Text style={styles.fullRetryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        {!regdMobileNo && (
          <TouchableOpacity 
            style={[styles.fullRetryButton, { backgroundColor: '#3498db', marginTop: 10 }]} 
            onPress={async () => {
              const mobile = await promptForMobileNumber();
              if (mobile) {
                setRegdMobileNo(mobile);
                await initializeComponent();
              }
            }}
          >
            <Icon name="phone" size={16} color="#fff" />
            <Text style={styles.fullRetryButtonText}>Enter Mobile Number</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#e16e2b']}
          tintColor="#e16e2b"
          title="Pull to refresh"
        />
      }
    >
      {renderHeader()}
      {renderInfoCards()}
      {renderGeographyCard()}

      {/* ECI Summary Data */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="how-to-vote" size={20} color="#e74c3c" />
          <Text style={styles.cardTitle}>ECI Summary Data</Text>
          {constituencyData?.eci_url && (
            <TouchableOpacity 
              onPress={() => openLink(constituencyData.eci_url)}
              style={styles.headerLinkButton}
              activeOpacity={0.7}
            >
              <Text style={styles.headerLinkText}>View ECI Data</Text>
              <Icon name="open-in-new" size={12} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardContent}>
          {renderElectionTable()}
        </View>
      </View>

      {/* Assembly Segments Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="ballot" size={20} color="#2980b9" />
          <Text style={styles.cardTitle}>Assembly Constituencies</Text>
          <View style={styles.assemblyCountBadge}>
            <Text style={styles.assemblyCountText}>{assemblyConstituencies.length}</Text>
          </View>
        </View>
        {renderAssemblySegments()}
      </View>

      {renderExternalLinks()}

      {/* Debug Info for Development */}
      {__DEV__ && (
        <View style={styles.debugCard}>
          <View style={styles.cardHeader}>
            <Icon name="bug-report" size={20} color="#95a5a6" />
            <Text style={styles.cardTitle}>Debug Info</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.debugText}>
              User Role: {userRole}{'\n'}
              Is Admin: {isAdmin ? 'Yes' : 'No'}{'\n'}
              Is Logged In: {isLoggedIn ? 'Yes' : 'No'}{'\n'}
              Mobile Number: {regdMobileNo || 'Not set'}{'\n'}
              Logged In Email: {loggedInEmail || 'Not set'}{'\n'}
              Owner Email: {ownerEmail || 'Not set'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer spacing */}
      <View style={styles.footer} />

      {/* Modals */}
      {renderEditModal()}
      {renderDeveloperInputModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  // Full screen loading/error states
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullLoadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  fullLoadingSubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  fullErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  fullErrorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fullRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fullRetryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Role Indicator Styles
  roleIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
  },
  roleIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  roleIndicatorText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },

  // Admin Edit Buttons
  headerEditButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  cardContent: {
    padding: 15,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    textAlign: 'left',
  },

  // Info Grid Styles
  infoGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 140,
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },

  // ECI URL Styles
  eciUrlContainer: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8f4f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  eciUrlText: {
    fontSize: 10,
    color: '#3498db',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Header Link Button Styles
  headerLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerLinkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },

  // Assembly Count Badge
  assemblyCountBadge: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  assemblyCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Table Styles
  tableContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  tableSubHeader: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableSubHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
  },
  tableHeaderText: {
    flex: 1,
    padding: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableRowEven: {
    backgroundColor: '#f8f9fa',
  },
  totalRow: {
    backgroundColor: '#ecf0f1',
  },
  tableCellLeft: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tableCellRight: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'right',
  },
  tableCellCenter: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Assembly Segments Styles
  segmentsList: {
    padding: 15,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  segmentNumber: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  segmentNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
  },
  segmentRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDistrict: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  scBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Loading and Error Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#7f8c8d',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  noDataText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Links Styles
  linksContainer: {
    padding: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkContent: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  linkDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Form Styles
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  requiredLabel: {
    color: '#e74c3c',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Developer Modal Styles
  devModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  devModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  devModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  devModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  devIcon: {
    marginBottom: 15,
  },
  devModalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  devInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    textAlign: 'center',
    width: '100%',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },

  // Debug Card Styles
  debugCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'monospace',
  },

  // Footer
  footer: {
    height: 30,
  },
});

export default AboutConstituencyScreen;