import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../config';
import ImageSelector from '../../components/ImageSelector';

async function getAuthToken() {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch {
    return null;
  }
}

export default function MenuManagement() {
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMainCategory, setSelectedMainCategory] = useState('prepared'); // 'prepared' or 'packed'
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [togglingMenuId, setTogglingMenuId] = useState(null);

  // Add Subcategory Modal
  const [addSubcategoryModal, setAddSubcategoryModal] = useState(false);
  const [subcategoryName, setSubcategoryName] = useState('');

  // Add Menu Modal state
  const [addMenuModal, setAddMenuModal] = useState(false);
  const [addMenuConfirm, setAddMenuConfirm] = useState(false);
  const [menuSuccess, setMenuSuccess] = useState(false);
  const [menuForm, setMenuForm] = useState({
    item_type: 'prepared',
    category: '',
    name: '',
    description: '',
    price: '',
    supplier: '',
    image_key: '',
    variations: [],
  });

  // Edit/Delete Menu Modal state
  const [editMenuModal, setEditMenuModal] = useState(false);
  const [editMenuForm, setEditMenuForm] = useState({
    id: null,
    item_type: 'prepared',
    category: '',
    name: '',
    description: '',
    price: '',
    supplier: '',
    image_key: '',
    isAvailable: true,
    variations: [],
  });
  const [deleteMenuConfirmModal, setDeleteMenuConfirmModal] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState(null);

  // Fetch menus
  useEffect(() => {
    fetchMenus();
  }, [menuSuccess]);

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/menu`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setMenus(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching menus:', error);
    } finally {
      setLoading(false);
    }
  };

  // Check if name is duplicate
  const isDuplicateMenuName = (name, excludeId = null) => {
    if (!name || !name.trim()) return false;
    const lowerName = name.trim().toLowerCase();
    return menus.some(
      m =>
        m.id !== excludeId &&
        m.name &&
        m.name.trim().toLowerCase() === lowerName,
    );
  };

  // Add Menu API
  async function addMenuAPI(form) {
    if (isDuplicateMenuName(form.name)) {
      throw new Error(
        `Menu item "${form.name.trim()}" already exists. Please use a unique name.`,
      );
    }

    const token = await getAuthToken();
    try {
      const payload = {
        ...form,
        imageUrl: form.image_key || null,
      };
      delete payload.image_key;

      const response = await fetch(`${API_URL}/api/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add menu');
      }
      return data;
    } catch (err) {
      throw err;
    }
  }

  // Update Menu API
  async function updateMenuAPI(menuId, menuData) {
    setLoading(true);
    const token = await getAuthToken();
    try {
      const payload = {
        ...menuData,
        imageUrl: menuData.image_key || null,
      };
      delete payload.image_key;

      const response = await fetch(`${API_URL}/api/menu/${menuId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to update menu item');
        return false;
      }
      Alert.alert('Success', 'Menu item updated successfully');
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Delete Menu API
  async function deleteMenuAPI(menuId) {
    setLoading(true);
    const token = await getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/menu/${menuId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to delete menu item');
        return false;
      }
      Alert.alert('Success', 'Menu item deleted successfully');
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Handle Edit Menu
  const handleEditMenu = item => {
    const itemAvailable =
      item.is_available !== undefined
        ? item.is_available
        : item.isAvailable !== false;
    setEditMenuForm({
      id: item.id,
      item_type: item.item_type || 'prepared',
      category: item.category || '',
      name: item.name || '',
      description: item.description || '',
      price: item.price ? String(item.price) : '',
      supplier: item.supplier || '',
      image_key: item.imageUrl || '',
      isAvailable: itemAvailable,
      variations: Array.isArray(item.variations) ? item.variations : [],
    });
    setEditMenuModal(true);
  };

  // Handle Delete Menu
  const handleDeleteMenu = item => {
    setMenuToDelete(item);
    setDeleteMenuConfirmModal(true);
  };

  // Confirm Delete Menu
  const confirmDeleteMenu = async () => {
    if (menuToDelete) {
      const menuId = menuToDelete.id;
      const success = await deleteMenuAPI(menuId);
      if (success) {
        setDeleteMenuConfirmModal(false);
        setMenuToDelete(null);
        setMenuSuccess(prev => !prev);
      }
    }
  };

  // Toggle Menu Availability
  const toggleMenuAvailability = async item => {
    const menuId = item.id;
    const currentAvailability =
      item.is_available !== undefined
        ? item.is_available
        : item.isAvailable !== false;
    const newAvailability = !currentAvailability;

    setTogglingMenuId(menuId);
    const token = await getAuthToken();

    try {
      const payload = {
        category: item.category,
        name: item.name,
        description: item.description,
        price: item.price,
        supplier: item.supplier,
        imageUrl: item.imageUrl || null,
        is_available: newAvailability,
      };

      const response = await fetch(`${API_URL}/api/menu/${menuId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        Alert.alert(
          'Error',
          data.error || `Failed to update availability (${response.status})`,
        );
        return;
      }

      setMenus(prevMenus =>
        prevMenus.map(m =>
          m.id === menuId
            ? {
                ...m,
                is_available: newAvailability,
                isAvailable: newAvailability,
              }
            : m,
        ),
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
    } finally {
      setTogglingMenuId(null);
    }
  };

  // Save Edited Menu
  const saveEditedMenu = async () => {
    if (!editMenuForm.name.trim()) {
      Alert.alert('Error', 'Menu item name cannot be empty');
      return;
    }
    if (!editMenuForm.category.trim()) {
      Alert.alert('Error', 'Category cannot be empty');
      return;
    }
    if (!editMenuForm.price.trim()) {
      Alert.alert('Error', 'Price cannot be empty');
      return;
    }
    if (isDuplicateMenuName(editMenuForm.name, editMenuForm.id)) {
      Alert.alert(
        'Duplicate Name',
        'This item name already exists. Please use a unique name.',
      );
      return;
    }
    const success = await updateMenuAPI(editMenuForm.id, {
      item_type: editMenuForm.item_type,
      category: editMenuForm.category.trim(),
      name: editMenuForm.name.trim(),
      description: editMenuForm.description,
      price: editMenuForm.price,
      supplier: editMenuForm.supplier,
      image_key: editMenuForm.image_key,
      is_available: editMenuForm.isAvailable,
      variations: editMenuForm.variations,
    });
    if (success) {
      setEditMenuModal(false);
      setEditMenuForm({
        id: null,
        item_type: 'prepared',
        category: '',
        name: '',
        description: '',
        price: '',
        supplier: '',
        image_key: '',
        isAvailable: true,
        variations: [],
      });
      setMenuSuccess(prev => !prev);
    }
  };

  const getMenuImageUrl = imageKey => {
    if (!imageKey) return null;
    return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
  };

  // Get unique subcategories for current main category
  const getSubcategories = () => {
    if (!Array.isArray(menus)) return [];
    const itemsInMainCategory = menus.filter(
      item => (item.item_type || 'prepared') === selectedMainCategory,
    );
    const subcategories = [
      ...new Set(itemsInMainCategory.map(item => item.category)),
    ].filter(Boolean);
    return subcategories.sort();
  };

  const subcategories = getSubcategories();

  // Filter menus by main category and subcategory
  const filteredMenus = Array.isArray(menus)
    ? menus.filter(item => {
        const matchesMainCategory =
          (item.item_type || 'prepared') === selectedMainCategory;
        const matchesSubcategory =
          !selectedSubcategory || item.category === selectedSubcategory;
        return matchesMainCategory && matchesSubcategory;
      })
    : [];

  const renderVariationsUI = (formState, setFormState) => {
    const addVariation = () => {
      setFormState({
        ...formState,
        variations: [
          ...(formState.variations || []),
          {
            variation_name: '',
            selling_price: '',
            cost_price: '',
            inventory_multiplier: '1',
          },
        ],
      });
    };

    const updateVariation = (index, field, value) => {
      const newVariations = [...(formState.variations || [])];
      newVariations[index][field] = value;
      setFormState({ ...formState, variations: newVariations });
    };

    const removeVariation = index => {
      const newVariations = [...(formState.variations || [])];
      newVariations.splice(index, 1);
      setFormState({ ...formState, variations: newVariations });
    };

    return (
      <View style={styles.variationsSectionContainer}>
        <View style={styles.variationsHeaderRow}>
          <Text style={styles.inputLabelVariation}>Item Variations *</Text>
          <TouchableOpacity onPress={addVariation} style={styles.addVariationBtnTag}>
            <Text style={styles.addVariationBtnTagText}>+ Add Variation</Text>
          </TouchableOpacity>
        </View>

        {(formState.variations || []).map((variation, index) => (
          <View key={index} style={styles.variationCard}>
             <TouchableOpacity
               onPress={() => removeVariation(index)}
               style={styles.removeVariationIconBtn}
             >
               <Icon name="close" size={18} color="#999" />
             </TouchableOpacity>

            <View style={styles.variationGridRow}>
              <View style={styles.variationGridCol}>
                <Text style={styles.variationInputLabel}>Variation Name (e.g. Regular, Box, Half)</Text>
                <TextInput
                  style={styles.variationInputField}
                  placeholder="Regular"
                  value={variation.variation_name}
                  onChangeText={text => updateVariation(index, 'variation_name', text)}
                />
              </View>
              <View style={styles.variationGridCol}>
                <Text style={styles.variationInputLabel}>Inventory Multiplier (eg. 1 plate = 1, 1 box = 10)</Text>
                <TextInput
                  style={styles.variationInputField}
                  placeholder="1"
                  keyboardType="numeric"
                  value={String(variation.inventory_multiplier || '')}
                  onChangeText={text => updateVariation(index, 'inventory_multiplier', text)}
                />
              </View>
            </View>

            <View style={styles.variationGridRow}>
              <View style={styles.variationGridCol}>
                <Text style={styles.variationInputLabel}>Selling Price (\u20B9) *</Text>
                <TextInput
                  style={styles.variationInputField}
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(variation.selling_price || '')}
                  onChangeText={text => updateVariation(index, 'selling_price', text)}
                />
              </View>
              <View style={styles.variationGridCol}>
                <Text style={styles.variationInputLabel}>Cost Price (\u20B9)</Text>
                <TextInput
                  style={styles.variationInputField}
                  placeholder="0"
                  keyboardType="numeric"
                  value={String(variation.cost_price || '')}
                  onChangeText={text => updateVariation(index, 'cost_price', text)}
                />
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  if (loading && menus.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Main Category Selector (Prepared/Packed) */}
      <View style={styles.enhancedCategoryContainer}>
        <Text style={styles.categorySelectorLabel}>Menu Type</Text>
        <View style={styles.mainCategorySelector}>
          {['prepared', 'packed'].map(mainCat => {
            const itemsCount = menus.filter(
              item => (item.item_type || 'prepared') === mainCat,
            ).length;
            const isSelected = selectedMainCategory === mainCat;

            return (
              <TouchableOpacity
                key={mainCat}
                style={[
                  styles.mainCategoryTab,
                  isSelected && styles.mainCategoryTabActive,
                ]}
                onPress={() => {
                  setSelectedMainCategory(mainCat);
                  setSelectedSubcategory(null);
                }}
              >
                <Text
                  style={[
                    styles.mainCategoryTabText,
                    isSelected && styles.mainCategoryTabTextActive,
                  ]}
                >
                  {mainCat.charAt(0).toUpperCase() + mainCat.slice(1)}
                </Text>
                <View
                  style={[
                    styles.categoryItemBadge,
                    isSelected && styles.categoryItemBadgeActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.categoryItemCount,
                      isSelected && styles.categoryItemCountActive,
                    ]}
                  >
                    {itemsCount}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Subcategory Selector */}
      {subcategories.length > 0 && (
        <View style={styles.subcategoryContainer}>
          <View style={styles.subcategoryHeader}>
            <Text style={styles.subcategoryLabel}>Subcategories</Text>
            <TouchableOpacity
              style={styles.addSubcategoryBtn}
              onPress={() => setAddSubcategoryModal(true)}
            >
              <Icon name="add-circle-outline" size={18} color="#FF8C42" />
              <Text style={styles.addSubcategoryBtnText}>Add Subcategory</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.subcategoryScroll}
          >
            <TouchableOpacity
              style={[
                styles.subcategoryChip,
                !selectedSubcategory && styles.subcategoryChipActive,
              ]}
              onPress={() => setSelectedSubcategory(null)}
            >
              <Text
                style={[
                  styles.subcategoryChipText,
                  !selectedSubcategory && styles.subcategoryChipTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {subcategories.map(subcat => {
              const itemsCount = menus.filter(
                item =>
                  (item.item_type || 'prepared') === selectedMainCategory &&
                  item.category === subcat,
              ).length;
              const isSelected = selectedSubcategory === subcat;

              return (
                <TouchableOpacity
                  key={subcat}
                  style={[
                    styles.subcategoryChip,
                    isSelected && styles.subcategoryChipActive,
                  ]}
                  onPress={() => setSelectedSubcategory(subcat)}
                >
                  <Text
                    style={[
                      styles.subcategoryChipText,
                      isSelected && styles.subcategoryChipTextActive,
                    ]}
                  >
                    {subcat} ({itemsCount})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Add Subcategory Button (when no subcategories exist) */}
      {subcategories.length === 0 && (
        <View style={styles.noSubcategoryContainer}>
          <Text style={styles.noSubcategoryText}>
            No subcategories yet for {selectedMainCategory} items
          </Text>
          <TouchableOpacity
            style={styles.addFirstSubcategoryBtn}
            onPress={() => setAddSubcategoryModal(true)}
          >
            <Icon name="add-circle-outline" size={20} color="#FFF" />
            <Text style={styles.addFirstSubcategoryBtnText}>
              Add First Subcategory
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Menu Items List */}
      <View style={styles.enhancedMenuSection}>
        <View style={styles.enhancedMenuList}>
          <FlatList
            data={filteredMenus}
            keyExtractor={item =>
              item.id ? String(item.id) : Math.random().toString()
            }
            style={styles.menuItemsList}
            renderItem={({ item, index }) => {
              const isAvailable =
                item.is_available !== undefined
                  ? item.is_available
                  : item.isAvailable !== false;
              const isToggling = togglingMenuId === item.id;

              return (
                <View
                  style={[
                    styles.enhancedMenuCard,
                    !isAvailable && styles.enhancedMenuCardUnavailable,
                  ]}
                >
                  <View style={styles.menuCardLeft}>
                    {item.imageUrl ? (
                      <View
                        style={[
                          styles.enhancedMenuImageContainer,
                          !isAvailable && styles.enhancedMenuImageUnavailable,
                        ]}
                      >
                        <Image
                          source={{ uri: getMenuImageUrl(item.imageUrl) }}
                          style={styles.enhancedMenuImage}
                          resizeMode="cover"
                          onError={e =>
                            console.log(
                              'Menu image error:',
                              e.nativeEvent.error,
                            )
                          }
                        />
                        {!isAvailable && (
                          <View style={styles.imageOverlay}>
                            <Icon
                              name="close-circle"
                              size={20}
                              color="#FF4444"
                            />
                          </View>
                        )}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.enhancedMenuIconContainer,
                          !isAvailable && styles.enhancedMenuIconUnavailable,
                        ]}
                      >
                        <Icon
                          name="fast-food-outline"
                          size={28}
                          color={isAvailable ? '#FF8C42' : '#999'}
                        />
                      </View>
                    )}

                    <View style={styles.enhancedMenuInfo}>
                      <View style={styles.enhancedMenuNameRow}>
                        <Text
                          style={[
                            styles.enhancedMenuName,
                            !isAvailable && styles.enhancedMenuNameUnavailable,
                          ]}
                        >
                          {item.name}
                        </Text>
                        <View
                          style={[
                            styles.enhancedAvailabilityBadge,
                            isAvailable
                              ? styles.availableBadge
                              : styles.unavailableBadge,
                          ]}
                        >
                          <View
                            style={[
                              styles.statusIndicatorDot,
                              isAvailable
                                ? styles.availableDot
                                : styles.unavailableDot,
                            ]}
                          />
                          <Text
                            style={[
                              styles.enhancedAvailabilityText,
                              isAvailable
                                ? styles.availableText
                                : styles.unavailableText,
                            ]}
                          >
                            {isAvailable ? 'Available' : 'Unavailable'}
                          </Text>
                        </View>
                      </View>

                      {item.description && (
                        <Text
                          style={[
                            styles.enhancedMenuDesc,
                            !isAvailable && styles.enhancedMenuDescUnavailable,
                          ]}
                        >
                          {item.description}
                        </Text>
                      )}

                      <View style={styles.menuBottomRow}>
                        <Text
                          style={[
                            styles.enhancedMenuPrice,
                            !isAvailable && styles.enhancedMenuPriceUnavailable,
                          ]}
                        >
                          ₹{item.price}
                        </Text>
                        {item.supplier && (
                          <Text style={styles.supplierText}>
                            by {item.supplier}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.menuCardRight}>
                    {/* Availability Toggle */}
                    <View style={styles.enhancedAvailabilityToggle}>
                      {isToggling ? (
                        <ActivityIndicator size="small" color="#FF8C42" />
                      ) : (
                        <Switch
                          value={isAvailable}
                          onValueChange={() => toggleMenuAvailability(item)}
                          trackColor={{ false: '#E8E8E8', true: '#FFE0CC' }}
                          thumbColor={isAvailable ? '#FF8C42' : '#999'}
                          ios_backgroundColor="#E8E8E8"
                        />
                      )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.enhancedMenuActions}>
                      <TouchableOpacity
                        style={styles.enhancedMenuEditBtn}
                        onPress={() => handleEditMenu(item)}
                      >
                        <Icon name="pencil-outline" size={18} color="#FF8C42" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.enhancedMenuDeleteBtn}
                        onPress={() => handleDeleteMenu(item)}
                      >
                        <Icon name="trash-outline" size={18} color="#FF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={styles.enhancedMenuListContent}
            ListEmptyComponent={
              <View style={styles.enhancedMenuEmptyState}>
                <View style={styles.menuEmptyIconContainer}>
                  <Icon name="restaurant-outline" size={64} color="#E8E8E8" />
                </View>
                <Text style={styles.menuEmptyTitle}>
                  No Items
                  {selectedSubcategory ? ` in ${selectedSubcategory}` : ''}
                </Text>
                <Text style={styles.menuEmptySubtitle}>
                  {subcategories.length === 0
                    ? `Add a subcategory first to organize your ${selectedMainCategory} items`
                    : `Start by adding items to this ${selectedMainCategory} category`}
                </Text>
                {subcategories.length > 0 && (
                  <TouchableOpacity
                    style={styles.menuEmptyActionButton}
                    onPress={() => {
                      setMenuForm({
                        ...menuForm,
                        item_type: selectedMainCategory,
                        category: selectedSubcategory || subcategories[0] || '',
                      });
                      setAddMenuModal(true);
                    }}
                  >
                    <Icon name="add" size={20} color="#FF8C42" />
                    <Text style={styles.menuEmptyActionButtonText}>
                      Add Item
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Add Menu Button */}
      <TouchableOpacity
        style={styles.enhancedMenuAddBtn}
        onPress={() => {
          if (subcategories.length === 0) {
            Alert.alert(
              'No Subcategories',
              'Please add a subcategory first before adding items.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Add Subcategory',
                  onPress: () => setAddSubcategoryModal(true),
                },
              ],
            );
            return;
          }
          setMenuForm({
            ...menuForm,
            item_type: selectedMainCategory,
            category: selectedSubcategory || subcategories[0] || '',
          });
          setAddMenuModal(true);
        }}
      >
        <Icon
          name="add-circle-outline"
          size={22}
          color="#FFF"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.enhancedMenuAddBtnText}>Add New Item</Text>
      </TouchableOpacity>

      {/* Add Subcategory Modal */}
      <Modal visible={addSubcategoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add Subcategory to{' '}
                {selectedMainCategory.charAt(0).toUpperCase() +
                  selectedMainCategory.slice(1)}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setAddSubcategoryModal(false);
                  setSubcategoryName('');
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.inputLabel}>Subcategory Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Snacks, Beverages, Main Dishes"
                value={subcategoryName}
                onChangeText={setSubcategoryName}
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setAddSubcategoryModal(false);
                    setSubcategoryName('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={() => {
                    const trimmedName = subcategoryName.trim();
                    if (!trimmedName) {
                      Alert.alert('Error', 'Please enter a subcategory name');
                      return;
                    }
                    if (subcategories.includes(trimmedName)) {
                      Alert.alert('Error', 'This subcategory already exists');
                      return;
                    }
                    // Select the new subcategory
                    setSelectedSubcategory(trimmedName);
                    setAddSubcategoryModal(false);
                    setSubcategoryName('');
                    Alert.alert(
                      'Success',
                      `Subcategory "${trimmedName}" created. You can now add items to it.`,
                      [
                        {
                          text: 'Add Item Now',
                          onPress: () => {
                            setMenuForm({
                              ...menuForm,
                              item_type: selectedMainCategory,
                              category: trimmedName,
                            });
                            setAddMenuModal(true);
                          },
                        },
                        { text: 'Later', style: 'cancel' },
                      ],
                    );
                  }}
                >
                  <Text style={styles.submitButtonText}>
                    Create Subcategory
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Menu Modal */}
      <Modal visible={addMenuModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Menu Item</Text>
              <TouchableOpacity onPress={() => setAddMenuModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Subcategory *</Text>
              <View style={styles.subcategoryPickerContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.subcategoryPickerScroll}
                >
                  {subcategories.map(subcat => (
                    <TouchableOpacity
                      key={subcat}
                      style={[
                        styles.subcategoryPickerOption,
                        menuForm.category === subcat &&
                          styles.subcategoryPickerOptionActive,
                      ]}
                      onPress={() =>
                        setMenuForm({ ...menuForm, category: subcat })
                      }
                    >
                      <Text
                        style={[
                          styles.subcategoryPickerOptionText,
                          menuForm.category === subcat &&
                            styles.subcategoryPickerOptionTextActive,
                        ]}
                      >
                        {subcat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                value={menuForm.name}
                onChangeText={text => setMenuForm({ ...menuForm, name: text })}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                multiline
                numberOfLines={3}
                value={menuForm.description}
                onChangeText={text =>
                  setMenuForm({ ...menuForm, description: text })
                }
              />

              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                keyboardType="numeric"
                value={menuForm.price}
                onChangeText={text => setMenuForm({ ...menuForm, price: text })}
              />

              <Text style={styles.inputLabel}>Supplier</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter supplier name"
                value={menuForm.supplier}
                onChangeText={text =>
                  setMenuForm({ ...menuForm, supplier: text })
                }
              />

              <Text style={styles.inputLabel}>Item Image</Text>
              <ImageSelector
                onSelectImage={key =>
                  setMenuForm({ ...menuForm, image_key: key })
                }
                selectedImage={menuForm.image_key}
                imageType="menu"
              />

              {renderVariationsUI(menuForm, setMenuForm)}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setAddMenuModal(false);
                    setMenuForm({
                      category: '',
                      name: '',
                      description: '',
                      price: '',
                      supplier: '',
                      image_key: '',
                      variations: [],
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={async () => {
                    if (!menuForm.name.trim()) {
                      Alert.alert('Error', 'Please enter item name');
                      return;
                    }
                    if (!menuForm.category) {
                      Alert.alert('Error', 'Please select a category');
                      return;
                    }
                    if (!menuForm.price) {
                      Alert.alert('Error', 'Please enter price');
                      return;
                    }
                    try {
                      await addMenuAPI(menuForm);
                      Alert.alert('Success', 'Menu item added successfully');
                      setAddMenuModal(false);
                      setMenuForm({
                        category: '',
                        name: '',
                        description: '',
                        price: '',
                        supplier: '',
                        image_key: '',
                        variations: [],
                      });
                      setMenuSuccess(prev => !prev);
                    } catch (err) {
                      Alert.alert(
                        'Error',
                        err.message || 'Failed to add menu item',
                      );
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Menu Modal */}
      <Modal visible={editMenuModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Menu Item</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditMenuModal(false);
                  setEditMenuForm({
                    id: null,
                    category: '',
                    name: '',
                    description: '',
                    price: '',
                    supplier: '',
                    image_key: '',
                    isAvailable: true,
                  });
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Subcategory *</Text>
              <View style={styles.subcategoryPickerContainer}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.subcategoryPickerScroll}
                >
                  {menus
                    .filter(
                      m =>
                        (m.item_type || 'prepared') ===
                        (editMenuForm.item_type || 'prepared'),
                    )
                    .map(m => m.category)
                    .filter((cat, idx, arr) => cat && arr.indexOf(cat) === idx)
                    .sort()
                    .map(subcat => (
                      <TouchableOpacity
                        key={subcat}
                        style={[
                          styles.subcategoryPickerOption,
                          editMenuForm.category === subcat &&
                            styles.subcategoryPickerOptionActive,
                        ]}
                        onPress={() =>
                          setEditMenuForm({ ...editMenuForm, category: subcat })
                        }
                      >
                        <Text
                          style={[
                            styles.subcategoryPickerOptionText,
                            editMenuForm.category === subcat &&
                              styles.subcategoryPickerOptionTextActive,
                          ]}
                        >
                          {subcat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                </ScrollView>
              </View>

              <Text style={styles.inputLabel}>Item Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                value={editMenuForm.name}
                onChangeText={text =>
                  setEditMenuForm({ ...editMenuForm, name: text })
                }
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter description"
                multiline
                numberOfLines={3}
                value={editMenuForm.description}
                onChangeText={text =>
                  setEditMenuForm({ ...editMenuForm, description: text })
                }
              />

              <Text style={styles.inputLabel}>Price (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                keyboardType="numeric"
                value={editMenuForm.price}
                onChangeText={text =>
                  setEditMenuForm({ ...editMenuForm, price: text })
                }
              />

              <Text style={styles.inputLabel}>Supplier</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter supplier name"
                value={editMenuForm.supplier}
                onChangeText={text =>
                  setEditMenuForm({ ...editMenuForm, supplier: text })
                }
              />

              <Text style={styles.inputLabel}>Item Image</Text>
              <ImageSelector
                onSelectImage={key =>
                  setEditMenuForm({ ...editMenuForm, image_key: key })
                }
                selectedImage={editMenuForm.image_key}
                imageType="menu"
              />

              {renderVariationsUI(editMenuForm, setEditMenuForm)}

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditMenuModal(false);
                    setEditMenuForm({
                      id: null,
                      category: '',
                      name: '',
                      description: '',
                      price: '',
                      supplier: '',
                      image_key: '',
                      isAvailable: true,
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={saveEditedMenu}
                >
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Menu Confirmation Modal */}
      <Modal visible={deleteMenuConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmIconContainer}>
              <Icon name="warning" size={48} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Menu Item?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "
              {menuToDelete?.name || 'this item'}
              "? This action cannot be undone.
            </Text>
            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setDeleteMenuConfirmModal(false);
                  setMenuToDelete(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteMenu}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  enhancedCategoryContainer: {
    backgroundColor: '#FFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  categorySelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginLeft: 16,
    marginBottom: 8,
  },
  enhancedCategoryScroll: {
    paddingHorizontal: 16,
  },
  enhancedCategoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  enhancedCategoryTabActive: {
    backgroundColor: '#FF8C42',
  },
  enhancedCategoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginRight: 8,
  },
  enhancedCategoryTabTextActive: {
    color: '#FFF',
  },
  categoryItemBadge: {
    backgroundColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryItemBadgeActive: {
    backgroundColor: '#FFF',
  },
  categoryItemCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  categoryItemCountActive: {
    color: '#FF8C42',
  },
  enhancedMenuSection: {
    flex: 1,
  },
  enhancedMenuList: {
    flex: 1,
  },
  menuItemsList: {
    flex: 1,
  },
  enhancedMenuListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  enhancedMenuCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  enhancedMenuCardUnavailable: {
    opacity: 0.7,
    backgroundColor: '#F8F8F8',
  },
  menuCardLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  enhancedMenuImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    overflow: 'hidden',
  },
  enhancedMenuImageUnavailable: {
    opacity: 0.6,
  },
  enhancedMenuImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedMenuIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  enhancedMenuIconUnavailable: {
    backgroundColor: '#F0F0F0',
  },
  enhancedMenuInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  enhancedMenuNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  enhancedMenuName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  enhancedMenuNameUnavailable: {
    color: '#999',
  },
  enhancedAvailabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  availableBadge: {
    backgroundColor: '#E8F5E9',
  },
  unavailableBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  availableDot: {
    backgroundColor: '#4CAF50',
  },
  unavailableDot: {
    backgroundColor: '#FF4444',
  },
  enhancedAvailabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  availableText: {
    color: '#4CAF50',
  },
  unavailableText: {
    color: '#FF4444',
  },
  enhancedMenuDesc: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  enhancedMenuDescUnavailable: {
    color: '#999',
  },
  menuBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  enhancedMenuPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C42',
  },
  enhancedMenuPriceUnavailable: {
    color: '#999',
  },
  supplierText: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  menuCardRight: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 8,
  },
  enhancedAvailabilityToggle: {
    marginBottom: 8,
  },
  enhancedMenuActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhancedMenuEditBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedMenuDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedMenuEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  menuEmptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  menuEmptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  menuEmptySubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  menuEmptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF8C42',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  menuEmptyActionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  enhancedMenuAddBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  enhancedMenuAddBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '85%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#F8F9FA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  confirmModalContainer: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '85%',
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  confirmIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  confirmCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FF4444',
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
  categorySelector: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    minWidth: 100,
  },
  categoryOptionActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  categoryOptionTextActive: {
    color: '#FFF',
  },
  availabilitySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  availabilityOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  availabilityOptionActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  availabilityOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  availabilityOptionTextActive: {
    color: '#FFF',
  },
  mainCategorySelector: {
    flexDirection: 'row',
    gap: 12,
  },
  mainCategoryTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mainCategoryTabActive: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF8C42',
  },
  mainCategoryTabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  mainCategoryTabTextActive: {
    color: '#FF8C42',
    fontWeight: '700',
  },
  subcategoryContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E8',
  },
  subcategoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subcategoryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  addSubcategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addSubcategoryBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
  },
  subcategoryScroll: {
    gap: 8,
  },
  subcategoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  subcategoryChipActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  subcategoryChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  subcategoryChipTextActive: {
    color: '#FFF',
  },
  noSubcategoryContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE4A3',
    borderStyle: 'dashed',
  },
  noSubcategoryText: {
    fontSize: 14,
    color: '#995700',
    marginBottom: 12,
    textAlign: 'center',
  },
  addFirstSubcategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF8C42',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addFirstSubcategoryBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  subcategoryPickerContainer: {
    marginBottom: 16,
  },
  subcategoryPickerScroll: {
    flexDirection: 'row',
  },
  subcategoryPickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#F8F9FA',
  },
  subcategoryPickerOptionActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  subcategoryPickerOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  subcategoryPickerOptionTextActive: {
    color: '#FFF',
  },
  variationsSectionContainer: {
    marginTop: 12,
    marginBottom: 20,
  },
  variationsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabelVariation: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
  },
  addVariationBtnTag: {
    backgroundColor: '#FFF1E6', // Light orange background matching screenshot
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addVariationBtnTagText: {
    color: '#E06B26', // Deep orange text matching screenshot
    fontWeight: '700',
    fontSize: 13,
  },
  variationCard: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EFEFEF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  removeVariationIconBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  variationGridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  variationGridCol: {
    flex: 1,
  },
  variationInputLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  variationInputField: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
  },
});
