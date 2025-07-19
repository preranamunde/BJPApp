import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Share,
} from 'react-native';
import { Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const CustomDrawer = ({ navigation }) => {
  const [isLiteratureOpen, setIsLiteratureOpen] = useState(false);

  const handleOpenURL = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const handleReferUs = async () => {
    try {
      const result = await Share.share({
        message: 'Check out this app: https://www.nutantek.com',
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      } else if (result.action === Share.dismissedAction) {
        console.log('Share dismissed');
      }
    } catch (error) {
      console.error('Error sharing:', error.message);
    }
  };

  return (
    <ScrollView style={styles.drawerContainer}>
      {/* User Section */}
      <View style={styles.userSection}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Registration')}
          style={{ alignItems: 'center' }}
        >
          <Image
            source={require('../assets/profile_user.png')}
            style={styles.profileImage}
          />
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>Suresh Gupta</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Drawer Items */}
      <View style={styles.itemsSection}>
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('Dashboard')}
        >
          <Icon name="dashboard" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('KnowYourLeader')}
        >
          <Icon name="person" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Know Your Leader</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('AboutConstituency')}
        >
          <Icon name="location-on" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>About Constituency</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('DevelopmentLandscape')}
        >
          <Icon name="landscape" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Development Landscape</Text>
        </TouchableOpacity>

        {/* Literature Dropdown */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => setIsLiteratureOpen(!isLiteratureOpen)}
        >
          <Icon name="menu-book" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Literature</Text>
          <Icon
            name={isLiteratureOpen ? 'expand-less' : 'expand-more'}
            size={24}
            color="#e16e2b"
            style={{ marginLeft: 'auto' }}
          />
        </TouchableOpacity>

        {isLiteratureOpen && (
          <>
            <TouchableOpacity
              style={styles.subMenuItem}
              onPress={() => navigation.navigate('KamalSandesh')}
            >
              <Text style={styles.subMenuItemText}>Kamal Sandesh</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.subMenuItem}
              onPress={() => navigation.navigate('Books')}
            >
              <Text style={styles.subMenuItemText}>Books</Text>
            </TouchableOpacity>
          </>
        )}

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('VisitMyGov')}
        >
          <Icon name="account-balance" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Visit MyGov</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('ContactUs')}
        >
          <Icon name="contact-phone" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Contact Us</Text>
        </TouchableOpacity>

        {/* Refer Us Button with Share Function */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={handleReferUs}
        >
          <Icon name="share" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Refer Us</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => console.log('Rate Us pressed')}
        >
          <Icon name="star" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Rate Us</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('About')}
        >
          <Icon name="info" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>About</Text>
        </TouchableOpacity>
      </View>

      {/* Social Media Icons */}
      <View style={styles.socialIconsContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('http://www.facebook.com/Jaiswalsanjaybjp/')}
        >
          <FontAwesome name="facebook" size={24} color="#3b5998" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('http://www.x.com/Sanjayjaiswalmp')}
        >
          <MaterialCommunityIcons name="alpha-x-circle" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('https://www.instagram.com/drsanjayjaiswalbjp/')}
        >
          <FontAwesome name="instagram" size={24} color="#C13584" />
        </TouchableOpacity>
        <TouchableOpacity
    style={styles.iconButton}
    onPress={() => handleOpenURL('https://wa.me/917702000723')} // Replace with actual number
  >
    <FontAwesome name="whatsapp" size={24} color="#25D366" />
  </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  userSection: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    resizeMode: 'contain',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
  },
  userNameContainer: {
    padding: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemsSection: {
    paddingVertical: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  drawerItemText: {
    fontSize: 16,
    marginLeft: 20,
    color: '#333',
  },
  subMenuItem: {
    paddingLeft: 64,
    paddingVertical: 10,
  },
  subMenuItemText: {
    fontSize: 14,
    color: '#555',
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingBottom: 20,
  },
  iconButton: {
    padding: 8,
  },
});

export default CustomDrawer;
