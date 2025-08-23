import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService'; // Add this import
import ApiService from '../services/ApiService'; // Add this import

const AboutConstituencyScreen = () => {
  const [constituencyData, setConstituencyData] = useState(null);
  const [assemblyConstituencies, setAssemblyConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [regdMobileNo, setRegdMobileNo] = useState(null);
  
  // Admin states
  const [isAdmin, setIsAdmin] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingConstituency, setEditingConstituency] = useState(false);
  const [editingAssembly, setEditingAssembly] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editingAssemblyId, setEditingAssemblyId] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Developer mode states
  const [showDevInput, setShowDevInput] = useState(false);
  const [devInput, setDevInput] = useState('');
  const [devClickCount, setDevClickCount] = useState(0);

  useEffect(() => {
    initializeData();
    checkAdminRole();
  }, []);

  // Check if user is admin
  const checkAdminRole = async () => {
    try {
      const userRole = await EncryptedStorage.getItem('userRole');
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      const devMode = await EncryptedStorage.getItem('developerMode');
      
      // Check for developer mode first
      if (devMode === 'enabled') {
        setIsAdmin(true);
        return;
      }

      if (userRole === 'admin') {
        setIsAdmin(true);
      } else if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        if (parsedData.role === 'admin' || parsedData.userType === 'admin') {
          setIsAdmin(true);
        }
      }
    } catch (error) {
      console.error('Error checking admin role:', error);
    }
  };

  // Developer mode functions
  const handleTitlePress = () => {
    setDevClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        setShowDevInput(true);
        return 0; // Reset count
      }
      return newCount;
    });
  };

  const handleDevInputSubmit = async () => {
    if (devInput.toLowerCase() === 'admin') {
      try {
        await EncryptedStorage.setItem('developerMode', 'enabled');
        setIsAdmin(true);
        setShowDevInput(false);
        setDevInput('');
        Alert.alert('Developer Mode', 'Admin features enabled for testing!');
      } catch (error) {
        console.error('Error enabling developer mode:', error);
        Alert.alert('Error', 'Failed to enable developer mode');
      }
    } else {
      Alert.alert('Invalid Input', 'Please enter the correct developer code');
      setDevInput('');
    }
  };

  const closeDevInput = () => {
    setShowDevInput(false);
    setDevInput('');
  };

  // Function to get mobile number from EncryptedStorage
  const getMobileNumberFromStorage = async () => {
    try {
      console.log('🔍 Retrieving mobile number from EncryptedStorage...');
      
      // First try to get from AppOwnerInfo
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        console.log('📱 AppOwnerInfo found:', Object.keys(parsedData));
        
        // Check various possible keys for mobile number
        const mobileNumber = parsedData.mobile_no || 
                           parsedData.regdMobileNo || 
                           parsedData.mobile_number || 
                           parsedData.phone ||
                           parsedData.mobileNo;
        
        if (mobileNumber) {
          console.log('✅ Mobile number found in AppOwnerInfo:', mobileNumber);
          return mobileNumber;
        }
      }
      
      // If not found in AppOwnerInfo, try direct storage
      const storedMobile = await EncryptedStorage.getItem('MOBILE_NUMBER');
      if (storedMobile) {
        console.log('✅ Mobile number found in direct storage:', storedMobile);
        return storedMobile;
      }
      
      // Fallback to default if nothing found
      console.log('⚠️ No mobile number found in storage, using default');
      return '7702000725'; // Keep as fallback
      
    } catch (error) {
      console.error('❌ Error retrieving mobile number from storage:', error);
      return '7702000725'; // Fallback on error
    }
  };

  const initializeData = async () => {
    try {
      setLoading(true);
      
      // Get mobile number from storage
      const mobileNo = await getMobileNumberFromStorage();
      setRegdMobileNo(mobileNo);
      
      console.log('📱 Using mobile number:', mobileNo);
      
      // Fetch data with the retrieved mobile number
      await fetchConstituencyData(mobileNo);
      
    } catch (error) {
      console.error('❌ Initialization error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchConstituencyData = async (mobileNo) => {
    try {
      setError(null);
      
      console.log('📡 Fetching constituency data for mobile:', mobileNo);
      
      // Get base URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      console.log('🌐 Using base URL:', baseUrl);
      
      // Fetch constituency profile data using ApiService
      const profileResult = await ApiService.get(
        `${baseUrl}/api/constituencyprofile/${mobileNo}`,
        {
          'x-user-id': 'admin_user',
        }
      );
      
      if (!profileResult.success) {
        throw new Error(`Failed to fetch constituency profile: ${profileResult.message}`);
      }
      
      setConstituencyData(profileResult.data);
      
      // Fetch assembly constituencies data using ApiService
      const assemblyResult = await ApiService.get(
        `${baseUrl}/api/assemblyconstituencies/${mobileNo}`,
        {
          'x-user-id': 'admin_user',
        }
      );
      
      if (assemblyResult.success) {
        const assemblyData = assemblyResult.data;
        
        let constituencies = [];
        if (assemblyData && assemblyData.assembly_constituencies && Array.isArray(assemblyData.assembly_constituencies.assembly_const)) {
          constituencies = assemblyData.assembly_constituencies.assembly_const;
        } else if (assemblyData && Array.isArray(assemblyData.assembly_const)) {
          constituencies = assemblyData.assembly_const;
        } else if (Array.isArray(assemblyData)) {
          constituencies = assemblyData;
        }
        
        setAssemblyConstituencies(constituencies);
      }
      
    } catch (err) {
      console.error('Error fetching constituency data:', err);
      setError(err.message);
    }
  };

  // Admin Edit Functions
  const openEditConstituencyForm = () => {
    if (!constituencyData) return;
    
    setEditFormData({
      const_name: constituencyData.const_name || '',
      const_no: constituencyData.const_no || '',
      state: constituencyData.state || '',
      district: constituencyData.district || '',
      constituency_type: constituencyData.constituency_type || '',
      reservation_status: constituencyData.reservation_status || '',
      established: constituencyData.established || '',
      sitting_member: constituencyData.sitting_member || '',
      member_party: constituencyData.member_party || '',
      overview: constituencyData.overview || '',
      geography: constituencyData.geography || '',
      eci_url: constituencyData.eci_url || '',
      assembly_segment_count: constituencyData.assembly_segment_count || '',
      election_year: constituencyData.election_year || '',
      electon_header: constituencyData.electon_header || '',
      total_no_voters_data: constituencyData.total_no_voters_data || '',
      voter_trunout_ratio_data: constituencyData.voter_trunout_ratio_data || '',
      polling_station_count: constituencyData.polling_station_count || '',
      avg_no_electors_per_ps_data: constituencyData.avg_no_electors_per_ps_data || '',
      electors_general_male_data: constituencyData.electors_general_male_data || '',
      electors_general_female_data: constituencyData.electors_general_female_data || '',
      electors_general_tg_data: constituencyData.electors_general_tg_data || '',
      electors_general_total_data: constituencyData.electors_general_total_data || '',
      electors_overseas_male_data: constituencyData.electors_overseas_male_data || '',
      electors_overseas_female_data: constituencyData.electors_overseas_female_data || '',
      electors_overseas_tg_data: constituencyData.electors_overseas_tg_data || '',
      electors_overseas_total_data: constituencyData.electors_overseas_total_data || '',
      electors_service_male_data: constituencyData.electors_service_male_data || '',
      electors_service_female_data: constituencyData.electors_service_female_data || '',
      electors_service_tg_data: constituencyData.electors_service_tg_data || '',
      electors_service_total_data: constituencyData.electors_service_total_data || '',
      electors_total_male_data: constituencyData.electors_total_male_data || '',
      electors_total_female_data: constituencyData.electors_total_female_data || '',
      electors_total_tg_data: constituencyData.electors_total_tg_data || '',
      electors_grand_total_data: constituencyData.electors_grand_total_data || ''
    });
    
    setEditingConstituency(true);
    setEditingAssembly(false);
    setEditModalVisible(true);
  };

  const openEditAssemblyForm = (assembly) => {
    if (!assembly) return;
    
    setEditFormData({
      ac_number: assembly.ac_number || '',
      ac_name: assembly.ac_name || assembly.name || '',
      district: assembly.district || '',
      type: assembly.type || ''
    });
    
    setEditingAssemblyId(assembly._id || assembly.id);
    setEditingConstituency(false);
    setEditingAssembly(true);
    setEditModalVisible(true);
  };

  const handleUpdateConstituency = async () => {
    if (!regdMobileNo) {
      Alert.alert('Error', 'Mobile number not found. Please restart the app.');
      return;
    }
    
    setUpdateLoading(true);
    try {
      console.log('🔄 Updating constituency profile...');
      console.log('📱 Mobile Number:', regdMobileNo);
      
      // Clean the form data - remove empty strings and null values
      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });
      
      // Get base URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      
      // IMPORTANT: The backend expects "constitency_profile" (with typo), not "constituency_profile"
      // This matches your Postman collection structure
      const requestPayload = {
        constitency_profile: cleanedFormData  // Note: "constitency" with typo to match backend
      };
      
      console.log('🧹 Cleaned form data:', JSON.stringify(requestPayload, null, 2));
      console.log('🌐 API URL:', `${baseUrl}/api/constituencyprofile/${regdMobileNo}`);
      
      const result = await ApiService.put(
        `${baseUrl}/api/constituencyprofile/${regdMobileNo}`,
        requestPayload,
        {
          'x-user-id': 'admin_user', // This header is required based on your Postman collection
        }
      );
      
      console.log('📡 Response success:', result.success);
      console.log('📡 Response data:', result.data);
      
      if (!result.success) {
        throw new Error(`Failed to update constituency profile: ${result.message}`);
      }
      
      // Update local state with new data
      // The response might come back with the correct spelling, so handle both cases
      if (result.data && result.data.constituency_profile) {
        setConstituencyData(result.data.constituency_profile);
      } else if (result.data && result.data.constitency_profile) {
        setConstituencyData(result.data.constitency_profile);
      } else if (result.data) {
        setConstituencyData(result.data);
      }
      
      // Close modal first
      setEditModalVisible(false);
      
      // Refresh data from server to ensure sync
      console.log('🔄 Refreshing data from server...');
      await fetchConstituencyData(regdMobileNo);
      
      Alert.alert('Success', 'Constituency profile updated successfully!');
      console.log('✅ Update completed successfully');
      
    } catch (error) {
      console.error('❌ Error updating constituency profile:', error);
      console.error('❌ Error details:', error.message);
      Alert.alert('Error', `Failed to update constituency profile: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleUpdateAssembly = async () => {
    if (!regdMobileNo || !editingAssemblyId) {
      Alert.alert('Error', 'Missing required data. Please try again.');
      return;
    }
    
    setUpdateLoading(true);
    try {
      console.log('🔄 Updating assembly constituency...');
      console.log('📱 Mobile Number:', regdMobileNo);
      console.log('🆔 Assembly ID:', editingAssemblyId);
      console.log('📝 Form Data being sent:', JSON.stringify(editFormData, null, 2));
      
      // Clean the form data
      const cleanedFormData = {};
      Object.keys(editFormData).forEach(key => {
        const value = editFormData[key];
        if (value !== null && value !== undefined && value.toString().trim() !== '') {
          cleanedFormData[key] = value.toString().trim();
        }
      });
      
      // Find the assembly constituency to update in the current list
      const assemblyToUpdate = assemblyConstituencies.find(
        assembly => (assembly._id || assembly.id) === editingAssemblyId
      );
      
      if (!assemblyToUpdate) {
        throw new Error('Assembly constituency not found in current data');
      }
      
      // Create updated assembly constituencies array
      const updatedAssemblyConstituencies = assemblyConstituencies.map(assembly => {
        if ((assembly._id || assembly.id) === editingAssemblyId) {
          return {
            ...assembly,
            ac_number: cleanedFormData.ac_number || assembly.ac_number,
            ac_name: cleanedFormData.ac_name || assembly.ac_name,
            district: cleanedFormData.district || assembly.district,
            type: cleanedFormData.type || assembly.type || ''
          };
        }
        return assembly;
      });
      
      // Get base URL from ConfigService
      const baseUrl = await ConfigService.getBaseUrl();
      
      // Structure the payload according to your backend API
      // Based on the Postman collection, it expects "assembly_constituencies" wrapper
      const requestPayload = {
        assembly_constituencies: {
          narration: "Updated assembly constituencies",
          assembly_const_count: updatedAssemblyConstituencies.length,
          assembly_const: updatedAssemblyConstituencies.map(assembly => ({
            ac_number: parseInt(assembly.ac_number) || 0,
            ac_name: assembly.ac_name || '',
            district: assembly.district || '',
            ...(assembly.type && { type: assembly.type })
          }))
        }
      };
      
      console.log('🧹 Final payload:', JSON.stringify(requestPayload, null, 2));
      console.log('🌐 API URL:', `${baseUrl}/api/assemblyconstituencies/${regdMobileNo}`);
      
      const result = await ApiService.put(
        `${baseUrl}/api/assemblyconstituencies/${regdMobileNo}`,
        requestPayload,
        {
          'x-user-id': 'admin_user',
        }
      );
      
      console.log('📡 Response success:', result.success);
      console.log('📡 Response data:', result.data);
      
      if (!result.success) {
        throw new Error(`Failed to update assembly constituency: ${result.message}`);
      }
      
      // Close modal first
      setEditModalVisible(false);
      
      // Refresh assembly constituencies data from server
      console.log('🔄 Refreshing assembly data from server...');
      await fetchConstituencyData(regdMobileNo);
      
      Alert.alert('Success', 'Assembly constituency updated successfully!');
      console.log('✅ Assembly update completed successfully');
      
    } catch (error) {
      console.error('❌ Error updating assembly constituency:', error);
      console.error('❌ Error stack:', error.stack);
      Alert.alert('Error', `Failed to update assembly constituency: ${error.message}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleSubmitEdit = () => {
    if (editingConstituency) {
      handleUpdateConstituency();
    } else if (editingAssembly) {
      handleUpdateAssembly();
    }
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditingConstituency(false);
    setEditingAssembly(false);
    setEditFormData({});
    setEditingAssemblyId(null);
  };

  // Manual retry function that uses the stored mobile number
  const retryFetch = async () => {
    if (regdMobileNo) {
      setLoading(true);
      await fetchConstituencyData(regdMobileNo);
      setLoading(false);
    } else {
      // Re-initialize if mobile number is lost
      await initializeData();
    }
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatEstablishedYear = (established) => {
    if (!established) return 'N/A';
    return established.toString();
  };

  const getCurrentMP = () => {
    if (!constituencyData?.sitting_member) return 'N/A';
    return constituencyData.sitting_member;
  };

  const getMemberParty = () => {
    if (!constituencyData?.member_party) return '';
    return constituencyData.member_party.toUpperCase();
  };

  const getOverviewText = () => {
    // First check if overview exists and is not empty
    if (constituencyData?.overview && constituencyData.overview.trim() !== '') {
      return constituencyData.overview;
    }
    
    // If no overview, create a default one
    const constName = constituencyData?.const_name || 'This constituency';
    const state = constituencyData?.state || 'India';
    const established = constituencyData?.established || 'post-delimitation';
    const district = constituencyData?.district || 'the region';
    
    return `${constName} is a Lok Sabha constituency in ${state}. Created in ${established}, it covers major parts of ${district} district.`;
  };

  const renderElectionTable = () => {
    if (!constituencyData) return null;

    // Create election results table similar to PDF format
    const createElectorsTable = () => {
      const tableData = [];

      // Add General row if data exists
      if (constituencyData.electors_general_male_data || constituencyData.electors_general_female_data) {
        tableData.push({
          category: 'GENERAL',
          men: constituencyData.electors_general_male_data || '0',
          women: constituencyData.electors_general_female_data || '0',
          thirdGender: constituencyData.electors_general_tg_data || '0',
          total: constituencyData.electors_general_total_data || '0'
        });
      }

      // Add Overseas row if data exists
      if (constituencyData.electors_overseas_male_data || constituencyData.electors_overseas_female_data) {
        tableData.push({
          category: 'OVERSEAS',
          men: constituencyData.electors_overseas_male_data || '0',
          women: constituencyData.electors_overseas_female_data || '0',
          thirdGender: constituencyData.electors_overseas_tg_data || '0',
          total: constituencyData.electors_overseas_total_data || '0'
        });
      }

      // Add Service row if data exists
      if (constituencyData.electors_service_male_data || constituencyData.electors_service_female_data) {
        tableData.push({
          category: 'SERVICE',
          men: constituencyData.electors_service_male_data || '0',
          women: constituencyData.electors_service_female_data || '0',
          thirdGender: constituencyData.electors_service_tg_data || '0',
          total: constituencyData.electors_service_total_data || '0'
        });
      }

      // Add Total row if data exists
      if (constituencyData.electors_total_male_data || constituencyData.electors_total_female_data || constituencyData.electors_grand_total_data) {
        tableData.push({
          category: 'TOTAL',
          men: constituencyData.electors_total_male_data || '0',
          women: constituencyData.electors_total_female_data || '0',
          thirdGender: constituencyData.electors_total_tg_data || '0',
          total: constituencyData.electors_grand_total_data || '0'
        });
      }

      return tableData;
    };

    // Create polling stations table
    const createPollingStationsTable = () => {
      if (!constituencyData.polling_station_count && !constituencyData.avg_no_electors_per_ps_data) {
        return [];
      }

      return [{
        number: constituencyData.polling_station_count || 'N/A',
        avgElectors: constituencyData.avg_no_electors_per_ps_data || 'N/A'
      }];
    };

    // Create basic election info
    const createBasicInfoTable = () => {
      const basicInfo = [];

      // Add constituency number
      if (constituencyData.const_no) {
        basicInfo.push({ label: 'Constituency Number', value: constituencyData.const_no });
      }
      if (constituencyData.election_year) {
        basicInfo.push({ label: 'Election Year', value: constituencyData.election_year });
      }
      if (constituencyData.electon_header) {
        basicInfo.push({ label: 'Election', value: constituencyData.electon_header });
      }
      if (constituencyData.total_no_voters_data) {
        basicInfo.push({ label: 'Total Voters', value: constituencyData.total_no_voters_data });
      }
      if (constituencyData.voter_trunout_ratio_data) {
        basicInfo.push({ label: 'Voter Turnout', value: constituencyData.voter_trunout_ratio_data });
      }

      return basicInfo;
    };

    const electorsTableData = createElectorsTable();
    const pollingStationsData = createPollingStationsTable();
    const basicInfoData = createBasicInfoTable();

    return (
      <>
        {/* Basic Election Information */}
        {basicInfoData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>I. BASIC INFORMATION</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Parameter</Text>
              <Text style={styles.tableHeaderText}>Value</Text>
            </View>
            {basicInfoData.map((item, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={styles.tableCellLeft}>{item.label}</Text>
                <Text style={styles.tableCellRight}>{item.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Electors Table - Similar to PDF format */}
        {electorsTableData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>II. ELECTORS</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>CATEGORY</Text>
              <Text style={styles.tableHeaderText}>MEN</Text>
              <Text style={styles.tableHeaderText}>WOMEN</Text>
              <Text style={styles.tableHeaderText}>THIRD GENDER</Text>
              <Text style={styles.tableHeaderText}>TOTAL</Text>
            </View>
            {electorsTableData.map((item, index) => {
              const isTotalRow = item.category === 'TOTAL';
              return (
                <View
                  key={index}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.tableRowEven
                  ]}
                >
                  <Text
                    style={[
                      styles.tableCellLeft,
                      { flex: 1.5, fontWeight: isTotalRow ? 'bold' : 'normal' }
                    ]}
                  >
                    {item.category}
                  </Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.men}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.women}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.thirdGender}</Text>
                  <Text style={[styles.tableCellCenter, { fontWeight: isTotalRow ? 'bold' : 'normal' }]}>{item.total}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Polling Stations Table */}
        {pollingStationsData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>III. POLLING STATIONS</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>NUMBER</Text>
              <Text style={styles.tableHeaderText}>AVERAGE ELECTORS PER POLLING STATION</Text>
            </View>
            {pollingStationsData.map((item, index) => (
              <View key={index} style={[styles.tableRow, index % 2 === 0 && styles.tableRowEven]}>
                <Text style={styles.tableCellCenter}>{item.number}</Text>
                <Text style={styles.tableCellCenter}>{item.avgElectors}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Show message if no election data is available */}
        {electorsTableData.length === 0 && pollingStationsData.length === 0 && basicInfoData.length === 0 && (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No election information available</Text>
          </View>
        )}
      </>
    );
  };

  const renderAssemblySegments = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#3498db" />
          <Text style={styles.loadingText}>Loading assembly constituencies...</Text>
        </View>
      );
    }

    if (error && assemblyConstituencies.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Assembly constituency data not available</Text>
        </View>
      );
    }

    if (assemblyConstituencies.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No assembly constituencies found</Text>
        </View>
      );
    }

    return (
      <View style={styles.segmentsList}>
        {assemblyConstituencies.map((segment, index) => (
          <View key={segment._id || segment.id || index} style={styles.segmentItem}>
            <View style={styles.segmentNumber}>
              <Text style={styles.segmentNumberText}>{segment.ac_number || index + 1}</Text>
            </View>
            <View style={styles.segmentInfo}>
              <Text style={styles.segmentName}>
                {segment.ac_name || segment.name || 'Unknown'}
              </Text>
              <View style={styles.segmentRightSection}>
                {segment.district && (
                  <Text style={styles.segmentDistrict}>
                    {segment.district}
                  </Text>
                )}
                {segment.type === 'SC' && (
                  <View style={styles.scBadge}>
                    <Text style={styles.scBadgeText}>SC</Text>
                  </View>
                )}
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditAssemblyForm(segment)}
                  >
                    <Text style={styles.editButtonText}>✏️</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderEditModal = () => {
    return (
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingConstituency ? 'Edit Constituency Profile' : 'Edit Assembly Constituency'}
              </Text>
              <TouchableOpacity onPress={closeEditModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {editingConstituency ? renderConstituencyEditForm() : renderAssemblyEditForm()}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeEditModal}
                disabled={updateLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSubmitEdit}
                disabled={updateLoading}
              >
                {updateLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
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

  const renderConstituencyEditForm = () => {
    const fields = [
      { key: 'const_name', label: 'Constituency Name' },
      { key: 'const_no', label: 'Constituency Number' },
      { key: 'state', label: 'State' },
      { key: 'district', label: 'District' },
      { key: 'constituency_type', label: 'Constituency Type' },
      { key: 'reservation_status', label: 'Reservation Status' },
      { key: 'established', label: 'Established Year' },
      { key: 'sitting_member', label: 'Current MP' },
      { key: 'member_party', label: 'Member Party' },
      { key: 'overview', label: 'Overview', multiline: true },
      { key: 'geography', label: 'Geography', multiline: true },
      { key: 'eci_url', label: 'ECI URL' },
      { key: 'assembly_segment_count', label: 'Assembly Segment Count' },
      { key: 'election_year', label: 'Election Year' },
      { key: 'electon_header', label: 'Election Header' },
      { key: 'total_no_voters_data', label: 'Total Voters' },
      { key: 'voter_trunout_ratio_data', label: 'Voter Turnout Ratio' },
      { key: 'polling_station_count', label: 'Polling Station Count' },
      { key: 'avg_no_electors_per_ps_data', label: 'Avg Electors per PS' },
      { key: 'electors_general_male_data', label: 'General Male Electors' },
      { key: 'electors_general_female_data', label: 'General Female Electors' },
      { key: 'electors_general_tg_data', label: 'General Third Gender Electors' },
      { key: 'electors_general_total_data', label: 'General Total Electors' },
      { key: 'electors_overseas_male_data', label: 'Overseas Male Electors' },
      { key: 'electors_overseas_female_data', label: 'Overseas Female Electors' },
      { key: 'electors_overseas_tg_data', label: 'Overseas Third Gender Electors' },
      { key: 'electors_overseas_total_data', label: 'Overseas Total Electors' },
      { key: 'electors_service_male_data', label: 'Service Male Electors' },
      { key: 'electors_service_female_data', label: 'Service Female Electors' },
      { key: 'electors_service_tg_data', label: 'Service Third Gender Electors' },
      { key: 'electors_service_total_data', label: 'Service Total Electors' },
      { key: 'electors_total_male_data', label: 'Total Male Electors' },
      { key: 'electors_total_female_data', label: 'Total Female Electors' },
      { key: 'electors_total_tg_data', label: 'Total Third Gender Electors' },
      { key: 'electors_grand_total_data', label: 'Grand Total Electors' }
    ];

    return (
      <View>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGroup}>
            <Text style={styles.formLabel}>{field.label}</Text>
            <TextInput
              style={[styles.formInput, field.multiline && styles.textArea]}
              value={editFormData[field.key] || ''}
              onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 4 : 1}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </View>
        ))}
      </View>
    );
  };

  const renderAssemblyEditForm = () => {
    const fields = [
      { key: 'ac_number', label: 'Assembly Constituency Number' },
      { key: 'ac_name', label: 'Assembly Constituency Name' },
      { key: 'district', label: 'District' },
      { key: 'type', label: 'Type (SC/General)' }
    ];

    return (
      <View>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGroup}>
            <Text style={styles.formLabel}>{field.label}</Text>
            <TextInput
              style={styles.formInput}
              value={editFormData[field.key] || ''}
              onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
              placeholder={`Enter ${field.label.toLowerCase()}`}
            />
          </View>
        ))}
      </View>
    );
  };

  // Developer Input Modal
  const renderDeveloperInputModal = () => {
    return (
      <Modal
        visible={showDevInput}
        animationType="fade"
        transparent={true}
        onRequestClose={closeDevInput}
      >
        <View style={styles.devModalOverlay}>
          <View style={styles.devModalContent}>
            <View style={styles.devModalHeader}>
              <Text style={styles.devModalTitle}>Developer Access</Text>
              <TouchableOpacity onPress={closeDevInput} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.devModalBody}>
              <Text style={styles.devModalDescription}>
                Enter developer code to enable admin features for testing:
              </Text>
              <TextInput
                style={styles.devInput}
                value={devInput}
                onChangeText={setDevInput}
                placeholder="Enter code..."
                secureTextEntry={false}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.devModalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeDevInput}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleDevInputSubmit}
              >
                <Text style={styles.saveButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading && !constituencyData) {
    return (
      <View style={styles.fullLoadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.loadingText}>Loading constituency information...</Text>
      </View>
    );
  }

  if (error && !constituencyData) {
    return (
      <View style={styles.fullErrorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={retryFetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        {/* First Line: Constituency Number and Name */}
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.titleContainer}
            onPress={handleTitlePress}
            activeOpacity={0.8}
          >
            <Text style={styles.title}>
              {`${constituencyData?.const_no || ''}${constituencyData?.const_no ? ', ' : ''}${constituencyData?.const_name || 'Constituency Name'}`}
            </Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              style={styles.headerEditButton}
              onPress={openEditConstituencyForm}
            >
              <Text style={styles.headerEditButtonText}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Second Line: Constituency Type + "Constituency" */}
        <Text style={styles.subtitle}>
          {`${constituencyData?.constituency_type || 'Lok Sabha'} Constituency`}
        </Text>

        {/* Third Line: Reservation Status */}
        {constituencyData?.reservation_status && (
          <View style={[styles.badge, { backgroundColor: '#1ed02dff', marginTop: 10 }]}>
            <Text style={styles.badgeText}>
              {constituencyData.reservation_status}
            </Text>
          </View>
        )}

        {/* Fourth Line: State */}
        <View style={[styles.badge, { marginTop: 8 }]}>
          <Text style={styles.badgeText}>
            {constituencyData?.state || 'State'}
          </Text>
        </View>

        {/* Developer mode indicator */}
        {isAdmin && (
          <View style={[styles.badge, { backgroundColor: '#f39c12', marginTop: 8 }]}>
            <Text style={styles.badgeText}>ADMIN MODE</Text>
          </View>
        )}
      </View>

      {/* Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📍 Overview</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.overviewText}>
            {getOverviewText()}
          </Text>
        </View>
      </View>

      {/* Info Cards Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🏛️</Text>
          <Text style={styles.infoLabel}>Established</Text>
          <Text style={styles.infoValue}>
            {formatEstablishedYear(constituencyData?.established)}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.established ? 'After delimitation' : 'Historical'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>👨‍💼</Text>
          <Text style={styles.infoLabel}>Current MP</Text>
          <Text style={styles.infoValue} numberOfLines={3}>
            {constituencyData?.sitting_member || 'N/A'}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.sitting_member ? 
              `Member Of ${constituencyData?.constituency_type || 'Lok Sabha'}` : 
              ''}
          </Text>
          {constituencyData?.member_party && (
            <Text style={styles.infoSubtext}>
              {getMemberParty()}
            </Text>
          )}
        </View>
      </View>

      {/* Additional Info Cards */}
      <View style={styles.infoGrid}>
        {constituencyData?.district && (
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🗺️</Text>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.district}
            </Text>
            
          </View>
        )}
        
        {constituencyData?.assembly_segment_count && (
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🏷️</Text>
            <Text style={styles.infoLabel}>Assembly Constituencies</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.assembly_segment_count}
            </Text>
            {/* Display ECI URL below the count */}
            {constituencyData?.eci_url && (
              <TouchableOpacity 
                onPress={() => openLink(constituencyData.eci_url)}
                style={styles.eciUrlContainer}
              >
                <Text style={styles.eciUrlText} numberOfLines={1}>
                  {constituencyData.eci_url}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Geography Info Card - New Addition */}
      {constituencyData?.geography && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🌍 Geography</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.overviewText}>
              {constituencyData.geography}
            </Text>
          </View>
        </View>
      )}

      {/* ECI Summary Data */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🗳️ ECI Summary Data</Text>
          {constituencyData?.eci_url && (
            <TouchableOpacity 
              onPress={() => openLink(constituencyData.eci_url)}
              style={styles.headerLinkButton}
            >
              <Text style={styles.headerLinkText}>View ECI Data →</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.cardContent}>
          {renderElectionTable()}
        </View>
      </View>

      {/* Assembly Segments Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🗳️ Assembly Constituency</Text>
        </View>
        {renderAssemblySegments()}
      </View>

      {/* External Links Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔗 External Links</Text>
        </View>
        <View style={styles.linksContainer}>
          {constituencyData?.eci_url && (
            <TouchableOpacity 
              style={styles.linkButton}
              onPress={() => openLink(constituencyData.eci_url)}
            >
              <Text style={styles.linkIcon}>🏛️</Text>
              <View style={styles.linkContent}>
                <Text style={styles.linkTitle}>Election Commission</Text>
                <Text style={styles.linkDescription}>Official ECI information</Text>
              </View>
              <Text style={styles.linkArrow}>→</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink(`https://en.wikipedia.org/wiki/${(constituencyData?.const_name || '').replace(/ /g, '_')}_Lok_Sabha_constituency`)}
          >
            <Text style={styles.linkIcon}>🌐</Text>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Wikipedia</Text>
              <Text style={styles.linkDescription}>Detailed information and history</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink(`https://chanakyya.com/Parliament-Details/${(constituencyData?.const_name || '').replace(/ /g, '_')}`)}
          >
            <Text style={styles.linkIcon}>📊</Text>
            <View style={styles.linkContent}>
              <Text style={styles.linkTitle}>Chanakyya Election Data</Text>
              <Text style={styles.linkDescription}>Election statistics and analysis</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer spacing */}
      <View style={styles.footer} />

      {/* Edit Modal */}
      {renderEditModal()}

      {/* Developer Input Modal */}
      {renderDeveloperInputModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  // Full screen loading/error
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    marginTop: 5,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Admin Edit Buttons
  headerEditButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 35,
    height: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  headerEditButtonText: {
    fontSize: 16,
    color: '#fff',
  },
  editButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: '#fff',
  },

  // Developer Modal Styles
  devModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  devModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  devModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  devModalBody: {
    padding: 20,
  },
  devModalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  devInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    textAlign: 'center',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardContent: {
    padding: 15,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    textAlign: 'left',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
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
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Form Styles
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Table Styles
  tableContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  tableSubHeader: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableSubHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
  },
  tableHeaderText: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableRowEven: {
    backgroundColor: '#f8f9fa',
  },
  tableCellLeft: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tableCellRight: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#555',
    textAlign: 'right',
  },
  tableCellCenter: {
    flex: 1,
    padding: 12,
    fontSize: 14,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Info Grid Styles
  infoGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 120,
  },
  infoIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },

  // Header Link Button Styles
  headerLinkButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerLinkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // ECI URL Styles
  eciUrlContainer: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8f4f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  eciUrlText: {
    fontSize: 10,
    color: '#3498db',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },

  // Assembly Segments Styles
  segmentCount: {
    fontSize: 12,
    color: '#7f8c8d',
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  segmentsList: {
    padding: 15,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  segmentNumber: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  segmentNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentName: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
  },
  segmentRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  segmentDistrict: {
    fontSize: 13,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  scBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Loading and Error Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#7f8c8d',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  noDataText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Links Styles
  linksContainer: {
    padding: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  linkDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  linkArrow: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },

  // Footer
  footer: {
    height: 20,
  },
});

export default AboutConstituencyScreen;