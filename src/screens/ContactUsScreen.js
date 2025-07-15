import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const ContactUsScreen = () => {
  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handleSocialMedia = (platform, handle) => {
    let url = '';
    switch (platform) {
      case 'facebook':
        url = `https://facebook.com/${handle}`;
        break;
      case 'twitter':
        url = `https://twitter.com/${handle}`;
        break;
      case 'instagram':
        url = `https://instagram.com/${handle}`;
        break;
      case 'youtube':
        url = `https://youtube.com/@${handle}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/${handle.replace(/[^0-9]/g, '')}`;
        break;
    }
    if (url) Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Icon name="support-agent" size={40} color="white" />
        </View>
        <Text style={styles.pageTitle}>Contact Us</Text>
        <Text style={styles.subtitle}>We're here to help you</Text>
      </View>

      {/* Office Cards */}
      <View style={styles.cardContainer}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Icon name="location-city" size={24} color="#e16e2b" />
            </View>
            <Text style={styles.cardTitle}>Constituency Office</Text>
          </View>
          <Text style={styles.cardText}>123 Main Street, Constituency City</Text>
          <Text style={styles.cardText}>State, PIN 123456</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Main Office</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.iconContainer}>
              <Icon name="account-balance" size={24} color="#e16e2b" />
            </View>
            <Text style={styles.cardTitle}>New Delhi Office</Text>
          </View>
          <Text style={styles.cardText}>456 Parliament Street</Text>
          <Text style={styles.cardText}>New Delhi - 110001</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Parliament</Text>
          </View>
        </View>
      </View>

      {/* Contact Methods */}
      <View style={styles.contactSection}>
        <Text style={styles.sectionTitle}>Get In Touch</Text>
        
        {/* Phone Numbers */}
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconContainer}>
              <Icon name="call" size={20} color="white" />
            </View>
            <Text style={styles.contactTitle}>Phone Numbers</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleCall('+919876543210')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="phone" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>+91 9876543210</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleCall('+919123456789')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="phone" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>+91 9123456789</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>
        </View>

        {/* Email IDs */}
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconContainer}>
              <Icon name="email" size={20} color="white" />
            </View>
            <Text style={styles.contactTitle}>Email IDs</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleEmail('info@leaderparty.com')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="mail-outline" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>info@leaderparty.com</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.contactItem}
            onPress={() => handleEmail('support@leaderparty.com')}
          >
            <View style={styles.contactItemIcon}>
              <Icon name="support" size={18} color="#e16e2b" />
            </View>
            <Text style={styles.contactItemText}>support@leaderparty.com</Text>
            <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
          </TouchableOpacity>
        </View>

        {/* Social Media */}
        <View style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <View style={styles.contactIconContainer}>
              <Icon name="share" size={20} color="white" />
            </View>
            <Text style={styles.contactTitle}>Social Media</Text>
          </View>
          
          {[
            { icon: 'facebook', label: 'Facebook', handle: 'leaderparty', platform: 'facebook' },
            { icon: 'alternate-email', label: 'Twitter', handle: 'leaderparty', platform: 'twitter' },
            { icon: 'photo-camera', label: 'Instagram', handle: 'leaderparty', platform: 'instagram' },
            { icon: 'ondemand-video', label: 'YouTube', handle: 'leaderparty', platform: 'youtube' },
            { icon: 'chat', label: 'WhatsApp', handle: '+91 9876543210', platform: 'whatsapp' },
          ].map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactItem}
              onPress={() => handleSocialMedia(item.platform, item.handle)}
            >
              <View style={styles.contactItemIcon}>
                <Icon name={item.icon} size={18} color="#e16e2b" />
              </View>
              <View style={styles.socialTextContainer}>
                <Text style={styles.socialLabel}>{item.label}</Text>
                <Text style={styles.socialHandle}>@{item.handle}</Text>
              </View>
              <Icon name="arrow-forward-ios" size={16} color="#e16e2b" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Available 24/7 for your support</Text>
        <View style={styles.footerDivider} />
        <Text style={styles.footerSubtext}>Response time: Within 2-4 hours</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#e16e2b',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 20,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  cardContainer: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  cardText: {
    fontSize: 15,
    color: '#5a6c7d',
    lineHeight: 22,
    marginBottom: 2,
  },
  badge: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  contactSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e16e2b',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  contactItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactItemText: {
    fontSize: 15,
    color: '#2c3e50',
    flex: 1,
    fontWeight: '500',
  },
  socialTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  socialLabel: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
  },
  socialHandle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },
  footer: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e16e2b',
    textAlign: 'center',
  },
  footerDivider: {
    width: 60,
    height: 2,
    backgroundColor: '#e16e2b',
    marginVertical: 8,
    borderRadius: 1,
  },
  footerSubtext: {
    fontSize: 13,
    color: '#7f8c8d',
    textAlign: 'center',
  },
});

export default ContactUsScreen;