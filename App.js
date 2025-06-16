import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './src/services/firebase';

import AsyncStorage from '@react-native-async-storage/async-storage';

// Import your screens
import WelcomeScreen from './src/screens/WelcomeScreen';
import HomeScreen from './src/screens/HomeScreen'; 
import SplitScreen from './src/screens/SplitScreen';
import BillInputScreen from './src/screens/BillInputScreen';
import GroupSetupScreen from './src/screens/GroupSetupScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import BillScannerScreen from './src/screens/BillScannerScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();

// Loading component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#667eea" />
  </View>
);

export default function App() {

  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor="#667eea" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false, 
          animation: 'slide_from_right',
        }}
      >
        {user ? (
          // User is signed in - show app screens
          <>
            <Stack.Screen 
              name="Home" 
              component={HomeScreen}
              options={{
                gestureEnabled: false, // Prevent going back to welcome screen
              }}
            />
           <Stack.Screen 
              name="BillScanner"
              component={BillScannerScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
            <Stack.Screen 
              name="BillInput"
              component={BillInputScreen} 
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
            <Stack.Screen 
              name="GroupSetup"
              component={GroupSetupScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
            <Stack.Screen 
              name="Split"
              component={SplitScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
            <Stack.Screen 
              name="History"
              component={HistoryScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
            <Stack.Screen 
              name="GroupSetupScreen"
              component={GroupSetupScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
             <Stack.Screen 
              name="Profile"
              component={ProfileScreen}
              options={{ 
                headerShown: false,
                presentation: 'modal' 
              }} 
            />
          </>
        ) : (
          // User is not signed in - show welcome screen
          <Stack.Screen 
            name="Welcome" 
            component={WelcomeScreen}
            options={{
              gestureEnabled: false,
            }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  homeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 10,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

