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
} from 'react-native';
import IonIcon from 'react-native-vector-icons/Ionicons';
import { Linking } from 'react-native';

const ChatBot = ({ navigation }) => {
  const [messages, setMessages] = useState([
    {
      id: '1',
      text: "Namaste! I'm your LokSahayak.\nHow can I help you?",
      sender: 'bot',
    },
    {
      id: '2',
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
  const flatListRef = useRef();

  // Function to reset messages
  const resetMessages = () => {
    setMessages([
      {
        id: '1',
        text: "Namaste! I'm your LokSahayak.\nHow can I help you?",
        sender: 'bot',
      },
      {
        id: '2',
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
    const newMessage = {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      ...(replies ? { replies } : {}),
    };

    setMessages((prev) => [...prev, newMessage]);
    
    // Scroll after delay
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleUserInput = (text) => {
    const lowerText = text.trim().toLowerCase();

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
      setTimeout(() => navigation.navigate(navigateTo, params), 800);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newMessage]);
    
    // Process user input for navigation
    handleUserInput(input);
    
    setInput('');
    Keyboard.dismiss();

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickReply = (text) => {
    const newMessage = {
      id: Date.now().toString(),
      text,
      sender: 'user',
    };

    setMessages((prev) => [...prev, newMessage]);

    // Process user input for navigation
    handleUserInput(text);

    // Scroll after delay
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
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
              key={index}
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
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          />

          {/* Input Container */}
          <View style={styles.inputContainer}>
            <IonIcon name="mic" size={24} color="#e16e2b" style={styles.micIcon} />
            <TextInput
              placeholder="Type your message"
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
  micIcon: {
    marginHorizontal: 6
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