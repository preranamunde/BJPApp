import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import EncryptedStorage from 'react-native-encrypted-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUserRole, checkIfCurrentUserIsAdmin } from '../../App';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';
import DeviceService from '../services/DeviceService';

const FeedbackAttachmentImage = React.memo(({ 
  attachmentUrl, 
  memberId 
}) => {
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadFeedbackImage = async () => {
      if (!attachmentUrl) {
        setImageLoading(false);
        return;
      }
      
      setImageLoading(true);
      setImageError(false);
      
      try {
        let mediaUrl = attachmentUrl;
        
        if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
          const baseUrl = await ConfigService.getBaseUrl();
          mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
          console.log('🔄 Fixed localhost URL:', mediaUrl);
        }
        
        if (mediaUrl.includes('ngrok-free.app:')) {
          mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
        }
        
        console.log('📥 Loading feedback image from:', mediaUrl);
        
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
            console.log('✅ Feedback image loaded successfully');
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
        console.error('❌ Error loading feedback image:', error);
        if (mounted) {
          setImageError(true);
          setImageLoading(false);
        }
      }
    };
    
    loadFeedbackImage();
    
    return () => {
      mounted = false;
    };
  }, [attachmentUrl, memberId]);

  if (imageLoading) {
    return (
      <View style={styles.attachmentImageContainer}>
        <ActivityIndicator size="small" color="#e16e2b" />
      </View>
    );
  }

  if (imageError || !imageUri) {
    return (
      <View style={styles.attachmentImageContainer}>
        <Icon name="broken-image" size={24} color="#bdc3c7" />
      </View>
    );
  }

  return (
    <TouchableOpacity 
      activeOpacity={0.9}
      onPress={() => {
        Alert.alert('Image', 'Viewing attachment');
      }}
    >
      <Image 
        source={{ uri: imageUri }}
        style={styles.attachmentImage} 
        resizeMode="cover"
      />
    </TouchableOpacity>
  );
});

// Edit Feedback Modal Component
const EditFeedbackModal = ({ visible, item, ownerMobile, userEmail, onClose, onSave }) => {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('pending');
  const [actionComments, setActionComments] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setSubject(item.subject || '');
      setDescription(item.description || '');
      setStatus(item.status?.toLowerCase() || 'pending');
      setActionComments(item.actionComments || '');
      setUpdatedBy('');
      
      console.log('🎨 === MODAL INITIALIZED ===');
      console.log('Item ID:', item.id);
      console.log('Owner Mobile:', ownerMobile);
      console.log('User Email:', userEmail);
    }
  }, [item, ownerMobile, userEmail]);

  const handleSave = async () => {
    if (!subject.trim()) {
      Alert.alert('Validation Error', 'Please enter a subject');
      return;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    if (!updatedBy.trim()) {
      Alert.alert('Validation Error', 'Please enter who is updating this feedback');
      return;
    }

    console.log('💾 === MODAL SAVE CLICKED ===');
    console.log('Owner Mobile:', ownerMobile);
    console.log('User Email:', userEmail);

    setSaving(true);
    try {
      const updateData = {
        id: item.id,
        subject: subject.trim(),
        description: description.trim(),
        status: status,
        actionComments: actionComments.trim(),
        updatedBy: updatedBy.trim(),
      };
      
      console.log('📋 Update data:', updateData);
      
      await onSave(updateData);
    } catch (error) {
      console.error('❌ Error in modal save:', error);
      Alert.alert('Error', 'Failed to update feedback');
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
            <Text style={styles.modalTitle}>Edit Feedback (Admin)</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter subject"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Enter description"
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Status *</Text>
            <View style={styles.statusPickerContainer}>
              {['pending', 'in progress', 'completed', 'resolved'].map((statusOption) => (
                <TouchableOpacity
                  key={statusOption}
                  style={[
                    styles.statusOption,
                    status === statusOption && styles.statusOptionSelected,
                  ]}
                  onPress={() => setStatus(statusOption)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      status === statusOption && styles.statusOptionTextSelected,
                    ]}
                  >
                    {statusOption === 'in progress' ? 'In Progress' : 
                     statusOption.charAt(0).toUpperCase() + statusOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Action Taken Comments</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={actionComments}
              onChangeText={setActionComments}
              placeholder="Enter action taken comments"
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.label}>Updated By *</Text>
            <TextInput
              style={styles.input}
              value={updatedBy}
              onChangeText={setUpdatedBy}
              placeholder="Enter your name and designation"
              placeholderTextColor="#999"
            />

            <View style={styles.infoBox}>
              <Icon name="info" size={16} color="#3498db" />
              <Text style={styles.infoText}>
                * Required fields. All changes will be logged.
              </Text>
            </View>
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

const FeedbackScreen = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState('feedback');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // User data states
  const [ownerMobile, setOwnerMobile] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);

  // View submissions states
  const [submittedItems, setSubmittedItems] = useState([]);
  const [fetchingSubmissions, setFetchingSubmissions] = useState(false);
  
  // Admin check states
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState('user');
  
  // Admin tab states - Changed default to null
  const [adminActiveTab, setAdminActiveTab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('PREVIEW');
  
  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  // Add admin status filter states
const [selectedStatus, setSelectedStatus] = useState('pending');
const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
// Add after existing state declarations
const [searchQuery, setSearchQuery] = useState('');
const [filteredItems, setFilteredItems] = useState([]);

const statusOptions = [
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Resolved', value: 'resolved' }
];

  useEffect(() => {
    initializeUserData();
  }, []);

  // Auto-load view for admin when tab is selected
  useEffect(() => {
    if (isAdmin && ownerMobile && userEmail && adminActiveTab) {
      console.log('🔄 Auto-loading admin view...');
      fetchUserFeedbacks(adminActiveTab);
    }
  }, [isAdmin, ownerMobile, userEmail, adminActiveTab]);

  const initializeUserData = async () => {
    try {
      console.log('🔍 Fetching user data for feedback...');
      
      const currentUserInfo = await getCurrentUserRole();
      
      console.log('📊 User Info:', {
        ownerMobile: currentUserInfo.owner_mobile,
        userEmail: currentUserInfo.loggedin_email,
        isLoggedIn: currentUserInfo.isLoggedIn
      });

      setOwnerMobile(currentUserInfo.owner_mobile || '');
      setUserEmail(currentUserInfo.loggedin_email || '');

      if (!currentUserInfo.owner_mobile) {
        console.warn('⚠️ No owner mobile found');
        Alert.alert('Warning', 'Owner mobile number not found. Please contact support.');
      }

      if (!currentUserInfo.loggedin_email) {
        console.warn('⚠️ No user email found');
        Alert.alert('Warning', 'Please login to submit feedback');
      }

    } catch (error) {
      console.error('❌ Error initializing user data:', error);
      Alert.alert('Error', 'Failed to load user information');
    } finally {
      await checkAdminRole();
      setLoading(false);
    }
  };

  const checkAdminRole = async () => {
    try {
      console.log('🔍 === CHECKING ADMIN ROLE IN FEEDBACK SCREEN ===');
      
      const adminCheck = await checkIfCurrentUserIsAdmin();
      const currentRole = await getCurrentUserRole();
      
      console.log('👤 Current User Role Info:', currentRole);
      console.log('👑 Admin Check Result:', adminCheck);
      
      setIsAdmin(adminCheck.isAdmin);
      setUserRole(currentRole.userRole);
      
      console.log('✅ Role check completed:', {
        isAdmin: adminCheck.isAdmin,
        userRole: currentRole.userRole,
      });
      
      return adminCheck.isAdmin;
      
    } catch (error) {
      console.error('❌ Error checking admin role:', error);
      setIsAdmin(false);
      setUserRole('user');
      return false;
    }
  };

  const handleStatusFilterSubmit = () => {
  console.log('Filtering by status:', selectedStatus);
  
  // Determine which type to fetch based on active tab
  const typeToFetch = adminActiveTab === 'feedback' ? 'feedback' : 'bug';
  
  // Call the fetch function with both type and status
  fetchUserFeedbacksByStatus(typeToFetch, selectedStatus);
};

  // Fetch user feedbacks with type filter
  const fetchUserFeedbacks = async (filterType = null) => {
    if (!ownerMobile || !userEmail) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    setFetchingSubmissions(true);
    setSubmittedItems([]);

    try {
      console.log('📥 === FETCHING USER FEEDBACKS ===');
      console.log('Filter Type:', filterType);
      
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/userfeedback`;

      // Build query params based on filter
      let queryParams = `leader_regd_mobile_no=${ownerMobile}&user_email_id=${userEmail}`;
      
      if (filterType) {
        queryParams += `&uf_type=${filterType}`;
      }

      console.log('🔗 API URL:', apiUrl);
      console.log('📋 Query Params:', queryParams);

      const result = await ApiService.authGet(`${apiUrl}?${queryParams}`);

      console.log('📥 API Response:', result);

      if (result.success && Array.isArray(result.data)) {
        const mappedData = result.data.map(item => ({
          id: item.uf_case_no,
          mongoId: item._id,
          type: item.uf_type || 'feedback',
          subject: item.uf_subject,
          description: item.uf_desc,
          date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A',
          status: getStatusLabel(item.uf_status),
          attachment: item.uf_attachment_url || null,
          actionComments: item.uf_action_taken_comments || null,
        }));

        setSubmittedItems(mappedData);
        console.log('✅ Fetched', mappedData.length, 'items');
      } else {
        setSubmittedItems([]);
        console.log('ℹ️ No items found');
      }

    } catch (error) {
      console.error('❌ Error fetching feedbacks:', error);
      Alert.alert('Error', 'Failed to load submissions');
      setSubmittedItems([]);
    } finally {
      setFetchingSubmissions(false);
    }
  };

  // Fetch user feedbacks with type and status filters
const fetchUserFeedbacksByStatus = async (filterType, status) => {
  if (!ownerMobile || !userEmail) {
    Alert.alert('Error', 'User information not available');
    return;
  }

  setFetchingSubmissions(true);
  setSubmittedItems([]);

  try {
    console.log('📥 === FETCHING USER FEEDBACKS BY STATUS ===');
    console.log('Filter Type:', filterType);
    console.log('Status:', status);
    
    const baseUrl = await ConfigService.getBaseUrl();
    // ✅ CORRECT ENDPOINT - Use /fetch/ instead of /search
    const apiUrl = `${baseUrl}/api/userfeedback/fetch/`;

    // Build query params with type and status
    const queryParams = `leader_regd_mobile_no=${ownerMobile}&user_email_id=${userEmail}&uf_type=${filterType}&uf_status=${status}`;

    console.log('🔗 API URL:', apiUrl);
    console.log('📋 Query Params:', queryParams);

    const result = await ApiService.authGet(`${apiUrl}?${queryParams}`);

    console.log('📥 API Response:', result);

    if (result.success && Array.isArray(result.data)) {
      const mappedData = result.data.map(item => ({
        id: item.uf_case_no,
        mongoId: item._id,
        type: item.uf_type || 'feedback',
        subject: item.uf_subject,
        description: item.uf_desc,
        date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : 'N/A',
        status: getStatusLabel(item.uf_status),
        attachment: item.uf_attachment_url || null,
        actionComments: item.uf_action_taken_comments || null,
      }));

      setSubmittedItems(mappedData);
      console.log('✅ Fetched', mappedData.length, 'items with status:', status);
      
      if (mappedData.length === 0) {
        Alert.alert('No Data', `No ${filterType} found with status: ${status}`);
      }
    } else {
      setSubmittedItems([]);
      console.log('ℹ️ No items found');
    }

  } catch (error) {
    console.error('❌ Error fetching feedbacks by status:', error);
    Alert.alert('Error', 'Failed to load submissions');
    setSubmittedItems([]);
  } finally {
    setFetchingSubmissions(false);
  }
};

// Filter items based on search query
useEffect(() => {
  if (!searchQuery.trim()) {
    setFilteredItems(submittedItems);
  } else {
    const filtered = submittedItems.filter(item => 
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredItems(filtered);
  }
}, [searchQuery, submittedItems]);

  const handleEditFeedback = (item) => {
    console.log('✏️ === EDITING FEEDBACK ===');
    console.log('Item ID (uf_case_no):', item.id);
    console.log('Item subject:', item.subject);
    console.log('Item status:', item.status);
    setSelectedFeedback(item);
    setEditModalVisible(true);
  };

  const handleSaveFeedback = async (updatedData) => {
    try {
      console.log('📤 === UPDATING FEEDBACK ===');
      console.log('📋 Updated data received:', updatedData);
      
      const baseUrl = await ConfigService.getBaseUrl();
      const apiUrl = `${baseUrl}/api/userfeedback`;

      const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                         await AsyncStorage.getItem('jwt_token') ||
                         await EncryptedStorage.getItem('ACCESS_TOKEN') ||
                         await EncryptedStorage.getItem('accessToken');
      
      const appKey = await EncryptedStorage.getItem('APP_KEY');

      console.log('🔐 Auth check:', {
        hasToken: !!accessToken,
        hasAppKey: !!appKey,
      });

      if (!accessToken || !appKey) {
        Alert.alert('Authentication Error', 'Session expired. Please login again.');
        return;
      }

      const requestBody = {
        leader_regd_mobile_no: ownerMobile,
        user_email_id: userEmail,
        uf_case_no: updatedData.id,
        uf_subject: updatedData.subject,
        uf_desc: updatedData.description,
        uf_status: updatedData.status,
        uf_action_taken_comments: updatedData.actionComments || '',
        updated_by: updatedData.updatedBy,
      };

      console.log('📤 Request Body:', requestBody);

      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-app-key': appKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('📥 Response Status:', response.status);

      const result = await response.json();
      console.log('📥 Response Body:', result);

      const isSuccess = response.ok || 
                       (result.message && result.message.toLowerCase().includes('success')) ||
                       (result.message && result.message.toLowerCase().includes('congrats'));
      
      if (isSuccess) {
        console.log('✅ Feedback updated successfully');
        
        setEditModalVisible(false);
        setSelectedFeedback(null);
        
        Alert.alert('✅ Success', 'Feedback updated successfully');
        
        // Refresh based on current view
        fetchUserFeedbacks(adminActiveTab);
      } else {
        console.error('❌ Update failed:', result);
        Alert.alert('Update Failed', result.message || `Server error: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error updating feedback:', error);
      Alert.alert('Network Error', error.message || 'Failed to connect to server');
    }
  };

  const getStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case 'pending':
        return 'Pending';
      case 'reported':
        return 'Reported';
      case 'completed':
      case 'resolved':
        return 'Resolved';
      case 'in progress':
      case 'inprogress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets) {
        const newFiles = response.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName,
          type: asset.type || 'image/jpeg',
          fileType: 'image',
        }));
        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    });
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const validateForm = () => {
  // ✅ SKIP VALIDATION IF USER IS JUST VIEWING
  if (selectedType === 'view') {
    return true;
  }

  if (!selectedType || selectedType === 'view') {
    Alert.alert('Validation Error', 'Please select a type');
    return false;
  }

  if (!subject.trim()) {
    Alert.alert('Validation Error', 'Please enter a subject');
    return false;
  }

  if (!description.trim()) {
    Alert.alert('Validation Error', 'Please enter a description');
    return false;
  }

  return true;
};

// ✅ Helper function to send device info (called only for bug reports)
const sendDeviceInfo = async (baseUrl, ownerMobile, userEmail) => {
  try {
    console.log('📱 === SENDING DEVICE INFO FOR BUG REPORT ===');
    
    // Get complete device information
    const completeDeviceInfo = await DeviceService.getCompleteDeviceInfo();
    console.log('📱 Device Info collected:', JSON.stringify(completeDeviceInfo, null, 2));

    // Device info endpoint
    const deviceInfoUrl = `${baseUrl}/api/userfeedback/deviceinfo`;
    console.log('🔗 Device Info API URL:', deviceInfoUrl);

    // Prepare request body with all device info
    const deviceInfoBody = {
      leader_regd_mobile_no: ownerMobile,
      user_email_id: userEmail,
      device_aaid: completeDeviceInfo.device_aaid,
      device_manufacturer_name: completeDeviceInfo.device_manufacturer_name,
      device_model: completeDeviceInfo.device_model,
      device_brand_name: completeDeviceInfo.device_brand_name,
      device_os_version: completeDeviceInfo.device_os_version,
      device_api_level: completeDeviceInfo.device_api_level,
      device_type: completeDeviceInfo.device_type,
      device_app_version: completeDeviceInfo.device_app_version,
      device_type_str: completeDeviceInfo.device_type_str,
      device_os_codename: completeDeviceInfo.device_os_codename,
      device_screen_density: completeDeviceInfo.device_screen_density,
    };

    console.log('📤 Device Info Request Body:', JSON.stringify(deviceInfoBody, null, 2));

    // Send device info using authPost (which includes authentication headers)
    const deviceInfoResult = await ApiService.authPost(
      deviceInfoUrl,
      deviceInfoBody,
      {
        'Content-Type': 'application/json',
      }
    );

    console.log('📥 Device Info API Response:', deviceInfoResult);

    if (deviceInfoResult.success) {
      console.log('✅ Device info sent successfully for bug report');
      return { success: true };
    } else {
      console.error('⚠️ Device info submission returned non-success:', deviceInfoResult);
      return { success: false, message: deviceInfoResult.message };
    }

  } catch (error) {
    console.error('❌ Error sending device info:', error);
    throw error; // Re-throw to be caught by caller
  }
};

// ✅ Main handleSubmit function
const handleSubmit = async () => {
  if (!validateForm()) return;

  if (!ownerMobile || !userEmail) {
    Alert.alert(
      'Missing Information',
      'Owner mobile or user email not found. Please try logging in again.',
      [{ text: 'OK' }]
    );
    return;
  }

  setSubmitting(true);

  try {
    console.log('📤 === SUBMITTING FEEDBACK/BUG REPORT ===');
    console.log('📋 Selected Type:', selectedType); // 'feedback' or 'complaint'
    
    const baseUrl = await ConfigService.getBaseUrl();
    const feedbackApiUrl = `${baseUrl}/api/userfeedback`;

    console.log('🔗 Feedback API URL:', feedbackApiUrl);

    const formData = new FormData();
    formData.append('leader_regd_mobile_no', ownerMobile);
    formData.append('user_email_id', userEmail);
    formData.append('uf_subject', subject.trim());
    formData.append('uf_desc', description.trim());
    formData.append('uf_status', 'pending');
    
    // Map 'complaint' to 'bug' for API
    const feedbackType = selectedType === 'feedback' ? 'feedback' : 'bug';
    formData.append('uf_type', feedbackType);
    
    console.log('📋 Feedback Type for API:', feedbackType);

    if (selectedFiles.length > 0) {
      const file = selectedFiles[0];
      
      formData.append('uf_attachment', {
        uri: file.uri,
        name: file.name,
        type: file.type || 'image/jpeg',
      });
      
      console.log('📎 Attachment added:', file.name);
    }

    // Step 1: Submit feedback/bug report
    console.log('📤 Submitting to server...');
    const result = await ApiService.authPost(
      feedbackApiUrl,
      formData,
      {
        'Content-Type': 'multipart/form-data',
      },
      true
    );

    console.log('📥 API Response:', result);

    if (result.success) {
      console.log('✅ Submission successful');
      
      // ✅ Step 2: Send device info ONLY if it's a bug/issue report
      if (selectedType === 'complaint') {
        console.log('🐛 Bug report detected - sending device info...');
        try {
          const deviceInfoResult = await sendDeviceInfo(baseUrl, ownerMobile, userEmail);
          
          if (deviceInfoResult.success) {
            console.log('✅ Device info sent successfully');
          } else {
            console.warn('⚠️ Device info sent but returned non-success');
          }
        } catch (deviceError) {
          // Don't fail the whole submission if device info fails
          console.error('⚠️ Device info submission failed (non-critical):', deviceError);
          console.log('ℹ️ Bug report was still submitted successfully');
        }
      } else {
        console.log('💬 Regular feedback - skipping device info');
      }

      // Show success message
      const submissionType = selectedType === 'feedback' ? 'feedback' : 'bug report';
      Alert.alert(
        '✅ Success',
        `Your ${submissionType} has been submitted successfully!${
          selectedType === 'complaint' ? '\n\nDevice information has been included to help us resolve the issue.' : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSubject('');
              setDescription('');
              setSelectedFiles([]);
              setSelectedType('feedback');
              navigation.goBack();
            },
          },
        ]
      );
    } else {
      throw new Error(result.message || 'Failed to submit');
    }

  } catch (error) {
    console.error('❌ Error during submission:', error);
    console.error('❌ Error stack:', error.stack);
    
    const submissionType = selectedType === 'feedback' ? 'feedback' : 'bug report';
    Alert.alert(
      '❌ Submission Failed',
      `Failed to submit ${submissionType}: ${error.message}\n\nPlease check your connection and try again.`,
      [{ text: 'OK' }]
    );
  } finally {
    setSubmitting(false);
  }
};

const renderAdminStatusFilter = () => {
  return (
    <View style={styles.adminFilterContainer}>
      <Text style={styles.filterLabel}>Filter by Status:</Text>
      
      <View style={styles.dropdownContainer}>
        <TouchableOpacity 
          style={styles.dropdownButton}
          onPress={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
        >
          <Text style={styles.dropdownButtonText}>
            {statusOptions.find(opt => opt.value === selectedStatus)?.label || 'Pending'}
          </Text>
          <Text style={styles.dropdownArrow}>{isStatusDropdownOpen ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        
        {/* ✅ RENDER DROPDOWN OUTSIDE WITH MODAL */}
        <Modal
          visible={isStatusDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsStatusDropdownOpen(false)}
        >
          <TouchableOpacity 
            style={styles.dropdownModalOverlay}
            activeOpacity={1}
            onPress={() => setIsStatusDropdownOpen(false)}
          >
            <View style={styles.dropdownModalContent}>
              <View style={styles.dropdownOptionsModal}>
                {statusOptions.map((option, index) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.dropdownOption,
                      selectedStatus === option.value && styles.selectedOption,
                      index === statusOptions.length - 1 && styles.lastOption
                    ]}
                    onPress={() => {
                      setSelectedStatus(option.value);
                      setIsStatusDropdownOpen(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      selectedStatus === option.value && styles.selectedOptionText
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
      
      <TouchableOpacity 
        style={styles.filterSubmitButton}
        onPress={handleStatusFilterSubmit}
        disabled={fetchingSubmissions}
      >
        {fetchingSubmissions ? (
          <View style={styles.loadingButtonContent}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.filterSubmitButtonText}>Loading...</Text>
          </View>
        ) : (
          <Text style={styles.filterSubmitButtonText}>Submit</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

  // Render View Submissions (PREVIEW)
  const renderViewSubmissions = () => (
  <View style={styles.viewContainer}>
    {isAdmin && renderAdminStatusFilter()}
    <View style={styles.viewHeader}>
      <View>
        <Text style={styles.viewTitle}>
          {adminActiveTab === 'feedback' ? 'All Feedback' : 'All Issues'}
        </Text>
        <Text style={styles.viewSubtitle}>
          View and manage {adminActiveTab}
        </Text>
      </View>
      <TouchableOpacity 
        onPress={() => fetchUserFeedbacks(adminActiveTab)}
        style={styles.refreshButton}
        disabled={fetchingSubmissions}
      >
        <Icon 
          name="refresh" 
          size={24} 
          color={fetchingSubmissions ? '#bdc3c7' : '#e16e2b'} 
        />
      </TouchableOpacity>
    </View>

    {fetchingSubmissions ? (
      <View style={styles.fetchingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.fetchingText}>Loading submissions...</Text>
      </View>
    ) : submittedItems.length === 0 ? (
      <View style={styles.emptyContainer}>
        <Icon 
          name={adminActiveTab === 'feedback' ? 'feedback' : 'report-problem'} 
          size={60} 
          color="#bdc3c7" 
        />
        <Text style={styles.emptyText}>No submissions yet</Text>
        <Text style={styles.emptySubtext}>
          No {adminActiveTab} have been submitted yet
        </Text>
      </View>
    ) : (
      <ScrollView showsVerticalScrollIndicator={false}>
        {submittedItems.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            style={styles.submissionCard}
            activeOpacity={0.8}
            onPress={() => {
              navigation.navigate('FeedbackDetails', {
                feedbackId: item.id,
                ownerMobile: ownerMobile,
                userEmail: userEmail,
              });
            }}
          >
            {isAdmin && (
              <TouchableOpacity 
                style={styles.editIconButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditFeedback(item);
                }}
                activeOpacity={0.7}
              >
                <Icon name="edit" size={20} color="#e16e2b" />
              </TouchableOpacity>
            )}

            <View style={styles.submissionHeader}>
              <View style={styles.submissionTypeContainer}>
                <Icon
                  name={item.type === 'feedback' ? 'feedback' : 'report-problem'}
                  size={20}
                  color="#e16e2b"
                />
                <Text style={styles.submissionType}>
                  {item.type === 'feedback' ? 'Feedback' : 'Issue'}
                </Text>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'Resolved' && styles.statusResolved,
                item.status === 'In Progress' && styles.statusInProgress,
                item.status === 'Reported' && styles.statusReported,
              ]}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <Text style={styles.submissionSubject}>{item.subject}</Text>
            <Text style={styles.submissionDescription} numberOfLines={2}>
              {item.description}
            </Text>

            {item.actionComments && (
              <View style={styles.actionCommentsContainer}>
                <Icon name="comment" size={16} color="#27ae60" />
                <Text style={styles.actionComments} numberOfLines={2}>
                  {item.actionComments}
                </Text>
              </View>
            )}

            {item.attachment && (
              <View style={styles.attachmentContainer}>
                <Text style={styles.attachmentLabel}>Attachment:</Text>
                <FeedbackAttachmentImage
                  attachmentUrl={item.attachment}
                  memberId={ownerMobile}
                />
              </View>
            )}

            <View style={styles.submissionFooter}>
              <View style={styles.dateContainer}>
                <Icon name="calendar-today" size={14} color="#7f8c8d" />
                <Text style={styles.submissionDate}>{item.date}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    )}

    {isAdmin && (
      <EditFeedbackModal
        visible={editModalVisible}
        item={selectedFeedback}
        ownerMobile={ownerMobile}
        userEmail={userEmail}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedFeedback(null);
        }}
        onSave={handleSaveFeedback}
      />
    )}
  </View>
);

  // Render List View (LIST)
  // Render List View (LIST)
const renderListView = () => {
  if (fetchingSubmissions) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading submissions...</Text>
      </View>
    );
  }

  if (submittedItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon 
          name={adminActiveTab === 'feedback' ? 'feedback' : 'report-problem'} 
          size={60} 
          color="#bdc3c7" 
        />
        <Text style={styles.emptyText}>No {adminActiveTab} found</Text>
        <Text style={styles.emptySubtext}>
          No {adminActiveTab} have been submitted yet
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.dataContainer}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewTitle}>
          {adminActiveTab === 'feedback' ? 'FEEDBACK' : 'ISSUES'} LIST
        </Text>
        <Text style={styles.dataCount}>
          ({filteredItems.length} of {submittedItems.length})
        </Text>
      </View>
      
      {/* ✅ ADD SEARCH INPUT */}
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#7f8c8d" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by Case No, Subject, or Description..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity 
            onPress={() => setSearchQuery('')}
            style={styles.clearSearchButton}
          >
            <Icon name="close" size={20} color="#7f8c8d" />
          </TouchableOpacity>
        )}
      </View>
      
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="search-off" size={60} color="#bdc3c7" />
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubtext}>
            Try a different search term
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {filteredItems.map((item, index) => (
            <TouchableOpacity 
              key={`list-${item.id}-${index}`} 
              style={styles.listItemCard}
              onPress={() => {
                navigation.navigate('FeedbackDetails', {
                  feedbackId: item.id,
                  ownerMobile: ownerMobile,
                  userEmail: userEmail,
                });
              }}
            >
              <View style={styles.listItemHeader}>
                <Text style={styles.listRegnNo}>{item.id}</Text>
                <Text style={[
                  styles.listStatus,
                  item.status === 'Resolved' && styles.statusResolved,
                  item.status === 'In Progress' && styles.statusInProgress,
                ]}>
                  {item.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.listApplicantName}>{item.subject}</Text>
              <Text style={styles.listMobile} numberOfLines={1}>{item.description}</Text>
              <Text style={styles.listDate}>{item.date}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

  const renderTypeSelection = () => {
  // For admin, don't show type selection - they only see the view
  if (isAdmin) {
    return null;
  }
  
  return (
    <View style={styles.typeSelectionRow}>
      <TouchableOpacity
        style={[
          styles.typeBox,
          selectedType === 'feedback' && styles.typeBoxSelected,
        ]}
        onPress={() => setSelectedType('feedback')}
      >
        <Icon
          name="feedback"
          size={28}
          color={selectedType === 'feedback' ? '#fff' : '#e16e2b'}
        />
        <Text
          style={[
            styles.typeBoxText,
            selectedType === 'feedback' && styles.typeBoxTextSelected,
          ]}
        >
          Feedback
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeBox,
          selectedType === 'complaint' && styles.typeBoxSelected,
        ]}
        onPress={() => setSelectedType('complaint')}
      >
        <Icon
          name="report-problem"
          size={28}
          color={selectedType === 'complaint' ? '#fff' : '#e16e2b'}
        />
        <Text
          style={[
            styles.typeBoxText,
            selectedType === 'complaint' && styles.typeBoxTextSelected,
          ]}
        >
          Report Issue
        </Text>
      </TouchableOpacity>

      {/* ✅ ADD NEW VIEW BUTTON */}
      <TouchableOpacity
        style={[
          styles.typeBox,
          selectedType === 'view' && styles.typeBoxSelected,
        ]}
        onPress={() => {
          setSelectedType('view');
          // Auto-fetch user's submissions when View is selected
          fetchUserFeedbacks(null); // null = fetch all types
        }}
      >
        <Icon
          name="visibility"
          size={28}
          color={selectedType === 'view' ? '#fff' : '#e16e2b'}
        />
        <Text
          style={[
            styles.typeBoxText,
            selectedType === 'view' && styles.typeBoxTextSelected,
          ]}
        >
          View
        </Text>
      </TouchableOpacity>
    </View>
  );
};

  const renderForm = () => {
  // For admin, they should not see the form
  if (isAdmin) {
    return null;
  }

  // ✅ IF VIEW TYPE, SHOW USER'S SUBMISSIONS
  if (selectedType === 'view') {
    return (
      <View style={styles.viewContainer}>
        <View style={styles.viewHeader}>
          <View>
            <Text style={styles.viewTitle}>My Submissions</Text>
            <Text style={styles.viewSubtitle}>
              View your feedback and issues
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => fetchUserFeedbacks(null)}
            style={styles.refreshButton}
            disabled={fetchingSubmissions}
          >
            <Icon 
              name="refresh" 
              size={24} 
              color={fetchingSubmissions ? '#bdc3c7' : '#e16e2b'} 
            />
          </TouchableOpacity>
        </View>

        {fetchingSubmissions ? (
          <View style={styles.fetchingContainer}>
            <ActivityIndicator size="large" color="#e16e2b" />
            <Text style={styles.fetchingText}>Loading submissions...</Text>
          </View>
        ) : submittedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="inbox" size={60} color="#bdc3c7" />
            <Text style={styles.emptyText}>No submissions yet</Text>
            <Text style={styles.emptySubtext}>
              You haven't submitted any feedback or issues yet
            </Text>
          </View>
        ) : (
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 500 }}
          >
            {submittedItems.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.submissionCard}
                activeOpacity={0.8}
                onPress={() => {
                  navigation.navigate('FeedbackDetails', {
                    feedbackId: item.id,
                    ownerMobile: ownerMobile,
                    userEmail: userEmail,
                  });
                }}
              >
                <View style={styles.submissionHeader}>
                  <View style={styles.submissionTypeContainer}>
                    <Icon
                      name={item.type === 'feedback' ? 'feedback' : 'report-problem'}
                      size={20}
                      color="#e16e2b"
                    />
                    <Text style={styles.submissionType}>
                      {item.type === 'feedback' ? 'Feedback' : 'Issue'}
                    </Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    item.status === 'Resolved' && styles.statusResolved,
                    item.status === 'In Progress' && styles.statusInProgress,
                    item.status === 'Reported' && styles.statusReported,
                  ]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.submissionSubject}>{item.subject}</Text>
                <Text style={styles.submissionDescription} numberOfLines={2}>
                  {item.description}
                </Text>

                {item.actionComments && (
                  <View style={styles.actionCommentsContainer}>
                    <Icon name="comment" size={16} color="#27ae60" />
                    <Text style={styles.actionComments} numberOfLines={2}>
                      {item.actionComments}
                    </Text>
                  </View>
                )}

                {item.attachment && (
                  <View style={styles.attachmentContainer}>
                    <Text style={styles.attachmentLabel}>Attachment:</Text>
                    <FeedbackAttachmentImage
                      attachmentUrl={item.attachment}
                      memberId={ownerMobile}
                    />
                  </View>
                )}

                <View style={styles.submissionFooter}>
                  <View style={styles.dateContainer}>
                    <Icon name="calendar-today" size={14} color="#7f8c8d" />
                    <Text style={styles.submissionDate}>{item.date}</Text>
                  </View>
                  <View style={styles.viewDetailsButton}>
                    <Text style={styles.viewDetailsText}>View Details</Text>
                    <Icon name="arrow-forward" size={14} color="#e16e2b" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  // ✅ ORIGINAL FORM CODE FOR FEEDBACK/COMPLAINT
  if (!selectedType) return null;

  const getPlaceholder = () => {
    switch(selectedType) {
      case 'complaint':
        return 'Describe the problem you faced...';
      default:
        return 'Write your suggestions...';
    }
  };

  const getLabel = () => {
    switch(selectedType) {
      case 'complaint':
        return 'Describe the issue *';
      default:
        return 'Your Feedback *';
    }
  };

  return (
    <View style={styles.formContainer}>
      {/* ... rest of your existing form code ... */}
      <Text style={styles.label}>Subject *</Text>
      <TextInput
        style={styles.input}
        value={subject}
        onChangeText={setSubject}
        placeholder="Enter subject"
        placeholderTextColor="#999"
      />

      <Text style={styles.label}>{getLabel()}</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={description}
        onChangeText={setDescription}
        placeholder={getPlaceholder()}
        placeholderTextColor="#999"
        multiline
        numberOfLines={6}
      />

      <Text style={styles.label}>Attachments (Optional)</Text>

      <View style={styles.fileButtonsContainer}>
        <TouchableOpacity
          style={styles.fileButtonFull}
          onPress={handlePickImage}
        >
          <Icon name="image" size={24} color="#e16e2b" />
          <Text style={styles.fileButtonText}>Add Images</Text>
        </TouchableOpacity>
      </View>

      {selectedFiles.length > 0 && (
        <View style={styles.filesListContainer}>
          <Text style={styles.filesListTitle}>
            Attached Files ({selectedFiles.length})
          </Text>
          {selectedFiles.map((file, index) => (
            <View key={index} style={styles.fileItem}>
              <View style={styles.fileInfo}>
                <Icon
                  name="image"
                  size={24}
                  color="#e16e2b"
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {file.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveFile(index)}
                style={styles.removeFileButton}
              >
                <Icon name="close" size={20} color="#e74c3c" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
        activeOpacity={0.7}
      >
        {submitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="send" size={20} color="#fff" />
            <Text style={styles.submitButtonText}>
              Submit {selectedType === 'feedback' ? 'Feedback' : 'Issue'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <>
          {/* Main Tabs - Only for Admin and always visible */}
          {isAdmin && (
            <View style={styles.mainTabContainer}>
              <View style={styles.tabRow}>
                {/* FEEDBACK Main Tab */}
                <TouchableOpacity
                  style={[
                    styles.mainTabButton,
                    adminActiveTab === 'feedback' && styles.activeMainTabButton,
                  ]}
                  onPress={() => {
                    setAdminActiveTab('feedback');
                    setActiveSubTab('PREVIEW');
                    fetchUserFeedbacks('feedback');
                  }}
                >
                  <Text
                    style={[
                      styles.mainTabText,
                      adminActiveTab === 'feedback' && styles.activeMainTabText,
                    ]}
                  >
                    FEEDBACK
                  </Text>
                  {adminActiveTab === 'feedback' && <View style={styles.underline} />}
                </TouchableOpacity>

                {/* ISSUES Main Tab */}
                <TouchableOpacity
                  style={[
                    styles.mainTabButton,
                    adminActiveTab === 'issues' && styles.activeMainTabButton,
                  ]}
                  onPress={() => {
                    setAdminActiveTab('issues');
                    setActiveSubTab('PREVIEW');
                    fetchUserFeedbacks('bug');
                  }}
                >
                  <Text
                    style={[
                      styles.mainTabText,
                      adminActiveTab === 'issues' && styles.activeMainTabText,
                    ]}
                  >
                    ISSUES
                  </Text>
                  {adminActiveTab === 'issues' && <View style={styles.underline} />}
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Sub Tabs - Only show when a main tab is selected */}
          {isAdmin && adminActiveTab && (
            <View style={styles.subTabContainer}>
              <View style={styles.tabRow}>
                {['PREVIEW', 'LIST'].map(tab => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveSubTab(tab)}
                    style={[
                      styles.subTabButton,
                      activeSubTab === tab && styles.activeSubTabButton,
                    ]}
                  >
                    <Text
                      style={[
                        styles.subTabText,
                        activeSubTab === tab && styles.activeSubTabText,
                      ]}
                    >
                      {tab}
                    </Text>
                    {activeSubTab === tab && <View style={styles.subUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Content Area */}
          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {isAdmin ? (
              // Admin View - Only show when tab is selected
              adminActiveTab ? (
                activeSubTab === 'PREVIEW' ? renderViewSubmissions() : renderListView()
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="feedback" size={60} color="#bdc3c7" />
                  <Text style={styles.emptyText}>Select a tab above</Text>
                  <Text style={styles.emptySubtext}>
                    Choose Feedback or Issues to view submissions
                  </Text>
                </View>
              )
            ) : (
              // Regular User View
              <>
                {renderTypeSelection()}
                {renderForm()}
              </>
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5' 
  },
  
  // Main Tab Styles - Fixed with proper spacing
  mainTabContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Changed from flex-start to space-around
    alignItems: 'center',
    paddingHorizontal: 0, // Removed horizontal padding
  },
  mainTabButton: {
    flex: 1, // Added flex to distribute space evenly
    paddingVertical: 15,
    alignItems: 'center', // Center the text
    justifyContent: 'center',
  },
  activeMainTabButton: {
    borderBottomWidth: 0,
  },
  mainTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7f8c8d',
    textTransform: 'uppercase',
  },
  activeMainTabText: {
    color: '#e16e2b',
    fontWeight: 'bold',
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: '10%', // Added margins to make underline narrower
    right: '10%',
    height: 3,
    backgroundColor: '#e16e2b',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },

  // Sub Tab Styles - Fixed with proper spacing
  subTabContainer: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingVertical: 5,
  },
  subTabButton: {
    flex: 1, // Added flex to distribute space evenly
    paddingVertical: 12,
    alignItems: 'center', // Center the text
    justifyContent: 'center',
  },
  activeSubTabButton: {
    borderBottomWidth: 0,
  },
  subTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#95a5a6',
  },
  activeSubTabText: {
    color: '#2c3e50',
    fontWeight: '600',
  },
  subUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%', // Added margins to make underline narrower
    right: '15%',
    height: 2,
    backgroundColor: '#2c3e50',
  },

  scrollContainer: {
    flex: 1,
  },
  contentContainer: { 
    padding: 20 
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#7f8c8d',
  },

  typeSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  typeBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    flex: 1,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  typeBoxSelected: {
    backgroundColor: '#e16e2b',
    borderColor: '#e16e2b',
  },
  typeBoxText: {
    fontSize: 12,
    color: '#2c3e50',
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  typeBoxTextSelected: {
    color: '#fff',
  },

  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
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
    marginBottom: 15,
  },
  textArea: { 
    height: 120, 
    textAlignVertical: 'top' 
  },

  fileButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  fileButtonFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f0',
    borderWidth: 1,
    borderColor: '#e16e2b',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  fileButtonText: { 
    color: '#e16e2b', 
    fontSize: 14, 
    fontWeight: '600' 
  },

  filesListContainer: { 
    marginTop: 10, 
    marginBottom: 20 
  },
  filesListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileInfo: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    flex: 1, 
    gap: 10 
  },
  fileName: { 
    fontSize: 14, 
    color: '#2c3e50', 
    flex: 1 
  },
  removeFileButton: { 
    padding: 4 
  },

  submitButton: {
    backgroundColor: '#e16e2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
  },
  submitButtonDisabled: { 
    backgroundColor: '#bdc3c7' 
  },
  submitButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },

  // View Submissions Styles (PREVIEW)
  viewContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minHeight: 400,
  },
  viewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  viewTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  viewSubtitle: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  refreshButton: {
    padding: 8,
  },

  fetchingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  fetchingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#7f8c8d',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 5,
    textAlign: 'center',
  },
  submissionCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  submissionTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  submissionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e16e2b',
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#ecf0f1',
  },
  statusResolved: {
    backgroundColor: '#d4edda',
  },
  statusInProgress: {
    backgroundColor: '#fff3cd',
  },
  statusReported: {
    backgroundColor: '#ffeaa7',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2c3e50',
  },
  submissionSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
  },
  submissionDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
    lineHeight: 20,
  },
  actionCommentsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#e8f8f5',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  actionComments: {
    flex: 1,
    fontSize: 13,
    color: '#27ae60',
    lineHeight: 18,
  },
  submissionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  submissionDate: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  attachmentContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  attachmentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },
  attachmentImageContainer: {
    width: '100%',
    height: 150,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  attachmentImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  editIconButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // List View Styles
  dataContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    minHeight: 400,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  dataCount: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  cardsContainer: {
    flex: 1,
  },
  listItemCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listRegnNo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#e16e2b',
  },
  listStatus: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#ecf0f1',
    color: '#2c3e50',
  },
  listApplicantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  listMobile: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  listDate: {
    fontSize: 12,
    color: '#95a5a6',
  },
  
  // Modal Styles
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
    fontWeight: '300' 
  },
  modalContent: { 
    padding: 20, 
    maxHeight: 500 
  },
  statusPickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
    minWidth: 80,
  },
  statusOptionSelected: {
    backgroundColor: '#e16e2b',
    borderColor: '#e16e2b',
  },
  statusOptionText: {
    fontSize: 11,
    color: '#2c3e50',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusOptionTextSelected: {
    color: '#fff',
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
  saveButton: { 
    backgroundColor: '#e16e2b',
    elevation: 2,
  },
  saveButtonText: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1976d2',
    lineHeight: 18,
  },
  // Add these to your existing styles object
adminFilterContainer: {
  backgroundColor: '#f8f9fa',
  padding: 15,
  borderRadius: 8,
  marginBottom: 15,
  borderWidth: 1,
  borderColor: '#e0e0e0',
},
filterLabel: {
  fontSize: 14,
  fontWeight: '600',
  color: '#2c3e50',
  marginBottom: 10,
},
dropdownContainer: {
  position: 'relative',
  marginBottom: 10,
  zIndex: 9999, // ✅ ADD THIS
},
dropdownButton: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  padding: 12,
},
dropdownButtonText: {
  fontSize: 14,
  color: '#2c3e50',
  fontWeight: '500',
},
dropdownArrow: {
  fontSize: 12,
  color: '#7f8c8d',
},
dropdownOptions: {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  marginTop: 4,
  zIndex: 10000, // ✅ INCREASE THIS
  elevation: 10, // ✅ INCREASE THIS from 5 to 10
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
},
dropdownOption: {
  padding: 12,
  borderBottomWidth: 1,
  borderBottomColor: '#f0f0f0',
},
lastOption: {
  borderBottomWidth: 0,
},
selectedOption: {
  backgroundColor: '#fff5f0',
},
dropdownOptionText: {
  fontSize: 14,
  color: '#2c3e50',
},
selectedOptionText: {
  color: '#e16e2b',
  fontWeight: '600',
},
filterSubmitButton: {
  backgroundColor: '#e16e2b',
  paddingVertical: 12,
  borderRadius: 8,
  alignItems: 'center',
},
filterSubmitButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: 'bold',
},
loadingButtonContent: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
},
// Add these new styles at the bottom of your styles object
dropdownModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
dropdownModalContent: {
  width: '90%',
  maxWidth: 400,
},
dropdownOptionsModal: {
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: '#ddd',
  borderRadius: 8,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
// Add these to your styles object
searchContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#f8f9fa',
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e0e0e0',
  paddingHorizontal: 12,
  marginBottom: 15,
  height: 45,
},
searchIcon: {
  marginRight: 8,
},
searchInput: {
  flex: 1,
  fontSize: 14,
  color: '#2c3e50',
  paddingVertical: 10,
},
clearSearchButton: {
  padding: 4,
  marginLeft: 8,
},
viewDetailsButton: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 4,
},
viewDetailsText: {
  fontSize: 12,
  color: '#e16e2b',
  fontWeight: '600',
},
});

export default FeedbackScreen;