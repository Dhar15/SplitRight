// screens/CameraScanScreen.js
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function UploadScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  // const [cameraRef, setCameraRef] = useState(null);
  // const [cameraRef, setCameraRef] = useState<CameraView | null>(null); 
  const cameraRef = useRef<CameraView | null>(null); 
  const [isLoading, setIsLoading] = useState(false);
  // const [flashMode, setFlashMode] = useState("off");
  const [flashMode, setFlashMode] = useState<"on" | "off" | "auto">("off"); 


  const navigation = useNavigation();
  const isFocused = useIsFocused(); 

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    if (isFocused) {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
        }).start();
    } else {
        // Reset fade animation when unfocused, so it fades in next time
        fadeAnim.setValue(0);
    }
    // Pulse animation for scan button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.9,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [isFocused]);

  const getCameraPermissions = async () => {
    if (!permission?.granted) {
      await requestPermission();
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      setIsLoading(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        
        // Simulate processing delay
        setTimeout(() => {
          setIsLoading(false);
          navigation.navigate('BillReview', { imageUri: photo.uri });
        }, 1500);
        
      } catch (error) {
        setIsLoading(false);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    }
  };

  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant gallery access to upload bills.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        navigation.navigate('BillReview', { imageUri: result.assets[0].uri });
      }, 1000);
    }
  };

  const toggleFlash = () => {
    setFlashMode(
      flashMode === "off" ? "on" : "off"
    );
  };

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required to scan bills</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={getCameraPermissions}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isFocused) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.permissionText}>Loading camera...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.cameraContainer, { opacity: fadeAnim }]}>
        <CameraView
          style={styles.camera}
          facing="back"
          flash= {flashMode}
          ref= {cameraRef}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Your Bill</Text>
            <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
              <Text style={styles.flashButtonText}>
                {flashMode === "off" ? '⚡' : '💡'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Scan Frame */}
          <View style={styles.scanFrame}>
            <View style={styles.frameCorner} />
            <View style={[styles.frameCorner, styles.topRight]} />
            <View style={[styles.frameCorner, styles.bottomLeft]} />
            <View style={[styles.frameCorner, styles.bottomRight]} />
            
            <Text style={styles.scanInstruction}>
              Position your bill within the frame
            </Text>
          </View>

          {/* Bottom Controls */}
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.galleryButton} 
              onPress={pickImageFromGallery}
            >
              <Text style={styles.galleryButtonText}>📁</Text>
              <Text style={styles.galleryButtonLabel}>Gallery</Text>
            </TouchableOpacity>

            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={isLoading ? ['#6b7280', '#4b5563'] : ['#8b5cf6', '#ec4899']}
                  style={styles.captureGradient}
                >
                  {isLoading ? (
                    <Text style={styles.captureButtonText}>Processing...</Text>
                  ) : (
                    <Text style={styles.captureButtonText}>📸</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity style={styles.helpButton} onPress={() => Alert.alert('Tips', 'Ensure good lighting and position the bill within the frame.')}>
              <Text style={styles.helpButtonText}>❓</Text>
              <Text style={styles.helpButtonLabel}>Tips</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </Animated.View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.9)']}
            style={styles.loadingGradient}
          >
            <View style={styles.loadingSpinner}>
              <Text style={styles.loadingEmoji}>🔍</Text>
              <Text style={styles.loadingText}>Analyzing your bill...</Text>
              <Text style={styles.loadingSubtext}>Using AI to detect items</Text>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
    padding: 20,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000', 
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 20, 
    // paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flashButtonText: {
    fontSize: 20,
  },
  scanFrame: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  frameCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#8b5cf6',
    borderWidth: 3,
    top: height * 0.15,
    left: width * 0.1,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    right: width * 0.1,
    left: 'auto',
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  bottomLeft: {
    bottom: height * 0.20,
    top: 'auto',
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: height * 0.20,
    right: width * 0.1,
    left: 'auto',
    top: 'auto',
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  scanInstruction: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 400,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  galleryButton: {
    alignItems: 'center',
  },
  galleryButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  galleryButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  captureButton: {
    borderRadius: 40,
    overflow: 'hidden',
  },
  captureGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 32,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  helpButton: {
    alignItems: 'center',
  },
  helpButtonText: {
    fontSize: 24,
    marginBottom: 4,
  },
  helpButtonLabel: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingSpinner: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  loadingSubtext: {
    color: '#a1a1aa',
    fontSize: 14,
  },
});