import React, { useState, useEffect, useRef } from 'react';
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
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        let normalizedUrl = imageUrl;
        
        if (normalizedUrl.includes('ngrok-free.app:')) {
          normalizedUrl = normalizedUrl.replace(/:(\d+)\//, '/');
        }
        
        if (normalizedUrl.includes('localhost:5000') || normalizedUrl.includes('localhost:')) {
          const baseUrl = await ConfigService.getBaseUrl();
          normalizedUrl = normalizedUrl.replace(/http:\/\/localhost:\d+/, baseUrl);
        }
        
        const isAccessible = await this.testImageUrl(normalizedUrl);
        if (isAccessible) {
          return normalizedUrl;
        }
      }
      
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
  
  const pollingIntervalRef = useRef(null);
  const lastCheckTimeRef = useRef(0);
  const isLoadingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  // ✅ Load user data IMMEDIATELY on mount - TRIPLE LOAD for reliability
  useEffect(() => {
    console.log('🎯 CustomDrawer mounted - TRIPLE IMMEDIATE LOAD');
    isMountedRef.current = true;
    
    // Load THREE times immediately for maximum reliability
    loadUserDataImmediate();
    setTimeout(() => loadUserDataImmediate(), 50);
    setTimeout(() => loadUserDataImmediate(), 150);
    
    // Start aggressive polling
    startPolling();
    
    // Navigation listeners for live updates
    const unsubscribe = navigation.addListener('state', () => {
      console.log('🔄 Navigation changed - reload');
      loadUserDataImmediate();
    });

    const focusUnsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 Drawer focused - reload');
      loadUserDataImmediate();
    });
    
    const drawerUnsubscribe = navigation.addListener('drawerOpen', () => {
      console.log('🚪 Drawer opened - FORCE reload');
      loadUserDataImmediate();
    });
    
    // Global refresh function that can be called from anywhere
    global.refreshDrawer = () => {
      console.log('🌍 Global refresh called');
      loadUserDataImmediate();
    };

    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      unsubscribe();
      focusUnsubscribe();
      drawerUnsubscribe();
      global.refreshDrawer = null;
    };
  }, [navigation]);
  
  // ✅ Start VERY aggressive polling
  const startPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    let pollCount = 0;
    
    // ULTRA FAST polling for first 5 seconds (30ms intervals)
    pollingIntervalRef.current = setInterval(() => {
      pollCount++;
      
      if (pollCount <= 166) { // First 5 seconds at 30ms
        checkLoginStatus();
      } else {
        // After 5 seconds, switch to slower polling (500ms)
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = setInterval(() => {
          checkLoginStatus();
        }, 500);
        console.log('🔄 Switched to slower polling (500ms)');
      }
    }, 30); // 30ms for ultra-fast detection
  };
  
  // ✅ Stop polling once data is fully loaded
  useEffect(() => {
    if (isUserLoggedIn && 
        userName && 
        userName !== 'Guest User' && 
        userName !== 'User' && 
        userName.trim() !== '') {
      console.log('✅ User data CONFIRMED loaded:', userName, 'Mobile:', userMobile);
      
      // Stop aggressive polling after data is confirmed
      setTimeout(() => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          // Switch to very slow background polling (every 10 seconds)
          pollingIntervalRef.current = setInterval(() => {
            checkLoginStatus();
          }, 10000);
          console.log('✅ Switched to background polling (10s)');
        }
      }, 2000);
    }
  }, [isUserLoggedIn, userName, userMobile]);

  // ✅ IMMEDIATE loading function - no delays, no locks
  const loadUserDataImmediate = async () => {
    if (!isMountedRef.current) return;
    
    try {
      await checkLoginStatus();
    } catch (error) {
      console.error('❌ Error in immediate load:', error);
    }
  };

  const checkLoginStatus = async () => {
    try {
      if (!isMountedRef.current) return;
      
      // Light debounce - only prevent spam (reduced to 20ms)
      const now = Date.now();
      if (now - lastCheckTimeRef.current < 20) return;
      lastCheckTimeRef.current = now;

      // Check ALL possible sources for login status
      const loginStatus = await AsyncStorage.getItem('isLoggedin');
      const accessToken = await AsyncStorage.getItem('access_token');
      const userEmail = await AsyncStorage.getItem('userEmail');
      
      const isLoggedIn = loginStatus === 'TRUE' || 
                         loginStatus === 'true' || 
                         global.isUserLoggedin === true ||
                         !!accessToken ||
                         !!userEmail;
      
      if (isMountedRef.current) {
        setIsUserLoggedIn(isLoggedIn);
        
        if (isLoggedIn) {
          await loadUserData();
        } else {
          setUserName('Guest User');
          setUserPhoto(null);
          setUserMobile('');
        }
      }
    } catch (error) {
      console.error('❌ Error checking login:', error);
      if (isMountedRef.current) {
        setIsUserLoggedIn(false);
      }
    }
  };

  const loadUserData = async () => {
    try {
      if (!isMountedRef.current) return;
      
      let userData = null;
      let dataSource = '';
      
      console.log('📊 Loading user data - checking all sources...');
      
      // ✅ PRIORITY 1: Global variables (INSTANT - no async delay)
      if (global.currentUser && global.currentUser.name) {
        userData = global.currentUser;
        dataSource = 'global.currentUser';
        console.log('✅ Source: global.currentUser');
      }
      // ✅ PRIORITY 2: Individual global variables
      else if (global.currentUserName && global.currentUserName !== 'User') {
        userData = {
          name: global.currentUserName,
          email: global.currentUserEmail,
          mobile: global.currentUserMobile,
          mobileNo: global.currentUserMobile,
          profile_image: global.currentUserProfileImage
        };
        dataSource = 'global variables';
        console.log('✅ Source: global variables');
      }
      
      // ✅ PRIORITY 3: AsyncStorage - try MULTIPLE keys
      if (!userData || !userData.name || userData.name === 'User') {
        console.log('⏳ Checking AsyncStorage...');
        
        // Try userData key
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          try {
            const parsedData = JSON.parse(userDataStr);
            if (parsedData.name && parsedData.name !== 'User') {
              userData = parsedData;
              dataSource = 'AsyncStorage userData';
              console.log('✅ Source: AsyncStorage userData');
            }
          } catch (e) {
            console.error('Parse error userData:', e);
          }
        }
        
        // Try userProfile key (backup)
        if (!userData || !userData.name || userData.name === 'User') {
          const userProfileStr = await AsyncStorage.getItem('userProfile');
          if (userProfileStr) {
            try {
              const parsedData = JSON.parse(userProfileStr);
              if (parsedData.name && parsedData.name !== 'User') {
                userData = parsedData;
                dataSource = 'AsyncStorage userProfile';
                console.log('✅ Source: AsyncStorage userProfile');
              }
            } catch (e) {
              console.error('Parse error userProfile:', e);
            }
          }
        }
        
        // Try individual AsyncStorage keys as last resort
        if (!userData || !userData.name || userData.name === 'User') {
          const storedName = await AsyncStorage.getItem('userName');
          const storedEmail = await AsyncStorage.getItem('userEmail');
          const storedMobile = await AsyncStorage.getItem('userMobile');
          
          if (storedName && storedName !== 'User' && storedName.trim() !== '') {
            userData = {
              name: storedName,
              email: storedEmail,
              mobile: storedMobile,
              mobileNo: storedMobile
            };
            dataSource = 'AsyncStorage individual keys';
            console.log('✅ Source: AsyncStorage individual keys');
          }
        }
      }
      
      // ✅ Process and display user data
      if (userData && userData.name && userData.name !== 'User' && isMountedRef.current) {
        const name = userData.name || userData.fullName || userData.username || '';
        
        // Don't show if name is still 'User' or empty
        if (!name || name === 'User' || name.trim() === '') {
          console.log('⚠️ Invalid name, keeping Guest User');
          return;
        }
        
        // ✅ Check ALL possible mobile field names
        const mobile = userData.mobile || 
                       userData.mobileNo || 
                       userData.mobile_no || 
                       userData.mobileNumber || 
                       userData.mobile_number || 
                       userData.phone || 
                       userData.phoneNumber || 
                       userData.contact ||
                       '';
        
        console.log('✅ Drawer data READY:', {
          source: dataSource,
          name: name,
          mobile: mobile,
          hasImage: !!userData.profile_image
        });
        
        // ✅ UPDATE STATE IMMEDIATELY
        setUserName(name);
        setUserMobile(mobile);
        
        // ✅ Update global variables for faster subsequent loads
        global.currentUser = userData;
        global.currentUserName = name;
        global.currentUserEmail = userData.email || global.currentUserEmail;
        global.currentUserMobile = mobile;
        
        // ✅ Handle profile image
        if (userData.profile_image && userData.profile_image !== 'placeholder') {
          if (userData.profile_image.startsWith('http://') || 
              userData.profile_image.startsWith('https://') ||
              userData.profile_image.startsWith('file://') ||
              userData.profile_image.startsWith('content://')) {
            
            global.currentUserProfileImage = userData.profile_image;
            
            if (isMountedRef.current) {
              setUserPhoto(userData.profile_image);
            }
          } else {
            // Try to resolve the image URL
            const workingImageUrl = await DrawerImageService.getWorkingImageUrl(userData.profile_image);
            if (workingImageUrl && isMountedRef.current) {
              global.currentUserProfileImage = workingImageUrl;
              setUserPhoto(workingImageUrl);
            }
          }
        }
      } else {
        console.log('⚠️ No valid user data found anywhere');
        if (isMountedRef.current) {
          setUserName('Guest User');
          setUserPhoto(null);
          setUserMobile('');
        }
      }
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      if (isMountedRef.current) {
        setUserName('Guest User');
        setUserPhoto(null);
        setUserMobile('');
      }
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
              console.log("🔄 Starting logout...");
              
              const refreshToken = await AsyncStorage.getItem('refresh_token');
              
              if (!refreshToken) {
                console.warn('⚠️ No refresh token, clearing local data...');
                await AuthService.clearTokens();
                
                // Clear ALL global variables
                global.currentUser = null;
                global.currentUserName = null;
                global.currentUserEmail = null;
                global.currentUserMobile = null;
                global.currentUserProfileImage = null;
                global.isUserLoggedin = false;
                global.isUserAdmin = false;
                
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
                return;
              }

              const logoutResult = await AuthService.logout();
              
              if (logoutResult.success) {
                console.log("✅ Logout successful");
                Alert.alert('Logout Successful', 'You have been logged out successfully.');
              }

              // Clear ALL global variables
              global.currentUser = null;
              global.currentUserName = null;
              global.currentUserEmail = null;
              global.currentUserMobile = null;
              global.currentUserProfileImage = null;
              global.isUserLoggedin = false;
              global.isUserAdmin = false;

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              
            } catch (error) {
              console.error("❌ Logout error:", error);
              await AuthService.clearTokens();
              
              // Clear ALL global variables
              global.currentUser = null;
              global.currentUserName = null;
              global.currentUserEmail = null;
              global.currentUserMobile = null;
              global.currentUserProfileImage = null;
              global.isUserLoggedin = false;
              global.isUserAdmin = false;
              
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
              Alert.alert('Logout', 'Logout completed.');
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
      await Share.share({
        message: 'Check out this amazing political app! Download it now: https://www.nutantek.com',
        title: 'Share App',
      });
    } catch (error) {
      console.error('Error sharing:', error.message);
    }
  };

  const handleRateUs = () => {
    Alert.alert(
      'Rate Us',
      'Thank you for using our app!',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Rate Now', 
          onPress: () => {
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
          { text: 'Login', onPress: () => navigation.navigate('Login') },
          { text: 'Register', onPress: () => navigation.navigate('Registration') },
        ]
      );
    }
  };

  const renderProfileImage = () => {
    if (userPhoto && userPhoto !== 'placeholder') {
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
                console.log('🖼️ Image error:', error.nativeEvent?.error);
                setUserPhoto(null);
              }}
              onLoad={() => console.log('✅ Image loaded successfully')}
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

        <TouchableOpacity
          style={styles.drawerItem}
          onPress={() => navigation.navigate('ViewProfile')}
        >
          <Icon name="account-circle" size={24} color="#e16e2b" />
          <Text style={styles.drawerItemText}>View Profile</Text>
        </TouchableOpacity>

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