// components/BillItemsList.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';

const BillItemsList = ({ 
  items, 
  members, 
  billData,
  selections, 
  onSelectionChange, 
  billPayments,
  onBillPaymentsChange 
}) => {
  const [showBillPaymentModal, setShowBillPaymentModal] = useState(false);
  const [newPayment, setNewPayment] = useState({ payerId: '', amount: '' });

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

  const addPaymentEntry = () => {
    const amount = parseFloat(newPayment.amount);
    if (!newPayment.payerId) {
      Alert.alert('Missing Information', 'Please select who made the payment.');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    // Check if this person already has a payment entry
    const existingPaymentIndex = billPayments.findIndex(p => p.payerId === newPayment.payerId);
    
    if (existingPaymentIndex >= 0) {
      // Update existing payment
      const updatedPayments = [...billPayments];
      updatedPayments[existingPaymentIndex].amount += amount;
      onBillPaymentsChange(updatedPayments);
    } else {
      // Add new payment
      onBillPaymentsChange([...billPayments, { payerId: newPayment.payerId, amount }]);
    }
    
    setNewPayment({ payerId: '', amount: '' });
    setShowBillPaymentModal(false);
  };

  const removePaymentEntry = (payerId) => {
    Alert.alert(
      'Remove Payment',
      'Are you sure you want to remove this payment entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: () => {
            const updated = billPayments.filter(p => p.payerId !== payerId);
            onBillPaymentsChange(updated);
          }
        }
      ]
    );
  };

  const getPayerName = (payerId) => {
    const payer = members.find(m => m.id === payerId);
    return payer ? payer.name : 'Unknown';
  };

  const getTotalPayments = () => {
    return billPayments.reduce((total, payment) => total + payment.amount, 0);
  };

  const getBillTotal = () => {
    const itemsTotal = items.reduce((total, item) => total + (item.amount || 0), 0);
    // Add any additional charges if they exist in your bill structure
    const tax = billData?.taxes || 0;
    const tips = billData?.tips || 0;
    const serviceCharges = billData?.serviceCharges || 0;
    const discount = (billData?.discounts || []).reduce((sum, d) => sum + (d?.value || 0), 0);

    return itemsTotal + tax + tips + serviceCharges - discount;
  };

  const getPaymentBalance = () => {
    const totalPaid = getTotalPayments();
    const billTotal = getBillTotal();
    return billTotal - totalPaid;
  };

  const getBalanceColor = () => {
    const balance = getPaymentBalance();
    if (balance > 0) return '#FF9800'; // Orange for underpaid
    if (balance < 0) return '#F44336'; // Red for overpaid
    return '#4CAF50'; // Green for exact match
  };

  const getBalanceText = () => {
    const balance = getPaymentBalance();
    if (balance > 0) return `₹${balance.toFixed(2)} remaining`;
    if (balance < 0) return `₹${Math.abs(balance).toFixed(2)} overpaid`;
    return 'Fully paid ✓';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.instruction}>
        Select who shared each item and record who paid how much:
      </Text>

      {/* Multi-payer Bill Payment Section */}
      <View style={styles.billPaymentCard}>
        <View style={styles.billPaymentHeader}>
          <Text style={styles.billPaymentTitle}>💳 Bill Payments</Text>
          <Text style={styles.billPaymentSubtitle}>
            Record all payments made for this bill
          </Text>
        </View>

        {/* Payment Summary */}
        <View style={styles.paymentSummary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bill Total:</Text>
            <Text style={styles.summaryValue}>₹{getBillTotal().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Paid:</Text>
            <Text style={styles.summaryValue}>₹{getTotalPayments().toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Balance:</Text>
            <Text style={[styles.summaryValue, { color: getBalanceColor() }]}>
              {getBalanceText()}
            </Text>
          </View>
        </View>

        {/* Payment Entries */}
        {billPayments.length > 0 && (
          <View style={styles.paymentsContainer}>
            <Text style={styles.paymentsTitle}>Payment Records:</Text>
            {billPayments.map((payment, index) => (
              <View key={`${payment.payerId}-${index}`} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentText}>
                    {getPayerName(payment.payerId)}
                  </Text>
                  <Text style={styles.paymentAmount}>₹{payment.amount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => removePaymentEntry(payment.payerId)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeText}>✖</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Add Payment Button */}
        <TouchableOpacity
          style={styles.addPaymentButton}
          onPress={() => setShowBillPaymentModal(true)}
        >
          <Text style={styles.addPaymentButtonText}>➕ Add Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Items Section */}
      <Text style={styles.sectionTitle}>Item Sharing</Text>
      <Text style={styles.sectionSubtitle}>
        Select who shared each item to split the costs fairly
      </Text>
      
      {items.map((item, index) => {
        const itemKey = item.id || index;
        const selectedCount = (selections[itemKey] || []).length;
        
        return (
          <View key={itemKey} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name || `Item ${index + 1}`}</Text>
                <Text style={styles.itemAmount}>₹{(item.amount || 0).toFixed(2)}</Text>
                {item.category && (
                  <Text style={styles.itemCategory}>{item.category}</Text>
                )}
              </View>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={() => toggleAllMembers(itemKey)}
              >
                <Text style={styles.selectAllText}>
                  {selectedCount === members.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sharingLabel}>
              Who shared this item? ({selectedCount}/{members.length} selected)
            </Text>
            
            <View style={styles.membersGrid}>
              {members.map(member => {
                const isSelected = (selections[itemKey] || []).includes(member.id);
                return (
                  <TouchableOpacity
                    key={member.id}
                    style={[styles.memberChip, isSelected && styles.memberChipSelected]}
                    onPress={() => toggleMemberSelection(itemKey, member.id)}
                  >
                    <Text style={[styles.memberChipText, isSelected && styles.memberChipTextSelected]}>
                      {isSelected ? '✓ ' : ''}{member.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {selectedCount > 0 && (
              <View style={styles.splitInfo}>
                <Text style={styles.splitAmount}>
                  ₹{((item.amount || 0) / selectedCount).toFixed(2)} per person
                </Text>
                <Text style={styles.splitNote}>
                  Split among {selectedCount} {selectedCount === 1 ? 'person' : 'people'}
                </Text>
              </View>
            )}

            {selectedCount === 0 && (
              <View style={styles.warningInfo}>
                <Text style={styles.warningText}>⚠️ No one selected for this item</Text>
              </View>
            )}
          </View>
        );
      })}

      {/* Add Payment Modal */}
      <Modal
        visible={showBillPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBillPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Payment Entry</Text>
            <Text style={styles.modalSubtitle}>
              Record who paid and how much they contributed
            </Text>
            
            <Text style={styles.modalLabel}>Who made the payment?</Text>
            <View style={styles.membersList}>
              {members.map(member => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.payerOption,
                    newPayment.payerId === member.id && styles.payerOptionSelected
                  ]}
                  onPress={() => setNewPayment(prev => ({ ...prev, payerId: member.id }))}
                >
                  <Text style={[
                    styles.payerOptionText,
                    newPayment.payerId === member.id && styles.payerOptionTextSelected
                  ]}>
                    {member.name}
                    {newPayment.payerId === member.id && ' ✓'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Amount Paid (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter amount paid"
              value={newPayment.amount}
              onChangeText={text => setNewPayment(prev => ({ ...prev, amount: text }))}
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={addPaymentEntry}
              >
                <Text style={styles.addButtonText}>Add Payment</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalCloseButton} 
                onPress={() => {
                  setShowBillPaymentModal(false);
                  setNewPayment({ payerId: '', amount: '' });
                }}
              >
                <Text style={styles.modalCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
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
    lineHeight: 22,
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
    marginBottom: 16,
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

  // Payment Summary Styles
  paymentSummary: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  // Payments Container
  paymentsContainer: {
    marginBottom: 16,
  },
  paymentsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  paymentAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  removeButton: {
    padding: 8,
  },
  removeText: {
    color: '#F44336',
    fontSize: 16,
    fontWeight: 'bold',
  },

  addPaymentButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addPaymentButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },

  // Section Title
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
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
  memberChipText: {
    fontSize: 14,
    color: '#666',
  },
  memberChipTextSelected: {
    color: 'white',
    fontWeight: '600',
  },

  // Split Info Styles
  splitInfo: {
    alignItems: 'flex-end',
    backgroundColor: '#f0f8ff',
    borderRadius: 6,
    padding: 8,
  },
  splitAmount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  splitNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },

  // Warning Info Styles
  warningInfo: {
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 6,
    padding: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#f57c00',
    fontWeight: '500',
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
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  membersList: {
    marginBottom: 16,
  },
  payerOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    gap: 12,
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
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