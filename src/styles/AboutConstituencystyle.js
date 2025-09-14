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
    maxHeight: '80%',
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

  // Footer
  footer: {
    height: 30,
  },
});

export default styles;