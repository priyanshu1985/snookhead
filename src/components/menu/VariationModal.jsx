import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function VariationModal({
  visible,
  menuItem,
  onClose,
  onAddVariation,
}) {
  const [selectedVariation, setSelectedVariation] = useState(null);

  // Reset selection when modal opens with a new item
  useEffect(() => {
    if (visible) {
      setSelectedVariation(null);
      // Auto-select if only 1 variation exists
      if (menuItem?.variations?.length === 1) {
        setSelectedVariation(menuItem.variations[0]);
      }
    }
  }, [visible, menuItem]);

  if (!menuItem) return null;

  const handleAdd = () => {
    if (selectedVariation) {
      onAddVariation(menuItem, selectedVariation);
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {menuItem.name}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>Select Variation:</Text>

          {/* Variations List */}
          <ScrollView style={styles.variationsList}>
            {menuItem.variations?.map((variant, index) => {
              const isSelected = selectedVariation === variant;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.variationRow,
                    isSelected && styles.variationRowSelected,
                  ]}
                  onPress={() => setSelectedVariation(variant)}
                  activeOpacity={0.7}
                >
                  <View style={styles.radioContainer}>
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.variationName, isSelected && styles.variationNameSelected]}>
                      {variant.variation_name}
                    </Text>
                  </View>
                  <Text style={[styles.variationPrice, isSelected && styles.variationPriceSelected]}>
                    ₹{variant.selling_price}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Add to Order Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.addButton,
                !selectedVariation && styles.addButtonDisabled,
              ]}
              disabled={!selectedVariation}
              onPress={handleAdd}
            >
              <Text style={styles.addButtonText}>
                Add to Order {selectedVariation && `(₹${selectedVariation.selling_price})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  closeButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
  },
  variationsList: {
    maxHeight: 300,
  },
  variationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  variationRowSelected: {
    borderColor: '#FF8C42',
    backgroundColor: '#FFF8F4',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  radioOuterSelected: {
    borderColor: '#FF8C42',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8C42',
  },
  variationName: {
    fontSize: 16,
    color: '#333',
  },
  variationNameSelected: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  variationPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  variationPriceSelected: {
    color: '#FF8C42',
  },
  footer: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  addButton: {
    backgroundColor: '#FF8C42',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
