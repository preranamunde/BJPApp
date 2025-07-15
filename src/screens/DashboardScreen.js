import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

const DashboardScreen = () => {
  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: 'https://tse2.mm.bing.net/th/id/OIP.7nJJBy9zWC6D4pVeQDTEqAHaHX?pid=Api&P=0&h=180' }}
            style={styles.profileImage}
          />
        </View>
        <Text style={styles.name}>Dr. Sanjay Jaiswal</Text>
        <Text style={styles.degree}>MBBS, MD</Text>
        <View style={styles.positionCard}>
          <Text style={styles.position}>Member of Parliament</Text>
          <Text style={styles.constituency}>Paschim Champaran (Lok Sabha), Bihar</Text>
        </View>
      </View>

      {/* Dashboard Action Boxes */}
      <View style={styles.gridContainer}>
        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridTitle}>APPEAL</Text>
            <Text style={styles.gridCount}>XX</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridTitle}>APPOINTMENT</Text>
            <Text style={styles.gridCount}>XX</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.gridItem}>
            <Text style={styles.gridTitle}>GRIEVANCE</Text>
            <Text style={styles.gridCount}>XX</Text>
          </View>
          <View style={styles.gridItem}>
            <Text style={styles.gridTitle}>COMPLAINTS</Text>
            <Text style={styles.gridCount}>XX</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  profileImageContainer: {
    width: 130,
    height: 130,
    borderRadius: 65,
    padding: 5,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  name: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 5,
  },
  degree: {
    fontSize: 16,
    color: '#bdc3c7',
    marginBottom: 15,
  },
  positionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    alignItems: 'center',
  },
  position: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  constituency: {
    fontSize: 14,
    color: '#ecf0f1',
    marginTop: 2,
  },

  // Grid Styles
  gridContainer: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    marginHorizontal: 5,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gridTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  gridCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e16e2b',
  },
});

export default DashboardScreen;
