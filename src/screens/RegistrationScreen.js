import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const RegistrationScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    photo: null,
    mobileNo: '',
    name: '',
    address: '',
    pincode: '',
    postOffice: '',
    taluka: '',
    district: '',
    state: '',
    facebookId: '',
    instagramId: '',
    xId: '',
    password: '',
    confirmPassword: '',
    declaration: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImagePicker = () => {
    Alert.alert(
      "Select Photo",
      "Image picker functionality will be implemented after proper library installation",
      [
        {
          text: "OK",
          onPress: () => {
            // For now, just set a placeholder
            setFormData(prev => ({
              ...prev,
              photo: 'placeholder'
            }));
          }
        }
      ]
    );
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }
    if (!formData.mobileNo.trim() || formData.mobileNo.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return false;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return false;
    }
    if (!formData.pincode.trim() || formData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return false;
    }
    if (!formData.password.trim() || formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    if (!formData.declaration) {
      Alert.alert('Error', 'Please accept the declaration');
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Here you would typically send the data to your backend
      Alert.alert('Success', 'Registration completed successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]);
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Registration',
      'Are you sure you want to cancel? All entered data will be lost.',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>User Registration</Text>
          <Text style={styles.subtitle}>Create Your Profile</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Photo Upload Section */}
          <View style={styles.photoSection}>
            <Text style={styles.label}>PHOTO *</Text>
            <TouchableOpacity style={styles.photoContainer} onPress={handleImagePicker}>
              {formData.photo === 'placeholder' ? (
                <View style={styles.photoSelectedPlaceholder}>
                  <Icon name="person" size={40} color="#e16e2b" />
                  <Text style={styles.photoText}>Photo Selected</Text>
                </View>
              ) : formData.photo ? (
                <Image source={{ uri: formData.photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Icon name="camera-alt" size={40} color="#e16e2b" />
                  <Text style={styles.photoText}>Upload / Camera</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>MOBILE NO. *</Text>
            <TextInput
              style={styles.input}
              value={formData.mobileNo}
              onChangeText={(text) => handleInputChange('mobileNo', text)}
              placeholder="Enter 10-digit mobile number"
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>NAME *</Text>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={(text) => handleInputChange('name', text)}
              placeholder="Enter your full name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>ADDRESS *</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formData.address}
              onChangeText={(text) => handleInputChange('address', text)}
              placeholder="Enter your complete address"
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PINCODE *</Text>
            <TextInput
              style={styles.input}
              value={formData.pincode}
              onChangeText={(text) => handleInputChange('pincode', text)}
              placeholder="Enter 6-digit pincode"
              keyboardType="numeric"
              maxLength={6}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>POST OFFICE</Text>
            <TextInput
              style={styles.input}
              value={formData.postOffice}
              onChangeText={(text) => handleInputChange('postOffice', text)}
              placeholder="Enter post office name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>TALUKA</Text>
            <TextInput
              style={styles.input}
              value={formData.taluka}
              onChangeText={(text) => handleInputChange('taluka', text)}
              placeholder="Enter taluka name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>DISTRICT</Text>
            <TextInput
              style={styles.input}
              value={formData.district}
              onChangeText={(text) => handleInputChange('district', text)}
              placeholder="Enter district name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>STATE</Text>
            <TextInput
              style={styles.input}
              value={formData.state}
              onChangeText={(text) => handleInputChange('state', text)}
              placeholder="Enter state name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>FACEBOOK ID</Text>
            <TextInput
              style={styles.input}
              value={formData.facebookId}
              onChangeText={(text) => handleInputChange('facebookId', text)}
              placeholder="Enter Facebook ID (optional)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>INSTAGRAM ID</Text>
            <TextInput
              style={styles.input}
              value={formData.instagramId}
              onChangeText={(text) => handleInputChange('instagramId', text)}
              placeholder="Enter Instagram ID (optional)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>X ID</Text>
            <TextInput
              style={styles.input}
              value={formData.xId}
              onChangeText={(text) => handleInputChange('xId', text)}
              placeholder="Enter X ID (optional)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.password}
                onChangeText={(text) => handleInputChange('password', text)}
                placeholder="Enter password (min 6 characters)"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Icon
                  name={showPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>CONFIRM PASSWORD *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                placeholder="Confirm your password"
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Icon
                  name={showConfirmPassword ? 'visibility' : 'visibility-off'}
                  size={24}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Declaration */}
          <View style={styles.declarationContainer}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => handleInputChange('declaration', !formData.declaration)}
            >
              <View style={[styles.checkbox, formData.declaration && styles.checkboxChecked]}>
                {formData.declaration && <Icon name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.declarationText}>
                <Text style={styles.declarationTitle}>DECLARATION: </Text>
                I hereby declare that the information provided above are true to the best of my knowledge and I'm aware that if any part of information submitted is found to be false, my profile will be blocked.
              </Text>
            </TouchableOpacity>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  formContainer: {
    padding: 20,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  photo: {
    width: 116,
    height: 116,
    borderRadius: 58,
  },
  photoSelectedPlaceholder: {
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
  },
  photoText: {
    marginTop: 5,
    fontSize: 12,
    color: '#e16e2b',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 15,
  },
  declarationContainer: {
    marginVertical: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderRadius: 4,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#e16e2b',
  },
  declarationText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  declarationTitle: {
    fontWeight: 'bold',
    color: '#e16e2b',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 30,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e16e2b',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e16e2b',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#e16e2b',
    borderRadius: 8,
    padding: 15,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default RegistrationScreen;