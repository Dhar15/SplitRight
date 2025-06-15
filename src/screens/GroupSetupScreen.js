// screens/GroupSetupScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
  Modal
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
  const [existingGroups, setExistingGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedExistingGroup, setSelectedExistingGroup] = useState(null);
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);

  // Load existing groups on component mount
  useEffect(() => {
    loadExistingGroups();
  }, []);

  // Filter groups based on input
  useEffect(() => {
    if (groupName.trim() === '') {
      setFilteredGroups([]);
      setShowSuggestions(false);
      setSelectedExistingGroup(null);
      return;
    }

    const filtered = existingGroups.filter(group =>
      group.name.toLowerCase().includes(groupName.toLowerCase())
    );

    setFilteredGroups(filtered);
    setShowSuggestions(filtered.length > 0);

    // Check if exact match exists
    const exactMatch = existingGroups.find(
      group => group.name.toLowerCase() === groupName.toLowerCase()
    );
    setSelectedExistingGroup(exactMatch || null);

    // If exact match, populate members
    if (exactMatch) {
      setMembers(exactMatch.members || []);
    }
  }, [groupName, existingGroups]);

  const loadExistingGroups = async () => {
    try {
      setIsLoadingGroups(true);
      const groups = await splitStore.getAllGroups();
      setExistingGroups(groups);
    } catch (error) {
      console.error('Error loading existing groups:', error);
      Alert.alert('Error', 'Failed to load existing groups');
    } finally {
      setIsLoadingGroups(false);
    }
  };

  const handleGroupSelection = (group) => {
    setGroupName(group.name);
    setMembers(group.members || []);
    setSelectedExistingGroup(group);
    setShowSuggestions(false);
  };

  const handleGroupNameChange = (text) => {
    setGroupName(text);
    // If user is typing and there was a selected group, clear it
    if (selectedExistingGroup && text !== selectedExistingGroup.name) {
      setSelectedExistingGroup(null);
      // Don't clear members immediately, let them modify if needed
    }
  };

  const handleContinue = async () => {
    if (members.length < 2) {
      Alert.alert('Error', 'Please add at least 2 members');
      return;
    }

    try {
      let groupToSave;
      let savedGroup;

      if (selectedExistingGroup) {
        // Using existing group - check if members have changed
        const membersChanged = JSON.stringify(selectedExistingGroup.members) !== JSON.stringify(members);
        
        if (membersChanged) {
          // Update existing group with new members
          groupToSave = {
            ...selectedExistingGroup,
            members: members.map(m => ({
              id: m.id || splitStore.generateId(),
              name: m.name,
            })),
            updatedAt: new Date().toISOString(),
          };
          savedGroup = await splitStore.saveGroup(groupToSave);
          console.log('Existing group updated with new members:', savedGroup);
        } else {
          // Use existing group as-is
          savedGroup = selectedExistingGroup;
          console.log('Using existing group:', savedGroup);
        }
      } else {
        // Creating new group
        const trimmedGroupName = groupName.trim();
        
        // Check if a group with this exact name already exists
        const duplicateGroup = existingGroups.find(
          group => group.name.toLowerCase() === trimmedGroupName.toLowerCase()
        );

        if (duplicateGroup) {
          Alert.alert(
            'Group Exists',
            `A group named "${duplicateGroup.name}" already exists. Do you want to use the existing group or create a new one with a different name?`,
            [
              {
                text: 'Use Existing',
                onPress: () => {
                  setGroupName(duplicateGroup.name);
                  setMembers(duplicateGroup.members || []);
                  setSelectedExistingGroup(duplicateGroup);
                }
              },
              {
                text: 'Change Name',
                style: 'cancel'
              }
            ]
          );
          return;
        }

        const membersWithIds = members.map(m => ({
          id: m.id || splitStore.generateId(),
          name: m.name,
        }));

        groupToSave = {
          members: membersWithIds,
          name: trimmedGroupName || 'New Group',
          id: splitStore.generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        savedGroup = await splitStore.saveGroup(groupToSave);
        console.log('New group created:', savedGroup);
      }

      // Link the bill to this group
      if (billData && billData.id) {
        const updatedBillData = { ...billData, groupId: savedGroup.id };
        await splitStore.saveBill(updatedBillData, savedGroup.id);
        console.log('Bill updated with groupId:', updatedBillData);

        const historyId = splitStore.generateId();
        console.log('History ID generated:', historyId);

        navigation.navigate('Split', {
          billData: updatedBillData,
          groupData: savedGroup,
          historyId: historyId
        });
      } else {
        Alert.alert('Error', 'Bill data is missing. Cannot proceed.');
      }

    } catch (error) {
      console.error('Error saving group or linking bill:', error);
      Alert.alert('Save Failed', 'Could not save group or link bill. Please try again.');
    }
  };

  const renderGroupSuggestion = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleGroupSelection(item)}
    >
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionName}>{item.name}</Text>
        <Text style={styles.suggestionMembers}>
          {item.members?.length || 0} members: {item.members?.map(m => m.name).join(', ') || 'No members'}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter group name or search existing groups"
              value={groupName}
              onChangeText={handleGroupNameChange}
              maxLength={30}
              placeholderTextColor="#666"
            />
            {selectedExistingGroup && (
              <View style={styles.existingGroupIndicator}>
                <Text style={styles.existingGroupText}>Using existing group</Text>
              </View>
            )}
          </View>

          {/* Suggestions List */}
          {showSuggestions && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={filteredGroups}
                renderItem={renderGroupSuggestion}
                keyExtractor={(item) => item.id}
                style={styles.suggestionsList}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>

        <View style={styles.membersSection}>
          <MemberSelection
            members={members}
            onMembersChange={setMembers}
            maxMembers={10}
            showAddButton={true}
          />
          {selectedExistingGroup && members.length > 0 && (
            <Text style={styles.memberNote}>
              You can modify the member list for this existing group
            </Text>
          )}
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
          <Text style={styles.continueButtonText}>
            {selectedExistingGroup ? 'Use Group & Start Splitting' : 'Create Group & Start Splitting'}
          </Text>
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
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  existingGroupIndicator: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  existingGroupText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  suggestionsContainer: {
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: 'white',
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  suggestionMembers: {
    fontSize: 14,
    color: '#666',
  },
  membersSection: {
    flex: 1,
  },
  memberNote: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});

export default GroupSetupScreen;