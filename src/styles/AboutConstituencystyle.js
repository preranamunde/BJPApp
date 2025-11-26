import { StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  
  // Full screen loading/error states
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullLoadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '600',
  },
  fullLoadingSubText: {
    marginTop: 5,
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
  },
  fullErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  fullErrorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  fullErrorText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  fullRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  fullRetryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  
  // Header Styles
  header: {
    backgroundColor: '#e16e2b',
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: Math.min(24, width * 0.06),
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    flexWrap: 'wrap',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 10,
    textAlign: 'center',
  },
  badge: {
    backgroundColor: '#3498db',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginTop: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Admin Edit Buttons
  headerEditButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  editButton: {
    backgroundColor: '#3498db',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  // Card Styles
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
    flex: 1,
  },
  cardContent: {
    padding: 15,
  },
  overviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2c3e50',
    textAlign: 'left',
  },

  // Info Grid Styles
  infoGrid: {
    flexDirection: 'row',
    marginHorizontal: 15,
    marginTop: 15,
    gap: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    minHeight: 140,
  },
  infoIcon: {
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
  },

  // ECI URL Styles
  eciUrlContainer: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#e8f4f8',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3498db',
  },
  eciUrlText: {
    fontSize: 10,
    color: '#3498db',
    textAlign: 'center',
    fontWeight: '600',
  },

  // Header Link Button Styles
  headerLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerLinkText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginRight: 4,
  },

  // Assembly Count Badge
  assemblyCountBadge: {
    backgroundColor: '#2980b9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  assemblyCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Table Styles
  tableContainer: {
    marginBottom: 20,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  tableSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableSubHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
  },
  tableHeaderText: {
    flex: 1,
    padding: 10,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  tableRowEven: {
    backgroundColor: '#f8f9fa',
  },
  totalRow: {
    backgroundColor: '#ecf0f1',
  },
  tableCellLeft: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '500',
  },
  tableCellRight: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'right',
  },
  tableCellCenter: {
    flex: 1,
    padding: 10,
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
    fontWeight: '500',
  },

  // Assembly Segments Styles
  segmentsList: {
    padding: 15,
  },
  segmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
  },
  segmentNumber: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: '#3498db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  segmentNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  segmentInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  segmentName: {
    fontSize: 15,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 1,
  },
  segmentRightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentDistrict: {
    fontSize: 12,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  scBadge: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
  },
  scBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },

  // Loading and Error Styles
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#7f8c8d',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 15,
  },
  retryButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // No Data Styles
  noDataContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  noDataText: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Links Styles
  linksContainer: {
    padding: 15,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  linkContent: {
    flex: 1,
    marginLeft: 12,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  linkDescription: {
    fontSize: 13,
    color: '#7f8c8d',
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
  backgroundColor: '#fff',
  borderRadius: 15,
  width: '90%',
  maxHeight: '80%',  // This limits the height
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  closeButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    maxHeight: 400,
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#27ae60',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Form Styles
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  requiredLabel: {
    color: '#e74c3c',
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#2c3e50',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  // Developer Modal Styles
  devModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    width: '85%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  devModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  devModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  devModalBody: {
    padding: 20,
    alignItems: 'center',
  },
  devIcon: {
    marginBottom: 15,
  },
  devModalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 15,
    textAlign: 'center',
    lineHeight: 20,
  },
  devInput: {
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2c3e50',
    textAlign: 'center',
    width: '100%',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },

  // Section container for edit modals
  sectionContainer: {
    marginBottom: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  // Card header styles for different sections
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
// Replace the existing editButton and deleteButton styles with these:

// Action Button (Three Dots)
actionButton: {
  backgroundColor: 'rgba(60, 66, 60, 0.2)',
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 10,
},

actionButtonText: {
  fontSize: 20,
  color: '#ffffff',
  fontWeight: 'bold',
  lineHeight: 20,
},

// Dropdown Modal Styles
dropdownOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.1)',
},

dropdownMenu: {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderRadius: 8,
  minWidth: 120,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  paddingVertical: 8,
},

dropdownItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 16,
  paddingVertical: 12,
},

dropdownItemIcon: {
  fontSize: 16,
  marginRight: 12,
  width: 20,
},

dropdownItemText: {
  fontSize: 16,
  color: '#2c3e50',
  fontWeight: '500',
},

dropdownDeleteItem: {
  // Optional: add special styling for delete item
},

dropdownDeleteText: {
  color: '#e74c3c',
},

dropdownSeparator: {
  height: 1,
  backgroundColor: '#e9ecef',
  marginHorizontal: 8,
},

headerButtonsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
addAssemblyButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#2980b9',
  padding: 12,
  borderRadius: 8,
  marginBottom: 15,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
addAssemblyButtonText: {
  color: '#fff',
  fontSize: 14,
  fontWeight: '600',
  marginLeft: 8,
},

// Add these to your existing styles
memberInfoContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 15,
  padding: 12,
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
},
memberImage: {
  width: 60,
  height: 60,
  borderRadius: 30,
  borderWidth: 3,
  borderColor: '#fff',
  backgroundColor: '#f5f5f5',
},
memberImagePlaceholder: {
  width: 60,
  height: 60,
  borderRadius: 30,
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 3,
  borderColor: '#fff',
},
memberDetails: {
  flex: 1,
  marginLeft: 12,
},
memberName: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#fff',
  marginBottom: 4,
},
memberParty: {
  fontSize: 14,
  color: '#fff',
  opacity: 0.9,
  fontWeight: '600',
},
infoCardMemberImage: {
  width: 50,
  height: 50,
  borderRadius: 25,
  marginBottom: 8,
  borderWidth: 2,
  borderColor: '#9b59b6',
  backgroundColor: '#f5f5f5',
},
// AC Media Gallery Styles
acMediaContainer: {
  paddingVertical: 10,
  paddingLeft: 15,
  backgroundColor: '#fff',
  borderBottomWidth: 0,
  borderBottomColor: 'transparent',
  marginTop: -15,
},
acMediaScrollContent: {
  paddingRight: 15,
  paddingBottom: 5,
},
acMediaItem: {
  width: 330
  ,
  height: 200,
  marginRight: 15,
  borderRadius: 12,
  backgroundColor: '#ffffff',
  overflow: 'hidden',
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},
acMediaImage: {
  width: '100%',
  height: '100%',
},
acMediaLoadingContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
},
acMediaErrorContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#ffebee',
},
acMediaErrorIcon: {
  fontSize: 40,
  marginBottom: 8,
},
acMediaErrorText: {
  color: '#c62828',
  fontSize: 14,
  textAlign: 'center',
},
acMediaLoadingState: {
  height: 200,
  justifyContent: 'center',
  alignItems: 'center',
},
  // Footer
  footer: {
    height: 30,
  },
  // Add to your stylesheet
acMediaMenuButton: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  borderRadius: 15,
  width: 30,
  height: 30,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
},
acMediaMenuIcon: {
  color: '#fff',
  fontSize: 18,
  fontWeight: 'bold',
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8f9fa',
  padding: 15,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  marginBottom: 15,
  minHeight: 60,  // Add minimum height
},
imageModalContent: {
  backgroundColor: '#fff',
  borderRadius: 15,
  width: '90%',
  maxHeight: '60%',  // Smaller height for image picker
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},

imagePickerText: {
  marginLeft: 10,
  color: '#e16e2b',
  fontWeight: 'bold',
},
selectedImagePreview: {
  alignItems: 'center',
  marginTop: 10,
  marginBottom: 15,  // Add bottom margin
},
previewImage: {
  width: 150,  // Reduced from 200
  height: 150, // Reduced from 200
  borderRadius: 8,
  marginBottom: 10,
},

imageInfoText: {
  fontSize: 12,
  color: '#7f8c8d',
},
addNewBannerCard: {
  width: 325,
  height: 200,
  backgroundColor: '#f8f9fa',
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 15,
},
addNewBannerText: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '600',
  color: '#e16e2b',
},

// For the modal styles (if not already present from MediaCorner):
imageModalContent: {
  width: '90%',
  maxHeight: '70%',
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.3,
  shadowRadius: 10,
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f0f4f8',
  padding: 15,
  borderRadius: 8,
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  marginBottom: 15,
},
imagePickerText: {
  marginLeft: 10,
  color: '#e16e2b',
  fontSize: 16,
  fontWeight: '600',
},
selectedImagePreview: {
  alignItems: 'center',
  marginTop: 10,
  backgroundColor: '#f8f9fa',
  padding: 15,
  borderRadius: 8,
},
previewImage: {
  width: 200,
  height: 200,
  borderRadius: 8,
  marginBottom: 10,
  borderWidth: 2,
  borderColor: '#e16e2b',
},
imageInfoText: {
  fontSize: 12,
  color: '#7f8c8d',
  textAlign: 'center',
},
// Add these to your existing styles
acMediaAddButton: {
  width: 300,
  height: 200,
  marginRight: 15,
  borderRadius: 12,
  backgroundColor: '#f8f9fa',
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: '#e16e2b',
  justifyContent: 'center',
  alignItems: 'center',
},
acMediaAddContent: {
  alignItems: 'center',
  justifyContent: 'center',
},
acMediaAddText: {
  marginTop: 10,
  fontSize: 16,
  fontWeight: '600',
  color: '#e16e2b',
},
// Add these styles to your existing styles object
paginationDots: {
  flexDirection: 'row',
  justifyContent: 'center',
  alignItems: 'center',
  paddingVertical: 10,
  gap: 8,
},
paginationDot: {
  width: 8,
  height: 8,
  borderRadius: 4,
  backgroundColor: '#d1d5db',
},
paginationDotActive: {
  width: 24,
  backgroundColor: '#e16e2b',
},
// Add to your existing styles
// ========================================
// ENHANCED MEMBER IMAGE MODAL STYLES
// ========================================

// Modal Overlay
memberImageModalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.65)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 16,
},

// Modal Card Container
memberImageModalCard: {
  width: '100%',
  maxWidth: 550,
  maxHeight: '90%',
  backgroundColor: '#ffffff',
  borderRadius: 20,
  overflow: 'hidden',
  elevation: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
},

// ========== HEADER STYLES ==========
memberImageModalHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 20,
  backgroundColor: '#f8f9fa',
  borderBottomWidth: 1,
  borderBottomColor: '#e9ecef',
},

memberImageHeaderLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},

memberImageIconCircle: {
  width: 56,
  height: 56,
  borderRadius: 28,
  backgroundColor: '#f3e5f5',
  justifyContent: 'center',
  alignItems: 'center',
  marginRight: 14,
  borderWidth: 2,
  borderColor: '#ce93d8',
},

memberImageTitleSection: {
  flex: 1,
},

memberImageModalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2c3e50',
  marginBottom: 4,
},

memberImageModalSubtitle: {
  fontSize: 13,
  color: '#7f8c8d',
  fontWeight: '500',
},

memberImageCloseButton: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: '#ecf0f1',
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 10,
},

// ========== BODY STYLES ==========
memberImageModalBody: {
  maxHeight: 500,
  backgroundColor: '#ffffff',
},

// Image Comparison Container
memberImageComparisonContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 20,
  backgroundColor: '#fafbfc',
},

memberImageCard: {
  flex: 1,
  backgroundColor: '#ffffff',
  borderRadius: 12,
  padding: 12,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  borderWidth: 1,
  borderColor: '#e9ecef',
},

memberImageCardHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

memberImageCardTitle: {
  fontSize: 12,
  fontWeight: '700',
  color: '#95a5a6',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  marginLeft: 6,
},

memberImagePreviewWrapper: {
  width: '100%',
  aspectRatio: 1,
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: '#f8f9fa',
  position: 'relative',
  borderWidth: 2,
  borderColor: '#e9ecef',
},

memberImagePreview: {
  width: '100%',
  height: '100%',
},

// Badge Styles
memberImageActiveBadge: {
  position: 'absolute',
  bottom: 8,
  left: 8,
  right: 8,
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  borderRadius: 6,
  paddingVertical: 4,
  paddingHorizontal: 8,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
},

memberImageBadgeText: {
  fontSize: 11,
  fontWeight: '700',
  color: '#27ae60',
  marginLeft: 4,
},

memberImageNewBadge: {
  position: 'absolute',
  top: 8,
  right: 8,
  backgroundColor: '#9b59b6',
  borderRadius: 6,
  paddingVertical: 4,
  paddingHorizontal: 8,
  flexDirection: 'row',
  alignItems: 'center',
  elevation: 3,
  shadowColor: '#9b59b6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.4,
  shadowRadius: 3,
},

memberImageNewBadgeText: {
  fontSize: 11,
  fontWeight: 'bold',
  color: '#ffffff',
  marginLeft: 4,
  letterSpacing: 0.5,
},

// Arrow Separator
memberImageArrowSeparator: {
  width: 50,
  alignItems: 'center',
  justifyContent: 'center',
},

memberImageArrowCircle: {
  width: 36,
  height: 36,
  borderRadius: 18,
  backgroundColor: '#f3e5f5',
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#ce93d8',
},

// Placeholder Styles
memberImagePlaceholder: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#fafbfc',
  padding: 16,
},

memberImagePlaceholderTitle: {
  fontSize: 14,
  color: '#9b59b6',
  fontWeight: '700',
  marginTop: 12,
  textAlign: 'center',
},

memberImagePlaceholderSubtitle: {
  fontSize: 11,
  color: '#95a5a6',
  marginTop: 4,
  textAlign: 'center',
},

// ========== INFO CARD STYLES ==========
memberImageInfoCard: {
  margin: 16,
  marginTop: 0,
  backgroundColor: '#e3f2fd',
  borderRadius: 12,
  padding: 14,
  borderLeftWidth: 4,
  borderLeftColor: '#3498db',
},

memberImageInfoHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 10,
},

memberImageInfoTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#2c3e50',
  marginLeft: 8,
},

memberImageInfoRow: {
  flexDirection: 'row',
  alignItems: 'center',
  marginTop: 6,
  paddingLeft: 4,
},

memberImageInfoText: {
  fontSize: 12,
  color: '#5a6c7d',
  marginLeft: 8,
  flex: 1,
},

// ========== GUIDELINES CARD STYLES ==========
memberImageGuidelinesCard: {
  margin: 16,
  marginTop: 0,
  backgroundColor: '#fff8e1',
  borderRadius: 12,
  padding: 14,
  borderLeftWidth: 4,
  borderLeftColor: '#f39c12',
},

memberImageGuidelinesHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  marginBottom: 12,
},

memberImageGuidelinesTitle: {
  fontSize: 14,
  fontWeight: '700',
  color: '#2c3e50',
  marginLeft: 8,
},

memberImageGuidelinesList: {
  paddingLeft: 4,
},

memberImageGuidelineItem: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  marginTop: 8,
},

memberImageGuidelineDot: {
  width: 6,
  height: 6,
  borderRadius: 3,
  backgroundColor: '#f39c12',
  marginTop: 6,
  marginRight: 10,
},

memberImageGuidelineText: {
  fontSize: 12,
  color: '#5a6c7d',
  flex: 1,
  lineHeight: 18,
},

// ========== FOOTER STYLES ==========
memberImageModalFooter: {
  flexDirection: 'row',
  padding: 16,
  gap: 12,
  backgroundColor: '#f8f9fa',
  borderTopWidth: 1,
  borderTopColor: '#e9ecef',
},

memberImageCancelButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  borderRadius: 10,
  backgroundColor: '#ecf0f1',
  borderWidth: 1,
  borderColor: '#bdc3c7',
},

memberImageCancelButtonText: {
  fontSize: 15,
  fontWeight: '700',
  color: '#7f8c8d',
  marginLeft: 8,
},

memberImageSaveButton: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  paddingVertical: 14,
  borderRadius: 10,
  backgroundColor: '#9b59b6',
  elevation: 3,
  shadowColor: '#9b59b6',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},

memberImageSaveButtonDisabled: {
  backgroundColor: '#bdc3c7',
  elevation: 0,
  shadowOpacity: 0,
},

memberImageSaveButtonText: {
  fontSize: 15,
  fontWeight: 'bold',
  color: '#ffffff',
  marginLeft: 8,
},

// ========== MEMBER IMAGE CONTAINER & EDIT BUTTON ==========
memberImageContainer: {
  position: 'relative',
  width: 50,
  height: 50,
  marginBottom: 8,
},

memberImageEditButton: {
  position: 'absolute',
  bottom: 0,
  right: 0,
  backgroundColor: '#9b59b6',
  width: 24,
  height: 24,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  borderWidth: 2,
  borderColor: '#fff',
  elevation: 4,
  shadowColor: '#9b59b6',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.4,
  shadowRadius: 4,
},

});

export default styles;