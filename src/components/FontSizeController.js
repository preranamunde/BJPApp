import React, { useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

const FontSizeController = ({ onFontSizeChange }) => {
  const [fontSize, setFontSize] = useState(16);

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 2, 24);
    setFontSize(newSize);
    onFontSizeChange(newSize);
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 2, 12);
    setFontSize(newSize);
    onFontSizeChange(newSize);
  };

  const resetFontSize = () => {
    setFontSize(16);
    onFontSizeChange(16);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.button} onPress={decreaseFontSize}>
        <Text style={styles.buttonText}>A-</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={resetFontSize}>
        <Text style={styles.buttonText}>A</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={increaseFontSize}>
        <Text style={styles.buttonText}>A+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 5,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginVertical: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
});

export default FontSizeController;