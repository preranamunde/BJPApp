import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const { width } = Dimensions.get('window');

// API Configuration
const API_BASE_URL = 'http://192.168.1.107:5000';
const DEFAULT_MEMBER_ID = '7702000725'; // You can make this dynamic

const KnowYourLeaderScreen = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState('profile');
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleCheckLoading, setRoleCheckLoading] = useState(false);
  
  // Data states for Profile Tab
  const [memberData, setMemberData] = useState(null);
  const [socialMediaData, setSocialMediaData] = useState(null);
  const [personalData, setPersonalData] = useState(null);
  const [educationData, setEducationData] = useState(null);
  const [addressData, setAddressData] = useState(null);
  
  // Data state for Timeline Tab
  const [timelineData, setTimelineData] = useState(null);
  
  // Error states
  const [errors, setErrors] = useState({});

  useEffect(() => {
    initializeApp();
  }, []);

  // Check if user is admin - ENHANCED
  const checkAdminRole = async () => {
    try {
      const userRole = await EncryptedStorage.getItem('userRole');
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      const devMode = await EncryptedStorage.getItem('developerMode');
      
      // Check for developer mode first
      if (devMode === 'enabled') {
        setIsAdmin(true);
        return true;
      }

      if (userRole === 'admin') {
        setIsAdmin(true);
        return true;
      } else if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        if (parsedData.role === 'admin' || parsedData.userType === 'admin') {
          setIsAdmin(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  };

  // Developer mode functions - NEW
  const handleLeaderNamePress = () => {
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

  // Function to get member ID and role from EncryptedStorage
  const getMemberInfoFromStorage = async () => {
    try {
      console.log('🔍 Retrieving member info from EncryptedStorage...');
      
      // Get AppOwnerInfo for member ID and role
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        console.log('📱 AppOwnerInfo found:', Object.keys(parsedData));
        
        // Get member identifier
        const memberIdentifier = parsedData.mobile_no || 
                                parsedData.regdMobileNo || 
                                parsedData.mobile_number || 
                                parsedData.phone ||
                                parsedData.mobileNo ||
                                parsedData.member_id ||
                                parsedData.user_id;
        
        // Get user role
        const role = parsedData.role || parsedData.user_role || parsedData.userRole || 'user';
        
        console.log('✅ Member ID found:', memberIdentifier);
        console.log('👤 User Role found:', role);
        
        return {
          memberId: memberIdentifier || '7702000725',
          role: role.toLowerCase()
        };
      }
      
      // Fallback: Try to get from individual storage items
      const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                            await EncryptedStorage.getItem('MEMBER_ID') || 
                            '7702000725';
      
      const storedRole = await EncryptedStorage.getItem('USER_ROLE') || 'user';
      
      return {
        memberId: storedMemberId,
        role: storedRole.toLowerCase()
      };
      
    } catch (error) {
      console.error('❌ Error retrieving member info from storage:', error);
      return {
        memberId: '7702000725',
        role: 'user'
      };
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Get member info from storage
      const memberInfo = await getMemberInfoFromStorage();
      setMemberId(memberInfo.memberId);
      setUserRole(memberInfo.role);
      
      // Check admin role (including developer mode)
      const adminStatus = await checkAdminRole();
      setIsAdmin(adminStatus);
      
      console.log('📱 Using member ID:', memberInfo.memberId);
      console.log('👤 User role:', memberInfo.role);
      console.log('🔑 Is Admin:', adminStatus);
      
      // Load initial data
      await loadInitialData(memberInfo.memberId);
      
    } catch (error) {
      console.error('❌ App initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Using default settings.');
      await loadInitialData('7702000725');
    } finally {
      setLoading(false);
    }
  };

  // Enhanced admin role checking using App.js functions
  const checkAdminRole = async () => {
    try {
      setRoleCheckLoading(true);
      console.log('🔍 === CHECKING ADMIN ROLE IN CONSTITUENCY SCREEN ===');
      
      // Use the enhanced function from App.js
      const adminCheck = await checkIfCurrentUserIsAdmin();
      const currentRole = await getCurrentUserRole();
      
      console.log('👤 Current User Role Info:', currentRole);
      console.log('👑 Admin Check Result:', adminCheck);
      
      setAdminCheckResult(adminCheck);
      setIsAdmin(adminCheck.isAdmin);
      setUserRole(currentRole.userRole);
      setIsLoggedIn(currentRole.isLoggedIn);
      
      console.log('✅ Role check completed:', {
        isAdmin: adminCheck.isAdmin,
        userRole: currentRole.userRole,
        isLoggedIn: currentRole.isLoggedIn,
        reason: adminCheck.reason
      });
      
      return adminCheck.isAdmin;
      
    } catch (error) {
      console.error('❌ Error checking admin role:', error);
      setIsAdmin(false);
      setUserRole('user');
      setIsLoggedIn(false);
      return false;
    } finally {
      setRoleCheckLoading(false);
    }
  };

  // Developer mode functions (enhanced with better integration)
  const handleLeaderNamePress = () => {
    // If already admin, show admin info instead of dev mode
    if (isAdmin) {
      Alert.alert(
        '👑 Admin Status',
        `You are currently logged in as an administrator.\n\n` +
        `Reason: ${adminCheckResult?.reason || 'Owner privileges'}\n` +
        `User Role: ${userRole}\n` +
        `Logged In: ${isLoggedIn ? 'Yes' : 'No'}\n` +
        `Owner Email: ${adminCheckResult?.owner_emailid || 'Not available'}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setDevClickCount(prevCount => {
      const newCount = prevCount + 1;
      if (newCount >= 5) {
        Alert.alert(
          'Developer Mode',
          'Developer mode is deprecated. Please log in as the app owner to get admin privileges.',
          [
            { text: 'OK' },
            { text: 'Check Status', onPress: () => showCurrentStatus() }
          ]
        );
        return 0; // Reset count
      }
      return newCount;
    });
  };

  // Show current user status
  const showCurrentStatus = async () => {
    try {
      const currentRole = await getCurrentUserRole();
      const adminCheck = await checkIfCurrentUserIsAdmin();
      
      Alert.alert(
        '📊 Current User Status',
        `User Role: ${currentRole.userRole}\n` +
        `Is Admin: ${adminCheck.isAdmin ? 'Yes' : 'No'}\n` +
        `Is Logged In: ${currentRole.isLoggedIn ? 'Yes' : 'No'}\n` +
        `Logged In Email: ${currentRole.loggedin_email || 'None'}\n` +
        `Owner Email: ${currentRole.owner_emailid || 'Not available'}\n` +
        `App Bootstrapped: ${currentRole.isAppBootstrapped ? 'Yes' : 'No'}\n\n` +
        `${adminCheck.reason}`,
        [
          { text: 'OK' },
          { text: 'Refresh', onPress: () => checkAdminRole() }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to get current status: ' + error.message);
    }
  };

  const handleDevInputSubmit = async () => {
    Alert.alert(
      'Developer Mode Deprecated',
      'Please log in as the app owner to get admin privileges instead of using developer codes.',
      [{ text: 'OK' }]
    );
    setShowDevInput(false);
    setDevInput('');
  };

  const closeDevInput = () => {
    setShowDevInput(false);
    setDevInput('');
  };

  // Function to get member ID and role from EncryptedStorage (Enhanced)
  const getMemberInfoFromStorage = async () => {
    try {
      console.log('🔍 Retrieving member info from EncryptedStorage...');
      
      // Get AppOwnerInfo for member ID and role
      const appOwnerInfo = await EncryptedStorage.getItem('AppOwnerInfo');
      if (appOwnerInfo) {
        const parsedData = JSON.parse(appOwnerInfo);
        console.log('📱 AppOwnerInfo found:', Object.keys(parsedData));
        
        // Get member identifier
        const memberIdentifier = parsedData.mobile_no || 
                                parsedData.regdMobileNo || 
                                parsedData.mobile_number || 
                                parsedData.phone ||
                                parsedData.mobileNo ||
                                parsedData.member_id ||
                                parsedData.user_id;
        
        console.log('✅ Member ID found:', memberIdentifier);
        
        return {
          memberId: memberIdentifier || '7702000725'
        };
      }
      
      // Fallback: Try to get from individual storage items
      const storedMemberId = await EncryptedStorage.getItem('MOBILE_NUMBER') || 
                            await EncryptedStorage.getItem('OWNER_MOBILE') ||
                            await EncryptedStorage.getItem('MEMBER_ID') || 
                            '7702000725';
      
      return {
        memberId: storedMemberId
      };
      
    } catch (error) {
      console.error('❌ Error retrieving member info from storage:', error);
      return {
        memberId: '7702000725'
      };
    }
  };

  const initializeApp = async () => {
    try {
      setLoading(true);
      
      // Get member info from storage
      const memberInfo = await getMemberInfoFromStorage();
      setMemberId(memberInfo.memberId);
      
      // Check admin role using enhanced App.js functions
      const adminStatus = await checkAdminRole();
      
      console.log('📱 Using member ID:', memberInfo.memberId);
      console.log('🔑 Final Admin Status:', adminStatus);
      
      // Load initial data
      await loadInitialData(memberInfo.memberId);
      
    } catch (error) {
      console.error('❌ App initialization error:', error);
      Alert.alert('Initialization Error', 'Failed to initialize app. Using default settings.');
      await loadInitialData('7702000725');
    } finally {
      setLoading(false);
    }
  };

  // Individual API calls using ApiService and ConfigService (unchanged)
  const fetchMemberCoordinates = async (memberIdentifier) => {
    try {
      const baseUrl = await ConfigService.getBaseUrl();
      const endpoint = `${baseUrl}/api/coordinates/${memberIdentifier}`;
      const result = await ApiService.get(endpoint);
      
      return {
        success: result.success,
        data: result.success ? result.data : null,
        error: result.success ? null : result.error || result.message
      };
    } catch (error) {
      console.error('API Error (coordinates):', error);
      return { success: false, error: error.message };
    }
  };

  // Individual API calls
  const fetchMemberCoordinates = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/coordinates/${memberId}`, 'GET');
  };

  const fetchSocialMedia = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/socialmedia/${memberId}`, 'GET');
  };

  const fetchPersonalDetails = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/personaldetails/${memberId}`, 'GET');
  };

  const fetchEducationalDetails = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/edudata/${memberId}`, 'GET');
  };

  const fetchPermanentAddress = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/permaddress/${memberId}`, 'GET');
  };

  const fetchPresentAddress = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/preaddress/${memberId}`, 'GET');
  };

  // Timeline API - Now available!
  const fetchTimeline = async (memberId = DEFAULT_MEMBER_ID) => {
    return await makeApiCall(`api/leadertimeline/${memberId}`, 'GET');
  };

  const loadInitialData = async () => {
    setLoading(true);
    await loadProfileData();
    await loadTimelineData(); // Timeline API is now available
    setLoading(false);
  };

  const loadProfileData = async () => {
    try {
      const memberId = DEFAULT_MEMBER_ID; // You can make this dynamic

      // Fetch all profile data concurrently
      const [
        memberCoordinates,
        socialMedia,
        personalDetails,
        educationalDetails,
        permanentAddress,
        presentAddress
      ] = await Promise.all([
        fetchMemberCoordinates(memberIdentifier),
        fetchSocialMedia(memberIdentifier),
        fetchPersonalDetails(memberIdentifier),
        fetchEducationalDetails(memberIdentifier),
        fetchPermanentAddress(memberIdentifier),
        fetchPresentAddress(memberIdentifier)
      ]);

      // Set member data
      if (memberCoordinates.success && memberCoordinates.data.leader_coordinates) {
        setMemberData(memberCoordinates.data.leader_coordinates);
      } else {
        console.error('Failed to load member coordinates:', memberCoordinates.error);
      }

      // Set social media data
      if (socialMedia.success && socialMedia.data.social_media) {
        setSocialMediaData(socialMedia.data.social_media);
      } else {
        console.error('Failed to load social media:', socialMedia.error);
      }

      // Set personal data
      if (personalDetails.success && personalDetails.data.personal_details) {
        setPersonalData(personalDetails.data.personal_details);
      } else {
        console.error('Failed to load personal details:', personalDetails.error);
      }

      // Set education data
      if (educationalDetails.success && educationalDetails.data.leader_edu_data) {
        setEducationData(educationalDetails.data.leader_edu_data.edu_qual);
      } else {
        console.error('Failed to load educational details:', educationalDetails.error);
      }

      // Combine address data
      const addresses = {
        permanent: permanentAddress.success ? permanentAddress.data.perm_address : null,
        present: presentAddress.success ? presentAddress.data.present_address : null
      };
      setAddressData(addresses);

      // Set errors for debugging
      const apiErrors = {
        memberCoordinates: !memberCoordinates.success ? memberCoordinates.error : null,
        socialMedia: !socialMedia.success ? socialMedia.error : null,
        personalDetails: !personalDetails.success ? personalDetails.error : null,
        educationalDetails: !educationalDetails.success ? educationalDetails.error : null,
        permanentAddress: !permanentAddress.success ? permanentAddress.error : null,
        presentAddress: !presentAddress.success ? presentAddress.error : null,
      };
      setErrors(apiErrors);

      console.log('✅ Profile data loaded successfully');
    } catch (error) {
      console.error('Profile data loading error:', error);
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
    }
  };

  const loadTimelineData = async (memberIdentifier) => {
    try {
      console.log('📡 Loading timeline data for member:', memberIdentifier);
      const result = await fetchTimeline(memberIdentifier);
      
      if (result.success && result.data.timeline) {
        setTimelineData(result.data.timeline);
        console.log('✅ Timeline data loaded successfully:', result.data.timeline);
      } else {
        console.error('Failed to load timeline data:', result.error);
        setTimelineData([]);
      }
    } catch (error) {
      console.error('Timeline data loading error:', error);
      setTimelineData([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInitialData(); // Now includes timeline data
    setRefreshing(false);
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url);
    }
  };

  const formatPhoneNumber = (isd, std, number) => {
    if (!number) return null;
    return `${isd || ''} ${std || ''} ${number}`.trim();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingCard}>
          <ActivityIndicator size="large" color="#e16e2b" />
          <Text style={styles.loadingText}>Loading leader information...</Text>
          {roleCheckLoading && (
            <Text style={styles.loadingSubText}>Checking admin privileges...</Text>
          )}
        </View>
      </View>
    );
  }

  const renderModernHeader = () => {
    const profileImageUrl = memberData?.profile_image || 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180';
    
    return (
      <View style={styles.modernHeader}>
        {/* Background Pattern */}
        <View style={styles.headerPattern}>
          <View style={[styles.patternCircle, { top: -20, right: -30 }]} />
          <View style={[styles.patternCircle, { bottom: -40, left: -20 }]} />
        </View>
        
        {/* Header Content */}
        <View style={styles.headerContent}>
          <View style={styles.profileRow}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.avatarImage}
                onError={() => console.log('Failed to load profile image')}
              />
              <View style={styles.onlineIndicator} />
            </View>
            
            <View style={styles.basicInfo}>
              <View style={styles.nameRow}>
                <TouchableOpacity
                  style={styles.nameContainer}
                  onPress={handleLeaderNamePress}
                  activeOpacity={0.8}
                >
                  <Text style={styles.leaderName}>
                    {memberData ? 
                      `${memberData.title || ''} ${memberData.member_name || ''}`.trim() : 
                      'Loading...'
                    }
                  </Text>
                </TouchableOpacity>
                {renderEditButton('coordinates', memberData)}
              </View>
              <Text style={styles.designation}>Member of Parliament</Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationText}>
                  {memberData ? 
                    `${memberData.constituency || ''}, ${memberData.state || ''}`.replace(', ,', ',').trim() : 
                    'Loading...'
                  }
                </Text>
              </View>
              
              {/* Enhanced User Status Display */}
              <View style={styles.userStatusRow}>
                <Text style={styles.userStatusText}>
                  Role: {userRole} {isAdmin && '👑'} | {isLoggedIn ? 'Logged In' : 'Guest'}
                </Text>
              </View>
            </View>
          </View>
          
          {memberData?.party && (
            <View style={styles.partyContainer}>
              <Text style={styles.partyName}>{memberData.party}</Text>
            </View>
          )}
        </View>
        
        {/* Quick Actions Row */}
        <View style={styles.quickActionsRow}>
          {memberData?.email_id && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`mailto:${memberData.email_id}`)}
            >
              <Text style={styles.quickActionIcon}>✉️</Text>
            </TouchableOpacity>
          )}
          
          {addressData?.present?.mobile_number1 && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`tel:${addressData.present.isd_code}${addressData.present.mobile_number1}`)}
            >
              <Text style={styles.quickActionIcon}>📞</Text>
            </TouchableOpacity>
          )}
          
          {addressData?.present?.mobile_number1 && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(`https://wa.me/${addressData.present.isd_code.replace('+', '')}${addressData.present.mobile_number1}`)}
            >
              <Text style={styles.quickActionIcon}>💬</Text>
            </TouchableOpacity>
          )}
          
          {memberData?.digital_sansad_url && (
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => openLink(memberData.digital_sansad_url)}
            >
              <Text style={styles.quickActionIcon}>🏛️</Text>
            </TouchableOpacity>
          )}

          {/* Admin Status Quick Action */}
          <TouchableOpacity 
            style={[styles.quickAction, isAdmin && styles.quickActionAdmin]}
            onPress={showCurrentStatus}
          >
            <Text style={styles.quickActionIcon}>{isAdmin ? '👑' : '👤'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSegmentedControl = () => (
    <View style={styles.segmentedContainer}>
      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'profile' && styles.activeSegment
          ]}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[
            styles.segmentText,
            activeTab === 'profile' && styles.activeSegmentText
          ]}>
            Profile Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.segmentButton,
            activeTab === 'timeline' && styles.activeSegment
          ]}
          onPress={() => setActiveTab('timeline')}
        >
          <Text style={[
            styles.segmentText,
            activeTab === 'timeline' && styles.activeSegmentText
          ]}>
            Career Timeline
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Admin Status Indicator */}
      {isAdmin && (
        <View style={styles.adminIndicator}>
          <Text style={styles.adminIndicatorText}>
            👑 Admin Mode - Edit capabilities enabled
          </Text>
        </View>
      )}
    </View>
  );

  const renderInfoCard = (title, icon, children, backgroundColor = '#ffffff', editType = null, editData = null) => (
    <View style={[styles.infoCard, { backgroundColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <View style={styles.cardHeaderRight}>
          <View style={styles.cardAccent} />
          {editType && editData && renderEditButton(editType, editData)}
        </View>
      </View>
      <View style={styles.cardBody}>
        {children}
      </View>
    </View>
  );

  const renderPersonalInfo = () => {
    if (!personalData) return null;

    return renderInfoCard('Personal Information', '👤',
      <View style={styles.infoRows}>
        {personalData.birth_place && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Birthplace</Text>
            <Text style={styles.infoValue}>{personalData.birth_place}</Text>
          </View>
        )}
        {personalData.dob && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>{personalData.dob}</Text>
          </View>
        )}
        {personalData.father_name && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Father's Name</Text>
            <Text style={styles.infoValue}>{personalData.father_name}</Text>
          </View>
        )}
        {personalData.mother_name && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mother's Name</Text>
            <Text style={styles.infoValue}>{personalData.mother_name}</Text>
          </View>
        )}
        {personalData.profession && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Profession</Text>
            <Text style={styles.infoValue}>{personalData.profession}</Text>
          </View>
        )}
      </View>,
      '#ffffff',
      'personal',
      personalData
    );
  };

  const renderEducationInfo = () => {
    if (!educationData || !Array.isArray(educationData)) return null;

    return renderInfoCard('Educational Qualifications', '🎓',
      <View style={styles.educationList}>
        {educationData.map((edu, index) => (
          <View key={index} style={styles.educationItem}>
            <View style={styles.educationLeft}>
              <View style={styles.educationNumber}>
                <Text style={styles.educationNumberText}>{index + 1}</Text>
              </View>
            </View>
            <View style={styles.educationRight}>
              <Text style={styles.educationDegree}>{edu.degree}</Text>
              <Text style={styles.educationInstitute}>
                {edu.college}{edu.university ? `, ${edu.university}` : ''}
              </Text>
              {edu.place && (
                <Text style={styles.educationPlace}>📍 {edu.place}</Text>
              )}
            </View>
          </View>
        ))}
      </View>,
      '#ffffff',
      'education',
      { edu_qual: educationData }
    );
  };

  const renderContactInfo = () => {
    if (!addressData) return null;

    return renderInfoCard('Contact Information', '📞',
      <View style={styles.contactSections}>
        {/* Permanent Address */}
        {addressData.permanent && (
          <View style={styles.contactSection}>
            <View style={styles.contactSectionHeader}>
              <Text style={styles.contactSectionTitle}>🏠 Permanent Address</Text>
              {renderEditButton('permanent_address', addressData.permanent)}
            </View>
            <Text style={styles.addressLine}>
              {[
                addressData.permanent.address1,
                addressData.permanent.address2,
                addressData.permanent.address3
              ].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addressLine}>
              {addressData.permanent.state} - {addressData.permanent.pincode}
            </Text>
            
            <View style={styles.contactButtons}>
              {addressData.permanent.tel_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => openLink(`tel:${formatPhoneNumber(
                    addressData.permanent.isd_code,
                    addressData.permanent.std_code,
                    addressData.permanent.tel_number1
                  )}`)}
                >
                  <Text style={styles.contactBtnText}>Call Landline</Text>
                </TouchableOpacity>
              )}
              {addressData.permanent.mobile_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => openLink(`tel:${addressData.permanent.isd_code}${addressData.permanent.mobile_number1}`)}
                >
                  <Text style={styles.contactBtnText}>Call Mobile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Present Address */}
        {addressData.present && (
          <View style={styles.contactSection}>
            <View style={styles.contactSectionHeader}>
              <Text style={styles.contactSectionTitle}>🏢 Present Address</Text>
              {renderEditButton('present_address', addressData.present)}
            </View>
            <Text style={styles.addressLine}>
              {[
                addressData.present.address1,
                addressData.present.address2,
                addressData.present.address3
              ].filter(Boolean).join(', ')}
            </Text>
            <Text style={styles.addressLine}>
              {addressData.present.state} - {addressData.present.pincode}
            </Text>
            
            <View style={styles.contactButtons}>
              {addressData.present.tel_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => openLink(`tel:${formatPhoneNumber(
                    addressData.present.isd_code,
                    addressData.present.std_code,
                    addressData.present.tel_number1
                  )}`)}
                >
                  <Text style={styles.contactBtnText}>Call Office</Text>
                </TouchableOpacity>
              )}
              {addressData.present.mobile_number1 && (
                <TouchableOpacity 
                  style={styles.contactBtn}
                  onPress={() => openLink(`tel:${addressData.present.isd_code}${addressData.present.mobile_number1}`)}
                >
                  <Text style={styles.contactBtnText}>Call Mobile</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderSocialMedia = () => {
    if (!socialMediaData) return null;

    const socialPlatforms = [
      { key: 'facebook', icon: '📘', name: 'Facebook' },
      { key: 'twitter', icon: '🐦', name: 'Twitter/X' },
      { key: 'linkedin', icon: '💼', name: 'LinkedIn' },
      { key: 'instagram', icon: '📸', name: 'Instagram' }
    ];

    const activePlatforms = socialPlatforms.filter(platform => 
      socialMediaData[platform.key] && socialMediaData[platform.key].trim() !== ''
    );

    if (activePlatforms.length === 0) return null;

    return renderInfoCard('Social Media Presence', '🌐',
      <View style={styles.socialGrid}>
        {activePlatforms.map((platform, index) => (
          <TouchableOpacity
            key={index}
            style={styles.socialItem}
            onPress={() => openLink(socialMediaData[platform.key])}
          >
            <Text style={styles.socialIcon}>{platform.icon}</Text>
            <View style={styles.socialInfo}>
              <Text style={styles.socialPlatform}>{platform.name}</Text>
              <Text style={styles.socialHandle}>
                {socialMediaData[platform.key].replace(/^https?:\/\/(www\.)?/, '')}
              </Text>
            </View>
            <Text style={styles.socialArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>,
      '#ffffff',
      'social',
      socialMediaData
    );
  };

  const renderTimeline = () => {
    console.log('Rendering timeline with data:', timelineData);
    
    if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
      return renderInfoCard('Career Timeline', '📅',
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateText}>No timeline data available</Text>
          {isAdmin && (
            <Text style={styles.emptyStateSubText}>
              As an admin, you can add timeline entries via API
            </Text>
          )}
        </View>
      );
    }

    return renderInfoCard('Career Timeline', '📅',
      <View style={styles.timelineContainer}>
        {timelineData.map((item, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineItemLeft}>
              <View style={styles.timelineDateContainer}>
                <Text style={styles.timelineDate}>{item.date || 'N/A'}</Text>
              </View>
              <View style={styles.timelineConnector}>
                <View style={styles.timelineDot} />
                {index < timelineData.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
            </View>
            
            <View style={styles.timelineItemRight}>
              <View style={styles.timelineContentCard}>
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>
                    {item.title || 'Position'}
                  </Text>
                  {renderEditButton('timeline', item)}
                </View>
                <Text style={styles.timelineDetails}>
                  {item.title_details || 'No details available'}
                </Text>
                {item.additional_info && (
                  <Text style={styles.timelineAdditionalInfo}>
                    {item.additional_info}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
      </View>,
      '#ffffff',
      'timeline',
      timelineData
    );
  };

  const renderContent = () => {
    if (activeTab === 'profile') {
      return (
        <>
          {renderPersonalInfo()}
          {renderEducationInfo()}
          {renderContactInfo()}
          {renderSocialMedia()}
        </>
      );
    } else {
      return renderTimeline();
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
          title={isAdmin ? "Refreshing (Admin Mode)" : "Refreshing..."}
        />
      }
    >
      {renderModernHeader()}
      {renderSegmentedControl()}
      
      <View style={styles.contentArea}>
        {renderContent()}
        
        {/* Debug Info for Development */}
        {__DEV__ && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugTitle}>🔧 Debug Info (Dev Mode)</Text>
            <Text style={styles.debugText}>
              Member ID: {memberId}{'\n'}
              User Role: {userRole}{'\n'}
              Is Admin: {isAdmin ? 'Yes' : 'No'}{'\n'}
              Is Logged In: {isLoggedIn ? 'Yes' : 'No'}{'\n'}
              Reason: {adminCheckResult?.reason || 'Not checked'}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.bottomSpacing} />
      
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
    backgroundColor: '#f0f2f5',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  loadingSubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },

  // Modern Header
  modernHeader: {
    backgroundColor: '#e16e2b',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  patternCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  headerContent: {
    zIndex: 1,
  },
  
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  
  basicInfo: {
    flex: 1,
    paddingTop: 5,
  },
  
  leaderName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  
  designation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  locationIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  
  locationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },

  // Enhanced User Status Row
  userStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  userStatusText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
  },
  
  partyContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  
  partyName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  
  quickAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  quickActionAdmin: {
    backgroundColor: 'rgba(255,215,0,0.3)',
  },
  
  quickActionIcon: {
    fontSize: 20,
  },

  // Edit Button
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  
  editButtonText: {
    fontSize: 16,
  },

  // Developer Modal Styles - NEW
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
  devModalCloseButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  devModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  devCancelButton: {
    backgroundColor: '#95a5a6',
  },
  devCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devSaveButton: {
    backgroundColor: '#27ae60',
  },
  devSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Enhanced Edit Button
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  editButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  
  editButtonText: {
    fontSize: 16,
  },

  // Developer Modal Styles (updated)
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
  devModalCloseButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devModalBody: {
    padding: 20,
  },
  devModalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    textAlign: 'left',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  devModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  devCancelButton: {
    backgroundColor: '#95a5a6',
  },
  devCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devSaveButton: {
    backgroundColor: '#27ae60',
  },
  devSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Segmented Control with Admin Indicator
  segmentedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 21,
  },
  
  activeSegment: {
    backgroundColor: '#e16e2b',
  },
  
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  activeSegmentText: {
    color: '#ffffff',
  },

  adminIndicator: {
    marginTop: 10,
    backgroundColor: 'rgba(255,215,0,0.1)',
    padding: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },

  adminIndicatorText: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
  },

  // Content Area
  contentArea: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  // Info Cards (unchanged styles continue...)
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cardIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cardAccent: {
    width: 4,
    height: 30,
    backgroundColor: '#e16e2b',
    borderRadius: 2,
  },
  
  cardBody: {
    padding: 20,
  },

  // Info Rows
  infoRows: {
    gap: 12,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  // Education
  educationList: {
    gap: 16,
  },
  
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  educationLeft: {
    marginRight: 15,
    alignItems: 'center',
  },
  
  educationNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e16e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  educationNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  educationRight: {
    flex: 1,
  },
  
  educationDegree: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  
  educationInstitute: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  
  educationPlace: {
    fontSize: 12,
    color: '#95a5a6',
  },

  // Contact Sections
  contactSections: {
    gap: 20,
  },
  
  contactSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  
  contactSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  contactSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  addressLine: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
    lineHeight: 20,
  },
  
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  
  contactBtn: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  
  contactBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Social Media
  socialGrid: {
    gap: 12,
  },
  
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  
  socialIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  
  socialInfo: {
    flex: 1,
  },
  
  socialPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  
  socialHandle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  
  socialArrow: {
    fontSize: 18,
    color: '#e16e2b',
    fontWeight: 'bold',
  },

  // Timeline
  timelineContainer: {
    paddingVertical: 10,
  },
  
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  
  timelineItemLeft: {
    alignItems: 'center',
    marginRight: 15,
    minWidth: 80,
  },
  
  timelineDateContainer: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
    minWidth: 70,
  },
  
  timelineDate: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  timelineConnector: {
    alignItems: 'center',
    flex: 1,
  },
  
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e16e2b',
    marginBottom: 5,
  },
  
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    minHeight: 30,
  },
  
  timelineItemRight: {
    flex: 1,
    paddingTop: 5,
  },
  
  timelineContentCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },

  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 22,
    flex: 1,
  },
  
  timelineDetails: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },

  timelineAdditionalInfo: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Enhanced Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyStateSubText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Enhanced Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  editModalContent: {
    flex: 1,
  },

  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  editModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalCloseText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },

  editModalTitleContainer: {
    alignItems: 'center',
  },

  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  editModalSubtitle: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 2,
  },

  editModalSaveButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  editModalBody: {
    flex: 1,
    padding: 20,
  },

  editFormContainer: {
    gap: 20,
  },

  editInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },

  editInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#495057',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },

  // Debug Container
  debugContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },

  debugText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },

  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  editModalContent: {
    flex: 1,
  },

  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  editModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalCloseText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },

  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  editModalSaveButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  editModalBody: {
    flex: 1,
    padding: 20,
  },

  editFormContainer: {
    gap: 20,
  },

  editInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },

  editInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#495057',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 30,
  },
});

export default KnowYourLeaderScreen;