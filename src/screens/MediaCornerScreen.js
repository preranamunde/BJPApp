import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  TextInput,
} from 'react-native';
import Video from 'react-native-video';
import WebView from 'react-native-webview';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';
const { width } = Dimensions.get('window');


const tabs = ['Press Meets', 'Past Events', 'Facebook', 'X', 'Instagram', 'Video'];

const MEDIA_TYPE_MAP = {
  'Press Meets': 'PM',
  'Past Events': 'PE',
 'Video': 'VE', 
  'Latest News': 'latestnews'
};

// ✅ Improved Three Dot Menu Component (matching AboutConstituency style)
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
const AddMediaModal = ({ visible, onClose, onSave, mediaType, regdMobileNo, userEmail }) => {
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
    // Check if we're in video mode (VE = Video)
    const isVideoMode = mediaType === 'VE';
    
    const options = {
      mediaType: isVideoMode ? 'video' : 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      videoQuality: 'high', // For video uploads
      // Remove size limits for videos
      ...(isVideoMode && {
        durationLimit: 60, // Allow up to 60 seconds video
      }),
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else if (response.assets && response.assets[0]) {
        const selectedFile = response.assets[0];
        
        // Check file size
        const fileSizeInMB = selectedFile.fileSize / (1024 * 1024);
        console.log(`📦 File size: ${fileSizeInMB.toFixed(2)} MB`);
        
        // Show warning if file is too large (backend limit is typically 10-50MB)
        if (fileSizeInMB > 50) {
          Alert.alert(
            '⚠️ File Too Large',
            `This file is ${fileSizeInMB.toFixed(2)} MB. The server may reject files over 50MB.\n\nPlease:\n• Choose a shorter video\n• Compress the video\n• Or contact admin to increase server limits`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Try Anyway', 
                onPress: () => {
                  setSelectedImage(selectedFile);
                  console.log('File selected:', selectedFile.uri);
                }
              }
            ]
          );
        } else if (fileSizeInMB > 20) {
          // Warning for files between 20-50MB
          Alert.alert(
            '📁 Large File',
            `This file is ${fileSizeInMB.toFixed(2)} MB. Upload may take longer and could fail if server limits are exceeded. Continue?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Continue', 
                onPress: () => {
                  setSelectedImage(selectedFile);
                  console.log('File selected:', selectedFile.uri);
                }
              }
            ]
          );
        } else {
          setSelectedImage(selectedFile);
          console.log('File selected:', selectedFile.uri);
        }
      }
    });
  };

 const handleSave = async () => {
  if (!header.trim()) {
    Alert.alert('Validation Error', 'Please enter a media header');
    return;
  }

  if (!selectedImage) {
    Alert.alert('Validation Error', 'Please select an image/video file');
    return;
  }

  setSaving(true);
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner`;

    // ✅ GET FRESH EMAIL (DON'T USE PROP)
    const currentUserInfo = await getCurrentUserRole();
    const freshEmail = currentUserInfo.loggedin_email || '';
    
    console.log('✅ Creating media with fresh email:', freshEmail);
    console.log('📱 Using mobile:', regdMobileNo);

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', freshEmail);  // ✅ USE FRESH EMAIL
    formData.append('media_header', header);
    formData.append('media_narration', narration);
    formData.append('media_url', url);
    formData.append('media_type', mediaType);

    // Add the file
    const fileUri = selectedImage.uri;
    const fileName = fileUri.split('/').pop();
    const fileType = selectedImage.type || (
      fileName.endsWith('.mp4') ? 'video/mp4' :
      fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' :
      'image/png'
    );

    formData.append('media_file', {
      uri: fileUri,
      name: fileName,
      type: fileType,
    });

    console.log('📤 Creating new media item...');
    const result = await ApiService.authPost(apiUrl, formData, {}, true);

    console.log('📥 POST Response:', result);

    if (result.success) {
      Alert.alert('✅ Success', 'Media created successfully');
      onSave();
      onClose();
    } else {
      throw new Error(result.message || 'Creation failed');
    }
  } catch (error) {
    console.error('❌ Error creating media:', error);
    Alert.alert('Error', error.message || 'Failed to create media item');
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
            <Text style={styles.modalTitle}>Add New Media</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header Input */}
            <Text style={styles.label}>Header *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter media header"
              placeholderTextColor="#999"
            />

            {/* Description Input */}
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
            <Text style={styles.label}>
              {mediaType === 'video' ? 'Video File *' : 'Image File *'}
            </Text>
            <TouchableOpacity 
              style={styles.imagePickerButton}
              onPress={handlePickImage}
            >
              <Text style={styles.imagePickerIcon}>
                {mediaType === 'video' ? '🎥' : '📷'}
              </Text>
              <Text style={styles.imagePickerText}>
                {selectedImage ? 'Change File' : `Choose ${mediaType === 'video' ? 'Video' : 'Image'}`}
              </Text>
            </TouchableOpacity>

            {/* Show selected file preview */}
            {selectedImage && (
              <View style={styles.selectedImagePreview}>
                {mediaType !== 'video' && (
                  <Image 
                    source={{ uri: selectedImage.uri }} 
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                )}
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


// Add FAB Component
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
// Edit Modal Component
// Edit Modal Component with Image Upload
// Edit Modal Component with Image Upload
const EditMediaModal = ({ visible, item, onClose, onSave, mediaType }) => {
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
        media_type: mediaType,
        media_file: selectedImage  // ✅ Include selected image
      });
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to update media item');
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
            <Text style={styles.modalTitle}>Edit Media</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Header Input */}
            <Text style={styles.label}>Header *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter media header"
              placeholderTextColor="#999"
            />

            {/* Description Input */}
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

            {/* URL Input */}
            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter URL"
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



// ✅ Improved Media Item with better menu positioning
// ✅ PROPER MediaItem Component with Native Video Player (Like Development Landscape)
// Replace your MediaItem component with this

const MediaItem = React.memo(({ 
  item, 
  index, 
  regdMobileNo, 
  userEmail,
  isAdmin,
  onEdit,
  onDelete 
}) => {
  const [mediaUri, setMediaUri] = useState(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isVideo, setIsVideo] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true); // ✅ For video playback control

  useEffect(() => {
    let mounted = true;

    const loadMedia = async () => {
      console.log('🖼️ Loading media for:', item.media_header);
      console.log('📁 media_file:', item.media_file);

      if (!item.media_file || item.media_file.trim() === '') {
        console.log('❌ No media_file in item');
        if (mounted) {
          setMediaError(true);
        }
        return;
      }

      setMediaLoading(true);
      setMediaError(false);

      try {
        let mediaUrl = item.media_file;
        
        // ✅ DETECT IF FILE IS VIDEO
        const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.m4v', '.flv'];
        const isVideoFile = videoExtensions.some(ext => 
          mediaUrl.toLowerCase().includes(ext)
        );
        
        console.log('📹 Is video file?', isVideoFile);
        setIsVideo(isVideoFile);
        
        // ✅ Construct proper URL
        const baseUrl = await ConfigService.getBaseUrl();
        
        if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://')) {
          if (mediaUrl.includes('ngrok-free.app:')) {
            mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
          }
          if (mediaUrl.includes('localhost')) {
            mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          }
        } else {
          const cleanMediaFile = mediaUrl.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
          const encodedMediaFile = encodeURIComponent(cleanMediaFile);
          const encodedEmail = encodeURIComponent(userEmail);
          
          mediaUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
        }

        console.log('🔗 Media URL:', mediaUrl);
        
        // ✅ FOR VIDEOS: Just set URL directly (no blob needed)
        if (isVideoFile) {
          if (mounted) {
            setMediaUri(mediaUrl);
            setMediaLoading(false);
          }
          return;
        }
        
        // ✅ FOR IMAGES: Use blob conversion
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
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (mounted) {
            setMediaUri(reader.result);
            setMediaError(false);
          }
        };
        
        reader.onerror = (error) => {
          console.error('❌ FileReader error:', error);
          if (mounted) {
            setMediaError(true);
          }
        };
        
        reader.readAsDataURL(blob);

      } catch (error) {
        console.error('❌ Error loading media:', error);
        if (mounted) {
          setMediaError(true);
        }
      } finally {
        if (mounted) {
          setMediaLoading(false);
        }
      }
    };

    loadMedia();
    
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
      'Delete Media',
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
    <View style={styles.postItem}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderContent}>
          {item.media_header && (
            <Text style={styles.postTitle}>{item.media_header}</Text>
          )}
          {item.created_at && (
            <Text style={styles.postDate}>
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
      
      {isAdmin && (
        <ThreeDotMenu
          visible={menuVisible}
          position={menuPosition}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismiss={() => setMenuVisible(false)}
        />
      )}

      {/* ✅ LOADING STATE */}
      {mediaLoading && (
        <View style={[styles.postImage, styles.imageLoadingContainer]}>
          <ActivityIndicator size="large" color="#f56c3aff" />
          <Text style={styles.loadingText}>
            {isVideo ? 'Loading video...' : 'Loading image...'}
          </Text>
        </View>
      )}

      {/* ✅ VIDEO DISPLAY - NATIVE PLAYER (Like Development Landscape) */}
      {!mediaLoading && mediaUri && !mediaError && isVideo && (
        <View style={styles.videoContainer}>
          <Video
            source={{ uri: mediaUri }}
            style={styles.postVideoPlayer}
            resizeMode="contain"
            paused={videoPaused}
            controls={false}
            repeat={false}
            onError={(error) => {
              console.error('❌ Video error:', error);
              setMediaError(true);
            }}
          />
          
          {/* ✅ Play/Pause Overlay */}
          <TouchableOpacity 
            style={styles.videoOverlay}
            onPress={() => setVideoPaused(!videoPaused)}
            activeOpacity={0.8}
          >
            {videoPaused && (
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ✅ Video Indicator Badge */}
          <View style={styles.videoIndicator}>
            <Text style={styles.videoIndicatorText}>🎥 VIDEO</Text>
          </View>
        </View>
      )}

      {/* ✅ IMAGE DISPLAY */}
      {!mediaLoading && mediaUri && !mediaError && !isVideo && (
        <Image 
          source={{ uri: mediaUri }}
          style={styles.postImage} 
          resizeMode="cover"
          onError={(error) => {
            console.error('🖼️ Image failed to load:', error.nativeEvent);
            setMediaError(true);
          }}
          onLoad={() => console.log('✅ Image loaded successfully')}
        />
      )}

      {/* ✅ ERROR STATE */}
      {!mediaLoading && (mediaError || !mediaUri) && item.media_file && (
        <View style={[styles.postImage, styles.imageErrorContainer]}>
          <Text style={styles.imageErrorIcon}>{isVideo ? '🎥' : '📷'}</Text>
          <Text style={styles.imageErrorText}>
            {isVideo ? 'Video not available' : 'Image not available'}
          </Text>
          <Text style={styles.imageErrorDetail}>{item.media_file}</Text>
        </View>
      )}

      {/* ✅ NO MEDIA */}
      {!item.media_file && (
        <View style={[styles.postImage, styles.imageErrorContainer]}>
          <Text style={styles.imageErrorIcon}>🖼️</Text>
          <Text style={styles.imageErrorText}>No media attached</Text>
        </View>
      )}

      {/* ✅ DESCRIPTION */}
      {item.media_narration && (
        <Text style={styles.postText}>{item.media_narration}</Text>
      )}

      {/* ✅ VIEW MORE BUTTON */}
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


// ✅ Improved Video Item with better menu positioning
// ✅ Video Item Component with View More button
// ✅ REPLACE YOUR VideoItem COMPONENT with Native Video Player

const VideoItem = React.memo(({ 
  video, 
  regdMobileNo, 
  userEmail,
  isAdmin, 
  onEdit,
  onDelete 
}) => {
  const [videoUri, setVideoUri] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true); // ✅ Video playback control

  useEffect(() => {
    let mounted = true;
    
    const loadVideo = async () => {
      console.log('🎥 === LOADING VIDEO ===');
      console.log('📦 Video object:', JSON.stringify(video, null, 2));
      
      setIsLoading(true);
      setHasError(false);
      
      try {
        if (!video.media_file) {
          console.error('❌ No media_file found in video object');
          if (mounted) {
            setHasError(true);
            setIsLoading(false);
          }
          return;
        }

        let videoUrl = video.media_file;
        console.log('📹 Original media_file:', videoUrl);
        
        const baseUrl = await ConfigService.getBaseUrl();
        console.log('🔗 Base URL:', baseUrl);
        
        // ✅ Already a full URL
        if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
          if (videoUrl.includes('ngrok-free.app:')) {
            videoUrl = videoUrl.replace(/:(\d+)\//, '/');
          }
          if (videoUrl.includes('localhost')) {
            videoUrl = videoUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          }
        } 
        // ✅ Relative path
        else {
          let cleanPath = videoUrl.replace(/^[\\\/]+/, '').replace(/\\/g, '/');
          const encodedMediaFile = encodeURIComponent(cleanPath);
          const encodedEmail = encodeURIComponent(userEmail);
          
          videoUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodedEmail}&media_file=${encodedMediaFile}`;
        }
        
        console.log('🔗 Final video URL:', videoUrl);
        
        if (mounted) {
          setVideoUri(videoUrl);
          setIsLoading(false);
        }
        
      } catch (error) {
        console.error('❌ Error loading video:', error);
        if (mounted) {
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    loadVideo();
    
    return () => {
      mounted = false;
    };
  }, [video.media_file, regdMobileNo, userEmail]);

  const handleMenuPress = (event) => {
    const { pageX, pageY } = event.nativeEvent;
    setMenuPosition({ x: pageX, y: pageY + 10 });
    setMenuVisible(true);
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit(video);
  };

  const handleDelete = () => {
    setMenuVisible(false);
    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this video?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes', 
          onPress: () => onDelete(video),
          style: 'destructive'
        }
      ]
    );
  };

  return (
    <View style={styles.videoItem}>
      <View style={styles.postHeader}>
        <View style={styles.postHeaderContent}>
          {video.media_header && (
            <Text style={styles.videoTitle}>{video.media_header}</Text>
          )}
          {video.created_at && (
            <Text style={styles.videoDate}>
              {new Date(video.created_at).toLocaleDateString('en-IN', {
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
      
      {isAdmin && (
        <ThreeDotMenu
          visible={menuVisible}
          position={menuPosition}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onDismiss={() => setMenuVisible(false)}
        />
      )}

      {/* ✅ LOADING STATE */}
      {isLoading && (
        <View style={[styles.videoPlayer, styles.videoLoadingContainer]}>
          <ActivityIndicator size="large" color="#f56c3aff" />
          <Text style={styles.loadingText}>Loading video...</Text>
        </View>
      )}

      {/* ✅ ERROR STATE */}
      {!isLoading && hasError && (
        <View style={[styles.videoPlayer, styles.videoLoadingContainer]}>
          <Text style={styles.imageErrorIcon}>🎥</Text>
          <Text style={styles.imageErrorText}>Video not available</Text>
          {video.media_file && (
            <Text style={styles.imageErrorDetail}>{video.media_file}</Text>
          )}
        </View>
      )}

      {/* ✅ NATIVE VIDEO PLAYER */}
      {!isLoading && !hasError && videoUri && (
        <View style={styles.videoPlayerContainer}>
          <Video
            source={{ uri: videoUri }}
            style={styles.videoPlayer}
            resizeMode="contain"
            paused={videoPaused}
            controls={false}
            repeat={false}
            onError={(error) => {
              console.error('❌ Video playback error:', error);
              setHasError(true);
            }}
            onLoad={() => {
              console.log('✅ Video loaded successfully');
            }}
          />
          
          {/* ✅ Play/Pause Overlay */}
          <TouchableOpacity 
            style={styles.videoOverlay}
            onPress={() => setVideoPaused(!videoPaused)}
            activeOpacity={0.8}
          >
            {videoPaused && (
              <View style={styles.playButton}>
                <Text style={styles.playIcon}>▶</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* ✅ Video Indicator */}
          <View style={styles.videoIndicator}>
            <Text style={styles.videoIndicatorText}>🎥 VIDEO</Text>
          </View>
        </View>
      )}
      
      {/* ✅ DESCRIPTION */}
      {video.media_narration && (
        <Text style={styles.videoDescription}>
          {video.media_narration}
        </Text>
      )}

      {/* ✅ VIEW MORE BUTTON */}
      {video.media_url && (
        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => Linking.openURL(video.media_url).catch(() => 
            Alert.alert('Error', 'Could not open the link')
          )}
        >
          <Text style={styles.linkText}>View More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// MAIN COMPONENT
const MediaCornerScreen = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [mediaData, setMediaData] = useState([]);
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
      const mediaType = MEDIA_TYPE_MAP[activeTab];
      if (mediaType) {
        fetchMediaData(mediaType);
      }
    }
  }, [activeTab, regdMobileNo, userEmail]);

  const initializeUserData = async () => {
  try {
    console.log('🔍 === INITIALIZING USER DATA FOR MEDIA CORNER ===');
    
    // ✅ Force clear any cached data
    setRegdMobileNo(null);
    setUserEmail(null);
    
    // ✅ Get fresh AppOwnerInfo (which was updated during login)
    const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
    console.log('📦 AppOwnerInfo found:', appOwnerInfoStr ? 'Yes' : 'No');
    
    if (appOwnerInfoStr) {
      const appOwnerInfo = JSON.parse(appOwnerInfoStr);
      console.log('👤 AppOwnerInfo keys:', Object.keys(appOwnerInfo));
      console.log('📋 Full AppOwnerInfo:', appOwnerInfo);
      
      // ✅ Extract mobile with expanded field search
      const possibleMobileFields = [
        'mobile_no', 'mobile', 'phone', 'mobileNo', 'regdMobileNo',
        'client_mobile', 'contact_number', 'phoneNumber'
      ];
      
      let mobile = '';
      for (const field of possibleMobileFields) {
        if (appOwnerInfo[field]) {
          mobile = String(appOwnerInfo[field]).trim();
          console.log(`✅ Found mobile in field '${field}': ${mobile}`);
          break;
        }
      }
      
      // ✅ Extract email with expanded field search
      const possibleEmailFields = [
        'email', 'emailid', 'email_id', 'user_email', 'user_email_id',
        'owner_email', 'emailAddress'
      ];
      
      let email = '';
      for (const field of possibleEmailFields) {
        if (appOwnerInfo[field] && String(appOwnerInfo[field]).includes('@')) {
          email = String(appOwnerInfo[field]).trim().toLowerCase();
          console.log(`✅ Found email in field '${field}': ${email}`);
          break;
        }
      }
      
      // ✅ Fallback to AsyncStorage if not found
      if (!email) {
        email = await AsyncStorage.getItem('userEmail') || 
                await AsyncStorage.getItem('user_email_id') ||
                'sanjay.jaiswal@gmail.com';
        console.log('⚠️ Using email from AsyncStorage fallback:', email);
      }
      
      if (!mobile) {
        mobile = '7702000725';
        console.log('⚠️ Using default mobile fallback:', mobile);
      }
      
      console.log('✅ Final extracted values:');
      console.log('   📱 Mobile:', mobile);
      console.log('   📧 Email:', email);
      
      setRegdMobileNo(mobile);
      setUserEmail(email);
    } else {
      console.warn('⚠️ No AppOwnerInfo found');
      
      // ✅ Fallback to AsyncStorage
      const fallbackEmail = await AsyncStorage.getItem('userEmail') || 
                           await AsyncStorage.getItem('user_email_id') ||
                           'sanjay.jaiswal@gmail.com';
      const fallbackMobile = '7702000725';
      
      console.log('Using fallback values:', { fallbackEmail, fallbackMobile });
      setRegdMobileNo(fallbackMobile);
      setUserEmail(fallbackEmail);
    }
  } catch (error) {
    console.error('❌ Error initializing user data:', error);
    setRegdMobileNo('7702000725');
    setUserEmail('sanjay.jaiswal@gmail.com');
  }
};



const fetchMediaData = async (mediaType) => {
  console.log('🎬 === FETCHING MEDIA DATA ===');
  console.log('📋 Media Type:', mediaType);
  
  setLoading(true);
  setError(null);
  
  try {
    // ✅ GET FRESH EMAIL
    const currentUserInfo = await getCurrentUserRole();
    const freshEmail = currentUserInfo.loggedin_email || '';
    
    console.log('✅ Fetching with fresh email:', freshEmail);
    console.log('📱 Using mobile:', regdMobileNo);
    
    const baseUrl = await ConfigService.getBaseUrl();
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(freshEmail)}&media_type=${mediaType}`;
    
    console.log('🔗 API URL:', apiUrl);
    
    const result = await ApiService.authGet(apiUrl);

    console.log('📦 FULL API RESPONSE:', JSON.stringify(result, null, 2));

    if (result.success && result.data) {
      let items = [];
      
      if (Array.isArray(result.data)) {
        items = result.data;
      } else if (result.data.media_items) {
        items = result.data.media_items;
      } else if (result.data.items) {
        items = result.data.items;
      }

      console.log('📊 Items count:', items.length);
      setMediaData(items);
    } else {
      console.log('⚠️ No data in response');
      setMediaData([]);
    }

  } catch (err) {
    console.error('❌ Error fetching media data:', err);
    setError(err.message || 'Failed to load media content');
    Alert.alert('Error', 'Failed to load media content. Please try again.');
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

    // ✅ GET FRESH EMAIL FROM AppOwnerInfo (NOT from state)
    const currentUserInfo = await getCurrentUserRole();
    const freshEmail = currentUserInfo.loggedin_email || '';
    
    console.log('✅ Using fresh email for save:', freshEmail);
    console.log('📱 Using mobile:', regdMobileNo);

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', regdMobileNo);
    formData.append('user_email_id', freshEmail);  // ✅ USE FRESH EMAIL
    formData.append('media_header', updatedData.media_header);
    formData.append('media_narration', updatedData.media_narration);
    formData.append('media_url', updatedData.media_url);
    formData.append('media_type', updatedData.media_type);
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

    console.log('📤 Sending PUT request to:', apiUrl);

    const result = await ApiService.authPut(apiUrl, formData, {}, true);

    console.log('📥 PUT Response:', result);

    if (result.success) {
      Alert.alert('✅ Success', 'Media updated successfully');
      setEditModalVisible(false);
      setSelectedItem(null);
      const mediaType = MEDIA_TYPE_MAP[activeTab];
      fetchMediaData(mediaType);
    } else {
      throw new Error(result.message || 'Update failed');
    }
  } catch (error) {
    console.error('❌ Error updating media:', error);
    Alert.alert('Error', error.message || 'Failed to update media');
  }
};

 const handleDelete = async (item) => {
  try {
    const baseUrl = await ConfigService.getBaseUrl();
    
    // ✅ GET FRESH EMAIL FROM getCurrentUserRole
    const currentUserInfo = await getCurrentUserRole();
    const freshEmail = currentUserInfo.loggedin_email || '';
    
    console.log('🗑️ === DELETING MEDIA ITEM ===');
    console.log('📧 Using fresh email:', freshEmail);
    console.log('📱 Using mobile:', regdMobileNo);
    console.log('🆔 Item ID:', item._id || item.id);
    
    const apiUrl = `${baseUrl}/api/mediacorner/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(freshEmail)}&id=${item._id || item.id}`;
    
    console.log('🔗 DELETE URL:', apiUrl);
    
    const result = await ApiService.authDelete(apiUrl);

    console.log('📥 DELETE Response:', result);

    if (result.success) {
      Alert.alert('✅ Success', 'Media deleted successfully');
      const mediaType = MEDIA_TYPE_MAP[activeTab];
      
      // ✅ Refresh the list after deletion
      if (mediaType) {
        await fetchMediaData(mediaType);
      }
    } else {
      throw new Error(result.message || 'Delete failed');
    }
  } catch (error) {
    console.error('❌ Error deleting media:', error);
    Alert.alert('Error', error.message || 'Failed to delete media item');
  }
};

  const handleAddNew = () => {
  setAddModalVisible(true);
};

const handleAddSuccess = () => {
  setAddModalVisible(false);
  const mediaType = MEDIA_TYPE_MAP[activeTab];
  if (mediaType) {
    fetchMediaData(mediaType);
  }
};


  const renderTabContent = () => {
    if (activeTab === 'Facebook') {
      return (
        <WebView
          source={{ uri: 'http://www.facebook.com/Jaiswalsanjaybjp/' }}
          style={{ flex: 1 }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    if (activeTab === 'X') {
      return (
        <WebView
          source={{ uri: 'https://twitter.com/Sanjayjaiswalmp' }}
          style={{ flex: 1 }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

    if (activeTab === 'Instagram') {
      return (
        <WebView
          source={{ uri: 'https://www.instagram.com/drsanjayjaiswalbjp/' }}
          style={{ flex: 1 }}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
        />
      );
    }

   if (activeTab === 'Video') {
  return (
    <>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f56c3aff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchMediaData('VE')}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.videoListContainer}>
          {mediaData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No videos available</Text>
            </View>
          ) : (
            mediaData.map((video, index) => (
              <VideoItem
                key={video._id || index}
                video={video}
                regdMobileNo={regdMobileNo}
                userEmail={userEmail}
                isAdmin={isAdmin}  
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))
          )}
        </ScrollView>
      )}

      {/* FAB - Always rendered for admin */}
      <AddMediaFAB 
        visible={isAdmin}
        onPress={handleAddNew}
      />

      {/* Edit Modal */}
      <EditMediaModal
        visible={editModalVisible}
        item={selectedItem}
        mediaType="VE"
        onClose={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
      />

      {/* Add Modal for Video */}
      <AddMediaModal
        visible={addModalVisible}
        mediaType="VE"
        regdMobileNo={regdMobileNo}
        userEmail={userEmail}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddSuccess}
      />
    </>
  );
}

   if (activeTab === 'Press Meets' || activeTab === 'Past Events') {
  return (
    <>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f56c3aff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => fetchMediaData(MEDIA_TYPE_MAP[activeTab])}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.postsContainer}>
          {mediaData.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No {activeTab.toLowerCase()} available
              </Text>
            </View>
          ) : (
            mediaData.map((item, index) => (
              <MediaItem 
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
      )}

      {/* FAB - Always rendered regardless of loading/error/success state */}
      <AddMediaFAB 
        visible={isAdmin}
        onPress={handleAddNew}
      />

      {/* Modals - Always rendered */}
      <EditMediaModal
        visible={editModalVisible}
        item={selectedItem}
        mediaType={MEDIA_TYPE_MAP[activeTab]}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
      />

      <AddMediaModal
        visible={addModalVisible}
        mediaType={MEDIA_TYPE_MAP[activeTab]}
        regdMobileNo={regdMobileNo}
        userEmail={userEmail}
        onClose={() => setAddModalVisible(false)}
        onSave={handleAddSuccess}
      />
    </>
  );
}

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.contentText}>{activeTab}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabBarContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.underline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.contentArea}>
        {renderTabContent()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBarContainer: { backgroundColor: '#f56c3aff', paddingTop: 12, paddingBottom: 10, elevation: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 10 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 10, marginHorizontal: 6, position: 'relative' },
  tabText: { color: '#ffffff', fontSize: 16, fontWeight: '500', opacity: 0.8 },
  activeTabText: { color: '#ffffff', fontWeight: 'bold', opacity: 1 },
  underline: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 2, backgroundColor: '#ffffff', borderRadius: 1 },
  contentArea: { flex: 1, backgroundColor: '#f8f9fa' },
  
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, color: '#e74c3c', marginBottom: 20, textAlign: 'center' },
  retryButton: { backgroundColor: '#f56c3aff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  retryText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center' },
  
  contentText: { fontSize: 20, color: '#333', fontWeight: '600', textAlign: 'center', marginTop: 20 },
  postsContainer: { padding: 20 },
  postItem: { backgroundColor: '#fff', padding: 15, marginBottom: 15, borderRadius: 8, elevation: 2 },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  postHeaderContent: { flex: 1 },
  
  // ✅ IMPROVED: Action button matching AboutConstituency
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
  
  // ✅ IMPROVED: Dropdown menu matching AboutConstituency
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
  dropdownDeleteItem: {
    // Special styling for delete item if needed
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
  
  postImage: { width: '100%', height: 300, borderRadius: 8, marginBottom: 10 },
  imageLoadingContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f0f0' },
  imageErrorContainer: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffebee' },
  imageErrorText: { color: '#c62828', fontSize: 14 },
  postTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  postDate: { fontSize: 12, color: '#888', marginBottom: 10 },
  postText: { fontSize: 14, color: '#333', lineHeight: 20 },
  linkButton: { marginTop: 10, backgroundColor: '#f56c3aff', padding: 10, borderRadius: 5, alignItems: 'center' },
  linkText: { color: '#fff', fontWeight: 'bold' },
  
  videoListContainer: { paddingVertical: 20, alignItems: 'center' },
  videoItem: { marginBottom: 20, width: '90%', backgroundColor: '#fff', padding: 15, borderRadius: 8, elevation: 2 },
  videoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 5, color: '#333', textAlign: 'center' },
  videoDate: { fontSize: 12, color: '#888', marginBottom: 10, textAlign: 'center' },
  videoPlayer: { width: width * 0.9, height: width * 0.6, backgroundColor: '#000', borderRadius: 8 },
  videoLoadingContainer: { justifyContent: 'center', alignItems: 'center' },
  videoDescription: { fontSize: 14, color: '#666', marginTop: 10, textAlign: 'center', lineHeight: 20 },

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
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#2c3e50' 
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
    fontWeight: '600' 
  },

  imageErrorIcon: { 
  fontSize: 48, 
  marginBottom: 10,
  opacity: 0.5,
},
imageErrorDetail: {
  fontSize: 10,
  color: '#999',
  marginTop: 5,
  textAlign: 'center',
  paddingHorizontal: 10,
},
  saveButton: { 
    backgroundColor: '#f56c3aff',
    elevation: 2,
    shadowColor: '#f56c3aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

    imageLoadingContainer: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#f0f0f0' 
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  imageErrorContainer: { 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#ffebee' 
  },
  imageErrorIcon: { 
    fontSize: 48, 
    marginBottom: 10,
    opacity: 0.5,
  },
  imageErrorText: { 
    color: '#c62828', 
    fontSize: 14,
    fontWeight: '600',
  },
  imageErrorDetail: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  // Add these to your existing styles
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
videoContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#000',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  
  // ✅ Video Player
  postVideoPlayer: {
    width: '100%',
    height: '100%',
  },
  
  // ✅ Video Overlay (for play/pause)
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
  
  // ✅ Play Button
  playButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(245, 108, 58, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  
  // ✅ Play Icon
  playIcon: {
    fontSize: 32,
    color: '#fff',
    marginLeft: 4, // Slight offset to center the triangle
  },
  
  // ✅ Video Indicator Badge
  videoIndicator: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  videoIndicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  videoPlayerContainer: {
    width: '100%',
    height: 300, // Larger for Video tab
    backgroundColor: '#000',
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  
  videoLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  
  videoTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
    textAlign: 'left',
  },
  
  videoDate: {
    fontSize: 12,
    color: '#888',
    marginBottom: 10,
    textAlign: 'left',
  },
  
  videoDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    textAlign: 'left',
    lineHeight: 20,
    paddingHorizontal: 5,
  },
});

export default MediaCornerScreen;