// screens/BillInputScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import splitStore from '../store/SplitStore'; 
import { getCategoryFromName, CATEGORY_COLORS } from '../utils/categoryMap'; 

const BillInputScreen = () => {
const route = useRoute();
const navigation = useNavigation();

const { ocrResults, scannedImage: routedImage } = route.params || {};
  
  const [billItems, setBillItems] = useState([]);
  const [taxes, setTaxes] = useState('');
  const [discountAmountInput, setDiscountAmountInput] = useState('');
  const [serviceCharges, setServiceCharges] = useState('');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', amount: '' });
  const [isFromOCR, setIsFromOCR] = useState(false);
  const [scannedImage, setScannedImage] = useState(null);
  const [isEditingOCRItem, setIsEditingOCRItem] = useState({});
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Available categories for dropdown
  const availableCategories = [
    'food', 'drinks', 'groceries', 'snacks', 'dessert', 'health', 
    'personal', 'travel', 'utilities', 'entertainment', 'service', 'others'
  ];

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await splitStore.getUserPreferences();
      } catch (error) {
        console.error("Failed to load user preferences:", error);
      }
    };
    loadPreferences();

  console.log('BillInputScreen - OCR Results:', ocrResults);
  console.log('BillInputScreen - Routed Image:', routedImage);
  console.log('BillInputScreen - Bill Items after population:', billItems);   

    // Check if we have OCR results
    if (ocrResults) {
      setIsFromOCR(true);
      setScannedImage(routedImage);
      populateFromOCR(ocrResults);
    }
  }, [ocrResults, routedImage]);

  const populateFromOCR = (ocrResults) => {
    // Convert OCR results to billItems format
    const items = ocrResults.items.map((item, index) => ({
      id: `ocr_item_${index}_${Date.now()}`,
      name: item.name,
      amount: item.amount,
      category: getCategoryFromName(item.name.trim()),
      isFromOCR: true,
    }));

    setBillItems(items);
    setTaxes(ocrResults.taxes?.toString() || '');
    setServiceCharges(ocrResults.serviceCharges?.toString() || '');
    setDiscountAmountInput(ocrResults.discounts?.toString() || '');
  }

  const addItem = () => {
    if (!newItem.name.trim() || !newItem.amount.trim()) {
      Alert.alert('Error', 'Please enter both item name and amount');
      return;
    }

    const amount = parseFloat(newItem.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const item = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newItem.name.trim(),
      amount: amount,
      category: getCategoryFromName(newItem.name.trim()),
      isFromOCR: false,
    };

    setBillItems([...billItems, item]);
    setNewItem({ name: '', amount: '' });
    setIsAddingItem(false);
  };

  const removeItem = (itemId) => {
    setBillItems(billItems.filter(item => item.id !== itemId));
  };

  const updateOCRItem = (itemId, field, value) => {
    setBillItems(items => 
      items.map(item => 
        item.id === itemId 
          ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
          : item
      )
    );
  };

  const openEditModal = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name,
      amount: item.amount.toString(),
      category: item.category
    });
    setEditModalVisible(true);
  };

  const saveEditedItem = () => {
    if (!editingItem.name.trim() || !editingItem.amount.trim()) {
      Alert.alert('Error', 'Please enter both item name and amount');
      return;
    }

    const amount = parseFloat(editingItem.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setBillItems(items => 
      items.map(item => 
        item.id === editingItem.id 
          ? { 
              ...item, 
              name: editingItem.name.trim(),
              amount: amount,
              category: editingItem.category
            }
          : item
      )
    );

    setEditModalVisible(false);
    setEditingItem(null);
  };

  const calculateSubtotal = () => {
    return billItems.reduce((sum, item) => sum + item.amount, 0);
  };

  // Helper function to get current discount amount for display
  const getCurrentDiscountAmount = () => {
    const discountValue = parseFloat(discountAmountInput) || 0;
    return discountValue;
  };

  const calculateGrandTotal = () => {
    const itemsTotal = calculateSubtotal();
    const taxAmount = parseFloat(taxes) || 0;
    const serviceAmount = parseFloat(serviceCharges) || 0;
    const discountAmount = getCurrentDiscountAmount();
    
    return Math.max(0, itemsTotal + taxAmount + serviceAmount - discountAmount);
  };

  const handleContinue = async () => {
    if (billItems.length === 0) {
      Alert.alert('Error', 'Please add at least one item');
      return;
    }

    // Prepare the discounts array based on the input
    const finalDiscounts = [];
    const enteredDiscount = parseFloat(discountAmountInput);
    if (!isNaN(enteredDiscount) && enteredDiscount > 0) {
      // For simplicity, treat the input as a flat discount
      finalDiscounts.push({
        type: 'flat',
        value: enteredDiscount,
        // category: undefined // No category for a flat discount
      });
    }

    const billData = {
      id: splitStore.generateId(),
      items: billItems,
      subtotal: calculateSubtotal(),
      taxes: parseFloat(taxes) || 0,
      discounts: finalDiscounts,
      tips: 0,
      serviceCharges: parseFloat(serviceCharges) || 0,
      grandTotal: calculateGrandTotal(),
      createdAt: new Date().toISOString(), 
      updatedAt: new Date().toISOString(),
      scannedImage: scannedImage, 
      isFromOCR: isFromOCR,
    };

    try {
      // *** Save the bill data using the store ***
      const savedBill = await splitStore.saveBill(billData, null); // group ID is null initially
      
      // Navigate to group setup with the saved bill data (which now has an ID)
      navigation.navigate('GroupSetup', { billData: savedBill });
    } catch (error) {
      console.error('Error saving bill:', error);
      Alert.alert('Save Failed', 'Could not save the bill. Please try again.');
    }
  };

  const renderOCRItem = (item) => {
    const isEditing = isEditingOCRItem[item.id];
    const categoryColor = CATEGORY_COLORS[item.category] || '#9E9E9E';
    
    return (
      <View key={item.id} style={[styles.itemCard, item.isFromOCR && styles.ocrItemCard]}>
        {item.isFromOCR && (
          <View style={styles.ocrBadge}>
            <Text style={styles.ocrBadgeText}>AI Detected</Text>
          </View>
        )}
        
        <View style={styles.itemInfo}>
          {isEditing ? (
            <View style={styles.editItemContainer}>
              <TextInput
                style={styles.editInput}
                value={item.name}
                onChangeText={(text) => updateOCRItem(item.id, 'name', text)}
                placeholder="Item name"
              />
              <TextInput
                style={[styles.editInput, styles.amountInput]}
                value={item.amount.toString()}
                onChangeText={(text) => updateOCRItem(item.id, 'amount', text)}
                placeholder="Amount"
                keyboardType="numeric"
              />
            </View>
          ) : (
            <View style={styles.itemDetails}>
              <View style={styles.itemNameAndCategory}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={[styles.itemsCategory, { backgroundColor: categoryColor }]}>{item.category}</Text>
              </View>
              <Text style={styles.itemAmount}>₹{item.amount.toFixed(2)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.itemActions}>
          {item.isFromOCR && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Text style={styles.editButtonText}>✏️</Text>
          </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeItem(item.id)}
          >
            <Text style={styles.removeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCategoryOption = (category) => {
    const categoryColor = CATEGORY_COLORS[category] || '#9E9E9E';
    const isSelected = editingItem?.category === category;
    
    return (
      <TouchableOpacity
        key={category}
        style={[
          styles.categoryOption,
          isSelected && styles.selectedCategoryOption,
          { borderColor: categoryColor }
        ]}
        onPress={() => setEditingItem(prev => ({ ...prev, category }))}
      >
        <View style={[styles.categoryColorDot, { backgroundColor: categoryColor }]} />
        <Text style={[
          styles.categoryOptionText,
          isSelected && styles.selectedCategoryOptionText
        ]}>
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isFromOCR ? 'Confirm Bill Details' : 'Enter Bill Details'}
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* OCR Success Banner */}
        {isFromOCR && (
          <View style={styles.ocrBanner}>
            <Text style={styles.ocrBannerIcon}>🤖</Text>
            <View style={styles.ocrBannerContent}>
              <Text style={styles.ocrBannerTitle}>Bill Scanned Successfully!</Text>
              <Text style={styles.ocrBannerText}>
                AI has detected {billItems.length} items. Please review and edit if needed.
              </Text>
            </View>
          </View>
        )}

        {/* Scanned Image Preview */}
        {scannedImage && (
          <View style={styles.imagePreviewSection}>
            <Text style={styles.sectionTitle}>Scanned Receipt</Text>
            <Image source={{ uri: scannedImage }} style={styles.scannedImagePreview} />
          </View>
        )}
        
        {/* Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>

          {billItems.map((item) => renderOCRItem(item))}

          {isAddingItem ? (
            <View style={styles.addItemForm}>
              <TextInput
                style={styles.input}
                placeholder="Item name"
                value={newItem.name}
                onChangeText={(text) => setNewItem({ ...newItem, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Amount"
                value={newItem.amount}
                onChangeText={(text) => setNewItem({ ...newItem, amount: text })}
                keyboardType="numeric"
              />
              <View style={styles.addItemActions}>
                <TouchableOpacity
                  style={styles.cancelAddButton}
                  onPress={() => {
                    setIsAddingItem(false);
                    setNewItem({ name: '', amount: '' });
                  }}
                >
                  <Text style={styles.cancelAddButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmAddButton}
                  onPress={addItem}
                >
                  <Text style={styles.confirmAddButtonText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addItemButton}
              onPress={() => setIsAddingItem(true)}
            >
              <Text style={styles.addItemButtonText}>+ Add Item</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Charges Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Charges</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tax</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={taxes}
              onChangeText={setTaxes}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Discount</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={discountAmountInput}
              onChangeText={setDiscountAmountInput}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Charges / Tip</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={serviceCharges}
              onChangeText={setServiceCharges}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Items Total:</Text>
            <Text style={styles.summaryValue}>₹{calculateSubtotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax:</Text>
            <Text style={styles.summaryValue}>₹{(parseFloat(taxes) || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Discount:</Text>
            <Text style={styles.summaryValue}>-₹{getCurrentDiscountAmount().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Charges:</Text>
            <Text style={styles.summaryValue}>₹{(parseFloat(serviceCharges) || 0).toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total:</Text>
            <Text style={styles.totalValue}>₹{calculateGrandTotal().toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            billItems.length === 0 && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={billItems.length === 0}
        >
          <Text style={styles.continueButtonText}>Continue to Group Setup</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Item Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Item Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingItem?.name || ''}
                  onChangeText={(text) => setEditingItem(prev => ({ ...prev, name: text }))}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Amount</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editingItem?.amount || ''}
                  onChangeText={(text) => setEditingItem(prev => ({ ...prev, amount: text }))}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalInputLabel}>Category</Text>
                <View style={styles.categoryGrid}>
                  {availableCategories.map(renderCategoryOption)}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={saveEditedItem}
              >
                <Text style={styles.modalSaveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginRight: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  // OCR-specific styles
  ocrBanner: {
    backgroundColor: '#e8f5e8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  ocrBannerIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  ocrBannerContent: {
    flex: 1,
  },
  ocrBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 4,
  },
  ocrBannerText: {
    fontSize: 14,
    color: '#388e3c',
  },
  imagePreviewSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scannedImagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  ocrItemCard: {
    backgroundColor: '#f8fdf8',
    borderWidth: 1,
    borderColor: '#e0f2e0',
    position: 'relative',
  },
  ocrBadge: {
    position: 'absolute',
    top: -8,
    right: 8,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    zIndex: 1,
  },
  ocrBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  editItemContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: 'white',
  },
  amountInput: {
    width: 80,
  },
  // End OCR-specific styles
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameAndCategory: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
},
  itemName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  itemsCategory: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
    textTransform: 'capitalize',
},
  itemAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 'auto'
  },
    itemDetails: {
    flex: 1,
    flexDirection: 'row',
    marginRight: 8,
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  removeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addItemForm: {
    marginTop: 16,
  },
  addItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  cancelAddButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelAddButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  confirmAddButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmAddButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  addItemButton: {
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  addItemButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  summarySection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#666',
  },
  summaryValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 18,
    color: '#666',
  },
  modalBody: {
    padding: 20,
  },
  modalInputGroup: {
    marginBottom: 20,
  },
  modalInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
    fontWeight: '500',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  
  // Category Selection Styles
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    backgroundColor: '#f8f9fa',
    marginBottom: 8,
  },
  selectedCategoryOption: {
    backgroundColor: '#e8f5e8',
    borderWidth: 2,
  },
  categoryColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedCategoryOptionText: {
    color: '#2e7d32',
    fontWeight: '600',
  },
  
  // Modal Footer Styles
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalCancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  modalSaveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BillInputScreen;