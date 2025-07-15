import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

const SamvadScreen = () => {
  const [activeMainTab, setActiveMainTab] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  // Separate form data for each tab
  const [formDataByTab, setFormDataByTab] = useState({
    APPEAL: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      postOffice: '',
      taluka: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    APPOINTMENT: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      postOffice: '',
      taluka: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    GRIEVANCE: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      postOffice: '',
      taluka: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
    COMPLAINTS: {
      mobile: '',
      name: '',
      fatherHusbandName: '',
      address: '',
      pincode: '',
      postOffice: '',
      taluka: '',
      district: '',
      state: '',
      purpose: '',
      requestedDate: '',
      declarationAccepted: false,
    },
  });

  const mainTabs = ['APPEAL', 'APPOINTMENT', 'GRIEVANCE', 'COMPLAINTS'];
  const subTabs = ['ADD', 'PREVIEW'];

  // Handle main tab click
  const handleMainTabClick = (tab) => {
    setActiveMainTab(tab);
    setActiveSubTab(null);
  };

  // Get current tab's form data
  const getCurrentFormData = () => activeMainTab ? formDataByTab[activeMainTab] : {};

  const handleChange = (field, value) => {
    if (!activeMainTab) return;
    
    setFormDataByTab(prev => ({
      ...prev,
      [activeMainTab]: {
        ...prev[activeMainTab],
        [field]: value
      }
    }));
  };

  const getFormHeader = () => {
    switch (activeMainTab) {
      case 'APPEAL':
        return 'Raise an Appeal';
      case 'APPOINTMENT':
        return 'Book an Appointment';
      case 'GRIEVANCE':
        return 'Raise a Grievance';
      case 'COMPLAINTS':
        return 'Raise a Complaint';
      default:
        return '';
    }
  };

  const getPurposeLabel = () => {
    switch (activeMainTab) {
      case 'APPEAL':
        return 'DESCRIPTION';
      case 'APPOINTMENT':
        return 'PURPOSE OF MEETING';
      case 'GRIEVANCE':
        return 'DESCRIPTION';
      case 'COMPLAINTS':
        return 'DESCRIPTION';
      default:
        return '';
    }
  };

  const handleSubmit = () => {
    if (!activeMainTab) return;
    
    const currentFormData = getCurrentFormData();
    if (!currentFormData.declarationAccepted) {
      Alert.alert('Error', 'Please accept the declaration to proceed.');
      return;
    }
    
    console.log(`${activeMainTab} form submitted:`, currentFormData);
    Alert.alert('Success', `${activeMainTab} form submitted successfully!`);
  };

  const handleCancel = () => {
    if (!activeMainTab) return;
    
    // Clear only the current tab's form data
    setFormDataByTab(prev => ({
      ...prev,
      [activeMainTab]: {
        mobile: '',
        name: '',
        fatherHusbandName: '',
        address: '',
        pincode: '',
        postOffice: '',
        taluka: '',
        district: '',
        state: '',
        purpose: '',
        requestedDate: '',
        declarationAccepted: false,
      }
    }));
    setFocusedField(null);
    Alert.alert('Cancelled', `${activeMainTab} form has been cleared.`);
  };

  const renderInputField = (
    field,
    label,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    required = false
  ) => {
    const currentFormData = getCurrentFormData();
    const isFocused = focusedField === field;
    const hasValue = currentFormData[field] && currentFormData[field].length > 0;
    
    return (
      <View style={styles.inputContainer}>
        <Text style={[styles.label, required && styles.requiredLabel]}>
          {label}
          {required && <Text style={styles.asterisk}> *</Text>}
        </Text>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasValue && styles.inputWrapperFilled
        ]}>
          <TextInput
            style={[
              styles.input,
              multiline && styles.multilineInput,
              isFocused && styles.inputFocused
            ]}
            value={currentFormData[field] || ''}
            onChangeText={(text) => handleChange(field, text)}
            placeholder={placeholder}
            placeholderTextColor="#999"
            keyboardType={keyboardType}
            multiline={multiline}
            textAlignVertical={multiline ? "top" : "center"}
            onFocus={() => setFocusedField(field)}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>
    );
  };

 const renderCheckbox = () => {
  const currentFormData = getCurrentFormData();
  const isChecked = currentFormData.declarationAccepted;

  return (
    <View style={styles.declarationContainer}>
      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          onPress={() => handleChange('declarationAccepted', !isChecked)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
            {isChecked && <Text style={styles.checkmark}>✓</Text>}
          </View>
        </TouchableOpacity>

        <Text style={styles.declarationText}>
          I hereby declare that the information provided above is true to the best of my knowledge and I'm aware that if any part of information submitted is found to be false, my application will be rejected.
        </Text>
      </View>
    </View>
  );
};

  // Render welcome content when no main tab is selected
  const renderWelcomeContent = () => (
    <ScrollView 
      contentContainerStyle={styles.contentArea}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentCard}>
        <Text style={styles.welcomeTitle}>Welcome to Samvad</Text>
        <Text style={styles.welcomeSubtitle}>
          Please select a category from the tabs above to get started
        </Text>
        <View style={styles.categoryContainer}>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>APPEAL</Text>
            <Text style={styles.categoryDescription}>Submit an appeal for review</Text>
          </View>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>APPOINTMENT</Text>
            <Text style={styles.categoryDescription}>Book a meeting appointment</Text>
          </View>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>GRIEVANCE</Text>
            <Text style={styles.categoryDescription}>Register your grievance</Text>
          </View>
          <View style={styles.categoryItem}>
            <Text style={styles.categoryName}>COMPLAINTS</Text>
            <Text style={styles.categoryDescription}>File a complaint</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  // Render content when main tab is selected but no sub tab is selected
  const renderTabInstructionContent = () => (
    <ScrollView 
      contentContainerStyle={styles.contentArea}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.contentCard}>
        <Text style={styles.instructionTitle}>{getFormHeader()}</Text>
        <Text style={styles.instructionSubtitle}>
          Please select an option from the tabs above
        </Text>
        <View style={styles.instructionContainer}>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionName}>ADD</Text>
            <Text style={styles.instructionDescription}>
              Fill out the form to {activeMainTab === 'APPEAL' ? 'raise an appeal' : 
                                   activeMainTab === 'APPOINTMENT' ? 'book an appointment' :
                                   activeMainTab === 'GRIEVANCE' ? 'register a grievance' : 
                                   'file a complaint'}
            </Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionName}>PREVIEW</Text>
            <Text style={styles.instructionDescription}>
              Review your submitted information
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      
      {/* Main Tabs */}
      <View style={styles.mainTabContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tabRow}>
            {mainTabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => handleMainTabClick(tab)}
                style={[
                  styles.mainTabButton,
                  activeMainTab === tab && styles.activeMainTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.mainTabText,
                    activeMainTab === tab && styles.activeMainTabText,
                  ]}
                >
                  {tab}
                </Text>
                {activeMainTab === tab && <View style={styles.underline} />}
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Sub Tabs - Only show when a main tab is selected */}
      {activeMainTab && (
        <View style={styles.subTabContainer}>
          <View style={styles.tabRow}>
            {subTabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveSubTab(tab)}
                style={[
                  styles.subTabButton,
                  activeSubTab === tab && styles.activeSubTabButton,
                ]}
              >
                <Text
                  style={[
                    styles.subTabText,
                    activeSubTab === tab && styles.activeSubTabText,
                  ]}
                >
                  {tab}
                </Text>
                {activeSubTab === tab && <View style={styles.subUnderline} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Content Area */}
      {!activeMainTab ? (
        renderWelcomeContent()
      ) : !activeSubTab ? (
        renderTabInstructionContent()
      ) : activeSubTab === 'ADD' ? (
        <ScrollView 
          contentContainerStyle={styles.contentArea} 
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>{getFormHeader()}</Text>

            {renderInputField(
              'mobile',
              "Applicant's Mobile No.",
              'Enter 10-digit mobile number',
              'phone-pad',
              false,
              true
            )}

            {activeMainTab === 'APPOINTMENT' && renderInputField(
              'requestedDate',
              'Requested Date of Meeting',
              'DD/MM/YYYY',
              'default',
              false,
              true
            )}

            {renderInputField(
              'purpose',
              getPurposeLabel(),
              'Please describe your purpose in detail...',
              'default',
              true,
              true
            )}

            {renderInputField(
              'name',
              "Applicant's Name",
              'Enter your full name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'fatherHusbandName',
              "Father/Husband's Name",
              'Enter father/husband full name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'address',
              'Address',
              'Enter your complete address',
              'default',
              false,
              true
            )}

            {renderInputField(
              'pincode',
              'Pincode',
              '6-digit pincode',
              'numeric',
              false,
              true
            )}

            {renderInputField(
              'postOffice',
              'Post Office',
              'Enter post office name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'taluka',
              'Taluka',
              'Enter taluka name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'district',
              'District',
              'Enter district name',
              'default',
              false,
              true
            )}

            {renderInputField(
              'state',
              'State',
              'Enter state name',
              'default',
              false,
              true
            )}

            {renderCheckbox()}

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.buttonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.contentArea}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentCard}>
            <Text style={styles.contentText}>Preview Screen for {activeMainTab}</Text>
            <View style={styles.previewContainer}>
              <Text style={styles.previewHeader}>Form Data Preview:</Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Mobile: </Text>
                {getCurrentFormData().mobile || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Name: </Text>
                {getCurrentFormData().name || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Father/Husband's Name: </Text>
                {getCurrentFormData().fatherHusbandName || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Address: </Text>
                {getCurrentFormData().address || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Pincode: </Text>
                {getCurrentFormData().pincode || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Post Office: </Text>
                {getCurrentFormData().postOffice || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Taluka: </Text>
                {getCurrentFormData().taluka || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>District: </Text>
                {getCurrentFormData().district || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>State: </Text>
                {getCurrentFormData().state || 'Not provided'}
              </Text>
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Purpose: </Text>
                {getCurrentFormData().purpose || 'Not provided'}
              </Text>
              {activeMainTab === 'APPOINTMENT' && (
                <Text style={styles.previewText}>
                  <Text style={styles.previewLabel}>Requested Date: </Text>
                  {getCurrentFormData().requestedDate || 'Not provided'}
                </Text>
              )}
              <Text style={styles.previewText}>
                <Text style={styles.previewLabel}>Declaration Accepted: </Text>
                {getCurrentFormData().declarationAccepted ? 'Yes' : 'No'}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fef6f2' 
  },
  mainTabContainer: {
    backgroundColor: '#f56c3aff',
    paddingTop: 12,
    paddingBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tabRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  mainTabButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.2,
    position: 'relative',
  },
  activeMainTabButton: {},
  mainTabText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
    textAlign: 'center',
  },
  activeMainTabText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    opacity: 1 
  },
  underline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 3,
    backgroundColor: '#ffffff',
    borderRadius: 2,
  },
  subTabContainer: {
    backgroundColor: '#f17232',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  subTabButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: width * 0.25,
    position: 'relative',
    borderRadius: 8,
  },
  activeSubTabButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  subTabText: { 
    color: '#ffffff', 
    fontSize: 12, 
    fontWeight: '500', 
    opacity: 0.9 
  },
  activeSubTabText: { 
    color: '#ffffff', 
    fontWeight: 'bold', 
    opacity: 1 
  },
  subUnderline: {
    position: 'absolute',
    bottom: 2,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#ffffff',
    borderRadius: 1,
  },
  contentArea: { 
    flexGrow: 1, 
    justifyContent: 'flex-start', 
    alignItems: 'center', 
    padding: 20,
    paddingTop: 25,
  },
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 15,
    padding: 25,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 5,
    borderLeftColor: '#FF6B35',
  },
  contentText: { 
    fontSize: 20, 
    color: '#333', 
    textAlign: 'center', 
    fontWeight: '600',
    marginBottom: 25,
  },
  
  // Welcome screen styles
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  categoryContainer: {
    width: '100%',
    marginTop: 10,
  },
  categoryItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },

  // Instruction screen styles
  instructionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    textAlign: 'center',
    marginBottom: 15,
  },
  instructionSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  instructionContainer: {
    width: '100%',
    marginTop: 10,
  },
  instructionItem: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    marginBottom: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B35',
  },
  instructionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  instructionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  
  // Input Styles (modified to remove row container)
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  inputWrapper: {
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputWrapperFocused: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperFilled: {
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    fontWeight: '400',
  },
  inputFocused: {
    color: '#000',
  },
  multilineInput: {
    minHeight: 100,
    maxHeight: 120,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    letterSpacing: 0.3,
  },
  requiredLabel: {
    color: '#2c3e50',
  },
  asterisk: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },
  
  // Declaration with checkbox styles
  declarationContainer: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 10,
    marginVertical: 20,
    borderLeftWidth: 9,
    borderLeftColor: '#FF6B35',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
            // Add this for better spacing in modern React Native versions
  paddingRight: 10,
  },
  checkbox: {
    width: 25,
    height: 20,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 6,
    marginRight: 5,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  declarationText: {
    fontSize: 12,
    color: '#555',
    textAlign: 'justify',
    lineHeight: 18,
    fontStyle: 'italic',
    
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 25,
    gap: 15,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  submitButton: {
    backgroundColor: '#FF6B35',
    padding: 16,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  buttonText: { 
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  previewContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 10,
    width: '100%',
    marginTop: 15,
  },
  previewHeader: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    fontSize: 16,
  },
  previewText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  previewLabel: {
    fontWeight: '600',
    color: '#333',
  },
});

export default SamvadScreen;