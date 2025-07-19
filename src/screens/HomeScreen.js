import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import FontSizeController from '../components/FontSizeController';
import NotificationIcon from '../components/NotificationIcon';
import { languageData } from '../components/languages';

const HomeScreen = ({ navigation }) => {
  const [fontSize, setFontSize] = useState(16);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isLanguageModalVisible, setIsLanguageModalVisible] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const lang = languageData[selectedLanguage];

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'हिंदी' },
  ];

  const quickActions = [
    { id: 1, title: lang.knowLeader, icon: 'person', screen: 'KnowYourLeader' },
    { id: 2, title: lang.aboutConstituency, icon: 'location-on', screen: 'AboutConstituency' },
    { id: 3, title: lang.partyUpdates, icon: 'update', action: () => Alert.alert(lang.partyUpdates, 'Latest updates coming soon!') },
    { id: 4, title: lang.feedback, icon: 'feedback', action: () => Alert.alert(lang.feedback, 'Feedback form coming soon!') },
  ];

  const handleLanguageSelect = (language) => {
    setSelectedLanguage(language.code);
    setIsLanguageModalVisible(false);
    Alert.alert('Language Changed', `Language changed to ${language.name}`);
  };

  const handleSpeechToText = () => {
    setIsListening(!isListening);
    Alert.alert('Speech Recognition', isListening ? 'Speech recognition stopped' : 'Listening... Speak now!');
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        Alert.alert('Speech Recognition', 'Speech converted to text: "Hello, how are you?"');
      }, 3000);
    }
  };

  const handleQuickAction = (item) => {
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.action) {
      item.action();
    }
  };

  const renderLanguageItem = ({ item }) => (
    <TouchableOpacity
      style={styles.languageItem}
      onPress={() => handleLanguageSelect(item)}>
      <Text style={styles.languageText}>{item.name}</Text>
      {selectedLanguage === item.code && (
        <Icon name="check" size={20} color="#FF6B35" />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => navigation.openDrawer()}>
          <Icon name="menu" size={35} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: 20 }]}>{lang.appTitle}</Text>

        <View style={styles.rightHeaderSection}>
          <TouchableOpacity
            style={[styles.iconButton, isListening && styles.listeningButton]}
            onPress={handleSpeechToText}>
            <Icon
              name={isListening ? "mic" : "mic-none"}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setIsLanguageModalVisible(true)}>
            <Icon name="translate" size={24} color="#fff" />
          </TouchableOpacity>
          <NotificationIcon
            onPress={() => Alert.alert('Notifications', 'You have 3 new notifications!')}
            badgeCount={3}
            iconColor="#fff"
          />
        </View>
      </View>

      <FontSizeController onFontSizeChange={setFontSize} />

      <ScrollView style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={[styles.welcomeTitle, { fontSize: fontSize + 8 }]}>{lang.welcome}</Text>
          <Text style={[styles.welcomeSubtitle, { fontSize: fontSize }]}>{lang.stayConnected}</Text>
        </View>

        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>{lang.quickActions}</Text>
          <View style={styles.quickActionsGrid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.quickActionCard}
                onPress={() => handleQuickAction(item)}
              >
                <Icon name={item.icon} size={32} color="#e16e2b" />
                <Text style={[styles.quickActionText, { fontSize: fontSize - 2 }]}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.newsSection}>
          <Text style={[styles.sectionTitle, { fontSize: fontSize + 2 }]}>{lang.latestNews}</Text>
          <View style={styles.newsCard}>
            <Text style={[styles.newsTitle, { fontSize: fontSize }]}>{lang.partyMeeting}</Text>
            <Text style={[styles.newsDate, { fontSize: fontSize - 2 }]}>{lang.today}</Text>
            <Text style={[styles.newsDescription, { fontSize: fontSize - 2 }]}>
              {selectedLanguage === 'en'
                ? "Join us for the monthly party meeting to discuss upcoming initiatives."
                : "आगामी पहलों पर चर्चा के लिए मासिक पार्टी बैठक में शामिल हों।"}
            </Text>
          </View>

          <View style={styles.newsCard}>
            <Text style={[styles.newsTitle, { fontSize: fontSize }]}>{lang.communityService}</Text>
            <Text style={[styles.newsDate, { fontSize: fontSize - 2 }]}>{lang.tomorrow}</Text>
            <Text style={[styles.newsDescription, { fontSize: fontSize - 2 }]}>
              {selectedLanguage === 'en'
                ? "Participate in our community service initiative in the local area."
                : "स्थानीय क्षेत्र में हमारी सामुदायिक सेवा पहल में भाग लें।"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Icon */}
      <TouchableOpacity
        style={styles.chatButton}
        onPress={() => navigation.navigate('LokSahayak')}>
        <Icon name="chat" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Language Modal */}
      <Modal
        visible={isLanguageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLanguageModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsLanguageModalVisible(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                onPress={() => setIsLanguageModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={languages}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item.code}
              style={styles.languageList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 25,
    backgroundColor: '#e16e2b',
  },
  menuButton: {
    padding: 5,
   
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'left',
   
  },
  rightHeaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  listeningButton: {
    backgroundColor: '#FFE5DB',
  },
  content: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  welcomeSection: {
    backgroundColor: '#e16e2b',
    padding: 20,
    marginBottom: 20,
  },
  welcomeTitle: {
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    color: '#fff',
    opacity: 0.9,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    width: '48%',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickActionText: {
    color: '#333',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  newsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  newsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  newsTitle: {
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  newsDate: {
    color: '#e16e2b',
    marginBottom: 8,
  },
  newsDescription: {
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  languageList: {
    maxHeight: 200,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
  },
  languageText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },

  // Custom Language Icon (A + अ)
  customLanguageIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingTop: 4,
  },
  englishLetter: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginRight: -4,
  },
  marathiCircle: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 4,
  },
  marathiLetter: {
    color: '#FF6B35',
    fontSize: 16,
    fontWeight: 'bold',
    
  },
  chatButton: {
    position: 'absolute',
    bottom: 10, // adjust this based on your bottom tab height
    right: 10,
    backgroundColor: '#e16e2b',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

export default HomeScreen;