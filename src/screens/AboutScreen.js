import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

const AboutScreen = () => {
  const handleDeveloperPress = () => {
    Linking.openURL('https://www.nutantek.com').catch(err =>
      console.error("Failed to open URL:", err)
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.appName}>SanjayJaiswal App</Text>
      <Text style={styles.version}>V1.0.1</Text>

      <TouchableOpacity onPress={handleDeveloperPress}>
        <Text style={styles.developer}>Developer: NutanTek Solutions LLP</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e16e2b',
    marginBottom: 10,
  },
  version: {
    fontSize: 16,
    color: '#333',
    marginBottom: 5,
  },
  developer: {
    fontSize: 16,
    color: '#007bff', // blue color for link style
    textDecorationLine: 'underline',
  },
});

export default AboutScreen;
