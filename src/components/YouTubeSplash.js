import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';

const { width } = Dimensions.get('window');

const YouTubeSplash = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete(); // Move to main app after 10 seconds
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <YoutubePlayer
  height={300}
  width={width - 40}
  play={true}
  videoId={'y6nmpiEnL-o'}
  volume={100}
  forceAndroidAutoplay={true}
/>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default YouTubeSplash;
