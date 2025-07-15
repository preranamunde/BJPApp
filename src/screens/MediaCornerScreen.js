import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const tabs = ['Press Meets', 'Past Events', 'Facebook', 'X', 'Instagram', 'Video'];

const MediaCornerScreen = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <View style={styles.container}>
      {/* Top Horizontal Tabs */}
      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabRow}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabButton,
                activeTab === tab && styles.activeTabButton,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.underline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content Area */}
      <View style={styles.contentArea}>
        <Text style={styles.contentText}>{activeTab}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  tabBarContainer: {
    backgroundColor: '#f56c3aff',
    paddingTop: 12,
    paddingBottom: 10,
    elevation: 4,
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginHorizontal: 6,
    position: 'relative',
  },
  activeTabButton: {},
  tabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  activeTabText: {
    color: '#ffffff',
    fontWeight: 'bold',
    opacity: 1,
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  contentText: {
    fontSize: 20,
    color: '#333',
    fontWeight: '600',
  },
});

export default MediaCornerScreen;
