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
import EncryptedStorage from 'react-native-encrypted-storage';
import ConfigService from '../services/ConfigService';

// Image Service for Drawer
class DrawerImageService {
  static async testImageUrl(imageUrl) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(imageUrl, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('Image URL not accessible:', error.message);
      return false;
    }
  }
  
  static async getWorkingImageUrl(imageUrl) {
    if (!imageUrl || imageUrl === 'placeholder') {
      return null;
    }
    
    try {
      // If it's already a full URL, normalize it
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        let normalizedUrl = imageUrl;
        
        // Remove port from ngrok URLs
        if (normalizedUrl.includes('ngrok-free.app:')) {
          normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
        }
        
        // Replace localhost with current base URL
        if (normalizedUrl.includes('localhost:5000') || normalizedUrl.includes('localhost:')) {
          const baseUrl = await ConfigService.getBaseUrl();
          normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
        }
        
        // Test if the normalized URL is accessible
        const isAccessible = await this.testImageUrl(normalizedUrl);
        
        if (isAccessible) {
          return normalizedUrl;
        }
      }
      
      // If URL is relative or previous attempts failed, try fallback paths
      const baseUrl = await ConfigService.getBaseUrl();
      const cleanPath = imageUrl.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
      const filename = cleanPath.split('/').pop();
      
      const fallbackPaths = [
        `${baseUrl}/uploads/profile_images/${filename}`,
        `${baseUrl}/profile/${filename}`,
        `${baseUrl}/uploads/${filename}`,
        `${baseUrl}/${cleanPath}`,
      ];
      
      for (const fallbackUrl of fallbackPaths) {
        const isAccessible = await this.testImageUrl(fallbackUrl);
        if (isAccessible) {
          return fallbackUrl;
        }
      }
      
      return null;
      
    } catch (error) {
      console.log('Error in getWorkingImageUrl:', error.message);
      return null;
    }
  }
}
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
    console.log('🔄 Loading user data for drawer...');
    
    const userData = await AsyncStorage.getItem('userData');
    if (userData) {
      const parsedData = JSON.parse(userData);
      console.log('📋 User data loaded:', {
        name: parsedData.name,
        mobile: parsedData.mobile || parsedData.mobileNo,
        hasProfileImage: !!parsedData.profile_image
      });
      
      // Set user name and mobile
      setUserName(parsedData.name || parsedData.fullName || 'User');
      setUserMobile(parsedData.mobile || parsedData.mobileNo || '');
      
      // Handle profile image
      if (parsedData.profile_image && parsedData.profile_image !== 'placeholder') {
        console.log('🖼️ Processing profile image:', parsedData.profile_image);
        
        try {
          const workingImageUrl = await DrawerImageService.getWorkingImageUrl(parsedData.profile_image);
          
          if (workingImageUrl) {
            console.log('✅ Profile image URL resolved:', workingImageUrl);
            setUserPhoto(workingImageUrl);
          } else {
            console.log('⚠️ Could not resolve profile image URL');
            setUserPhoto(null);
          }
        } catch (imageError) {
          console.log('❌ Error loading profile image:', imageError.message);
          setUserPhoto(null);
        }
      } else {
        console.log('ℹ️ No profile image available');
        setUserPhoto(null);
      }
    } else {
      console.log('⚠️ No user data found in storage');
      setUserName('Guest User');
      setUserPhoto(null);
      setUserMobile('');
    }
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    setUserName('Guest User');
    setUserPhoto(null);
    setUserMobile('');
  }
};

 // Replace the handleLogoutPress function in CustomDrawer.js (starting around line 237)

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
            console.log("🔄 Starting logout process from drawer...");
            
            // Get the refresh token before calling logout
            const refreshToken = await AsyncStorage.getItem('refresh_token');
            console.log('🔑 Refresh token available:', !!refreshToken);
            
            if (!refreshToken) {
              console.warn('⚠️ No refresh token found, clearing local data...');
              await AuthService.clearTokens();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              return;
            }

            // Call the logout API with the refresh token
            const logoutResult = await AuthService.logout();
            
            if (logoutResult.success) {
              console.log("✅ Logout successful:", logoutResult.message);
              
              // Show success message
              Alert.alert(
                'Logout Successful',
                'You have been logged out successfully.',
                [{ text: 'OK' }]
              );
            } else {
              console.log("⚠️ Logout completed with issues:", logoutResult.message);
            }

            // Always reset navigation to Login screen after logout
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
    // Check if it's a valid image URI
    if (userPhoto.startsWith('file://') || 
        userPhoto.startsWith('content://') || 
        userPhoto.startsWith('http://') || 
        userPhoto.startsWith('https://')) {
      return (
        <View style={styles.profileImageContainer}>
          <Image
            source={{ uri: userPhoto }}
            style={styles.profileImage}
            onError={(error) => {
              console.log('🖼️ Image load error in drawer:', error.nativeEvent?.error);
              setUserPhoto(null); // Fallback to placeholder on error
            }}
            onLoad={() => {
              console.log('✅ Profile image loaded successfully in drawer');
            }}
          />
          {isUserLoggedIn && (
            <View style={styles.photoIndicator}>
              <Icon name="camera-alt" size={12} color="#fff" />
            </View>
          )}
        </View>
      );
    }
  }
  
  // Fallback placeholder
  return (
    <View style={styles.profileImagePlaceholder}>
      <Icon name="person" size={50} color="#e16e2b" />
    </View>
  );
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
      onPress={() => navigation.navigate('ChangePassword')}
    >
      <Icon name="lock" size={24} color="#e16e2b" />
      <Text style={styles.drawerItemText}>Change Password</Text>
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