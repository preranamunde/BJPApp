// ✅ FIXED VERSION - FeedbackDetailsScreen.js
// Key fix: Correctly handle the API response structure where data is an object, not nested

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';
import ApiService from '../services/ApiService';

const FeedbackDetailsScreen = ({ route, navigation }) => {
  const { feedbackId, ownerMobile, userEmail } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [feedbackData, setFeedbackData] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    fetchFeedbackDetails();
  }, []);

 const fetchFeedbackDetails = async () => {
    try {
      console.log('📥 === FETCHING FEEDBACK DETAILS ===');
      console.log('Feedback ID:', feedbackId);
      console.log('Owner Mobile:', ownerMobile);
      console.log('User Email:', userEmail);

      const baseUrl = await ConfigService.getBaseUrl();
      const searchUrl = `${baseUrl}/api/userfeedback/search`;
      
      const queryParams = `leader_regd_mobile_no=${ownerMobile}&user_email_id=${userEmail}&uf_case_no=${feedbackId}`;
      
      console.log('🔗 Full URL:', `${searchUrl}?${queryParams}`);

      const result = await ApiService.authGet(`${searchUrl}?${queryParams}`);

      console.log('📥 Full API Response:', JSON.stringify(result, null, 2));
      console.log('📥 API Response Status:', result.success);
      console.log('📥 API Response Status Code:', result.status);

      if (!result) {
        throw new Error('No response from server');
      }

      if (!result.success) {
        console.error('❌ API returned error:', result.error);
        console.error('❌ API message:', result.message);
        throw new Error(result.message || result.error || 'Failed to fetch feedback');
      }

      // Check both result.data and result.data.data
      let feedbackItem = null;
      
      if (result.data) {
        console.log('📋 result.data type:', typeof result.data);
        console.log('📋 result.data keys:', Object.keys(result.data));
        console.log('📋 result.data content:', JSON.stringify(result.data, null, 2));
        
        // Check if data is nested
        if (result.data.data) {
          console.log('📋 Found nested data');
          feedbackItem = result.data.data;
        } else {
          console.log('📋 Using direct data');
          feedbackItem = result.data;
        }
      }

      if (!feedbackItem) {
        throw new Error('No feedback data in response');
      }

      console.log('📋 Feedback item type:', typeof feedbackItem);
      console.log('📋 Feedback item keys:', Object.keys(feedbackItem));
      console.log('📋 Feedback item:', JSON.stringify(feedbackItem, null, 2));

      // Validate the feedback item has required fields
      if (!feedbackItem.uf_case_no && !feedbackItem._id) {
        console.error('❌ Invalid data structure');
        console.error('❌ Available fields:', Object.keys(feedbackItem));
        throw new Error(`Invalid feedback data. Fields: ${Object.keys(feedbackItem).join(', ')}`);
      }

      console.log('✅ Processing feedback data');

      // Map the data
      const mappedData = {
        caseNo: feedbackItem.uf_case_no || feedbackId,
        type: feedbackItem.uf_type || 'feedback',
        subject: feedbackItem.uf_subject || 'No subject',
        description: feedbackItem.uf_desc || 'No description',
        status: getStatusLabel(feedbackItem.uf_status),
        createdAt: feedbackItem.createdAt ? new Date(feedbackItem.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        updatedAt: feedbackItem.updatedAt ? new Date(feedbackItem.updatedAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'N/A',
        actionComments: feedbackItem.uf_action_taken_comments || 'No action taken yet',
        updatedBy: feedbackItem.updated_by || 'N/A',
        attachmentUrl: feedbackItem.uf_attachment_url || null,
      };

      console.log('✅ Mapped Data:', JSON.stringify(mappedData, null, 2));

      setFeedbackData(mappedData);

      // Load image if exists
      if (feedbackItem.uf_attachment_url) {
        console.log('📎 Loading attachment:', feedbackItem.uf_attachment_url);
        loadAttachmentImage(feedbackItem.uf_attachment_url);
      }

      console.log('✅ Feedback details loaded successfully');

    } catch (error) {
      console.error('❌ Error fetching feedback details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      Alert.alert(
        'Error', 
        `Failed to load feedback details\n\nError: ${error.message}`,
        [
          { 
            text: 'Go Back', 
            onPress: () => navigation.goBack() 
          },
          {
            text: 'Retry',
            onPress: () => {
              setLoading(true);
              fetchFeedbackDetails();
            }
          }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAttachmentImage = async (attachmentUrl) => {
    setImageLoading(true);
    
    try {
      let mediaUrl = attachmentUrl;
      
      // Fix localhost URLs
      if (mediaUrl.includes('localhost:5000') || mediaUrl.includes('localhost:')) {
        const baseUrl = await ConfigService.getBaseUrl();
        mediaUrl = mediaUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
        console.log('🔄 Fixed localhost URL:', mediaUrl);
      }
      
      // Fix ngrok URLs
      if (mediaUrl.includes('ngrok-free.app:')) {
        mediaUrl = mediaUrl.replace(/:(\d+)\//, '/');
        console.log('🔄 Fixed ngrok URL:', mediaUrl);
      }
      
      console.log('📥 Loading attachment from:', mediaUrl);
      
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

      console.log('📥 Image response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      const reader = new FileReader();
      
      reader.onloadend = () => {
        setImageUri(reader.result);
        setImageLoading(false);
        console.log('✅ Attachment loaded successfully');
      };
      
      reader.onerror = (error) => {
        console.error('❌ FileReader error:', error);
        setImageLoading(false);
      };
      
      reader.readAsDataURL(blob);
      
    } catch (error) {
      console.error('❌ Error loading attachment:', error);
      console.error('❌ Error message:', error.message);
      setImageLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusStr = String(status || '').toLowerCase();
    switch(statusStr) {
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Resolved':
        return '#27ae60';
      case 'In Progress':
        return '#f39c12';
      case 'Reported':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!feedbackData) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={60} color="#e74c3c" />
        <Text style={styles.errorText}>Failed to load feedback details</Text>
        <Text style={styles.errorSubtext}>
          Case No: {feedbackId}
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            setLoading(true);
            fetchFeedbackDetails();
          }}
          activeOpacity={0.7}
        >
          <Icon name="refresh" size={20} color="#fff" />
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            console.log('🔙 Back button pressed');
            navigation.goBack();
          }}
          style={styles.backIconButton}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Feedback Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Case Number & Type Card */}
        <View style={styles.topCard}>
          <View style={styles.caseNoSection}>
            <Text style={styles.caseNoLabel}>Case No</Text>
            <Text style={styles.caseNoValue}>{feedbackData.caseNo}</Text>
          </View>
          
          <View style={[
            styles.typeBadge, 
            feedbackData.type === 'bug' && styles.bugBadge
          ]}>
            <Icon 
              name={feedbackData.type === 'feedback' ? 'feedback' : 'report-problem'} 
              size={18} 
              color="#fff" 
            />
            <Text style={styles.typeText}>
              {feedbackData.type === 'feedback' ? 'Feedback' : 'Bug Report'}
            </Text>
          </View>
        </View>

        {/* Status Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Status</Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(feedbackData.status) }
          ]}>
            <Icon name="info-outline" size={18} color="#fff" />
            <Text style={styles.statusText}>{feedbackData.status}</Text>
          </View>
        </View>

        {/* Subject Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Subject</Text>
          <Text style={styles.subjectText}>{feedbackData.subject}</Text>
        </View>

        {/* Description Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Description</Text>
          <Text style={styles.descriptionText}>{feedbackData.description}</Text>
        </View>

        {/* Action Comments Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Action Taken</Text>
          <View style={styles.actionCommentsBox}>
            <Icon name="comment" size={20} color="#27ae60" />
            <Text style={styles.actionCommentsText}>{feedbackData.actionComments}</Text>
          </View>
        </View>

        {/* Updated By Card */}
        {feedbackData.updatedBy && feedbackData.updatedBy !== 'N/A' && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Updated By</Text>
            <View style={styles.updatedByBox}>
              <Icon name="person" size={20} color="#e16e2b" />
              <Text style={styles.updatedByText}>{feedbackData.updatedBy}</Text>
            </View>
          </View>
        )}

        {/* Attachment Card */}
        {feedbackData.attachmentUrl && (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Attachment</Text>
            {imageLoading ? (
              <View style={styles.imageLoadingContainer}>
                <ActivityIndicator size="large" color="#e16e2b" />
                <Text style={styles.imageLoadingText}>Loading image...</Text>
              </View>
            ) : imageUri ? (
              <TouchableOpacity activeOpacity={0.9}>
                <Image 
                  source={{ uri: imageUri }}
                  style={styles.attachmentImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.imageErrorContainer}>
                <Icon name="broken-image" size={50} color="#bdc3c7" />
                <Text style={styles.imageErrorText}>Failed to load image</Text>
              </View>
            )}
          </View>
        )}

        {/* Timestamps Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Timeline</Text>
          
          <View style={styles.timestampRow}>
            <View style={styles.timestampIcon}>
              <Icon name="access-time" size={18} color="#e16e2b" />
            </View>
            <View style={styles.timestampContent}>
              <Text style={styles.timestampLabel}>Created</Text>
              <Text style={styles.timestampValue}>{feedbackData.createdAt}</Text>
            </View>
          </View>
          
          <View style={[styles.timestampRow, { marginBottom: 0 }]}>
            <View style={styles.timestampIcon}>
              <Icon name="update" size={18} color="#e16e2b" />
            </View>
            <View style={styles.timestampContent}>
              <Text style={styles.timestampLabel}>Last Updated</Text>
              <Text style={styles.timestampValue}>{feedbackData.updatedAt}</Text>
            </View>
          </View>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingVertical: 16,
    backgroundColor: '#e16e2b',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  backIconButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    marginRight: 40,
  },
  headerRight: {
    width: 24,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    marginTop: 20,
    fontSize: 18,
    color: '#e74c3c',
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#3498db',
    borderRadius: 8,
    elevation: 3,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    marginTop: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: '#e16e2b',
    borderRadius: 8,
    elevation: 3,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  caseNoSection: {
    flex: 1,
  },
  caseNoLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 6,
    fontWeight: '600',
  },
  caseNoValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e16e2b',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  bugBadge: {
    backgroundColor: '#e74c3c',
  },
  typeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  statusText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  subjectText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 28,
  },
  descriptionText: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 26,
  },
  actionCommentsBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#e8f8f5',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  actionCommentsText: {
    flex: 1,
    fontSize: 15,
    color: '#27ae60',
    lineHeight: 22,
    fontWeight: '500',
  },
  updatedByBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff5f0',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  updatedByText: {
    fontSize: 15,
    color: '#e16e2b',
    fontWeight: '600',
  },
  imageLoadingContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imageLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  attachmentImage: {
    width: '100%',
    height: 280,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  imageErrorContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imageErrorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  timestampIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  timestampContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timestampLabel: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '600',
    marginBottom: 4,
  },
  timestampValue: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '500',
  },
});

export default FeedbackDetailsScreen;