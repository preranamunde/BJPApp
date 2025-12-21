import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { getCurrentUserRole } from '../../App';
import { launchImageLibrary } from 'react-native-image-picker';
import { checkIfCurrentUserIsAdmin } from '../../App';
import Video from 'react-native-video';
import { useTranslation } from '../context/TranslationContext';
import TranslatableText from '../components/TranslatableText';
import landscapeLogo from '../assets/landscapelogo.png';

const { width, height } = Dimensions.get('window');

const DevelopmentLandscapeScreen = () => {

  const { 
    currentLanguage, 
    changeLanguage, 
    isTranslating, 
    setIsTranslating,
    availableLanguages 
  } = useTranslation();
  const [landscapeData, setLandscapeData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  
  const [isAdmin, setIsAdmin] = useState(false);
const [editModalVisible, setEditModalVisible] = useState(false);
const [selectedItem, setSelectedItem] = useState(null);
const [addModalVisible, setAddModalVisible] = useState(false);
const [userEmail, setUserEmail] = useState(null);



  useEffect(() => {
    initializeData();
  }, []);
  
const getMobileNumberFromStorage = async () => {
  try {
    console.log('📱 Fetching owner mobile number...');
    
    // Method 1: Try to get from OWNER_MOBILE (set during bootstrap)
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    if (ownerMobile && ownerMobile.trim() !== '') {
      console.log('✅ Found owner mobile from OWNER_MOBILE:', ownerMobile);
      return ownerMobile;
    }
    
    // Method 2: Try to get from AppOwnerInfo
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      console.log('📋 AppOwnerInfo keys:', Object.keys(appOwnerInfo));
      
      // Try multiple possible field names for mobile number
      const possibleMobileFields = [
        'mobile_no',
        'regdMobileNo', 
        'mobile_number',
        'client_mobile',  // ✅ Added this
        'owner_mobile',
        'Mobile',
        'MobileNo',
        'phone',
        'phoneNumber'
      ];
      
      for (const field of possibleMobileFields) {
        if (appOwnerInfo[field]) {
          const mobileValue = String(appOwnerInfo[field]).trim();
          console.log(`✅ Found owner mobile in field '${field}':`, mobileValue);
          
          // Store it for future use
          await EncryptedStorage.setItem('OWNER_MOBILE', mobileValue);
          
          return mobileValue;
        }
      }
      
      console.warn('⚠️ No mobile field found in AppOwnerInfo');
    }
    
    // Method 3: Fallback - Get from global variable (set during bootstrap)
    if (global.owner_mobile && global.owner_mobile.trim() !== '') {
      console.log('✅ Found owner mobile from global variable:', global.owner_mobile);
      return global.owner_mobile;
    }
    
    // Method 4: Last resort - use default
    console.warn('⚠️ No owner mobile found, using default: 7702000725');
    return '7702000725';
    
  } catch (error) {
    console.error('❌ Error retrieving mobile number:', error);
    return '7702000725';
  }
};

// ✅ STEP 2: Add this debug function to verify mobile number
const debugMobileNumber = async () => {
  try {
    console.log('🔍 === DEBUGGING MOBILE NUMBER ===');
    
    // Check all possible sources
    const ownerMobile = await EncryptedStorage.getItem('OWNER_MOBILE');
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    
    console.log('📱 OWNER_MOBILE storage:', ownerMobile);
    console.log('🌍 global.owner_mobile:', global.owner_mobile);
    
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      console.log('📋 AppOwnerInfo mobile fields:');
      ['mobile_no', 'regdMobileNo', 'mobile_number', 'client_mobile'].forEach(field => {
        if (appOwnerInfo[field]) {
          console.log(`   ${field}:`, appOwnerInfo[field]);
        }
      });
    }
    
    const finalMobile = await getMobileNumberFromStorage();
    console.log('✅ Final mobile number being used:', finalMobile);
    
    return finalMobile;
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
};
  const checkAdminRole = async () => {
  try {
    const adminCheck = await checkIfCurrentUserIsAdmin();
    setIsAdmin(adminCheck.isAdmin);
    return adminCheck.isAdmin;
  } catch (error) {
    console.error('❌ Error checking admin role:', error);
    setIsAdmin(false);
    return false;
  }
};



  const fetchDevelopmentLandscape = async (memberIdentifier) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const currentUserInfo = await getCurrentUserRole();
      const userEmailId = currentUserInfo.loggedin_email || '';
      
      const endpoint = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}&media_type=DL`;
      
      console.log('📞 Fetching Development Landscape from:', endpoint);
      
      const result = await ApiService.authGet(endpoint);

      console.log('📥 API Response:', JSON.stringify(result, null, 2));

      if (result.success && result.data) {
        let items = [];
        
        if (Array.isArray(result.data)) {
          items = result.data;
        } else if (result.data.media_items) {
          items = result.data.media_items;
        } else if (result.data.items) {
          items = result.data.items;
        }

        console.log('✅ Development Landscape data fetched:', items.length);
        return {
          success: true,
          data: items,
          error: null
        };
      } else {
        return {
          success: true,
          data: [],
          error: null
        };
      }
    } catch (error) {
      console.error('❌ API Error (Development Landscape):', error);
      return { 
        success: false, 
        data: [],
        error: error.message 
      };
    }
  };

const initializeData = async () => {
  try {
    setLoading(true);
    
    await checkAdminRole();
    
    // Debug mobile number before using it
    const mobileNo = await debugMobileNumber();
    setRegdMobileNo(mobileNo);
    
    const currentUserInfo = await getCurrentUserRole();
    const email = currentUserInfo.loggedin_email || 'default@email.com';
    setUserEmail(email);
    
    console.log('📞 Using mobile for API call:', mobileNo);
    console.log('📧 Using email for API call:', email);
    
    const landscape = await fetchDevelopmentLandscape(mobileNo);
    
    if (landscape.success && landscape.data) {
      setLandscapeData(landscape.data);
    } else {
      setLandscapeData([]);
    }
  } catch (error) {
    console.error('Error initializing development landscape:', error);
    setLandscapeData([]);
  } finally {
    setLoading(false);
  }
};

const handleEdit = (item) => {
  setSelectedItem(item);
  setEditModalVisible(true);
};

const handleAddNew = () => {
  setAddModalVisible(true);
};

const handleCreateNew = async (newData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', newData.media_header);
    formData.append('media_narration', newData.media_narration);
    formData.append('media_url', newData.media_url);
    formData.append('media_type', 'DL'); // ⚠️ CHANGED FROM 'PU' TO 'DL'

    if (newData.media_file && newData.media_file.uri) {
      const fileUri = newData.media_file.uri;
      const fileName = fileUri.split('/').pop();
      const fileType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

      formData.append('media_file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      });
    }

    console.log('📤 Creating new development landscape...');
    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Development landscape created successfully');
      setAddModalVisible(false);
      initializeData();
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error creating development landscape:', error);
    Alert.alert('Error', error.message || 'Failed to create development landscape');
  }
};

const handleSave = async (updatedData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url);
    formData.append('media_type', 'DL'); // ⚠️ CHANGED FROM 'PU' TO 'DL'
    formData.append('id', updatedData.id);

    if (updatedData.media_file && updatedData.media_file.uri) {
      const fileUri = updatedData.media_file.uri;
      const fileName = fileUri.split('/').pop();
      const fileType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/png';

      formData.append('media_file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      });
    } else {
      formData.append('media_file', null);
    }

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Development landscape updated successfully');
      setEditModalVisible(false);
      setSelectedItem(null);
      initializeData();
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating development landscape:', error);
    Alert.alert('Error', error.message || 'Failed to update development landscape');
  }
};

const handleDelete = async (item) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&id=${item._id || item.id}`;
    
    const result = await ApiService.authDelete(apiUrl);

    if (result.success) {
      Alert.alert('Success', 'Development landscape deleted successfully');
      initializeData();
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting development landscape:', error);
    Alert.alert('Error', 'Failed to delete development landscape');
  }
};

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
            <TranslatableText style={styles.dropdownItemText} cacheKey="edit_btn">
  Edit
</TranslatableText>
          </TouchableOpacity>
          
          <View style={styles.dropdownSeparator} />
          
          <TouchableOpacity 
            style={[styles.dropdownItem, styles.dropdownDeleteItem]}
            onPress={onDelete}
            activeOpacity={0.7}
          >
            <Text style={styles.dropdownItemIcon}>🗑️</Text>
            <TranslatableText style={[styles.dropdownItemText, styles.dropdownDeleteText]} cacheKey="delete_btn">
  Delete
</TranslatableText>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

// Add Media Modal Component
const AddMediaModal = ({ visible, onClose, onSave, regdMobileNo, userEmail }) => {
  const [header, setHeader] = useState('');
  const [narration, setNarration] = useState('');
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      setHeader('');
      setNarration('');
      setUrl('');
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
        console.log('User cancelled picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        setSelectedImage(response.assets[0]);
        console.log('Image selected:', response.assets[0].uri);
      }
    });
  };

  const handleSave = async () => {
    if (!header.trim()) {
      Alert.alert('Validation Error', 'Please enter a media header');
      return;
    }

    if (!selectedImage) {
      Alert.alert('Validation Error', 'Please select an image');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        media_header: header,
        media_narration: narration,
        media_url: url,
        media_file: selectedImage
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to create party update');
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TranslatableText style={styles.modalTitle} cacheKey="add_party_update">
  Add Party Update
</TranslatableText>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <TranslatableText style={styles.label} cacheKey="header_label">
  Header *
</TranslatableText>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter media header"
              placeholderTextColor="#999"
            />

            <TranslatableText style={styles.label} cacheKey="description_label">
  Description
</TranslatableText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={narration}
              onChangeText={setNarration}
              placeholder="Enter description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

           <TranslatableText style={styles.label} cacheKey="url_label">
  URL
</TranslatableText>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter URL (optional)"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <TranslatableText style={styles.label} cacheKey="image_label">
  Image *
</TranslatableText>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
             <TranslatableText style={styles.imagePickerText} cacheKey="choose_image">
  {selectedImage ? 'Change Image' : 'Choose Image'}
</TranslatableText>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TranslatableText style={styles.imageInfoText}>
  {selectedImage.fileName || 'Image selected'}
</TranslatableText>
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <TranslatableText style={styles.removeImageText} cacheKey="remove_btn">
  ✕ Remove
</TranslatableText>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]}
              onPress={onClose}
            >
              <TranslatableText style={styles.cancelButtonText} cacheKey="cancel_btn">
  Cancel
</TranslatableText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <TranslatableText style={styles.saveButtonText} cacheKey="create_btn">
  Create
</TranslatableText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Edit Modal Component
const EditMediaModal = ({ visible, item, onClose, onSave }) => {
  const [header, setHeader] = useState('');
  const [narration, setNarration] = useState('');
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setHeader(item.media_header || '');
      setNarration(item.media_narration || '');
      setUrl(item.media_url || '');
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
    if (!header.trim()) {
      Alert.alert('Validation Error', 'Please enter a media header');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: header,
        media_narration: narration,
        media_url: url,
        media_type: 'PU',
        media_file: selectedImage
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update party update');
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
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TranslatableText style={styles.modalTitle} cacheKey="edit_party_update">
  Edit Party Update
</TranslatableText>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Header *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter media header"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={narration}
              onChangeText={setNarration}
              placeholder="Enter description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter URL"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <TranslatableText style={styles.label} cacheKey="update_image_optional">
  Update Image (Optional)
</TranslatableText>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <TranslatableText style={styles.imagePickerText}>
  {selectedImage ? 'Change Image' : 'Choose New Image'}
</TranslatableText>
            </TouchableOpacity>

            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <TranslatableText style={styles.imageInfoText}>
  {selectedImage.fileName || 'New image selected'}
</TranslatableText>
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {!selectedImage && item?.media_file && (
              <View style={styles.currentImageInfo}>
                <TranslatableText style={styles.currentImageText} cacheKey="keep_current_image">
  Current image will be kept if no new image is selected
</TranslatableText>
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
                <TranslatableText style={styles.saveButtonText} cacheKey="save_changes_btn">
  Save Changes
</TranslatableText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// Add FAB Component (add this after EditMediaModal component, before PartyUpdateItem)
const AddMediaFAB = ({ onPress, visible }) => {
  if (!visible) return null;
  
  return (
    <TouchableOpacity 
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.fabIcon}>+</Text>
    </TouchableOpacity>
  );
};

  // Development Card Component (similar to PartyUpdateItem)
const DevelopmentCard = React.memo(({ item, index, memberId, isAdmin, onEdit, onDelete }) => {
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isVideo, setIsVideo] = useState(false); // ✅ NEW: Track if media is video
  const [videoPaused, setVideoPaused] = useState(true); // ✅ NEW: Video playback control

  useEffect(() => {
    let mounted = true;
    
    const loadMedia = async () => {
      if (!item.media_file) {
        setMediaLoading(false);
        return;
      }
      
      setMediaLoading(true);
      setMediaError(false);
      
      try {
        const currentUserInfo = await getCurrentUserRole();
        const userEmailId = currentUserInfo.loggedin_email || '';
        
        let mediaUrl = item.media_file;
        
        // ✅ DETECT IF FILE IS VIDEO
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp'];
        const isVideoFile = videoExtensions.some(ext => 
          mediaUrl.toLowerCase().includes(ext)
        );
        setIsVideo(isVideoFile);
        
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
        
        // ✅ FOR VIDEOS: Just set the URL directly (no blob conversion needed)
        if (isVideoFile) {
          const appKey = await EncryptedStorage.getItem('APP_KEY');
          const accessToken = await EncryptedStorage.getItem('accessToken');
          
          // Add headers to URL for video playback
          const videoUrl = mediaUrl;
          
          if (mounted) {
            setMediaUri(videoUrl);
            setMediaLoading(false);
          }
          return;
        }
        
        // ✅ FOR IMAGES: Use blob conversion (existing code)
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
            setMediaUri(reader.result);
            setMediaLoading(false);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          if (mounted) {
            setMediaError(true);
            setMediaLoading(false);
          }
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('❌ Error loading media:', error);
        if (mounted) {
          setMediaError(true);
          setMediaLoading(false);
        }
      }
    };
    
    loadMedia();
    
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
      'Delete Development',
      'Are you sure you want to delete this development landscape?',
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
    <View style={styles.developmentCard}>
      {isAdmin && (
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.menuIcon}>⋮</Text>
        </TouchableOpacity>
      )}

      <ThreeDotMenu
        visible={menuVisible}
        position={menuPosition}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDismiss={() => setMenuVisible(false)}
      />

      {/* ✅ LOADING STATE */}
      {mediaLoading && (
        <View style={styles.imageLoadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
         <TranslatableText style={styles.loadingMediaText} cacheKey="loading_video">
  {isVideo ? 'Loading video...' : 'Loading image...'}
</TranslatableText>
        </View>
      )}

      {/* ✅ ERROR STATE */}
      {!mediaLoading && mediaError && (
        <View style={styles.imageErrorContainer}>
          <Text style={styles.imageErrorIcon}>
            {isVideo ? '🎥' : '🏗️'}
          </Text>
         <TranslatableText style={styles.imageErrorText} cacheKey="video_unavailable">
  {isVideo ? 'Video unavailable' : 'Image unavailable'}
</TranslatableText>
        </View>
      )}

      {/* ✅ VIDEO PLAYER */}
      {!mediaLoading && !mediaError && mediaUri && isVideo && (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: mediaUri }}
            style={styles.videoPlayer}
            resizeMode="contain"
            paused={videoPaused}
            controls={false}
            repeat={false}
            onError={(error) => {
              console.error('Video playback error:', error);
              setMediaError(true);
            }}
          />
          
          {/* ✅ PLAY/PAUSE OVERLAY */}
          <TouchableOpacity 
            style={styles.videoOverlay}
            onPress={() => setVideoPaused(!videoPaused)}
            activeOpacity={0.8}
          >
            {videoPaused && (
              <View style={styles.playButton}>
                <Icon name="play-arrow" size={48} color="#fff" />
              </View>
            )}
          </TouchableOpacity>

          {/* ✅ VIDEO INDICATOR */}
          <View style={styles.videoIndicator}>
            <Icon name="videocam" size={16} color="#fff" />
            <TranslatableText style={styles.videoIndicatorText} cacheKey="video_label">
  VIDEO
</TranslatableText>
          </View>
        </View>
      )}

      {/* ✅ IMAGE DISPLAY (Existing) */}
      {!mediaLoading && !mediaError && mediaUri && !isVideo && (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (item.media_url && item.media_url.trim() !== '') {
              Linking.openURL(item.media_url).catch(err => {
                console.error('Failed to open URL:', err);
                Alert.alert('Error', 'Could not open the link');
              });
            }
          }}
        >
          <Image 
            source={{ uri: mediaUri }}
            style={styles.cardImage} 
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {item.media_header && (
        <TranslatableText style={styles.cardTitle}>
  {item.media_header}
</TranslatableText>
      )}

      {item.media_narration && (
        <TranslatableText style={styles.cardDescription}>
  {item.media_narration}
</TranslatableText>
      )}

      {item.created_at && (
        <Text style={styles.cardDate}>
          {new Date(item.created_at).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          })}
        </Text>
      )}
    </View>
  );
});

  

  return (
    
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e16e2b" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header Section */}
       {/* Header Section */}
<View style={styles.header}>
  <View style={styles.headerContent}>
    <View style={styles.headerIcon}>
      <Image 
        source={landscapeLogo}
        style={styles.headerLogoImage}
        resizeMode="contain"
      />
    </View>
    <TranslatableText style={styles.pageTitle} cacheKey="dev_landscape_title">
      Development Landscape
    </TranslatableText>
    <TranslatableText style={styles.pageSubtitle} cacheKey="dev_landscape_subtitle">
      Transforming Communities Through Strategic Development
    </TranslatableText>
  </View>
  
  {/* Header Decorative Elements */}
  <View style={styles.headerDecoration1} />
  <View style={styles.headerDecoration2} />
  <View style={styles.headerDecoration3} />
</View>

         {isTranslating && (
        <View style={styles.translationLoadingBar}>
          <ActivityIndicator size="small" color="#e16e2b" />
          <Text style={styles.translationLoadingText}>Translating...</Text>
        </View>
      )}

        {/* Stats Overview - Always visible */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <TranslatableText style={styles.statsTitle} cacheKey="local_title">
  Local
</TranslatableText>
<TranslatableText style={styles.statsSubtitle} cacheKey="constituency_focus">
  Constituency Focus
</TranslatableText>
          </View>
          
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <TranslatableText style={styles.statsTitle} cacheKey="state_title">
  State
</TranslatableText>
<TranslatableText style={styles.statsSubtitle} cacheKey="regional_impact">
  Regional Impact
</TranslatableText>
          </View>
          
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <TranslatableText style={styles.statsTitle} cacheKey="national_title">
  National
</TranslatableText>
<TranslatableText style={styles.statsSubtitle} cacheKey="country_wide">
  Country-wide
</TranslatableText>
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e16e2b" />
            <TranslatableText style={styles.loadingText} cacheKey="loading_dev_data">
  Loading development data...
</TranslatableText>
          </View>
        ) : landscapeData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <TranslatableText style={styles.emptyText} cacheKey="no_dev_data">
  No development data available
</TranslatableText>
          </View>
        ) : (
          <View style={styles.dataContainer}>
            {landscapeData.map((item, index) => (
              <DevelopmentCard
                key={item._id || item.id || `dev-${index}`}
                item={item}
                index={index}
                memberId={regdMobileNo}
                isAdmin={isAdmin}        // ✅ ADD THIS
              onEdit={handleEdit}      // ✅ ADD THIS
              onDelete={handleDelete} 
              />
            ))}

            {/* Call to Action */}
            <View style={styles.ctaCard}>
              <View style={styles.ctaIconContainer}>
                <Icon name="rocket-launch" size={28} color="#e16e2b" />
              </View>
             <TranslatableText style={styles.ctaTitle} cacheKey="cta_title">
  Building Tomorrow, Today
</TranslatableText>
<TranslatableText style={styles.ctaSubtitle} cacheKey="cta_subtitle">
  Every initiative contributes to a stronger, more prosperous future for our communities.
</TranslatableText>
              <View style={styles.ctaButton}>
                <View style={styles.ctaButtonContent}>
                  <TranslatableText style={styles.ctaButtonText} cacheKey="learn_more_btn">
  Learn More
</TranslatableText>
                  <Icon name="arrow-forward" size={20} color="#fff" />
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
       <AddMediaFAB 
      visible={isAdmin}
      onPress={handleAddNew}
    />

    {/* ✅ ADD EDIT MODAL */}
    <EditMediaModal
      visible={editModalVisible}
      item={selectedItem}
      onClose={() => {
        setEditModalVisible(false);
        setSelectedItem(null);
      }}
      onSave={handleSave}
    />

    {/* ✅ ADD CREATE MODAL */}
    <AddMediaModal
      visible={addModalVisible}
      regdMobileNo={regdMobileNo}
      userEmail={userEmail}
      onClose={() => setAddModalVisible(false)}
      onSave={handleCreateNew}
    />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  dataContainer: {
    paddingHorizontal: 15,
  },
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 0,
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  headerDecoration1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerDecoration2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerDecoration3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Stats Styles (Always visible)
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 25,
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e16e2b',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  statsIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e16e2b',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  // Development Card Styles
  developmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
  },
  imageLoadingContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imageErrorContainer: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
  },
  imageErrorIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  imageErrorText: {
    color: '#c62828',
    fontSize: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 15,
    paddingBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 15,
    paddingBottom: 10,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
    paddingHorizontal: 15,
    paddingBottom: 15,
  },
  // CTA Styles
  ctaCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(225, 110, 43, 0.1)',
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  ctaButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonContent: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  // Add these to your existing DevelopmentLandscapeScreen styles:

menuButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
},
menuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
},
dropdownOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
},
dropdownMenu: {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderRadius: 8,
  minWidth: 120,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
  paddingVertical: 4,
},
dropdownItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 16,
},
dropdownItemIcon: {
  fontSize: 16,
  marginRight: 12,
},
dropdownItemText: {
  fontSize: 15,
  color: '#2c3e50',
  fontWeight: '500',
},
dropdownDeleteText: {
  color: '#e74c3c',
  fontWeight: '600',
},
dropdownSeparator: {
  height: 1,
  backgroundColor: '#ecf0f1',
  marginHorizontal: 8,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '90%',
  maxHeight: '80%',
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
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
  borderBottomColor: '#eee',
  backgroundColor: '#f8f9fa',
},
modalTitle: {
  fontSize: 20,
  fontWeight: 'bold',
  color: '#2c3e50',
},
closeButton: {
  fontSize: 28,
  color: '#7f8c8d',
  fontWeight: '300',
},
modalContent: {
  padding: 20,
  maxHeight: 400,
},
label: {
  fontSize: 14,
  fontWeight: '600',
  color: '#34495e',
  marginBottom: 8,
  marginTop: 10,
},
input: {
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
  fontSize: 16,
  color: '#2c3e50',
  backgroundColor: '#f9f9f9',
  marginBottom: 8,
},
textArea: {
  height: 100,
  textAlignVertical: 'top',
  paddingTop: 12,
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0f4f8',
  padding: 15,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
  borderStyle: 'dashed',
  marginBottom: 15,
},
imagePickerIcon: {
  fontSize: 24,
  marginRight: 10,
},
imagePickerText: {
  color: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
  fontSize: 16,
  fontWeight: '600',
},
selectedImagePreview: {
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 15,
  backgroundColor: '#f8f9fa',
  padding: 15,
  borderRadius: 8,
},
previewImage: {
  width: 150,
  height: 150,
  borderRadius: 8,
  marginBottom: 10,
  borderWidth: 2,
  borderColor: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
},
imageInfoText: {
  fontSize: 12,
  color: '#7f8c8d',
  marginBottom: 10,
  textAlign: 'center',
},
removeImageButton: {
  backgroundColor: '#e74c3c',
  paddingHorizontal: 15,
  paddingVertical: 8,
  borderRadius: 6,
  marginTop: 5,
},
removeImageText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
},
currentImageInfo: {
  backgroundColor: '#e8f5e9',
  padding: 12,
  borderRadius: 8,
  marginTop: 10,
  borderLeftWidth: 3,
  borderLeftColor: '#4caf50',
},
currentImageText: {
  fontSize: 12,
  color: '#2e7d32',
  fontStyle: 'italic',
},
modalFooter: {
  flexDirection: 'row',
  padding: 20,
  borderTopWidth: 1,
  borderTopColor: '#eee',
  gap: 10,
  backgroundColor: '#f8f9fa',
},
modalButton: {
  flex: 1,
  padding: 15,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 50,
},
cancelButton: {
  backgroundColor: '#ecf0f1',
  borderWidth: 1,
  borderColor: '#bdc3c7',
},
cancelButtonText: {
  color: '#7f8c8d',
  fontSize: 16,
  fontWeight: '600',
},
saveButton: {
  backgroundColor: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
  elevation: 2,
  shadowColor: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
saveButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: 'bold',
},
fab: {
  position: 'absolute',
  right: 20,
  bottom: 20,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#e16e2b',  // ⚠️ Changed to match DevelopmentLandscape theme
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
  zIndex: 999,
},
fabIcon: {
  fontSize: 32,
  color: '#fff',
  fontWeight: 'bold',
  lineHeight: 32,
},
videoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(225, 110, 43, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  videoIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 5,
  },
  loadingMediaText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  translationLoadingBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff3cd',
  paddingVertical: 8,
  paddingHorizontal: 15,
  gap: 10,
  marginHorizontal: 15,
  marginBottom: 10,
  borderRadius: 8,
},
translationLoadingText: {
  fontSize: 14,
  color: '#856404',
  fontWeight: '500',
},
headerIcon: {
  width: 100,
  height: 100,
  borderRadius: 60,     // MUST be exactly width/2
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  marginBottom: 16,
  overflow: 'hidden',   // THIS IS CRITICAL
  elevation: 4,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
},

headerLogoImage: {
  width: 120,
  height: 120,
  borderRadius: 60,
},
});

export default DevelopmentLandscapeScreen;