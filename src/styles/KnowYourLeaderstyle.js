import { StyleSheet ,Dimensions} from "react-native";

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  
  loadingCard: {
    backgroundColor: '#ffffff',
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },

  // Modern Header
  modernHeader: {
    backgroundColor: '#e16e2b',
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  
  headerPattern: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  patternCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  
  headerContent: {
    zIndex: 1,
  },
  
  profileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#27ae60',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  
  basicInfo: {
    flex: 1,
    paddingTop: 5,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  nameContainer: {
    flex: 1,
  },
  
  leaderName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  
  designation: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    marginBottom: 8,
  },
  
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  
  locationText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },
  
  partyContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 10,
    marginBottom: 15,
  },
  
  partyName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 15,
  },
  
  quickAction: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  quickActionIcon: {
    fontSize: 20,
  },

  // Enhanced Edit Button
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  editButtonActive: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.5)',
  },
  
  editButtonText: {
    fontSize: 16,
  },

  // Developer Modal Styles (updated)
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
  devModalCloseButton: {
    backgroundColor: '#e74c3c',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devModalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devModalBody: {
    padding: 20,
  },
  devModalDescription: {
    fontSize: 14,
    color: '#7f8c8d',
    lineHeight: 20,
    textAlign: 'left',
  },
  devModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 10,
  },
  devModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 45,
  },
  devCancelButton: {
    backgroundColor: '#95a5a6',
  },
  devCancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  devSaveButton: {
    backgroundColor: '#27ae60',
  },
  devSaveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Segmented Control
  segmentedContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 25,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  
  segmentButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 21,
  },
  
  activeSegment: {
    backgroundColor: '#e16e2b',
  },
  
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  
  activeSegmentText: {
    color: '#ffffff',
  },

  // Content Area
  contentArea: {
  paddingHorizontal: 20,
  paddingTop: -0,      // ADD THIS - removes top padding
  paddingBottom: 10,
},

  // Info Cards
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cardIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  cardHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  cardAccent: {
    width: 4,
    height: 30,
    backgroundColor: '#e16e2b',
    borderRadius: 2,
  },
  
  cardBody: {
    padding: 20,
  },

  // Info Rows
  infoRows: {
    gap: 12,
  },
  
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  
  infoLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    fontWeight: '500',
    flex: 1,
  },
  
  infoValue: {
    fontSize: 14,
    color: '#2c3e50',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },

  // Education
  educationList: {
    gap: 16,
  },
  
  educationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  educationLeft: {
    marginRight: 15,
    alignItems: 'center',
  },
  
  educationNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e16e2b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  educationNumberText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  educationRight: {
    flex: 1,
  },
  
  educationDegree: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  
  educationInstitute: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  
  educationPlace: {
    fontSize: 12,
    color: '#95a5a6',
  },

  educationEditContainer: {
    marginLeft: 10,
    justifyContent: 'center',
  },
  
  addEducationButton: {
    backgroundColor: '#e16e2b',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  
  addEducationText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Contact Sections
  contactSections: {
    gap: 20,
  },
  
  contactSection: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },
  
  contactSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  
  contactSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  
  addressLine: {
    fontSize: 14,
    color: '#495057',
    marginBottom: 6,
    lineHeight: 20,
  },
  
  contactButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  
  contactBtn: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  
  contactBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Social Media
  socialGrid: {
    gap: 12,
  },
  
  socialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  
  socialIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  
  socialInfo: {
    flex: 1,
  },
  
  socialPlatform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 2,
  },
  
  socialHandle: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  
  socialArrow: {
    fontSize: 18,
    color: '#e16e2b',
    fontWeight: 'bold',
  },

  // Timeline
  timelineContainer: {
    paddingVertical: 10,
  },
  
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  
  timelineItemLeft: {
    alignItems: 'center',
    marginRight: 15,
    minWidth: 80,
  },
  
  timelineDateContainer: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 10,
    minWidth: 70,
  },
  
  timelineDate: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  timelineConnector: {
    alignItems: 'center',
    flex: 1,
  },
  
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#e16e2b',
    marginBottom: 5,
  },
  
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e9ecef',
    minHeight: 30,
  },
  
  timelineItemRight: {
    flex: 1,
    paddingTop: 5,
  },
  
  timelineContentCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderLeftWidth: 4,
    borderLeftColor: '#e16e2b',
  },

  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  
  timelineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    lineHeight: 22,
    flex: 1,
  },
  
  timelineDetails: {
    fontSize: 14,
    color: '#495057',
    lineHeight: 20,
  },

  timelineAdditionalInfo: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 18,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
    opacity: 0.5,
  },
  
  emptyStateText: {
    fontSize: 16,
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
  },

  // Edit Modal Styles
  editModalContainer: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },

  editModalContent: {
    flex: 1,
  },

  editModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },

  editModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalCloseText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },

  editModalTitleContainer: {
    alignItems: 'center',
  },

  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },

  editModalSaveButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  editModalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  editModalBody: {
    flex: 1,
    padding: 20,
  },

  editFormContainer: {
    gap: 20,
  },

  editSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },

  editInputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  editInputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 8,
  },

  editInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#495057',
    backgroundColor: '#f8f9fa',
    textAlignVertical: 'top',
  },

  noEditableFieldsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  noEditableFieldsText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  noEditableFieldsSubText: {
    fontSize: 12,
    color: '#95a5a6',
    textAlign: 'center',
    fontStyle: 'italic',
  },
// Delete Button
deleteButton: {
  backgroundColor: 'rgba(255,255,255,0.2)',
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 8,
},

deleteButtonActive: {
  backgroundColor: 'rgba(220,53,69,0.3)',
  borderWidth: 1,
  borderColor: 'rgba(220,53,69,0.5)',
},

deleteButtonText: {
  fontSize: 16,
},

headerButtonsContainer: {
  flexDirection: 'row',
  alignItems: 'center',
},
// Add these styles to your stylesheet before bottomSpacing:
// Update your existing addEducationButton to include flexDirection and icon support
addEducationButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#e16e2b',
  paddingVertical: 12,
  paddingHorizontal: 16,
  borderRadius: 8,
  marginTop: 16,
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
},

// Add these new styles
addEducationIcon: {
  fontSize: 18,
  color: '#fff',
  fontWeight: 'bold',
  marginRight: 8,
},

infoContainer: {
  backgroundColor: '#f8f9fa',
  padding: 12,
  borderRadius: 8,
  marginTop: 16,
  borderLeftWidth: 3,
  borderLeftColor: '#e16e2b',
},

infoText: {
  fontSize: 14,
  color: '#6c757d',
  fontStyle: 'italic',
  lineHeight: 20,
},
// Action Button (three dots)
actionButton: {
  backgroundColor: 'rgba(29, 32, 27, 0.2)',
  width: 36,
  height: 36,
  borderRadius: 18,
  justifyContent: 'center',
  alignItems: 'center',
  marginLeft: 8,
},

actionButtonText: {
  fontSize: 18,
  color: '#ffffff',
  fontWeight: 'bold',
  lineHeight: 20,
},

// Dropdown Modal
dropdownOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.3)',
},

dropdownMenu: {
  position: 'absolute',
  backgroundColor: '#ffffff',
  borderRadius: 12,
  paddingVertical: 8,
  minWidth: 120,
  elevation: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 8,
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
  textAlign: 'center',
},

dropdownItemText: {
  fontSize: 16,
  color: '#2c3e50',
  fontWeight: '500',
},

dropdownSeparator: {
  height: 1,
  backgroundColor: '#e9ecef',
  marginHorizontal: 8,
},

dropdownDeleteItem: {
  // Additional styling for delete item if needed
},

dropdownDeleteText: {
  color: '#dc3545',
},
// Add these styles to your existing stylesheet
educationNavHeader: {
  marginBottom: 20,
},

navigationControls: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 15,
  backgroundColor: '#f8f9fa',
  borderRadius: 12,
  padding: 12,
},

navButton: {
  backgroundColor: '#e16e2b',
  paddingHorizontal: 16,
  paddingVertical: 8,
  borderRadius: 20,
  minWidth: 80,
  alignItems: 'center',
},

navButtonDisabled: {
  backgroundColor: '#e9ecef',
},

navButtonText: {
  color: '#ffffff',
  fontSize: 14,
  fontWeight: '600',
},

navButtonTextDisabled: {
  color: '#6c757d',
},

navIndicator: {
  backgroundColor: '#ffffff',
  paddingHorizontal: 12,
  paddingVertical: 6,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#e9ecef',
},

navIndicatorText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#2c3e50',
},
  // Bottom Spacing
  bottomSpacing: {
    height: 30,
  },
  actionButtonsContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },

  // Delete button for individual education entry
  deleteEducationButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },

  deleteEducationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced navigation styles (these should already exist in your stylesheet)
  educationNavHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },

  navigationControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  navButton: {
    backgroundColor: '#e16e2b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },

  navButtonDisabled: {
    backgroundColor: '#e9ecef',
  },

  navButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  navButtonTextDisabled: {
    color: '#6c757d',
  },

  navIndicator: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

 

kylMediaContainer: {
  paddingVertical: 10,  // Changed from 20 to 0
  paddingLeft: 15,
  backgroundColor: '#fff',  // Changed from '#f8f9fa' to match header color
  borderBottomWidth: 0,  // Changed from 1 to 0 (removes white line)
  borderBottomColor: 'transparent',  // Make it transparent
  marginTop: -15,  // Add negative margin to move it closer to header
},
kylMediaHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: 15,
  paddingRight: 15,
},
kylMediaTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#2c3e50',
},
kylMediaCount: {
  fontSize: 14,
  color: '#7f8c8d',
  fontWeight: '500',
},
kylMediaScrollContent: {
  paddingRight: 15,
  paddingBottom: 5,
},
kylMediaItem: {
  width: 330,
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
kylMediaImage: {
  width: '100%',
  height: '100%',
},
kylMediaLoadingContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#f0f0f0',
},
kylMediaErrorContainer: {
  width: '100%',
  height: '100%',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#ffebee',
},
kylMediaErrorIcon: {
  fontSize: 40,
  marginBottom: 8,
},
kylMediaErrorText: {
  color: '#c62828',
  fontSize: 14,
  textAlign: 'center',
},
kylMediaCaptionContainer: {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  paddingVertical: 10,
  paddingHorizontal: 12,
},
kylMediaCaption: {
  color: '#ffffff',
  fontSize: 13,
  fontWeight: '500',
  lineHeight: 18,
},
kylMediaLoadingState: {
  height: 200,
  justifyContent: 'center',
  alignItems: 'center',
},
loadingText: {
  marginTop: 10,
  fontSize: 14,
  color: '#666',
},
  navIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },

  // Add these to your existing styles
kylMediaMenuButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
kylMediaMenuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 18,
},
// Modal styles (add these to your existing styles)
modalOverlay: { 
  flex: 1, 
  backgroundColor: 'rgba(0, 0, 0, 0.5)', 
  justifyContent: 'center', 
  alignItems: 'center' 
},
modalContainer: { 
  width: '90%', 
  maxHeight: '80%', 
  backgroundColor: '#fff', 
  borderRadius: 12, 
  overflow: 'hidden',
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
  borderBottomColor: '#eee',
  backgroundColor: '#f8f9fa',
},
modalTitle: { 
  fontSize: 20, 
  fontWeight: 'bold', 
  color: '#2c3e50' 
},
closeButton: { 
  fontSize: 28, 
  color: '#7f8c8d',
  fontWeight: '300',
},
modalContent: { 
  padding: 20,
  maxHeight: 400,
},
label: { 
  fontSize: 14, 
  fontWeight: '600', 
  color: '#34495e', 
  marginBottom: 8, 
  marginTop: 10 
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: '#e16e2b',
  borderRadius: 8,
  padding: 15,
  backgroundColor: '#fff5f0',
  marginBottom: 10,
},
imagePickerText: {
  fontSize: 14,
  color: '#e16e2b',
  fontWeight: '600',
  marginLeft: 10,
},
selectedImagePreview: {
  marginTop: 10,
  alignItems: 'center',
  backgroundColor: '#f9f9f9',
  padding: 10,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#ddd',
},
previewImage: {
  width: 200,
  height: 150,
  borderRadius: 8,
  marginBottom: 8,
},
imageInfoText: {
  fontSize: 12,
  color: '#666',
  textAlign: 'center',
},
modalFooter: { 
  flexDirection: 'row', 
  padding: 20, 
  borderTopWidth: 1, 
  borderTopColor: '#eee', 
  gap: 10,
  backgroundColor: '#f8f9fa',
},
modalButton: { 
  flex: 1, 
  padding: 15, 
  borderRadius: 8, 
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 50,
},
cancelButton: { 
  backgroundColor: '#ecf0f1',
  borderWidth: 1,
  borderColor: '#bdc3c7',
},
cancelButtonText: { 
  color: '#7f8c8d', 
  fontSize: 16, 
  fontWeight: '600' 
},
saveButton: { 
  backgroundColor: '#e16e2b',
  elevation: 2,
  shadowColor: '#e16e2b',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.3,
  shadowRadius: 4,
},
saveButtonText: { 
  color: '#fff', 
  fontSize: 16, 
  fontWeight: 'bold' 
},
kylMediaMenuButton: {
  position: 'absolute',
  top: 10,
  right: 10,
  backgroundColor: 'rgba(255, 255, 255, 0.9)',
  width: 32,
  height: 32,
  borderRadius: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 3,
},
kylMediaMenuIcon: {
  fontSize: 18,
  color: '#2c3e50',
  fontWeight: 'bold',
  lineHeight: 18,
},
kylMediaAddButton: {
  width: 300,
  height: 200,
  marginRight: 12,
  borderRadius: 12,
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderStyle: 'dashed',
  backgroundColor: '#fff',
  justifyContent: 'center',
  alignItems: 'center',
},
kylMediaAddContent: {
  alignItems: 'center',
  justifyContent: 'center',
},
kylMediaAddText: {
  marginTop: 8,
  fontSize: 14,
  color: '#e16e2b',
  fontWeight: '600',
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContainer: {
  width: '90%',
  backgroundColor: '#fff',
  borderRadius: 12,
  overflow: 'hidden',
},
modalHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 16,
  backgroundColor: '#e16e2b',
},
modalTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#fff',
},
closeButton: {
  fontSize: 24,
  color: '#fff',
  fontWeight: 'bold',
},
modalContent: {
  padding: 20,
},
label: {
  fontSize: 14,
  fontWeight: '600',
  color: '#2c3e50',
  marginBottom: 8,
},
imagePickerButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  borderWidth: 2,
  borderColor: '#e16e2b',
  borderRadius: 8,
  borderStyle: 'dashed',
  backgroundColor: '#fff',
},
imagePickerText: {
  marginLeft: 8,
  fontSize: 16,
  color: '#e16e2b',
  fontWeight: '600',
},
selectedImagePreview: {
  marginTop: 16,
  alignItems: 'center',
},
previewImage: {
  width: '100%',
  height: 200,
  borderRadius: 8,
},
imageInfoText: {
  marginTop: 8,
  fontSize: 12,
  color: '#7f8c8d',
},
modalFooter: {
  flexDirection: 'row',
  padding: 16,
  borderTopWidth: 1,
  borderTopColor: '#ecf0f1',
},
modalButton: {
  flex: 1,
  padding: 12,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
},
cancelButton: {
  backgroundColor: '#95a5a6',
  marginRight: 8,
},
saveButton: {
  backgroundColor: '#e16e2b',
  marginLeft: 8,
},
cancelButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
saveButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
},
});

export default styles;