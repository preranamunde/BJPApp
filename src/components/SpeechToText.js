import Voice from '@react-native-voice/voice';

class SpeechToTextService {
  constructor() {
    this.isListening = false;
    this.onSpeechResults = null;
    this.onSpeechError = null;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
    this.isInitialized = false;
        
    // Bind Voice events
    this.initializeVoice();
  }

  initializeVoice = () => {
    try {
      Voice.onSpeechStart = this.onSpeechStartHandler.bind(this);
      Voice.onSpeechEnd = this.onSpeechEndHandler.bind(this);
      Voice.onSpeechResults = this.onSpeechResultsHandler.bind(this);
      Voice.onSpeechError = this.onSpeechErrorHandler.bind(this);
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing Voice service:', error);
    }
  };

  // Event handlers
  onSpeechStartHandler = (e) => {
    console.log('Voice onSpeechStart:', e);
    this.isListening = true;
    if (this.onSpeechStart) {
      this.onSpeechStart(e);
    }
  };

  onSpeechEndHandler = (e) => {
    console.log('Voice onSpeechEnd:', e);
    this.isListening = false;
    if (this.onSpeechEnd) {
      this.onSpeechEnd(e);
    }
  };

  onSpeechResultsHandler = (e) => {
    console.log('Voice onSpeechResults:', e);
    if (this.onSpeechResults && e.value && e.value.length > 0) {
      const spokenText = e.value[0];
      this.onSpeechResults(spokenText);
    }
  };

  onSpeechErrorHandler = (e) => {
    console.log('Voice onSpeechError:', e);
    this.isListening = false;
    
    // Don't trigger error callback for certain codes
    const ignorableErrors = ['7', '8', '9']; // No match, busy, insufficient permissions handled elsewhere
    
    if (this.onSpeechError && !ignorableErrors.includes(e.error?.code?.toString())) {
      this.onSpeechError(e);
    }
  };

  // Set callback functions - with safety checks
  setOnSpeechResults = (callback) => {
    this.onSpeechResults = callback;
  };

  setOnSpeechError = (callback) => {
    this.onSpeechError = callback;
  };

  setOnSpeechStart = (callback) => {
    this.onSpeechStart = callback;
  };

  setOnSpeechEnd = (callback) => {
    this.onSpeechEnd = callback;
  };

  // Clear all callbacks
  clearCallbacks = () => {
    this.onSpeechResults = null;
    this.onSpeechError = null;
    this.onSpeechStart = null;
    this.onSpeechEnd = null;
  };

  // Start listening
  startListening = async () => {
    try {
      if (!this.isInitialized) {
        this.initializeVoice();
      }

      if (this.isListening) {
        console.log('Already listening, stopping first...');
        await this.stopListening();
        // Small delay to ensure clean state
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('Starting voice recognition...');
      await Voice.start('en-US'); // You can change to 'hi-IN' for Hindi
      return true;
    } catch (error) {
      console.error('Error starting voice recognition:', error);
      this.isListening = false;
      
      if (this.onSpeechError) {
        this.onSpeechError({
          error: {
            code: '99',
            message: 'Failed to start speech recognition'
          }
        });
      }
      return false;
    }
  };

  // Stop listening
  stopListening = async () => {
    try {
      if (!this.isListening) {
        console.log('Not currently listening');
        return true;
      }
      
      console.log('Stopping voice recognition...');
      await Voice.stop();
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Error stopping voice recognition:', error);
      this.isListening = false; // Reset state even if stop fails
      return false;
    }
  };

  // Cancel listening (more forceful than stop)
  cancelListening = async () => {
    try {
      if (this.isListening) {
        console.log('Canceling voice recognition...');
        await Voice.cancel();
      }
      this.isListening = false;
      return true;
    } catch (error) {
      console.error('Error canceling voice recognition:', error);
      this.isListening = false;
      return false;
    }
  };

  // Check if currently listening
  getIsListening = () => {
    return this.isListening;
  };

  // Destroy voice instance
  destroy = async () => {
    try {
      console.log('Destroying voice service...');
      
      // Cancel any ongoing recognition
      if (this.isListening) {
        await this.cancelListening();
      }
      
      // Clear callbacks
      this.clearCallbacks();
      
      // Destroy Voice instance
      if (Voice) {
        await Voice.destroy();
        Voice.removeAllListeners();
      }
      
      this.isInitialized = false;
      console.log('Voice service destroyed successfully');
    } catch (error) {
      console.error('Error destroying voice service:', error);
    }
  };

  // Check if speech recognition is available
  isAvailable = async () => {
    try {
      const available = await Voice.isAvailable();
      return available;
    } catch (error) {
      console.error('Error checking voice availability:', error);
      return false;
    }
  };

  // Get supported locales
  getSupportedLocales = async () => {
    try {
      const locales = await Voice.getSupportedLocales();
      return locales;
    } catch (error) {
      console.error('Error getting supported locales:', error);
      return [];
    }
  };
}

// Create and export a singleton instance
const speechToTextService = new SpeechToTextService();
export default speechToTextService;