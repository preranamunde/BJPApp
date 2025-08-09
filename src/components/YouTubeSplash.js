import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
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
        source={require('../assets/intro.mp4')} // Adjust path if needed
        style={{ width: width, height: 300 }}
        resizeMode="cover"
        repeat={true}
        muted={false}
        paused={false}
      />

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
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
  skipButton: {
    position: 'absolute',
    bottom: 40,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  skipText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default YouTubeSplash;
