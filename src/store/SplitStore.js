
// store/SplitStore.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const SPLIT_HISTORY_KEY = '@split_history';

class SplitStore {
  constructor() {
    this.STORAGE_KEYS = {
      GROUPS: 'splitright_groups',
      BILLS: 'splitright_bills',
      SPLIT_HISTORY: 'splitright_split_history',
      USER_PREFERENCES: 'splitright_user_preferences',
      MEMBER_PROFILES: 'splitright_member_profiles'
    };
    
    // Define split workflow steps
    this.SPLIT_STEPS = {
      GROUP_CREATION: 'group_creation',
      BILL_ENTRY: 'bill_entry',
      BILL_ASSIGNMENT: 'bill_assignment',
      PAYMENT_RECORDING: 'payment_recording',
      SUMMARY_REVIEW: 'summary_review',
      COMPLETED: 'completed'
    };
    
    this.defaultPreferences = {
      defaultTipStrategy: 'proportional',
      defaultDiscountStrategy: 'proportional',
      defaultTaxStrategy: 'proportional',
      currency: 'INR',
      currencySymbol: '₹',
      exportFormat: 'pdf',
      autoSaveEnabled: true,
      notificationsEnabled: true
    };
  }

  // ============ UTILITY METHODS ============

async _getItem(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    console.log(`SplitStore: Successfully got item "${key}"`);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error(`SplitStore: Error getting item "${key}" from AsyncStorage:`, error);
    await this._removeItem(key);
    return null;
  }
}

async _setItem(key, value) {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    console.log(`SplitStore: Successfully saved key "${key}"`);
  } catch (error) {
    console.error(`SplitStore: Error saving key "${key}"`, error);
    throw error;
  }
}

  async _removeItem(key) {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing item ${key}:`, error);
      return false;
    }
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // ============ GROUP MANAGEMENT ============

async saveGroup(groupData) {
  try {
    let groups = await this.getAllGroups();
    
    // Ensure groups is always an array
    if (!Array.isArray(groups)) {
      console.warn('Groups data is not an array, initializing as empty array');
      groups = [];
    }
    
    const groupId = groupData.id || this.generateId();
    
    const groupToSave = {
      ...groupData,
      id: groupId,
      createdAt: groupData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update existing group or add new one
    const existingIndex = groups.findIndex(g => g.id === groupId);
    if (existingIndex >= 0) {
      groups[existingIndex] = groupToSave;
    } else {
      groups.push(groupToSave);
    }

    await this._setItem(this.STORAGE_KEYS.GROUPS, groups); // Remove JSON.stringify here
    return groupToSave;
  } catch (error) {
    console.error('Error saving group:', error);
    throw error;
  }
}

async getAllGroups() {
  try {
    const groups = await this._getItem(this.STORAGE_KEYS.GROUPS);
    
    // Ensure we always return an array
    if (!groups) {
      return [];
    }
    
    if (!Array.isArray(groups)) {
      console.warn('Groups data is not an array, returning empty array');
      return [];
    }
    
    return groups;
  } catch (error) {
    console.error('Error getting groups:', error);
    return [];
  }
}

  async getGroup(groupId) {
    try {
      const groups = await this.getAllGroups();
      return groups.find(g => g.id === groupId) || null;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  }

  async deleteGroup(groupId) {
    try {
      const groups = await this.getAllGroups();
      const filteredGroups = groups.filter(g => g.id !== groupId);
      
      // Also delete related bills and split history
      await this.deleteBillsByGroup(groupId);
      await this.deleteSplitHistoryByGroup(groupId);
      
      return await this._setItem(this.STORAGE_KEYS.GROUPS, filteredGroups);
    } catch (error) {
      console.error('Error deleting group:', error);
      return false;
    }
  }

  // ============ BILL MANAGEMENT ============

async saveBill(billData, groupId) {
  try {
    let bills = await this.getAllBills();
    
    // Ensure bills is always an array
    if (!Array.isArray(bills)) {
      console.warn('Bills data is not an array, initializing as empty array');
      bills = [];
    }
    
    const billId = billData.id || this.generateId();
    
    const billToSave = {
      ...billData,
      id: billId,
      groupId,
      createdAt: billData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Update existing bill or add new one
    const existingIndex = bills.findIndex(b => b.id === billId);
    if (existingIndex >= 0) {
      bills[existingIndex] = billToSave;
    } else {
      bills.push(billToSave);
    }

    await this._setItem(this.STORAGE_KEYS.BILLS, bills); 
    return billToSave;
  } catch (error) {
    console.error('Error saving bill:', error);
    throw error;
  }
}

async getAllBills() {
  try {
    const bills = await this._getItem(this.STORAGE_KEYS.BILLS);
    
    // Ensure we always return an array
    if (!bills) {
      return [];
    }
    
    if (!Array.isArray(bills)) {
      console.warn('Bills data is not an array, returning empty array');
      return [];
    }
    
    return bills;
  } catch (error) {
    console.error('Error getting bills:', error);
    return [];
  }
}

async getBillsByGroup(groupId) {
  try {
    const bills = await this.getAllBills();
    return bills.filter(b => b.groupId === groupId);
  } catch (error) {
    console.error('Error getting bills by group:', error);
    return [];
  }
}

async getBill(billId) {
  try {
    const bills = await this.getAllBills();
    return bills.find(b => b.id === billId) || null;
  } catch (error) {
    console.error('Error getting bill:', error);
    return null;
  }
}

async deleteBill(billId) {
  try {
    const bills = await this.getAllBills();
    const filteredBills = bills.filter(b => b.id !== billId);
    
    // Also delete related split history
    await this.deleteSplitHistoryByBill(billId);
    
    await this._setItem(this.STORAGE_KEYS.BILLS, filteredBills); 
    return true;
  } catch (error) {
    console.error('Error deleting bill:', error);
    return false;
  }
}

async deleteBillsByGroup(groupId) {
  try {
    const bills = await this.getAllBills();
    const filteredBills = bills.filter(b => b.groupId !== groupId);
    await this._setItem(this.STORAGE_KEYS.BILLS, filteredBills); 
    return true;
  } catch (error) {
    console.error('Error deleting bills by group:', error);
    return false;
  }
}


  // ============ ENHANCED SPLIT HISTORY MANAGEMENT ============
  
  /**
   * Create or update a split session
   * @param {Object} splitData - The split session data
   * @param {string} splitData.id - Optional existing ID
   * @param {Object} splitData.groupData - Group information
   * @param {Object} splitData.billData - Bill information
   * @param {Object} splitData.billPayment - Bill payment information (who paid the entire bill)
   * @param {Object} splitData.isSplitCalculated - Split Calculation information
   * @param {string} splitData.currentStep - Current step in the process
   * @param {boolean} splitData.isCompleted - Whether the split is completed
   * @param {Object} splitData.splitResult - Final split calculations
   * @param {string} splitData.timestamp - Creation/update timestamp
   */
  async saveSplitHistory(splitData) {
  try {
    let history = await this.getAllSplitHistory();

    if (!history || typeof history !== 'object' || Array.isArray(history)) {
      console.warn('Split history corrupted or empty. Resetting to object.');
      history = {}; // Reset to clean object
    }

    const splitId = splitData.id || this.generateId();

    const splitToSave = {
      id: splitId,
      groupData: splitData.groupData || null,
      billData: splitData.billData || null,
      billPayment: splitData.billPayment || null, // Changed from paymentData to billPayment
      isSplitCalculated: splitData.isSplitCalculated || false,
      currentStep: splitData.currentStep || this.SPLIT_STEPS.GROUP_CREATION,
      isCompleted: splitData.isCompleted || false,
      splitResult: splitData.splitResult || null,
      timestamp: splitData.timestamp || new Date().toISOString(),
      createdAt: splitData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: {
        lastModifiedStep: splitData.currentStep || this.SPLIT_STEPS.GROUP_CREATION,
        progressPercentage: this._calculateProgress(splitData),
        ...splitData.metadata
      }
    };

    history[splitId] = splitToSave;

    await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, history); 
    return splitToSave;
  } catch (error) {
    console.error('Error saving split history:', error);
    throw error;
  }
}

  /**
   * Calculate progress percentage based on completed steps
   */
  _calculateProgress(splitData) {
    let progress = 0;

    // Log the incoming splitData for full context
    console.log('SplitStore: _calculateProgress - Incoming splitData:', JSON.stringify(splitData, null, 2));
    
    // Group created (25%)
    if (splitData.groupData && splitData.billData && splitData.billData.items && splitData.groupData.members && splitData.groupData.members.length > 0) {
      progress += 25;
      console.log('SplitStore: _calculateProgress - Check 1 (Group created): PASSED. Current Progress:', progress);
    }
    
    // Items assigned and bill payment assigned (25%)
    if (splitData.billPayment && splitData.billPayment.payerId) {
      progress += 25;
      console.log('SplitStore: _calculateProgress - Check 2 (Bill payment assigned): PASSED. Current Progress:', progress);
    }

    // Split Calculated (25%)
    if (splitData.isSplitCalculated === true) {
      progress += 25;
      console.log('SplitStore: _calculateProgress - Check 3 (Split Calculated): PASSED. Current Progress:', progress);
    }
    

    if (splitData.isCompleted === true) {
      progress += 25;
      console.log('SplitStore: Check 4 (Payments/Completed): Condition met! Progress after final step:', progress);
    }
    return progress;
  }

  /**
   * Create a new split session
   */
  async createSplitSession(initialData = {}) {
    try {
      const sessionData = {
        currentStep: this.SPLIT_STEPS.GROUP_CREATION,
        isSplitCalculated: false,
        isCompleted: false,
        timestamp: new Date().toISOString(),
        ...initialData,
        groupData: initialData.groupData || null, 
        billData: initialData.billData || null,
        billPayment: initialData.billPayment || null, // Changed from paymentData to billPayment
      };
      
      const savedSession = await this.saveSplitHistory(sessionData);
      return savedSession;
    } catch (error) {
      console.error('Error creating split session:', error);
      throw error;
    }
  }

  // Get a new split session by ID
  async getSplitSession(sessionId) {
    try {
      const allHistory = await this.getAllSplitHistory();

      // Defensive check for object shape
      if (!allHistory || typeof allHistory !== 'object') {
        console.warn('Split history is empty or malformed.');
        return null;
      }

      const session = allHistory[sessionId];
      if (!session) {
        console.warn(`Split session ID ${sessionId} not found in history.`);
        return null;
      }

      return session;
    } catch (error) {
      console.error('Error getting split session by ID:', sessionId, error);
      return null; // Instead of throwing again, just return null for consistency
    }
  }

  // Update an existing split session
  async updateSplitSession(splitId, updateData) {
    try {
      const history = await this.getAllSplitHistory(); // get entire object

      if (!history[splitId]) {
        throw new Error('Split session not found');
      }

      const existingSession = history[splitId];

      // Start with a shallow copy of the existing session
      const updatedSplit = {
        ...existingSession,
        id: splitId, // Ensure ID is always correctly set
        updatedAt: new Date().toISOString() // Update timestamp
      };

      // === Deep merge for billData ===
      if (updateData.billData) {
        updatedSplit.billData = {
          ...(existingSession.billData || {}), 
          ...updateData.billData              
        };

        // === Deep merge specifically for assignments within billData ===
        if (updateData.billData.assignments) {
          updatedSplit.billData.assignments = {
            ...(existingSession.billData && existingSession.billData.assignments || {}), 
            ...updateData.billData.assignments                                        
          };
        }
      }

      // === Deep merge for billPayment ===
      if (updateData.billPayment) {
        updatedSplit.billPayment = {
          ...(existingSession.billPayment || {}), 
          ...updateData.billPayment              
        };
      }

      if (updateData.groupData) {
        updatedSplit.groupData = {
          ...(existingSession.groupData || {}), 
          ...updateData.groupData             
        };
      }
      
      Object.keys(updateData).forEach(key => {
        // Exclude keys that are objects which we've already deep-merged
        if (key !== 'billData' && key !== 'groupData' && key !== 'billPayment') {
          updatedSplit[key] = updateData[key];
        }
      });

      await this.saveSplitHistory(updatedSplit);
      return updatedSplit;
    } catch (error) {
      console.error('Error updating split session:', error);
      throw error;
    }
  }

  //// BILL PAYMENT RECORDING & COMPLETION ////
  /**
   * Update bill payment data for a specific split session
   */
  async updateBillPayment(splitId, billPayment) {
    try {
      const updateData = {
        billPayment: billPayment,
        currentStep: this.SPLIT_STEPS.PAYMENT_RECORDING
      };

      return await this.updateSplitSession(splitId, updateData);
    } catch (error) {
      console.error('Error updating bill payment:', error);
      throw error;
    }
  }

  /**
   * Get bill payment data for a split session
   */
  async getBillPayment(splitId) {
    try {
      const session = await this.getSplitSession(splitId);
      return session ? session.billPayment : null;
    } catch (error) {
      console.error('Error getting bill payment data:', error);
      return null;
    }
  }

  /**
   * Mark a split session as completed
   */
  async completeSplitSession(splitId, finalData = {}) {
    try {
      const updateData = {
        ...finalData,
        currentStep: this.SPLIT_STEPS.COMPLETED,
        isCompleted: true,
        isSplitCalculated: true,
        completedAt: new Date().toISOString()
      };

      // Patch missing assignments into billData
      if (
        finalData?.splitResult?.assignments &&
        (!finalData?.billData?.assignments || Object.keys(finalData.billData.assignments).length === 0)
      ) {
        updateData.billData = {
          ...(finalData.billData || {}),
          assignments: finalData.splitResult.assignments,
        };
      }

      console.log('SplitStore: completeSplitSession - Preparing to update session:', splitId, 'with data:', updateData);
      return await this.updateSplitSession(splitId, updateData);
    } catch (error) {
      console.error('Error completing split session:', error);
      throw error;
    }
  }

async getAllSplitHistory() {
  try {
    const raw = await this._getItem(this.STORAGE_KEYS.SPLIT_HISTORY);
    // const parsed = raw ? JSON.parse(raw) : {};

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      console.warn('⚠️ Split history is malformed. Resetting...');
      await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, {});
      return {};
    }

    return raw;
  } catch (error) {
    console.error('Error getting all split history:', error);
    return {};
  }
}

async getSplitHistory(splitId) {
  try {
    const allHistory = await this.getAllSplitHistory();
    return allHistory[splitId] || null;
  } catch (error) {
    console.error(`Error getting split session by ID: ${splitId}`, error);
    return null;
  }
}

  async getSplitHistoryByGroup(groupId) {
    try {
      const history = await this.getAllSplitHistory();
      return Object.values(history).filter(s => s.groupData?.id === groupId);
    } catch (error) {
      console.error('Error getting split history by group:', error);
      return [];
    }
  }

  async getSplitHistoryByBill(billId) {
    try {
      const history = await this.getAllSplitHistory();
      return Object.values(history).filter(s => s.billData?.id === billId);
    } catch (error) {
      console.error('Error getting split history by bill:', error);
      return [];
    }
  }

  /**
   * Get incomplete split sessions
   */
  async getIncompleteSplits() {
    try {
      const history = await this.getAllSplitHistory();
      return Object.values(history).filter(s => !s.isCompleted);
    } catch (error) {
      console.error('Error getting incomplete splits:', error);
      return [];
    }
  }

  /**
   * Get completed split sessions
   */
  async getCompletedSplits() {
    try {
      const history = await this.getAllSplitHistory();
      return Object.values(history).filter(s => s.isCompleted);
    } catch (error) {
      console.error('Error getting completed splits:', error);
      return [];
    }
  }

async deleteSplitHistory(splitId) {
  try {
    const history = await this.getAllSplitHistory();
    delete history[splitId];
    return await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, history);
  } catch (error) {
    console.error('Error deleting split history:', error);
    return false;
  }
}

async deleteSplitHistoryByGroup(groupId) {
  try {
    const history = await this.getAllSplitHistory();
    const newHistory = Object.fromEntries(
      Object.entries(history).filter(([_, s]) => s.groupData?.id !== groupId)
    );
    return await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, newHistory);

  } catch (error) {
    console.error('Error deleting split history by group:', error);
    return false;
  }
}

  async deleteSplitHistoryByBill(billId) {
  try {
    const history = await this.getAllSplitHistory();
    const newHistory = Object.fromEntries(
      Object.entries(history).filter(([_, s]) => s.billData?.id !== billId)
    );
    await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, newHistory);

  } catch (error) {
    console.error('Error deleting split history by bill:', error);
    return false;
  }
}

  async clearAllHistory() {
  try {
    await this._removeItem(this.STORAGE_KEYS.SPLIT_HISTORY);
    console.log('All split history cleared successfully');
    return true;
  } catch (error) {
    console.error('Error clearing all split history:', error);
    return false;
  }
}

  // ============ MEMBER PROFILES MANAGEMENT ============
  
  async saveMemberProfile(memberData) {
    try {
      const profiles = await this.getAllMemberProfiles() || [];
      const memberId = memberData.id || this.generateId();
      
      const profileToSave = {
        ...memberData,
        id: memberId,
        createdAt: memberData.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Update existing profile or add new one
      const existingIndex = profiles.findIndex(p => p.id === memberId);
      if (existingIndex >= 0) {
        profiles[existingIndex] = profileToSave;
      } else {
        profiles.push(profileToSave);
      }

      await this._setItem(this.STORAGE_KEYS.MEMBER_PROFILES, profiles);
      return profileToSave;
    } catch (error) {
      console.error('Error saving member profile:', error);
      throw error;
    }
  }

  async getAllMemberProfiles() {
    try {
      return await this._getItem(this.STORAGE_KEYS.MEMBER_PROFILES) || [];
    } catch (error) {
      console.error('Error getting member profiles:', error);
      return [];
    }
  }

  async getMemberProfile(memberId) {
    try {
      const profiles = await this.getAllMemberProfiles();
      return profiles.find(p => p.id === memberId) || null;
    } catch (error) {
      console.error('Error getting member profile:', error);
      return null;
    }
  }

  async deleteMemberProfile(memberId) {
    try {
      const profiles = await this.getAllMemberProfiles();
      const filteredProfiles = profiles.filter(p => p.id !== memberId);
      return await this._setItem(this.STORAGE_KEYS.MEMBER_PROFILES, filteredProfiles);
    } catch (error) {
      console.error('Error deleting member profile:', error);
      return false;
    }
  }

  // ============ USER PREFERENCES ============
  
  async saveUserPreferences(preferences) {
    try {
      const currentPrefs = await this.getUserPreferences();
      const updatedPrefs = {
        ...currentPrefs,
        ...preferences,
        updatedAt: new Date().toISOString()
      };
      
      return await this._setItem(this.STORAGE_KEYS.USER_PREFERENCES, updatedPrefs);
    } catch (error) {
      console.error('Error saving user preferences:', error);
      return false;
    }
  }

  async getUserPreferences() {
    try {
      const prefs = await this._getItem(this.STORAGE_KEYS.USER_PREFERENCES);
      return prefs || this.defaultPreferences;
    } catch (error) {
      console.error('Error getting user preferences:', error);
      return this.defaultPreferences;
    }
  }

  async resetUserPreferences() {
    try {
      return await this._setItem(this.STORAGE_KEYS.USER_PREFERENCES, this.defaultPreferences);
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      return false;
    }
  }

  // ============ ANALYTICS & INSIGHTS ============
  
  async getSpendingAnalytics(groupId = null, startDate = null, endDate = null) {
    try {
      let history = await this.getAllSplitHistory();
      history = Object.values(history); // Convert object to array for processing
      
      // Filter by group if specified
      if (groupId) {
        history = history.filter(s => s.groupData?.id === groupId);
      }

      // Filter by date range if specified
      if (startDate || endDate) {
        history = history.filter(s => {
          const splitDate = new Date(s.createdAt);
          if (startDate && splitDate < new Date(startDate)) return false;
          if (endDate && splitDate > new Date(endDate)) return false;
          return true;
        });
      }

      // Calculate analytics
      const totalSplits = history.length;
      const completedSplits = history.filter(s => s.isCompleted).length;
      const totalAmount = history.reduce((sum, s) => sum + (s.billData?.grandTotal || 0), 0);
      const avgAmount = totalSplits > 0 ? totalAmount / totalSplits : 0;

      // Category breakdown
      const categoryBreakdown = {};
      history.forEach(split => {
        if (split.splitResult?.itemSplits) {
          split.splitResult.itemSplits.forEach(item => {
            const category = item.category || 'other';
            categoryBreakdown[category] = (categoryBreakdown[category] || 0) + item.totalAmount;
          });
        }
      });

      // Member statistics
      const memberStats = {};
      history.forEach(split => {
        if (split.splitResult?.finalAmounts) {
          Object.entries(split.splitResult.finalAmounts).forEach(([memberId, amount]) => {
            if (!memberStats[memberId]) {
              memberStats[memberId] = {
                totalSpent: 0,
                splitCount: 0,
                avgSpent: 0
              };
            }
            memberStats[memberId].totalSpent += amount;
            memberStats[memberId].splitCount += 1;
            memberStats[memberId].avgSpent = memberStats[memberId].totalSpent / memberStats[memberId].splitCount;
          });
        }
      });

      return {
        totalSplits,
        completedSplits,
        incompleteSplits: totalSplits - completedSplits,
        totalAmount,
        avgAmount,
        categoryBreakdown,
        memberStats,
        recentSplits: history.slice(0, 10) // Last 10 splits
      };
    } catch (error) {
      console.error('Error getting spending analytics:', error);
      return null;
    }
  }

  // ============ DATA MANAGEMENT ============
  
  async exportAllData() {
    try {
      const data = {
        groups: await this.getAllGroups(),
        bills: await this.getAllBills(),
        splitHistory: await this.getAllSplitHistory(),
        memberProfiles: await this.getAllMemberProfiles(),
        userPreferences: await this.getUserPreferences(),
        exportedAt: new Date().toISOString(),
        version: '1.2' // Updated version for billPayment structure
      };
      
      return data;
    } catch (error) {
      console.error('Error exporting data:', error);
      return null;
    }
  }

  async importData(data) {
    try {
      if (!data || !data.version) {
        throw new Error('Invalid data format');
      }

      // Backup current data
      const backup = await this.exportAllData();
      await this._setItem('splitright_backup_' + Date.now(), backup);

      // Import new data
      if (data.groups) await this._setItem(this.STORAGE_KEYS.GROUPS, data.groups);
      if (data.bills) await this._setItem(this.STORAGE_KEYS.BILLS, data.bills);
      if (data.splitHistory) await this._setItem(this.STORAGE_KEYS.SPLIT_HISTORY, data.splitHistory);
      if (data.memberProfiles) await this._setItem(this.STORAGE_KEYS.MEMBER_PROFILES, data.memberProfiles);
      if (data.userPreferences) await this._setItem(this.STORAGE_KEYS.USER_PREFERENCES, data.userPreferences);

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }

  async clearAllData() {
    try {
      // Create backup before clearing
      const backup = await this.exportAllData();
      await this._setItem('splitright_backup_' + Date.now(), backup);

      // Clear all data
      await Promise.all([
        this._removeItem(this.STORAGE_KEYS.GROUPS),
        this._removeItem(this.STORAGE_KEYS.BILLS),
        this._removeItem(this.STORAGE_KEYS.SPLIT_HISTORY),
        this._removeItem(this.STORAGE_KEYS.MEMBER_PROFILES),
        this._removeItem(this.STORAGE_KEYS.USER_PREFERENCES)
      ]);

      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  // ============ SEARCH & FILTER ============
  
  async searchSplits(query, filters = {}) {
    try {
      let history = await this.getAllSplitHistory();
      
      // Text search
      if (query) {
        const searchTerm = query.toLowerCase();
        history = history.filter(split => {
          return (
            split.groupData?.name?.toLowerCase().includes(searchTerm) ||
            split.billData?.merchant?.toLowerCase().includes(searchTerm) ||
            split.billData?.items?.some(item => 
              item.name?.toLowerCase().includes(searchTerm)
            )
          );
        });
      }

      // Apply filters
      if (filters.groupId) {
        history = history.filter(s => s.groupData?.id === filters.groupId);
      }
      if (filters.minAmount) {
        history = history.filter(s => s.billData?.grandTotal >= filters.minAmount);
      }
      if (filters.maxAmount) {
        history = history.filter(s => s.billData?.grandTotal <= filters.maxAmount);
      }
      if (filters.startDate) {
        history = history.filter(s => new Date(s.createdAt) >= new Date(filters.startDate));
      }
      if (filters.endDate) {
        history = history.filter(s => new Date(s.createdAt) <= new Date(filters.endDate));
      }
      if (filters.category) {
        history = history.filter(s => 
          s.splitResult?.itemSplits?.some(item => item.category === filters.category)
        );
      }
      if (filters.isCompleted !== undefined) {
        history = history.filter(s => s.isCompleted === filters.isCompleted);
      }

      return history;
    } catch (error) {
      console.error('Error searching splits:', error);
      return [];
    }
  }
}

// Export singleton instance
export const splitStore = new SplitStore();
export default splitStore;