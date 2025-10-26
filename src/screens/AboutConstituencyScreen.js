import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Image,
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
import styles from '../styles/AboutConstituencystyle';

// Add this after your imports and before ConstituencyLoggingService
class ImageService {
  static async normalizeImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'placeholder' || imageUrl === 'none') {
      console.log('⚠️ No valid image URL provided');
      return null;
    }
    
    try {
      // If it's already a full URL, normalize it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        let normalizedUrl = imageUrl;
        
        // Remove port from ngrok URLs (ngrok doesn't use ports in URLs)
        if (normalizedUrl.includes('ngrok-free.app:')) {
          normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
          ConstituencyLoggingService.constInfo('🔧 Removed port from ngrok URL', normalizedUrl);
        }
        
        // Replace localhost with current base URL
        if (normalizedUrl.includes('localhost:5000') || normalizedUrl.includes('localhost:')) {
          const baseUrl = await ConfigService.getBaseUrl();
          normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          ConstituencyLoggingService.constInfo('🔧 Replaced localhost with base URL', normalizedUrl);
        }
        
        return normalizedUrl;
      }
      
      // For relative paths, construct full URL
      const baseUrl = await ConfigService.getBaseUrl();
      const cleanPath = imageUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const filename = cleanPath.split('/').pop();
      
      // Try different possible paths
      const possibleUrls = [
        `${baseUrl}/constituency/${filename}`,
        `${baseUrl}/uploads/constituency/${filename}`,
        `${baseUrl}/${cleanPath}`,
      ];
      
      ConstituencyLoggingService.constDebug('🔍 Possible member image URLs', possibleUrls);
      return possibleUrls[0]; // Return first possible URL
      
    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error normalizing image URL', error);
      return null;
    }
  }
}
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

  const [sectionDropdowns, setSectionDropdowns] = useState({});
  const [sectionDropdownPositions, setSectionDropdownPositions] = useState({});
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });


  const showSectionDropdown = (sectionKey, event) => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required');
      return;
    }

    const { pageX, pageY } = event.nativeEvent;

    setSectionDropdownPositions(prev => ({
      ...prev,
      [sectionKey]: { x: pageX - 120, y: pageY + 10 }
    }));

    setSectionDropdowns(prev => ({
      ...prev,
      [sectionKey]: true
    }));
  };

  const handleSectionDropdownAction = (sectionKey, action) => {
    setSectionDropdowns(prev => ({
      ...prev,
      [sectionKey]: false
    }));

    switch (action) {
      case 'edit':
        openEditSection(sectionKey);
        break;
      case 'delete':
        handleDeleteSection(sectionKey);
        break;
      default:
        break;
    }
  };


  const [editSections, setEditSections] = useState({
    generalInfo: false,
    eciSummary: false,
    electorsBreakdown: false
  });

  const [editFormSections, setEditFormSections] = useState({
    generalInfo: {},
    eciSummary: {},
    electorsBreakdown: {}
  });


  const [addAssemblyModalVisible, setAddAssemblyModalVisible] = useState(false);
  const [assemblyFormList, setAssemblyFormList] = useState([
    { ac_number: '', ac_name: '', district: '', type: '' }
  ]); // Array to hold multiple constituencies
  const [saveLoading, setSaveLoading] = useState(false);
  // Add these with your other state declarations at the top
  const [editAssemblyModalVisible, setEditAssemblyModalVisible] = useState(false);
  const [currentAssemblyIndex, setCurrentAssemblyIndex] = useState(0);
  const [editingAssemblyData, setEditingAssemblyData] = useState({
    ac_number: '',
    ac_name: '',
    district: '',
    type: ''
  });
  const [assemblyEditLoading, setAssemblyEditLoading] = useState(false);
  const [editAssemblyFormList, setEditAssemblyFormList] = useState([]);
  const [isAddingMoreInEdit, setIsAddingMoreInEdit] = useState(false);
  // Add new constituency form to the list
  const handleAddMoreConstituency = () => {
    setAssemblyFormList([
      ...assemblyFormList,
      { ac_number: '', ac_name: '', district: '', type: '' }
    ]);
  };

  // ✅ ADD MORE CONSTITUENCY IN EDIT MODE
  const handleAddMoreInEdit = () => {
    setIsAddingMoreInEdit(true);
    setEditAssemblyFormList([
      { ac_number: '', ac_name: '', district: '', type: '' }
    ]);
  };

  // ✅ UPDATE EDIT FORM LIST
  const handleEditAssemblyFormListChange = (index, field, value) => {
    const updatedList = [...editAssemblyFormList];
    updatedList[index][field] = value;
    setEditAssemblyFormList(updatedList);
  };

  // ✅ ADD MORE FORM TO EDIT LIST
  const handleAddMoreToEditList = () => {
    setEditAssemblyFormList([
      ...editAssemblyFormList,
      { ac_number: '', ac_name: '', district: '', type: '' }
    ]);
  };

  // ✅ REMOVE FROM EDIT LIST
  const handleRemoveFromEditList = (index) => {
    if (editAssemblyFormList.length === 1) {
      Alert.alert('Cannot Remove', 'At least one constituency form is required');
      return;
    }
    const updatedList = editAssemblyFormList.filter((_, i) => i !== index);
    setEditAssemblyFormList(updatedList);
  };

  // ✅ CANCEL ADD MORE IN EDIT
  const handleCancelAddMoreInEdit = () => {
    setIsAddingMoreInEdit(false);
    setEditAssemblyFormList([]);
  };


  // Update specific constituency in the list
  const handleAssemblyFormListChange = (index, field, value) => {
    const updatedList = [...assemblyFormList];
    updatedList[index][field] = value;
    setAssemblyFormList(updatedList);
  };

  // Remove constituency from the list
  const handleRemoveConstituency = (index) => {
    if (assemblyFormList.length === 1) {
      Alert.alert('Cannot Remove', 'At least one constituency form is required');
      return;
    }
    const updatedList = assemblyFormList.filter((_, i) => i !== index);
    setAssemblyFormList(updatedList);
  };
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

    const baseUrl = await ConfigService.getBaseUrl();
    ConstituencyLoggingService.constInfo('🌐 Using base URL:', baseUrl);

    // Get email for API call - DECLARE OUTSIDE TO AVOID SCOPE ISSUES
    let emailToUse = loggedInEmail || ownerEmail;

    if (!emailToUse) {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          emailToUse = appOwnerInfo.email || appOwnerInfo.user_email || appOwnerInfo.emailId || '';
        }
      } catch (error) {
        ConstituencyLoggingService.constError('Error getting email from AppOwnerInfo', error);
      }
    }

    if (!emailToUse) {
      ConstituencyLoggingService.constWarn('No email found, using placeholder');
      emailToUse = 'sanjay.jaiswal@gmail.com';
    }

    // ========== FETCH CONSTITUENCY PROFILE (NEW) ==========
    const constituencyUrl = `${baseUrl}/api/constituencyprofile/?leader_regd_mobile_no=${mobileNo}&user_email_id=${encodeURIComponent(emailToUse)}`;

    ConstituencyLoggingService.constInfo('Fetching constituency profile from:', constituencyUrl);

    // Use authGet since this requires authentication
    const constituencyResult = await ApiService.authGet(constituencyUrl);

    if (constituencyResult.success && constituencyResult.data) {
      const constituencyProfileData = constituencyResult.data.constitency_profile || 
                                      constituencyResult.data.constituency_profile || 
                                      constituencyResult.data;

      // ✅ NORMALIZE MEMBER IMAGE URL IF PRESENT
      if (constituencyProfileData.member_image && 
          constituencyProfileData.member_image !== 'none' && 
          constituencyProfileData.member_image !== 'placeholder') {
        const originalImageUrl = constituencyProfileData.member_image;
        ConstituencyLoggingService.constInfo('🖼️ Original member image URL:', originalImageUrl);
        
        try {
          const normalizedImageUrl = await ImageService.normalizeImageUrl(originalImageUrl);
          if (normalizedImageUrl) {
            ConstituencyLoggingService.constInfo('✅ Normalized member image URL:', normalizedImageUrl);
            constituencyProfileData.member_image = normalizedImageUrl;
          } else {
            ConstituencyLoggingService.constWarn('⚠️ Could not normalize member image URL');
          }
        } catch (imageError) {
          ConstituencyLoggingService.constError('❌ Error normalizing member image:', imageError);
        }
      }

      ConstituencyLoggingService.constInfo('✅ Constituency profile fetched successfully');
      setConstituencyData(constituencyProfileData);
    } else {
      ConstituencyLoggingService.constWarn('⚠️ No constituency profile found, using mock data');
      // Set empty/mock data if no profile exists
      setConstituencyData({
        const_name: 'Constituency Information',
        const_no: '',
        state: '',
        district: '',
        constituency_type: 'Lok Sabha',
        reservation_status: '',
        established: '',
        sitting_member: '',
        member_party: '',
        assembly_segment_count: '',
        overview: '',
        geography: '',
        eci_url: '',
        member_image: null
      });
    }

    // ========== FETCH ASSEMBLY CONSTITUENCIES ==========
    const assemblyUrl = `${baseUrl}/api/assemblyconstituencies/?leader_regd_mobile_no=${mobileNo}&user_email_id=${encodeURIComponent(emailToUse)}`;

    ConstituencyLoggingService.constInfo('Fetching assembly constituencies from:', assemblyUrl);

    const assemblyResult = await ApiService.authGet(assemblyUrl);

    if (assemblyResult.success) {
      const assemblyData = assemblyResult.data;
      let constituencies = [];

      if (assemblyData && assemblyData.assembly_constituencies) {
        constituencies = assemblyData.assembly_constituencies.assembly_const || [];
      } else if (assemblyData && Array.isArray(assemblyData.assembly_const)) {
        constituencies = assemblyData.assembly_const;
      } else if (Array.isArray(assemblyData)) {
        constituencies = assemblyData;
      }

      ConstituencyLoggingService.constInfo('✅ Assembly constituencies fetched', { count: constituencies.length });
      setAssemblyConstituencies(constituencies);
    } else {
      ConstituencyLoggingService.constWarn('⚠️ Failed to fetch assembly constituencies');
      setAssemblyConstituencies([]);
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

  // ADD THIS NEW FUNCTION
  const openMasterEditForm = () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required for editing');
      return;
    }

    if (!constituencyData) {
      Alert.alert('No Data', 'No constituency data available to edit');
      return;
    }

    ConstituencyLoggingService.constInfo('📝 Opening master constituency edit form');

    // Combine all sections into one form
    const allSections = getFieldSections();
    const masterFormData = {};

    Object.keys(allSections).forEach(sectionKey => {
      const section = allSections[sectionKey];
      section.fields.forEach(field => {
        masterFormData[field.key] = constituencyData[field.key] || '';
      });
    });

    setEditFormData(masterFormData);
    setEditingConstituency(true);
    setEditingAssembly(false);
    setEditModalVisible(true);
  };

  // ADD THIS NEW FUNCTION
  const renderConstituencyEditForm = () => {
    const allSections = getFieldSections();
    const allFields = [];

    // Combine all fields from all sections
    Object.keys(allSections).forEach(sectionKey => {
      const section = allSections[sectionKey];
      allFields.push({
        sectionTitle: section.title,
        sectionColor: section.color,
        fields: section.fields
      });
    });

    return (
      <View>
        {allFields.map((section, sectionIndex) => (
          <View key={sectionIndex}>
            <View style={[{
              backgroundColor: section.sectionColor,
              padding: 12,
              marginVertical: 8,
              borderRadius: 8,
            }]}>
              <Text style={{
                color: '#fff',
                fontSize: 16,
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {section.sectionTitle}
              </Text>
            </View>

            {section.fields.map((field) => (
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
        ))}
      </View>
    );
  };

  // Add these new functions after handleDevInputSubmit
  const getFieldSections = () => ({
    generalInfo: {
      title: 'General Information & Geography',
      icon: 'info',
      color: '#e16e2b',
      fields: [
        { key: 'const_name', label: 'Constituency Name', required: true },
        { key: 'const_no', label: 'Constituency Number', required: true },
        { key: 'state', label: 'State', required: true },
        { key: 'district', label: 'District', required: true },
        { key: 'constituency_type', label: 'Constituency Type' },
        { key: 'reservation_status', label: 'Reservation Status' },
        { key: 'established', label: 'Established Year' },
        { key: 'sitting_member', label: 'Current MP' },
        { key: 'member_party', label: 'Member Party' },
        { key: 'assembly_segment_count', label: 'Assembly Segment Count' },
        { key: 'overview', label: 'Overview', multiline: true },
        { key: 'geography', label: 'Geography', multiline: true },
        { key: 'eci_url', label: 'ECI URL' }
      ]
    },
    eciSummary: {
      title: 'ECI Summary Data',
      icon: 'how-to-vote',
      color: '#e16e2b',
      fields: [
        { key: 'election_year', label: 'Election Year' },
        { key: 'electon_header', label: 'Election Header' },
        { key: 'total_no_voters_data', label: 'Total Voters' },
        { key: 'voter_trunout_ratio_data', label: 'Voter Turnout Ratio' },
        { key: 'polling_station_count', label: 'Polling Station Count' },
        { key: 'avg_no_electors_per_ps_data', label: 'Avg Electors per PS' }
      ]
    },
    electorsBreakdown: {
      title: 'Electors Breakdown',
      icon: 'bar-chart',
      color: '#e16e2b',
      fields: [
        { key: 'electors_general_male_data', label: 'General Male Electors' },
        { key: 'electors_general_female_data', label: 'General Female Electors' },
        { key: 'electors_general_tg_data', label: 'General Third Gender' },
        { key: 'electors_general_total_data', label: 'General Total' },
        { key: 'electors_overseas_male_data', label: 'Overseas Male Electors' },
        { key: 'electors_overseas_female_data', label: 'Overseas Female Electors' },
        { key: 'electors_overseas_tg_data', label: 'Overseas Third Gender' },
        { key: 'electors_overseas_total_data', label: 'Overseas Total' },
        { key: 'electors_service_male_data', label: 'Service Male Electors' },
        { key: 'electors_service_female_data', label: 'Service Female Electors' },
        { key: 'electors_service_tg_data', label: 'Service Third Gender' },
        { key: 'electors_service_total_data', label: 'Service Total' },
        { key: 'electors_total_male_data', label: 'Total Male Electors' },
        { key: 'electors_total_female_data', label: 'Total Female Electors' },
        { key: 'electors_total_tg_data', label: 'Total Third Gender' },
        { key: 'electors_grand_total_data', label: 'Grand Total Electors' }
      ]
    }
  });

  const openEditSection = (sectionKey) => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required for editing');
      return;
    }

    if (!constituencyData) {
      Alert.alert('No Data', 'No constituency data available to edit');
      return;
    }

    const sections = getFieldSections();
    const section = sections[sectionKey];

    if (!section) {
      Alert.alert('Error', 'Section not found');
      return;
    }

    ConstituencyLoggingService.constInfo(`📝 Opening ${section.title} edit form`);

    const sectionFormData = {};
    section.fields.forEach(field => {
      sectionFormData[field.key] = constituencyData[field.key] || '';
    });

    setEditFormSections(prev => ({
      ...prev,
      [sectionKey]: sectionFormData
    }));

    setEditSections(prev => ({
      ...prev,
      [sectionKey]: true
    }));

    setEditModalVisible(true);
  };

  const closeEditSection = (sectionKey) => {
    setEditSections(prev => ({
      ...prev,
      [sectionKey]: false
    }));

    setEditFormSections(prev => ({
      ...prev,
      [sectionKey]: {}
    }));

    const hasOpenSections = Object.values({
      ...editSections,
      [sectionKey]: false
    }).some(isOpen => isOpen);

    if (!hasOpenSections) {
      setEditModalVisible(false);
    }
  };

  const handleSectionFormChange = (sectionKey, fieldKey, value) => {
    setEditFormSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [fieldKey]: value
      }
    }));
  };

  const handleUpdateSection = async (sectionKey) => {
    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not found. Please refresh the screen.');
      return;
    }

    setUpdateLoading(true);

    try {
      const sections = getFieldSections();
      const section = sections[sectionKey];
      const sectionData = editFormSections[sectionKey];

      ConstituencyLoggingService.constInfo(
        `🔄 === UPDATING ${section.title.toUpperCase()} ===`,
        { mobileNo: regdMobileNo }
      );

      // Clean form data
      const cleanedFormData = {};
      Object.keys(sectionData).forEach((key) => {
        const value = sectionData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });

      if (Object.keys(cleanedFormData).length === 0) {
        Alert.alert('Nothing to update', 'Please modify at least one field.');
        setUpdateLoading(false);
        return;
      }

      const baseUrl = await ConfigService.getBaseUrl();

      // Get email
      let emailToUse = loggedInEmail || ownerEmail;
      if (!emailToUse) {
        try {
          const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
          if (appOwnerInfoStr) {
            const appOwnerInfo = JSON.parse(appOwnerInfoStr);
            emailToUse = appOwnerInfo.email || appOwnerInfo.user_email || appOwnerInfo.emailId || '';
          }
        } catch (error) {
          ConstituencyLoggingService.constError('Error getting email', error);
        }
      }

      // ⚡ Corrected payload matching backend
      const requestPayload = {
        user_email_id: emailToUse || 'sanjay.jaiswal@gmail.com',
        leader_regd_mobile_no: regdMobileNo,
        constitency_profile: {  // match spelling exactly
          regd_mobile_no: regdMobileNo,
          ...cleanedFormData,   // flatten the section
        },
      };

      ConstituencyLoggingService.constDebug('Section update payload prepared', {
        section: section.title,
        payload: requestPayload,
      });

      // PUT API call
      const result = await ApiService.authPut(
        `${baseUrl}/api/constituencyprofile/`,
        requestPayload,
        {
          'x-user-id': emailToUse || 'admin_user',
          'x-user-role': userRole,
        }
      );

      console.log('PUT API Response:', result);

      if (!result.success) {
        throw new Error(result.message || `Failed to update ${section.title}`);
      }

      ConstituencyLoggingService.constInfo(`✅ ${section.title} updated successfully`);

      // Update local state
      if (result.data?.constitency_profile) {
        setConstituencyData(result.data.constitency_profile);
      } else if (result.data) {
        setConstituencyData(result.data);
      }

      closeEditSection(sectionKey);
      await fetchConstituencyData(regdMobileNo);

      Alert.alert('Success', `${section.title} updated successfully!`);
    } catch (error) {
      ConstituencyLoggingService.constError(`❌ Error updating ${sectionKey}`, error);
      Alert.alert('Update Failed', `Failed to update section: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };



  // 1. ADD THESE NEW FUNCTIONS after handleUpdateSection function:

  const handleDeleteSection = async (sectionKey) => {
    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not found. Please refresh the screen.');
      return;
    }

    const sections = getFieldSections();
    const section = sections[sectionKey];

    if (!section) {
      Alert.alert('Error', 'Section not found');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      `Delete ${section.title}`,
      `Are you sure you want to delete ${section.title} data? This action cannot be undone.`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Delete',
          style: 'destructive',
          onPress: async () => {
            // ✅ Call the updated performSectionDelete with useDeleteAPI = true
            await performSectionDelete(sectionKey, section, true);
          },
        },
      ]
    );
  };


  const performSectionDelete = async (sectionKey, section, useDeleteAPI = true) => {
    setUpdateLoading(true);
    try {
      const baseUrl = await ConfigService.getBaseUrl();

      // Get email for request
      let emailToUse = loggedInEmail || ownerEmail;
      if (!emailToUse) {
        try {
          const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
          if (appOwnerInfoStr) {
            const appOwnerInfo = JSON.parse(appOwnerInfoStr);
            emailToUse = appOwnerInfo.email || appOwnerInfo.user_email || appOwnerInfo.emailId || '';
          }
        } catch (error) {
          ConstituencyLoggingService.constError('Error getting email', error);
        }
      }

      if (useDeleteAPI) {
        // ✅ Call actual DELETE API with query params
        ConstituencyLoggingService.constInfo(`🗑️ === CALLING DELETE API FOR ${section.title.toUpperCase()} ===`, {
          mobileNo: regdMobileNo,
          section: sectionKey,
        });

        const deleteUrl = `${baseUrl}/api/constituencyprofile?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(emailToUse || 'sanjay.jaiswal@gmail.com')}`;

        const result = await ApiService.authDelete(
          deleteUrl,
          {}, // DELETE body can be empty
          {
            'x-user-id': emailToUse || 'admin_user',
            'x-user-role': userRole,
          }
        );

        if (!result.success) {
          throw new Error(result.message || `Failed to delete ${section.title}`);
        }

        ConstituencyLoggingService.constInfo(`✅ ${section.title} deleted successfully via DELETE API`);
      } else {
        // ⚡ Optional: fallback to clearing fields via PUT (existing logic)
        ConstituencyLoggingService.constInfo(`🗑️ === DELETING ${section.title.toUpperCase()} SECTION (PUT EMPTY) ===`, {
          mobileNo: regdMobileNo,
          section: sectionKey
        });

        const sectionFieldsToDelete = {};
        section.fields.forEach(field => {
          sectionFieldsToDelete[field.key] = '';
        });

        const requestPayload = {
          user_email_id: emailToUse || 'sanjay.jaiswal@gmail.com',
          constitency_profile: {
            regd_mobile_no: regdMobileNo,
            ...sectionFieldsToDelete
          }
        };

        const result = await ApiService.authPut(
          `${baseUrl}/api/constituencyprofile/${regdMobileNo}`,
          requestPayload,
          {
            'x-user-id': emailToUse || 'admin_user',
            'x-user-role': userRole,
          }
        );

        if (!result.success) {
          throw new Error(`Failed to delete ${section.title}: ${result.message}`);
        }

        ConstituencyLoggingService.constInfo(`✅ ${section.title} section cleared successfully`);
      }

      // Update local state
      const updatedData = { ...constituencyData };
      section.fields.forEach(field => updatedData[field.key] = '');
      setConstituencyData(updatedData);

      // Refresh data from server
      await fetchConstituencyData(regdMobileNo);

      Alert.alert('Success', `${section.title} data deleted successfully!`);

    } catch (error) {
      ConstituencyLoggingService.constError(`❌ Error deleting ${section.title}`, error);
      Alert.alert('Delete Failed', `Failed to delete ${section.title}: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };


  const closeDevInput = () => {
    setShowDevInput(false);
    setDevInput('');
  };

  // Admin Edit Functions (enhanced with proper error handling)
  /* const openEditConstituencyForm = () => {
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
   };*/

  const openEditAssemblyForm = () => {
    if (!isAdmin) {
      Alert.alert('Access Denied', 'Admin privileges required for editing');
      return;
    }

    if (!assemblyConstituencies || assemblyConstituencies.length === 0) {
      Alert.alert('No Data', 'No assembly constituencies found to edit.');
      return;
    }

    // Start with the first assembly entry
    setCurrentAssemblyIndex(0);
    setEditingAssemblyData({
      ac_number: assemblyConstituencies[0].ac_number || '',
      ac_name: assemblyConstituencies[0].ac_name || '',
      district: assemblyConstituencies[0].district || '',
      type: assemblyConstituencies[0].type || ''
    });

    // ✅ INITIALIZE EMPTY FORM LIST FOR "ADD MORE"
    setEditAssemblyFormList([]);
    setIsAddingMoreInEdit(false);

    setEditAssemblyModalVisible(true);
  };

  const navigateAssembly = (direction) => {
    if (!assemblyConstituencies || !Array.isArray(assemblyConstituencies)) return;

    let newIndex;
    if (direction === 'next') {
      newIndex = currentAssemblyIndex < assemblyConstituencies.length - 1 ?
        currentAssemblyIndex + 1 : 0;
    } else {
      newIndex = currentAssemblyIndex > 0 ?
        currentAssemblyIndex - 1 : assemblyConstituencies.length - 1;
    }

    setCurrentAssemblyIndex(newIndex);
    setEditingAssemblyData({
      ac_number: assemblyConstituencies[newIndex].ac_number || '',
      ac_name: assemblyConstituencies[newIndex].ac_name || '',
      district: assemblyConstituencies[newIndex].district || '',
      type: assemblyConstituencies[newIndex].type || ''
    });
  };

  const handleAssemblyInputChange = (field, value) => {
    setEditingAssemblyData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveCurrentAssembly = async () => {
    try {
      // ✅ CHECK IF WE'RE ADDING NEW CONSTITUENCIES
      if (isAddingMoreInEdit && editAssemblyFormList.length > 0) {
        // Validate all forms
        for (let i = 0; i < editAssemblyFormList.length; i++) {
          const form = editAssemblyFormList[i];
          if (!form.ac_number || !form.ac_name || !form.district) {
            Alert.alert(
              'Validation Error',
              `Please fill in all required fields for Constituency ${i + 1}`
            );
            return;
          }
        }

        setAssemblyEditLoading(true);

        if (!regdMobileNo) {
          Alert.alert('Error', 'Mobile number not available.');
          return;
        }

        const baseUrl = await ConfigService.getBaseUrl();

        // Convert form list to clean assembly objects
        const newAssemblies = editAssemblyFormList.map(form => ({
          ac_number: parseInt(form.ac_number),
          ac_name: form.ac_name.trim(),
          district: form.district.trim(),
          ...(form.type && form.type.trim() && { type: form.type.trim() })
        }));

        // Combine existing + new
        const allConstituencies = [
          ...assemblyConstituencies.map(ac => ({
            ac_number: parseInt(ac.ac_number),
            ac_name: ac.ac_name,
            district: ac.district,
            ...(ac.type && { type: ac.type })
          })),
          ...newAssemblies
        ];

        const result = await ApiService.authPut(
          `${baseUrl}/api/assemblyconstituencies/`,
          {
            leader_regd_mobile_no: regdMobileNo,
            user_email_id: loggedInEmail || ownerEmail,
            assembly_constituencies: {
              narration: "Updated assembly constituencies",
              assembly_const_count: allConstituencies.length,
              assembly_const: allConstituencies
            }
          },
          {
            'x-user-id': loggedInEmail || 'admin_user',
            'x-user-role': userRole,
          }
        );

        if (result.success) {
          Alert.alert(
            'Success',
            `${newAssemblies.length} new ${newAssemblies.length === 1 ? 'constituency' : 'constituencies'} added successfully!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setIsAddingMoreInEdit(false);
                  setEditAssemblyFormList([]);
                  fetchConstituencyData(regdMobileNo);
                }
              }
            ]
          );
        } else {
          throw new Error(result.message || 'Failed to add constituencies');
        }

        setAssemblyEditLoading(false);
        return;
      }

      // ✅ ORIGINAL LOGIC - EDITING EXISTING CONSTITUENCY
      if (!editingAssemblyData.ac_number.toString().trim()) {
        Alert.alert('Validation Error', 'Please enter AC number');
        return;
      }
      if (!editingAssemblyData.ac_name.trim()) {
        Alert.alert('Validation Error', 'Please enter AC name');
        return;
      }
      if (!editingAssemblyData.district.trim()) {
        Alert.alert('Validation Error', 'Please enter district');
        return;
      }

      setAssemblyEditLoading(true);

      if (!regdMobileNo) {
        Alert.alert('Error', 'Mobile number not available.');
        return;
      }

      const baseUrl = await ConfigService.getBaseUrl();

      const updatedAssemblyConstituencies = assemblyConstituencies.map((assembly, index) => {
        if (index === currentAssemblyIndex) {
          return {
            ...assembly,
            ac_number: parseInt(editingAssemblyData.ac_number),
            ac_name: editingAssemblyData.ac_name.trim(),
            district: editingAssemblyData.district.trim(),
            ...(editingAssemblyData.type && { type: editingAssemblyData.type.trim() })
          };
        }
        return assembly;
      });

      const result = await ApiService.authPut(
        `${baseUrl}/api/assemblyconstituencies/`,
        {
          leader_regd_mobile_no: regdMobileNo,
          user_email_id: loggedInEmail || ownerEmail,
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
        },
        {
          'x-user-id': loggedInEmail || 'admin_user',
          'x-user-role': userRole,
        }
      );

      if (result.success) {
        Alert.alert('Success', 'Assembly constituency updated successfully!', [
          {
            text: 'OK',
            onPress: () => {
              fetchConstituencyData(regdMobileNo);
            }
          }
        ]);
      } else {
        throw new Error(result.message || 'Failed to update assembly constituency');
      }

    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error in saveCurrentAssembly', error);
      Alert.alert('Save Failed', `Failed to save: ${error.message}`);
    } finally {
      setAssemblyEditLoading(false);
    }
  };

  const deleteCurrentAssembly = async () => {
    const currentAssemblyEntry = assemblyConstituencies[currentAssemblyIndex];

    Alert.alert(
      'Delete Assembly Constituency',
      `Are you sure you want to delete this assembly constituency?\n\n${editingAssemblyData.ac_name}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssemblyEditLoading(true);

              if (!regdMobileNo) {
                Alert.alert('Error', 'Mobile number not available. Please try refreshing the screen.');
                return;
              }

              const baseUrl = await ConfigService.getBaseUrl();

              // Remove the current assembly from the array
              const updatedAssemblyConstituencies = assemblyConstituencies.filter(
                (_, index) => index !== currentAssemblyIndex
              );

              const result = await ApiService.authPut(
                `${baseUrl}/api/assemblyconstituencies/`,
                {
                  leader_regd_mobile_no: regdMobileNo,
                  user_email_id: loggedInEmail || ownerEmail,
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
                },
                {
                  'x-user-id': loggedInEmail || 'admin_user',
                  'x-user-role': userRole,
                }
              );

              if (result.success) {
                Alert.alert('Success', 'Assembly constituency deleted successfully!', [
                  {
                    text: 'OK',
                    onPress: () => {
                      if (updatedAssemblyConstituencies.length === 0) {
                        setEditAssemblyModalVisible(false);
                      } else {
                        const newIndex = currentAssemblyIndex >= updatedAssemblyConstituencies.length ?
                          0 : currentAssemblyIndex;
                        setCurrentAssemblyIndex(newIndex);
                      }
                      fetchConstituencyData(regdMobileNo);
                    }
                  }
                ]);
              } else {
                throw new Error(result.message || 'Failed to delete assembly constituency');
              }

            } catch (error) {
              ConstituencyLoggingService.constError('❌ Error deleting assembly constituency', error);
              Alert.alert('Delete Failed', `Failed to delete assembly constituency: ${error.message}`);
            } finally {
              setAssemblyEditLoading(false);
            }
          }
        }
      ]
    );
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

      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });

      const baseUrl = await ConfigService.getBaseUrl();
      const requestPayload = {
        constitency_profile: cleanedFormData
      };

      // ✅ CORRECT: No mobile number in URL path
      const result = await ApiService.authPut(
        `${baseUrl}/api/constituencyprofile`,  // Just the base endpoint
        requestPayload,
        {
          'x-user-id': emailToUse || 'admin_user',
          'x-user-role': userRole,
        }
      );

      if (!result.success) {
        throw new Error(`Failed to update constituency profile: ${result.message}`);
      }

      ConstituencyLoggingService.constInfo('✅ Constituency profile updated successfully');

      if (result.data && result.data.constituency_profile) {
        setConstituencyData(result.data.constituency_profile);
      } else if (result.data && result.data.constitency_profile) {
        setConstituencyData(result.data.constitency_profile);
      } else if (result.data) {
        setConstituencyData(result.data);
      }

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

      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });

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

      const baseUrl = await ConfigService.getBaseUrl();

      const result = await ApiService.authPut(
        `${baseUrl}/api/assemblyconstituencies/`,
        {
          leader_regd_mobile_no: regdMobileNo,
          user_email_id: loggedInEmail || ownerEmail,
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
        },
        {
          'x-user-id': loggedInEmail || 'admin_user',
          'x-user-role': userRole,
        }
      );

      if (!result.success) {
        throw new Error(`Failed to update assembly constituency: ${result.message}`);
      }

      ConstituencyLoggingService.constInfo('✅ Assembly constituency updated successfully');
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


  const handleAddNewAssembly = async () => {
    // Validate all forms in the list
    for (let i = 0; i < assemblyFormList.length; i++) {
      const form = assemblyFormList[i];
      if (!form.ac_number || !form.ac_name || !form.district) {
        Alert.alert(
          'Validation Error',
          `Please fill in all required fields for Constituency ${i + 1} (AC Number, AC Name, and District)`
        );
        return;
      }
    }

    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not found. Please refresh the screen.');
      return;
    }

    setSaveLoading(true);
    try {
      ConstituencyLoggingService.constInfo('➕ === ADDING MULTIPLE ASSEMBLY CONSTITUENCIES ===', {
        mobileNo: regdMobileNo,
        count: assemblyFormList.length
      });

      // Get email
      let emailToUse = loggedInEmail || ownerEmail;

      if (!emailToUse) {
        try {
          const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
          if (appOwnerInfoStr) {
            const appOwnerInfo = JSON.parse(appOwnerInfoStr);
            emailToUse = appOwnerInfo.email || appOwnerInfo.user_email || appOwnerInfo.emailId || '';
          }
        } catch (error) {
          ConstituencyLoggingService.constError('Error getting email', error);
        }
      }

      if (!emailToUse) {
        throw new Error('Email is required for this operation');
      }

      const baseUrl = await ConfigService.getBaseUrl();

      // Convert form list to clean assembly objects
      const newAssemblies = assemblyFormList.map(form => {
        const assembly = {
          ac_number: parseInt(form.ac_number),
          ac_name: form.ac_name.trim(),
          district: form.district.trim()
        };

        if (form.type && form.type.trim()) {
          assembly.type = form.type.trim();
        }

        return assembly;
      });

      // Combine existing + new assemblies
      const allConstituencies = [
        ...assemblyConstituencies.map(ac => ({
          ac_number: parseInt(ac.ac_number),
          ac_name: ac.ac_name,
          district: ac.district,
          ...(ac.type && { type: ac.type })
        })),
        ...newAssemblies
      ];

      // Prepare payload
      const requestPayload = {
        user_email_id: emailToUse,
        assembly_constituencies: {
          regd_mobile_no: regdMobileNo,
          narration: "This PC comprises the following ACs:",
          assembly_const_count: allConstituencies.length,
          assembly_const: allConstituencies
        }
      };

      ConstituencyLoggingService.constDebug('Add assemblies request payload', {
        url: `${baseUrl}/api/assemblyconstituencies`,
        email: emailToUse,
        mobile: regdMobileNo,
        totalACs: allConstituencies.length,
        newACs: newAssemblies.length
      });

      // Check if data exists
      const checkResult = await ApiService.authGet(
        `${baseUrl}/api/assemblyconstituencies/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(emailToUse)}`
      );

      let result;

      if (checkResult.success && checkResult.data &&
        (checkResult.data.assembly_constituencies || Array.isArray(checkResult.data))) {
        // Data exists - use PUT
        ConstituencyLoggingService.constInfo('Assembly data exists, using PUT to update');
        result = await ApiService.authPut(
          `${baseUrl}/api/assemblyconstituencies/`,
          {
            leader_regd_mobile_no: regdMobileNo,
            user_email_id: emailToUse,
            assembly_constituencies: {
              narration: "This PC comprises the following ACs:",
              assembly_const_count: allConstituencies.length,
              assembly_const: allConstituencies
            }
          },
          {
            'x-user-id': emailToUse,
            'x-user-role': userRole,
          }
        );
      } else {
        // No existing data - use POST
        ConstituencyLoggingService.constInfo('No assembly data found, using POST to create');
        result = await ApiService.authPost(
          `${baseUrl}/api/assemblyconstituencies`,
          requestPayload,
          {
            'x-user-id': emailToUse,
            'x-user-role': userRole,
          }
        );
      }

      if (!result.success) {
        throw new Error(result.message || `Server returned status ${result.status}`);
      }

      ConstituencyLoggingService.constInfo(
        `✅ ${newAssemblies.length} assembly constituencies added successfully`
      );

      // Reset form list and close modal
      setAssemblyFormList([
        { ac_number: '', ac_name: '', district: '', type: '' }
      ]);
      setAddAssemblyModalVisible(false);

      // Refresh data
      await fetchConstituencyData(regdMobileNo);

      Alert.alert(
        'Success',
        `${newAssemblies.length} assembly ${newAssemblies.length === 1 ? 'constituency' : 'constituencies'} added successfully!`
      );

    } catch (error) {
      ConstituencyLoggingService.constError('❌ Error adding assembly constituencies', error);
      Alert.alert(
        'Add Failed',
        `Failed to add assembly constituencies:\n\n${error.message}`
      );
    } finally {
      setSaveLoading(false);
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
            onPress={() => openEditSection('generalInfo')}
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


    </View>
  );

 const renderInfoCards = () => {
  const memberImageUrl = constituencyData?.member_image;
  const shouldShowImage = memberImageUrl && 
                          memberImageUrl !== 'none' && 
                          memberImageUrl !== 'placeholder';

  return (
    <>
      {/* Overview Card */}
      <View style={styles.card}>
        {/* ... existing overview card code ... */}
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
          {/* Member Image or Icon */}
          {shouldShowImage ? (
            <Image
              source={{ uri: memberImageUrl }}
              style={styles.infoCardMemberImage}
              onError={(error) => {
                ConstituencyLoggingService.constError('Member image load failed in card', error);
              }}
            />
          ) : (
            <Icon name="person" size={24} color="#9b59b6" style={styles.infoIcon} />
          )}
          
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
    </>
  );
};
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
              {isAdmin && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={(event) => showSectionDropdown('electorsBreakdown', event)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.actionButtonText}>⋮</Text>
                </TouchableOpacity>
              )}
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
        <View style={styles.segmentsList}>
          <View style={styles.errorContainer}>
            <Icon name="error" size={24} color="#e74c3c" />
            <Text style={styles.errorText}>Assembly constituency data not available</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>

          {/* Show Add New button only when NO data exists */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.addAssemblyButton}
              onPress={() => setAddAssemblyModalVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="add-circle" size={20} color="#fff" />
              <Text style={styles.addAssemblyButtonText}>Add New Assembly Constituency</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (assemblyConstituencies.length === 0) {
      return (
        <View style={styles.segmentsList}>
          <View style={styles.errorContainer}>
            <Icon name="info" size={24} color="#95a5a6" />
            <Text style={styles.errorText}>No assembly constituencies found</Text>
          </View>

          {/* Show Add New button only when NO data exists */}
          {isAdmin && (
            <TouchableOpacity
              style={styles.addAssemblyButton}
              onPress={() => setAddAssemblyModalVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="add-circle" size={20} color="#fff" />
              <Text style={styles.addAssemblyButtonText}>Add New Assembly Constituency</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // When data EXISTS - show list WITHOUT "Add More" button
    return (
      <View style={styles.segmentsList}>
        {/* NO "Add More" button here - only individual edit buttons */}

        {/* Assembly List WITH individual edit buttons */}
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

                {/* Individual Edit Button for each constituency */}
                {isAdmin && (
                  <TouchableOpacity
                    style={{
                      marginLeft: 8,
                      padding: 6,
                      backgroundColor: '#3498db',
                      borderRadius: 4
                    }}
                    onPress={() => {
                      setCurrentAssemblyIndex(index);
                      setEditingAssemblyData({
                        ac_number: segment.ac_number || '',
                        ac_name: segment.ac_name || '',
                        district: segment.district || '',
                        type: segment.type || ''
                      });
                      setEditAssemblyModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Icon name="edit" size={14} color="#fff" />
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
  const renderMainEditModal = () => (
    <Modal
      visible={editModalVisible && (editingConstituency || editingAssembly)}
      animationType="slide"
      transparent={true}
      onRequestClose={closeEditModal}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingConstituency ? 'Edit Constituency Profile' : 'Edit Assembly Constituency'}
            </Text>
            <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
            {editingConstituency && renderConstituencyEditForm()}
            {editingAssembly && renderAssemblyEditForm()}
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
                <Text style={styles.saveButtonText}>
                  {editingConstituency ? 'Save All Changes' : 'Save Assembly'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  const renderEditModal = () => {
    const sections = getFieldSections();
    const openSectionKeys = Object.keys(editSections).filter(key => editSections[key]);

    if (openSectionKeys.length === 0) return null;

    return (
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          openSectionKeys.forEach(key => closeEditSection(key));
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {openSectionKeys.map(sectionKey => {
              const section = sections[sectionKey];
              return (
                <View key={sectionKey} style={styles.sectionContainer}>
                  <View style={[styles.modalHeader, { backgroundColor: section.color }]}>
                    <Icon name={section.icon} size={18} color="#fff" />
                    <Text style={styles.modalTitle}>{section.title}</Text>
                    <TouchableOpacity
                      onPress={() => closeEditSection(sectionKey)}
                      style={styles.closeButton}
                    >
                      <Icon name="close" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                    {section.fields.map(field => (
                      <View key={field.key} style={styles.formGroup}>
                        <Text style={[styles.formLabel, field.required && styles.requiredLabel]}>
                          {field.label}{field.required && ' *'}
                        </Text>
                        <TextInput
                          style={[styles.formInput, field.multiline && styles.textArea]}
                          value={editFormSections[sectionKey]?.[field.key] || ''}
                          onChangeText={(text) => handleSectionFormChange(sectionKey, field.key, text)}
                          multiline={field.multiline}
                          numberOfLines={field.multiline ? 4 : 1}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          placeholderTextColor="#bdc3c7"
                        />
                      </View>
                    ))}
                  </ScrollView>

                  <View style={styles.modalFooter}>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.cancelButton]}
                      onPress={() => closeEditSection(sectionKey)}
                      disabled={updateLoading}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.saveButton, { backgroundColor: section.color }]}
                      onPress={() => handleUpdateSection(sectionKey)}
                      disabled={updateLoading}
                      activeOpacity={0.7}
                    >
                      {updateLoading ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.saveButtonText}>Save {section.title}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </Modal>
    );
  };

  /*const renderConstituencyEditForm = () => {
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
  };*/

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
          Fetching data...
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

  const renderSectionDropdownMenus = () => {
    const sections = getFieldSections();

    return Object.keys(sectionDropdowns).map(sectionKey => {
      if (!sectionDropdowns[sectionKey]) return null;

      const section = sections[sectionKey];
      const position = sectionDropdownPositions[sectionKey] || { x: 0, y: 0 };

      return (
        <Modal
          key={sectionKey}
          visible={sectionDropdowns[sectionKey]}
          transparent={true}
          animationType="none"
          onRequestClose={() => setSectionDropdowns(prev => ({ ...prev, [sectionKey]: false }))}
        >
          <TouchableOpacity
            style={styles.dropdownOverlay}
            activeOpacity={1}
            onPress={() => setSectionDropdowns(prev => ({ ...prev, [sectionKey]: false }))}
          >
            <View
              style={[
                styles.dropdownMenu,
                {
                  top: position.y,
                  left: position.x,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => handleSectionDropdownAction(sectionKey, 'edit')}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownItemIcon}>✏️</Text>
                <Text style={styles.dropdownItemText}>Edit </Text>
              </TouchableOpacity>

              <View style={styles.dropdownSeparator} />

              <TouchableOpacity
                style={[styles.dropdownItem, styles.dropdownDeleteItem]}
                onPress={() => handleSectionDropdownAction(sectionKey, 'delete')}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownItemIcon}>🗑️</Text>
                <Text style={[styles.dropdownItemText, styles.dropdownDeleteText]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      );
    });
  };
  const renderAddAssemblyModal = () => (
    <Modal
      visible={addAssemblyModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        setAddAssemblyModalVisible(false);
        setAssemblyFormList([
          { ac_number: '', ac_name: '', district: '', type: '' }
        ]);
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: '#2980b9' }]}>
            <Icon name="add-circle" size={18} color="#fff" />
            <Text style={styles.modalTitle}>
              Add Assembly Constituencies ({assemblyFormList.length})
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAddAssemblyModalVisible(false);
                setAssemblyFormList([
                  { ac_number: '', ac_name: '', district: '', type: '' }
                ]);
              }}
              style={styles.closeButton}
            >
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
            {assemblyFormList.map((form, index) => (
              <View
                key={index}
                style={{
                  marginBottom: 20,
                  padding: 15,
                  backgroundColor: '#f8f9fa',
                  borderRadius: 8,
                  borderLeftWidth: 3,
                  borderLeftColor: '#2980b9'
                }}
              >
                {/* Form Header with Remove Button */}
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 15
                }}>
                  <Text style={[styles.tableSubHeaderText, { fontSize: 14 }]}>
                    Constituency {index + 1}
                  </Text>
                  {assemblyFormList.length > 1 && (
                    <TouchableOpacity
                      onPress={() => handleRemoveConstituency(index)}
                      style={{
                        backgroundColor: '#e74c3c',
                        padding: 6,
                        borderRadius: 4,
                        flexDirection: 'row',
                        alignItems: 'center'
                      }}
                    >
                      <Icon name="delete" size={14} color="#fff" />
                      <Text style={{ color: '#fff', marginLeft: 4, fontSize: 12 }}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* AC Number */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, styles.requiredLabel]}>
                    AC Number *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.ac_number}
                    onChangeText={(text) => handleAssemblyFormListChange(index, 'ac_number', text)}
                    placeholder="Enter AC number (e.g., 13)"
                    placeholderTextColor="#bdc3c7"
                    keyboardType="numeric"
                  />
                </View>

                {/* AC Name */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, styles.requiredLabel]}>
                    AC Name *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.ac_name}
                    onChangeText={(text) => handleAssemblyFormListChange(index, 'ac_name', text)}
                    placeholder="Enter AC name (e.g., Bettiah)"
                    placeholderTextColor="#bdc3c7"
                  />
                </View>

                {/* District */}
                <View style={styles.formGroup}>
                  <Text style={[styles.formLabel, styles.requiredLabel]}>
                    District *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.district}
                    onChangeText={(text) => handleAssemblyFormListChange(index, 'district', text)}
                    placeholder="Enter district"
                    placeholderTextColor="#bdc3c7"
                  />
                </View>

                {/* Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Type (Optional)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={form.type}
                    onChangeText={(text) => handleAssemblyFormListChange(index, 'type', text)}
                    placeholder="SC/General or leave blank"
                    placeholderTextColor="#bdc3c7"
                  />
                </View>
              </View>
            ))}

            {/* Add More Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#27ae60',
                padding: 12,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 10,
                marginBottom: 20
              }}
              onPress={handleAddMoreConstituency}
              disabled={saveLoading}
            >
              <Icon name="add" size={20} color="#fff" />
              <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold' }}>
                Add More Constituency
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer with Cancel and Save */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setAddAssemblyModalVisible(false);
                setAssemblyFormList([
                  { ac_number: '', ac_name: '', district: '', type: '' }
                ]);
              }}
              disabled={saveLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: '#2980b9' }]}
              onPress={handleAddNewAssembly}
              disabled={saveLoading}
              activeOpacity={0.7}
            >
              {saveLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>
                  Save All ({assemblyFormList.length})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAssemblyEditModal = () => {
    if (!assemblyConstituencies || assemblyConstituencies.length === 0) {
      return null;
    }

    return (
      <Modal
        visible={editAssemblyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditAssemblyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { backgroundColor: '#2980b9' }]}>
              <Icon name="ballot" size={18} color="#fff" />
              <Text style={styles.modalTitle}>Edit Assembly Constituency</Text>
              <TouchableOpacity
                onPress={() => setEditAssemblyModalVisible(false)}
                style={styles.closeButton}
              >
                <Icon name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Assembly Navigation Header */}
            <View style={styles.tableSubHeader}>
              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { flex: 0, paddingHorizontal: 12, marginRight: 10 },
                  assemblyConstituencies.length <= 1 && { opacity: 0.5 }
                ]}
                onPress={() => navigateAssembly('previous')}
                disabled={assemblyConstituencies.length <= 1 || assemblyEditLoading}
              >
                <Text style={styles.retryButtonText}>Previous</Text>
              </TouchableOpacity>

              <View style={{ flex: 1, alignItems: 'center' }}>
                <Text style={styles.tableSubHeaderText}>
                  {currentAssemblyIndex + 1} of {assemblyConstituencies.length}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.retryButton,
                  { flex: 0, paddingHorizontal: 12, marginLeft: 10 },
                  assemblyConstituencies.length <= 1 && { opacity: 0.5 }
                ]}
                onPress={() => navigateAssembly('next')}
                disabled={assemblyConstituencies.length <= 1 || assemblyEditLoading}
              >
                <Text style={styles.retryButtonText}>Next</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* ✅ SHOW ADD MORE FORMS IF ACTIVE */}
              {isAddingMoreInEdit ? (
                <>
                  <Text style={[styles.tableSubHeaderText, { marginBottom: 15, textAlign: 'center' }]}>
                    Adding New Constituencies ({editAssemblyFormList.length})
                  </Text>

                  {editAssemblyFormList.map((form, index) => (
                    <View
                      key={index}
                      style={{
                        marginBottom: 20,
                        padding: 15,
                        backgroundColor: '#f8f9fa',
                        borderRadius: 8,
                        borderLeftWidth: 3,
                        borderLeftColor: '#2980b9'
                      }}
                    >
                      {/* Form Header */}
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 15
                      }}>
                        <Text style={[styles.tableSubHeaderText, { fontSize: 14 }]}>
                          New Constituency {index + 1}
                        </Text>
                        {editAssemblyFormList.length > 1 && (
                          <TouchableOpacity
                            onPress={() => handleRemoveFromEditList(index)}
                            style={{
                              backgroundColor: '#e74c3c',
                              padding: 6,
                              borderRadius: 4,
                              flexDirection: 'row',
                              alignItems: 'center'
                            }}
                          >
                            <Icon name="delete" size={14} color="#fff" />
                            <Text style={{ color: '#fff', marginLeft: 4, fontSize: 12 }}>
                              Remove
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* AC Number */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.formLabel, styles.requiredLabel]}>
                          AC Number *
                        </Text>
                        <TextInput
                          style={styles.formInput}
                          value={form.ac_number}
                          onChangeText={(text) => handleEditAssemblyFormListChange(index, 'ac_number', text)}
                          placeholder="Enter AC number"
                          placeholderTextColor="#bdc3c7"
                          keyboardType="numeric"
                        />
                      </View>

                      {/* AC Name */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.formLabel, styles.requiredLabel]}>
                          AC Name *
                        </Text>
                        <TextInput
                          style={styles.formInput}
                          value={form.ac_name}
                          onChangeText={(text) => handleEditAssemblyFormListChange(index, 'ac_name', text)}
                          placeholder="Enter AC name"
                          placeholderTextColor="#bdc3c7"
                        />
                      </View>

                      {/* District */}
                      <View style={styles.formGroup}>
                        <Text style={[styles.formLabel, styles.requiredLabel]}>
                          District *
                        </Text>
                        <TextInput
                          style={styles.formInput}
                          value={form.district}
                          onChangeText={(text) => handleEditAssemblyFormListChange(index, 'district', text)}
                          placeholder="Enter district"
                          placeholderTextColor="#bdc3c7"
                        />
                      </View>

                      {/* Type */}
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Type (Optional)</Text>
                        <TextInput
                          style={styles.formInput}
                          value={form.type}
                          onChangeText={(text) => handleEditAssemblyFormListChange(index, 'type', text)}
                          placeholder="SC/General or leave blank"
                          placeholderTextColor="#bdc3c7"
                        />
                      </View>
                    </View>
                  ))}

                  {/* Add More Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#27ae60',
                      padding: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 10,
                      marginBottom: 10
                    }}
                    onPress={handleAddMoreToEditList}
                    disabled={assemblyEditLoading}
                  >
                    <Icon name="add" size={20} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold' }}>
                      Add More Constituency
                    </Text>
                  </TouchableOpacity>

                  {/* Cancel Add More */}
                  <TouchableOpacity
                    style={[styles.fullRetryButton, { backgroundColor: '#95a5a6' }]}
                    onPress={handleCancelAddMoreInEdit}
                    disabled={assemblyEditLoading}
                  >
                    <Icon name="close" size={16} color="#fff" />
                    <Text style={styles.fullRetryButtonText}>Cancel Adding</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* ✅ ORIGINAL EDIT SINGLE CONSTITUENCY FORM */}
                  <Text style={[styles.tableSubHeaderText, { marginBottom: 15, textAlign: 'center' }]}>
                    Assembly Entry {currentAssemblyIndex + 1}
                  </Text>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, styles.requiredLabel]}>
                      Assembly Constituency Number *
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editingAssemblyData.ac_number.toString()}
                      onChangeText={(text) => handleAssemblyInputChange('ac_number', text)}
                      placeholder="Enter AC number"
                      placeholderTextColor="#bdc3c7"
                      keyboardType="numeric"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, styles.requiredLabel]}>
                      Assembly Constituency Name *
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editingAssemblyData.ac_name}
                      onChangeText={(text) => handleAssemblyInputChange('ac_name', text)}
                      placeholder="Enter AC name"
                      placeholderTextColor="#bdc3c7"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={[styles.formLabel, styles.requiredLabel]}>
                      District *
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editingAssemblyData.district}
                      onChangeText={(text) => handleAssemblyInputChange('district', text)}
                      placeholder="Enter district"
                      placeholderTextColor="#bdc3c7"
                    />
                  </View>

                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>
                      Type (Optional)
                    </Text>
                    <TextInput
                      style={styles.formInput}
                      value={editingAssemblyData.type}
                      onChangeText={(text) => handleAssemblyInputChange('type', text)}
                      placeholder="Enter type (SC/General or leave blank)"
                      placeholderTextColor="#bdc3c7"
                    />
                  </View>

                  {/* Add More Constituency Button */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#27ae60',
                      padding: 12,
                      borderRadius: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 10,
                      marginBottom: 10
                    }}
                    onPress={handleAddMoreInEdit}
                    disabled={assemblyEditLoading}
                  >
                    <Icon name="add" size={20} color="#fff" />
                    <Text style={{ color: '#fff', marginLeft: 8, fontWeight: 'bold' }}>
                      Add More Constituency
                    </Text>
                  </TouchableOpacity>

                  {/* Delete Button */}
                  <TouchableOpacity
                    style={[styles.fullRetryButton, { backgroundColor: '#e74c3c', marginTop: 10 }]}
                    onPress={deleteCurrentAssembly}
                    disabled={assemblyEditLoading}
                  >
                    <Icon name="delete" size={16} color="#fff" />
                    <Text style={styles.fullRetryButtonText}>Delete This Entry</Text>
                  </TouchableOpacity>

                  <View style={styles.noDataContainer}>
                    <Text style={styles.noDataText}>
                      Use Previous/Next to navigate between assembly constituencies.
                      Save to update or Delete to remove permanently.
                    </Text>
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditAssemblyModalVisible(false)}
                disabled={assemblyEditLoading}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: '#2980b9' }]}
                onPress={saveCurrentAssembly}
                disabled={assemblyEditLoading}
                activeOpacity={0.7}
              >
                {assemblyEditLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {isAddingMoreInEdit ?
                      `Save All (${editAssemblyFormList.length})` :
                      'Save Assembly'
                    }
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  const handleDeleteAllAssemblies = () => {
    Alert.alert(
      'Delete All Assemblies',
      'Are you sure you want to delete ALL assembly constituencies? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdateLoading(true);

              const baseUrl = await ConfigService.getBaseUrl();

              const result = await ApiService.authPut(
                `${baseUrl}/api/assemblyconstituencies/`,
                {
                  leader_regd_mobile_no: regdMobileNo,
                  user_email_id: loggedInEmail || ownerEmail,
                  assembly_constituencies: {
                    narration: "No assembly constituencies",
                    assembly_const_count: 0,
                    assembly_const: []
                  }
                }
              );

              if (result.success) {
                Alert.alert('Success', 'All assembly constituencies deleted!');
                await fetchConstituencyData(regdMobileNo);
              } else {
                throw new Error(result.message || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Delete Failed', error.message);
            } finally {
              setUpdateLoading(false);
            }
          }
        }
      ]
    );
  };
  const renderAssemblyDropdownModal = () => {
    if (!dropdownVisible || !isAdmin) return null;

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
                openEditAssemblyForm();
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
                handleDeleteAllAssemblies();
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
      {renderSectionDropdownMenus()}
      {/* ECI Summary Data */}
      {/* ECI Summary Data onPress={() => openEditSection('eciSummary')}*/}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Icon name="how-to-vote" size={20} color="#e16e2b" />
            <Text style={styles.cardTitle}>ECI Summary Data</Text>
          </View>
          <View style={styles.cardHeaderRight}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(event) => showSectionDropdown('eciSummary', event)}
                activeOpacity={0.7}
              >
                <Text style={styles.actionButtonText}>⋮</Text>
              </TouchableOpacity>
            )}
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



      {/* Footer spacing */}
      <View style={styles.footer} />

      {/* Modals */}
      {renderMainEditModal()}
      {renderEditModal()}
      {renderAddAssemblyModal()}
      {renderAssemblyEditModal()}
      {renderDeveloperInputModal()}
      {renderAssemblyDropdownModal()}
    </ScrollView>
  );
};


export default AboutConstituencyScreen;