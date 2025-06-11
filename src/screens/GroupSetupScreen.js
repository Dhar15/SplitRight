// screens/GroupSetupScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import splitStore from '../store/SplitStore';

import MemberSelection from '../components/MemberSelection';

const GroupSetupScreen = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { billData } = route.params;
  
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState([]);

  const handleContinue = async () => {
    if (members.length < 2) {
      Alert.alert('Error', 'Please add at least 2 members');
      return;
    }

    //const parsedBillData = JSON.parse(billData);

    const membersWithIds = members.map(m => ({
      id: m.id || splitStore.generateId(), // If MemberSelection doesn't add IDs, generate here
      name: m.name,
      // Add other member properties if any
    }));

    const groupToSave = {
      members: membersWithIds,
      name: groupName.trim() || 'New Group',
      id: splitStore.generateId(), // Generate ID for the new group
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      // *** Save the group data ***
      const savedGroup = await splitStore.saveGroup(groupToSave);
      console.log('Group saved:', savedGroup);

      // *** Link the bill to this group by updating the billData with groupId ***
      if (billData && billData.id) {
        const updatedBillData = { ...billData, groupId: savedGroup.id };
        await splitStore.saveBill(updatedBillData, savedGroup.id); // Re-save the bill with groupId
        console.log('Bill updated with groupId:', updatedBillData);

        // ✅ Create a history ID here
        const historyId = splitStore.generateId();

        console.log('History ID generated:', historyId);

        // Now navigate with the updated billData and savedGroup
        navigation.navigate('Split', {
          billData: updatedBillData, // Pass the billData with its new groupId
          groupData: savedGroup,
          historyId: historyId
        });
      } else {
        // Handle case where billData or billData.id is missing (shouldn't happen if BillInputScreen works)
        Alert.alert('Error', 'Bill data is missing. Cannot proceed.');
      }

    } catch (error) {
      console.error('Error saving group or linking bill:', error);
      Alert.alert('Save Failed', 'Could not save group or link bill. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Setup Group</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter group name (optional)"
            value={groupName}
            onChangeText={setGroupName}
            maxLength={30}
          />
        </View>

        <View style={styles.membersSection}>
          <MemberSelection
            members={members}
            onMembersChange={setMembers}
            maxMembers={10}
            showAddButton={true}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            members.length < 2 && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={members.length < 2}
        >
          <Text style={styles.continueButtonText}>Start Splitting</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  membersSection: {
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  continueButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default GroupSetupScreen;