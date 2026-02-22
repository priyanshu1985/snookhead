import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_URL } from '../../config';

// Helper to get full menu image URL
const getMenuImageUrl = (imageKey) => {
  if (!imageKey) return null;
  return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
};

export default function MenuItemCard({
  item,
  cartItems,
  onAddFood,
  onRemoveFood,
  onOpenVariations,
}) {
  // Find all instances of this base item in the cart (across all variations)
  const cartInstances = cartItems.filter((ci) => ci.item.id === item.id);
  const totalQuantity = cartInstances.reduce((sum, ci) => sum + ci.qty, 0);
  
  const hasVariations = item.variations && item.variations.length > 0;

  const handleAdd = () => {
    if (hasVariations) {
      onOpenVariations(item);
    } else {
      onAddFood(item);
    }
  };

  const handleRemove = () => {
    if (hasVariations) {
      // If variations exist and user taps "-", just open variations modal or let them remove from cart summary.
      // For simplicity here, we'll trigger onOpenVariations so they can add/remove specific ones,
      // OR we just remove the most recently added one.
      // Let's pass null to onRemoveFood, indicating base item remove request, calling parent logic.
      onRemoveFood(item.id);
    } else {
      onRemoveFood(item.id);
    }
  };

  return (
    <View style={styles.foodCard}>
      {/* Food Image */}
      <View style={styles.foodImageContainer}>
        {item.imageUrl || item.imageurl || item.image ? (
          <Image
            source={{
              uri: getMenuImageUrl(item.imageUrl || item.imageurl || item.image),
            }}
            style={styles.foodImage}
            resizeMode="cover"
            onError={(e) =>
              console.log('Menu image error:', e.nativeEvent.error)
            }
          />
        ) : (
          <View style={styles.foodImagePlaceholder}>
            <Icon name="fast-food-outline" size={32} color="#FF8C42" />
          </View>
        )}
        {/* Veg/Non-veg indicator */}
        <View style={[styles.vegIndicator, { borderColor: '#0F8A0F' }]}>
          <View style={[styles.vegDot, { backgroundColor: '#0F8A0F' }]} />
        </View>
      </View>

      {/* Food Details */}
      <View style={styles.foodCardContent}>
        <View style={styles.foodCardHeader}>
          <Text style={styles.foodName}>{item.name}</Text>
          {item.description && (
            <Text style={styles.foodDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          {hasVariations && (
            <Text style={styles.customisableText}>Customisable</Text>
          )}
        </View>

        <View style={styles.foodCardFooter}>
          <Text style={styles.foodPrice}>₹ {item.price}</Text>

          {/* Add/Quantity Controls */}
          {totalQuantity > 0 ? (
            <View style={styles.quantityControlsCompact}>
              <TouchableOpacity
                style={styles.quantityBtnCompact}
                onPress={handleRemove}
              >
                <Icon name="remove" size={16} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.quantityTextCompact}>{totalQuantity}</Text>
              <TouchableOpacity
                style={styles.quantityBtnCompact}
                onPress={handleAdd}
              >
                <Icon name="add" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.addBtnCompact} onPress={handleAdd}>
              <Text style={styles.addBtnText}>ADD</Text>
              <View style={styles.addBtnPlus}>
                <Icon name="add" size={12} color="#FF8C42" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  foodCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  foodImageContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  foodImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 14,
    height: 14,
    borderWidth: 1.5,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  vegDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  foodCardContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
  },
  foodCardHeader: {
    flex: 1,
  },
  foodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  foodDescription: {
    fontSize: 11,
    color: '#93959F',
    lineHeight: 14,
  },
  customisableText: {
    fontSize: 10,
    color: '#FF8C42',
    marginTop: 2,
    fontWeight: '600',
  },
  foodCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  foodPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1C1C1C',
  },
  // Compact Add Button
  addBtnCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    position: 'relative',
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF8C42',
    letterSpacing: 0.5,
  },
  addBtnPlus: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FF8C42',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Quantity Controls
  quantityControlsCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    borderRadius: 6,
    overflow: 'hidden',
  },
  quantityBtnCompact: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityTextCompact: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 20,
    textAlign: 'center',
  },
});
