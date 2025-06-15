// components/SplitConfiguration.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import splitStore from '../store/SplitStore';

const SplitConfiguration = ({ config, onChange, billData, groupMembers = [], onValidationChange, historyId }) => {
  console.log('SplitConfiguration: Received historyId:', historyId);
  const [showCustomRatios, setShowCustomRatios] = useState({
    tax: false, 
    tip: false,
    discount: false
  });

  // Use useEffect to set initial showCustomRatios based on config
  useEffect(() => {
    if (config) {
      setShowCustomRatios({
        tax: config.taxStrategy === 'custom',
        tip: config.tipStrategy === 'custom',
        discount: config.discountStrategy === 'custom'
      });
    }
  }, [config]); // Re-run when config changes

  useEffect(() => {
  if (!config || !onValidationChange) return;

  const validations = {};

  ['tax', 'tip', 'discount'].forEach(category => {
    if (config?.[`${category}Strategy`] === 'custom') {
      const ratios = config?.customRatios?.[category] || {};
      const total = Object.values(ratios).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
      validations[category] = Math.abs(total - 100) < 0.01;
    } else {
      validations[category] = true;
    }
  });

  onValidationChange(validations);
}, [config, onValidationChange]);

  // Early return if required props are missing
  if (!config || !onChange || !billData) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Missing required configuration data</Text>
      </View>
    );
  }

  const updateConfig = async (key, value) => {
  const updatedConfig = {
    ...config,
    [key]: value
  };
  onChange(updatedConfig);

  // ✅ Persist to history
  if (historyId) {
    await splitStore.updateSplitSession(historyId, {
      splitConfig: updatedConfig
    });
  }
};

  const updateCustomRatio = async (category, memberId, ratio) => {
  const updatedRatios = {
    ...(config?.customRatios || {}),
    [category]: {
      ...(config?.customRatios?.[category] || {}),
      [memberId]: parseFloat(ratio) || 0
    }
  };

  const updatedConfig = {
    ...config,
    customRatios: updatedRatios
  };

  onChange(updatedConfig);

  // ✅ Persist to history
  if (historyId) {
    await splitStore.updateSplitSession(historyId, {
      splitConfig: updatedConfig
    });
  }
};

  const handleStrategyChange = (category, strategy) => {
    updateConfig(`${category}Strategy`, strategy);
    setShowCustomRatios(prev => ({
      ...prev,
      [category]: strategy === 'custom'
    }));
  };

  const ConfigOption = ({ title, description, options, currentValue, onSelect, category, showCustom, groupMembers, updateCustomRatio, config }) => {
    
    const [localRatios, setLocalRatios] = useState({});

    useEffect(() => {
      const initial = {};
      groupMembers.forEach(member => {
        initial[member.id] = config?.customRatios?.[category]?.[member.id]?.toString() || '';
      });
      setLocalRatios(initial);
    }, [category]);

    const total = Object.values(localRatios).reduce((sum, val) => sum + parseFloat(val || 0), 0);

    return(    
    <View style={styles.configSection}>
      <Text style={styles.configTitle}>{title}</Text>
      <Text style={styles.configDescription}>{description}</Text>
      <View style={styles.optionsContainer}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.optionButton,
              currentValue === option.value && styles.optionButtonSelected
            ]}
            onPress={() => onSelect(option.value)}
          >
            <Text
              style={[
                styles.optionText,
                currentValue === option.value && styles.optionTextSelected
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Custom Ratios Section */}
      {showCustomRatios[category] && groupMembers.length > 0 && (
        <View style={styles.customRatiosContainer}>
          <Text style={styles.customRatiosTitle}>Set Custom Ratios:</Text>
          <Text style={styles.customRatiosDescription}>
            Provide the split for each member in % (they must add up to 100%)
          </Text>
          <Text style={{ color: total !== 100 ? 'red' : 'green' }}>
            Total: {total}%
          </Text>
          {groupMembers.map(member => (
            <View key={member.id} style={styles.ratioInputContainer}>
              <Text style={styles.memberName}>{member.name}:</Text>
              <TextInput
                style={styles.ratioInput}
                // value={config?.customRatios?.[category]?.[member.id]?.toString() || ''}
                value={localRatios[member.id]}
                onChangeText={(text) => {
                  setLocalRatios(prev => ({ ...prev, [member.id]: text }));
                }}
                onBlur={() => {
                  updateCustomRatio(category, member.id, localRatios[member.id]);
                }}
                // onChangeText={(text) => updateCustomRatio(category, member.id, text)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#666"
              />
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const taxValue = billData?.taxes || 0;
const discountValue = billData?.discounts?.reduce((sum, d) => sum + (d?.value || 0), 0) || 0;
const tipServiceChargeValue = (billData?.tips || 0) + (billData?.serviceCharges || 0);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionHeader}>Configure Split Settings</Text>
      
      {taxValue > 0 && (
        <ConfigOption
        title="Tax Calculation"
        description="How should taxes be calculated?"
        currentValue={config?.taxStrategy || 'equal'}
        category="tax"
        onSelect={(value) => handleStrategyChange('tax', value)}
        options={[
          { value: 'proportional', label: 'Proportionally' },
          { value: 'equal', label: 'Equally' },
          { value: 'custom', label: 'Custom' },
        ]}
        showCustom={showCustomRatios.tax}
        groupMembers={groupMembers}
        updateCustomRatio={updateCustomRatio}
        config={config}
      />
      )}

      {tipServiceChargeValue > 0 && (      
        <ConfigOption
          title="Tip & Service Charge Split"
          description="How should tips and service charges be divided?"
          currentValue={config?.tipStrategy || 'equal'}
          category="tip"
          onSelect={(value) => handleStrategyChange('tip', value)}
          options={[
            { value: 'proportional', label: 'Proportionally' },
            { value: 'equal', label: 'Equally' },
            { value: 'custom', label: 'Custom' }
          ]}
          showCustom={showCustomRatios.tip}
          groupMembers={groupMembers}
          updateCustomRatio={updateCustomRatio}
          config={config}
        />
      )}
      
      {discountValue > 0 && (
        <ConfigOption
          title="Discount Application"
          description="How should discounts be applied?"
          currentValue={config?.discountStrategy || 'equal'}
          category="discount"
          onSelect={(value) => handleStrategyChange('discount', value)}
          options={[
            { value: 'proportional', label: 'Proportionally' },
            { value: 'equal', label: 'Equally' },
            { value: 'custom', label: 'Custom' }
          ]}
          showCustom={showCustomRatios.discount}
          groupMembers={groupMembers}
          updateCustomRatio={updateCustomRatio}
          config={config}
        />
      )}

      {/* Bill Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Bill Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal:</Text>
          <Text style={styles.summaryValue}>₹{billData?.subtotal?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Taxes:</Text>
          <Text style={styles.summaryValue}>₹{billData?.taxes?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Discounts:</Text>
          <Text style={styles.summaryValue}>-₹{billData?.discounts?.reduce((sum, d) => sum + (d?.value || 0), 0)?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service charges & tips:</Text>
          <Text style={styles.summaryValue}>₹{((billData?.tips || 0) + (billData?.serviceCharges || 0))?.toFixed(2) || '0.00'}</Text>
        </View>
        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>₹{billData?.grandTotal?.toFixed(2) || '0.00'}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  sectionHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  configSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  configDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  optionButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  optionText: {
    fontSize: 14,
    color: '#333',
  },
  optionTextSelected: {
    color: '#fff',
    fontWeight: '500',
  },
  customRatiosContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  customRatiosTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#495057',
  },
  customRatiosDescription: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  ratioInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  memberName: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  ratioInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fff',
    fontSize: 14,
    textAlign: 'center',
    width: 80,
  },
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: '#007AFF',
    marginTop: 8,
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  errorText: {
    fontSize: 16,
    color: '#ff4444',
    textAlign: 'center',
    marginTop: 50,
  },
});

export default SplitConfiguration;