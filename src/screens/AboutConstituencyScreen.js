import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';

const AboutConstituencyScreen = ({ regdMobileNo = '7702000725' }) => {
  const [constituencyData, setConstituencyData] = useState(null);
  const [assemblyConstituencies, setAssemblyConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConstituencyData();
  }, []);

  const fetchConstituencyData = async () => {
    try {
      ConstituencyLoggingService.constInfo('🚀 === INITIALIZING ABOUT CONSTITUENCY SCREEN ===');
      
      setLoading(true);
      setError(null);
      
      // Fetch constituency profile data
      const profileResponse = await fetch(`http://192.168.1.107:5000/api/constituencyprofile/${regdMobileNo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin_user',
        },
      });
      
      if (!profileResponse.ok) {
        throw new Error(`Failed to fetch constituency profile: ${profileResponse.status}`);
      }
      
      const profileData = await profileResponse.json();
      setConstituencyData(profileData);
      
      // Fetch assembly constituencies data
      const assemblyResponse = await fetch(`http://192.168.1.107:5000/api/assemblyconstituencies/${regdMobileNo}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'admin_user',
        },
      });
      
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
        
        ConstituencyLoggingService.constInfo('✅ Assembly constituencies fetched', { count: constituencies.length });
        setAssemblyConstituencies(constituencies);
      } else {
        ConstituencyLoggingService.constWarn('⚠️ Assembly constituencies data not available', assemblyResult.message);
      }
      
    } catch (err) {
      ConstituencyLoggingService.constError('❌ Error fetching constituency data', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openLink = (url) => {
    if (url) {
      Linking.openURL(url).catch(err => {
        ConstituencyLoggingService.constError('Failed to open URL', err);
        Alert.alert('Error', 'Failed to open the link');
      });
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

  // Render functions
  const renderHeader = () => (
    <View style={styles.header}>
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
            activeOpacity={0.7}
          >
            <Icon name="edit" size={18} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.subtitle}>
        {`${constituencyData?.constituency_type || 'Lok Sabha'} Constituency`}
      </Text>

      {constituencyData?.reservation_status && (
        <View style={[styles.badge, { backgroundColor: '#27ae60', marginTop: 10 }]}>
          <Text style={styles.badgeText}>
            {constituencyData.reservation_status}
          </Text>
        </View>
      )}

      <View style={[styles.badge, { marginTop: 8 }]}>
        <Text style={styles.badgeText}>
          {constituencyData?.state || 'State'}
        </Text>
      </View>

      {/* User Role Indicator */}
      <View style={styles.roleIndicatorContainer}>
        <View style={[styles.roleIndicator, { backgroundColor: isAdmin ? '#f39c12' : '#3498db' }]}>
          <Icon name={isAdmin ? 'admin-panel-settings' : 'person'} size={12} color="#fff" />
          <Text style={styles.roleIndicatorText}>
            {isAdmin ? 'ADMIN MODE' : 'USER MODE'}
          </Text>
        </View>
        
        {isLoggedIn && (
          <View style={[styles.roleIndicator, { backgroundColor: '#27ae60', marginLeft: 8 }]}>
            <Icon name="verified-user" size={12} color="#fff" />
            <Text style={styles.roleIndicatorText}>LOGGED IN</Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderInfoCards = () => (
    <>
      {/* Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="place" size={20} color="#3498db" />
          <Text style={styles.cardTitle}>Overview</Text>
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
          <Icon name="account-balance" size={24} color="#e67e22" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Established</Text>
          <Text style={styles.infoValue}>
            {formatEstablishedYear(constituencyData?.established)}
          </Text>
          <Text style={styles.infoSubtext}>
            {constituencyData?.established ? 'After delimitation' : 'Historical'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Icon name="person" size={24} color="#9b59b6" style={styles.infoIcon} />
          <Text style={styles.infoLabel}>Current MP</Text>
          <Text style={styles.infoValue} numberOfLines={3}>
            {getCurrentMP()}
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
            <Icon name="map" size={24} color="#16a085" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.district}
            </Text>
          </View>
        )}
        
        {constituencyData?.assembly_segment_count && (
          <View style={styles.infoCard}>
            <Icon name="how-to-vote" size={24} color="#2980b9" style={styles.infoIcon} />
            <Text style={styles.infoLabel}>Assembly Constituencies</Text>
            <Text style={styles.infoValue} numberOfLines={2}>
              {constituencyData.assembly_segment_count}
            </Text>
            {constituencyData?.eci_url && (
              <TouchableOpacity 
                onPress={() => openLink(constituencyData.eci_url)}
                style={styles.eciUrlContainer}
              >
                <Text style={styles.eciUrlText} numberOfLines={1}>
                  View ECI Data
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </>
  );

  const renderElectionTable = () => {
    if (!constituencyData) return null;

    // Create election results table
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

    // Create basic election info
    const createBasicInfoTable = () => {
      const basicInfo = [];

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
      if (constituencyData.polling_station_count) {
        basicInfo.push({ label: 'Polling Stations', value: constituencyData.polling_station_count });
      }
      if (constituencyData.avg_no_electors_per_ps_data) {
        basicInfo.push({ label: 'Avg Electors per PS', value: constituencyData.avg_no_electors_per_ps_data });
      }

      return basicInfo;
    };

    const electorsTableData = createElectorsTable();
    const basicInfoData = createBasicInfoTable();

    return (
      <>
        {/* Basic Election Information */}
        {basicInfoData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>BASIC INFORMATION</Text>
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

        {/* Electors Table */}
        {electorsTableData.length > 0 && (
          <View style={styles.tableContainer}>
            <View style={styles.tableSubHeader}>
              <Text style={styles.tableSubHeaderText}>ELECTORS BREAKDOWN</Text>
            </View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, { flex: 1.5 }]}>CATEGORY</Text>
              <Text style={styles.tableHeaderText}>MEN</Text>
              <Text style={styles.tableHeaderText}>WOMEN</Text>
              <Text style={styles.tableHeaderText}>3RD GENDER</Text>
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
        {electorsTableData.length === 0 && basicInfoData.length === 0 && (
          <View style={styles.noDataContainer}>
            <Icon name="info" size={24} color="#95a5a6" />
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
          <Icon name="error" size={24} color="#e74c3c" />
          <Text style={styles.errorText}>Assembly constituency data not available</Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (assemblyConstituencies.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <Icon name="info" size={24} color="#95a5a6" />
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

  const renderGeographyCard = () => {
    if (!constituencyData?.geography) return null;
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="public" size={20} color="#27ae60" />
          <Text style={styles.cardTitle}>Geography</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.overviewText}>
            {constituencyData.geography}
          </Text>
        </View>
      </View>
    );
  };

  if (error && !constituencyData) {
    return (
      <View style={styles.fullErrorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchConstituencyData}>
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
  <Text style={styles.title}>
    {`${constituencyData?.const_no || ''}${constituencyData?.const_no ? ', ' : ''}${constituencyData?.const_name || 'Constituency Name'}`}
  </Text>

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
    );
  };

  const renderAssemblyEditForm = () => {
    const fields = [
      { key: 'ac_number', label: 'Assembly Constituency Number', required: true },
      { key: 'ac_name', label: 'Assembly Constituency Name', required: true },
      { key: 'district', label: 'District', required: true },
      { key: 'type', label: 'Type (SC/General)' }
    ];

    return (
      <View>
        {fields.map((field) => (
          <View key={field.key} style={styles.formGroup}>
            <Text style={[styles.formLabel, field.required && styles.requiredLabel]}>
              {field.label}{field.required && ' *'}
            </Text>
            <TextInput
              style={styles.formInput}
              value={editFormData[field.key] || ''}
              onChangeText={(text) => setEditFormData({ ...editFormData, [field.key]: text })}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              placeholderTextColor="#bdc3c7"
            />
          </View>
        ))}
      </View>
    );
  };

  const renderDeveloperInputModal = () => (
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
              <Icon name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.devModalBody}>
            <Icon name="developer-mode" size={48} color="#f39c12" style={styles.devIcon} />
            <Text style={styles.devModalDescription}>
              Enter developer code to enable admin features for testing:
            </Text>
            <TextInput
              style={styles.devInput}
              value={devInput}
              onChangeText={setDevInput}
              placeholder="Enter code..."
              placeholderTextColor="#bdc3c7"
              secureTextEntry={false}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.devModalFooter}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeDevInput}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={handleDevInputSubmit}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Main loading state
  if (loading && !constituencyData) {
    return (
      <View style={styles.fullLoadingContainer}>
        <ActivityIndicator size="large" color="#e16e2b" />
        <Text style={styles.fullLoadingText}>Loading constituency information...</Text>
        <Text style={styles.fullLoadingSubText}>
          {userRole === 'admin' ? 'Preparing admin features...' : 'Fetching data...'}
        </Text>
      </View>
    );
  }

  // Main error state
  if (error && !constituencyData) {
    return (
      <View style={styles.fullErrorContainer}>
        <Icon name="error" size={48} color="#e74c3c" />
        <Text style={styles.fullErrorTitle}>Unable to Load Data</Text>
        <Text style={styles.fullErrorText}>{error}</Text>
        <TouchableOpacity style={styles.fullRetryButton} onPress={initializeComponent}>
          <Icon name="refresh" size={16} color="#fff" />
          <Text style={styles.fullRetryButtonText}>Try Again</Text>
        </TouchableOpacity>
        
        {!regdMobileNo && (
          <TouchableOpacity 
            style={[styles.fullRetryButton, { backgroundColor: '#3498db', marginTop: 10 }]} 
            onPress={async () => {
              const mobile = await promptForMobileNumber();
              if (mobile) {
                setRegdMobileNo(mobile);
                await initializeComponent();
              }
            }}
          >
            <Icon name="phone" size={16} color="#fff" />
            <Text style={styles.fullRetryButtonText}>Enter Mobile Number</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#e16e2b']}
          tintColor="#e16e2b"
          title="Pull to refresh"
        />
      }
    >
      {renderHeader()}
      {renderInfoCards()}
      {renderGeographyCard()}

      {/* ECI Summary Data */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Icon name="how-to-vote" size={20} color="#e74c3c" />
          <Text style={styles.cardTitle}>ECI Summary Data</Text>
          {constituencyData?.eci_url && (
            <TouchableOpacity 
              onPress={() => openLink(constituencyData.eci_url)}
              style={styles.headerLinkButton}
              activeOpacity={0.7}
            >
              <Text style={styles.headerLinkText}>View ECI Data</Text>
              <Icon name="open-in-new" size={12} color="#fff" />
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
          <Icon name="ballot" size={20} color="#2980b9" />
          <Text style={styles.cardTitle}>Assembly Constituencies</Text>
          <View style={styles.assemblyCountBadge}>
            <Text style={styles.assemblyCountText}>{assemblyConstituencies.length}</Text>
          </View>
        </View>
        {renderAssemblySegments()}
      </View>

      {renderExternalLinks()}

      {/* Debug Info for Development */}
      {__DEV__ && (
        <View style={styles.debugCard}>
          <View style={styles.cardHeader}>
            <Icon name="bug-report" size={20} color="#95a5a6" />
            <Text style={styles.cardTitle}>Debug Info</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.debugText}>
              User Role: {userRole}{'\n'}
              Is Admin: {isAdmin ? 'Yes' : 'No'}{'\n'}
              Is Logged In: {isLoggedIn ? 'Yes' : 'No'}{'\n'}
              Mobile Number: {regdMobileNo || 'Not set'}{'\n'}
              Logged In Email: {loggedInEmail || 'Not set'}{'\n'}
              Owner Email: {ownerEmail || 'Not set'}
            </Text>
          </View>
        </View>
      )}

      {/* Footer spacing */}
      <View style={styles.footer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  // Full screen loading/error states
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
  },
  fullErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  fullErrorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fullRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fullRetryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
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
    fontSize: Math.min(24, width * 0.06),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginLeft: 8,
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
    minHeight: 140,
  },
  infoIcon: {
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

  // Header Link Button Styles - NEW
  headerLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerLinkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },

  // ECI URL Styles - NEW
  eciUrlContainer: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  assemblyCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
  },

  // Assembly Segments Styles (Updated)
  segmentCount: {
    fontSize: 12,
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
  totalRow: {
    backgroundColor: '#ecf0f1',
  },
  tableCellLeft: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tableCellRight: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'right',
  },
  tableCellCenter: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Assembly Segments Styles
  segmentsList: {
    padding: 15,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
  },
  segmentRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDistrict: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  scBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 3,
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
    marginTop: 8,
    marginBottom: 15,
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
    marginTop: 8,
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
  linkContent: {
    flex: 1,
    marginLeft: 12,
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
  requiredLabel: {
    color: '#e74c3c',
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
    alignItems: 'center',
  },
  devIcon: {
    marginBottom: 15,
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
    width: '100%',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },

  // Debug Card Styles
  debugCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    fontFamily: 'monospace',
  },

  // Footer
  footer: {
    height: 30,
  },
});

export default AboutConstituencyScreen;