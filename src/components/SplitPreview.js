// components/SplitPreview.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const SplitPreview = ({ splitResult, members, billData }) => {
  const [activeTab, setActiveTab] = useState('summary');

  // Enhanced loading/error checking
  if (!splitResult) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Calculating split...</Text>
      </View>
    );
  }

  // Validate required properties exist
  if (!splitResult.finalAmounts || !splitResult.memberBaseCosts || !splitResult.memberTaxContributions) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: Split calculation failed. Please go back and try again.</Text>
      </View>
    );
  }

  // Safe member map creation
  const memberMap = {};
  if (members && Array.isArray(members)) {
    members.forEach(member => {
      if (member && member.id) {
        memberMap[member.id] = member;
      }
    });
  }

  const renderSummaryTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Split Summary</Text>
      
      {members && members.map(member => {
        if (!member || !member.id) return null;
        
        const finalAmount = splitResult.finalAmounts[member.id] || 0;
        const baseAmount = splitResult.memberBaseCosts[member.id] || 0;
        const taxAmount = splitResult.memberTaxContributions[member.id] || 0;
        const tipAmount = splitResult.memberTipServiceContributions[member.id] || 0;
        const discountAmount = splitResult.memberDiscountContributions 
          ? (splitResult.memberDiscountContributions[member.id] || 0) 
          : 0;
        
        return (
          <View key={member.id} style={styles.memberSummaryCard}>
            <View style={styles.memberHeader}>
              <Text style={styles.memberName}>{member.name || 'Unknown'}</Text>
              <Text style={styles.memberTotal}>₹{finalAmount.toFixed(2)}</Text>
            </View>
            
            <View style={styles.breakdownContainer}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Items:</Text>
                <Text style={styles.breakdownValue}>₹{baseAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tax:</Text>
                <Text style={styles.breakdownValue}>₹{taxAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Tip:</Text>
                <Text style={styles.breakdownValue}>₹{tipAmount.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Discount:</Text>
                <Text style={[styles.breakdownValue, styles.discountValue]}>
                  -₹{discountAmount.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
      
      <View style={styles.totalCard}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Bill:</Text>
          <Text style={styles.totalValue}>
            ₹{(billData && billData.grandTotal ? billData.grandTotal : 0).toFixed(2)}
          </Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Split Total:</Text>
          <Text style={styles.totalValue}>
            ₹{splitResult.finalAmounts 
              ? Object.values(splitResult.finalAmounts).reduce((sum, amount) => sum + (amount || 0), 0).toFixed(2)
              : '0.00'
            }
          </Text>
        </View>
      </View>
    </View>
  );

  const renderItemsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Item Breakdown</Text>
      
      {splitResult.itemSplits && Array.isArray(splitResult.itemSplits) 
        ? splitResult.itemSplits.map((itemSplit, index) => {
            if (!itemSplit) return null;
            
            return (
              <View key={itemSplit.itemId || index} style={styles.itemBreakdownCard}>
                <Text style={styles.itemBreakdownName}>
                  {itemSplit.itemName || 'Unknown Item'}
                </Text>
                <Text style={styles.itemBreakdownTotal}>
                  ₹{(itemSplit.totalAmount || 0).toFixed(2)}
                </Text>
                
                <View style={styles.sharesContainer}>
                  {itemSplit.memberShares && Array.isArray(itemSplit.memberShares)
                    ? itemSplit.memberShares.map(share => {
                        if (!share || !share.memberId) return null;
                        
                        return (
                          <View key={share.memberId} style={styles.shareRow}>
                            <Text style={styles.shareMember}>
                              {memberMap[share.memberId]?.name || 'Unknown'}
                            </Text>
                            <Text style={styles.shareAmount}>
                              ₹{(share.amount || 0).toFixed(2)}
                            </Text>
                          </View>
                        );
                      })
                    : <Text style={styles.noDataText}>No shares data</Text>
                  }
                </View>
              </View>
            );
          })
        : <Text style={styles.noDataText}>No item breakdown available</Text>
      }
    </View>
  );

  const renderSettlementsTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Settlement Suggestions</Text>
      
      {!splitResult.settlements || !Array.isArray(splitResult.settlements) || splitResult.settlements.length === 0 ? (
        <View style={styles.noSettlementsCard}>
          <Text style={styles.noSettlementsText}>
            🎉 All settled! No payments needed.
          </Text>
        </View>
      ) : (
        splitResult.settlements.map((settlement, index) => {
          if (!settlement) return null;
          
          return (
            <View key={index} style={styles.settlementCard}>
              <View style={styles.settlementHeader}>
                <Text style={styles.settlementAmount}>
                  ₹{(settlement.amount || 0).toFixed(2)}
                </Text>
              </View>
              <Text style={styles.settlementText}>
                <Text style={styles.settlementFrom}>
                  {settlement.fromName || 'Unknown'}
                </Text>
                {' pays '}
                <Text style={styles.settlementTo}>
                  {settlement.toName || 'Unknown'}
                </Text>
              </Text>
            </View>
          );
        })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {[
          { key: 'summary', label: 'Summary' },
          { key: 'items', label: 'Items' },
          { key: 'settlements', label: 'Settlements' }
        ].map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollContainer}>
        {activeTab === 'summary' && renderSummaryTab()}
        {activeTab === 'items' && renderItemsTab()}
        {activeTab === 'settlements' && renderSettlementsTab()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#e53e3e',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f7fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3182ce',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#718096',
  },
  activeTabText: {
    color: '#3182ce',
  },
  scrollContainer: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#2d3748',
  },
  memberSummaryCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  memberTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3182ce',
  },
  breakdownContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#718096',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3748',
  },
  discountValue: {
    color: '#38a169',
  },
  totalCard: {
    backgroundColor: '#edf2f7',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#cbd5e0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  itemBreakdownCard: {
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemBreakdownName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 4,
  },
  itemBreakdownTotal: {
    fontSize: 14,
    color: '#3182ce',
    fontWeight: '500',
    marginBottom: 12,
  },
  sharesContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 8,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  shareMember: {
    fontSize: 14,
    color: '#718096',
  },
  shareAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3748',
  },
  noSettlementsCard: {
    backgroundColor: '#f0fff4',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#9ae6b4',
  },
  noSettlementsText: {
    fontSize: 16,
    color: '#38a169',
    textAlign: 'center',
  },
  settlementCard: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#feb2b2',
  },
  settlementHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  settlementAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e53e3e',
  },
  settlementText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#2d3748',
  },
  settlementFrom: {
    fontWeight: '600',
    color: '#e53e3e',
  },
  settlementTo: {
    fontWeight: '600',
    color: '#38a169',
  },
  noDataText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default SplitPreview;