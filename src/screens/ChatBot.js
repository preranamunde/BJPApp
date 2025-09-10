import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
  PermissionsAndroid,
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import speechToTextService from '../components/SpeechToText';

// Message ID counter to ensure unique keys
let messageIdCounter = 0;

const ChatBot = ({ navigation }) => {
  const [messages, setMessages] = useState([
    {
      id: `bot_${Date.now()}_${++messageIdCounter}`,
      text: "Namaste! I'm your LokSahayak.\nHow can I help you?",
      sender: 'bot',
    },
    {
      id: `bot_${Date.now()}_${++messageIdCounter}`,
      text: 'Choose one of the following options:',
      sender: 'bot',
      replies: [
        'Tell me about my Leader',
        'Tell me about the Constituency',
        'How to Join BJP',
        'Register an Appeal',
        'Book an Appointment',
        'Register a Grievance',
        'Register a Complaints',
        'Address of the Leader with Google Map',
        'Exit LokSahayak',
      ],
    },
  ]);

  const [input, setInput] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef();
  const isMountedRef = useRef(true);
  const isNavigatingRef = useRef(false);

  // Handle speech results only if component is mounted and not navigating
  const handleSpeechResults = (spokenText) => {
    console.log('Speech result:', spokenText);
    
    if (!isMountedRef.current || isNavigatingRef.current) {
      console.log('Component unmounted or navigating, ignoring speech result');
      return;
    }

    setInput(spokenText);
    setIsListening(false);
    
    // Small delay to ensure UI updates before processing
    setTimeout(() => {
      if (isMountedRef.current && !isNavigatingRef.current) {
        handleUserInput(spokenText);
      }
    }, 100);
  };

  // Initialize speech service with focus effect
  useFocusEffect(
    React.useCallback(() => {
      isMountedRef.current = true;
      isNavigatingRef.current = false;

      const initializeSpeech = async () => {
        // Check permissions for Android
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'This app needs access to your microphone to use voice commands.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Microphone permission is required for voice commands.');
            return;
          }
        }

        // Set up speech service callbacks - NO ERROR CALLBACK
        speechToTextService.setOnSpeechResults(handleSpeechResults);

        speechToTextService.setOnSpeechStart(() => {
          console.log('Speech started');
          if (isMountedRef.current) {
            setIsListening(true);
          }
        });

        speechToTextService.setOnSpeechEnd(() => {
          console.log('Speech ended');
          if (isMountedRef.current) {
            setIsListening(false);
          }
        });
      };

      initializeSpeech();

      // Cleanup when screen loses focus
      return () => {
        console.log('ChatBot losing focus, stopping speech and cleaning up');
        isMountedRef.current = false;
        
        // Stop any ongoing speech recognition
        if (speechToTextService.getIsListening()) {
          speechToTextService.stopListening();
        }
        
        // Clear callbacks to prevent processing results after navigation
        speechToTextService.setOnSpeechResults(null);
        speechToTextService.setOnSpeechStart(null);
        speechToTextService.setOnSpeechEnd(null);
        
        setIsListening(false);
      };
    }, [])
  );

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      console.log('ChatBot component unmounting');
      isMountedRef.current = false;
      
      // Stop speech recognition and cleanup
      if (speechToTextService.getIsListening()) {
        speechToTextService.stopListening();
      }
    };
  }, []);

  // Function to reset messages with unique keys
  const resetMessages = () => {
    messageIdCounter = 0; // Reset counter
    setMessages([
      {
        id: `bot_${Date.now()}_${++messageIdCounter}`,
        text: "Namaste! I'm your LokSahayak.\nHow can I help you?",
        sender: 'bot',
      },
      {
        id: `bot_${Date.now()}_${++messageIdCounter}`,
        text: 'Choose one of the following options:',
        sender: 'bot',
        replies: [
          'Tell me about my Leader',
          'Tell me about the Constituency',
          'How to Join BJP',
          'Register an Appeal',
          'Book an Appointment',
          'Register a Grievance',
          'Register a Complaints',
          'Address of the Leader with Google Map',
          'Exit LokSahayak',
        ],
      },
    ]);
  };

  // Function to clear all messages
  const clearMessages = () => {
    setMessages([]);
  };

  // Function to toggle voice
  const toggleVoice = () => {
    setVoiceEnabled(!voiceEnabled);
  };

  // Function to handle voice input
  const handleVoiceInput = async () => {
    if (!isMountedRef.current || isNavigatingRef.current) {
      return;
    }

    if (isListening) {
      // Stop listening
      const stopped = await speechToTextService.stopListening();
      if (stopped && isMountedRef.current) {
        setIsListening(false);
      }
    } else {
      // Start listening - no error handling
      const started = await speechToTextService.startListening();
      if (started && isMountedRef.current) {
        addBotMessage("I'm listening... Speak now!");
        setIsListening(true);
      }
      // No else clause - no error messages
    }
  };

  // Set up header options when component mounts
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 15 }}>
          <TouchableOpacity 
            onPress={toggleVoice}
            style={{ marginHorizontal: 8, padding: 5 }}
          >
            <IonIcon 
              name={voiceEnabled ? "mic" : "mic-off"} 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={clearMessages}
            style={{ marginHorizontal: 8, padding: 5 }}
          >
            <IonIcon 
              name="trash-outline" 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={resetMessages}
            style={{ marginHorizontal: 8, padding: 5 }}
          >
            <IonIcon 
              name="refresh-outline" 
              size={24} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, voiceEnabled]);

  const addBotMessage = (text, replies = null) => {
    if (!isMountedRef.current) return;

    const newMessage = {
      id: `bot_${Date.now()}_${++messageIdCounter}`, // Guaranteed unique key
      text,
      sender: 'bot',
      ...(replies ? { replies } : {}),
    };

    setMessages((prev) => [...prev, newMessage]);
    
    // Scroll after delay
    setTimeout(() => {
      if (isMountedRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleUserInput = (text) => {
    if (!isMountedRef.current) return;

    const lowerText = text.trim().toLowerCase();

    // Add user message first with unique key
    const newMessage = {
      id: `user_${Date.now()}_${++messageIdCounter}`, // Guaranteed unique key
      text: text,
      sender: 'user',
    };
    setMessages((prev) => [...prev, newMessage]);

    let navigateTo = null;
    let response = '';
    let params = {};

    if (lowerText.includes('map') || lowerText.includes('address')) {
      response = "Launching Google Map with the leader's address...";
      setTimeout(() => {
        Linking.openURL(
          'https://www.google.co.in/maps/place/NutanTek+Solutions+LLP/@19.7291131,61.000837,4z/data=!3m1!4b1!4m6!3m5!1s0x390ce5db65f6af0f:0xb29ad5bc8aabd76a!8m2!3d21.0680074!4d82.7525294!16s%2Fg%2F11k6fbjb7n?hl=en&entry=ttu&g_ep=EgoyMDI1MDcxNi4wIKXMDSoASAFQAw%3D%3D'
        );
      }, 800);
    } else if (lowerText.includes('leader')) {
      response = 'Opening the Know Your Leader page...';
      navigateTo = 'KnowYourLeader';
    } else if (lowerText.includes('constituency')) {
      response = 'Opening the About Constituency page...';
      navigateTo = 'AboutConstituency';
    } else if (lowerText.includes('bjp')) {
      response = 'Opening the Join BJP page...';
      navigateTo = 'VisitMyGov';
    } else if (lowerText.includes('appeal')) {
      response = 'Opening the Appeal Registration form...';
      navigateTo = 'SamvadScreen';
      params = { 
        initialTab: 'APPEAL',
        initialSubTab: 'ADD'
      };
    } else if (lowerText.includes('appointment')) {
      response = 'Opening the Appointment Booking form...';
      navigateTo = 'SamvadScreen';
      params = { 
        initialTab: 'APPOINTMENT',
        initialSubTab: 'ADD'
      };
    } else if (lowerText.includes('grievance')) {
      response = 'Opening the Grievance Registration form...';
      navigateTo = 'SamvadScreen';
      params = { 
        initialTab: 'GRIEVANCE',
        initialSubTab: 'ADD'
      };
    } else if (lowerText.includes('complaint')) {
      response = 'Opening the Complaints Registration form...';
      navigateTo = 'SamvadScreen';
      params = { 
        initialTab: 'COMPLAINTS',
        initialSubTab: 'ADD'
      };
    } else if (lowerText.includes('exit')) {
      response = 'Exiting LokSahayak and returning to Home...';
      navigateTo = 'MainDrawer';
    } else {
      response = 'Sorry, I did not understand. Please select a valid option.';
    }

    addBotMessage(response);

    if (navigateTo) {
      // Set navigation flag to prevent further speech processing
      isNavigatingRef.current = true;
      
      // Stop any ongoing speech recognition before navigating
      if (speechToTextService.getIsListening()) {
        speechToTextService.stopListening();
      }
      
      setTimeout(() => {
        if (isMountedRef.current) {
          navigation.navigate(navigateTo, params);
        }
      }, 800);
    }
  };

  const handleSend = () => {
    if (!input.trim() || !isMountedRef.current) return;

    // Process user input for navigation
    handleUserInput(input);
    
    setInput('');
    Keyboard.dismiss();

    setTimeout(() => {
      if (isMountedRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const handleQuickReply = (text) => {
    if (!isMountedRef.current) return;

    // Process user input for navigation
    handleUserInput(text);

    // Scroll after delay
    setTimeout(() => {
      if (isMountedRef.current) {
        flatListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  };

  const renderMessage = ({ item }) => (
    <View
      style={[
        styles.messageContainer,
        item.sender === 'user' && { alignSelf: 'flex-end', backgroundColor: '#dcf8c6' },
      ]}
    >
      <Text style={styles.messageText}>{item.text}</Text>
      {item.replies && (
        <View style={styles.repliesContainer}>
          {item.replies.map((reply, index) => (
            <TouchableOpacity
              key={`reply_${item.id}_${index}`} // Unique key for reply buttons
              style={styles.replyButton}
              onPress={() => handleQuickReply(reply)}
            >
              <Text style={styles.replyText}>{reply}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 30}
      >
        <View style={styles.mainContainer}>
          {/* Messages List */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContainer}
            style={styles.messagesList}
            onContentSizeChange={() => {
              if (isMountedRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true });
              }
            }}
            showsVerticalScrollIndicator={false}
          />

          {/* Input Container */}
          <View style={styles.inputContainer}>
            <TouchableOpacity 
              onPress={handleVoiceInput}
              style={[
                styles.micButton,
                isListening && styles.micButtonActive
              ]}
            >
              <IonIcon 
                name={isListening ? "mic" : "mic-outline"} 
                size={24} 
                color={isListening ? "#fff" : "#e16e2b"} 
              />
            </TouchableOpacity>
            <TextInput
              placeholder="Type your message or use voice"
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              style={styles.input}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity onPress={handleSend} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  mainContainer: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  chatContainer: { 
    padding: 12, 
    flexGrow: 1,
    paddingBottom: 10,
  },
  messageContainer: {
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    maxWidth: '90%',
    backgroundColor: '#f0f0f0',
    borderColor: '#ccc',
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  messageText: { 
    color: '#000', 
    fontSize: 16, 
    marginBottom: 4 
  },
  repliesContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap' 
  },
  replyButton: {
    backgroundColor: '#e16e2b',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    margin: 4,
  },
  replyText: { 
    color: '#fff', 
    fontSize: 14 
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderTopColor: '#ccc',
    borderTopWidth: 1,
    backgroundColor: '#fff',
    minHeight: 70,
    marginBottom: 50,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  micButton: {
    marginHorizontal: 6,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#e16e2b',
    backgroundColor: '#fff',
  },
  micButtonActive: {
    backgroundColor: '#e16e2b',
    borderColor: '#e16e2b',
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#ccc',
    marginHorizontal: 6,
    backgroundColor: '#fff',
    color: '#000',
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  sendButtonText: {
    color: 'white', 
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default ChatBot;