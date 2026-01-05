import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import ImageSelector from '../components/ImageSelector';
const { width } = Dimensions.get('window');

async function getAuthToken() {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch {
    return null;
  }
}

export default function SetupMenu({ navigation }) {
  const [activeTab, setActiveTab] = useState('SET DASHBOARD');
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState('Prepared food');

  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Add modals and forms
  const [addGameModal, setAddGameModal] = useState(false);
  const [addGameConfirm, setAddGameConfirm] = useState(false);
  const [gameSuccess, setGameSuccess] = useState(false);
  const [gameForm, setGameForm] = useState({
    name: '',
    dimension: '',
    date: '',
    framePrice: '',
    hourPrice: '',
    image_key: '',
  });

  // Edit game modal state
  const [editGameModal, setEditGameModal] = useState(false);
  const [editGameForm, setEditGameForm] = useState({
    game_id: null,
    name: '',
    image_key: '',
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);

  const [addTableModal, setAddTableModal] = useState(false);
  const [addTableConfirm, setAddTableConfirm] = useState(false);
  const [tableSuccess, setTableSuccess] = useState(false);
  const [tableForm, setTableForm] = useState({
    name: '',
    dimension: '',
    onboardDate: '',
    type: '',
    pricePerMin: '',
    frameCharge: '',
    game_id: '',
    status: 'available',
  });

  const [addMenuModal, setAddMenuModal] = useState(false);
  const [addMenuConfirm, setAddMenuConfirm] = useState(false);
  const [menuSuccess, setMenuSuccess] = useState(false);
  const [menuForm, setMenuForm] = useState({
    category: '',
    name: '',
    description: '',
    price: '',
    supplier: '',
    image_key: '',
  });

  const [selectedGameId, setSelectedGameId] = useState(null); // NEW

  // --- Fetch from backend, always array, with auth token ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = await getAuthToken();

      if (!token) {
        console.warn('No auth token found - user may need to login');
      }

      try {
        // Always fetch games for the MANAGE TABLE GAMES tab to show game headers
        if (
          activeTab === 'SET DASHBOARD' ||
          activeTab === 'MANAGE TABLE GAMES'
        ) {
          const gamesRes = await fetch(`${API_URL}/api/games`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (!gamesRes.ok) {
            console.error(
              'Games API error:',
              gamesRes.status,
              gamesRes.statusText,
            );
            const errorText = await gamesRes.text();
            console.error('Error response:', errorText);
          } else {
            const gamesResult = await gamesRes.json();
            console.log('Games API response:', gamesResult);
            const gamesArray = Array.isArray(gamesResult)
              ? gamesResult
              : gamesResult.games || gamesResult.data || [];
            console.log('Parsed games array:', gamesArray);
            setGames(gamesArray);
          }
        }

        if (activeTab === 'MANAGE TABLE GAMES') {
          const tablesRes = await fetch(`${API_URL}/api/tables`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (!tablesRes.ok) {
            console.error(
              'Tables API error:',
              tablesRes.status,
              tablesRes.statusText,
            );
            const errorText = await tablesRes.text();
            console.error('Error response:', errorText);
          } else {
            const tablesResult = await tablesRes.json();
            console.log('Tables API response:', tablesResult);
            // Backend returns { total, currentPage, data: tables }
            const tablesArray = Array.isArray(tablesResult)
              ? tablesResult
              : tablesResult.data || tablesResult.tables || [];
            console.log('Parsed tables array:', tablesArray);
            setTables(tablesArray);
          }
        }

        if (activeTab === 'MANAGE MENU') {
          const menuRes = await fetch(`${API_URL}/api/menu`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });

          if (!menuRes.ok) {
            console.error(
              'Menu API error:',
              menuRes.status,
              menuRes.statusText,
            );
          } else {
            const menuResult = await menuRes.json();
            console.log('Menu API response:', menuResult);
            setMenus(
              Array.isArray(menuResult)
                ? menuResult
                : menuResult.menus || menuResult.items || menuResult.data || [],
            );
          }
        }
      } catch (err) {
        console.error('Fetch error:', err.message);
        setGames([]);
        setTables([]);
        setMenus([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab, gameSuccess, tableSuccess, menuSuccess]);

  useEffect(() => {
    if (games.length > 0 && !selectedGameId) {
      const gameId = games[0].game_id || games[0].id;
      console.log('Auto-selecting first game with ID:', gameId);
      setSelectedGameId(gameId);
    }
  }, [games, selectedGameId]);
  // ----- Add APIs -----
  async function addGameAPI(form) {
    setLoading(true);
    const token = await getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_name: form.name,
          image_key: form.image_key || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to add game');
        return false;
      }
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Update Game API
  async function updateGameAPI(gameId, newName, imageKey) {
    setLoading(true);
    const token = await getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/games/${gameId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_name: newName,
          image_key: imageKey || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to update game');
        return false;
      }
      Alert.alert('Success', 'Game updated successfully');
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Delete Game API
  async function deleteGameAPI(gameId) {
    setLoading(true);
    const token = await getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/games/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to delete game');
        return false;
      }
      Alert.alert('Success', 'Game deleted successfully');
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  // Handle edit game
  const handleEditGame = game => {
    setEditGameForm({
      game_id: game.game_id || game.id,
      name: game.game_name || game.gamename || '',
      image_key: game.image_key || '',
    });
    setEditGameModal(true);
  };

  // Handle delete game confirmation
  const handleDeleteGame = game => {
    setGameToDelete(game);
    setDeleteConfirmModal(true);
  };

  // Confirm delete
  const confirmDeleteGame = async () => {
    if (gameToDelete) {
      const gameId = gameToDelete.game_id || gameToDelete.id;
      const success = await deleteGameAPI(gameId);
      if (success) {
        setDeleteConfirmModal(false);
        setGameToDelete(null);
        setGameSuccess(prev => !prev); // Trigger refresh
      }
    }
  };

  // Save edited game
  const saveEditedGame = async () => {
    if (!editGameForm.name.trim()) {
      Alert.alert('Error', 'Game name cannot be empty');
      return;
    }
    const success = await updateGameAPI(
      editGameForm.game_id,
      editGameForm.name.trim(),
      editGameForm.image_key,
    );
    if (success) {
      setEditGameModal(false);
      setEditGameForm({ game_id: null, name: '', image_key: '' });
      setGameSuccess(prev => !prev); // Trigger refresh
    }
  };

  async function addTableAPI(tableForm) {
    setLoading(true);
    const token = await getAuthToken();

    // Validate game_id before sending
    if (!tableForm.game_id) {
      alert('Error: No game selected. Please select a game first.');
      setLoading(false);
      return;
    }

    console.log('Adding table with data:', {
      ...tableForm,
      selectedGameId_debug: selectedGameId,
      game_id_being_sent: tableForm.game_id,
    });

    try {
      const response = await fetch(`${API_URL}/api/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tableForm),
      });
      const data = await response.json();
      console.log('Backend response:', data);

      if (!response.ok) {
        console.error('Backend error:', data);
        alert(data.error || 'Failed to add table');
      }
    } catch (err) {
      console.error('Network error:', err);
      alert(err.message || 'Network/error');
    } finally {
      setLoading(false);
    }
  }
  async function addMenuAPI(form) {
    // form should be your menuForm state: { category, name, description, price, supplier, image_key }
    const token = await getAuthToken();
    try {
      // Map image_key to imageUrl for the backend
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

  // Helper to get full image URL
  const getGameImageUrl = imageKey => {
    if (!imageKey) return null;
    return `${API_URL}/static/game-images/${encodeURIComponent(imageKey)}`;
  };

  // Helper to get full menu image URL
  const getMenuImageUrl = imageKey => {
    if (!imageKey) return null;
    return `${API_URL}/static/menu-images/${encodeURIComponent(imageKey)}`;
  };

  // --- Add Game Modal flow ---
  const AddGameFlow = (
    <>
      <Modal visible={addGameModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView
            style={styles.formCardScroll}
            contentContainerStyle={styles.formCardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Add New Game</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setAddGameModal(false);
                    setGameForm(f => ({ ...f, name: '', image_key: '' }));
                  }}
                >
                  <Icon name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Game Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter game name (e.g., Snooker, Pool)"
                placeholderTextColor="#999"
                value={gameForm.name}
                onChangeText={v => setGameForm(f => ({ ...f, name: v }))}
              />

              <ImageSelector
                selectedImage={gameForm.image_key}
                onSelectImage={imageKey =>
                  setGameForm(f => ({ ...f, image_key: imageKey }))
                }
              />

              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setAddGameModal(false);
                    setGameForm(f => ({ ...f, name: '', image_key: '' }));
                  }}
                >
                  <Text style={styles.backBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueBtn,
                    (!gameForm.name.trim() || !gameForm.image_key) &&
                      styles.continueBtnDisabled,
                  ]}
                  disabled={!gameForm.name.trim() || !gameForm.image_key}
                  onPress={async () => {
                    if (!gameForm.name.trim()) {
                      Alert.alert('Error', 'Please enter a game name');
                      return;
                    }
                    if (!gameForm.image_key) {
                      Alert.alert(
                        'Error',
                        'Please select an image for the game',
                      );
                      return;
                    }
                    const success = await addGameAPI(gameForm);
                    if (success) {
                      setAddGameModal(false);
                      setAddGameConfirm(true);
                    }
                  }}
                >
                  <Text style={styles.continueBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={addGameConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Game Added</Text>
            {gameForm.image_key ? (
              <Image
                style={styles.confirmImage}
                source={{ uri: getGameImageUrl(gameForm.image_key) }}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.confirmImagePlaceholder}>
                <Icon name="image-outline" size={40} color="#CCC" />
              </View>
            )}
            <Text style={styles.detailRow}>Game Type: {gameForm.name}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setAddGameConfirm(false);
                setGameSuccess(true);
                setGameForm(f => ({ ...f, name: '', image_key: '' }));
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={gameSuccess} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successText}>Game successfully added!</Text>
            <TouchableOpacity
              style={styles.closeSuccessBtn}
              onPress={() => setGameSuccess(false)}
            >
              <Text style={styles.closeSuccessBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  // --- Add Table Modal flow ---
  const AddTableFlow = (
    <>
      <Modal visible={addTableModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Table name"
              value={tableForm.name}
              onChangeText={v => setTableForm(f => ({ ...f, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Dimension"
              value={tableForm.dimension}
              onChangeText={v => setTableForm(f => ({ ...f, dimension: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Asset onboarding date"
              value={tableForm.onboardDate}
              onChangeText={v => setTableForm(f => ({ ...f, onboardDate: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Type"
              value={tableForm.type}
              onChangeText={v => setTableForm(f => ({ ...f, type: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Price per min"
              value={tableForm.pricePerMin}
              onChangeText={v => setTableForm(f => ({ ...f, pricePerMin: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Frame charge"
              value={tableForm.frameCharge}
              onChangeText={v => setTableForm(f => ({ ...f, frameCharge: v }))}
            />
            <View style={styles.immutableFieldContainer}>
              <Text style={styles.immutableLabel}>Game ID (Auto-assigned)</Text>
              <TextInput
                style={[styles.input, styles.immutableInput]}
                placeholder="Game ID (Read-only)"
                value={
                  selectedGameId
                    ? String(selectedGameId)
                    : 'Select a game first'
                }
                editable={false}
              />
              <Icon
                name="lock-closed-outline"
                size={16}
                color="#999"
                style={styles.lockIcon}
              />
            </View>
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setAddTableModal(false)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={async () => {
                  if (!selectedGameId) {
                    alert(
                      'Error: No game selected. Please go back and select a game.',
                    );
                    return;
                  }

                  const tableData = { ...tableForm, game_id: selectedGameId };
                  console.log('Submitting table with final data:', tableData);

                  await addTableAPI(tableData);
                  setAddTableModal(false);
                  setAddTableConfirm(true);
                }}
              >
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={addTableConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Table details</Text>
            <Text style={styles.detailRow}>Type of game: {tableForm.type}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setAddTableConfirm(false);
                setTableSuccess(true);
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={tableSuccess} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.successText}>Game successfully added!</Text>
            <TouchableOpacity onPress={() => setTableSuccess(false)}>
              <Text
                style={{ marginTop: 18, color: '#FF8C42', fontWeight: 'bold' }}
              >
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  // --- Add Menu Modal flow ---
  const AddMenuFlow = (
    <>
      <Modal visible={addMenuModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <ScrollView
            style={styles.formCardScroll}
            contentContainerStyle={styles.formCardScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeaderTitle}>Add Menu Item</Text>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => {
                    setAddMenuModal(false);
                    setMenuForm(f => ({
                      ...f,
                      name: '',
                      category: '',
                      description: '',
                      price: '',
                      supplier: '',
                      image_key: '',
                    }));
                  }}
                >
                  <Icon name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., prepared, packed, cigarette"
                placeholderTextColor="#999"
                value={menuForm.category}
                onChangeText={v => setMenuForm(f => ({ ...f, category: v }))}
              />

              <Text style={styles.inputLabel}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter item name"
                placeholderTextColor="#999"
                value={menuForm.name}
                onChangeText={v => setMenuForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter description"
                placeholderTextColor="#999"
                value={menuForm.description}
                onChangeText={v => setMenuForm(f => ({ ...f, description: v }))}
              />

              <Text style={styles.inputLabel}>Price</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={menuForm.price}
                onChangeText={v => setMenuForm(f => ({ ...f, price: v }))}
              />

              <Text style={styles.inputLabel}>Supplier Mobile</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter supplier mobile"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
                value={menuForm.supplier}
                onChangeText={v => setMenuForm(f => ({ ...f, supplier: v }))}
              />

              <ImageSelector
                selectedImage={menuForm.image_key}
                onSelectImage={imageKey =>
                  setMenuForm(f => ({ ...f, image_key: imageKey }))
                }
                imageType="menu"
              />

              <View style={styles.formBtnRow}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => {
                    setAddMenuModal(false);
                    setMenuForm(f => ({
                      ...f,
                      name: '',
                      category: '',
                      description: '',
                      price: '',
                      supplier: '',
                      image_key: '',
                    }));
                  }}
                >
                  <Text style={styles.backBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.continueBtn,
                    (!menuForm.name.trim() ||
                      !menuForm.category.trim() ||
                      !menuForm.price.trim()) &&
                      styles.continueBtnDisabled,
                  ]}
                  disabled={
                    !menuForm.name.trim() ||
                    !menuForm.category.trim() ||
                    !menuForm.price.trim()
                  }
                  onPress={async () => {
                    if (
                      !menuForm.name.trim() ||
                      !menuForm.category.trim() ||
                      !menuForm.price.trim()
                    ) {
                      Alert.alert(
                        'Error',
                        'Please fill in all required fields',
                      );
                      return;
                    }
                    try {
                      await addMenuAPI(menuForm);
                      setAddMenuModal(false);
                      setAddMenuConfirm(true);
                    } catch (err) {
                      Alert.alert(
                        'Error',
                        err.message || 'Failed to add menu item',
                      );
                    }
                  }}
                >
                  <Text style={styles.continueBtnText}>Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
      <Modal visible={addMenuConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Menu Item Added</Text>
            {menuForm.image_key ? (
              <Image
                style={styles.confirmImage}
                source={{ uri: getMenuImageUrl(menuForm.image_key) }}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.confirmImagePlaceholder}>
                <Icon name="fast-food-outline" size={40} color="#CCC" />
              </View>
            )}
            <Text style={styles.detailRow}>Name: {menuForm.name}</Text>
            <Text style={styles.detailRow}>Category: {menuForm.category}</Text>
            <Text style={styles.detailRow}>Price: {menuForm.price}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setAddMenuConfirm(false);
                setMenuSuccess(true);
                setMenuForm(f => ({
                  ...f,
                  name: '',
                  category: '',
                  description: '',
                  price: '',
                  supplier: '',
                  image_key: '',
                }));
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={menuSuccess} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <View style={styles.successIconContainer}>
              <Icon name="checkmark-circle" size={60} color="#4CAF50" />
            </View>
            <Text style={styles.successText}>
              Menu item successfully added!
            </Text>
            <TouchableOpacity
              style={styles.closeSuccessBtn}
              onPress={() => setMenuSuccess(false)}
            >
              <Text style={styles.closeSuccessBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );

  // --- Main content per tab ---
  let Content;
  if (loading) {
    Content = (
      <ActivityIndicator
        size="large"
        color="#FF8C42"
        style={{ marginTop: 50 }}
      />
    );
  } else if (activeTab === 'SET DASHBOARD') {
    Content = (
      <>
        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={styles.dashboardScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Icon name="game-controller-outline" size={22} color="#FF8C42" />
            <Text style={styles.sectionHeaderText}>Manage Games</Text>
            <View style={styles.gameCountBadge}>
              <Text style={styles.gameCountText}>{games.length}</Text>
            </View>
          </View>

          {/* Games List */}
          <View style={styles.dashboardSection}>
            {Array.isArray(games) && games.length === 0 && (
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon
                    name="game-controller-outline"
                    size={48}
                    color="#FF8C42"
                  />
                </View>
                <Text style={styles.emptyText}>No games added yet</Text>
                <Text style={styles.emptySubtext}>
                  Add your first game to get started
                </Text>
              </View>
            )}
            {Array.isArray(games) &&
              games.map((g, i) => (
                <View style={styles.gameCard} key={g.game_id || g.id || i}>
                  <View style={styles.gameCardLeft}>
                    <View style={styles.gameIndexBadge}>
                      <Text style={styles.gameIndexText}>{i + 1}</Text>
                    </View>
                    <View style={styles.gameCardInfo}>
                      <Text style={styles.gameCardName}>
                        {g.game_name || g.gamename || 'Unknown'}
                      </Text>
                      <Text style={styles.gameCardMeta}>
                        Created:{' '}
                        {g.game_createdon
                          ? new Date(g.game_createdon).toLocaleDateString()
                          : 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.gameCardActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditGame(g)}
                    >
                      <Icon name="pencil-outline" size={18} color="#FF8C42" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteGame(g)}
                    >
                      <Icon name="trash-outline" size={18} color="#FF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </View>

          {/* Bottom Padding for Fixed Button */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </>
    );
  } else if (activeTab === 'MANAGE TABLE GAMES') {
    Content = (
      <>
        {/* Clean Horizontal Game Header */}
        <View style={styles.gameHeaderContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gameHeaderScroll}
          >
            {games.length === 0 && (
              <Text style={styles.noGamesText}>
                No games available. Add a game in SET DASHBOARD first.
              </Text>
            )}
            {games.map(g => (
              <TouchableOpacity
                key={g.game_id || g.id}
                style={[
                  styles.gameHeaderTab,
                  selectedGameId === (g.game_id || g.id) &&
                    styles.gameHeaderTabActive,
                ]}
                onPress={() => {
                  const gameId = g.game_id || g.id;
                  console.log(
                    'User selected game:',
                    g.game_name || g.gamename,
                    'with ID:',
                    gameId,
                  );
                  setSelectedGameId(gameId);
                }}
              >
                <Text
                  style={[
                    styles.gameHeaderText,
                    selectedGameId === (g.game_id || g.id) &&
                      styles.gameHeaderTextActive,
                  ]}
                >
                  {g.game_name || g.gamename}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Tables Grid - Right Under Header */}
        <View style={styles.tablesContainer}>
          <FlatList
            data={
              Array.isArray(tables)
                ? tables.filter(
                    t =>
                      String(t.game_id || t.gameid) === String(selectedGameId),
                  )
                : []
            }
            numColumns={3}
            keyExtractor={item =>
              item.id ? String(item.id) : Math.random().toString()
            }
            style={styles.tablesList}
            renderItem={({ item }) => (
              <View style={styles.tableCard}>
                <Text style={styles.tableCardText}>
                  {item.name || item.table_name || item.id}
                </Text>
                <Text style={styles.tableCardSubtext}>
                  {item.type || item.dimension || ''}
                </Text>
              </View>
            )}
            columnWrapperStyle={styles.gridRow}
            scrollEnabled={false}
            contentContainerStyle={styles.tablesGrid}
            ListEmptyComponent={
              <View style={styles.emptyTableState}>
                <Icon name="grid-outline" size={40} color="#CCC" />
                <Text style={styles.emptyText}>No tables for this game</Text>
                <Text style={styles.emptySubtext}>
                  Add tables using the button below
                </Text>
              </View>
            }
          />
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            if (!selectedGameId) {
              alert('Please select a game first before adding a table.');
              return;
            }
            console.log('Opening table modal for game ID:', selectedGameId);
            setAddTableModal(true);
          }}
        >
          <Text style={styles.addBtnText}>Add New table</Text>
        </TouchableOpacity>
      </>
    );
  } else {
    Content = (
      <>
        <View style={styles.categoryTabs}>
          {['prepared', 'packed', 'cigarette'].map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.catTab,
                selectedMenuCategory === cat && styles.catTabActive,
              ]}
              onPress={() => setSelectedMenuCategory(cat)}
            >
              <Text
                style={[
                  styles.catTabText,
                  selectedMenuCategory === cat && styles.catTabTextActive,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView style={styles.menuList}>
          {(Array.isArray(menus)
            ? menus.filter(item => item.category === selectedMenuCategory)
            : []
          ).map((item, idx) => (
            <View key={item.id || idx} style={styles.menuCard}>
              {item.imageUrl ? (
                <View style={styles.menuImageContainer}>
                  <Image
                    source={{ uri: getMenuImageUrl(item.imageUrl) }}
                    style={styles.menuImage}
                    resizeMode="cover"
                    onError={e =>
                      console.log('Menu image error:', e.nativeEvent.error)
                    }
                  />
                </View>
              ) : (
                <View style={styles.menuIcon}>
                  <Icon name="fast-food" size={26} color="#FF8C42" />
                </View>
              )}
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuDesc}>{item.description}</Text>
                <Text style={styles.menuPrice}>{item.price}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddMenuModal(true)}
        >
          <Text style={styles.addBtnText}>Add New menu</Text>
        </TouchableOpacity>
      </>
    );
  }

  // --- Main render ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack && navigation.goBack()}
          >
            <Icon name="chevron-back" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Set up menu</Text>
          <View style={{ width: 26 }} />
        </View>
        <View style={styles.tabs}>
          {['SET DASHBOARD', 'MANAGE TABLE GAMES', 'MANAGE MENU'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tabBtn}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={
                  activeTab === tab ? styles.activeTabText : styles.tabText
                }
              >
                {tab.replace('MANAGE ', '')}
              </Text>
              {activeTab === tab && <View style={styles.tabLine} />}
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.contentWithFixedButton}>
          <View style={styles.contentArea}>{Content}</View>

          {/* Fixed Bottom Button for SET DASHBOARD */}
          {activeTab === 'SET DASHBOARD' && (
            <View style={styles.fixedBottomButtonContainer}>
              <TouchableOpacity
                style={styles.fixedAddBtn}
                onPress={() => setAddGameModal(true)}
              >
                <Icon
                  name="add-circle-outline"
                  size={22}
                  color="#FFF"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.addBtnText}>Add New Game</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        {AddGameFlow}
        {AddTableFlow}
        {AddMenuFlow}

        {/* Edit Game Modal */}
        <Modal visible={editGameModal} transparent animationType="slide">
          <View style={styles.modalBg}>
            <ScrollView
              style={styles.formCardScroll}
              contentContainerStyle={styles.formCardScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formCard}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalHeaderTitle}>Edit Game</Text>
                  <TouchableOpacity
                    style={styles.modalCloseBtn}
                    onPress={() => {
                      setEditGameModal(false);
                      setEditGameForm({
                        game_id: null,
                        name: '',
                        image_key: '',
                      });
                    }}
                  >
                    <Icon name="close" size={22} color="#666" />
                  </TouchableOpacity>
                </View>

                {/* Current Image Preview */}
                {editGameForm.image_key && (
                  <View style={styles.currentImagePreview}>
                    <Text style={styles.inputLabel}>Current Image</Text>
                    <Image
                      source={{ uri: getGameImageUrl(editGameForm.image_key) }}
                      style={styles.previewImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <Text style={styles.inputLabel}>Game Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter game name"
                  placeholderTextColor="#999"
                  value={editGameForm.name}
                  onChangeText={v => setEditGameForm(f => ({ ...f, name: v }))}
                />

                <ImageSelector
                  selectedImage={editGameForm.image_key}
                  onSelectImage={imageKey =>
                    setEditGameForm(f => ({ ...f, image_key: imageKey }))
                  }
                />

                <View style={styles.formBtnRow}>
                  <TouchableOpacity
                    style={styles.backBtn}
                    onPress={() => {
                      setEditGameModal(false);
                      setEditGameForm({
                        game_id: null,
                        name: '',
                        image_key: '',
                      });
                    }}
                  >
                    <Text style={styles.backBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.continueBtn}
                    onPress={saveEditedGame}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.continueBtnText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal visible={deleteConfirmModal} transparent animationType="fade">
          <View style={styles.modalBg}>
            <View style={styles.deleteConfirmCard}>
              <View style={styles.deleteIconContainer}>
                <Icon name="trash-outline" size={36} color="#FF4444" />
              </View>
              <Text style={styles.deleteConfirmTitle}>Delete Game?</Text>
              <Text style={styles.deleteConfirmText}>
                Are you sure you want to delete "
                {gameToDelete?.game_name ||
                  gameToDelete?.gamename ||
                  'this game'}
                "? This action cannot be undone.
              </Text>
              <View style={styles.deleteConfirmActions}>
                <TouchableOpacity
                  style={styles.cancelDeleteBtn}
                  onPress={() => {
                    setDeleteConfirmModal(false);
                    setGameToDelete(null);
                  }}
                >
                  <Text style={styles.cancelDeleteText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmDeleteBtn}
                  onPress={confirmDeleteGame}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.confirmDeleteText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 10,
    color: '#999999',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  activeTabText: {
    fontSize: 10,
    color: '#FF8C42',
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tabLine: {
    marginTop: 6,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#FF8C42',
    width: '80%',
    alignSelf: 'center',
  },
  gridSection: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    marginTop: 0,
  },
  tableCard: {
    width: width / 3.5,
    aspectRatio: 1,
    margin: 10,
    borderRadius: 16,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFE0CC',
  },
  tableCardText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF8C42',
  },
  gridRow: {
    justifyContent: 'center',
  },
  // Dashboard ScrollView
  dashboardScrollView: {
    flex: 1,
  },
  dashboardScrollContent: {
    paddingBottom: 20,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
  },
  sectionHeaderText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 10,
    flex: 1,
  },
  gameCountBadge: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    minWidth: 28,
    alignItems: 'center',
  },
  gameCountText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  // Dashboard Section
  dashboardSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },

  // Game Card
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameIndexBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gameIndexText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  gameCardInfo: {
    flex: 1,
  },
  gameCardName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  gameCardMeta: {
    fontSize: 12,
    color: '#888888',
  },
  gameCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE0CC',
  },
  deleteButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  addBtn: {
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 16,
    elevation: 4,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    flexDirection: 'row',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },

  // Modal Header Row
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
  },

  // Delete Confirmation Modal
  deleteConfirmCard: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  deleteIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  deleteConfirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelDeleteBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  cancelDeleteText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 15,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#FF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDeleteText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },

  // Empty Icon Container
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  categoryTabs: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    borderRadius: 14,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    gap: 10,
  },
  catTab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  catTabActive: {
    backgroundColor: '#FF8C42',
    elevation: 2,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  catTabText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  catTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  menuList: {
    padding: 16,
    paddingTop: 4,
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    padding: 14,
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    overflow: 'hidden',
    marginRight: 14,
    backgroundColor: '#F5F5F5',
  },
  menuImage: {
    width: '100%',
    height: '100%',
  },
  menuInfo: {
    flex: 1,
  },
  menuName: {
    fontWeight: '700',
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  menuDesc: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 4,
  },
  menuPrice: {
    fontWeight: '700',
    color: '#FF8C42',
    fontSize: 16,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  popupCard: {
    width: '85%',
    maxWidth: 360,
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  popupTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  detailRow: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 6,
  },
  confirmBtn: {
    marginTop: 20,
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  backBtnText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 15,
  },
  input: {
    marginVertical: 6,
    borderColor: '#E8E8E8',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F8F9FA',
    fontSize: 14,
    color: '#1A1A1A',
  },
  immutableFieldContainer: {
    position: 'relative',
    marginVertical: 6,
  },
  immutableLabel: {
    fontSize: 12,
    color: '#666666',
    fontWeight: '600',
    marginBottom: 4,
    marginLeft: 4,
  },
  immutableInput: {
    backgroundColor: '#F0F0F0',
    borderColor: '#D0D0D0',
    color: '#666666',
    paddingRight: 40,
  },
  lockIcon: {
    position: 'absolute',
    right: 12,
    top: 32,
  },
  uploadImageBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E0E0E0',
    padding: 24,
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  uploadImageText: {
    color: '#666666',
    fontWeight: '600',
    fontSize: 14,
  },
  successText: {
    color: '#4CAF50',
    fontWeight: '700',
    fontSize: 18,
    textAlign: 'center',
  },
  formCardScroll: {
    width: '100%',
    maxHeight: '90%',
  },
  formCardScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  continueBtnDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  confirmImage: {
    width: 120,
    height: 80,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  confirmImagePlaceholder: {
    width: 120,
    height: 80,
    borderRadius: 12,
    alignSelf: 'center',
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIconContainer: {
    marginBottom: 16,
  },
  closeSuccessBtn: {
    marginTop: 20,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  closeSuccessBtnText: {
    color: '#FF8C42',
    fontWeight: '700',
    fontSize: 16,
  },
  currentImagePreview: {
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginTop: 8,
  },

  // Game Header Styles (for MANAGE TABLE GAMES)
  gameHeaderContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  gameHeaderScroll: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  gameHeaderTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  gameHeaderTabActive: {
    backgroundColor: '#FF8C42',
  },
  gameHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  gameHeaderTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  tablesContainer: {
    flex: 1,
    paddingTop: 12,
  },
  tablesList: {
    paddingHorizontal: 8,
  },
  tablesGrid: {
    paddingBottom: 16,
  },

  // Empty state styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTableState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
    width: width - 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999999',
    marginTop: 4,
    textAlign: 'center',
  },
  noGamesText: {
    fontSize: 13,
    color: '#999999',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tableCardSubtext: {
    fontSize: 11,
    color: '#888888',
    marginTop: 4,
    textTransform: 'capitalize',
  },

  // Fixed Bottom Button Layout
  contentWithFixedButton: {
    flex: 1,
    position: 'relative',
  },
  contentArea: {
    flex: 1,
  },
  fixedBottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  fixedAddBtn: {
    backgroundColor: '#FF8C42',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    elevation: 3,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
