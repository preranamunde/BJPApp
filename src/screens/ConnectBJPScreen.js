import React from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

const ConnectBJPScreen = () => {
  return (
    <View style={styles.container}>
      <WebView 
        source={{ uri: 'https://membership.bjp.org/en/home/login' }}
        startInLoadingState
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ConnectBJPScreen;
