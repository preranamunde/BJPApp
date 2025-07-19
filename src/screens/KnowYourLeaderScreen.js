import React from 'react';
import { View, Text, StyleSheet, ScrollView, Linking, Image, TouchableOpacity } from 'react-native';

const KnowYourLeaderScreen = () => {
  const openLink = (url) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>Dr. Sanjay Jaiswal</Text>
        <Text style={styles.degree}>MBBS, MD</Text>
        <View style={styles.positionCard}>
          <Text style={styles.position}>Member of Parliament</Text>
          <Text style={styles.constituency}>Paschim Champaran (Lok Sabha), Bihar</Text>
        </View>
      </View>

      {/* Current Positions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🏛️ Current Positions</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.positionItem}>
            <Text style={styles.positionBullet}>•</Text>
            <Text style={styles.positionText}>Chief Whip BJP (Lok Sabha)</Text>
          </View>
          <View style={styles.positionItem}>
            <Text style={styles.positionBullet}>•</Text>
            <Text style={styles.positionText}>Chairperson, Estimates Committee</Text>
          </View>
          <View style={styles.positionItem}>
            <Text style={styles.positionBullet}>•</Text>
            <Text style={styles.positionText}>Ex State President - BJP Bihar</Text>
          </View>
        </View>
      </View>

      {/* Personal Information */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👤 Personal Information</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Born:</Text>
            <Text style={styles.infoValue}>29 November 1965</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Birthplace:</Text>
            <Text style={styles.infoValue}>Bettiah, West Champaran, Bihar</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Father:</Text>
            <Text style={styles.infoValue}>Madan Prasad Jaiswal (Former MP)</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Spouse:</Text>
            <Text style={styles.infoValue}>Manju Chaudhary</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Children:</Text>
            <Text style={styles.infoValue}>One son and one daughter</Text>
          </View>
        </View>
      </View>

      {/* Educational Background */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🎓 Education</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.educationItem}>
            <Text style={styles.educationDegree}>MBBS</Text>
            <Text style={styles.educationInstitute}>Patna Medical College</Text>
          </View>
          <View style={styles.educationItem}>
            <Text style={styles.educationDegree}>MD</Text>
            <Text style={styles.educationInstitute}>Darbhanga Medical College</Text>
          </View>
        </View>
      </View>

      {/* Parliamentary Journey */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🗳️ Parliamentary Journey</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.sectionDescription}>
            Elected MP from Paschim Champaran constituency in four consecutive terms:
          </Text>
          <View style={styles.termsList}>
            {['2009', '2014', '2019', '2024'].map((year, index) => (
              <View key={index} style={styles.termItem}>
                <View style={styles.termYear}>
                  <Text style={styles.termYearText}>{year}</Text>
                </View>
                <Text style={styles.termLabel}>Lok Sabha Election</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Key Positions & Committees */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📋 Key Positions & Committees</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.committeesGrid}>
            <View style={styles.committeeCard}>
              <Text style={styles.committeeTitle}>Parliamentary Committees</Text>
              <Text style={styles.committeeItem}>• Information & Broadcasting</Text>
              <Text style={styles.committeeItem}>• Health & Family Welfare</Text>
              <Text style={styles.committeeItem}>• Estimates Committee (Chairman)</Text>
            </View>
            <View style={styles.committeeCard}>
              <Text style={styles.committeeTitle}>Institutional Roles</Text>
              <Text style={styles.committeeItem}>• JIPMER Governing Body</Text>
              <Text style={styles.committeeItem}>• AIIMS Patna Governing Body</Text>
              <Text style={styles.committeeItem}>• Central Health Council</Text>
            </View>
          </View>
          <View style={styles.leadershipCard}>
            <Text style={styles.leadershipTitle}>Party Leadership</Text>
            <Text style={styles.leadershipText}>
              Served as BJP Bihar State President from September 2019 to March 2023
            </Text>
          </View>
        </View>
      </View>

      {/* Contact Information */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>📞 Contact Information</Text>
        </View>
        <View style={styles.cardContent}>
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('tel:01123736782')}
          >
            <Text style={styles.contactIcon}>📞</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactType}>Office Phone</Text>
              <Text style={styles.contactValue}>(011) 23736782</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('mailto:drsanjayjaiswal@gmail.com')}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactType}>Personal Email</Text>
              <Text style={styles.contactValue}>drsanjayjaiswal@gmail.com</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => openLink('mailto:dr.sanjayjaiswal@mpls.sansad.in')}
          >
            <Text style={styles.contactIcon}>📧</Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactType}>Official Email</Text>
              <Text style={styles.contactValue}>dr.sanjayjaiswal@mpls.sansad.in</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Social Media */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🌐 Social Media</Text>
        </View>
        <View style={styles.cardContent}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink('http://www.facebook.com/Jaiswalsanjaybjp/')}
          >
            <Text style={styles.socialIcon}>📘</Text>
            <View style={styles.socialInfo}>
              <Text style={styles.socialPlatform}>Facebook</Text>
              <Text style={styles.socialHandle}>Jaiswalsanjaybjp</Text>
            </View>
            <Text style={styles.socialArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink('http://www.x.com/Sanjayjaiswalmp')}
          >
            <Text style={styles.socialIcon}>🐦</Text>
            <View style={styles.socialInfo}>
              <Text style={styles.socialPlatform}>Twitter/X</Text>
              <Text style={styles.socialHandle}>@Sanjayjaiswalmp</Text>
            </View>
            <Text style={styles.socialArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink('https://www.instagram.com/drsanjayjaiswalbjp/')}
          >
            <Text style={styles.socialIcon}>📸</Text>
            <View style={styles.socialInfo}>
              <Text style={styles.socialPlatform}>Instagram</Text>
              <Text style={styles.socialHandle}>@drsanjayjaiswalbjp</Text>
            </View>
            <Text style={styles.socialArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => openLink('https://wa.me/917702000723')}
          >
            <Text style={styles.socialIcon}>💬</Text>
            <View style={styles.socialInfo}>
              <Text style={styles.socialPlatform}>WhatsApp</Text>
              <Text style={styles.socialHandle}>+91 7702000723</Text>
            </View>
            <Text style={styles.socialArrow}>→</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* External Links */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>🔗 Official Links</Text>
        </View>
        <View style={styles.cardContent}>
          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink('https://sansad.in/ls/members/biographyM/4455?from=members')}
          >
            <Text style={styles.linkIcon}>🏛️</Text>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>Parliament of India</Text>
              <Text style={styles.linkDescription}>Official parliamentary profile</Text>
            </View>
            <Text style={styles.linkArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.linkButton}
            onPress={() => openLink('https://en.wikipedia.org/wiki/Sanjay_Jaiswal')}
          >
            <Text style={styles.linkIcon}>🌐</Text>
            <View style={styles.linkInfo}>
              <Text style={styles.linkTitle}>Wikipedia</Text>
              <Text style={styles.linkDescription}>Detailed biography and information</Text>
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
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileImageContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 5,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  degree: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 15,
  },
  positionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  constituency: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 2,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  cardContent: {
    padding: 20,
  },

  // Position Items
  positionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  positionBullet: {
    fontSize: 16,
    color: '#3498db',
    marginRight: 10,
    marginTop: 2,
  },
  positionText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '600',
    width: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    flex: 1,
  },

  // Education
  educationItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  educationDegree: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  educationInstitute: {
    fontSize: 14,
    color: '#7f8c8d',
    marginTop: 2,
  },

  // Parliamentary Journey
  sectionDescription: {
    fontSize: 15,
    color: '#555',
    marginBottom: 15,
  },
  termsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  termItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  termYear: {
    backgroundColor: '#3498db',
    width: 35,
    height: 35,
    borderRadius: 17.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  termYearText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  termLabel: {
    fontSize: 12,
    color: '#2c3e50',
  },

  // Committees
  committeesGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  committeeCard: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
  },
  committeeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  committeeItem: {
    fontSize: 12,
    color: '#555',
    marginBottom: 3,
  },
  leadershipCard: {
    backgroundColor: '#e8f5e8',
    padding: 15,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  leadershipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 5,
  },
  leadershipText: {
    fontSize: 13,
    color: '#2c3e50',
  },

  // Contact Items
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
  },
  contactIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  contactInfo: {
    flex: 1,
  },
  contactType: {
    fontSize: 12,
    color: '#7f8c8d',
    fontWeight: '600',
  },
  contactValue: {
    fontSize: 15,
    color: '#2c3e50',
    marginTop: 2,
  },

  // Social Media
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  socialInfo: {
    flex: 1,
  },
  socialPlatform: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  socialHandle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  socialArrow: {
    fontSize: 16,
    color: '#3498db',
    fontWeight: 'bold',
  },

  // External Links
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
    marginRight: 15,
  },
  linkInfo: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 15,
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
    height: 30,
  },
});

export default KnowYourLeaderScreen;