import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Share,
  Alert,
} from 'react-native';
import { Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../utils/AuthService';

const CustomDrawer = ({ navigation, handleLogout, handleEditProfile, handleMyProfile }) => {
  const [isLiteratureOpen, setIsLiteratureOpen] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);
  const [userName, setUserName] = useState('Guest User');
  const [userPhoto, setUserPhoto] = useState(null);
  const [userMobile, setUserMobile] = useState('');
  
  // Check login status on component mount and when navigation changes
  useEffect(() => {
    checkLoginStatus();
    
    // Listen for navigation state changes to update login status
    const unsubscribe = navigation.addListener('state', () => {
      checkLoginStatus();
    });

    // Listen for focus events to refresh user data
    const focusUnsubscribe = navigation.addListener('focus', () => {
      checkLoginStatus();
    });

    return () => {
      unsubscribe();
      focusUnsubscribe();
    };
  }, [navigation]);

  const checkLoginStatus = async () => {
    try {
      const loginStatus = await AsyncStorage.getItem('isLoggedin');
      const isLoggedIn = loginStatus === 'TRUE' || global.isUserLoggedin;
      setIsUserLoggedIn(isLoggedIn);
      
      if (isLoggedIn) {
        loadUserData();
      } else {
        setUserName('Guest User');
        setUserPhoto(null);
        setUserMobile('');
      }
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsUserLoggedIn(false);
    }
  };

  const loadUserData = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        const parsedData = JSON.parse(userData);
        
        // Set user name - provide fallback values
        setUserName(parsedData.name || 'User');
        setUserMobile(parsedData.mobileNo || '');
        
        // Load full profile data to get the latest information
        if (parsedData.mobileNo) {
          const fullProfile = await AsyncStorage.getItem(`user_${parsedData.mobileNo}`);
          if (fullProfile) {
            const profileData = JSON.parse(fullProfile);
            // Update with the latest profile data
            setUserName(profileData.name || parsedData.name || 'User');
            
            // Try to load photo
            try {
              const photoUri = await PhotoStorageUtil.getPhoto(parsedData.mobileNo);
              setUserPhoto(photoUri);
            } catch (photoError) {
              console.log('Error loading photo:', photoError);
              setUserPhoto(null);
            }
          } else {
            // Try to load photo even if full profile doesn't exist
            try {
              const photoUri = await PhotoStorageUtil.getPhoto(parsedData.mobileNo);
              setUserPhoto(photoUri);
            } catch (photoError) {
              console.log('Error loading photo:', photoError);
              setUserPhoto(null);
            }
          }
        }
      } else {
        // Fallback data
        setUserName('User');
        setUserPhoto(null);
        setUserMobile('');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setUserName('User');
      setUserPhoto(null);
      setUserMobile('');
    }
  };

  const handleLogoutPress = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log("🔄 Starting logout process...");
              
              // Call the logout API with refresh token
              const logoutResult = await AuthService.logout();
              
              if (logoutResult.success) {
                console.log("✅ Logout successful:", logoutResult.message);
              } else {
                console.log("⚠️ Logout completed with issues:", logoutResult.message);
              }

              // Reset navigation to Login screen
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });

              console.log("✅ Logout complete — redirected to Login.");
            } catch (error) {
              console.error("❌ Logout error:", error);
              
              // Fallback: Clear tokens locally and redirect anyway
              await AuthService.clearTokens();
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              
              Alert.alert(
                'Logout',
                'Logout completed, but there may have been network issues.',
                [{ text: 'OK' }]
              );
            }
          },
        },
      ]
    );
  };

  const handleOpenURL = (url) => {
    Linking.openURL(url).catch(err => console.error('Error opening URL:', err));
  };

  const handleReferUs = async () => {
    try {
      const result = await Share.share({
        message: 'Check out this amazing political app! Download it now: https://www.nutantek.com',
        title: 'Share App',
      });

      if (result.action === Share.sharedAction) {
        console.log('Shared successfully');
      }
    } catch (error) {
      console.error('Error sharing:', error.message);
    }
  };

  const handleRateUs = () => {
    Alert.alert(
      'Rate Us',
      'Thank you for using our app! Please rate us on the App Store.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rate Now', 
          onPress: () => {
            // Replace with your actual app store URLs
            const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.yourapp';
            handleOpenURL(playStoreUrl);
          }
        },
      ]
    );
  };

  const handleProfileAction = () => {
    if (isUserLoggedIn) {
      navigation.navigate('ViewProfile');
    } else {
      Alert.alert(
        'Welcome',
        'Please login or register to continue',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Login', 
            onPress: () => navigation.navigate('Login')
          },
          { 
            text: 'Register', 
            onPress: () => navigation.navigate('Registration')
          },
        ]
      );
    }
  };

  const renderProfileImage = () => {
    if (userPhoto && userPhoto !== 'placeholder') {
      // Check if it's a real image URI
      if (userPhoto.startsWith('file://') || userPhoto.startsWith('content://') || userPhoto.startsWith('http')) {
        return (
          <View style={styles.profileImageContainer}>
            <Image
              source={{ uri: userPhoto }}
              style={styles.profileImage}
              onError={(error) => {
                console.log('Image load error:', error);
                setUserPhoto(null); // Fallback to placeholder on error
              }}
            />
            <View style={styles.photoIndicator}>
              <Icon name="camera-alt" size={12} color="#fff" />
            </View>
          </View>
        );
      } else {
        // Fallback for stored photo IDs
        return (
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              <Icon name="person" size={50} color="#e16e2b" />
            </View>
            <View style={styles.photoIndicator}>
              <Icon name="camera-alt" size={12} color="#fff" />
            </View>
          </View>
        );
      }
    } else {
      return (
        <View style={styles.profileImagePlaceholder}>
          <Icon name="person" size={50} color="#e16e2b" />
        </View>
      );
    }
  };

  return (
    <ScrollView style={styles.drawerContainer}>
      {/* User Section */}
      <View style={styles.userSection}>
        <TouchableOpacity
          onPress={handleProfileAction}
          style={{ alignItems: 'center' }}
        >
          {renderProfileImage()}
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{userName}</Text>
            {isUserLoggedIn && userMobile && (
              <Text style={styles.userMobile}>{userMobile}</Text>
            )}
            <Text style={styles.userStatus}>
              {isUserLoggedIn ? 'Tap to view profile' : 'Tap to login'}
            </Text>
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
          <View style={styles.subMenuContainer}>
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
          </View>
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

        <View style={styles.divider} />

        {/* View Profile - Always visible */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('ViewProfile')}
        >
          <Icon name="account-circle" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>View Profile</Text>
        </TouchableOpacity>

        {/* Login-specific items */}
        {isUserLoggedIn && (
          <>
            <TouchableOpacity
              style={styles.drawerItem}
              onPress={() => navigation.navigate('Registration', { isEditMode: true })}
            >
              <Icon name="edit" size={24} color="#e16e2b" />
              <Text style={styles.drawerItemText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.drawerItem}
              onPress={handleLogoutPress}
            >
              <Icon name="logout" size={24} color="#e16e2b" />
              <Text style={styles.drawerItemText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}

        {!isUserLoggedIn && (
          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => navigation.navigate('Login')}
          >
            <Icon name="login" size={24} color="#e16e2b" />
            <Text style={styles.drawerItemText}>Login</Text>
          </TouchableOpacity>
        )}

        <View style={styles.divider} />

        {/* App-related items */}
        <TouchableOpacity
          style={styles.drawerItem}
          onPress={handleReferUs}
        >
          <Icon name="share" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>Refer Us</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={handleRateUs}
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
          onPress={() => handleOpenURL('https://www.facebook.com/SinghRadhaMohan/')}
        >
          <FontAwesome name="facebook" size={24} color="#3b5998" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('https://twitter.com/RadhamohanBJP')}
        >
          <MaterialCommunityIcons name="alpha-x-circle" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('https://www.instagram.com/radhamohanbjp/')}
        >
          <FontAwesome name="instagram" size={24} color="#C13584" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleOpenURL('https://wa.me/917702000723')}
        >
          <FontAwesome name="whatsapp" size={24} color="#25D366" />
        </TouchableOpacity>
      </View>

      {/* App Version Info */}
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
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
    backgroundColor: '#f8f9fa',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e16e2b',
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 3,
    borderColor: '#e16e2b',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e16e2b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userNameContainer: {
    alignItems: 'center',
    padding: 5,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  userMobile: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userStatus: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
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
    flex: 1,
  },
  subMenuContainer: {
    backgroundColor: '#f8f9fa',
  },
  subMenuItem: {
    paddingLeft: 64,
    paddingVertical: 10,
  },
  subMenuItemText: {
    fontSize: 14,
    color: '#555',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 5,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  versionText: {
    fontSize: 12,
    color: '#999',
  },
});

export default CustomDrawer;