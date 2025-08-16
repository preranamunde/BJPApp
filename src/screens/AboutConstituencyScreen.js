import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity, ActivityIndicator } from 'react-native';

const AboutConstituencyScreen = ({ regdMobileNo = '7702000725' }) => {
  const [constituencyData, setConstituencyData] = useState(null);
  const [assemblyConstituencies, setAssemblyConstituencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConstituencyData();
  }, []);

  const fetchConstituencyData = async () => {
    try {
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
      
      if (assemblyResponse.ok) {
        const assemblyData = await assemblyResponse.json();
        
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
    } finally {
      setLoading(false);
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
              </View>
            </View>
          </View>
        ))}
      </View>
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

  // Header Link Button Styles - NEW
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

  // ECI URL Styles - NEW
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

  // Assembly Segments Styles (Updated)
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