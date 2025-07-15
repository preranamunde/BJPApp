import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const BooksScreen = () => {
  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'https://library.bjp.org/' }}
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
  },
});

export default BooksScreen;
