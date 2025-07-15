import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';

const AboutConstituencyScreen = () => {
  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Paschim Champaran</Text>
        <Text style={styles.subtitle}>Lok Sabha Constituency</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Bihar</Text>
        </View>
      </View>

      {/* Overview Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📍 Overview</Text>
        </View>
        <Text style={styles.cardContent}>
          Paschim Champaran is one of the 40 Lok Sabha constituencies in Bihar. Created in 2008 post-delimitation, it covers major parts of West Champaran district.
        </Text>
      </View>

      {/* Info Cards Grid */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>🏛️</Text>
          <Text style={styles.infoLabel}>Established</Text>
          <Text style={styles.infoValue}>2008</Text>
          <Text style={styles.infoSubtext}>After delimitation</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>👨‍💼</Text>
          <Text style={styles.infoLabel}>Current MP</Text>
          <Text style={styles.infoValue}>Dr. Sanjay Jaiswal</Text>
          <Text style={styles.infoSubtext}>BJP</Text>
        </View>
      </View>

      {/* Assembly Segments Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🗳️ Assembly Segments</Text>
          <Text style={styles.segmentCount}>6 Segments</Text>
        </View>
        <View style={styles.segmentsList}>
          {[
            { name: 'Valmiki Nagar', type: 'General' },
            { name: 'Ramnagar', type: 'SC' },
            { name: 'Narkatiaganj', type: 'General' },
            { name: 'Bagaha', type: 'General' },
            { name: 'Lauria', type: 'General' },
            { name: 'Nautan', type: 'General' }
          ].map((segment, index) => (
            <View key={index} style={styles.segmentItem}>
              <View style={styles.segmentNumber}>
                <Text style={styles.segmentNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.segmentInfo}>
                <Text style={styles.segmentName}>{segment.name}</Text>
                {segment.type === 'SC' && (
                  <View style={styles.scBadge}>
                    <Text style={styles.scBadgeText}>SC</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* External Links Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔗 External Links</Text>
        </View>
        <View style={styles.linksContainer}>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink('https://en.wikipedia.org/wiki/Paschim_Champaran_Lok_Sabha_constituency')}
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
            onPress={() => openLink('https://chanakyya.com/Parliament-Details/Paschim_Champaran')}
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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#bdc3c7',
    marginTop: 5,
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
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  infoSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 2,
    textAlign: 'center',
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
    marginBottom: 12,
  },
  segmentNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    fontWeight: '500',
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
