import React from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

const VisitMyGovScreen = () => {
  return (
    <View style={styles.container}>
      <WebView source={{ uri: 'https://library.bjp.org/' }} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default VisitMyGovScreen;
