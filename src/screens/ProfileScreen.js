import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { auth } from '../services/firebase';
import { updateProfile } from 'firebase/auth';
import { splitStore } from '../store/SplitStore';
import { PieChart, BarChart, LineChart } from 'react-native-chart-kit';
import { signOut } from 'firebase/auth';
import { CATEGORY_COLORS } from '../utils/categoryMap';

const { width: screenWidth } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  
  // Edit form states
  const [editName, setEditName] = useState('');
  const [updating, setUpdating] = useState(false);
  
  // Analytics data
  const [analyticsData, setAnalyticsData] = useState({
    totalSplits: 0,
    totalAmount: 0,
    averageBillAmount: 0,
    completedSplits: 0,
    monthlyData: [],
    categoryData: [],
    groupData: [],
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        await currentUser.reload(); 

        // Get the updated user data
        const refreshedUser = auth.currentUser;
        setUser(refreshedUser);
        setEditName(refreshedUser.displayName || '');

         // Set profile image from refreshed user data
        setProfileImage(refreshedUser.photoURL);
        console.log('Loaded profile image:', refreshedUser.photoURL);
        
        // Load analytics data
        await loadAnalyticsData();
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAnalyticsData = async () => {
    try {
      const history = await splitStore.getAllSplitHistory();
      const historyArray = Object.values(history);
      
      if (historyArray.length === 0) {
        setAnalyticsData({
          totalSplits: 0,
          totalAmount: 0,
          averageBillAmount: 0,
          completedSplits: 0,
          monthlyData: [],
          categoryData: [],
          groupData: [],
        });
        return;
      }

      const totalSplits = historyArray.length;
      const completedSplits = historyArray.filter(item => item.isCompleted).length;
      const totalAmount = historyArray.reduce((sum, item) => sum + (item.billData?.grandTotal || 0), 0);
      const averageBillAmount = totalAmount / totalSplits;

      // Monthly data for the last 6 months
      const monthlyData = generateMonthlyData(historyArray);
      
      // Category data (mock categories based on bill amounts)
      const categoryData = generateCategoryData(historyArray);
      
      // Group data
      const groupData = generateGroupData(historyArray);

      setAnalyticsData({
        totalSplits,
        totalAmount,
        averageBillAmount,
        completedSplits,
        monthlyData,
        categoryData,
        groupData,
      });
    } catch (error) {
      console.error('Error loading analytics data:', error);
    }
  };

  const generateMonthlyData = (historyArray) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentDate = new Date();
    const monthlyTotals = {};

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthName = months[date.getMonth()];
      monthlyTotals[monthKey] = { month: monthName, amount: 0 };
    }

    // Populate with actual data
    historyArray.forEach(item => {
      if (item.timestamp) {
        const date = new Date(item.timestamp);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (monthlyTotals[monthKey]) {
          monthlyTotals[monthKey].amount += item.billData?.grandTotal || 0;
        }
      }
    });

    return Object.values(monthlyTotals);
  };

  const generateCategoryData = (historyArray) => {
    const catTotals = {};
    historyArray.forEach(entry => {
      const items = entry.billData?.items || [];
      items.forEach(item => {
        const cat = item.category || 'others';
        catTotals[cat] = (catTotals[cat] || 0) + (item.amount || 0);
      });
    });

    return Object.entries(catTotals).map(([name, population]) => ({
      name,
      population,
      color: CATEGORY_COLORS[name] || '#999999',
      legendFontColor: '#333',
      legendFontSize: 12,
    }));
  };

  const generateGroupData = (historyArray) => {
    const groups = {};
    
    historyArray.forEach(item => {
      const groupName = item.groupData?.name || 'Unknown';
      if (!groups[groupName]) {
        groups[groupName] = { count: 0, totalAmount: 0 };
      }
      groups[groupName].count += 1;
      groups[groupName].totalAmount += item.billData?.grandTotal || 0;
    });

    return Object.entries(groups)
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 5)
      .map(([name, data]) => ({ name, ...data }));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleImagePicker = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
      console.log('Picked image:', result.assets[0].uri);
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveProfileImage = () => {
    Alert.alert(
      'Remove Profile Picture',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setProfileImage(null),
        },
      ]
    );
    console.log('Profile image removed', profileImage);
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    setUpdating(true);
    try {
      const currentUser = auth.currentUser;
      console.log('Current user:', currentUser);
      console.log('Profile image to update:', profileImage);
      if (currentUser) {
        // Update profile
        await updateProfile(currentUser, {
          displayName: editName.trim(),
          photoURL: profileImage || '', // This will be null if removed
        });

        // Update local state
        const updatedUser = { ...currentUser, displayName: editName.trim(), photoURL: profileImage };
        setUser(updatedUser);
        setEditModalVisible(false);
        Alert.alert('Success', 'Profile updated successfully!');
        
        // Navigate back to trigger HomeScreen refresh
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              console.log('User signed out successfully');
            } catch (error) {
              console.error('Sign out error:', error);
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  // Helper function to get user initials for default avatar
  const getUserInitials = (name, email) => {
    if (name && name.trim()) {
      return name.trim().split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Component for default avatar with initials
  const DefaultAvatar = ({ name, email, size = 100 }) => (
    <View style={[styles.defaultProfileImage, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.35 }]}>
        {getUserInitials(name, email)}
      </Text>
    </View>
  );

  const StatCard = ({ title, value, subtitle, icon, color = '#4CAF50' }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Ionicons name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <DefaultAvatar name={user?.displayName} email={user?.email} />
            )}
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          
          <TouchableOpacity 
            style={styles.editProfileButton}
            onPress={() => setEditModalVisible(true)}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        <StatCard
          title="Total Splits"
          value={analyticsData.totalSplits.toString()}
          subtitle="Bills processed"
          icon="receipt-outline"
          color="#4CAF50"
        />
        <StatCard
          title="Total Amount"
          value={`₹${analyticsData.totalAmount.toFixed(0)}`}
          subtitle="Money handled"
          icon="wallet-outline"
          color="#FF9800"
        />
        <StatCard
          title="Completed"
          value={analyticsData.completedSplits.toString()}
          subtitle="Successful splits"
          icon="checkmark-circle-outline"
          color="#2196F3"
        />
        <StatCard
          title="Average Bill"
          value={`₹${analyticsData.averageBillAmount.toFixed(0)}`}
          subtitle="Per transaction"
          icon="trending-up-outline"
          color="#9C27B0"
        />
      </View>

      {/* Charts Section */}
      {analyticsData.totalSplits > 0 && (
        <View style={styles.chartsContainer}>
          {/* Monthly Spending Chart */}
          {analyticsData.monthlyData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Monthly Spending Trend</Text>
              <LineChart
                data={{
                  labels: analyticsData.monthlyData.map(item => item.month),
                  datasets: [{
                    data: analyticsData.monthlyData.map(item => item.amount || 0),
                  }],
                }}
                width={screenWidth - 60}
                height={200}
                chartConfig={{
                  backgroundColor: '#fff',
                  backgroundGradientFrom: '#fff',
                  backgroundGradientTo: '#fff',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(70, 175, 70, ${opacity})`,
                  style: { borderRadius: 16 },
                }}
                bezier
                style={styles.chart}
              />
            </View>
          )}

          {/* Category Distribution */}
          {analyticsData.categoryData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Spending by Category</Text>
              <PieChart
                data={analyticsData.categoryData}
                width={screenWidth - 60}
                height={200}
                chartConfig={{
                  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                }}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="15"
                style={styles.chart}
              />
            </View>
          )}

          {/* Top Groups */}
          {analyticsData.groupData.length > 0 && (
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>Top Groups by Spending</Text>
              {analyticsData.groupData.map((group, index) => (
                <View key={index} style={styles.groupItem}>
                  <View style={styles.groupInfo}>
                    <Text style={styles.groupName}>{group.name}</Text>
                    <Text style={styles.groupStats}>
                      {group.count} bills • ₹{group.totalAmount.toFixed(0)}
                    </Text>
                  </View>
                  <View style={styles.groupRank}>
                    <Text style={styles.groupRankText}>#{index + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('History')}
        >
          <Ionicons name="time-outline" size={20} color="#4CAF50" />
          <Text style={styles.actionButtonText}>View History</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.signOutButton]}
          onPress={handleSignOut}
        >
          <Ionicons name="log-out-outline" size={20} color="#dc3545" />
          <Text style={[styles.actionButtonText, { color: '#dc3545' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Edit Profile Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity 
              onPress={handleUpdateProfile}
              disabled={updating}
            >
              <Text style={[styles.modalSaveButton, updating && styles.disabledButton]}>
                {updating ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput
                style={styles.formInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your full name"
                autoCapitalize="words"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email Address</Text>
              <View style={styles.emailContainer}>
                <Text style={styles.emailText}>{user?.email}</Text>
              </View>
              <Text style={styles.formNote}>
                Note: Email cannot be changed here.
              </Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Profile Picture</Text>
              <View style={styles.imageSection}>
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={handleImagePicker}
                >
                  <Ionicons name="camera-outline" size={24} color="#4CAF50" />
                  <Text style={styles.imagePickerText}>
                    {profileImage ? 'Change Picture' : 'Add Picture'}
                  </Text>
                </TouchableOpacity>
                
                {/* Show remove button if there's an image (either current or newly selected) */}
                {(profileImage || user?.photoURL) && (
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={handleRemoveProfileImage}
                  >
                    <Ionicons name="trash-outline" size={24} color="#dc3545" />
                    <Text style={styles.removeImageText}>Remove Picture</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              <View style={styles.imagePreviewContainer}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.previewImage} />
                ) : (
                  <DefaultAvatar name={editName} email={user?.email} size={100} />
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#555',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  defaultProfileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  avatarInitials: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 35,
  },
  editImageBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 20,
  },
  editProfileButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  editProfileButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 20,
    gap: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    width: (screenWidth - 55) / 2,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: '#999',
  },
  chartsContainer: {
    paddingHorizontal: 20,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 12,
  },
  groupItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  groupStats: {
    fontSize: 14,
    color: '#666',
  },
  groupRank: {
    backgroundColor: '#4CAF50',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupRankText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionsContainer: {
    padding: 20,
    gap: 15,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#dc3545',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#dc3545',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSaveButton: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 25,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  emailContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emailText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  emailNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  formNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
    fontStyle: 'italic',
  },
  imageSection: {
    gap: 10,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
    borderRadius: 8,
    justifyContent: 'center',
  },
  imagePickerText: {
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
  removeImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderWidth: 2,
    borderColor: '#dc3545',
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: '#fff5f5',
  },
  removeImageText: {
    fontSize: 14,
    color: '#dc3545',
    marginLeft: 6,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginTop: 15,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
});

export default ProfileScreen;