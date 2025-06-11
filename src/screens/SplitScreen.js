// screens/SplitScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { splittingService } from '../services/SplittingService';
import BillItemsList from '../components/BillItemsList';
import SplitConfiguration from '../components/SplitConfiguration';
import SplitPreview from '../components/SplitPreview';
import SettlementScreen from '../components/SettlementScreen';

import splitStore from '../store/SplitStore';

const SplitScreen = ({ route, navigation }) => {
  const { billData, groupData, historyId, initialStep: routeInitialStep, splitResult: initialSplitResult } = route.params; 

  console.log('SplitScreen: Received history ID:', historyId);
  console.log('SplitScreen: Initial Bill Data:', JSON.stringify(billData));
  console.log('SplitScreen: Initial Group Data:', JSON.stringify(groupData));
  
  const [currentStep, setCurrentStep] = useState(routeInitialStep || 1);
  const [members, setMembers] = useState(groupData?.members || []);
  const [itemSelections, setItemSelections] = useState({});
  const [billPayment, setBillPayment] = useState(null); 
  const [splitConfig, setSplitConfig] = useState({
    tipStrategy: 'equal',
    discountStrategy: 'equal',
    taxStrategy: 'equal'
  });
  const [splitResult, setSplitResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [splitValidations, setSplitValidations] = useState({
    tax: true,
    tip: true,
    discount: true
  });

  const steps = [
    { id: 1, title: 'Assign Bill', component: 'items' },
    { id: 2, title: 'Configure Split', component: 'config' },
    { id: 3, title: 'Preview Split', component: 'preview' },
    { id: 4, title: 'Settlement', component: 'settlement' }
  ];

  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true); // <--- New loading state for session initialization


  console.log('SplitScreen: currentStep on render:', currentStep);

  // Initialize split session on component mount
  useEffect(() => {
    const initializeSession = async () => {
      setLoadingSession(true); // Set loading state to true while initializing
      try {
        if (!historyId) { // If no historyId is passed, create a new one
          const newSession = await splitStore.createSplitSession({
            billData: { ...billData },
            groupData: { ...groupData, members },
          });
          setHistoryId(newSession.id); // Set the newly generated ID
          console.log('SplitScreen: New session created with ID:', newSession.id);
          setCurrentStep(1); 
          console.log('SplitScreen: Setting currentStep to 1 (new session)');
          setSessionInitialized(true);
        } else {
          console.log('SplitScreen: Initializing session for historyId:', historyId);
          const existingSession = await splitStore.getSplitSession(historyId);
          
          if (!existingSession) {
            console.log('SplitScreen: Existing session not found, creating new one with provided ID:', historyId);
            setLoadingSession(false);

            const initialSession = {
              id: historyId, // Use the provided ID
              billData: { ...billData },
              groupData: { ...groupData, members },
              splitConfig: {
                tipStrategy: 'equal',
                discountStrategy: 'equal',
                taxStrategy: 'equal',
                itemSelections: {}
              },
              billPayment: null,
              splitResult: null,
              status: 'in_progress'
            };
            await splitStore.saveSplitHistory(initialSession); // Save the new session
            console.log('SplitScreen: Split session created successfully for:', historyId);
            setCurrentStep(routeInitialStep || 1); 
          } else {
            console.log('SplitScreen: Existing split session loaded for:', historyId, existingSession);
            if (existingSession.splitConfig) {
              setSplitConfig(existingSession.splitConfig);
              if (existingSession.splitConfig.itemSelections) {
                setItemSelections(existingSession.splitConfig.itemSelections);
              }
            }
            if (existingSession.splitResult && !initialSplitResult) {
              setSplitResult(existingSession.splitResult);
            } else if(initialSplitResult) {
              setSplitResult(initialSplitResult);
            }
            if (existingSession.billPayment) {
              setBillPayment(existingSession.billPayment);
            }
            setCurrentStep(routeInitialStep || existingSession.currentStep || 1); 
            console.log('Existing split session loaded:', historyId);
            console.log('SplitScreen: Setting currentStep to:', routeInitialStep || existingSession.currentStep || 1, '(existing session)');
          }
          setSessionInitialized(true);
        }
      } catch (error) {
        console.error('Error initializing split session:', error);
        Alert.alert('Error', 'Failed to initialize split session');
      } finally {
        setLoadingSession(false); // Set loading state to false after initialization
      }
    };

    initializeSession();
  }, [routeInitialStep, initialSplitResult]); 

  // Initialize item selections when members or billData change
  useEffect(() => {
    if (members.length > 0 && billData?.items && !sessionInitialized) { // Only set if session not initialized
      const initialSelections = {};
      billData.items.forEach(item => {
        initialSelections[item.id] = members.map(m => m.id);
      });
      setItemSelections(initialSelections);
    }
  }, [members, billData, sessionInitialized]);

  // Persist splitResult, splitConfig, itemSelections, and billPayment when they change
  useEffect(() => {
    const persistSessionUpdates = async () => {
      if (sessionInitialized && historyId) {
        console.log('SplitScreen: Persisting result/config/itemSelections/billPayment to session for historyId:', historyId);
        try {
          await splitStore.updateSplitSession(historyId, {
            splitResult: splitResult, // Save split result if available
            splitConfig: {
              ...splitConfig,
              itemSelections
            },
            billData: { // Also explicitly save assignments within billData
              ...billData, // Spread existing billData to maintain other properties
              assignments: itemSelections // Explicitly set assignments
            },
            billPayment,
            updatedAt: new Date().toISOString(),
            currentStep: currentStep 
          });
          console.log('SplitScreen: Config/itemSelections/billPayment persisted successfully.');
        } catch (error) {
          console.error('SplitScreen: Error updating split session from config/itemSelections/billPayment effect:', error);
        }
      }
    };

    persistSessionUpdates();
  }, [splitResult, splitConfig, itemSelections, billPayment, historyId, sessionInitialized, currentStep]);

  const handleItemSelectionChange = (itemId, selectedMembers) => {
    console.log(`SplitScreen: Updating item selection for item ${itemId} with members:`, selectedMembers);
    setItemSelections(prev => {
      const updatedSelections = {
        ...prev,
        [itemId]: selectedMembers
      };

      // Save item assignments to history
      if (sessionInitialized && historyId) {
        splitStore.updateSplitSession(historyId, {
          billData: {
            ...(billData || {}),
            assignments: updatedSelections
          }
        });
      }
      return updatedSelections;
    });
  };

  // Handle bill payment change
  const handleBillPaymentChange = (payment) => {
    console.log(`SplitScreen: Updating bill payment to:`, payment);
    setBillPayment(payment);

    // Save bill payment data to history
    if (sessionInitialized && historyId) {
      splitStore.updateSplitSession(historyId, {
        billPayment: payment
      });
    }
  };

  const isNextDisabled = () => {
    if (splitConfig.taxStrategy === 'custom' && !splitValidations.tax) return true;
    if (splitConfig.tipStrategy === 'custom' && !splitValidations.tip) return true;
    if (splitConfig.discountStrategy === 'custom' && !splitValidations.discount) return true;
    return false;
  };

  const calculateSplit = async () => {
    setLoading(true);
    try {
      const allItemsAssigned = billData.items.every(item => itemSelections[item.id] && itemSelections[item.id].length > 0);
      if (!allItemsAssigned) {
        Alert.alert('Incomplete Assignment', 'Please assign all items to at least one member.');
        setLoading(false);
        return;
      }

      // Check if bill payment is assigned
      if (!billPayment || !billPayment.payerId) {
        Alert.alert('Incomplete Payment Assignment', 'Please specify who paid the complete bill.');
        setLoading(false);
        return;
      }

      const config = {
        itemSelections,
        billPayment,
        ...splitConfig
      };
      
      const result = splittingService.calculateSplit(
        billData,
        members,
        config
      );

      console.log("Component: Result from splittingService.calculateSplit:", result);
      setSplitResult(result);

       // *** Update the split history record ***
      await splitStore.updateSplitSession(historyId, {
        splitResult: result,
        splitConfig: { 
          ...splitConfig, 
          itemSelections
        }, 
        billData: { 
          ...billData,
          assignments: itemSelections
        },
        billPayment,
        isSplitCalculated: true,
        updatedAt: new Date().toISOString(),
        currentStep: splitStore.SPLIT_STEPS.SUMMARY_REVIEW // Update step to summary review
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate split. Please try again.');
      console.error('Split calculation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep - 1].component) {
      case 'items':
        return (
          <BillItemsList
            items={billData.items}
            members={members}
            selections={itemSelections}
            billPayment={billPayment}
            onSelectionChange={handleItemSelectionChange}
            onBillPaymentChange={handleBillPaymentChange}
          />
        );
      
      case 'config':
        return (
          <SplitConfiguration
            config={splitConfig}
            onChange={setSplitConfig}
            billData={billData}
            groupMembers={members}
            historyId={historyId}
            onValidationChange={setSplitValidations}
          />
        );
      
      case 'preview':
        return (
          <SplitPreview
            splitResult={splitResult}
            members={members}
            billData={billData}
          />
        );
      
      case 'settlement':
        return (
          <SettlementScreen
            splitResult={splitResult}
            groupData={{ ...groupData, members }}
            billData={billData}
            historyId={historyId}
            billPayment={billPayment}
            onComplete={() => navigation.navigate('Home')}
          />
        );
      
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1: // Items step
        const allItemsAssigned = billData.items.every(item => itemSelections[item.id] && itemSelections[item.id].length > 0);
        const billPaymentAssigned = billPayment && billPayment.payerId;
        return allItemsAssigned && billPaymentAssigned;
      case 2: // Config step
        return true;
      case 3: // Preview step
        return splitResult !== null;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (!canProceed()) {
        Alert.alert('Cannot Proceed', getStepValidationMessage());
        return;
    }

    if (currentStep === 2) {
      await calculateSplit(); // Wait for calculation
      setCurrentStep(currentStep + 1); // Then move to the Preview step (Step 3)
      console.log('SplitScreen: handleNext - setting currentStep to:', currentStep + 1);
    } else if (currentStep < steps.length) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      console.log('SplitScreen: handleNext - setting currentStep to:', nextStep);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prevStep => {
        const prev = prevStep - 1;
        console.log('SplitScreen: handlePrevious - setting currentStep to:', prev);
        return prev;
      }); 
    } else {
      console.log('SplitScreen: handlePrevious - Already at first step, not changing currentStep.');
    }
  };

  const getStepValidationMessage = () => {
    switch (currentStep) {
      case 1:
        // Check if every item has at least one member selected
        const allItemsAssigned = billData.items.every(item => 
          itemSelections[item.id] && itemSelections[item.id].length > 0
        );
        const billPaymentAssigned = billPayment && billPayment.payerId;

        if (!allItemsAssigned) return 'Please assign all items to at least one member.';
        if (!billPaymentAssigned) return 'Please specify who paid the complete bill.';
        return '';
      case 2:
        return isNextDisabled() ? 'Please resolve custom split validation issues.' : '';
      default:
        return '';
    }
  };

  // Add the handleCompleteSplit function here as previously discussed
  const handleCompleteSplit = async () => {
    setLoading(true);
    try {
      if (historyId) {
        const finalDataToSave = {
          splitResult: splitResult, // Ensure final result is saved
          billPayment: billPayment, // Add bill payment data
        };
        console.log('SplitScreen: Calling completeSplitSession with historyId:', historyId, 'and finalData:', finalDataToSave);
        await splitStore.completeSplitSession(historyId, finalDataToSave);
        console.log('SplitScreen: completeSplitSession call finished.');
        Alert.alert('Split Completed', 'The split session has been marked as completed.');
        navigation.navigate('History'); // Navigate back to history to see updated status
      } else {
        Alert.alert('Error', 'Cannot complete split: no history ID found.');
      }
    } catch (error) {
      console.error('SplitScreen: Error completing split session:', error);
      Alert.alert('Error', 'Failed to complete split session.');
    } finally {
      setLoading(false);
    }
  };

    // <--- NEW: Conditional rendering based on loading state
  if (loadingSession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading split session...</Text>
      </View>
    );
  }


  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {steps.map((step, index) => (
          <View key={step.id} style={styles.progressStep}>
            <View
              style={[
                styles.progressCircle,
                currentStep >= step.id && styles.progressCircleActive
              ]}
            >
              <Text
                style={[
                  styles.progressText,
                  currentStep >= step.id && styles.progressTextActive
                ]}
              >
                {step.id}
              </Text>
            </View>
            <Text style={[
              styles.progressLabel,
              currentStep === step.id && styles.progressLabelActive
            ]}>
              {step.title}
            </Text>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  currentStep > step.id && styles.progressLineActive
                ]}
              />
            )}
          </View>
        ))}
      </View>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollViewContent}>
        <Text style={styles.stepTitle}>
          {steps[currentStep - 1].title}
        </Text>
        
        {/* Show validation message if needed */}
        {!canProceed() && getStepValidationMessage() && (
          <View style={styles.validationMessage}>
            <Text style={styles.validationText}>
              {getStepValidationMessage()}
            </Text>
          </View>
        )}
        
        {renderStepContent()}

      {/* Complete Split Button */}
      {currentStep === 4 && (
          <TouchableOpacity
            style={[styles.completeButton , loading && styles.disabledButton]}
            onPress={handleCompleteSplit}
            disabled={loading}
          >
            <Text style={[styles.completeButtonText, loading && styles.disabledButtonText]}>
              {loading ? 'Completing...' : 'Complete Split'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 1 && currentStep < 4 && (
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={handlePrevious}
          >
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        )}
        
        {currentStep < steps.length && (
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              (!canProceed() || isNextDisabled()) && styles.disabledButton
            ]}
            onPress={handleNext}
            disabled={!canProceed() || isNextDisabled() || loading}
          >
            <Text style={[
              styles.primaryButtonText,
              (!canProceed() || isNextDisabled()) && styles.disabledButtonText
            ]}>
              {loading ? 'Calculating...' : 
               currentStep === 2 ? 'Calculate Split' : 'Next'} {/* Change button text based on step */}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 10,
  },
  progressStep: {
    alignItems: 'center',
    flex: 1,
  },
  progressCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  progressCircleActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ddd',
  },
  progressTextActive: {
    color: 'white',
  },
  progressLabel: {
    fontSize: 12,
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  progressLabelActive: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  progressLine: {
    position: 'absolute',
    top: 15,
    left: '100%',
    width: '100%',
    height: 2,
    backgroundColor: '#ddd',
    zIndex: -1,
  },
  progressLineActive: {
    backgroundColor: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollViewContent : {
    paddingBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  validationMessage: {
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  validationText: {
    color: '#856404',
    fontSize: 14,
    textAlign: 'center',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    borderColor: '#ccc',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButtonText: {
    color: '#999',
  },
  completeButton: { 
    backgroundColor: '#4CAF50', 
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center', 
    alignSelf: 'stretch', 
  },
  completeButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SplitScreen;