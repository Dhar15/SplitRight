import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Modal,
  Image
} from 'react-native';
const { width, height } = Dimensions.get('window');
import { auth } from '../services/firebase'; // Adjust path as needed
import { useNavigation, NavigationProp, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, BillData, GroupData } from '../navigation/types'; 
import { Ionicons } from '@expo/vector-icons';

type SplitOption = 'scan' | 'manual';

const HomeScreen = () => {
    const navigation = useNavigation<NavigationProp<RootStackParamList>>();;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
    const [userName, setUserName] = useState('');
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [showOptionsModal, setShowOptionsModal] = useState(false);
    const scrollRef = useRef<ScrollView>(null);


  // Refresh user data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
  const user = auth.currentUser;
    if (user) {
      await user.reload(); // <--- This line ensures fresh user data from Firebase
      const updatedUser = auth.currentUser;
      if (updatedUser) {
        setUserName(updatedUser.displayName || 'User');
        setUserPhoto(updatedUser.photoURL || null);
      } else {
        console.warn('User became null after reload');
        setUserName('User');
        setUserPhoto(null);
      }
    }
  };

  useEffect(() => {
    // Check if user just signed in/up
    const user = auth.currentUser;
    if (user) {
      // Show welcome message for new sessions
      const timer = setTimeout(() => {
        setShowWelcomeMessage(true);
        // Hide the message after 4 seconds
        setTimeout(() => {
          setShowWelcomeMessage(false);
        }, 4000);
      }, 500);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleScrollToTop = () => {
  scrollRef.current?.scrollTo({
    y: 0,
    animated: true,
  });
};

  const handleGetStarted = () => {
    setShowOptionsModal(true);
  };

  const handleOptionSelect = (option: SplitOption) => {
    setShowOptionsModal(false);
    
    switch (option) {
      case 'scan':
        navigation.navigate('BillScanner');
        break;
      case 'manual':
        navigation.navigate('BillInput');
        break;
      default:
        break;
    }
  };

  const handleProfilePress = () => {
    navigation.navigate('Profile');
  };

  const FeatureCard = ({ icon, title, description, delay = 0 }: {
    icon: string;
    title: string;
    description: string;
    delay?: number;
  }) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
      Animated.timing(cardFade, {
        toValue: 1,
        duration: 600,
        delay,
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View style={[styles.featureCard, { opacity: cardFade }]}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </Animated.View>
    );
  };

  const WelcomeMessage = () => {
    const welcomeFade = useRef(new Animated.Value(0)).current;
    const welcomeSlide = useRef(new Animated.Value(-50)).current;

    useEffect(() => {
      if (showWelcomeMessage) {
        Animated.parallel([
          Animated.timing(welcomeFade, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(welcomeSlide, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [showWelcomeMessage]);

    if (!showWelcomeMessage) return null;

    return (
      <Animated.View 
        style={[
          styles.welcomeMessageContainer,
          {
            opacity: welcomeFade,
            transform: [{ translateY: welcomeSlide }],
          },
        ]}
      >
        <LinearGradient
          colors={['#10b981', '#059669']}
          style={styles.welcomeMessageGradient}
        >
          <Text style={styles.welcomeMessageIcon}>🎉</Text>
          <Text style={styles.welcomeMessageTitle}>Welcome to SplitRight!</Text>
          <Text style={styles.welcomeMessageText}>
            Hello {userName}! Your account is ready to go.
          </Text>
        </LinearGradient>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.gradient}>
        {/* Background Decorative Elements */}
        <View style={styles.backgroundDecor}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>
        
        <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Header with Profile Button */}
          <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
            <View style={styles.headerContent}>
              <View style={styles.logoContainer}>
                <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.logoGradient}>
                  <Text style={styles.logoIcon}>⚡</Text>
                </LinearGradient>
                <Text style={styles.logoText}>SplitRight</Text>
              </View>
              <TouchableOpacity style={styles.profileButton} onPress={handleProfilePress}>
                {userPhoto ? (
                  <Image source={{ uri: userPhoto }} style={styles.profileButtonImage} />
                ) : (
                  <View style={styles.profileButtonPlaceholder}>
                    <Ionicons name="person" size={20} color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Welcome Message */}
          <WelcomeMessage />
        
          {/* Hero Section */}
          <Animated.View 
            style={[
              styles.heroSection, 
              { 
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }]
              }
            ]}
          >
            <Text style={styles.heroTitle}>
              Split Bills{'\n'}
              <Text style={styles.heroTitleAccent}>Intelligently</Text>
            </Text>
            
            <Text style={styles.heroSubtitle}>
              AI-powered expense splitting that handles everything from OCR scanning to smart tax allocation
            </Text>
            
            <TouchableOpacity style={styles.ctaButton} onPress={handleGetStarted}>
              <LinearGradient colors={['#8b5cf6', '#ec4899']} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>Get Started</Text>
                <Text style={styles.ctaArrow}>→</Text>
              </LinearGradient>
            </TouchableOpacity>

             <TouchableOpacity style={styles.historyCtaButton} onPress={() => navigation.navigate('History')}>
              <LinearGradient colors={['#0f3460', '#16213e']} style={styles.ctaGradient}>
                <Text style={styles.ctaText}>View History</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <Text style={styles.modalTitle}>How would you like to start?</Text>
            
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleOptionSelect('scan')}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>📷</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Scan Receipt</Text>
                <Text style={styles.optionDescription}>
                  Use your camera to scan and extract bill details automatically
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleOptionSelect('manual')}
            >
              <View style={styles.optionIcon}>
                <Text style={styles.optionIconText}>✏️</Text>
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Enter Manually</Text>
                <Text style={styles.optionDescription}>
                  Add bill items and amounts manually
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptionsModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
        
          {/* Features Grid */}
          <View style={styles.featuresSection}>
            <Text style={styles.sectionTitle}>
              Why SplitRight?
            </Text>
            <View style={styles.featuresGrid}>
              <FeatureCard 
                icon="📱" 
                title="OCR Scanning" 
                description="Snap photos of receipts and let AI extract all the details"
                delay={100}
              />
              <FeatureCard 
                icon="🧮" 
                title="Smart Split" 
                description="Intelligent algorithms handle complex splitting scenarios"
                delay={200}
              />
              <FeatureCard 
                icon="👥" 
                title="Group Management" 
                description="Organize expenses with friends, family, or roommates"
                delay={300}
              />
              <FeatureCard 
                icon="📊" 
                title="Analytics" 
                description="Track spending patterns and group statistics"
                delay={400}
              />
            </View>
          </View>
        
          {/* Stats Section */}
          <View style={styles.statsSection}>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>99%</Text>
                <Text style={styles.statLabel}>Accuracy</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>1s</Text>
                <Text style={styles.statLabel}>Split Time</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>0</Text>
                <Text style={styles.statLabel}>Arguments</Text>
              </View>
            </View>
          </View>
        
          {/* Bottom CTA */}
          <View style={styles.bottomCta}>
            <Text style={styles.bottomCtaTitle}>Ready to split smarter?</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={handleScrollToTop}>
              <Text style={styles.secondaryButtonText}>Try SplitRight Now</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  backgroundDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.1,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: '#8b5cf6',
    top: -100,
    right: -100,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: '#ec4899',
    bottom: -75,
    left: -75,
  },
  circle3: {
    width: 100,
    height: 100,
    backgroundColor: '#06b6d4',
    top: height * 0.4,
    left: width * 0.8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  logoIcon: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileButtonImage: {
    width: '100%',
    height: '100%',
    borderRadius: 22,
  },
  profileButtonPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  signOutText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  welcomeMessageContainer: {
    marginHorizontal: 24,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  welcomeMessageGradient: {
    padding: 20,
    alignItems: 'center',
  },
  welcomeMessageIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  welcomeMessageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  welcomeMessageText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
  },
  heroSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 16,
    letterSpacing: -1,
  },
  heroTitleAccent: {
    color: '#ec4899',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  ctaButton: {
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    marginBottom: 16,
  },
  historyCtaButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 50,
    overflow: 'hidden',
    elevation: 8,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  ctaArrow: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  featuresSection: {
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 72) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    fontSize: 24,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 20,
  },
  bottomCta: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    alignItems: 'center',
  },
  bottomCtaTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 50,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: width * 0.9,
    maxWidth: 400,
    margin: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionIconText: {
    fontSize: 24,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;