import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';

const UpcomingEventsScreen = () => {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://www.bjp.org/en/events' }}
        style={styles.webview}
        startInLoadingState
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
});

export default UpcomingEventsScreen;
