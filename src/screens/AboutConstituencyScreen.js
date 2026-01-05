import React, { useState, useEffect, useCallback,useRef } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';
import styles from '../styles/AboutConstituencystyle';
import { useTranslation } from '../context/TranslationContext';
import TranslatableText from '../components/TranslatableText';
import UpdateStatusService from '../services/UpdateStatusService';
import LocalStorageService from '../services/LocalStorageService';

// ✅ Three Dot Menu Component
const ThreeDotMenu = ({ visible, position, onEdit, onDelete, onDismiss }) => {
  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity 
        style={styles.dropdownOverlay} 
        activeOpacity={1} 
        onPress={onDismiss}
      >
        <View style={[styles.dropdownMenu, {
          top: position.y,
          left: position.x - 120,
        }]}>
          <TouchableOpacity 
            style={styles.dropdownItem}
            onPress={onEdit}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownItemIcon}>✏️</Text>
            <Text style={styles.dropdownItemText}>Edit</Text>
          </TouchableOpacity>
          
          <View style={styles.dropdownSeparator} />
          
          <TouchableOpacity 
            style={[styles.dropdownItem, styles.dropdownDeleteItem]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownItemIcon}>🗑️</Text>
            <Text style={[styles.dropdownItemText, styles.dropdownDeleteText]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

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
        
        // ✅ ADD THIS: Remove duplicate port numbers (e.g., :5000:5000 -> :5000)
        normalizedUrl = normalizedUrl.replace(/:(\d+):(\d+)\//, ':$1/');
        ConstituencyLoggingService.constInfo('🔧 Fixed duplicate port in URL', normalizedUrl);
        
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

const ACMediaImage = React.memo(({ item, index, memberId, isAdmin, onEdit, onDelete }) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    
    const loadACImage = async () => {
      if (!item.media_file) {
        console.log('⚠️ No media_file for item:', item._id);
        setImageLoading(false);
        return;
      }
      
      setImageLoading(true);
      setImageError(false);
      
      try {
        const currentUserInfo = await getCurrentUserRole();
        const userEmailId = currentUserInfo.loggedin_email || '';
        
        let mediaUrl = item.media_file;
        
        if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          if (mediaUrl.includes('ngrok-free.app:')) {
            mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
          }
          
          if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
            const baseUrl = await ConfigService.getBaseUrl();
            mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          }
        } else {
          const baseUrl = await ConfigService.getBaseUrl();
          const cleanMediaFile = mediaUrl.replace(/^[\\\/]+/, '');
          const encodedMediaFile = encodeURIComponent(cleanMediaFile);
          const encodedEmail = encodeURIComponent(userEmailId);
          
          mediaUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${memberId}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
        }
        
        const EncryptedStorage = require('react-native-encrypted-storage').default;
        const appKey = await EncryptedStorage.getItem('APP_KEY');
        const accessToken = await EncryptedStorage.getItem('accessToken');
        
        const response = await fetch(mediaUrl, {
          method: 'GET',
          headers: {
            'x-app-key': appKey || '',
            'Authorization': `Bearer ${accessToken || ''}`,
            'ngrok-skip-browser-warning': 'true',
            'Accept': 'image/*',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (mounted) {
            setImageUri(reader.result);
            setImageLoading(false);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          if (mounted) {
            setImageError(true);
            setImageLoading(false);
          }
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('❌ Error loading AC image:', error);
        if (mounted) {
          setImageError(true);
          setImageLoading(false);
        }
      }
    };
    
    loadACImage();
    
    return () => {
      mounted = false;
    };
  }, [item.media_file, memberId]);

  const handleMenuPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY + 10 });
    setMenuVisible(true);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit(item);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete AC Media',
      'Are you sure you want to delete this image?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => onDelete(item),
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.acMediaItem}>
      {/* ✅ Three Dot Menu Button - Only show for admin */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.acMediaMenuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.acMediaMenuIcon}>⋮</Text>
        </TouchableOpacity>
      )}

      {/* ✅ Only show menu dropdown for admin */}
      {isAdmin && (
        <ThreeDotMenu
          visible={menuVisible}
          position={menuPosition}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismiss={() => setMenuVisible(false)}
        />
      )}

      {imageLoading && (
        <View style={styles.acMediaLoadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
        </View>
      )}

      {!imageLoading && imageError && (
        <View style={styles.acMediaErrorContainer}>
          <Text style={styles.acMediaErrorIcon}>📷</Text>
          <Text style={styles.acMediaErrorText}>Image unavailable</Text>
        </View>
      )}

      {/* ✅ CLICKABLE IMAGE - Opens media_url when tapped */}
      {!imageLoading && !imageError && imageUri && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.media_url && item.media_url.trim() !== '') {
              Linking.openURL(item.media_url).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the link');
              });
            } else {
              Alert.alert('Info', 'No URL available for this image');
            }
          }}
        >
          <Image 
            source={{ uri: imageUri }}
            style={styles.acMediaImage} 
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});


// Handle AC Media Edit

const AboutConstituencyScreen = ({ navigation }) => {

  const { 
    currentLanguage, 
    changeLanguage, 
    isTranslating, 
    setIsTranslating,
    availableLanguages 
  } = useTranslation();
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

  const [acMediaData, setAcMediaData] = useState([]);
const [acMediaLoading, setAcMediaLoading] = useState(false);
// Add these new states for AC media edit/delete
const [editACModalVisible, setEditACModalVisible] = useState(false);
const [selectedACItem, setSelectedACItem] = useState(null);
// Add AC Media Modal States
const [addACModalVisible, setAddACModalVisible] = useState(false);
const [addACLoading, setAddACLoading] = useState(false);
// Add Constituency Profile Modal States
const [addConstituencyModalVisible, setAddConstituencyModalVisible] = useState(false);
const [addConstituencyData, setAddConstituencyData] = useState({
  const_no: '',
  constituency_type: 'LokSabha',
  const_name: '',
  district: '',
  state: '',
  established: '',
  overview: '',
  sitting_member: '',
  member_party: '',
  election_year: '',
  electon_header: '',
  geography: '',
  eci_url: '',
  reservation_status: 'General',
  assembly_segment_count: '',
  // ECI Summary fields
  electors_general_male_data: '',
  electors_general_female_data: '',
  electors_general_tg_data: '',
  electors_general_total_data: '',
  electors_overseas_male_data: '',
  electors_overseas_female_data: '',
  electors_overseas_tg_data: '',
  electors_overseas_total_data: '',
  electors_service_male_data: '',
  electors_service_female_data: '',
  electors_service_tg_data: '',
  electors_service_total_data: '',
  electors_total_male_data: '',
  electors_total_female_data: '',
  electors_total_tg_data: '',
  electors_grand_total_data: '',
  polling_station_count: '',
  avg_no_electors_per_ps_data: '',
  total_no_voters_data: '',
  voter_trunout_ratio_data: '',
   wikipedia_url: '',  // ✅ ADD THIS
  chanakya_url: ''    // ✅ ADD THIS
});
const [addConstituencyLoading, setAddConstituencyLoading] = useState(false);
// Auto-scroll states for AC media banners
const acMediaScrollViewRef = useRef(null);
const [currentACMediaIndex, setCurrentACMediaIndex] = useState(0);
const acMediaAutoScrollInterval = useRef(null);
// Add these with your existing state declarations
const [editMemberImageModalVisible, setEditMemberImageModalVisible] = useState(false);
const [selectedMemberImage, setSelectedMemberImage] = useState(null);
const [memberImageLoading, setMemberImageLoading] = useState(false);
// Add these with your other state declarations at the top of the component
const [headerDropdownVisible, setHeaderDropdownVisible] = useState(false);
const [headerDropdownPosition, setHeaderDropdownPosition] = useState({ x: 0, y: 0 });
const handleACEdit = (item) => {
  setSelectedACItem(item);
  setEditACModalVisible(true);
};

// Handle AC Media Save
const handleACSave = async (updatedData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);  // ✅ FIXED
    formData.append('user_email_id', userEmailId);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url);
    formData.append('media_type', 'AC');
    formData.append('id', updatedData.id);

    // If new image selected, append it
    if (updatedData.media_file && updatedData.media_file.uri) {
      const fileUri = updatedData.media_file.uri;
      const fileName = updatedData.media_file.fileName || fileUri.split('/').pop();
      const fileType = updatedData.media_file.type || 'image/jpeg';

      formData.append('media_file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      });
    } else {
      formData.append('media_file', null);
    }

    console.log('📤 Sending PUT request to:', apiUrl);

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    if (result.success) {
      await UpdateStatusService.markApiStale(regdMobileNo, 'updatedACMedia');
      console.log('✅ Marked AC_MEDIA cache as stale');
      Alert.alert('✅ Success', 'AC media updated successfully');
      setEditACModalVisible(false);
      setSelectedACItem(null);
      fetchConstituencyData(regdMobileNo); // Refresh the data
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating AC media:', error);
    Alert.alert('Error', error.message || 'Failed to update AC media');
  }
};

// Handle AC Media Delete
const handleACDelete = async (item) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmailId)}&id=${item._id || item.id}`;
    
    const result = await ApiService.authDelete(apiUrl);

    if (result.success) {
            await UpdateStatusService.markApiStale(regdMobileNo, 'updatedACMedia');
      console.log('✅ Marked AC_MEDIA cache as stale');

      Alert.alert('Success', 'AC media deleted successfully');
      fetchConstituencyData(regdMobileNo); // Refresh the data
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting AC media:', error);
    Alert.alert('Error', 'Failed to delete AC media');
  }
};

// Handle AC Media Add/Create
const handleACAdd = async (selectedImage) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;
    
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';

    console.log('📤 Creating new AC media with:', {
      mobile: regdMobileNo,
      email: userEmailId,
      mediaType: 'AC',
      fileName: selectedImage.fileName
    });

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);  // ✅ FIXED
    formData.append('user_email_id', userEmailId);
    formData.append('media_header', 'null');
    formData.append('media_narration', 'null');
    formData.append('media_url', 'null');
    formData.append('media_type', 'AC');

    // Append the selected image file
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 FormData prepared with media_type: AC');
    console.log('📤 Sending POST request to:', apiUrl);

    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    console.log('📥 POST Response:', result);

    if (result.success) {
         await UpdateStatusService.markApiStale(regdMobileNo, 'updatedACMedia');
      console.log('✅ Marked AC_MEDIA cache as stale');
      Alert.alert('✅ Success', 'AC media added successfully');
      setAddACModalVisible(false);
      fetchConstituencyData(regdMobileNo); // Refresh the data
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error adding AC media:', error);
    Alert.alert('Error', error.message || 'Failed to add AC media');
  }
};

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
    electorsBreakdown: false,
    externalLinks: false
  });

  const [editFormSections, setEditFormSections] = useState({
    generalInfo: {},
    eciSummary: {},
    electorsBreakdown: {},
    externalLinks: {} 
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

  // Handle AC Media Edit


  
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

  // Edit Modal for AC Media (Image Only)
// Find your EditACMediaModal component and update it:
const EditACMediaModal = ({ visible, item, onClose, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setSelectedImage(null);
    }
  }, [item]);

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        console.log('Image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select a new image');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: item.media_header || '',
        media_narration: item.media_narration || '',
        media_url: item.media_url || '',
        media_type: 'AC',
        media_file: selectedImage,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update AC media');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* ✅ USE THE NEW COMPACT STYLE */}
        <View style={styles.imageModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update AC Image</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ✅ REMOVE ScrollView, USE REGULAR VIEW */}
          <View style={[styles.modalBody, { padding: 20, maxHeight: undefined }]}>
            <Text style={[styles.formLabel, { marginBottom: 10 }]}>Select New Image *</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Choose Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageInfoText}>
                  {selectedImage.fileName || 'New image selected'}
                </Text>
              </View>
            )}
          </View>

          {/* ✅ FOOTER WITH BUTTONS */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};


// Add AC Media Modal Component
// Add AC Media Modal Component
const AddACMediaModal = ({ visible, onClose, onSave }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    
    if (visible) {
      setSelectedImage(null);
    }
  }, [visible]);

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        console.log('Image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    setSaving(true);
    try {
      await onSave(selectedImage);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add AC media');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.imageModalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New AC Media</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={[styles.modalBody, { padding: 20 }]}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={true}
          >
            <Text style={[styles.formLabel, { marginBottom: 10 }]}>Select Image *</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Choose Image'}
              </Text>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageInfoText}>
                  {selectedImage.fileName || 'Image selected'}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Add Media</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
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
 // Get mobile number from storage following App.js patterns
const getMobileNumberFromStorage = async () => {
  try {
    ConstituencyLoggingService.constInfo('🔍 Retrieving owner mobile from storage...');

    // ✅ PRIORITY 1: Get OWNER_MOBILE directly (stored during bootstrap)
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    
    if (ownerMobile && ownerMobile.trim() !== '') {
      ConstituencyLoggingService.constInfo('✅ Owner mobile found from OWNER_MOBILE:', ownerMobile);
      return ownerMobile.trim();
    }

    // ✅ PRIORITY 2: Get from AppOwnerInfo
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      ConstituencyLoggingService.constDebug('AppOwnerInfo found', Object.keys(appOwnerInfo));

      // Check various possible keys for mobile number (expanded list)
      const possibleMobileFields = [
        'mobile_no', 'regdMobileNo', 'mobile_number', 'phone', 'mobileNo',
        'Mobile', 'MobileNo', 'MOBILE', 'phoneNumber', 'contactNumber',
        'mobile', 'cell', 'cellular', 'contact', 'phone_number',
        'client_mobile', 'regd_mobile_no', 'owner_mobile'
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

    // ✅ FALLBACK 3: Try other storage keys
    const storedMobile = await EncryptedStorage.getItem('MOBILE_NUMBER') ||
      await AsyncStorage.getItem('userMobile');

    if (storedMobile) {
      ConstituencyLoggingService.constInfo('✅ Mobile found in fallback storage:', storedMobile);
      return storedMobile;
    }

    // ✅ LAST RESORT: Prompt user
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
    
    // ✅ ADD DETAILED LOGGING
    ConstituencyLoggingService.constInfo('📱 ===================================');
    ConstituencyLoggingService.constInfo('📱 USING OWNER MOBILE FOR ALL APIS:', mobileNo);
    ConstituencyLoggingService.constInfo('📱 ===================================');

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
    setAcMediaLoading(true);
    
    console.log('📡 ========================================');
    console.log('📡 LOADING CONSTITUENCY DATA');
    console.log('📡 ========================================');
    console.log('📱 Mobile:', mobileNo);

    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get email for API call
    let emailToUse = loggedInEmail || ownerEmail;
    if (!emailToUse) {
      try {
        const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
        if (appOwnerInfoStr) {
          const appOwnerInfo = JSON.parse(appOwnerInfoStr);
          emailToUse = appOwnerInfo.email || appOwnerInfo.user_email || appOwnerInfo.emailId || '';
        }
      } catch (error) {
        console.error('Error getting email from AppOwnerInfo', error);
      }
    }

    if (!emailToUse) {
      console.warn('No email found, using placeholder');
      emailToUse = 'sanjay.jaiswal@gmail.com';
    }

    // ✅ STEP 1: CHECK IF FIRST LAUNCH
    const isFirstLaunch = await LocalStorageService.isFirstLaunch();
    console.log('🚀 Is First Launch:', isFirstLaunch);

    // ✅ STEP 2: GET UPDATE FLAGS (only if NOT first launch)
    let updateFlags = null;
    
    if (!isFirstLaunch) {
      console.log('\n🔄 === SUBSEQUENT LAUNCH - CHECKING UPDATE FLAGS ===');
      
      updateFlags = await UpdateStatusService.checkUpdateStatus(
        mobileNo,
        emailToUse
      );
      
      if (updateFlags) {
        console.log('\n📊 === UPDATE FLAGS ANALYSIS ===');
        console.log('updatedCP:', updateFlags.updatedCP, '→', updateFlags.updatedCP === true ? '🔴 FETCH' : '🟢 CACHE');
        console.log('updatedAC:', updateFlags.updatedAC, '→', updateFlags.updatedAC === true ? '🔴 FETCH' : '🟢 CACHE');
        console.log('updatedCPImage:', updateFlags.updatedCPImage, '→', updateFlags.updatedCPImage === true ? '🔴 FETCH' : '🟢 CACHE');
        console.log('===========================\n');
        
        // Clear updated caches
        await UpdateStatusService.clearUpdatedCaches(updateFlags);
      } else {
        console.log('⚠️ No update flags received - will fetch all data fresh');
        updateFlags = {
          updatedCP: true,
          updatedAC: true,
          updatedCPImage: true,
          updatedACMedia: true
        };
      }
    } else {
      console.log('\n🆕 === FIRST LAUNCH - FETCHING ALL DATA ===');
    }

    // ✅ STEP 3: LOAD DATA (from cache or fetch fresh based on flags)
    console.log('\n📦 === LOADING DATA WITH CACHING LOGIC ===');
    
    const [
      constituencyResult,
      assemblyResult,
      acMedia
    ] = await Promise.all([
      loadDataWithCache(
        'CONSTITUENCY_PROFILE',
        fetchConstituencyProfile,
        mobileNo,
        emailToUse,
        updateFlags?.updatedCP || isFirstLaunch
      ),
      loadDataWithCache(
        'ASSEMBLY_CONSTITUENCIES',
        fetchAssemblyConstituencies,
        mobileNo,
        emailToUse,
        updateFlags?.updatedAC || isFirstLaunch
      ),
      loadDataWithCache(
        'AC_MEDIA',
        fetchACMedia,
        mobileNo,
        updateFlags?.updatedACMedia || isFirstLaunch
      )
    ]);

    // ✅ STEP 4: PROCESS CONSTITUENCY PROFILE
    if (constituencyResult.success && constituencyResult.data) {
      const constituencyProfileData = constituencyResult.data.constitency_profile || 
                                      constituencyResult.data.constituency_profile || 
                                      constituencyResult.data;

      // Normalize member image URL if present
      if (constituencyProfileData.member_image && 
          constituencyProfileData.member_image !== 'none' && 
          constituencyProfileData.member_image !== 'placeholder') {
        const originalImageUrl = constituencyProfileData.member_image;
        
        try {
          const normalizedImageUrl = await ImageService.normalizeImageUrl(originalImageUrl);
          if (normalizedImageUrl) {
            constituencyProfileData.member_image = normalizedImageUrl;
          }
        } catch (imageError) {
          console.error('❌ Error normalizing member image:', imageError);
        }
      }

      console.log('✅ Constituency profile loaded');
      
      const cleanedData = {
        const_name: constituencyProfileData.const_name || '',
        const_no: constituencyProfileData.const_no || '',
        state: constituencyProfileData.state || '',
        district: constituencyProfileData.district || '',
        constituency_type: constituencyProfileData.constituency_type || 'Lok Sabha',
        reservation_status: constituencyProfileData.reservation_status || '',
        established: constituencyProfileData.established || '',
        sitting_member: constituencyProfileData.sitting_member || '',
        member_party: constituencyProfileData.member_party || '',
        assembly_segment_count: constituencyProfileData.assembly_segment_count || '',
        overview: constituencyProfileData.overview || '',
        geography: constituencyProfileData.geography || '',
        eci_url: constituencyProfileData.eci_url || '',
        member_image: constituencyProfileData.member_image || null,
        ...constituencyProfileData
      };
      
      setConstituencyData(cleanedData);
    } else {
      console.warn('⚠️ No constituency profile found');
      setConstituencyData(null);
    }

    // ✅ STEP 5: PROCESS ASSEMBLY CONSTITUENCIES
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

      console.log('✅ Assembly constituencies loaded:', constituencies.length);
      setAssemblyConstituencies(constituencies);
    } else {
      console.warn('⚠️ Failed to fetch assembly constituencies');
      setAssemblyConstituencies([]);
    }

    // ✅ STEP 6: PROCESS AC MEDIA
    if (acMedia.success && acMedia.data) {
      setAcMediaData(acMedia.data);
      console.log('✅ AC media loaded:', acMedia.data.length, 'items');
    } else {
      console.error('Failed to load AC media:', acMedia.error);
      setAcMediaData([]);
    }

    setAcMediaLoading(false);

    // ✅ STEP 7: MARK AS LAUNCHED (if first launch)
    if (isFirstLaunch) {
      await LocalStorageService.setHasLaunched();
      console.log('✅ First launch completed - App marked as launched');
      
      // Create initial update flags (all false since we just fetched everything)
      const initialFlags = {
        updatedCP: false,
        updatedAC: false,
        updatedCPImage: false,
        updatedACMedia: false
      };
      await AsyncStorage.setItem('UPDATE_FLAGS', JSON.stringify(initialFlags));
      console.log('✅ Initial update flags set to false');
    }

    console.log('\n✅ ========================================');
    console.log('✅ CONSTITUENCY DATA LOADED SUCCESSFULLY');
    console.log('✅ ========================================\n');

  } catch (err) {
    console.error('❌ Error fetching constituency data', err);
    setError(err.message);
    setAcMediaData([]);
    setAcMediaLoading(false);
  }
};

// ✅ HELPER: Fetch and store data (for first launch)
const fetchAndStoreData = async (cacheKey, fetchFunction, ...params) => {
  try {
    console.log(`   🔄 Fetching ${cacheKey}...`);
    const result = await fetchFunction(...params);
    
    if (result.success && result.data) {
      await LocalStorageService.storeData(cacheKey, result.data);
      console.log(`   ✅ ${cacheKey} fetched and stored`);
    } else {
      console.log(`   ⚠️ ${cacheKey} fetch failed:`, result.error);
    }
    
    return result;
  } catch (error) {
    console.error(`   ❌ Error fetching ${cacheKey}:`, error);
    throw error;
  }
};

// ✅ HELPER: Load data with caching logic
const loadDataWithCache = async (cacheKey, fetchFunction, ...params) => {
  try {
    const updateFlag = params[params.length - 1]; // Last param is the flag
    const fetchParams = params.slice(0, -1); // All params except flag
    
    const cached = await LocalStorageService.getData(cacheKey);
    const hasCachedData = !!cached;
    
    console.log(`\n🔍 ${cacheKey}:`);
    console.log(`   💾 Cache exists: ${hasCachedData}`);
    console.log(`   🚩 Flag: ${updateFlag}`);
    
    // Convert flag to boolean
    let booleanFlag = null;
    if (updateFlag === true || updateFlag === 'true' || updateFlag === 1 || updateFlag === '1') {
      booleanFlag = true;
    } else if (updateFlag === false || updateFlag === 'false' || updateFlag === 0 || updateFlag === '0') {
      booleanFlag = false;
    }
    
    // Decision logic
    let shouldFetchFresh;
    
    if (!hasCachedData) {
      shouldFetchFresh = true;
      console.log(`   ❌ No cache → FETCH`);
    } else if (booleanFlag === true) {
      shouldFetchFresh = true;
      console.log(`   🔴 Flag TRUE → FETCH`);
    } else if (booleanFlag === false) {
      shouldFetchFresh = false;
      console.log(`   🟢 Flag FALSE → CACHE`);
    } else {
      shouldFetchFresh = false;
      console.log(`   ⚪ No flag (backend didn't send) → CACHE`);
    }
    
    if (shouldFetchFresh) {
      console.log(`   📡 Calling API...`);
      const result = await fetchFunction(...fetchParams);
      
      if (result.success && result.data) {
        await LocalStorageService.storeData(cacheKey, result.data);
        
        // Mark as updated (false) in local flags
        const flagName = Object.keys(UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY).find(
          key => UpdateStatusService.UPDATE_FLAG_TO_CACHE_KEY[key] === cacheKey
        );
        if (flagName) {
          await UpdateStatusService.markAsUpdated(flagName);
        }
        
        return result;
      } else {
        // API failed but we have cache - use cache as fallback
        if (hasCachedData) {
          console.log(`   ⚠️ API failed, using cache as fallback`);
          return { success: true, data: cached };
        }
        return result;
      }
    } else {
      console.log(`   💾 Using cache - NO API CALL`);
      return { success: true, data: cached };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    // On error, try to use cache if available
    const cached = await LocalStorageService.getData(cacheKey);
    if (cached) {
      console.log(`   ⚠️ Error occurred, using cache as fallback`);
      return { success: true, data: cached };
    }
    return { success: false, error: error.message };
  }
};

const fetchConstituencyProfile = async (mobileNo, emailToUse) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const constituencyUrl = `${baseUrl}/api/constituencyprofile/?leader_regd_mobile_no=${mobileNo}&user_email_id=${encodeURIComponent(emailToUse)}`;
    
    const result = await ApiService.authGet(constituencyUrl);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (constituency profile):', error);
    return { success: false, error: error.message };
  }
};

const fetchAssemblyConstituencies = async (mobileNo, emailToUse) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const assemblyUrl = `${baseUrl}/api/assemblyconstituencies/?leader_regd_mobile_no=${mobileNo}&user_email_id=${encodeURIComponent(emailToUse)}`;
    
    const result = await ApiService.authGet(assemblyUrl);
    return {
      success: result.success,
      data: result.success ? result.data : null,
      error: result.success ? null : result.error || result.message
    };
  } catch (error) {
    console.error('❌ API Error (assembly constituencies):', error);
    return { success: false, error: error.message };
  }
};

const fetchACMedia = async (memberIdentifier) => {
  try {
    console.log('📸 Fetching AC media for member:', memberIdentifier);
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Get current user info for email parameter
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // Build the endpoint with AC media_type
    const endpoint = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}&media_type=AC`;
    
    console.log('🔍 Fetching AC media from:', endpoint);

    // Use authGet which includes Authorization + x-app-key headers
    const result = await ApiService.authGet(endpoint);

    console.log('📸 AC Media API Response:', result);

    if (result.success && result.data) {
      // Handle different response structures
      let items = [];
      
      if (Array.isArray(result.data)) {
        items = result.data;
      } else if (result.data.media_items) {
        items = result.data.media_items;
      } else if (result.data.items) {
        items = result.data.items;
      }

      console.log('✅ AC Media items found:', items.length);
      return {
        success: true,
        data: items,
        error: null
      };
    } else {
      console.log('⚠️ No AC media data found');
      return {
        success: true,
        data: [],
        error: null
      };
    }
  } catch (error) {
    console.error('❌ API Error (AC media):', error);
    return { 
      success: false, 
      data: [],
      error: error.message 
    };
  }
};

// ✅ Auto-scroll effect for AC media banners (only for non-admin users)
useEffect(() => {
  // Only auto-scroll if user is NOT admin and has AC media data
  if (!isAdmin && acMediaData && acMediaData.length > 1 && !acMediaLoading) {
    // Clear any existing interval
    if (acMediaAutoScrollInterval.current) {
      clearInterval(acMediaAutoScrollInterval.current);
    }

    // Start auto-scroll interval (every 3 seconds)
    acMediaAutoScrollInterval.current = setInterval(() => {
      setCurrentACMediaIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % acMediaData.length;
        
        // Scroll to next banner
        if (acMediaScrollViewRef.current) {
          acMediaScrollViewRef.current.scrollTo({
            x: nextIndex * (330 + 15), // banner width + margin
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 3000); // Change banner every 3 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (acMediaAutoScrollInterval.current) {
        clearInterval(acMediaAutoScrollInterval.current);
      }
    };
  }
}, [isAdmin, acMediaData, acMediaLoading]);
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
        { key: 'eci_url', label: 'ECI URL' },
        { key: 'wikipedia_url', label: 'Wikipedia URL' },  // ✅ ADD THIS
      { key: 'chanakya_url', label: 'Chanakya URL' }     // ✅ ADD THIS
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
        { key: 'electors_grand_total_data', label: 'Grand Total Electors' },
        
      ]
    },
     externalLinks: {
    title: 'External Links',
    icon: 'link',
    color: '#9b59b6',
    fields: [
      { key: 'eci_url', label: 'ECI URL' },
      { key: 'wikipedia_url', label: 'Wikipedia URL' },
      { key: 'chanakya_url', label: 'Chanakya URL' }
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

    // Clean form data - SKIP member_image field
    const cleanedFormData = {};
    Object.keys(sectionData).forEach((key) => {
      // ✅ Skip member_image field - it has its own update endpoint
      if (key === 'member_image') {
        return;
      }
      
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

    // ✅ DON'T INCLUDE member_image AT ALL - let backend preserve it
    const requestPayload = {
      user_email_id: emailToUse || 'sanjay.jaiswal@gmail.com',
      leader_regd_mobile_no: regdMobileNo,
      constitency_profile: {
        regd_mobile_no: regdMobileNo,
        ...cleanedFormData
        // ✅ NO member_image here - completely skipped
      },
    };

    ConstituencyLoggingService.constDebug('Section update payload prepared', {
      section: section.title,
      payload: requestPayload,
    });

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

    // ✅ UPDATE: Preserve the existing member_image when updating local state
    if (result.data?.constitency_profile) {
      setConstituencyData(prev => ({
        ...result.data.constitency_profile,
        member_image: prev?.member_image || result.data.constitency_profile.member_image
      }));
    } else if (result.data) {
      setConstituencyData(prev => ({
        ...result.data,
        member_image: prev?.member_image || result.data.member_image
      }));
    }

    // ✅ ========== ADD THIS SECTION HERE ==========
    // Mark constituency profile cache as stale so it will be refreshed next time
    await UpdateStatusService.markApiStale(regdMobileNo, 'updatedCP');
    console.log('✅ Marked CONSTITUENCY_PROFILE cache as stale');
    // ✅ ============================================

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
       await UpdateStatusService.markApiStale(regdMobileNo, 'updatedCP');
      console.log('✅ Marked CONSTITUENCY_PROFILE cache as stale');

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
           await UpdateStatusService.markApiStale(regdMobileNo, 'updatedAC');
      console.log('✅ Marked ASSEMBLY_CONSTITUENCIES cache as stale');
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
                 await UpdateStatusService.markApiStale(regdMobileNo, 'updatedAC');
              console.log('✅ Marked ASSEMBLY_CONSTITUENCIES cache as stale');
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

    // Clean form data - SKIP member_image field
    const cleanedFormData = {};
    Object.keys(editFormData).forEach(key => {
      // ✅ Skip member_image field - it has its own update endpoint
      if (key === 'member_image') {
        return;
      }
      
      const value = editFormData[key];
      if (value !== null && value !== undefined && value.toString().trim() !== '') {
        cleanedFormData[key] = value.toString().trim();
      }
    });

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
    
    // ✅ DON'T INCLUDE member_image AT ALL - let backend preserve it
    const requestPayload = {
      user_email_id: emailToUse || 'sanjay.jaiswal@gmail.com',
      leader_regd_mobile_no: regdMobileNo,
      constitency_profile: {
        regd_mobile_no: regdMobileNo,
        ...cleanedFormData
        // ✅ NO member_image here - completely skipped
      }
    };

    const result = await ApiService.authPut(
      `${baseUrl}/api/constituencyprofile`,
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

    // ✅ UPDATE: Preserve member_image when updating state
    if (result.data && result.data.constituency_profile) {
      setConstituencyData(prev => ({
        ...result.data.constituency_profile,
        member_image: prev?.member_image || result.data.constituency_profile.member_image
      }));
    } else if (result.data && result.data.constitency_profile) {
      setConstituencyData(prev => ({
        ...result.data.constitency_profile,
        member_image: prev?.member_image || result.data.constitency_profile.member_image
      }));
    } else if (result.data) {
      setConstituencyData(prev => ({
        ...result.data,
        member_image: prev?.member_image || result.data.member_image
      }));
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

    // ✅ FIXED: Prepare payload with leader_regd_mobile_no at ROOT level
    const requestPayload = {
      leader_regd_mobile_no: regdMobileNo,  // ✅ CRITICAL: At root level
      user_email_id: emailToUse,
      assembly_constituencies: {
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
        requestPayload,  // ✅ Using fixed payload
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
        requestPayload,  // ✅ Using fixed payload
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
 await UpdateStatusService.markApiStale(regdMobileNo, 'updatedAC');
      console.log('✅ Marked ASSEMBLY_CONSTITUENCIES cache as stale');
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

const handleCreateConstituencyProfile = async () => {
  try {
    // Validate required fields
    if (!addConstituencyData.const_name.trim()) {
      Alert.alert('Validation Error', 'Constituency name is required');
      return;
    }
    if (!addConstituencyData.const_no.trim()) {
      Alert.alert('Validation Error', 'Constituency number is required');
      return;
    }
    if (!addConstituencyData.state.trim()) {
      Alert.alert('Validation Error', 'State is required');
      return;
    }

    setAddConstituencyLoading(true);

    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not available. Please refresh the screen.');
      return;
    }

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
      emailToUse = 'sanjay.jaiswal@gmail.com';
    }

    const baseUrl = await ConfigService.getBaseUrl();

    // ✅ FIXED: Add leader_regd_mobile_no at ROOT level
    const requestPayload = {
      leader_regd_mobile_no: regdMobileNo,  // ✅ CRITICAL: Add at root level for authentication
      user_email_id: emailToUse,
      constitency_profile: {
        
        const_no: addConstituencyData.const_no.trim(),
        constituency_type: addConstituencyData.constituency_type || 'LokSabha',
        const_name: addConstituencyData.const_name.trim(),
        district: addConstituencyData.district.trim() || '',
        state: addConstituencyData.state.trim(),
        constituency_map: 'none',
        established: addConstituencyData.established.trim() || '',
        overview: addConstituencyData.overview.trim() || '',
        sitting_member: addConstituencyData.sitting_member.trim() || '',
        member_party: addConstituencyData.member_party.trim() || '',
        election_year: addConstituencyData.election_year.trim() || '',
        electon_header: addConstituencyData.electon_header.trim() || '',
        geography: addConstituencyData.geography.trim() || '',
        eci_lablel: 'ECI Summary Data',
        eci_url: addConstituencyData.eci_url.trim() || '',
        reservation_status: addConstituencyData.reservation_status || 'General',
        assembly_segment_count: addConstituencyData.assembly_segment_count.trim() || '',
        
        // ECI Summary Data
        electors_breakups_label: 'Electors',
        electors_general_label: 'General',
        electors_general_male_data: addConstituencyData.electors_general_male_data.trim() || '',
        electors_general_female_data: addConstituencyData.electors_general_female_data.trim() || '',
        electors_general_tg_data: addConstituencyData.electors_general_tg_data.trim() || '',
        electors_general_total_data: addConstituencyData.electors_general_total_data.trim() || '',
        
        electors_overseas_label: 'Overseas',
        electors_overseas_male_data: addConstituencyData.electors_overseas_male_data.trim() || '',
        electors_overseas_female_data: addConstituencyData.electors_overseas_female_data.trim() || '',
        electors_overseas_tg_data: addConstituencyData.electors_overseas_tg_data.trim() || '',
        electors_overseas_total_data: addConstituencyData.electors_overseas_total_data.trim() || '',
        
        electors_service_label: 'Service',
        electors_service_male_data: addConstituencyData.electors_service_male_data.trim() || '',
        electors_service_female_data: addConstituencyData.electors_service_female_data.trim() || '',
        electors_service_tg_data: addConstituencyData.electors_service_tg_data.trim() || '',
        electors_service_total_data: addConstituencyData.electors_service_total_data.trim() || '',
        
        electors_total_male_data: addConstituencyData.electors_total_male_data.trim() || '',
        electors_total_female_data: addConstituencyData.electors_total_female_data.trim() || '',
        electors_total_tg_data: addConstituencyData.electors_total_tg_data.trim() || '',
        electors_grand_total_data: addConstituencyData.electors_grand_total_data.trim() || '',
        
        polling_station_label: 'Polling Stations',
        polling_station_count: addConstituencyData.polling_station_count.trim() || '',
        avg_no_electors_per_ps_label: 'Avg Electors/PS',
        avg_no_electors_per_ps_data: addConstituencyData.avg_no_electors_per_ps_data.trim() || '',
        total_no_voters_label: 'Total Voters',
        total_no_voters_data: addConstituencyData.total_no_voters_data.trim() || '',
        voter_trunout_ratio_label: 'Turnout Ratio',
        voter_trunout_ratio_data: addConstituencyData.voter_trunout_ratio_data.trim() || '',
        wikipedia_url: addConstituencyData.wikipedia_url.trim() || '',
        chanakya_url: addConstituencyData.chanakya_url.trim() || ''
      }
    };

    ConstituencyLoggingService.constInfo('📤 Creating constituency profile', {
      mobile: regdMobileNo,
      email: emailToUse,
      constName: addConstituencyData.const_name
    });

    const result = await ApiService.authPost(
      `${baseUrl}/api/constituencyprofile`,
      requestPayload,
      {
        'x-user-id': emailToUse,
        'x-user-role': userRole,
      }
    );

    console.log('📥 POST Response:', result);

    if (result.success) {
      Alert.alert(
        'Success',
        'Constituency profile created successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form and close modal
              setAddConstituencyData({
                const_no: '',
                constituency_type: 'LokSabha',
                const_name: '',
                district: '',
                state: '',
                established: '',
                overview: '',
                sitting_member: '',
                member_party: '',
                election_year: '',
                electon_header: '',
                geography: '',
                eci_url: '',
                reservation_status: 'General',
                assembly_segment_count: '',
                electors_general_male_data: '',
                electors_general_female_data: '',
                electors_general_tg_data: '',
                electors_general_total_data: '',
                electors_overseas_male_data: '',
                electors_overseas_female_data: '',
                electors_overseas_tg_data: '',
                electors_overseas_total_data: '',
                electors_service_male_data: '',
                electors_service_female_data: '',
                electors_service_tg_data: '',
                electors_service_total_data: '',
                electors_total_male_data: '',
                electors_total_female_data: '',
                electors_total_tg_data: '',
                electors_grand_total_data: '',
                polling_station_count: '',
                avg_no_electors_per_ps_data: '',
                total_no_voters_data: '',
                voter_trunout_ratio_data: '',
                wikipedia_url: '',
                chanakya_url: ''
              });
              setAddConstituencyModalVisible(false);
              fetchConstituencyData(regdMobileNo);
            }
          }
        ]
      );
    } else {
      throw new Error(result.message || result.error || 'Failed to create constituency profile');
    }

  } catch (error) {
    ConstituencyLoggingService.constError('❌ Error creating constituency profile', error);
    Alert.alert('Error', `Failed to create constituency profile: ${error.message}`);
  } finally {
    setAddConstituencyLoading(false);
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
 const renderHeader = () => {
  {isTranslating && (
  <View style={styles.translationLoadingBar}>
    <ActivityIndicator size="small" color="#e16e2b" />
    <Text style={styles.translationLoadingText}>Translating...</Text>
  </View>
)}


  // If no constituency data exists, show "Add New Profile" button
  if (!constituencyData || !constituencyData.const_name) {
    return (
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Constituency Profile</Text>
        </View>
        <Text style={styles.subtitle}>No constituency data available</Text>
        
        {isAdmin && (
          <TouchableOpacity
            style={styles.addAssemblyButton}
            onPress={() => setAddConstituencyModalVisible(true)}
            activeOpacity={0.7}
          >
            <Icon name="add-circle" size={20} color="#fff" />
            <Text style={styles.addAssemblyButtonText}>Add New Constituency Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Handler for three-dot menu
  const handleHeaderMenuPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setHeaderDropdownPosition({ x: pageX, y: pageY + 10 });
    setHeaderDropdownVisible(true);
  };

  const handleHeaderEdit = () => {
    setHeaderDropdownVisible(false);
    openEditSection('generalInfo');
  };

  // Existing header code when data exists...
  return (
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

        {/* ✅ CHANGED: Three-dot menu instead of direct edit button */}
        {isAdmin && (
          <TouchableOpacity
            style={styles.headerMenuButton}
            onPress={handleHeaderMenuPress}
            activeOpacity={0.7}
          >
            <Text style={styles.headerMenuIcon}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ✅ Three-dot dropdown menu */}
      {isAdmin && (
        <ThreeDotMenu
          visible={headerDropdownVisible}
          position={headerDropdownPosition}
          onEdit={handleHeaderEdit}
          onDelete={() => {
            setHeaderDropdownVisible(false);
            Alert.alert(
              'Delete Profile',
              'Are you sure you want to delete this constituency profile?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const baseUrl = await ConfigService.getBaseUrl();
                      const result = await ApiService.authDelete(
                        `${baseUrl}/api/constituencyprofile?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(loggedInEmail || ownerEmail)}`
                      );
                      if (result.success) {
                        Alert.alert('Success', 'Constituency profile deleted');
                        await fetchConstituencyData(regdMobileNo);
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Failed to delete profile');
                    }
                  }
                }
              ]
            );
          }}
          onDismiss={() => setHeaderDropdownVisible(false)}
        />
      )}

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
};

const renderACMediaGallery = () => {
  if (acMediaLoading) {
    return (
      <View style={styles.acMediaContainer}>
        <View style={styles.acMediaLoadingState}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  const showAddButton = isAdmin && acMediaData && (acMediaData.length === 0 || acMediaData.length >= 1);

  return (
    <>
      <View style={styles.acMediaContainer}>
        <ScrollView 
          ref={acMediaScrollViewRef} // ✅ Add ref
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.acMediaScrollContent}
          // ✅ Disable manual scrolling for non-admin users (optional - remove this line if you want users to scroll manually)
          scrollEnabled={isAdmin || true} // Set to 'true' to allow manual scrolling, 'isAdmin' to restrict
          // ✅ Handle manual scroll (pause auto-scroll temporarily)
          onScrollBeginDrag={() => {
            if (!isAdmin && acMediaAutoScrollInterval.current) {
              clearInterval(acMediaAutoScrollInterval.current);
            }
          }}
          // ✅ Resume auto-scroll after manual scroll ends
          onScrollEndDrag={() => {
            if (!isAdmin && acMediaData && acMediaData.length > 1) {
              setTimeout(() => {
                acMediaAutoScrollInterval.current = setInterval(() => {
                  setCurrentACMediaIndex((prevIndex) => {
                    const nextIndex = (prevIndex + 1) % acMediaData.length;
                    if (acMediaScrollViewRef.current) {
                      acMediaScrollViewRef.current.scrollTo({
                        x: nextIndex * (330 + 15),
                        animated: true,
                      });
                    }
                    return nextIndex;
                  });
                }, 3000);
              }, 5000); // Resume after 5 seconds
            }
          }}
        >
          {/* Render existing AC media items */}
          {acMediaData && Array.isArray(acMediaData) && acMediaData.map((item, index) => {
            if (!item || !item.media_file) {
              return null;
            }
            
            return (
              <ACMediaImage
                key={item._id || item.id || `ac-media-${index}`}
                item={item}
                index={index}
                memberId={regdMobileNo}
                isAdmin={isAdmin}
                onEdit={handleACEdit}
                onDelete={handleACDelete}
              />
            );
          })}

          {/* Add New Button - Show if admin AND (0 OR 2+ banners) */}
          {showAddButton && (
            <TouchableOpacity
              style={styles.acMediaAddButton}
              onPress={() => setAddACModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.acMediaAddContent}>
                <Icon name="add-circle" size={48} color="#e16e2b" />
                <Text style={styles.acMediaAddText}>
                  {acMediaData.length === 0 ? 'Add Banner' : 'Add New'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* ✅ Optional: Add pagination dots for non-admin users */}
        {!isAdmin && acMediaData && acMediaData.length > 1 && (
          <View style={styles.paginationDots}>
            {acMediaData.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  index === currentACMediaIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Edit Modal for existing AC media */}
      {isAdmin && (
        <EditACMediaModal
          visible={editACModalVisible}
          item={selectedACItem}
          onClose={() => {
            setEditACModalVisible(false);
            setSelectedACItem(null);
          }}
          onSave={handleACSave}
        />
      )}

      {/* Add Modal for new AC media */}
      {isAdmin && (
        <AddACMediaModal
          visible={addACModalVisible}
          onClose={() => setAddACModalVisible(false)}
          onSave={handleACAdd}
        />
      )}
    </>
  );
};

 const renderInfoCards = () => {
  // If no constituency data, show empty state
  if (!constituencyData || !constituencyData.const_name) {
    return (
      <View style={styles.card}>
        <View style={styles.noDataContainer}>
          <Icon name="info" size={48} color="#95a5a6" />
          <Text style={[styles.noDataText, { fontSize: 18, marginTop: 10 }]}>
            No Constituency Data Available
          </Text>
          <Text style={styles.noDataText}>
            Click "Add New Constituency Profile" to get started
          </Text>
        </View>
      </View>
    );
  }

  // Existing code for when data exists...
  const memberImageUrl = constituencyData?.member_image;
  const shouldShowImage = memberImageUrl && 
                          memberImageUrl !== 'none' && 
                          memberImageUrl !== 'placeholder';

  return (
    <>
      {/* Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="description" size={20} color="#3498db" />
          <TranslatableText style={styles.cardTitle}>Overview</TranslatableText>
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
          <TranslatableText style={styles.infoLabel}>Established</TranslatableText>
          <Text style={styles.infoValue}>
            {formatEstablishedYear(constituencyData?.established)}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.established ? 'After delimitation' : 'Historical'}
          </Text>
        </View>

        <View style={styles.infoCard}>
{/* Member Image with Edit Button Container */}
<View style={styles.memberImageContainer}>
  {shouldShowImage ? (
    <>
      <Image
        source={{ uri: memberImageUrl }}
        style={styles.infoCardMemberImage}
        onError={(error) => {
          ConstituencyLoggingService.constError('Member image load failed in card', error);
        }}
      />
      {/* ✅ EDIT BUTTON - Show when image exists */}

      {isAdmin && (
        <TouchableOpacity 
          style={styles.memberImageEditButton}
          onPress={() => setEditMemberImageModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="edit" size={12} color="#fff" />
        </TouchableOpacity>
      )}
    </>
  ) : (
    <>
      {/* ✅ CIRCLE PLACEHOLDER - Same style as image but with icon inside */}
      <View style={styles.infoCardMemberImage}>
        <Icon name="person" size={24} color="#9b59b6" />
      </View>
      {/* ✅ EDIT BUTTON - Show when NO image exists */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.memberImageEditButton}
          onPress={() => setEditMemberImageModalVisible(true)}
          activeOpacity={0.7}
        >
          <Icon name="edit" size={12} color="#fff" />
        </TouchableOpacity>
      )}
    </>
  )}
</View>
          
          <TranslatableText style={styles.infoLabel}>Current MP</TranslatableText>
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
    if (!constituencyData || !constituencyData.const_name) {
    return (
      <View style={styles.noDataContainer}>
        <Icon name="info" size={24} color="#95a5a6" />
        <Text style={styles.noDataText}>No election information available</Text>
      </View>
    );
  }
   

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
              <TranslatableText style={styles.tableSubHeaderText}>BASIC INFORMATION</TranslatableText>
            </View>
            <View style={styles.tableHeader}>
              <TranslatableText style={styles.tableHeaderText}>Parameter</TranslatableText>
              <TranslatableText style={styles.tableHeaderText}>Value</TranslatableText>
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
  <TranslatableText style={styles.tableSubHeaderText}>ELECTORS BREAKDOWN</TranslatableText>
  {isAdmin && (
    <TouchableOpacity
      style={styles.actionButton}
      onPress={() => openEditSection('electorsBreakdown')}
      activeOpacity={0.7}
    >
      <Icon name="edit" size={18} color="#fff" />
    </TouchableOpacity>
  )}
</View>
            <View style={styles.tableHeader}>
              <TranslatableText style={[styles.tableHeaderText, { flex: 1.5 }]}>CATEGORY</TranslatableText>
              <TranslatableText style={styles.tableHeaderText}>MEN</TranslatableText>
              <TranslatableText style={styles.tableHeaderText}>WOMEN</TranslatableText>
              <TranslatableText style={styles.tableHeaderText}>3RD GENDER</TranslatableText>
              <TranslatableText style={styles.tableHeaderText}>TOTAL</TranslatableText>
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
          <TranslatableText style={styles.loadingText}>Loading assembly constituencies...</TranslatableText>
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
              <TranslatableText style={styles.addAssemblyButtonText}>Add New Assembly Constituency</TranslatableText>
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
  // If no constituency data or no geography, return null
  if (!constituencyData || !constituencyData.const_name) {
    return null;
  }

  if (!constituencyData?.geography) return null;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Icon name="public" size={20} color="#27ae60" />
        <TranslatableText style={styles.cardTitle}>Geography</TranslatableText>
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
    {/* ✅ FIXED: Edit button now inside cardHeader */}
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderLeft}>
        <Icon name="link" size={20} color="#9b59b6" />
        <TranslatableText style={styles.cardTitle}>External Links</TranslatableText>
      </View>
      
      {/* ✅ Edit button in the right corner */}
      {isAdmin && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditSection('externalLinks')}
          activeOpacity={0.7}
        >
          <Icon name="edit" size={18} color="#fff" />
        </TouchableOpacity>
      )}
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

      {/* ✅ Wikipedia Link */}
      {constituencyData?.wikipedia_url && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => openLink(constituencyData.wikipedia_url)}
          activeOpacity={0.7}
        >
          <Icon name="public" size={20} color="#3498db" />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Wikipedia</Text>
            <Text style={styles.linkDescription}>Detailed information and history</Text>
          </View>
          <Icon name="open-in-new" size={16} color="#3498db" />
        </TouchableOpacity>
      )}

      {/* ✅ Chanakya Link */}
      {constituencyData?.chanakya_url && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => openLink(constituencyData.chanakya_url)}
          activeOpacity={0.7}
        >
          <Icon name="bar-chart" size={20} color="#f39c12" />
          <View style={styles.linkContent}>
            <Text style={styles.linkTitle}>Chanakyya Election Data</Text>
            <Text style={styles.linkDescription}>Election statistics and analysis</Text>
          </View>
          <Icon name="open-in-new" size={16} color="#3498db" />
        </TouchableOpacity>
      )}
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

  // Handle Member Image Update
const handleUpdateMemberImage = async (selectedImage) => {
  try {
    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    setMemberImageLoading(true);

    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/constituencyprofile/image`;
    
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

    console.log('📤 Updating member image:', {
      mobile: regdMobileNo,
      email: emailToUse,
      fileName: selectedImage.fileName
    });

    // Create FormData
    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', emailToUse || 'sanjay.jaiswal@gmail.com');

    // Append the selected image file
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    formData.append('leader_image', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Sending PUT request to:', apiUrl);

    // Use authPut with multipart/form-data
    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    console.log('📥 PUT Response:', result);

    if (result.success) {
      await UpdateStatusService.markApiStale(regdMobileNo, 'updatedCPImage');
      console.log('✅ Marked CONSTITUENCY_MEMBER_IMAGE cache as stale');
      Alert.alert('✅ Success', 'Member image updated successfully', [
        {
          text: 'OK',
          onPress: async () => {
            setEditMemberImageModalVisible(false);
            setSelectedMemberImage(null);
            
            // Reload constituency data to get new image URL
            await fetchConstituencyData(regdMobileNo);
            
            // Force re-render
            setRefreshing(true);
            setTimeout(() => {
              setRefreshing(false);
            }, 100);
          }
        }
      ]);
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating member image:', error);
    Alert.alert('Error', error.message || 'Failed to update member image');
  } finally {
    setMemberImageLoading(false);
  }
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

  const renderAddConstituencyModal = () => {
  return (
    <Modal
      visible={addConstituencyModalVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setAddConstituencyModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#e16e2b' }]}>
            <Icon name="add-circle" size={18} color="#fff" />
            <TranslatableText style={styles.modalTitle}>Add Constituency Profile</TranslatableText>
            <TouchableOpacity
              onPress={() => setAddConstituencyModalVisible(false)}
              style={styles.closeButton}
            >
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={true}>
            {/* BASIC INFORMATION SECTION */}
            <View style={[styles.tableSubHeader, { backgroundColor: '#e16e2b' }]}>
              <TranslatableText style={styles.tableSubHeaderText}>BASIC INFORMATION</TranslatableText>
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={[styles.formLabel, styles.requiredLabel]}>
                Constituency Number *
              </TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.const_no}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  const_no: text
                })}
                placeholder="e.g., 2"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={[styles.formLabel, styles.requiredLabel]}>
                Constituency Name *
              </TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.const_name}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  const_name: text
                })}
                placeholder="e.g., Paschim Champaran"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Constituency Type</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.constituency_type}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  constituency_type: text
                })}
                placeholder="e.g., LokSabha"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={[styles.formLabel, styles.requiredLabel]}>State *</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.state}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  state: text
                })}
                placeholder="e.g., Bihar"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>District</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.district}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  district: text
                })}
                placeholder="e.g., Paschim Champaran"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Reservation Status</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.reservation_status}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  reservation_status: text
                })}
                placeholder="e.g., General, SC, ST"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Established Year</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.established}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  established: text
                })}
                placeholder="e.g., 2008"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Current MP</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.sitting_member}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  sitting_member: text
                })}
                placeholder="e.g., Dr. Sanjay Jaiswal"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Member Party</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.member_party}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  member_party: text
                })}
                placeholder="e.g., BJP"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Assembly Segment Count</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.assembly_segment_count}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  assembly_segment_count: text
                })}
                placeholder="e.g., 6"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Overview</TranslatableText>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={addConstituencyData.overview}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  overview: text
                })}
                placeholder="Brief overview of the constituency"
                placeholderTextColor="#bdc3c7"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Geography</TranslatableText>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={addConstituencyData.geography}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  geography: text
                })}
                placeholder="Geographical description"
                placeholderTextColor="#bdc3c7"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>ECI URL</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.eci_url}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  eci_url: text
                })}
                placeholder="https://www.eci.gov.in/..."
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
  <TranslatableText style={styles.formLabel}>Wikipedia URL</TranslatableText>
  <TextInput
    style={styles.formInput}
    value={addConstituencyData.wikipedia_url}
    onChangeText={(text) => setAddConstituencyData({
      ...addConstituencyData,
      wikipedia_url: text
    })}
    placeholder="https://en.wikipedia.org/..."
    placeholderTextColor="#bdc3c7"
  />
</View>

<View style={styles.formGroup}>
  <TranslatableText style={styles.formLabel}>Chanakya URL</TranslatableText>
  <TextInput
    style={styles.formInput}
    value={addConstituencyData.chanakya_url}
    onChangeText={(text) => setAddConstituencyData({
      ...addConstituencyData,
      chanakya_url: text
    })}
    placeholder="https://chanakyya.com/..."
    placeholderTextColor="#bdc3c7"
  />
</View>

            {/* ECI SUMMARY DATA SECTION */}
            <View style={[styles.tableSubHeader, { backgroundColor: '#e16e2b', marginTop: 20 }]}>
              <TranslatableText style={styles.tableSubHeaderText}>ECI SUMMARY DATA</TranslatableText>
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Election Year</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.election_year}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  election_year: text
                })}
                placeholder="e.g., 2024"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Election Header</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electon_header}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electon_header: text
                })}
                placeholder="e.g., 18th Lok Sabha General Election"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total Voters</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.total_no_voters_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  total_no_voters_data: text
                })}
                placeholder="e.g., 25000"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Voter Turnout Ratio</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.voter_trunout_ratio_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  voter_trunout_ratio_data: text
                })}
                placeholder="e.g., 72%"
                placeholderTextColor="#bdc3c7"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Polling Station Count</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.polling_station_count}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  polling_station_count: text
                })}
                placeholder="e.g., 1234"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Avg Electors per PS</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.avg_no_electors_per_ps_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  avg_no_electors_per_ps_data: text
                })}
                placeholder="e.g., 21"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            {/* ELECTORS BREAKDOWN SECTION */}
            <View style={[styles.tableSubHeader, { backgroundColor: '#e16e2b', marginTop: 20 }]}>
              <TranslatableText style={styles.tableSubHeaderText}>ELECTORS BREAKDOWN</TranslatableText>
            </View>

            {/* General Electors */}
            <TranslatableText style={[styles.formLabel, { marginTop: 10, fontWeight: 'bold' }]}>
              General Electors
            </TranslatableText>
            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Male</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_general_male_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_general_male_data: text
                })}
                placeholder="e.g., 12345"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Female</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_general_female_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_general_female_data: text
                })}
                placeholder="e.g., 12345"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Third Gender</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_general_tg_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_general_tg_data: text
                })}
                placeholder="e.g., 123"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_general_total_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_general_total_data: text
                })}
                placeholder="e.g., 24713"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            {/* Overseas Electors */}
            <TranslatableText style={[styles.formLabel, { marginTop: 10, fontWeight: 'bold' }]}>
              Overseas Electors
            </TranslatableText>
            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Male</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_overseas_male_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_overseas_male_data: text
                })}
                placeholder="e.g., 100"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Female</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_overseas_female_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_overseas_female_data: text
                })}
                placeholder="e.g., 100"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Third Gender</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_overseas_tg_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_overseas_tg_data: text
                })}
                placeholder="e.g., 5"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_overseas_total_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_overseas_total_data: text
                })}
                placeholder="e.g., 205"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            {/* Service Electors */}
            <TranslatableText style={[styles.formLabel, { marginTop: 10, fontWeight: 'bold' }]}>
              Service Electors
            </TranslatableText>
            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Male</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_service_male_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_service_male_data: text
                })}
                placeholder="e.g., 500"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Female</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_service_female_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_service_female_data: text
                })}
                placeholder="e.g., 400"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Third Gender</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_service_tg_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_service_tg_data: text
                })}
                placeholder="e.g., 10"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_service_total_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_service_total_data: text
                })}
                placeholder="e.g., 910"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            {/* Grand Total Electors */}
            <TranslatableText style={[styles.formLabel, { marginTop: 10, fontWeight: 'bold' }]}>
              Grand Total
            </TranslatableText>
            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total Male</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_total_male_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_total_male_data: text
                })}
                placeholder="e.g., 13000"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total Female</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_total_female_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_total_female_data: text
                })}
                placeholder="e.g., 12800"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Total Third Gender</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_total_tg_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_total_tg_data: text
                })}
                placeholder="e.g., 138"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <TranslatableText style={styles.formLabel}>Grand Total Electors</TranslatableText>
              <TextInput
                style={styles.formInput}
                value={addConstituencyData.electors_grand_total_data}
                onChangeText={(text) => setAddConstituencyData({
                  ...addConstituencyData,
                  electors_grand_total_data: text
                })}
                placeholder="e.g., 25938"
                placeholderTextColor="#bdc3c7"
                keyboardType="numeric"
              />
            </View>

            {/* Info Text */}
            <View style={styles.noDataContainer}>
              <Text style={styles.noDataText}>
                * Constituency Name, Number, and State are required. All other fields are optional.
              </Text>
            </View>
          </ScrollView>

          {/* Modal Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => setAddConstituencyModalVisible(false)}
              disabled={addConstituencyLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton, { backgroundColor: '#e16e2b' }]}
              onPress={handleCreateConstituencyProfile}
              disabled={addConstituencyLoading}
              activeOpacity={0.7}
            >
              {addConstituencyLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Create Profile</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Member Image Edit Modal
const renderMemberImageEditModal = () => {
  return (
    <Modal
      visible={editMemberImageModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setEditMemberImageModalVisible(false);
        setSelectedMemberImage(null);
      }}
    >
      <View style={styles.memberImageModalOverlay}>
        <View style={styles.memberImageModalCard}>
          
          {/* ========== HEADER ========== */}
          <View style={styles.memberImageModalHeader}>
            <View style={styles.memberImageHeaderLeft}>
              <View style={styles.memberImageIconCircle}>
                <Icon name="person" size={28} color="#9b59b6" />
              </View>
              <View style={styles.memberImageTitleSection}>
                <Text style={styles.memberImageModalTitle}>Update Member Photo</Text>
                <Text style={styles.memberImageModalSubtitle}>Choose a new member picture</Text>
              </View>
            </View>
            <TouchableOpacity 
              onPress={() => {
                setEditMemberImageModalVisible(false);
                setSelectedMemberImage(null);
              }} 
              style={styles.memberImageCloseButton}
            >
              <Icon name="close" size={20} color="#7f8c8d" />
            </TouchableOpacity>
          </View>

          {/* ========== BODY - IMAGE COMPARISON ========== */}
          <ScrollView style={styles.memberImageModalBody}>
            
            <View style={styles.memberImageComparisonContainer}>
              
              {/* CURRENT IMAGE CARD */}
              <View style={styles.memberImageCard}>
                <View style={styles.memberImageCardHeader}>
                  <Icon name="image" size={14} color="#95a5a6" />
                  <Text style={styles.memberImageCardTitle}>Current</Text>
                </View>
                
                <View style={styles.memberImagePreviewWrapper}>
                  <Image 
                    source={{ 
                      uri: constituencyData?.member_image || 'https://via.placeholder.com/150'
                    }} 
                    style={styles.memberImagePreview}
                    resizeMode="cover"
                  />
                  <View style={styles.memberImageActiveBadge}>
                    <Icon name="check-circle" size={14} color="#27ae60" />
                    <Text style={styles.memberImageBadgeText}>ACTIVE</Text>
                  </View>
                </View>
              </View>

              {/* ARROW SEPARATOR */}
              <View style={styles.memberImageArrowSeparator}>
                <View style={styles.memberImageArrowCircle}>
                  <Icon name="arrow-forward" size={20} color="#9b59b6" />
                </View>
              </View>

              {/* NEW IMAGE CARD */}
              <TouchableOpacity
                style={styles.memberImageCard}
                onPress={() => {
                  const options = {
                    mediaType: 'photo',
                    quality: 0.8,
                    maxWidth: 1024,
                    maxHeight: 1024,
                  };

                  launchImageLibrary(options, (response) => {
                    if (response.didCancel) {
                      console.log('User cancelled image picker');
                    } else if (response.errorCode) {
                      Alert.alert('Error', response.errorMessage);
                    } else if (response.assets && response.assets[0]) {
                      setSelectedMemberImage(response.assets[0]);
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.memberImageCardHeader}>
                  <Icon name="add-a-photo" size={14} color="#9b59b6" />
                  <Text style={[styles.memberImageCardTitle, { color: '#9b59b6' }]}>
                    {selectedMemberImage ? 'NEW' : 'SELECT'}
                  </Text>
                </View>
                
                <View style={styles.memberImagePreviewWrapper}>
                  {selectedMemberImage ? (
                    <>
                      <Image 
                        source={{ uri: selectedMemberImage.uri }} 
                        style={styles.memberImagePreview}
                        resizeMode="cover"
                      />
                      <View style={styles.memberImageNewBadge}>
                        <Icon name="fiber-new" size={14} color="#fff" />
                        <Text style={styles.memberImageNewBadgeText}>NEW</Text>
                      </View>
                    </>
                  ) : (
                    <View style={styles.memberImagePlaceholder}>
                      <Icon name="add-a-photo" size={36} color="#9b59b6" />
                      <Text style={styles.memberImagePlaceholderTitle}>Tap to Choose</Text>
                      <Text style={styles.memberImagePlaceholderSubtitle}>Select new photo</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

            </View>

            {/* INFO CARD */}
            {selectedMemberImage && (
              <View style={styles.memberImageInfoCard}>
                <View style={styles.memberImageInfoHeader}>
                  <Icon name="info" size={16} color="#3498db" />
                  <Text style={styles.memberImageInfoTitle}>Selected Image Details</Text>
                </View>
                <View style={styles.memberImageInfoRow}>
                  <Icon name="insert-drive-file" size={14} color="#5a6c7d" />
                  <Text style={styles.memberImageInfoText}>
                    {selectedMemberImage.fileName || 'Image file'}
                  </Text>
                </View>
                <View style={styles.memberImageInfoRow}>
                  <Icon name="storage" size={14} color="#5a6c7d" />
                  <Text style={styles.memberImageInfoText}>
                    Size: {(selectedMemberImage.fileSize / 1024).toFixed(0)} KB
                  </Text>
                </View>
              </View>
            )}

            {/* GUIDELINES CARD */}
            <View style={styles.memberImageGuidelinesCard}>
              <View style={styles.memberImageGuidelinesHeader}>
                <Icon name="lightbulb-outline" size={16} color="#f39c12" />
                <TranslatableText style={styles.memberImageGuidelinesTitle}>Photo Tips</TranslatableText>
              </View>
              
              <View style={styles.memberImageGuidelinesList}>
                <View style={styles.memberImageGuidelineItem}>
                  <View style={styles.memberImageGuidelineDot} />
                  <TranslatableText style={styles.memberImageGuidelineText}>
                    Use a clear, well-lit photo with good visibility
                  </TranslatableText>
                </View>
                <View style={styles.memberImageGuidelineItem}>
                  <View style={styles.memberImageGuidelineDot} />
                  <TranslatableText style={styles.memberImageGuidelineText}>
                    Face should be clearly visible and centered
                  </TranslatableText>
                </View>
                <View style={styles.memberImageGuidelineItem}>
                  <View style={styles.memberImageGuidelineDot} />
                  <TranslatableText style={styles.memberImageGuidelineText}>
                    Square or portrait format works best
                  </TranslatableText>
                </View>
              </View>
            </View>

          </ScrollView>

          {/* ========== FOOTER - ACTION BUTTONS ========== */}
          <View style={styles.memberImageModalFooter}>
            <TouchableOpacity 
              style={styles.memberImageCancelButton}
              onPress={() => {
                setEditMemberImageModalVisible(false);
                setSelectedMemberImage(null);
              }}
              disabled={memberImageLoading}
            >
              <Icon name="close" size={18} color="#7f8c8d" />
              <Text style={styles.memberImageCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.memberImageSaveButton,
                (!selectedMemberImage || memberImageLoading) && styles.memberImageSaveButtonDisabled
              ]}
              onPress={() => handleUpdateMemberImage(selectedMemberImage)}
              disabled={memberImageLoading || !selectedMemberImage}
              activeOpacity={0.8}
            >
              {memberImageLoading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.memberImageSaveButtonText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Icon name="cloud-upload" size={18} color="#fff" />
                  <Text style={styles.memberImageSaveButtonText}>
                    {selectedMemberImage ? 'Update Photo' : 'Select Photo'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </View>
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
    {renderACMediaGallery()}
    {renderInfoCards()}
      {renderGeographyCard()}
      {renderSectionDropdownMenus()}
      {/* ECI Summary Data */}
      {/* ECI Summary Data onPress={() => openEditSection('eciSummary')}*/}
     <View style={styles.card}>
  <View style={styles.cardHeader}>
    <View style={styles.cardHeaderLeft}>
      <Icon name="how-to-vote" size={20} color="#e16e2b" />
      <TranslatableText style={styles.cardTitle}>ECI Summary Data</TranslatableText>
    </View>
    <View style={styles.cardHeaderRight}>
      {isAdmin && (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditSection('eciSummary')}
          activeOpacity={0.7}
        >
          <Icon name="edit" size={18} color="#fff" />
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
          <TranslatableText style={styles.cardTitle}>Assembly Constituencies</TranslatableText>
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
       {renderAddConstituencyModal()} 
       {renderMemberImageEditModal()}
    </ScrollView>
  );
};


export default AboutConstituencyScreen;