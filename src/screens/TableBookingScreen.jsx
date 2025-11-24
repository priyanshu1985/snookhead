import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

// Move OUTSIDE component
const getNextDates = () => {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push({
      id: i,
      label: i === 0 ? 'Today' : `${date.getDate()}June`,
    });
  }
  return dates;
};

export default function TableBookingScreen({ route, navigation }) {
  // ===== ALL HOOKS AT THE TOP - MUST BE FIRST =====
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTimeOption, setSelectedTimeOption] = useState('Set Time');
  const [selectedFood, setSelectedFood] = useState([]);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [foodInstructions, setFoodInstructions] = useState('');

  // ===== DATA AND CONSTANTS AFTER HOOKS =====
  const { table, gameType, color } = route.params;
  const dates = getNextDates();

  const foodOptions = [
    { id: 1, name: 'Food', icon: '🍔' },
    { id: 2, name: 'Fastfood', icon: '🍕' },
    { id: 3, name: 'Beverages', icon: '🥤' },
  ];

  // ===== HANDLERS =====
  const toggleFoodSelection = id => {
    if (selectedFood.includes(id)) {
      setSelectedFood(selectedFood.filter(item => item !== id));
    } else {
      setSelectedFood([...selectedFood, id]);
    }
  };

  const handleAddInstructions = () => {
    if (selectedFood.length === 0) {
      alert('Please select at least one food item first');
      return;
    }
    setShowInstructionModal(true);
  };

  const handleSaveInstructions = () => {
    setShowInstructionModal(false);
  };

  const handleBook = () => {
    navigation.navigate('Scanner', {
      table,
      gameType,
      date: dates[selectedDate].label,
      timeOption: selectedTimeOption,
      food: selectedFood,
      instructions: foodInstructions,
    });
  };

  // ===== RENDER =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{gameType}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.tableBadge}>
          <Text style={styles.tableName}>{table.name} S0176</Text>
        </View>

        <Text style={styles.sectionTitle}>Select date</Text>
        <FlatList
          data={dates}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.dateList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateButton,
                selectedDate === item.id && styles.dateButtonActive,
              ]}
              onPress={() => setSelectedDate(item.id)}
            >
              <Text
                style={[
                  styles.dateText,
                  selectedDate === item.id && styles.dateTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.sectionTitle}>Select Time</Text>
        <View style={styles.timeOptions}>
          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Set Time' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Set Time')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Set Time' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Set Time</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Timer' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Timer')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Timer' && styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Timer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeOption,
              selectedTimeOption === 'Select Frame' && styles.timeOptionActive,
            ]}
            onPress={() => setSelectedTimeOption('Select Frame')}
          >
            <View
              style={[
                styles.radioCircle,
                selectedTimeOption === 'Select Frame' &&
                  styles.radioCircleActive,
              ]}
            />
            <Text style={styles.timeOptionText}>Select Frame</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.foodHeader}>
          <Text style={styles.sectionTitle}>Add Food</Text>
          {selectedFood.length > 0 && (
            <TouchableOpacity onPress={handleAddInstructions}>
              <Text style={styles.addInstructionLink}>+ Add Instructions</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.foodOptions}>
          {foodOptions.map(food => (
            <TouchableOpacity
              key={food.id}
              style={[
                styles.foodButton,
                selectedFood.includes(food.id) && styles.foodButtonActive,
              ]}
              onPress={() => toggleFoodSelection(food.id)}
            >
              <Text style={styles.foodIcon}>{food.icon}</Text>
              <Text style={styles.foodName}>{food.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {foodInstructions !== '' && (
          <View style={styles.instructionsPreview}>
            <Text style={styles.instructionsLabel}>Special Instructions:</Text>
            <Text style={styles.instructionsText}>{foodInstructions}</Text>
            <TouchableOpacity
              onPress={handleAddInstructions}
              style={styles.editInstructionBtn}
            >
              <Icon name="pencil" size={16} color="#FF9500" />
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.bookButton} onPress={handleBook}>
          <Text style={styles.bookButtonText}>Book</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
          <Text style={styles.newUserText}>New User</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showInstructionModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInstructionModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Food Instructions</Text>
              <TouchableOpacity onPress={() => setShowInstructionModal(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Add any special instructions for your food order
            </Text>

            <TextInput
              style={styles.textInput}
              placeholder="E.g., Extra spicy, No onions, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={foodInstructions}
              onChangeText={setFoodInstructions}
              autoFocus
            />

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveInstructions}
            >
              <Text style={styles.saveButtonText}>Save Instructions</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  content: { padding: 20 },
  tableBadge: {
    alignSelf: 'center',
    backgroundColor: '#FF9500',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 24,
  },
  tableName: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 14, color: '#666', marginBottom: 12, marginTop: 8 },
  dateList: { marginBottom: 20, gap: 8 },
  dateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  dateButtonActive: { backgroundColor: '#FF9500', borderColor: '#FF9500' },
  dateText: { fontSize: 13, color: '#666', fontWeight: '500' },
  dateTextActive: { color: '#FFF', fontWeight: '600' },
  timeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timeOption: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    backgroundColor: '#FFF',
  },
  radioCircleActive: { borderColor: '#FF9500', backgroundColor: '#FF9500' },
  timeOptionText: { fontSize: 14, color: '#333' },
  foodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addInstructionLink: { color: '#FF9500', fontSize: 13, fontWeight: '600' },
  foodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  foodButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  foodButtonActive: { borderColor: '#FF9500', borderWidth: 2 },
  foodIcon: { fontSize: 32, marginBottom: 8 },
  foodName: { fontSize: 12, color: '#333', fontWeight: '500' },
  instructionsPreview: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  instructionsLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  instructionsText: { fontSize: 14, color: '#333', paddingRight: 30 },
  editInstructionBtn: { position: 'absolute', top: 12, right: 12 },
  bookButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 20,
  },
  bookButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  newUserText: { color: '#CCC', fontSize: 14, textAlign: 'center' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  textInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#333',
    height: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
});
