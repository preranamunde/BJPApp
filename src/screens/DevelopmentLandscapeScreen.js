import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width, height } = Dimensions.get('window');

const DevelopmentLandscapeScreen = () => {
  const [activeCard, setActiveCard] = useState(null);
  const fadeAnim = new Animated.Value(0);
  const slideAnim = new Animated.Value(50);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const developmentData = [
    {
      id: 1,
      title: "Within the Constituency",
      icon: "location-on",
      color: '#e16e2b',
      items: [
        { icon: "directions-car", text: "New roads and transportation infrastructure" },
        { icon: "local-hospital", text: "Health centers and educational institutions" },
        { icon: "group", text: "Employment generation programs" },
        { icon: "phone-android", text: "Digital services for citizens" }
      ]
    },
    {
      id: 2,
      title: "At the State Level",
      icon: "location-city",
      color: '#d65a1f',
      items: [
        { icon: "favorite", text: "State-wide healthcare reforms" },
        { icon: "business", text: "Major industrial projects" },
        { icon: "eco", text: "State-level agricultural initiatives" }
      ]
    },
    {
      id: 3,
      title: "At the National Level",
      icon: "public",
      color: '#c4551d',
      items: [
        { icon: "security", text: "National infrastructure missions" },
        { icon: "flash-on", text: "Technological advancements and Digital India programs" },
        { icon: "trending-up", text: "Social welfare schemes impacting all regions" }
      ]
    }
  ];

  const renderStatsCard = (title, subtitle, index) => (
    <Animated.View
      key={index}
      style={[
        styles.statsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View style={styles.statsIndicator} />
      <Text style={styles.statsTitle}>{title}</Text>
      <Text style={styles.statsSubtitle}>{subtitle}</Text>
    </Animated.View>
  );

  const renderDevelopmentCard = (section, index) => (
    <Animated.View
      key={section.id}
      style={[
        styles.cardContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }
      ]}
    >
      <View
        style={[styles.card, { backgroundColor: section.color }]}
      >
        {/* Decorative Elements */}
        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
        <View style={styles.decorativeCircle3} />

        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Icon name={section.icon} size={24} color="#fff" />
          </View>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Icon
            name="keyboard-arrow-down"
            size={24}
            color="#fff"
          />
        </View>

        {/* Card Content */}
        <View style={styles.cardContent}>
          {section.items.map((item, itemIndex) => (
            <View key={itemIndex} style={styles.itemContainer}>
              <View style={styles.itemIconContainer}>
                <Icon name={item.icon} size={18} color="#fff" />
              </View>
              <Text style={styles.itemText}>{item.text}</Text>
              <View style={styles.itemDot} />
            </View>
          ))}
        </View>

        {/* Progress Section */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${(section.items.length / 4) * 100}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {section.items.length} Initiatives
          </Text>
        </View>
              </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#e16e2b" />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.headerIcon}>
              <Icon name="trending-up" size={32} color="#fff" />
            </View>
            <Text style={styles.pageTitle}>Development Landscape</Text>
            <Text style={styles.pageSubtitle}>
              Transforming Communities Through Strategic Development
            </Text>
          </Animated.View>
          
          {/* Header Decorative Elements */}
          <View style={styles.headerDecoration1} />
          <View style={styles.headerDecoration2} />
          <View style={styles.headerDecoration3} />
        </View>

        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          {renderStatsCard("Local", "Constituency Focus", 0)}
          {renderStatsCard("State", "Regional Impact", 1)}
          {renderStatsCard("National", "Country-wide", 2)}
        </View>

        {/* Development Cards */}
        <View style={styles.cardsContainer}>
          {developmentData.map((section, index) => renderDevelopmentCard(section, index))}
        </View>

        {/* Call to Action */}
        <Animated.View
          style={[
            styles.ctaContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            }
          ]}
        >
          <View style={styles.ctaCard}>
            <View style={styles.ctaIconContainer}>
              <Icon name="rocket-launch" size={28} color="#e16e2b" />
            </View>
            <Text style={styles.ctaTitle}>Building Tomorrow, Today</Text>
            <Text style={styles.ctaSubtitle}>
              Every initiative contributes to a stronger, more prosperous future for our communities.
            </Text>
            <View style={styles.ctaButton}>
              <View style={styles.ctaButtonContent}>
                <Text style={styles.ctaButtonText}>Learn More</Text>
                <Icon name="arrow-forward" size={20} color="#fff" />
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  pageSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  headerDecoration1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerDecoration2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerDecoration3: {
    position: 'absolute',
    top: 20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Stats Styles
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 25,
    justifyContent: 'space-between',
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    flex: 1,
    marginHorizontal: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e16e2b',
    textAlign: 'center',
    marginBottom: 4,
  },
  statsSubtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  statsIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e16e2b',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  // Card Styles
  cardsContainer: {
    paddingHorizontal: 20,
  },
  cardContainer: {
    marginBottom: 20,
  },
  card: {
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    letterSpacing: 0.3,
  },
  cardContent: {
    marginBottom: 24,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  itemIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  itemText: {
    fontSize: 15,
    color: '#fff',
    flex: 1,
    lineHeight: 22,
    fontWeight: '500',
  },
  itemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginRight: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
  },
  decorativeCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorativeCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorativeCircle3: {
    position: 'absolute',
    top: 50,
    right: -10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  // CTA Styles
  ctaContainer: {
    paddingHorizontal: 20,
    paddingVertical: 25,
  },
  ctaCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(225, 110, 43, 0.1)',
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(225, 110, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  ctaSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 28,
    paddingHorizontal: 10,
  },
  ctaButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#e16e2b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaButtonContent: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
    letterSpacing: 0.5,
  },
});

export default DevelopmentLandscapeScreen;