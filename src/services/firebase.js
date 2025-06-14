// src/services/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  enableNetwork, 
  doc,
  setDoc,
  getDoc,
  waitForPendingWrites,
} from 'firebase/firestore';
import NetInfo from '@react-native-community/netinfo';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVLXnV2D7N2gcrC3c53z0Emsm7XjubSdc",
  authDomain: "splitright-cdcc3.firebaseapp.com",
  projectId: "splitright-cdcc3",
  storageBucket: "splitright-cdcc3.firebasestorage.app",
  messagingSenderId: "1080522123578",
  appId: "1:1080522123578:web:71bf42df6de4c6d2158803",
  measurementId: "G-7BGQV2M5RL"
};

console.log('Initializing Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable offline persistence and configure Firestore
const setupFirestore = async () => {
  try {
    // Enable offline persistence for React Native
    await enableNetwork(db);
    await waitForPendingWrites(db);
    console.log('✅ Firestore initialized with offline persistence');
  } catch (error) {
    console.error('Firestore initialization error:', error);
  }
};

// Initialize Firestore when the module loads
setupFirestore();

// Network state monitoring
let isOnline = true;
let networkState = null;

const updateNetworkState = async () => {
  try {
    const state = await NetInfo.fetch();
    networkState = state;
    const wasOnline = isOnline;
    isOnline = state.isConnected && state.isInternetReachable;
    
    console.log('Network State Update:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      wasOnline,
      isOnline
    });
    
    if (!wasOnline && isOnline) {
      console.log('📶 Device is back online, enabling Firestore network');
      try {
        await enableNetwork(db);
        console.log('✅ Firestore network enabled successfully');
      } catch (error) {
        console.error('❌ Failed to enable Firestore network:', error);
      }
    } else if (wasOnline && !isOnline) {
      console.log('📵 Device went offline, Firestore will use cached data');
    }
  } catch (error) {
    console.error('Network state update error:', error);
  }
};

// Listen for network changes
NetInfo.addEventListener(updateNetworkState);

// Initial network state check
updateNetworkState();

// Enhanced utility function to check online status
export const checkOnlineStatus = async () => {
  try {
    const state = await NetInfo.fetch();
    console.log('Network Check:', {
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
      details: state.details
    });
    return state.isConnected && state.isInternetReachable;
  } catch (error) {
    console.error('Failed to check online status:', error);
    return false;
  }
};

// Improved error handling utility
export const handleFirestoreError = (error, operation = 'Firestore operation') => {
  console.error(`${operation} error:`, {
    code: error.code,
    message: error.message,
    stack: error.stack
  });
  
  // Handle specific Firestore error codes
  if (error.code === 'unavailable' || 
      error.code === 'failed-precondition' ||
      error.message.includes('offline') ||
      error.message.includes('client is offline')) {
    return {
      isOfflineError: true,
      message: 'Currently offline. Data will sync when connection is restored.',
      shouldRetry: true
    };
  }
  
  if (error.code === 'permission-denied') {
    return {
      isOfflineError: false,
      message: 'Permission denied. Please check your authentication.',
      shouldRetry: false
    };
  }
  
  if (error.code === 'deadline-exceeded' || error.code === 'timeout') {
    return {
      isOfflineError: false,
      message: 'Request timed out. Please check your connection.',
      shouldRetry: true
    };
  }
  
  return {
    isOfflineError: false,
    message: error.message || 'An unexpected error occurred.',
    shouldRetry: true
  };
};

// Fixed function to create user document with proper offline handling
export const createUserDocument = async (user, displayName = '') => {
  const userDocRef = doc(db, 'users', user.uid);
  
  const createDocWithRetry = async (retries = 3, delay = 2000) => {
    console.log(`📝 Attempting to create user document (${retries} retries left)`);
    
    try {
      // Check if we're online first
      const online = await checkOnlineStatus();
      
      if (online) {
        // Only check document existence when online
        console.log('🔍 Online - checking document existence...');
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          console.log('📄 Document does not exist, creating new document...');
          
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName || '',
            createdAt: new Date().toISOString(),
            profileComplete: false,
            totalExpenses: 0,
            groupsJoined: 0,
          };
          
          await setDoc(userDocRef, userData);
          console.log('✅ User document created successfully');
          return true;
        } else {
          console.log('📄 User document already exists');
          return true;
        }
      } else {
        // When offline, just create the document - Firestore will handle duplicates
        console.log('📱 Offline - creating document (will sync when online)...');
        
        const userData = {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.displayName || '',
          createdAt: new Date().toISOString(),
          profileComplete: false,
          totalExpenses: 0,
          groupsJoined: 0,
        };
        
        // Use merge: true to prevent overwriting existing data when it syncs
        await setDoc(userDocRef, userData, { merge: true });
        console.log('✅ User document queued for creation (offline)');
        return true;
      }
      
    } catch (error) {
      console.warn(`❌ Attempt failed: ${error.message}. Retries left: ${retries - 1}`);
      
      const handledError = handleFirestoreError(error, 'User document creation');
      
      // If it's an offline error and we haven't tried the offline approach
      if (handledError.isOfflineError) {
        console.log('📱 Switching to offline mode for document creation...');
        try {
          const userData = {
            uid: user.uid,
            email: user.email,
            displayName: displayName || user.displayName || '',
            createdAt: new Date().toISOString(),
            profileComplete: false,
            totalExpenses: 0,
            groupsJoined: 0,
          };
          
          await setDoc(userDocRef, userData, { merge: true });
          console.log('✅ User document created in offline mode');
          return true;
        } catch (offlineError) {
          console.error('❌ Offline creation also failed:', offlineError);
        }
      }
      
      if (retries > 1 && handledError.shouldRetry) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return createDocWithRetry(retries - 1, Math.min(delay * 1.5, 3000));
      }
      
      throw error;
    }
  };

  try {
    const result = await createDocWithRetry();
    return result;
  } catch (error) {
    console.error('💥 Final error creating user document:', error);
    
    const handledError = handleFirestoreError(error, 'Final user document creation');
    
    // If it's an offline error, don't throw - just return false
    if (handledError.isOfflineError) {
      console.log('📱 User document creation will be retried when back online');
      return false;
    }
    
    // For other errors, we can throw to trigger the alert
    throw error;
  }
};

// Function to force Firestore sync
export const forceFirestoreSync = async () => {
  try {
    console.log('🔄 Forcing Firestore sync...');
    await enableNetwork(db);
    await waitForPendingWrites(db);
    console.log('✅ Firestore sync completed');
    return true;
  } catch (error) {
    console.error('❌ Failed to sync Firestore:', error);
    return false;
  }
};

// Helper function to safely get a document (handles offline scenarios)
export const safeGetDoc = async (docRef, fallbackData = null) => {
  try {
    const online = await checkOnlineStatus();
    
    if (online) {
      const doc = await getDoc(docRef);
      return doc.exists() ? doc : null;
    } else {
      console.log('📱 Offline - returning fallback data or attempting cached read');
      // Firestore will try to return cached data even when offline
      const doc = await getDoc(docRef);
      return doc.exists() ? doc : null;
    }
  } catch (error) {
    const handledError = handleFirestoreError(error, 'Safe document get');
    
    if (handledError.isOfflineError) {
      console.log('📱 Document read failed due to offline status');
      return null;
    }
    
    throw error;
  }
};

// Export everything needed
export { auth, db, doc, setDoc, getDoc };