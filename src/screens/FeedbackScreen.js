import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import DocumentPicker from 'react-native-document-picker';

const FeedbackScreen = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState('feedback');

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Pick Images
  const handlePickImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1920,
      maxHeight: 1080,
      selectionLimit: 5,
    };

    launchImageLibrary(options, (response) => {
      if (response.assets) {
        const newFiles = response.assets.map(asset => ({
          uri: asset.uri,
          name: asset.fileName,
          type: asset.type || 'image/jpeg',
          fileType: 'image',
        }));
        setSelectedFiles([...selectedFiles, ...newFiles]);
      }
    });
  };

  // Pick PDFs
  const handlePickPDF = async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
        allowMultiSelection: true,
      });

      const newFiles = results.map(file => ({
        uri: file.uri,
        name: file.name,
        type: file.type,
        fileType: file.type.includes('pdf') ? 'pdf' : 'image',
      }));

      setSelectedFiles([...selectedFiles, ...newFiles]);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to pick document');
      }
    }
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  // Validation
  const validateForm = () => {
    if (!selectedType) {
      Alert.alert('Validation Error', 'Please select Feedback or Report Issue');
      return false;
    }

    if (selectedType === 'feedback' && !subject.trim()) {
      Alert.alert('Validation Error', 'Please enter a subject');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please enter a description');
      return false;
    }

    return true;
  };

  // Submit Demo Mode
  const handleSubmit = () => {
    if (!validateForm()) return;
    setSubmitting(true);

    setTimeout(() => {
      Alert.alert(
        '✅ Success',
        `Your ${selectedType} has been submitted successfully! (Demo Mode)`,
        [
          {
            text: 'OK',
            onPress: () => {
              setSelectedType(null);
              setSubject('');
              setDescription('');
              setSelectedFiles([]);
              navigation.goBack();
            },
          },
        ]
      );
      setSubmitting(false);
    }, 1500);
  };

  // Type Buttons (Small Square)
  const renderTypeSelection = () => (
    <View style={styles.typeSelectionRow}>
      <TouchableOpacity
        style={[
          styles.typeBox,
          selectedType === 'feedback' && styles.typeBoxSelected,
        ]}
        onPress={() => setSelectedType('feedback')}
      >
        <Icon
          name="feedback"
          size={28}
          color={selectedType === 'feedback' ? '#fff' : '#e16e2b'}
        />
        <Text
          style={[
            styles.typeBoxText,
            selectedType === 'feedback' && styles.typeBoxTextSelected,
          ]}
        >
          Feedback
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.typeBox,
          selectedType === 'complaint' && styles.typeBoxSelected,
        ]}
        onPress={() => setSelectedType('complaint')}
      >
        <Icon
          name="report-problem"
          size={28}
          color={selectedType === 'complaint' ? '#fff' : '#e16e2b'}
        />
        <Text
          style={[
            styles.typeBoxText,
            selectedType === 'complaint' && styles.typeBoxTextSelected,
          ]}
        >
          Report Issue
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Form UI
  const renderForm = () => {
    if (!selectedType) return null;

    return (
      <View style={styles.formContainer}>
        {selectedType === 'feedback' && (
          <>
            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter subject"
              placeholderTextColor="#999"
            />
          </>
        )}

        <Text style={styles.label}>
          {selectedType === 'complaint'
            ? 'Describe the issue *'
            : 'Your Feedback *'}
        </Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder={
            selectedType === 'complaint'
              ? 'Describe the problem you faced...'
              : 'Write your suggestions...'
          }
          placeholderTextColor="#999"
          multiline
          numberOfLines={6}
        />

        <Text style={styles.label}>Attachments (Optional)</Text>

        <View style={styles.fileButtonsContainer}>
          <TouchableOpacity
            style={styles.fileButton}
            onPress={handlePickImage}
          >
            <Icon name="image" size={24} color="#e16e2b" />
            <Text style={styles.fileButtonText}>Add Images</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.fileButton}
            onPress={handlePickPDF}
          >
            <Icon name="picture-as-pdf" size={24} color="#e16e2b" />
            <Text style={styles.fileButtonText}>Add Files</Text>
          </TouchableOpacity>
        </View>

        {selectedFiles.length > 0 && (
          <View style={styles.filesListContainer}>
            <Text style={styles.filesListTitle}>
              Attached Files ({selectedFiles.length})
            </Text>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Icon
                    name={file.fileType === 'pdf' ? 'picture-as-pdf' : 'image'}
                    size={24}
                    color="#e16e2b"
                  />
                  <Text style={styles.fileName} numberOfLines={1}>
                    {file.name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFile(index)}
                  style={styles.removeFileButton}
                >
                  <Icon name="close" size={20} color="#e74c3c" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.7}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                Submit {selectedType === 'feedback' ? 'Feedback' : 'Issue'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {renderTypeSelection()}
      {renderForm()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  contentContainer: { padding: 20 },

  // Small boxes in one row
  typeSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 20,
  },
  typeBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    width: '45%',
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  typeBoxSelected: {
    backgroundColor: '#e16e2b',
    borderColor: '#e16e2b',
  },
  typeBoxText: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: 'bold',
    marginTop: 8,
  },
  typeBoxTextSelected: {
    color: '#fff',
  },

  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#2c3e50',
    backgroundColor: '#f9f9f9',
    marginBottom: 15,
  },
  textArea: { height: 120, textAlignVertical: 'top' },

  fileButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  fileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff5f0',
    borderWidth: 1,
    borderColor: '#e16e2b',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  fileButtonText: { color: '#e16e2b', fontSize: 14, fontWeight: '600' },

  filesListContainer: { marginTop: 10, marginBottom: 20 },
  filesListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fileInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  fileName: { fontSize: 14, color: '#2c3e50', flex: 1 },
  removeFileButton: { padding: 4 },

  submitButton: {
    backgroundColor: '#e16e2b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 10,
  },
  submitButtonDisabled: { backgroundColor: '#bdc3c7' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default FeedbackScreen;
