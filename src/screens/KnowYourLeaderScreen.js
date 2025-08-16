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
  Dimensions
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
    loadInitialData();
  }, []);

  // Generic API call helper
  const makeApiCall = async (endpoint, method = 'GET', body = null) => {
    try {
      const config = {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (body && method !== 'GET') {
        config.body = JSON.stringify(body);
      }

      const response = await fetch(`${API_BASE_URL}/${endpoint}`, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
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
        fetchMemberCoordinates(memberId),
        fetchSocialMedia(memberId),
        fetchPersonalDetails(memberId),
        fetchEducationalDetails(memberId),
        fetchPermanentAddress(memberId),
        fetchPresentAddress(memberId)
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

      // Set education data - Fix: The API returns "leader_edu_data" not "edu_qual"
      if (educationalDetails.success && educationalDetails.data.leader_edu_data) {
        setEducationData(educationalDetails.data.leader_edu_data.edu_qual);
      } else {
        console.error('Failed to load educational details:', educationalDetails.error);
      }

      // Combine address data - Fix: API returns "perm_address" and "present_address"
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

      console.log('Profile data loaded successfully');
    } catch (error) {
      console.error('Profile data loading error:', error);
      Alert.alert('Network Error', 'Please check your internet connection and try again.');
    }
  };

  // Timeline data loading - Updated for actual API
  const loadTimelineData = async () => {
    try {
      const result = await fetchTimeline();
      
      if (result.success && result.data.timeline) {
        setTimelineData(result.data.timeline);
        console.log('Timeline data loaded successfully:', result.data.timeline);
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
              <Text style={styles.leaderName}>
                {memberData ? 
                  `${memberData.title || ''} ${memberData.member_name || ''}`.trim() : 
                  'Loading...'
                }
              </Text>
              <Text style={styles.designation}>Member of Parliament</Text>
              <View style={styles.locationRow}>
                <Text style={styles.locationText}>
                  {memberData ? 
                    `${memberData.constituency || ''}, ${memberData.state || ''}`.replace(', ,', ',').trim() : 
                    'Loading...'
                  }
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
    </View>
  );

  const renderInfoCard = (title, icon, children, backgroundColor = '#ffffff') => (
    <View style={[styles.infoCard, { backgroundColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <Text style={styles.cardIcon}>{icon}</Text>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <View style={styles.cardAccent} />
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
      </View>
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
      </View>
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
      </View>
    );
  };

  const renderTimeline = () => {
    console.log('Rendering timeline with data:', timelineData);
    
    if (!timelineData || !Array.isArray(timelineData) || timelineData.length === 0) {
      return renderInfoCard('Career Timeline', '📅',
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateText}>No timeline data available</Text>
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
                <Text style={styles.timelineTitle}>
                  {item.title || 'Position'}
                </Text>
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
      </View>
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
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {renderModernHeader()}
      {renderSegmentedControl()}
      
      <View style={styles.contentArea}>
        {renderContent()}
      </View>
      
      <View style={styles.bottomSpacing} />
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
  
  partyContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  
  partyLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 2,
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
  
  quickActionIcon: {
    fontSize: 20,
  },

  // Segmented Control
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

  // Content Area
  contentArea: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },

  // Info Cards
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

  // Timeline - Fixed Styles
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
  
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 6,
    lineHeight: 22,
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

  // Empty State
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
  },

  // Bottom Spacing
  bottomSpacing: {
    height: 30,
  },
});

export default KnowYourLeaderScreen;