import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Linking,
  Alert,
  Modal,
  FlatList,
  ScrollView,
  Image,
  ActivityIndicator,
  Dimensions,
  TextInput,

} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import NotificationIcon from '../components/NotificationIcon';
import { languageData } from '../components/languages';
import { getCurrentUserRole,checkIfCurrentUserIsAdmin } from '../../App';
import { launchImageLibrary } from 'react-native-image-picker';

const { width } = Dimensions.get('window');

// ✅ Three Dot Menu Component (same as MediaCornerScreen)
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

// ✅ Edit Modal Component for Home Media
// ✅ Edit Modal Component for Home Media (Images Only)
const EditHomeMediaModal = ({ visible, item, onClose, onSave }) => {
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
        media_type: 'Home',
        media_file: selectedImage,
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update home media');
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
            <Text style={styles.modalTitle}>Edit Home Media Image</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Image</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Icon name="image" size={24} color="#e16e2b" />
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Select New Image (Optional)'}
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
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Add New Home Media Modal Component
const AddHomeMediaModal = ({ visible, onClose, onSave }) => {
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
        console.log('Home media image selected:', response.assets[0].uri);
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
      Alert.alert('Error', 'Failed to add home media');
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
            <Text style={styles.modalTitle}>Add New Home Media</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Select Image *</Text>
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

// ✅ Edit Modal Component for News Items
const EditNewsModal = ({ visible, item, onClose, onSave }) => {
  const [header, setHeader] = useState('');
  const [narration, setNarration] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setHeader(item.media_header || '');
      setNarration(item.media_narration || '');
      setUrl(item.media_url || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!header.trim()) {
      Alert.alert('Validation Error', 'Please enter a media header');
      return;
    }

    if (!narration.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: header,
        media_narration: narration,
        media_url: url,
        media_type: 'Home',
        media_file: null, // No image update for news
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update news item');
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
            <Text style={styles.modalTitle}>Edit News Item</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Header *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter media header"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description *</Text>
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
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ✅ Updated HomeMediaImage Component with Edit/Delete
const HomeMediaImage = React.memo(({ 
  item, 
  index, 
  memberId,
  onEdit,
  onDelete, 
  isAdmin
}) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    let mounted = true;
    
    const loadHomeImage = async () => {
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
        console.error('❌ Error loading Home image:', error);
        if (mounted) {
          setImageError(true);
          setImageLoading(false);
        }
      }
    };
    
    loadHomeImage();
    
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
      'Delete Home Media',
      'Are you sure you want to delete this item?',
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
    <View style={styles.homeMediaItem}>
      {/* ✅ Three Dot Menu Button - Only show for admin */}
      {isAdmin && (
        <TouchableOpacity 
          style={styles.homeMediaMenuButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.homeMediaMenuIcon}>⋮</Text>
        </TouchableOpacity>
      )}

      <ThreeDotMenu
        visible={menuVisible}
        position={menuPosition}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDismiss={() => setMenuVisible(false)}
      />

      {imageLoading && (
        <View style={styles.homeMediaLoadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
        </View>
      )}

      {!imageLoading && imageError && (
        <View style={styles.homeMediaErrorContainer}>
          <Text style={styles.homeMediaErrorIcon}>📷</Text>
          <Text style={styles.homeMediaErrorText}>Image unavailable</Text>
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
            style={styles.homeMediaImage} 
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

// MAIN COMPONENT
const HomeScreen = ({ navigation }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [homeMediaData, setHomeMediaData] = useState([]);
  const [homeMediaLoading, setHomeMediaLoading] = useState(false);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editNewsModalVisible, setEditNewsModalVisible] = useState(false);
const [selectedNewsItem, setSelectedNewsItem] = useState(null);
const [newsMenuVisible, setNewsMenuVisible] = useState(false);
const [newsMenuPosition, setNewsMenuPosition] = useState({ x: 0, y: 0 });
const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('user');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // ADD THIS LINE with your other state declarations:
const [addMediaModalVisible, setAddMediaModalVisible] = useState(false);
// Add with other useState declarations
const [ownerName, setOwnerName] = useState('Leader App');


  // ✅ ADD THIS ADMIN CHECK FUNCTION
const checkAdminRole = async () => {
  try {
    console.log('🔍 === CHECKING ADMIN ROLE IN HOME SCREEN ===');
    
    // Use the enhanced function from App.js
    const adminCheck = await checkIfCurrentUserIsAdmin();
    const currentRole = await getCurrentUserRole();
    
    console.log('👤 Current User Role Info:', currentRole);
    console.log('👑 Admin Check Result:', adminCheck);
    
    setIsAdmin(adminCheck.isAdmin);
    setUserRole(currentRole.userRole);
    setIsLoggedIn(currentRole.isLoggedIn);
    
    console.log('✅ Role check completed:', {
      isAdmin: adminCheck.isAdmin,
      userRole: currentRole.userRole,
      isLoggedIn: currentRole.isLoggedIn,
    });
    
    return adminCheck.isAdmin;
    
  } catch (error) {
    console.error('❌ Error checking admin role:', error);
    setIsAdmin(false);
    setUserRole('user');
    setIsLoggedIn(false);
    return false;
  }
};

  useEffect(() => {
    initializeHomeMedia();
  }, []);

  const getMobileNumberFromStorage = async () => {
    try {
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        const appOwnerInfo = JSON.parse(appOwnerInfoStr);
        const memberIdentifier = appOwnerInfo.mobile_no || 
                                appOwnerInfo.regdMobileNo || 
                                appOwnerInfo.mobile_number || 
                                '7702000725';
        return memberIdentifier;
      }
      
      const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                            await EncryptedStorage.getItem('OWNER_MOBILE') ||
                            '7702000725';
      return storedMemberId;
    } catch (error) {
      console.error('Error retrieving mobile number:', error);
      return '7702000725';
    }
  };

  const fetchHomeMedia = async (memberIdentifier) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const currentUserInfo = await getCurrentUserRole();
      const userEmailId = currentUserInfo.loggedin_email || '';
      
      const endpoint = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}&media_type=Home`;
      
      const result = await ApiService.authGet(endpoint);

      if (result.success && result.data) {
        let items = [];
        
        if (Array.isArray(result.data)) {
          items = result.data;
        } else if (result.data.media_items) {
          items = result.data.media_items;
        } else if (result.data.items) {
          items = result.data.items;
        }

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
      console.error('❌ API Error (Home media):', error);
      return { 
        success: false, 
        data: [],
        error: error.message 
      };
    }
  };

const initializeHomeMedia = async () => {
  try {
    setHomeMediaLoading(true);
    
    await checkAdminRole();
    
    const mobileNo = await getMobileNumberFromStorage();
    setRegdMobileNo(mobileNo);
    
    const currentUserInfo = await getCurrentUserRole();
    const email = currentUserInfo.loggedin_email || 'default@email.com';
    setUserEmail(email);
    
    // ✅ ADD THIS BLOCK - Get and set owner name
    const fetchedOwnerName = currentUserInfo.owner_name || '';
    if (fetchedOwnerName && fetchedOwnerName.trim() !== '') {
      setOwnerName(fetchedOwnerName);
      console.log('✅ Owner name loaded:', fetchedOwnerName);
    } else {
      setOwnerName('Leader App');
      console.log('⚠️ No owner name found, using default');
    }
    
    const homeMedia = await fetchHomeMedia(mobileNo);
    
    if (homeMedia.success && homeMedia.data) {
      setHomeMediaData(homeMedia.data);
    } else {
      setHomeMediaData([]);
    }
  } catch (error) {
    console.error('Error initializing home media:', error);
    setHomeMediaData([]);
    setOwnerName('Leader App'); // ✅ Fallback on error
  } finally {
    setHomeMediaLoading(false);
  }
};

  // ✅ Handle Edit (same logic as MediaCornerScreen)
  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditModalVisible(true);
  };

  // ✅ Handle Save (PUT request with FormData)
  const handleSave = async (updatedData) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/mediacorner`;

      const formData = new FormData();
      formData.append('regd_mobile_no', regdMobileNo);
      formData.append('user_email_id', userEmail);
      formData.append('media_header', updatedData.media_header);
      formData.append('media_narration', updatedData.media_narration);
      formData.append('media_url', updatedData.media_url);
      formData.append('media_type', 'Home');
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
        Alert.alert('✅ Success', 'Home media updated successfully');
        setEditModalVisible(false);
        setSelectedItem(null);
        initializeHomeMedia(); // Refresh the list
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('❌ Error updating home media:', error);
      Alert.alert('Error', error.message || 'Failed to update home media');
    }
  };
const handleNewsSave = async (updatedData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url || '');
    formData.append('media_type', 'Home');
    formData.append('id', updatedData.id);
    
    // ✅ DON'T append media_file at all for news updates
    
    console.log('📤 Sending PUT request for NEWS to:', apiUrl);
    console.log('📋 News Update Data:', {
      id: updatedData.id,
      header: updatedData.media_header,
      narration: updatedData.media_narration,
      url: updatedData.media_url
    });

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'News item updated successfully');
      setEditNewsModalVisible(false);
      setSelectedNewsItem(null);
      initializeHomeMedia(); // Refresh the list
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating news item:', error);
    Alert.alert('Error', error.message || 'Failed to update news item');
  }
};
  // ✅ Handle Delete (DELETE request)
  const handleDelete = async (item) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&id=${item._id || item.id}`;
      
      const result = await ApiService.authDelete(apiUrl);

      if (result.success) {
        Alert.alert('Success', 'Home media deleted successfully');
        initializeHomeMedia(); // Refresh the list
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting home media:', error);
      Alert.alert('Error', 'Failed to delete home media');
    }
  };

  // ✅ Handle News Edit
const handleNewsEdit = (item) => {
  setSelectedNewsItem(item);
  setEditNewsModalVisible(true);
};

// ✅ Handle News Delete
const handleNewsDelete = async (item) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&id=${item._id || item.id}`;
    
    const result = await ApiService.authDelete(apiUrl);

    if (result.success) {
      Alert.alert('Success', 'News item deleted successfully');
      initializeHomeMedia(); // Refresh the list
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('Error deleting news item:', error);
    Alert.alert('Error', 'Failed to delete news item');
  }
};

// ✅ Handle Add New Home Media
const handleAddMedia = async (selectedImage) => {
  try {
    console.log('➕ Adding new home media...');
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', 'null');
    formData.append('media_narration', 'null');
    formData.append('media_url', 'null');
    formData.append('media_type', 'Home');

    // Append the selected image file
    const fileUri = selectedImage.uri;
    const fileName = selectedImage.fileName || fileUri.split('/').pop();
    const fileType = selectedImage.type || 'image/jpeg';

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Sending POST request to create home media...');

    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Home media added successfully');
      setAddMediaModalVisible(false);
      initializeHomeMedia(); // Refresh the data
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error adding home media:', error);
    Alert.alert('Error', error.message || 'Failed to add home media');
  }
};

  const fontSize = 16;
  const lang = languageData[selectedLanguage];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
  ];

  const quickActions = [
    { id: 1, title: lang.knowLeader, icon: 'person', screen: 'KnowYourLeader' },
    { id: 2, title: lang.aboutConstituency, icon: 'location-on', screen: 'AboutConstituency' },
    { id: 3, title: lang.partyUpdates, icon: 'update', screen: 'PartyUpdates' },
    { id: 4, title: lang.feedback, icon: 'feedback', screen: 'Feedback' },
  ];

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language.code);
    setIsLanguageModalVisible(false);
    Alert.alert('Language Changed', `Language changed to ${language.name}`);
  };

  const handleSpeechToText = () => {
    setIsListening(!isListening);
    Alert.alert('Speech Recognition', isListening ? 'Speech recognition stopped' : 'Listening... Speak now!');
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        Alert.alert('Speech Recognition', 'Speech converted to text: "Hello, how are you?"');
      }, 3000);
    }
  };

  const handleQuickAction = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.action) {
      item.action();
    }
  };

  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={() => handleLanguageSelect(item)}>
      <Text style={styles.languageText}>{item.name}</Text>
      {selectedLanguage === item.code && (
        <Icon name="check" size={20} color="#FF6B35" />
      )}
    </TouchableOpacity>
  );
const renderHomeMediaGallery = () => {
  if (homeMediaLoading) {
    return (
      <View style={styles.homeMediaContainer}>
        <View style={styles.homeMediaLoadingState}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      </View>
    );
  }

  // ✅ UPDATED: Show "Add New" button if admin AND (0 banners OR 1+ banners)
  const showAddButton = isAdmin && homeMediaData && (homeMediaData.length === 0 || homeMediaData.length >= 1);

  return (
    <>
      <View style={styles.homeMediaContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.homeMediaScrollContent}
        >
          {/* Render existing home media items */}
          {homeMediaData && Array.isArray(homeMediaData) && homeMediaData.map((item, index) => {
            if (!item || !item.media_file) {
              return null;
            }
            
            return (
              <HomeMediaImage
                key={item._id || item.id || `home-media-${index}`}
                item={item}
                index={index}
                memberId={regdMobileNo}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isAdmin={isAdmin}
              />
            );
          })}

          {/* ✅ Add New Button - Show if admin AND (0 OR 1+ banners) */}
          {showAddButton && (
            <TouchableOpacity
              style={styles.homeMediaAddButton}
              onPress={() => setAddMediaModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={styles.homeMediaAddContent}>
                <Icon name="add-circle" size={48} color="#e16e2b" />
                <Text style={styles.homeMediaAddText}>
                  {homeMediaData.length === 0 ? 'Add Banner' : 'Add New'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Edit Modal for existing home media */}
      {isAdmin && (
        <EditHomeMediaModal
          visible={editModalVisible}
          item={selectedItem}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedItem(null);
          }}
          onSave={handleSave}
        />
      )}

      {/* ✅ Add Modal for new home media */}
      {isAdmin && (
        <AddHomeMediaModal
          visible={addMediaModalVisible}
          onClose={() => setAddMediaModalVisible(false)}
          onSave={handleAddMedia}
        />
      )}
    </>
  );
};
const renderNewsSection = () => {
  const newsItems = homeMediaData?.filter(item => 
    item.media_header && 
    item.media_narration && 
    item.media_header.trim() !== '' && 
    item.media_narration.trim() !== ''
  ) || [];

  if (newsItems.length === 0) {
    return (
      <View style={styles.newsSection}>
        <Text style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>{lang.latestNews}</Text>
        <View style={styles.newsCard}>
          <View style={styles.emptyNewsState}>
            <Icon name="article" size={48} color="#bdc3c7" />
            <Text style={styles.emptyStateText}>No news available at the moment</Text>
          </View>
        </View>
      </View>
    );
  }

  

  return (
    <View style={styles.newsSection}>
      <Text style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>{lang.latestNews}</Text>
      
      {newsItems.map((item, index) => {
        const newsDate = item.createdAt 
          ? new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : 'Recent';

       return (
  <View key={item._id || `news-${index}`} style={styles.newsCard}>
    {/* ✅ Three Dot Menu Button - Absolutely positioned at top-right */}
    {isAdmin && (
      <TouchableOpacity 
        style={styles.newsMenuButton}
        onPress={(event) => {
          const { pageX, pageY } = event.nativeEvent;
          setNewsMenuPosition({ x: pageX, y: pageY + 10 });
          setSelectedNewsItem(item);
          setNewsMenuVisible(true);
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.newsMenuIcon}>⋮</Text>
      </TouchableOpacity>
    )}

    <View style={styles.newsHeaderRow}>
      <View style={styles.newsHeader}>
        <Icon name="campaign" size={20} color="#e16e2b" />
        <Text style={[styles.newsTitle, { fontSize: fontSize, flex: 1, marginLeft: 8 }]}>
          {item.media_header}
        </Text>
      </View>
    </View>
    
    <Text style={[styles.newsDate, { fontSize: fontSize - 2 }]}>
      {newsDate}
    </Text>
    
    <Text 
      style={[styles.newsDescription, { fontSize: fontSize - 2 }]}
      numberOfLines={3}
    >
      {item.media_narration}
    </Text>

    {item.media_url && (
      <TouchableOpacity
        style={styles.readMoreButton}
        onPress={() => {
          if (item.media_url) {
            Linking.openURL(item.media_url).catch(err => {
              console.error('Failed to open URL:', err);
              Alert.alert('Error', 'Could not open the link');
            });
          }
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.readMoreText}>Read More</Text>
        <Icon name="arrow-forward" size={14} color="#e16e2b" />
      </TouchableOpacity>
    )}
  </View>
);
      })}

      {/* ✅ Only show menu and modals for admin */}
      {isAdmin && (
        <>
          <ThreeDotMenu
            visible={newsMenuVisible}
            position={newsMenuPosition}
            onEdit={() => {
              setNewsMenuVisible(false);
              if (selectedNewsItem) {
                handleNewsEdit(selectedNewsItem);
              }
            }}
            onDelete={() => {
              setNewsMenuVisible(false);
              if (selectedNewsItem) {
                Alert.alert(
                  'Delete News',
                  'Are you sure you want to delete this news item?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    { 
                      text: 'Yes', 
                      onPress: () => handleNewsDelete(selectedNewsItem),
                      style: 'destructive'
                    }
                  ]
                );
              }
            }}
            onDismiss={() => {
              setNewsMenuVisible(false);
              setSelectedNewsItem(null);
            }}
          />

          <EditNewsModal
            visible={editNewsModalVisible}
            item={selectedNewsItem}
            onClose={() => {
              setEditNewsModalVisible(false);
              setSelectedNewsItem(null);
            }}
            onSave={handleNewsSave}
          />
        </>
      )}
    </View>
  );
};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={35} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: 19 }]}>{ownerName}</Text>

        <View style={styles.rightHeaderSection}>
          <TouchableOpacity
            style={[styles.iconButton, isListening && styles.listeningButton]}
            onPress={handleSpeechToText}>
            <Icon
              name={isListening ? "mic" : "mic-none"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsLanguageModalVisible(true)}>
            <Icon name="translate" size={24} color="#fff" />
          </TouchableOpacity>
          <NotificationIcon
            onPress={() => Alert.alert('Notifications', 'You have 3 new notifications!')}
            badgeCount={3}
            iconColor="#fff"
          />
        </View>
      </View>

      <ScrollView style={styles.content}>
       <View style={styles.welcomeSection}>
  
  <Text style={[styles.welcomeSubtitle, { fontSize: fontSize+8 }]}>
    Welcome to {ownerName} App
  </Text>
  <Text style={[styles.welcomeDescription, { fontSize: fontSize - 2 }]}>
    {lang.stayConnected}
  </Text>
</View>

        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>{lang.quickActions}</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(item)}
              >
                <Icon name={item.icon} size={32} color="#e16e2b" />
                <Text style={[styles.quickActionText, { fontSize: fontSize - 2 }]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {renderHomeMediaGallery()}
        {renderNewsSection()}
      </ScrollView>

      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('LokSahayak')}>
        <Icon name="chat" size={28} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLanguageModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLanguageModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                onPress={() => setIsLanguageModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={languages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#e16e2b',
  },
  menuButton: { padding: 5 },
  headerTitle: { fontWeight: 'bold', color: '#fff', flex: 1, textAlign: 'left' },
  rightHeaderSection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { padding: 8, borderRadius: 20, backgroundColor: 'transparent' },
  listeningButton: { backgroundColor: '#FFE5DB' },
  content: { flex: 1, backgroundColor: '#f5f5f5' },
  welcomeSection: { backgroundColor: '#e16e2b', padding: 20, marginBottom: 20 },
  welcomeTitle: { fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  welcomeSubtitle: { color: '#fff', opacity: 0.9 },
  quickActionsSection: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { fontWeight: 'bold', color: '#333', marginBottom: 15 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: { color: '#333', textAlign: 'center', marginTop: 8, fontWeight: '500' },
  newsSection: { paddingHorizontal: 20, marginBottom: 20 },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  newsTitle: { fontWeight: 'bold', color: '#333', marginBottom: 4 },
  newsDate: { color: '#e16e2b', marginBottom: 8 },
  newsDescription: { color: '#666', lineHeight: 20 },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  readMoreText: { color: '#e16e2b', fontSize: 14, fontWeight: '600', marginRight: 4 },
  emptyNewsState: { alignItems: 'center', padding: 20 },
  emptyStateText: { marginTop: 10, color: '#999', fontSize: 14 },
  chatButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#e16e2b',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  
  // Language Modal Styles
  languageList: { maxHeight: 200 },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  languageText: { fontSize: 16, color: '#333', marginLeft: 12, flex: 1 },

  // Home Media Gallery Styles
  homeMediaContainer: { paddingVertical: 10, paddingLeft: 15, backgroundColor: '#fff', marginBottom: 20 },
  homeMediaScrollContent: { paddingRight: 15, paddingBottom: 5 },
  homeMediaItem: {
    width: 330,
    height: 200,
    marginRight: 15,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
  },
  homeMediaImage: { width: '100%', height: '100%' },
  homeMediaLoadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  homeMediaErrorContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
  },
  homeMediaErrorIcon: { fontSize: 40, marginBottom: 8 },
  homeMediaErrorText: { color: '#c62828', fontSize: 14, textAlign: 'center' },
  homeMediaLoadingState: { height: 200, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },

  // Three Dot Menu Button on Image
  homeMediaMenuButton: {
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  homeMediaMenuIcon: {
    fontSize: 18,
    color: '#2c3e50',
    fontWeight: 'bold',
    lineHeight: 18,
  },

  // Dropdown Menu Styles
  dropdownOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
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
  dropdownItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16 },
  dropdownItemIcon: { fontSize: 16, marginRight: 12 },
  dropdownItemText: { fontSize: 15, color: '#2c3e50', fontWeight: '500' },
  dropdownDeleteItem: {},
  dropdownDeleteText: { color: '#e74c3c', fontWeight: '600' },
  dropdownSeparator: { height: 1, backgroundColor: '#ecf0f1', marginHorizontal: 8 },

  // Edit Modal Styles
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0, 0, 0, 0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#2c3e50' },
  closeButton: { fontSize: 28, color: '#7f8c8d', fontWeight: '300' },
  modalContent: { padding: 20, maxHeight: 400 },
  label: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#34495e', 
    marginBottom: 8, 
    marginTop: 10 
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
  textArea: { height: 100, textAlignVertical: 'top', paddingTop: 12 },
  
  // Image Picker Button
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e16e2b',
    borderRadius: 8,
    padding: 15,
    backgroundColor: '#fff5f0',
    marginBottom: 10,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#e16e2b',
    fontWeight: '600',
    marginLeft: 10,
  },
  
  // Image Preview
  selectedImagePreview: {
    marginTop: 10,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  previewImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  imageInfoText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
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
  cancelButtonText: { color: '#7f8c8d', fontSize: 16, fontWeight: '600' },
  saveButton: { 
    backgroundColor: '#e16e2b',
    elevation: 2,
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // Add these to your existing styles object
newsMenuButton: {
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
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
newsMenuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 18,
},
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  // Add these to the styles object:

homeMediaAddButton: {
  width: 330,
  height: 200,
  marginRight: 15,
  borderRadius: 12,
  backgroundColor: '#f8f9fa',
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
},
homeMediaAddContent: {
  alignItems: 'center',
},
homeMediaAddText: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '600',
  color: '#e16e2b',
},
 welcomeSubtitle: { 
    color: '#fff', 
    opacity: 0.9,
    fontWeight: '600' // ✅ Make it slightly bold
  },
  
  // ✅ ADD THIS NEW STYLE
  welcomeDescription: { 
    color: '#fff', 
    opacity: 0.85,
    marginTop: 4,
    lineHeight: 20
  },
});

export default HomeScreen;