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

const { width, height } = Dimensions.get('window');

const DevelopmentLandscapeScreen = () => {
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
    
    await checkAdminRole(); // ADD THIS
    
    const mobileNo = await getMobileNumberFromStorage();
    setRegdMobileNo(mobileNo);
    
    const currentUserInfo = await getCurrentUserRole(); // ADD THIS
    const email = currentUserInfo.loggedin_email || 'default@email.com'; // ADD THIS
    setUserEmail(email); // ADD THIS
    
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
    formData.append('regd_mobile_no', regdMobileNo);
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
    formData.append('regd_mobile_no', regdMobileNo);
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
            <Text style={styles.modalTitle}>Add Party Update</Text>
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
              placeholder="Enter URL (optional)"
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Image *</Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>📷</Text>
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
            <Text style={styles.modalTitle}>Edit Party Update</Text>
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
    const [imageUri, setImageUri] = useState(null);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);  // ✅ ADD THIS
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });  // ✅ ADD THIS


    useEffect(() => {
      let mounted = true;
      
      const loadImage = async () => {
        if (!item.media_file) {
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
          console.error('❌ Error loading image:', error);
          if (mounted) {
            setImageError(true);
            setImageLoading(false);
          }
        }
      };
      
      loadImage();
      
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

      {/* ✅ ADD THREE DOT MENU */}
      <ThreeDotMenu
        visible={menuVisible}
        position={menuPosition}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDismiss={() => setMenuVisible(false)}
      />

        {imageLoading && (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="large" color="#e16e2b" />
          </View>
        )}

        {!imageLoading && imageError && (
          <View style={styles.imageErrorContainer}>
            <Text style={styles.imageErrorIcon}>🏗️</Text>
            <Text style={styles.imageErrorText}>Image unavailable</Text>
          </View>
        )}

        {!imageLoading && !imageError && imageUri && (
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
              source={{ uri: imageUri }}
              style={styles.cardImage} 
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}

        {item.media_header && (
          <Text style={styles.cardTitle}>{item.media_header}</Text>
        )}

        {item.media_narration && (
          <Text style={styles.cardDescription}>{item.media_narration}</Text>
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
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <Icon name="trending-up" size={32} color="#fff" />
            </View>
            <Text style={styles.pageTitle}>Development Landscape</Text>
            <Text style={styles.pageSubtitle}>
              Transforming Communities Through Strategic Development
            </Text>
          </View>
          
          {/* Header Decorative Elements */}
          <View style={styles.headerDecoration1} />
          <View style={styles.headerDecoration2} />
          <View style={styles.headerDecoration3} />
        </View>

        {/* Stats Overview - Always visible */}
        <View style={styles.statsContainer}>
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <Text style={styles.statsTitle}>Local</Text>
            <Text style={styles.statsSubtitle}>Constituency Focus</Text>
          </View>
          
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <Text style={styles.statsTitle}>State</Text>
            <Text style={styles.statsSubtitle}>Regional Impact</Text>
          </View>
          
          <View style={styles.statsCard}>
            <View style={styles.statsIndicator} />
            <Text style={styles.statsTitle}>National</Text>
            <Text style={styles.statsSubtitle}>Country-wide</Text>
          </View>
        </View>

        {/* Content Area */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#e16e2b" />
            <Text style={styles.loadingText}>Loading development data...</Text>
          </View>
        ) : landscapeData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏗️</Text>
            <Text style={styles.emptyText}>No development data available</Text>
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
              <Text style={styles.ctaTitle}>Building Tomorrow, Today</Text>
              <Text style={styles.ctaSubtitle}>
                Every initiative contributes to a stronger, more prosperous future for our communities.
              </Text>
              <View style={styles.ctaButton}>
                <View style={styles.ctaButtonContent}>
                  <Text style={styles.ctaButtonText}>Learn More</Text>
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
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
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
});

export default DevelopmentLandscapeScreen;