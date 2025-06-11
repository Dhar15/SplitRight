// screens/HistoryScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { splitStore } from '../store/SplitStore';

const HistoryScreen = () => {
  const navigation = useNavigation();
  const [splitHistory, setSplitHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const history = await splitStore.getAllSplitHistory();
      // Sort by latest first
      const sortedHistory = Object.values(history).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setSplitHistory(sortedHistory);
    } catch (err) {
      console.error('Failed to fetch split history:', err);
      setError('Could not load history. Please try again.');
      Alert.alert('Error', 'Failed to load split history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch history when the screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const handleClearAllHistory = async () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to delete ALL split history records? This cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          onPress: async () => {
            setLoading(true);
            try {
              const success = await splitStore.clearAllHistory();
              if (success) {
                setSplitHistory([]);
                Alert.alert('Success', 'All split history cleared.');
              } else {
                Alert.alert('Error', 'Failed to clear history.');
              }
            } catch (err) {
              console.error('Error clearing all history:', err);
              Alert.alert('Error', 'An unexpected error occurred while clearing history.');
            } finally {
              setLoading(false);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteHistory = async (id) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this split history record?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          onPress: async () => {
            try {
              await splitStore.deleteSplitHistory(id);
              fetchHistory();
              Alert.alert('Success', 'Record deleted successfully.');
            } catch (err) {
              console.error('Failed to delete split history:', err);
              Alert.alert('Error', 'Failed to delete record.');
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true }
    );
  };

  const determineNextStep = (item) => {
    const { groupData, billData, splitConfig, splitResult, isSplitCalculated, isCompleted } = item;
    let initialStep = 1;
    let stepName = 'Select Items';
    
    // Check if we have settlement results to view
    if (splitResult && 
        splitResult.settlements && 
        splitResult.settlements.length > 0 &&
        isCompleted) {
      initialStep = 4;
      stepName = 'View Settlement';
    } else if (isCompleted) {
      console.warn(`HistoryScreen: Completed split ID ${item.id} is missing splitResult for settlement view.`);
      initialStep = 4;
      stepName = 'View Settlement (Data Missing)';
    } else if (
      splitConfig?.itemSelections &&
      Object.keys(splitConfig.itemSelections).length > 0 &&
      Object.values(splitConfig.itemSelections).every(sel => sel.length > 0) &&
      splitConfig?.billPayment?.payerId && // Check for bill payer
      isSplitCalculated
    ) {
      initialStep = 3;
      stepName = 'Preview Split';
    } else if (billData?.items?.length > 0) {
      initialStep = 2;
      stepName = 'Configure Split';
    } else if (groupData?.members?.length > 0) {
      initialStep = 1;
      stepName = 'Select Items';
    }

    return {
      screen: 'Split', 
      params: {
        billData,
        groupData,
        splitResult: splitResult || null,
        initialSplitConfig: splitConfig,
        initialItemSelections: splitConfig?.itemSelections,
        initialStep: initialStep,
        resumeFromHistory: true,
        historyId: item.id,
      },
      stepName: stepName,
      canContinue: !isCompleted || (isCompleted && (!splitResult || !splitResult.settlements))
    };
  };

  const handleContinueSplit = (item) => {
    const nextStep = determineNextStep(item);
    navigation.navigate(nextStep.screen, nextStep.params);
  };

  const getProgressPercentage = (item) => {
    let progress = 0;
    
    // Step 1: Group created (25%)
    if (item.groupData && item.groupData.members && item.groupData.members.length > 0) {
      progress += 25;
    }
    
    // Step 2: Items added and assigned (25%)
    if (item.billData && item.billData.items && item.billData.items.length && item.billPayment && item.billPayment.payerId) {
      progress += 25;
    }
    
    // Step 3: Bill payer assigned and split calculated (25%)
    if (item.isSplitCalculated) {
      progress += 25;
    }
    
    // Step 4: Completed/Settled (25%)
    if (item.isCompleted) {
      progress += 25;
    }
    
    return progress;
  };

  const getStatusText = (item) => {
    if (item.isCompleted) {
      return 'Completed';
    }
    
    const progress = getProgressPercentage(item);
    if (progress === 0) return 'Not started';
    if (progress === 25) return 'Group created';
    if (progress === 50) return 'Items assigned';
    if (progress === 75) return 'Split calculated';
    return 'Ready to settle';
  };

  const getBillPayerName = (item) => {
    const payerId = item.billPayment?.payerId;
    if (!payerId) return 'Not assigned';
    
    const payer = item.groupData?.members?.find(member => member.id === payerId);
    return payer ? payer.name : 'Unknown payer';
  };

  const renderHistoryItem = ({ item }) => {
    const groupName = item.groupData?.name || 'Unnamed Group';
    const totalAmount = item.billData?.grandTotal?.toFixed(2) || 'N/A';
    const date = item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A';
    const nextStep = determineNextStep(item);
    const progress = getProgressPercentage(item);
    const statusText = getStatusText(item);
    const billPayerName = getBillPayerName(item);

    return (
      <TouchableOpacity 
        style={styles.historyCard} 
        onPress={() => handleContinueSplit(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleContainer}>
            <Text style={styles.groupName}>{groupName}</Text>
            <View style={[styles.statusBadge, { 
              backgroundColor: item.isCompleted ? '#d4edda' : '#fff3cd' 
            }]}>
              <Text style={[styles.statusText, { 
                color: item.isCompleted ? '#155724' : '#856404' 
              }]}>
                {statusText}
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            onPress={(e) => {
              e.stopPropagation();
              handleDeleteHistory(item.id);
            }}
            style={styles.deleteButtonContainer}
          >
            <Text style={styles.deleteButton}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardText}>Total Bill: ₹{totalAmount}</Text>
          <Text style={styles.cardText}>Date: {date}</Text>
          <Text style={styles.cardText}>Members: {item.groupData?.members?.length || 0}</Text>
          <Text style={styles.cardText}>Bill Payer: {billPayerName}</Text>
          {item.splitResult?.settlements && item.splitResult.settlements.length > 0 && (
            <Text style={styles.cardText}>
              Settlements: {item.splitResult.settlements.length} transactions
            </Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.nextStepContainer}>
            <Text style={styles.nextStepLabel}>
              {nextStep.canContinue ? 'Next: ' : ''}
            </Text>
            <Text style={styles.nextStepText}>{nextStep.stepName}</Text>
          </View>
          <Text style={styles.continueArrow}>
            {nextStep.canContinue ? '→' : '👁'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backButton}>← Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Split History</Text>
        <TouchableOpacity onPress={handleClearAllHistory} style={styles.clearAllButton}>
          <Text style={styles.clearAllButtonText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchHistory}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : splitHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No split history found yet!</Text>
          <Text style={styles.emptyText}>Start a new bill to see it here.</Text>
        </View>
      ) : (
        <FlatList
          data={splitHistory}
          keyExtractor={(item) => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={styles.listContentContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </View>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#777',
    textAlign: 'center',
    marginBottom: 10,
  },
  listContentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  historyCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  groupName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButtonContainer: {
    padding: 4,
  },
  deleteButton: {
    fontSize: 20,
    color: '#dc3545',
    fontWeight: 'bold',
  },
  clearAllButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#dc3545', 
    marginLeft: 'auto', 
  },
  clearAllButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e9ecef',
    borderRadius: 3,
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    minWidth: 35,
  },
  cardBody: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 12,
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#555',
    marginBottom: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  nextStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nextStepLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  nextStepText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  continueArrow: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
});

export default HistoryScreen;