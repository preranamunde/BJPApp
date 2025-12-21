import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';

const { width } = Dimensions.get('window');

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
// Add Media Modal Component
const AddEventModal = ({ visible, onClose, onSave, regdMobileNo, userEmail }) => {
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
        console.log('File selected:', response.assets[0].uri);
      }
    });
  };

 const handleSave = async () => {
  if (!header.trim()) {
    Alert.alert('Validation Error', 'Please enter an event title');
    return;
  }

  if (!selectedImage) {
    Alert.alert('Validation Error', 'Please select an image file');
    return;
  }

  setSaving(true);
  try {
    console.log('🔄 Starting event creation...');
    
    // ✅ GET FRESH USER INFO (SAME AS PASSWORD CHANGE)
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
    
    // STEP 1: Fallback - Get from AsyncStorage
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
          
          if (!loggedInEmail) {
            loggedInEmail = parsedUserData.email ||
                           parsedUserData.emailid ||
                           parsedUserData.user_email_id ||
                           parsedUserData.email_id ||
                           parsedUserData.user_email ||
                           '';
          }
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
      setSaving(false);
      return;
    }

    // STEP 4: Prepare and send request
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', mobileNo);      // ✅ Fresh mobile
    formData.append('user_email_id', loggedInEmail);         // ✅ Fresh email
    formData.append('media_header', header);
    formData.append('media_narration', narration);
    formData.append('media_url', url);
    formData.append('media_type', 'UE');

    // Add the file
    const fileUri = selectedImage.uri;
    const fileName = fileUri.split('/').pop();
    const fileType = selectedImage.type || (
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'image/png'
    );

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Creating new event...');
    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    console.log('📥 POST Response:', result);

    if (result.success) {
      Alert.alert('✅ Success', 'Event created successfully');
      onSave();
      onClose();
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error creating event:', error);
    Alert.alert('Error', error.message || 'Failed to create event');
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
            <Text style={styles.modalTitle}>Add New Event</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header Input */}
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter event title"
              placeholderTextColor="#999"
            />

            {/* Description Input */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={narration}
              onChangeText={setNarration}
              placeholder="Enter event description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            {/* URL Input */}
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter URL (optional)"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            {/* File Upload Section */}
            <Text style={styles.label}>Event Image *</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Choose Image'}
              </Text>
            </TouchableOpacity>

            {/* Show selected file preview */}
            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                <Image 
                  source={{ uri: selectedImage.uri }} 
                  style={styles.previewImage}
                  resizeMode="cover"
                />
                <Text style={styles.imageInfoText}>
                  {selectedImage.fileName || 'File selected'}
                </Text>
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕ Remove</Text>
                </TouchableOpacity>
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
                <Text style={styles.saveButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
// ✅ Edit Modal Component
// ✅ Edit Modal Component with Image Upload
const EditEventModal = ({ visible, item, onClose, onSave }) => {
  const [header, setHeader] = useState('');
  const [narration, setNarration] = useState('');
  const [url, setUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);  // ✅ NEW
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setHeader(item.media_header || '');
      setNarration(item.media_narration || '');
      setUrl(item.media_url || '');
      setSelectedImage(null);  // ✅ Reset image on new item
    }
  }, [item]);

  // ✅ NEW: Image picker handler
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
      Alert.alert('Validation Error', 'Please enter an event title');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        id: item._id || item.id,
        media_header: header,
        media_narration: narration,
        media_url: url,
        media_type: 'UE',
        media_file: selectedImage  // ✅ Include selected image
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update event');
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
            <Text style={styles.modalTitle}>Edit Event</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Event Title Input */}
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter event title"
              placeholderTextColor="#999"
            />

            {/* Description Input */}
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={narration}
              onChangeText={setNarration}
              placeholder="Enter event description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            {/* URL Input */}
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter event URL"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            {/* ✅ NEW: Image Upload Section */}
            <Text style={styles.label}>Update Image (Optional)</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change Image' : 'Choose New Image'}
              </Text>
            </TouchableOpacity>

            {/* ✅ NEW: Show selected image preview */}
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
                <TouchableOpacity 
                  style={styles.removeImageButton}
                  onPress={() => setSelectedImage(null)}
                >
                  <Text style={styles.removeImageText}>✕ Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ✅ Show current image info if no new image selected */}
            {!selectedImage && item?.media_file && (
              <View style={styles.currentImageInfo}>
                <Text style={styles.currentImageText}>
                  Current image will be kept if no new image is selected
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
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ✅ Event Item Component
const EventItem = React.memo(({ 
  item, 
  index, 
  regdMobileNo, 
  userEmail,
  isAdmin,
  onEdit,
  onDelete 
}) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

 useEffect(() => {
  let mounted = true;
  
  const loadAuthenticatedImage = async () => {
    if (!item.media_file) return;
    
    setImageLoading(true);
    
    try {
      // ✅ Normalize the media URL
      let mediaUrl = item.media_file;
      
      // If it's already a full URL, normalize it
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
        // Remove port from ngrok URLs
        if (mediaUrl.includes('ngrok-free.app:')) {
          mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
          console.log('🔧 Fixed ngrok URL (removed port):', mediaUrl);
        }
        
        // Replace localhost with ngrok
        if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
          const baseUrl = await ConfigService.getBaseUrl();
          mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          console.log('🔧 Replaced localhost with ngrok:', mediaUrl);
        }
      } else {
        // For relative paths, construct full URL
        const baseUrl = await ConfigService.getBaseUrl();
        const cleanMediaFile = mediaUrl.replace(/^[\\\/]+/, '');
        const encodedMediaFile = encodeURIComponent(cleanMediaFile);
        const encodedEmail = encodeURIComponent(userEmail);
        
        mediaUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
      }
      
      console.log('🔑 Fetching image from:', mediaUrl);
      
      // Get authentication credentials
      const appKey = await EncryptedStorage.getItem('APP_KEY');
      const accessToken = await EncryptedStorage.getItem('accessToken');
      
      // Fetch with proper headers
      const response = await fetch(mediaUrl, {
        method: 'GET',
        headers: {
          'x-app-key': appKey || '',
          'Authorization': `Bearer ${accessToken || ''}`,
          'ngrok-skip-browser-warning': 'true', // ✅ Critical for ngrok
          'Accept': 'image/*',
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText.substring(0, 200));
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Convert to blob
      const blob = await response.blob();
      console.log('📦 Image blob size:', blob.size, 'bytes');
      console.log('📦 Image blob type:', blob.type);
      
      // Convert blob to base64
      const reader = new FileReader();
      
      reader.onloadend = () => {
        if (mounted) {
          console.log('✅ Image loaded as base64');
          setImageUri(reader.result);
        }
      };
      
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        if (mounted) setImageUri(null);
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('❌ Error loading image:', error);
      console.error('❌ Details:', error.message);
      if (mounted) setImageUri(null);
    } finally {
      if (mounted) setImageLoading(false);
    }
  };
  
  loadAuthenticatedImage();
  
  return () => {
    mounted = false;
  };
}, [item.media_file, regdMobileNo, userEmail]);

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
      'Delete Event',
      'Are you sure you want to delete this event?',
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
    <View style={styles.eventItem}>
      <View style={styles.eventHeader}>
        <View style={styles.eventHeaderContent}>
          {item.media_header && (
            <Text style={styles.eventTitle}>{item.media_header}</Text>
          )}
          {item.created_at && (
            <Text style={styles.eventDate}>
              {new Date(item.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
              })}
            </Text>
          )}
        </View>
        
        {isAdmin && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleMenuPress}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>⋮</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* ✅ Only show menu for admin */}
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
        <View style={[styles.eventImage, styles.imageLoadingContainer]}>
          <ActivityIndicator size="large" color="#f56c3aff" />
        </View>
      )}

      {!imageLoading && imageUri && (
        <Image 
          source={{ uri: imageUri }}
          style={styles.eventImage} 
          resizeMode="cover"
        />
      )}

      {!imageLoading && !imageUri && item.media_file && (
        <View style={[styles.eventImage, styles.imageErrorContainer]}>
          <Text style={styles.imageErrorText}>Failed to load image</Text>
        </View>
      )}

      {item.media_narration && (
        <Text style={styles.eventDescription}>{item.media_narration}</Text>
      )}

      {item.media_url && (
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => Linking.openURL(item.media_url).catch(() => 
            Alert.alert('Error', 'Could not open the link')
          )}
        >
          <Text style={styles.linkText}>View More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// Add FAB Component
const AddEventFAB = ({ onPress, visible }) => {
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
// ✅ MAIN COMPONENT
const UpcomingEventsScreen = () => {
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const [userRole, setUserRole] = useState('user');
const [isAdmin, setIsAdmin] = useState(false);
const [isLoggedIn, setIsLoggedIn] = useState(false);
const [loggedInEmail, setLoggedInEmail] = useState('');
const [ownerEmail, setOwnerEmail] = useState('');
const [addModalVisible, setAddModalVisible] = useState(false);

const checkUserRoleAndPermissions = async () => {
  try {
    console.log('🔍 === CHECKING USER ROLE AND PERMISSIONS ===');

    // Use getCurrentUserRole from App.js
    const currentUserInfo = await getCurrentUserRole();

    console.log('User role information:', {
      userRole: currentUserInfo.userRole,
      isAdmin: currentUserInfo.isAdmin,
      isLoggedIn: currentUserInfo.isLoggedIn,
    });

    // Update state with user information
    setUserRole(currentUserInfo.userRole);
    setIsAdmin(currentUserInfo.isAdmin);
    setIsLoggedIn(currentUserInfo.isLoggedIn);
    setLoggedInEmail(currentUserInfo.loggedin_email);
    setOwnerEmail(currentUserInfo.owner_emailid);

    // Additional check using checkIfCurrentUserIsAdmin
    const adminCheck = await checkIfCurrentUserIsAdmin();

    console.log('Admin status verification:', {
      isAdminFromRole: currentUserInfo.isAdmin,
      isAdminFromCheck: adminCheck.isAdmin,
      reason: adminCheck.reason
    });

    // Use the most restrictive check
    const finalAdminStatus = currentUserInfo.isAdmin && adminCheck.isAdmin;
    setIsAdmin(finalAdminStatus);

    if (finalAdminStatus) {
      console.log('👑 ADMIN ACCESS GRANTED - Edit features enabled');
    } else {
      console.log('👤 USER ACCESS - Read-only mode');
    }

  } catch (error) {
    console.error('❌ Error checking user permissions', error);
    // Default to user role on error
    setUserRole('user');
    setIsAdmin(false);
    setIsLoggedIn(false);
  }
};

 useEffect(() => {
  const initialize = async () => {
    await checkUserRoleAndPermissions(); // Check role first
    await initializeUserData();
  };
  initialize();
}, []);

  useEffect(() => {
    if (regdMobileNo && userEmail) {
      fetchEventsData();
    }
  }, [regdMobileNo, userEmail]);

const initializeUserData = async () => {
  try {
    console.log('🔍 === INITIALIZING USER DATA FOR UPCOMING EVENTS ===');
    
    // ✅ GET FRESH USER INFO (SAME AS PASSWORD CHANGE)
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
            mobile: mobileNo
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

    // Validate we have both values
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

    setRegdMobileNo(mobileNo);
    setUserEmail(loggedInEmail);
    
  } catch (error) {
    console.error('❌ Error initializing user data:', error);
    Alert.alert('Error', 'Failed to load user information. Please restart the app.');
  }
};

  const fetchEventsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&media_type=UE`;
      
      const result = await ApiService.authGet(apiUrl);

      if (result.success && result.data) {
        let items = [];
        
        if (Array.isArray(result.data)) {
          items = result.data;
        } else if (result.data.media_items) {
          items = result.data.media_items;
        } else if (result.data.items) {
          items = result.data.items;
        }

        setEventsData(items);
      } else {
        setEventsData([]);
      }

    } catch (err) {
      console.error('Error fetching events data:', err);
      setError(err.message || 'Failed to load upcoming events');
      Alert.alert('Error', 'Failed to load upcoming events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item) => {
    setSelectedItem(item);
    setEditModalVisible(true);
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
      formData.append('media_type', 'UE');
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
        Alert.alert('Success', 'Event updated successfully');
        setEditModalVisible(false);
        setSelectedItem(null);
        fetchEventsData();
      } else {
        throw new Error(result.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating event:', error);
      Alert.alert('Error', error?.message || 'Failed to update event');
    }
  };

  const handleDelete = async (item) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&id=${item._id || item.id}`;
      
      const result = await ApiService.authDelete(apiUrl);

      if (result.success) {
        Alert.alert('Success', 'Event deleted successfully');
        fetchEventsData();
      } else {
        throw new Error(result.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      Alert.alert('Error', 'Failed to delete event');
    }
  };

  const handleAddNew = () => {
  setAddModalVisible(true);
};

const handleAddSuccess = () => {
  setAddModalVisible(false);
  fetchEventsData();
};

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f56c3aff" />
        <Text style={styles.loadingText}>Loading upcoming events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={fetchEventsData}
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        {eventsData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No upcoming events available</Text>
          </View>
        ) : (
          eventsData.map((item, index) => (
            <EventItem
              key={item._id || item.id || index}
              item={item}
              index={index}
              regdMobileNo={regdMobileNo}
              userEmail={userEmail}
              isAdmin={isAdmin}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      {/* Add FAB for admin */}
      <AddEventFAB 
        visible={isAdmin}
        onPress={handleAddNew}
      />

      {/* Edit Modal */}
      <EditEventModal
        visible={editModalVisible}
        item={selectedItem}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
      />

      {/* Add Modal */}
      <AddEventModal
        visible={addModalVisible}
        regdMobileNo={regdMobileNo}
        userEmail={userEmail}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddSuccess}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  
  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#f56c3aff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 300,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },

  // Event Item Styles
  eventItem: {
    width: width * 0.9,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 20,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  eventHeaderContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  eventDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  
  // Action Button
  actionButton: {
    backgroundColor: 'rgba(52, 73, 94, 0.1)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButtonText: {
    fontSize: 20,
    color: '#2c3e50',
    fontWeight: 'bold',
    lineHeight: 20,
  },
  
  // Dropdown Menu
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
  dropdownDeleteItem: {},
  dropdownDeleteText: {
    color: '#e74c3c',
    fontWeight: '600',
  },
  dropdownSeparator: {
    height: 1,
    backgroundColor: '#ecf0f1',
    marginHorizontal: 8,
  },
  
  // Image Styles
  eventImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  imageLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  imageErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffebee',
  },
  imageErrorText: {
    color: '#c62828',
    fontSize: 14,
  },
  
  eventDescription: {
    fontSize: 14,
    color: '#34495e',
    lineHeight: 20,
    marginBottom: 10,
  },
  linkButton: {
    backgroundColor: '#f56c3aff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 5,
  },
  linkText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },

  // Modal Styles
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
    backgroundColor: '#f56c3aff',
    elevation: 2,
    shadowColor: '#f56c3aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Add these styles inside your StyleSheet.create({ ... })

imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0f4f8',
  padding: 15,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#f56c3aff',
  borderStyle: 'dashed',
  marginBottom: 15,
},
imagePickerIcon: {
  fontSize: 24,
  marginRight: 10,
},
imagePickerText: {
  color: '#f56c3aff',
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
  borderColor: '#f56c3aff',
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
// Add to existing styles
fab: {
  position: 'absolute',
  right: 20,
  bottom: 20,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#f56c3aff',
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
},
fabIcon: {
  fontSize: 32,
  color: '#fff',
  fontWeight: 'bold',
  lineHeight: 32,
},
});

export default UpcomingEventsScreen;