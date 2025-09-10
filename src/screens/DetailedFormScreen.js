import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView,
  TouchableOpacity, Alert, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';

// Simple Dropdown Component - No Modal needed to avoid conflicts
const CustomPicker = ({ selectedValue, onValueChange, options, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <View style={style}>
      <TouchableOpacity 
        style={styles.pickerButton}
        onPress={() => setIsOpen(!isOpen)}
      >
        <Text style={styles.pickerButtonText}>{selectedValue}</Text>
        <Text style={[styles.pickerArrow, isOpen && styles.pickerArrowOpen]}>▼</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View style={styles.dropdownContainer}>
          {options.map((option, index) => (
            <TouchableOpacity
              key={`${option}-${index}`}
              style={styles.dropdownOption}
              onPress={() => {
                onValueChange(option);
                setIsOpen(false);
              }}
            >
              <Text style={[
                styles.dropdownOptionText,
                selectedValue === option && styles.selectedDropdownText
              ]}>
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

// Reuse your auth header function
const getAuthHeaders = async (requestType = null) => {
  try {
    const accessToken = await AsyncStorage.getItem('userAccessToken') ||
                        await AsyncStorage.getItem('jwt_token') ||
                        await EncryptedStorage.getItem('ACCESS_TOKEN');
    const appKey = await EncryptedStorage.getItem('APP_KEY');

    if (!accessToken) throw new Error('Access token not found');
    if (!appKey) throw new Error('App key not found');

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'x-app-key': appKey,
    };

    if (requestType) {
      headers['x-request-type'] = requestType;
    }

    return headers;
  } catch (error) {
    throw error;
  }
};

const DetailedFormScreen = ({ route, navigation }) => {
  const { regnNo, userEmail, leaderMobile, requestType, type } = route.params;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [data, setData] = useState(null);
  const [userRole, setUserRole] = useState('user'); // Add user role state

  const [requestStatus, setRequestStatus] = useState('Open');
  const [reviewComments, setReviewComments] = useState('');
  const [updatedBy, setUpdatedBy] = useState('');
  
  // Default status options as fallback - ensure it's always an array
  const defaultStatusOptions = ['Open', 'In Progress', 'Resolved', 'Cancelled', 'Rejected'];
  const [availableStatuses, setAvailableStatuses] = useState(defaultStatusOptions);

  // Add function to check user role
  const checkUserRole = async () => {
    try {
      const role = await EncryptedStorage.getItem('USER_ROLE') || 'user';
      setUserRole(role);
      console.log('DetailedFormScreen - Current user role:', role);
      return role;
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole('user');
      return 'user';
    }
  };

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        setLoading(true);
        
        // Check user role first
        await checkUserRole();
        
        const currentRequestType = requestType || type || 'Grievance';
        
        console.log('Fetching details for:', {
          regnNo,
          userEmail,
          leaderMobile,
          requestType: currentRequestType
        });

        const headers = await getAuthHeaders(currentRequestType);
        const baseUrl = await ConfigService.getBaseUrl();
        
        // FIXED: Use the correct endpoint structure from Postman
        let apiEndpoint;
        if (currentRequestType === 'APPOINTMENT') {
          apiEndpoint = '/api/appointments/search';
        } else {
          // For Appeal, Grievance, Complaints - all use grievances endpoint
          apiEndpoint = '/api/grievances/search';
        }
        
        // FIXED: Use the exact query parameter format from Postman
        const encodedMobile = encodeURIComponent(leaderMobile);
        const encodedEmail = encodeURIComponent(userEmail);
        const encodedRegnNo = encodeURIComponent(regnNo);
        
        const url = `${baseUrl}${apiEndpoint}?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&regn_no=${encodedRegnNo}`;
        
        console.log('API Call URL:', url);
        console.log('Headers:', headers);
        
        const response = await fetch(url, { 
          method: 'GET', 
          headers 
        });
        
        console.log('Response Status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch details: ${response.status} - ${errorText}`);
        }
        
        const responseData = await response.json();
        console.log('API Response Data:', responseData);
        
        let itemData = null;
        
        // Handle different possible response structures
        if (Array.isArray(responseData)) {
          // If response is directly an array
          itemData = responseData.find(item => 
            (item.regn_no && item.regn_no === regnNo) || 
            (item.registration_number && item.registration_number === regnNo) ||
            (item.id && item.id.toString() === regnNo)
          );
          
          // If not found by regn_no, try with the first item if there's only one
          if (!itemData && responseData.length === 1) {
            itemData = responseData[0];
          }
        } else if (responseData.data && Array.isArray(responseData.data)) {
          // If response has data array
          itemData = responseData.data.find(item => 
            (item.regn_no && item.regn_no === regnNo) || 
            (item.registration_number && item.registration_number === regnNo) ||
            (item.id && item.id.toString() === regnNo)
          );
          
          if (!itemData && responseData.data.length === 1) {
            itemData = responseData.data[0];
          }
        } else if (responseData.regn_no === regnNo || responseData.registration_number === regnNo) {
          // If response is directly the item
          itemData = responseData;
        } else if (responseData.results && Array.isArray(responseData.results)) {
          // If response has results array
          itemData = responseData.results.find(item => 
            (item.regn_no && item.regn_no === regnNo) || 
            (item.registration_number && item.registration_number === regnNo) ||
            (item.id && item.id.toString() === regnNo)
          );
          
          if (!itemData && responseData.results.length === 1) {
            itemData = responseData.results[0];
          }
        }
        
        if (itemData) {
          setData(itemData);
          
          // Set form fields with existing data
          setRequestStatus(itemData.status || 'Open');
          setReviewComments(itemData.action_taken_comments || itemData.review_comments || '');
          setUpdatedBy(itemData.updated_by || '');
          
          // If API provides available status options, use them
          if (Array.isArray(itemData.available_statuses) && itemData.available_statuses.length > 0) {
            setAvailableStatuses(itemData.available_statuses);
          } else if (Array.isArray(itemData.status_options) && itemData.status_options.length > 0) {
            setAvailableStatuses(itemData.status_options);
          }
          // Otherwise, keep the default status options
          
          console.log('Item found and set:', itemData);
        } else {
          console.log('No matching item found for regn_no:', regnNo);
          console.log('Available items:', responseData);
          setData(null);
        }
        
      } catch (err) {
        console.error('Error fetching details:', err);
        Alert.alert(
          'Error', 
          `Failed to load details: ${err.message}`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [regnNo, userEmail, leaderMobile, requestType, type]);

 const handleSave = async () => {
  if (!data) return;

  try {
    setUpdating(true);

    const body = {
      status: requestStatus,
      action_taken_comments: reviewComments,
      updated_by: updatedBy,
    };

    console.log('Updating with data:', body);

    const currentRequestType = requestType || type || 'Grievance';
    const headers = await getAuthHeaders(currentRequestType);
    const baseUrl = await ConfigService.getBaseUrl();
    
    // Use the correct endpoint structure for updates
    let apiEndpoint;
    if (currentRequestType === 'APPOINTMENT') {
      apiEndpoint = '/api/appointments';  // Remove /search for updates
    } else {
      apiEndpoint = '/api/grievances';    // Remove /search for updates
    }
    
    // Use query parameters for the update endpoint (same as Postman)
    const encodedMobile = encodeURIComponent(leaderMobile);
    const encodedEmail = encodeURIComponent(userEmail);
    const encodedRegnNo = encodeURIComponent(regnNo);
    
    // FIXED: Use the base endpoint with query parameters (not /search)
    const url = `${baseUrl}${apiEndpoint}/?leader_regd_mobile_no=${encodedMobile}&user_email_id=${encodedEmail}&regn_no=${encodedRegnNo}`;

    console.log('Update URL:', url);
    console.log('Update Headers:', headers);
    console.log('Update Body:', JSON.stringify(body));

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    });

    console.log('Update Response Status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Update Error Response:', errorText);
      throw new Error(`Update failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log('Update Success Response:', responseData);

    Alert.alert('Success', `${currentRequestType} updated successfully`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  } catch (error) {
    console.error('Error updating:', error);
    Alert.alert('Error', `Failed to update: ${error.message}`);
  } finally {
    setUpdating(false);
  }
};

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noDataTitle}>No Data Found</Text>
        <Text style={styles.noDataText}>
          No data available for registration number: {regnNo}
        </Text>
        <Text style={styles.noDataSubText}>
          The item might have been deleted or the registration number is incorrect.
        </Text>
        <TouchableOpacity 
          style={styles.goBackButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.goBackText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {(requestType || type || 'Item').toUpperCase()} DETAILS
        </Text>
        <Text style={styles.headerSubtitle}>Registration No: {data.regn_no || data.registration_number || data.id || regnNo}</Text>
      </View>

      {/* Non-editable fields */}
      <Field label="Registration No." value={data.regn_no || data.registration_number || data.id || regnNo} />
      <Field label="Registration Date" value={data.created_at ? new Date(data.created_at).toLocaleDateString() : 'N/A'} />
      <Field label="Applicant's Mobile No." value={data.applicant_mobile || data.mobile} />
      <Field label="Applicant's Name" value={data.applicant_name || data.name} />
      <Field label="Father/Husband's Name" value={data.fh_name || data.father_husband_name} />
      <Field label="Address" value={data.address} />
      <Field label="Pincode" value={data.pincode} />
      <Field label="District" value={data.district} />
      <Field label="State" value={data.state} />
      
      {/* Show appropriate description field based on type */}
      {(requestType || type) === 'APPOINTMENT' ? (
        <>
          <Field label="Meeting Purpose" value={data.meeting_purpose || data.purpose} multiline />
          <Field label="Requested Meeting Date" value={data.req_meeting_date || data.requested_date} />
        </>
      ) : (
        <Field label="Description" value={data.description || data.purpose} multiline />
      )}

      {/* Current Status Display */}
      <Field label="Current Status" value={data.status || 'Pending'} />
      
      {/* Existing Comments Display */}
      {(data.action_taken_comments || data.review_comments) && (
        <Field label="Previous Comments" value={data.action_taken_comments || data.review_comments} multiline />
      )}

      {/* Device IP Display */}
      {data.device_ip_number && (
        <Field label="Device IP" value={data.device_ip_number} />
      )}

      {/* UPDATED: Only show editable fields for admin users */}
      {userRole === 'admin' && (
        <View style={styles.editableSection}>
          <Text style={styles.editableSectionTitle}>Update Status</Text>
          
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Request Status</Text>
            <CustomPicker
              selectedValue={requestStatus}
              onValueChange={setRequestStatus}
              options={Array.isArray(availableStatuses) && availableStatuses.length > 0 ? availableStatuses : defaultStatusOptions}
              style={styles.pickerWrapper}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Review Comments</Text>
            <TextInput
              value={reviewComments}
              onChangeText={setReviewComments}
              multiline
              style={styles.textArea}
              placeholder="Enter review comments"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Updated By</Text>
            <TextInput
              value={updatedBy}
              onChangeText={setUpdatedBy}
              style={styles.input}
              placeholder="Name of person updating"
            />
          </View>
        </View>
      )}

      {/* Show different buttons based on role */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>
            {userRole === 'admin' ? 'Cancel' : 'Back'}
          </Text>
        </TouchableOpacity>

        {userRole === 'admin' && (
          <TouchableOpacity
            style={[styles.saveButton, updating && styles.disabledButton]}
            onPress={handleSave}
            disabled={updating}
          >
            {updating ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.saveButtonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const Field = ({ label, value, multiline = false }) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[styles.nonEditable, multiline && styles.multilineField]}>
      {value || 'N/A'}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fef6f2' 
  },
  contentContainer: { 
    padding: 20 
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  header: {
    backgroundColor: '#FF6B35',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  noDataTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  noDataSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  goBackButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  goBackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fieldContainer: { 
    marginBottom: 15 
  },
  label: { 
    fontWeight: 'bold', 
    fontSize: 15, 
    color: '#333', 
    marginBottom: 6 
  },
  nonEditable: {
    fontSize: 16,
    backgroundColor: '#e7e7e7',
    color: '#555',
    padding: 12,
    borderRadius: 10,
    minHeight: 45,
  },
  multilineField: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editableSection: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 15,
    marginTop: 20,
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B35',
  },
  editableSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerWrapper: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  // Custom Picker Styles
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#333',
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
    transform: [{ rotate: '0deg' }],
  },
  pickerArrowOpen: {
    transform: [{ rotate: '180deg' }],
  },
  dropdownContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: '#fff',
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedDropdownText: {
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  textArea: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#333',
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 14,
    borderRadius: 15,
    alignItems: 'center',
    flex: 1,
  },
  disabledButton: { 
    opacity: 0.6 
  },
  cancelButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});

export default DetailedFormScreen;