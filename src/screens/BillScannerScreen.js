// screens/BillScannerScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CameraView, CameraType, FlashMode, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const apiKey = Constants.expoConfig.extra.GOOGLE_API_KEY;

const BillScannerScreen = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [showCamera, setShowCamera] = useState(true);
  const cameraRef = useRef(null);

  // // Mock OCR function - Replace with actual OCR service
  // const performOCR = async (imageUri) => {
  //   // Simulate OCR processing time
  //   await new Promise(resolve => setTimeout(resolve, 2000));
    
  //   // Mock OCR results - Replace with actual OCR implementation
  //   const mockOCRResults = {
  //     items: [
  //       { name: 'Margherita Pizza', amount: 450.00 },
  //       { name: 'Caesar Salad', amount: 280.00 },
  //       { name: 'Garlic Bread', amount: 120.00 },
  //       { name: 'Coca Cola (2x)', amount: 80.00 },
  //     ],
  //     subtotal: 930.00,
  //     taxes: 83.70, // 9% tax
  //     serviceCharges: 46.50, // 5% service charge
  //     discounts: 0,
  //   };
    
  //   return mockOCRResults;
  // };

    const performOCR = async (imageUri) => {
    try {
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const body = {
        requests: [
          {
            image: { content: base64Image },
            features: [{ type: 'TEXT_DETECTION' }],
          },
        ],
      };

      console.log('Base64 Image Length:', base64Image.length);

      const response = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      const result = await response.json();
      console.log('Google Vision raw response:', result);

      // Add safety checks
      if (
        !result.responses ||
        !Array.isArray(result.responses) ||
        !result.responses[0] ||
        !result.responses[0].fullTextAnnotation
      ) {
        throw new Error('Google Vision response missing expected fields');
      }

      const text = result.responses[0].fullTextAnnotation.text;
      console.log('OCR Text:', text);

      const parsed = parseReceiptText(text);
      return parsed;
    } catch (error) {
      console.error('OCR error:', error);
      throw error;
    }
  };

  const parseReceiptText = (text) => {
  const lines = text.split('\n');

  const items = [];
  let subtotal = 0;
  let taxes = 0;
  let serviceCharges = 0;
  let discounts = 0;

  for (let line of lines) {
    const match = line.match(/(.+?)\s+([\d\.]+)$/);
    if (match) {
      const name = match[1].trim();
      const amount = parseFloat(match[2]);
      if (!isNaN(amount)) {
        if (/tax/i.test(name)) {
          taxes += amount;
        } else if (/service/i.test(name)) {
          serviceCharges += amount;
        } else if (/discount/i.test(name)) {
          discounts += amount;
        } else {
          items.push({ name, amount });
          subtotal += amount;
        }
      }
    }
  }

  return { items, subtotal, taxes, serviceCharges, discounts };
};


  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsProcessing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        
        setCapturedImage(photo.uri);
        setShowCamera(false);
        
        // Process the image with OCR
        await processImage(photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
        setIsProcessing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setIsProcessing(true);
        setCapturedImage(result.assets[0].uri);
        setShowCamera(false);
        
        // Process the image with OCR
        await processImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const processImage = async (imageUri) => {
    try {
      // Perform OCR on the image
      const ocrResults = await performOCR(imageUri);

      console.log('BillScannerScreen: OCR Results:', ocrResults);
      console.log('BillScannerScreen: Scanned Image URI:', imageUri);
      
      // Navigate to BillInputScreen with OCR results
      navigation.navigate('BillInput', {
        ocrResults: ocrResults,
        scannedImage: imageUri,
      });
    } catch (error) {
      console.error('OCR processing error:', error);
      Alert.alert(
        'Processing Error', 
        'Failed to process the bill. Would you like to try again or enter details manually?',
        [
          { text: 'Try Again', onPress: () => retryScanning() },
          { text: 'Manual Entry', onPress: () => navigation.navigate('BillInput') }
        ]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const retryScanning = () => {
    setCapturedImage(null);
    setShowCamera(true);
    setIsProcessing(false);
  };

  const toggleFlash = () => {
    setFlashMode(current => (current === 'off' ? 'on' : 'off'));
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          Camera permission is required to scan bills
        </Text>
        <TouchableOpacity 
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scan Bill</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Processing Overlay */}
      {isProcessing && (
        <View style={styles.processingOverlay}>
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.9)']}
            style={styles.processingGradient}
          >
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.processingText}>Processing your bill...</Text>
            <Text style={styles.processingSubtext}>
              Our AI is reading the receipt and extracting items
            </Text>
          </LinearGradient>
        </View>
      )}

      {showCamera ? (
        <>
          {/* Camera View */}
          <View style={styles.cameraContainer}>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={facing}
              flash={flashMode}
            >
              {/* Camera Overlay */}
              <View style={styles.cameraOverlay}>
                <View style={styles.scanFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                </View>
                
                <Text style={styles.instructionText}>
                  Position the bill within the frame
                </Text>
              </View>
            </CameraView>
          </View>

          {/* Camera Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Text style={styles.controlIcon}>🖼️</Text>
              <Text style={styles.controlText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.cameraOptions}>
              <TouchableOpacity style={styles.optionButton} onPress={toggleFlash}>
                <Text style={styles.controlIcon}>
                  {flashMode === 'off' ? '🔦' : '⚡'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.optionButton} onPress={toggleCameraFacing}>
                <Text style={styles.controlIcon}>🔄</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      ) : (
        <>
          {/* Preview Image */}
          <ScrollView style={styles.previewContainer}>
            <View style={styles.imagePreview}>
              <Image source={{ uri: capturedImage }} style={styles.previewImage} />
              
              <View style={styles.previewActions}>
                <TouchableOpacity 
                  style={styles.retakeButton} 
                  onPress={retryScanning}
                >
                  <Text style={styles.retakeButtonText}>Retake Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.manualButton} 
                  onPress={() => navigation.navigate('BillInput')}
                >
                  <Text style={styles.manualButtonText}>Enter Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </>
      )}

      {/* Tips Section */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>📋 Scanning Tips</Text>
        <View style={styles.tipsList}>
          <Text style={styles.tipItem}>• Ensure good lighting</Text>
          <Text style={styles.tipItem}>• Keep the bill flat and straight</Text>
          <Text style={styles.tipItem}>• Avoid shadows and reflections</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 10,
  },
  backButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 50,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: 280,
    height: 400,
    position: 'relative',
    marginBottom: 40,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    paddingVertical: 30,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  galleryButton: {
    alignItems: 'center',
    flex: 1,
  },
  controlIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  controlText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
  },
  cameraOptions: {
    flex: 1,
    alignItems: 'center',
  },
  optionButton: {
    alignItems: 'center',
    marginVertical: 5,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  imagePreview: {
    padding: 20,
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 12,
    marginBottom: 20,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  retakeButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  retakeButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  manualButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  manualButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  tipsContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  tipsTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tipsList: {
    marginLeft: 10,
  },
  tipItem: {
    color: '#ccc',
    fontSize: 14,
    marginBottom: 4,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  processingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
  processingSubtext: {
    color: '#ccc',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    color: '#333',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BillScannerScreen;