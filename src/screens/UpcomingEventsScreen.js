import React from 'react';
import { View, StyleSheet, Dimensions, ScrollView, Image } from 'react-native';

const { width } = Dimensions.get('window');

const UpcomingEventsScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('../assets/image1.jpg')} style={styles.image} />
      <Image source={require('../assets/image2.jpg')} style={styles.image} />
      <Image source={require('../assets/image3.jpg')} style={styles.image} />
      <Image source={require('../assets/image4.jpg')} style={styles.image} />
      <Image source={require('../assets/image5.jpg')} style={styles.image} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  image: {
    width: width * 0.9,
    height: 300,
    marginBottom: 20,
    borderRadius: 10,
  },
});

export default UpcomingEventsScreen;
