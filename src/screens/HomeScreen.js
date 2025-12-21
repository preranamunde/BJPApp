import React, { useState, useEffect,useRef } from 'react';
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
Button,
lang,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import NotificationIcon from '../components/NotificationIcon';

import { getCurrentUserRole,checkIfCurrentUserIsAdmin } from '../../App';
import { launchImageLibrary } from 'react-native-image-picker';
import messaging from '@react-native-firebase/messaging';
import crashlytics from '@react-native-firebase/crashlytics';
import { useTranslation } from '../context/TranslationContext';
import TranslatableText from '../components/TranslatableText';

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

// ✅ NEW: Add Latest News Modal Component
const AddLatestNewsModal = ({ visible, onClose, onSave }) => {
  const [header, setHeader] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setHeader('');
      setDescription('');
      setUrl('');
    }
  }, [visible]);

  const handleSave = async () => {
    if (!header.trim()) {
      Alert.alert('Validation Error', 'Please enter a header');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    setSaving(true);
    try {
      await onSave({ header, description, url });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to add latest news');
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
            <Text style={styles.modalTitle}>Add Latest News</Text>
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
              placeholder="Enter news header"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter news description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter URL (optional)"
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
                <Text style={styles.saveButtonText}>Add News</Text>
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
// Add these state/ref declarations with your other useState
const scrollViewRef = useRef(null);
const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
const autoScrollInterval = useRef(null);
// Add this with your other state declarations (around line 215-220)
const [latestNewsData, setLatestNewsData] = useState([]);
const [newsLoading, setNewsLoading] = useState(false);
// Add with other useState declarations
const [clientAppName, setClientAppName] = useState('Leader App');

const { 
  currentLanguage, 
  changeLanguage, 
  isTranslating, 
  setIsTranslating,
  availableLanguages 
} = useTranslation();

const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
const [addNewsModalVisible, setAddNewsModalVisible] = useState(false);

const fontSize = 16;
// Add this AFTER the useTranslation hook (around line 230)


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


useEffect(() => {
  const testTranslationModule = async () => {
    console.log('🧪 Testing Translation Module in HomeScreen...');
    
    try {
      const TranslationService = (await import('../services/TranslationService')).default;
      
      // Test translation
      const result = await TranslationService.testTranslation();
      
      if (result.success) {
        console.log(`✅ Translation test passed: ${result.translated}`);
        // Don't show Alert in production, only log
      } else {
        console.log('⚠️ Translation test failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Test error:', error);
    }
  };

  // Run test after 3 seconds (only in development)
  if (__DEV__) {
    const timer = setTimeout(testTranslationModule, 3000);
    return () => clearTimeout(timer);
  }
}, []);

  useEffect(() => {
  const showFCMToken = async () => {
    try {
      // Get FCM token
      const fcmToken = await messaging().getToken();
      
      if (fcmToken) {
        console.log('🔑 FCM Token:', fcmToken);
        
        // Show in Alert Dialog
        Alert.alert(
          '🔔 FCM Token Ready',
          `Your device token:\n\n${fcmToken}\n\nCopy this token to send notifications from Firebase Console.`,
          [
            { 
              text: 'Copy Token', 
              onPress: () => {
                // You can use Clipboard API here if needed
                console.log('Token copied:', fcmToken);
                Alert.alert('Copied!', 'Token logged in console');
              }
            },
            { text: 'OK' }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error getting FCM token:', error);
      Alert.alert('Error', 'Could not get FCM token: ' + error.message);
    }
  };

  // Show token after 3 seconds (when app is ready)
  setTimeout(() => {
    showFCMToken();
  }, 3000);
}, []);

// ✅ Auto-scroll effect for banners (only for non-admin users)
useEffect(() => {
  // Only auto-scroll if user is NOT admin and has banner data
  if (!isAdmin && homeMediaData && homeMediaData.length > 1 && !homeMediaLoading) {
    // Clear any existing interval
    if (autoScrollInterval.current) {
      clearInterval(autoScrollInterval.current);
    }

    // Start auto-scroll interval (every 3 seconds)
    autoScrollInterval.current = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % homeMediaData.length;
        
        // Scroll to next banner
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * (330 + 15), // banner width + margin
            animated: true,
          });
        }
        
        return nextIndex;
      });
    }, 3000); // Change banner every 3 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      if (autoScrollInterval.current) {
        clearInterval(autoScrollInterval.current);
      }
    };
  }
}, [isAdmin, homeMediaData, homeMediaLoading]);

 const getMobileNumberFromStorage = async () => {
  try {
    // ✅ FIRST: Try to get owner mobile from App.js global state
    const ownerMobileFromGlobal = global.owner_mobile;
    if (ownerMobileFromGlobal) {
      console.log('✅ Using owner mobile from global:', ownerMobileFromGlobal);
      return ownerMobileFromGlobal;
    }

    // ✅ SECOND: Try encrypted storage (set by bootstrap)
    const ownerMobileFromStorage = await EncryptedStorage.getItem('OWNER_MOBILE');
    if (ownerMobileFromStorage) {
      console.log('✅ Using owner mobile from storage:', ownerMobileFromStorage);
      return ownerMobileFromStorage;
    }

    // ✅ THIRD: Try AppOwnerInfo
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      const memberIdentifier = appOwnerInfo.mobile_no || 
                              appOwnerInfo.regdMobileNo || 
                              appOwnerInfo.mobile_number ||
                              appOwnerInfo.client_mobile;
      if (memberIdentifier) {
        console.log('✅ Using owner mobile from AppOwnerInfo:', memberIdentifier);
        return memberIdentifier;
      }
    }
    
    // ✅ FALLBACK: Use default
    console.warn('⚠️ No owner mobile found, using default: 7702000725');
    return '7702000725';
  } catch (error) {
    console.error('❌ Error retrieving mobile number:', error);
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

  const fetchLatestNews = async (memberIdentifier) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const currentUserInfo = await getCurrentUserRole();
    const userEmailId = currentUserInfo.loggedin_email || '';
    
    // ✅ CHANGE: Use media_type=LN for Latest News
    const endpoint = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${encodeURIComponent(memberIdentifier)}&user_email_id=${encodeURIComponent(userEmailId)}&media_type=LN`;
    
    console.log('📰 Fetching Latest News from:', endpoint);
    
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

      console.log('✅ Latest News items fetched:', items.length);
      return {
        success: true,
        data: items,
        error: null
      };
    } else {
      console.log('⚠️ No latest news data found');
      return {
        success: true,
        data: [],
        error: null
      };
    }
  } catch (error) {
    console.error('❌ API Error (Latest News):', error);
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
    setNewsLoading(true); // ✅ ADD THIS
    
    await checkAdminRole();
    const mobileNo = await getMobileNumberFromStorage();
    console.log('📱 === OWNER MOBILE BEING USED ===');
    console.log('   Mobile No:', mobileNo);
    console.log('   Source: getMobileNumberFromStorage()');
    
    setRegdMobileNo(mobileNo);
    
    const currentUserInfo = await getCurrentUserRole();
    const email = currentUserInfo.loggedin_email || 'default@email.com';
    setUserEmail(email);
    
    const fetchedAppName = currentUserInfo.client_app_name || '';
    if (fetchedAppName && fetchedAppName.trim() !== '') {
      setClientAppName(fetchedAppName);
      console.log('✅ Client app name loaded:', fetchedAppName);
    } else {
      setClientAppName('Leader App');
      console.log('⚠️ No client app name found, using default');
    }
    
    // ✅ FETCH BOTH Home Media AND Latest News
    const [homeMedia, latestNews] = await Promise.all([
      fetchHomeMedia(mobileNo),
      fetchLatestNews(mobileNo) // ✅ ADD THIS
    ]);
    
    // Set Home Media
    if (homeMedia.success && homeMedia.data) {
      setHomeMediaData(homeMedia.data);
      console.log('✅ Home media loaded:', homeMedia.data.length, 'items');
    } else {
      setHomeMediaData([]);
      console.log('⚠️ No home media found');
    }
    
    // ✅ SET LATEST NEWS
    if (latestNews.success && latestNews.data) {
      setLatestNewsData(latestNews.data);
      console.log('✅ Latest news loaded:', latestNews.data.length, 'items');
    } else {
      setLatestNewsData([]);
      console.log('⚠️ No latest news found');
    }
    
  } catch (error) {
    console.error('Error initializing home media:', error);
    setHomeMediaData([]);
    setLatestNewsData([]); // ✅ ADD THIS
    setClientAppName('Leader App');
  } finally {
    setHomeMediaLoading(false);
    setNewsLoading(false); // ✅ ADD THIS
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
      formData.append('leader_regd_mobile_no', regdMobileNo);
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
// Update handleNewsSave (around line 500)
const handleNewsSave = async (updatedData) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url || '');
    formData.append('media_type', 'LN'); // ✅ CHANGE: Home -> LN
    formData.append('id', updatedData.id);
    
    console.log('📤 Sending PUT request for LATEST NEWS to:', apiUrl);

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'News item updated successfully');
      setEditNewsModalVisible(false);
      setSelectedNewsItem(null);
      initializeHomeMedia(); // This will refresh both
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
    formData.append('leader_regd_mobile_no', regdMobileNo);
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

// ✅ NEW: Handle Add Latest News
const handleAddLatestNews = async (newsData) => {
  try {
    console.log('➕ Adding new latest news...');
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', userEmail);
    formData.append('media_header', newsData.header);
    formData.append('media_narration', newsData.description);
    formData.append('media_url', newsData.url || '');
    formData.append('media_type', 'LN'); // ✅ Latest News type

    console.log('📤 Sending POST request to create latest news...');

    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    if (result.success) {
      Alert.alert('✅ Success', 'Latest news added successfully');
      setAddNewsModalVisible(false);
      initializeHomeMedia(); // Refresh the data
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error adding latest news:', error);
    Alert.alert('Error', error.message || 'Failed to add latest news');
  }
};
  

 const languages = Object.entries(availableLanguages).map(([code, data]) => ({
  code,
  name: data.name,
}));


  const quickActions = [
  { id: 1, title: 'Know Your Leader', titleKey: 'know_leader', icon: 'person', screen: 'KnowYourLeader' },
  { id: 2, title: 'About Constituency', titleKey: 'about_constituency', icon: 'location-on', screen: 'AboutConstituency' },
  { id: 3, title: 'Party Updates', titleKey: 'party_updates', icon: 'update', screen: 'PartyUpdates' },
  { id: 4, title: 'Feedback', titleKey: 'feedback', icon: 'feedback', screen: 'Feedback' },
];

// Update the handleLanguageSelect function in HomeScreen.js

const handleLanguageSelect = async (languageCode) => {
  console.log(`\n🌐 === USER SELECTED LANGUAGE: ${languageCode} ===`);
  
  setIsLanguageModalVisible(false);

  if (languageCode === currentLanguage) {
    console.log('⚠️ Same language selected, no change needed');
    return;
  }

  // Show loading indicator
  setIsTranslating(true);

  try {
    console.log('🔄 Calling changeLanguage...');
    const result = await changeLanguage(languageCode);

    if (result.success) {
      const langName = availableLanguages[languageCode]?.name || languageCode;
      
      Alert.alert(
        'Language Changed ✅',
        `Language changed to ${langName}\n\nNote: First-time translation may take a moment to download models.`,
        [
          {
            text: 'OK',
            onPress: () => {
              console.log('✅ Language change confirmed by user');
            }
          }
        ]
      );
    } else {
      // Show detailed error
      Alert.alert(
        'Language Change Failed ❌',
        `${result.error || 'Unknown error'}\n\nTroubleshooting:\n• Check internet connection\n• Ensure storage space available\n• Try again in a moment`,
        [
          {
            text: 'Retry',
            onPress: () => handleLanguageSelect(languageCode)
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    }
  } catch (error) {
    console.error('❌ Error in handleLanguageSelect:', error);
    Alert.alert(
      'Error',
      `Failed to change language: ${error.message}\n\nPlease check your internet connection and try again.`,
      [
        {
          text: 'Retry',
          onPress: () => handleLanguageSelect(languageCode)
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  } finally {
    setIsTranslating(false);
  }
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
    onPress={() => handleLanguageSelect(item.code)}>
    <Text style={styles.languageText}>{item.name}</Text>
    {currentLanguage === item.code && (
      <Icon name="check" size={20} color="#e16e2b" />
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

  const showAddButton = isAdmin && homeMediaData && (homeMediaData.length === 0 || homeMediaData.length >= 1);

  return (
    <>
      <View style={styles.homeMediaContainer}>
        <ScrollView 
          ref={scrollViewRef} // ✅ Add ref
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.homeMediaScrollContent}
          // ✅ Disable manual scrolling for non-admin users (optional)
          scrollEnabled={isAdmin}
          // ✅ Handle manual scroll (pause auto-scroll temporarily)
          onScrollBeginDrag={() => {
            if (!isAdmin && autoScrollInterval.current) {
              clearInterval(autoScrollInterval.current);
            }
          }}
          // ✅ Resume auto-scroll after manual scroll ends
          onScrollEndDrag={() => {
            if (!isAdmin && homeMediaData && homeMediaData.length > 1) {
              setTimeout(() => {
                autoScrollInterval.current = setInterval(() => {
                  setCurrentBannerIndex((prevIndex) => {
                    const nextIndex = (prevIndex + 1) % homeMediaData.length;
                    if (scrollViewRef.current) {
                      scrollViewRef.current.scrollTo({
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

          {/* Add New Button - Show only for admin */}
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

        {/* ✅ Optional: Add pagination dots for non-admin users */}
        {!isAdmin && homeMediaData && homeMediaData.length > 1 && (
          <View style={styles.paginationDots}>
            {homeMediaData.map((_, index) => (
              <View
                key={`dot-${index}`}
                style={[
                  styles.paginationDot,
                  index === currentBannerIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        )}
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

      {/* Add Modal for new home media */}
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
  // ✅ SAFE: Handle undefined/null/non-array cases
  const newsItems = Array.isArray(latestNewsData) ? latestNewsData : [];

  // Show loading state
  if (newsLoading) {
    return (
      <View style={styles.newsSection}>
        <TranslatableText style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>
          Latest News
        </TranslatableText>
        <View style={styles.newsCard}>
          <View style={styles.emptyNewsState}>
            <ActivityIndicator size="large" color="#e16e2b" />
            <Text style={styles.emptyStateText}>Loading latest news...</Text>
          </View>
        </View>
      </View>
    );
  }

// Show empty state
if (newsItems.length === 0) {
  return (
    <View style={styles.newsSection}>
      <TranslatableText style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>
        Latest News
      </TranslatableText>
      
      <View style={styles.newsCard}>
        <View style={styles.emptyNewsState}>
          <Icon name="article" size={48} color="#bdc3c7" />
          <Text style={styles.emptyStateText}>No latest news available</Text>
          {isAdmin && (
            <TouchableOpacity
              style={styles.addFirstNewsButton}
              onPress={() => {
                console.log('➕ Add First News button pressed');
                setAddNewsModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Icon name="add-circle" size={24} color="#e16e2b" />
              <Text style={styles.addFirstNewsText}>Add First News</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

  return (
    <View style={styles.newsSection}>
      <TranslatableText style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>
        Latest News
      </TranslatableText>
      
      {newsItems.map((item, index) => {
        // ✅ ADD: Safety check for item
        if (!item) return null;
        
        const newsDate = item.createdAt 
          ? new Date(item.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })
          : 'Recent';

        return (
          <View key={item._id || `news-${index}`} style={styles.newsCard}>
            {/* rest of your news card code remains the same */}
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
                <TranslatableText style={[styles.newsTitle, { fontSize: fontSize, flex: 1, marginLeft: 8 }]}>
                  {item.media_header || 'No Title'}
                </TranslatableText>
              </View>
            </View>
            
            <Text style={[styles.newsDate, { fontSize: fontSize - 2 }]}>
              {newsDate}
            </Text>
            
            <TranslatableText 
              style={[styles.newsDescription, { fontSize: fontSize - 2 }]}
              numberOfLines={3}
            >
              {item.media_narration || 'No description available'}
            </TranslatableText>

            {item.media_url && item.media_url.trim() !== '' && (
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
                <TranslatableText style={styles.readMoreText}>
                  Read More
                </TranslatableText>
                <Icon name="arrow-forward" size={14} color="#e16e2b" />
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {isAdmin && (
        <TouchableOpacity
          style={styles.addNewsButtonBottom}
          onPress={() => {
            console.log('➕ Add News button pressed (bottom)');
            setAddNewsModalVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Icon name="add-circle" size={24} color="#e16e2b" />
          <Text style={styles.addNewsButtonBottomText}>Add Latest News</Text>
        </TouchableOpacity>
      )}


      {/* Admin controls - rest remains the same */}
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

const renderDebugSection = () => {
  return null; // ✅ REMOVED Debug Section
};
// Add this button somewhere
<Button
  title="Test Crash"
  onPress={() => crashlytics().crash()}
/>

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={35} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: 19 }]}>{clientAppName}</Text>

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
{isTranslating && (
  <View style={styles.translationLoadingBar}>
    <ActivityIndicator size="small" color="#e16e2b" />
    <Text style={styles.translationLoadingText}>Translating...</Text>
  </View>
)}

      <ScrollView style={styles.content}>
      <View style={styles.welcomeSection}>
   <TranslatableText style={[styles.welcomeSubtitle, { fontSize: fontSize+8 }]}>
    Welcome to {clientAppName} App
  </TranslatableText>
  <TranslatableText style={[styles.welcomeDescription, { fontSize: fontSize - 2 }]}>
    Stay connected with your leader and community. Get updates, provide feedback, and engage with local initiatives.
  </TranslatableText>
</View>

        <View style={styles.quickActionsSection}>
  <TranslatableText style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>
    Quick Actions
  </TranslatableText>
  <View style={styles.quickActionsGrid}>
    {quickActions.map((item) => (
      <TouchableOpacity
        key={item.id}
        style={styles.quickActionCard}
        onPress={() => handleQuickAction(item)}
      >
        <Icon name={item.icon} size={32} color="#e16e2b" />
        <TranslatableText 
          style={[styles.quickActionText, { fontSize: fontSize - 2 }]}
          cacheKey={item.titleKey}
        >
          {item.title}
        </TranslatableText>
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

      {/* ✅ ADD THIS - Floating Profiler Button (Admin Only) */}
{isAdmin && (
  <TouchableOpacity
    style={styles.profilerButton}
    onPress={() => navigation.navigate('AppProfiler')}
  >
    <Text style={styles.profilerButtonText}>📊</Text>
  </TouchableOpacity>
)}

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
       {/* ✅ NEW: Add News Modal */}
          <AddLatestNewsModal
            visible={addNewsModalVisible}
            onClose={() => setAddNewsModalVisible(false)}
            onSave={handleAddLatestNews}
          />
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

  // ✅ ADD THESE TWO NEW STYLES
profilerButton: {
  position: 'absolute',
  bottom: 80,  // Above chat button
  right: 10,
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#2c3e50',
  justifyContent: 'center',
  alignItems: 'center',
  elevation: 5,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
profilerButtonText: {
  fontSize: 28,
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
  
  // Test Crash Section Styles
  testCrashSection: {
    margin: 20,
    marginBottom: 100,
    padding: 20,
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffc107',
    borderStyle: 'dashed',
  },
  testCrashTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 15,
    textAlign: 'center',
  },
  testCrashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#dc3545',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  testCrashButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  testCrashDescription: {
    fontSize: 13,
    color: '#856404',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  // Add these styles to your existing styles object
paginationDots: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 10,
  gap: 8,
},
paginationDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#d1d5db',
},
paginationDotActive: {
  width: 24,
  backgroundColor: '#e16e2b',
},
newsHeaderRow: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginBottom: 8,
},
translationLoadingBar: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff3cd',
  paddingVertical: 8,
  paddingHorizontal: 15,
  gap: 10,
},
translationLoadingText: {
  fontSize: 14,
  color: '#856404',
  fontWeight: '500',
},
debugSection: {
    margin: 20,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ffc107',
    borderStyle: 'dashed',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 10,
  },
  debugButton: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#e16e2b',
  },
  debugButtonText: {
    color: '#e16e2b',
    fontWeight: '600',
    textAlign: 'center',
  },
  // ✅ NEW: Add News Button Styles
newsSectionHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
  paddingRight: 0,
},
addNewsButton: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#e16e2b',
  paddingVertical: 10,
  paddingHorizontal: 16,
  borderRadius: 20,
  elevation: 3,
  shadowColor: '#e16e2b',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
  marginLeft: 10,
},
addNewsButtonText: {
  color: '#fff',
  fontSize: 13,
  fontWeight: '700',
  marginLeft: 6,
},
// ✅ NEW: Add First News Button (in empty state)
addFirstNewsButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#fff',
  paddingVertical: 14,
  paddingHorizontal: 24,
  borderRadius: 10,
  marginTop: 20,
  borderWidth: 2,
  borderColor: '#e16e2b',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
addFirstNewsText: {
  color: '#e16e2b',
  fontSize: 16,
  fontWeight: '700',
  marginLeft: 10,
},
addNewsButtonBottom: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#e16e2b', // ✅ Changed from '#fff' to orange
  paddingVertical: 14,
  paddingHorizontal: 10,
  borderRadius: 10,
  marginTop: 15,
  marginBottom: 10,
  borderWidth: 0, // ✅ Removed border
  elevation: 3, // ✅ Increased shadow
  shadowColor: '#e16e2b',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
addNewsButtonBottomText: {
  color: '#fff', // ✅ Changed from '#e16e2b' to white
  fontSize: 16,
  fontWeight: '700',
  marginLeft: 10,
},
});

export default HomeScreen;