import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import WebView from 'react-native-webview';

const { width } = Dimensions.get('window');

const tabs = ['Press Meets', 'Past Events', 'Facebook', 'X', 'Instagram', 'Video'];

const videoList = [
  { id: '1', title: 'Intro Video', source: require('../assets/intro.mp4') },
  { id: '2', title: 'Event Highlights', source: require('../assets/intro1.mp4') },
  { id: '3', title: 'Speech Coverage', source: require('../assets/video3.mp4') },
];

const MediaCornerScreen = () => {
  const [activeTab, setActiveTab] = useState(tabs[0]);

  return (
    <View style={styles.container}>
      <View style={styles.tabBarContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.underline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.contentArea}>
        {activeTab === 'Video' ? (
          <ScrollView contentContainerStyle={styles.videoListContainer}>
            {videoList.map((video) => (
              <View key={video.id} style={styles.videoItem}>
                <Text style={styles.videoTitle}>{video.title}</Text>
                <Video
                  source={video.source}
                  style={styles.videoPlayer}
                  controls
                  resizeMode="contain"
                />
              </View>
            ))}
          </ScrollView>
        ) : activeTab === 'Facebook' ? (
          <WebView
            source={{ uri: 'http://www.facebook.com/Jaiswalsanjaybjp/' }}
            style={{ flex: 1 }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        ) : activeTab === 'X' ? (
          <WebView
            source={{ uri: 'https://twitter.com/Sanjayjaiswalmp' }}
            style={{ flex: 1 }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
            // Add these properties for better compatibility
            mixedContentMode="compatibility"
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        ) : activeTab === 'Press Meets' ? (
          <ScrollView contentContainerStyle={styles.postsContainer}>
            <View style={styles.postItem}>
              <Image source={require('../assets/pastevents1.png')} style={styles.postImage} resizeMode="cover" />
              <Text style={styles.postTitle}>प्रेस मीट - बिहार</Text>
              <Text style={styles.postDate}>16 जुलाई 2025</Text>
              <Text style={styles.postText}>
                बिहार में विकास योजनाओं और आगामी कार्यक्रमों की जानकारी देने हेतु आयोजित प्रेस मीट की झलक।
              </Text>
            </View>
            <View style={styles.postItem}>
              <Image source={require('../assets/pressmeet1.png')} style={styles.postImage} resizeMode="cover" />
              <Text style={styles.postTitle}>प्रेस मीट बैठक</Text>
              <Text style={styles.postDate}>19 जुलाई 2025</Text>
              <Text style={styles.postText}>प्रदेश कार्यालय में प्रेस मीट के दौरान महत्वपूर्ण योजनाओं पर चर्चा हुई।</Text>
            </View>
          </ScrollView>
        ) : activeTab === 'Past Events' ? (
          <ScrollView contentContainerStyle={styles.postsContainer}>

            <View style={styles.postItem}>
              <Image source={require('../assets/pastevents2.png')} style={styles.postImage} resizeMode="cover" />
              <Text style={styles.postTitle}>संकल्प पत्र विमोचन कार्यक्रम</Text>
              <Text style={styles.postDate}>17 जुलाई 2025</Text>
              <Text style={styles.postText}>
                प्रदेश कार्यालय में आयोजित संकल्प पत्र विमोचन कार्यक्रम में माननीय नेतागण द्वारा महत्वपूर्ण घोषणाएँ।
              </Text>
            </View>
            <View style={styles.postItem}>
              <Image source={require('../assets/pastevents3.png')} style={styles.postImage} resizeMode="cover" />
              <Text style={styles.postTitle}>उद्घाटन समारोह</Text>
              <Text style={styles.postDate}>18 जुलाई 2025</Text>
              <Text style={styles.postText}>जनकल्याण हेतु नए केंद्र का उद्घाटन हुआ।</Text>
            </View>
          </ScrollView>



        ) : activeTab === 'Instagram' ? (
          <WebView
            source={{ uri: 'https://www.instagram.com/drsanjayjaiswalbjp/' }}
            style={{ flex: 1 }}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        ) : (
          <Text style={styles.contentText}>{activeTab}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  tabBarContainer: { backgroundColor: '#f56c3aff', paddingTop: 12, paddingBottom: 10, elevation: 4 },
  tabRow: { flexDirection: 'row', paddingHorizontal: 10 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 10, marginHorizontal: 6, position: 'relative' },
  tabText: { color: '#ffffff', fontSize: 16, fontWeight: '500', opacity: 0.8 },
  activeTabText: { color: '#ffffff', fontWeight: 'bold', opacity: 1 },
  underline: { position: 'absolute', bottom: 0, left: 10, right: 10, height: 2, backgroundColor: '#ffffff', borderRadius: 1 },
  contentArea: { flex: 1, backgroundColor: '#f8f9fa' },
  contentText: { fontSize: 20, color: '#333', fontWeight: '600', textAlign: 'center', marginTop: 20 },
  videoListContainer: { paddingVertical: 20, alignItems: 'center' },
  videoItem: { marginBottom: 20, alignItems: 'center' },
  videoTitle: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  videoPlayer: { width: width * 0.9, height: width * 0.6, backgroundColor: '#000' },
  postsContainer: { padding: 20 },
  postItem: { backgroundColor: '#fff', padding: 15, marginBottom: 15, borderRadius: 8, elevation: 2 },
  postImage: { width: '100%', height: 300, borderRadius: 8, marginBottom: 10 },
  postTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  postDate: { fontSize: 12, color: '#888', marginBottom: 10 },
  postText: { fontSize: 14, color: '#333', lineHeight: 20 },
  instagramContainer: { padding: 20, alignItems: 'center', justifyContent: 'center' },
});

export default MediaCornerScreen;