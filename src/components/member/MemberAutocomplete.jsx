import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useMember } from '../../context/MemberContext';

const MemberAutocomplete = ({
  value,
  onChangeText,
  onSelectMember,
  onCreateNewMember,
  placeholder = 'Search by Name or Phone',
  style,
  keyboardType = 'default',
}) => {
  const { members, loading } = useMember();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredMembers, setFilteredMembers] = useState([]);
  
  // Ref to detect click outside is tricky in React Native without wrapping everything in TouchableWithoutFeedback
  // We'll manage visibility based on focus and typing

  useEffect(() => {
    if (value && value.length > 0 && showSuggestions) {
      const lowercasedValue = value.toLowerCase();
      const filtered = members.filter(
        (member) =>
          member.name.toLowerCase().includes(lowercasedValue) ||
          member.phone.includes(lowercasedValue)
      );
      // Limit to 5 suggestions to keep UI clean
      setFilteredMembers(filtered.slice(0, 5));
    } else {
      setFilteredMembers([]);
    }
  }, [value, members, showSuggestions]);

  const handleTextChange = (text) => {
    onChangeText(text);
    setShowSuggestions(true);
  };

  const handleSelect = (member) => {
    onChangeText(member.name);
    setShowSuggestions(false);
    Keyboard.dismiss();
    if (onSelectMember) {
      onSelectMember(member);
    }
  };

  const handleCreateNew = () => {
    setShowSuggestions(false);
    Keyboard.dismiss();
    if (onCreateNewMember) {
      onCreateNewMember(value);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={handleTextChange}
        onFocus={() => {
          if (value?.length > 0) setShowSuggestions(true);
        }}
        keyboardType={keyboardType}
        placeholderTextColor="#999"
      />

      {showSuggestions && value?.length > 0 && (
        <View style={styles.suggestionsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#FF8C42" />
            </View>
          ) : (
            <FlatList
              data={filteredMembers}
              keyExtractor={(item) => item.id.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelect(item)}
                >
                  <Icon name="person" size={16} color="#666" style={styles.icon} />
                  <View>
                    <Text style={styles.suggestionName}>{item.name}</Text>
                    <Text style={styles.suggestionPhone}>{item.phone}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No matches found</Text>
                </View>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={handleCreateNew}
                >
                  <Icon name="add-circle" size={18} color="#FF8C42" style={styles.icon} />
                  <Text style={styles.createButtonText}>Create new member</Text>
                </TouchableOpacity>
              }
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000, // Important for floating over other elements
  },
  input: {
    height: 48,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#333333',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    maxHeight: 250,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  icon: {
    marginRight: 10,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
  },
  suggestionPhone: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emptyText: {
    fontSize: 14,
    color: '#888888',
    fontStyle: 'italic',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFF8F5',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  createButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF8C42',
  },
});

export default MemberAutocomplete;
