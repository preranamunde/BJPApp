import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Video from 'react-native-video';

const { width } = Dimensions.get('window');

const YouTubeSplash = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 10000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Video
        source={require('../assets/intro.mp4')} // Adjust path as needed
        style={{ width: width, height: 300 }}
        resizeMode="cover"
        repeat={true}
        muted={false}
        paused={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default YouTubeSplash;
