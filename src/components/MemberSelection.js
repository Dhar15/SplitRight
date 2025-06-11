// components/MemberSelection.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Alert,
  ScrollView,
  Modal
} from 'react-native';

const MemberSelection = ({ 
  members, 
  onMembersChange, 
  maxMembers = 10,
  showAddButton = true 
}) => {
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [editMemberName, setEditMemberName] = useState('');

  const generateMemberId = () => {
    return `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const addMember = () => {
    if (newMemberName.trim() === '') {
      Alert.alert('Error', 'Please enter a member name');
      return;
    }

    if (members.length >= maxMembers) {
      Alert.alert('Limit Reached', `You can add maximum ${maxMembers} members`);
      return;
    }

    // Check for duplicate names
    const isDuplicate = members.some(
      member => member.name.toLowerCase() === newMemberName.trim().toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Duplicate Name', 'A member with this name already exists');
      return;
    }

    const newMember = {
      id: generateMemberId(),
      name: newMemberName.trim(),
      createdAt: new Date().toISOString()
    };

    onMembersChange([...members, newMember]);
    setNewMemberName('');
    setIsAddModalVisible(false);
  };

  const removeMember = (memberId) => {
    if (members.length <= 1) {
      Alert.alert('Cannot Remove', 'At least one member is required');
      return;
    }

    Alert.alert(
      'Remove Member',
      'Are you sure you want to remove this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            const updatedMembers = members.filter(member => member.id !== memberId);
            onMembersChange(updatedMembers);
          }
        }
      ]
    );
  };

  const startEditMember = (member) => {
    setEditingMemberId(member.id);
    setEditMemberName(member.name);
  };

  const saveEditMember = () => {
    if (editMemberName.trim() === '') {
      Alert.alert('Error', 'Please enter a member name');
      return;
    }

    // Check for duplicate names (excluding current member)
    const isDuplicate = members.some(
      member => 
        member.id !== editingMemberId && 
        member.name.toLowerCase() === editMemberName.trim().toLowerCase()
    );

    if (isDuplicate) {
      Alert.alert('Duplicate Name', 'A member with this name already exists');
      return;
    }

    const updatedMembers = members.map(member =>
      member.id === editingMemberId
        ? { ...member, name: editMemberName.trim() }
        : member
    );

    onMembersChange(updatedMembers);
    setEditingMemberId(null);
    setEditMemberName('');
  };

  const cancelEditMember = () => {
    setEditingMemberId(null);
    setEditMemberName('');
  };

  const renderMemberCard = (member, index) => {
    const isEditing = editingMemberId === member.id;

    return (
      <View key={member.id} style={styles.memberCard}>
        <View style={styles.memberInfo}>
          <View style={styles.memberNumber}>
            <Text style={styles.memberNumberText}>{index + 1}</Text>
          </View>
          
          {isEditing ? (
            <TextInput
              style={styles.editInput}
              value={editMemberName}
              onChangeText={setEditMemberName}
              autoFocus
              selectTextOnFocus
              placeholder="Member name"
            />
          ) : (
            <Text style={styles.memberName}>{member.name}</Text>
          )}
        </View>

        <View style={styles.memberActions}>
          {isEditing ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.saveButton]}
                onPress={saveEditMember}
              >
                <Text style={styles.saveButtonText}>✓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={cancelEditMember}
              >
                <Text style={styles.cancelButtonText}>✕</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => startEditMember(member)}
              >
                <Text style={styles.editButtonText}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={() => removeMember(member.id)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Group Members</Text>
        <Text style={styles.subtitle}>
          {members.length} of {maxMembers} members
        </Text>
      </View>

      <ScrollView style={styles.membersList} showsVerticalScrollIndicator={false}>
        {members.map((member, index) => renderMemberCard(member, index))}
      </ScrollView>

      {showAddButton && members.length < maxMembers && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add Member</Text>
        </TouchableOpacity>
      )}

      {/* Add Member Modal */}
      <Modal
        visible={isAddModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Add New Member</Text>
            
            <TextInput
              style={styles.modalInput}
              value={newMemberName}
              onChangeText={setNewMemberName}
              placeholder="Enter member name"
              autoFocus
              maxLength={30}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setIsAddModalVisible(false);
                  setNewMemberName('');
                }}
              >
                <Text style={styles.cancelModalButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addModalButton]}
                onPress={addMember}
              >
                <Text style={styles.addModalButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const QuickMemberSetup = ({ onMembersSet, suggestedNames = [] }) => {
  const [selectedCount, setSelectedCount] = useState(2);
  const [customNames, setCustomNames] = useState(['', '']);

  const generateDefaultMembers = (count) => {
    const members = [];
    for (let i = 0; i < count; i++) {
      members.push({
        id: `member_${Date.now()}_${i}`,
        name: customNames[i] || suggestedNames[i] || `Person ${i + 1}`,
        createdAt: new Date().toISOString()
      });
    }
    return members;
  };

  const handleSetupComplete = () => {
    const members = generateDefaultMembers(selectedCount);
    onMembersSet(members);
  };

  const updateCustomName = (index, name) => {
    const newNames = [...customNames];
    newNames[index] = name;
    setCustomNames(newNames);
  };

  const adjustMemberCount = (delta) => {
    const newCount = Math.max(2, Math.min(10, selectedCount + delta));
    setSelectedCount(newCount);
    
    // Adjust custom names array
    const newNames = [...customNames];
    if (newCount > customNames.length) {
      for (let i = customNames.length; i < newCount; i++) {
        newNames.push('');
      }
    }
    setCustomNames(newNames);
  };

  return (
    <View style={styles.quickSetupContainer}>
      <Text style={styles.quickSetupTitle}>Quick Setup</Text>
      <Text style={styles.quickSetupSubtitle}>How many people are splitting?</Text>

      <View style={styles.counterContainer}>
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() => adjustMemberCount(-1)}
          disabled={selectedCount <= 2}
        >
          <Text style={styles.counterButtonText}>-</Text>
        </TouchableOpacity>
        
        <Text style={styles.counterValue}>{selectedCount}</Text>
        
        <TouchableOpacity
          style={styles.counterButton}
          onPress={() => adjustMemberCount(1)}
          disabled={selectedCount >= 10}
        >
          <Text style={styles.counterButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.namesContainer}>
        {Array.from({ length: selectedCount }, (_, index) => (
          <TextInput
            key={index}
            style={styles.nameInput}
            value={customNames[index] || ''}
            onChangeText={(text) => updateCustomName(index, text)}
            placeholder={suggestedNames[index] || `Person ${index + 1}`}
            maxLength={20}
          />
        ))}
      </View>

      <TouchableOpacity
        style={styles.setupCompleteButton}
        onPress={handleSetupComplete}
      >
        <Text style={styles.setupCompleteButtonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  membersList: {
    flex: 1,
    marginBottom: 20,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  editInput: {
    fontSize: 16,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
    paddingBottom: 4,
    flex: 1,
  },
  memberActions: {
    flexDirection: 'row',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  editButton: {
    backgroundColor: '#2196F3',
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
  },
  removeButton: {
    backgroundColor: '#FF5722',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelModalButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelModalButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  addModalButton: {
    backgroundColor: '#4CAF50',
  },
  addModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  // Quick Setup Styles
  quickSetupContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSetupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  quickSetupSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  counterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  counterValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#333',
    marginHorizontal: 30,
    minWidth: 60,
    textAlign: 'center',
  },
  namesContainer: {
    width: '100%',
    marginBottom: 30,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  setupCompleteButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 40,
    paddingVertical: 16,
  },
  setupCompleteButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MemberSelection;
export { QuickMemberSetup };