// components/BillItemsList.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

const BillItemsList = ({ 
  items, 
  members, 
  selections, 
  onSelectionChange, 
  billPayment,
  onBillPaymentChange 
}) => {
  const [showBillPaymentModal, setShowBillPaymentModal] = useState(false);

  const toggleMemberSelection = (itemId, memberId) => {
    const currentSelection = selections[itemId] || [];
    const newSelection = currentSelection.includes(memberId)
      ? currentSelection.filter(id => id !== memberId)
      : [...currentSelection, memberId];
    
    onSelectionChange(itemId, newSelection);
  };

  const toggleAllMembers = (itemId) => {
    const currentSelection = selections[itemId] || [];
    const allSelected = currentSelection.length === members.length;
    const newSelection = allSelected ? [] : members.map(m => m.id);
    onSelectionChange(itemId, newSelection);
  };

  const handleBillPaymentSelection = (payerId) => {
    onBillPaymentChange({
      payerId,
      components: {
        subtotal: true,
        taxes: true,
        tips: true,
        serviceCharges: true,
        discounts: true
      }
    });
    setShowBillPaymentModal(false);
  };

  const getBillPayerName = () => {
    if (!billPayment?.payerId) return 'Select Bill Payer';
    const payer = members.find(m => m.id === billPayment.payerId);
    return payer ? payer.name : 'Unknown Payer';
  };

  const getBillPaymentStatus = () => {
    return billPayment?.payerId ? 'paid' : 'unpaid';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Select who shared each item and who paid the entire bill:
      </Text>

      {/* Bill Payment Section */}
      <View style={styles.billPaymentCard}>
        <View style={styles.billPaymentHeader}>
          <Text style={styles.billPaymentTitle}>💳 Complete Bill Payment</Text>
          <Text style={styles.billPaymentSubtitle}>
            Who paid for the entire bill at the restaurant?
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.billPaymentButton,
            getBillPaymentStatus() === 'paid' && styles.billPaymentButtonPaid
          ]}
          onPress={() => setShowBillPaymentModal(true)}
        >
          <Text style={[
            styles.billPaymentButtonText,
            getBillPaymentStatus() === 'paid' && styles.billPaymentButtonTextPaid
          ]}>
            {getBillPaymentStatus() === 'paid' ? '✅ ' : '💰 '}
            {getBillPayerName()}
          </Text>
        </TouchableOpacity>

        {billPayment?.payerId && (
          <Text style={styles.billPaymentNote}>
            This person paid the complete bill including taxes, tips, and service charges.
            The app will calculate who owes money to whom.
          </Text>
        )}
      </View>
      
      {/* Items Selection Section */}
      <Text style={styles.sectionTitle}>Item Sharing</Text>
      {items.map((item, index) => {
        const itemKey = item.id || index;
        
        return (
          <View key={itemKey} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name || `Item ${index + 1}`}</Text>
                <Text style={styles.itemAmount}>₹{item.amount?.toFixed(2) || '0.00'}</Text>
                <Text style={styles.itemCategory}>{item.category || 'Other'}</Text>
              </View>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => toggleAllMembers(itemKey)}
              >
                <Text style={styles.selectAllText}>
                  {(selections[itemKey] || []).length === members.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Sharing Instructions */}
            <Text style={styles.sharingLabel}>Who shared this item?</Text>
            <View style={styles.membersGrid}>
              {members.map(member => {
                const isSelected = (selections[itemKey] || []).includes(member.id);
                const isBillPayer = billPayment?.payerId === member.id;
                
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberChip,
                      isSelected && styles.memberChipSelected,
                      isBillPayer && styles.memberChipBillPayer
                    ]}
                    onPress={() => toggleMemberSelection(itemKey, member.id)}
                  >
                    <Text
                      style={[
                        styles.memberChipText,
                        isSelected && styles.memberChipTextSelected,
                        isBillPayer && styles.memberChipTextBillPayer
                      ]}
                    >
                      {isBillPayer && '💳 '}{member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Split Amount Display */}
            {(selections[itemKey] || []).length > 0 && (
              <View style={styles.splitInfo}>
                <Text style={styles.splitAmount}>
                  ₹{((item.amount || 0) / (selections[itemKey] || []).length).toFixed(2)} per person
                </Text>
                <Text style={styles.splitNote}>
                  Split among {(selections[itemKey] || []).length} {(selections[itemKey] || []).length === 1 ? 'person' : 'people'}
                </Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Bill Payment Selection Modal */}
      <Modal
        visible={showBillPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBillPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Who paid the complete bill?
            </Text>
            <Text style={styles.modalSubtitle}>
              This includes all items, taxes, tips, and service charges
            </Text>
            
            <View style={styles.payersList}>
              {members.map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.payerOption,
                    billPayment?.payerId === member.id && styles.payerOptionSelected
                  ]}
                  onPress={() => handleBillPaymentSelection(member.id)}
                >
                  <Text style={[
                    styles.payerOptionText,
                    billPayment?.payerId === member.id && styles.payerOptionTextSelected
                  ]}>
                    💳 {member.name}
                    {billPayment?.payerId === member.id && ' ✓'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBillPaymentModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  
  // Bill Payment Card Styles
  billPaymentCard: {
    backgroundColor: '#f8f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e3f2fd',
  },
  billPaymentHeader: {
    marginBottom: 12,
  },
  billPaymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976d2',
    marginBottom: 4,
  },
  billPaymentSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  billPaymentButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  billPaymentButtonPaid: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E8',
  },
  billPaymentButtonText: {
    fontSize: 16,
    color: '#FF9800',
    fontWeight: '600',
  },
  billPaymentButtonTextPaid: {
    color: '#4CAF50',
  },
  billPaymentNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },

  // Item Card Styles
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemAmount: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: '#888',
    textTransform: 'uppercase',
  },
  selectAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  selectAllText: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: '600',
  },

  // Sharing Section Styles
  sharingLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  memberChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: 'white',
    marginRight: 8,
    marginBottom: 8,
  },
  memberChipSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  memberChipBillPayer: {
    borderColor: '#1976d2',
    borderWidth: 2,
  },
  memberChipText: {
    fontSize: 14,
    color: '#666',
  },
  memberChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  memberChipTextBillPayer: {
    color: '#1976d2',
    fontWeight: '600',
  },

  // Split Info Styles
  splitInfo: {
    alignItems: 'flex-end',
  },
  splitAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    fontStyle: 'italic',
  },
  splitNote: {
    fontSize: 12,
    color: '#888',
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
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  payersList: {
    marginBottom: 20,
  },
  payerOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  payerOptionSelected: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
  },
  payerOptionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  payerOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalCloseButton: {
    backgroundColor: '#6c757d',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default BillItemsList;