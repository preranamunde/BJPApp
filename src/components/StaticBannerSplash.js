import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const StaticBannerSplash = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 5000); // 5 seconds

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/image0.png')} // your image path
        style={styles.banner}
        resizeMode="cover" // or "stretch" / "contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  banner: {
    width: width,
    height: height,
  },
});

export default StaticBannerSplash;
