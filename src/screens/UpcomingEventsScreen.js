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

// ✅ Edit Modal Component
const EditEventModal = ({ visible, item, onClose, onSave }) => {
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
        media_type: 'UE'
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

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Event Title *</Text>
            <TextInput
              style={styles.input}
              value={header}
              onChangeText={setHeader}
              placeholder="Enter event title"
              placeholderTextColor="#999"
            />

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

            <Text style={styles.label}>URL</Text>
            <TextInput
              style={styles.input}
              value={url}
              onChangeText={setUrl}
              placeholder="Enter event URL"
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

// ✅ Event Item Component
const EventItem = React.memo(({ 
  item, 
  index, 
  regdMobileNo, 
  userEmail,
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
      
      // If it's already a full URL, use it directly
      if (item.media_file.startsWith('http://') || item.media_file.startsWith('https://')) {
        if (mounted) setImageUri(item.media_file);
        return;
      }

      setImageLoading(true);
      
      try {
        const baseUrl = await ConfigService.getBaseUrl();
        const appKey = await EncryptedStorage.getItem('AppKey');
        const token = await EncryptedStorage.getItem('authToken');
        
        const apiUrl = `${baseUrl}/api/mediacorner/asset/?leader_regd_mobile_no=${regdMobileNo}&user_email_id=${encodeURIComponent(userEmail)}&media_file=${item.media_file}`;
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'app-key': appKey || '',
            'Authorization': `Bearer ${token || ''}`,
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const reader = new FileReader();
        
        reader.onloadend = () => {
          if (mounted) setImageUri(reader.result);
        };
        
        reader.readAsDataURL(blob);
        
      } catch (error) {
        console.error('Error loading image:', error);
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
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleMenuPress}
          activeOpacity={0.7}
        >
          <Text style={styles.actionButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>
      
      <ThreeDotMenu
        visible={menuVisible}
        position={menuPosition}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDismiss={() => setMenuVisible(false)}
      />

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

// ✅ MAIN COMPONENT
const UpcomingEventsScreen = () => {
  const [eventsData, setEventsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    initializeUserData();
  }, []);

  useEffect(() => {
    if (regdMobileNo && userEmail) {
      fetchEventsData();
    }
  }, [regdMobileNo, userEmail]);

  const initializeUserData = async () => {
    try {
      const appOwnerInfoStr = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfoStr) {
        const appOwnerInfo = JSON.parse(appOwnerInfoStr);
        
        const mobile = appOwnerInfo.mobile_no || appOwnerInfo.regdMobileNo || 
                      appOwnerInfo.mobile || '7702000725';
        setRegdMobileNo(mobile);

        const email = appOwnerInfo.email || appOwnerInfo.user_email || 
                     appOwnerInfo.emailId || 'sanjay.jaiswal@gmail.com';
        setUserEmail(email);
      }
    } catch (error) {
      console.error('Error initializing user data:', error);
      setRegdMobileNo('7702000725');
      setUserEmail('sanjay.jaiswal@gmail.com');
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
      formData.append('regd_mobile_no', regdMobileNo);
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
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
      </ScrollView>

      <EditEventModal
        visible={editModalVisible}
        item={selectedItem}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
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
});

export default UpcomingEventsScreen;