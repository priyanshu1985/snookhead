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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../../config';
import ImageSelector from '../../components/ImageSelector';
import enhancedFetch from '../../services/enhancedFetch';

async function getAuthToken() {
  try {
    const token = await AsyncStorage.getItem('authToken');
    return token;
  } catch {
    return null;
  }
}

export default function GamesAndTables() {
  const [games, setGames] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [viewMode, setViewMode] = useState('games'); // 'games' or 'tables'

  // Game modals and forms
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

  const [editGameModal, setEditGameModal] = useState(false);
  const [editGameForm, setEditGameForm] = useState({
    game_id: null,
    name: '',
    image_key: '',
  });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [gameDeleteSuccess, setGameDeleteSuccess] = useState(false);

  // Table modals and forms
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

  const [editTableModal, setEditTableModal] = useState(false);
  const [editTableForm, setEditTableForm] = useState({
    id: null,
    name: '',
    dimension: '',
    type: '',
    pricePerMin: '',
    frameCharge: '',
    status: 'available',
  });
  const [deleteTableConfirmModal, setDeleteTableConfirmModal] = useState(false);
  const [tableToDelete, setTableToDelete] = useState(null);
  const [tableDeleteSuccess, setTableDeleteSuccess] = useState(false);

  // Fetch games and tables data
  useEffect(() => {
    fetchData();
  }, [
    refreshTrigger,
    gameSuccess,
    tableSuccess,
    gameDeleteSuccess,
    tableDeleteSuccess,
  ]);

  const fetchData = async () => {
    setLoading(true);
    const token = await getAuthToken();

    if (!token) {
      console.warn('No auth token found');
    }

    try {
      // Fetch games
      const gamesRes = await enhancedFetch('/api/games');
      if (gamesRes.ok) {
        const gamesData = await gamesRes.json();
        const gamesArray = Array.isArray(gamesData) ? gamesData : [];
        setGames(gamesArray);

        // Auto-select first game if none selected
        if (!selectedGameId && gamesArray.length > 0) {
          const firstGameId =
            gamesArray[0].game_id || gamesArray[0].id || gamesArray[0].gameid;
          setSelectedGameId(firstGameId);
        }
      }

      // Fetch tables
      const tablesRes = await enhancedFetch('/api/tables');
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        console.log('📦 Raw tables response:', tablesData);
        // Backend returns { total, currentPage, data: [...] }
        const tablesArray = Array.isArray(tablesData)
          ? tablesData
          : Array.isArray(tablesData.data)
          ? tablesData.data
          : [];
        console.log('📦 Extracted tables array:', tablesArray);
        setTables(tablesArray);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Game API functions
  async function addGameAPI(gameName, imageKey) {
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
          game_name: gameName,
          image_key: imageKey || null,
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

  async function deleteGameAPI(gameId) {
    setLoading(true);
    try {
      const response = await enhancedFetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to delete game');
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

  // Game handlers
  const handleEditGame = game => {
    setEditGameForm({
      game_id: game.game_id || game.gameid || game.id,
      name: game.game_name || game.gamename || '',
      image_key: game.image_key || game.imagekey || '',
    });
    setEditGameModal(true);
  };

  const handleDeleteGame = game => {
    setGameToDelete(game);
    setDeleteConfirmModal(true);
  };

  const confirmDeleteGame = async () => {
    if (gameToDelete) {
      const gameId =
        gameToDelete.game_id || gameToDelete.gameid || gameToDelete.id;
      if (!gameId) {
        Alert.alert('Error', 'Invalid Game ID');
        return;
      }
      const success = await deleteGameAPI(gameId);
      if (success) {
        setDeleteConfirmModal(false);
        setGameToDelete(null);
        setGameDeleteSuccess(prev => !prev);
      }
    }
  };

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
      setGameSuccess(prev => !prev);
    }
  };

  // Table API functions
  async function addTableAPI(tableForm) {
    setLoading(true);
    if (!tableForm.game_id) {
      Alert.alert('Error', 'No game selected');
      setLoading(false);
      return false;
    }

    try {
      const response = await enhancedFetch('/api/tables', {
        method: 'POST',
        body: JSON.stringify({
          name: tableForm.name,
          dimension: tableForm.dimension || null,
          onboardDate: tableForm.onboardDate || null,
          type: tableForm.type || null,
          pricePerMin: parseFloat(tableForm.pricePerMin) || 0,
          frameCharge: parseFloat(tableForm.frameCharge) || null,
          game_id: tableForm.game_id,
          status: tableForm.status || 'available',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to add table');
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

  async function updateTableAPI(tableId, updates) {
    setLoading(true);
    try {
      const response = await enhancedFetch(`/api/tables/${tableId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to update table');
        return false;
      }
      Alert.alert('Success', 'Table updated successfully');
      return true;
    } catch (err) {
      Alert.alert('Error', err.message || 'Network error');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function deleteTableAPI(tableId) {
    setLoading(true);
    try {
      const response = await enhancedFetch(`/api/tables/${tableId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert('Error', data.error || 'Failed to delete table');
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

  // Table handlers
  const handleEditTable = table => {
    setEditTableForm({
      id: table.id,
      name: table.name || table.table_name || '',
      dimension: table.dimension || '',
      type: table.type || '',
      pricePerMin: String(table.price_per_min || table.pricePerMin || ''),
      frameCharge: String(table.frame_charge || table.frameCharge || ''),
      status: table.status || 'available',
    });
    setEditTableModal(true);
  };

  const handleDeleteTable = table => {
    setTableToDelete(table);
    setDeleteTableConfirmModal(true);
  };

  const confirmDeleteTable = async () => {
    if (tableToDelete && tableToDelete.id) {
      const success = await deleteTableAPI(tableToDelete.id);
      if (success) {
        setDeleteTableConfirmModal(false);
        setTableToDelete(null);
        setTableDeleteSuccess(prev => !prev);
      }
    }
  };

  const saveEditedTable = async () => {
    if (!editTableForm.name.trim()) {
      Alert.alert('Error', 'Table name cannot be empty');
      return;
    }
    const success = await updateTableAPI(editTableForm.id, {
      name: editTableForm.name,
      dimension: editTableForm.dimension || null,
      type: editTableForm.type || null,
      pricePerMin: parseFloat(editTableForm.pricePerMin) || 0,
      frameCharge: parseFloat(editTableForm.frameCharge) || null,
      status: editTableForm.status,
    });
    if (success) {
      setEditTableModal(false);
      setEditTableForm({
        id: null,
        name: '',
        dimension: '',
        type: '',
        pricePerMin: '',
        frameCharge: '',
        status: 'available',
      });
      setTableSuccess(prev => !prev);
    }
  };

  const getGameImageUrl = imageKey => {
    if (!imageKey) return null;
    if (imageKey.startsWith('http')) return imageKey;
    return `${API_URL}/uploads/game-images/${imageKey}`;
  };

  // Render Games Dashboard Tab
  const renderGamesDashboard = () => (
    <ScrollView
      style={styles.dashboardScrollView}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.sectionHeader}>
        <Icon name="game-controller-outline" size={22} color="#FF8C42" />
        <Text style={styles.sectionHeaderText}>Manage Games</Text>
        <View style={styles.gameCountBadge}>
          <Text style={styles.gameCountText}>{games.length}</Text>
        </View>
      </View>

      <View style={styles.dashboardSection}>
        {games.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="game-controller-outline" size={48} color="#FF8C42" />
            </View>
            <Text style={styles.emptyText}>No games added yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first game to get started
            </Text>
          </View>
        ) : (
          games.map((g, i) => (
            <TouchableOpacity
              key={g.game_id || g.gameid || g.id || i}
              style={styles.gameCard}
              onPress={() => {
                const gameId = g.game_id || g.id || g.gameid;
                setSelectedGameId(gameId);
                setViewMode('tables');
              }}
            >
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
                    {g.game_createdon || g.gamecreatedon
                      ? new Date(
                          g.game_createdon || g.gamecreatedon,
                        ).toLocaleDateString()
                      : 'N/A'}
                  </Text>
                </View>
              </View>
              <View style={styles.gameCardActions}>
                <TouchableOpacity
                  style={styles.enhancedEditBtn}
                  onPress={e => {
                    e.stopPropagation();
                    handleEditGame(g);
                  }}
                >
                  <Icon name="create-outline" size={20} color="#FF8C42" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.enhancedDeleteBtn}
                  onPress={e => {
                    e.stopPropagation();
                    handleDeleteGame(g);
                  }}
                >
                  <Icon name="trash-outline" size={20} color="#FF4444" />
                </TouchableOpacity>
              </View>
              <Icon name="chevron-forward" size={20} color="#999" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );

  // Render Tables Management for Selected Game
  const renderTablesManagement = () => {
    const selectedGame = games.find(
      g => String(g.game_id || g.id || g.gameid) === String(selectedGameId),
    );

    console.log('🎮 Selected Game ID:', selectedGameId);
    console.log('🎮 Selected Game:', selectedGame);
    console.log('🎱 All Tables:', tables);
    console.log('🎱 Tables length:', tables?.length);

    // The backend stores game_id as 'gameid' (lowercase, no underscore)
    const filteredTables =
      selectedGameId && Array.isArray(tables)
        ? tables
            .filter(t => {
              // Check all possible field name variations
              const tableGameId = String(
                t.gameid || t.game_id || t.gameId || t.gameID,
              );
              const selectedId = String(selectedGameId);
              console.log(
                `🔍 Comparing table "${
                  t.name || t.id
                }": tableGameId="${tableGameId}" vs selectedId="${selectedId}"`,
              );
              return tableGameId === selectedId;
            })
            .sort((a, b) => {
              // Sort by ID (ascending) to maintain consistent order
              // Table 1 will always appear first, Table 2 second, etc.
              const idA = parseInt(a.id) || 0;
              const idB = parseInt(b.id) || 0;
              return idA - idB;
            })
        : [];

    console.log('✅ Filtered Tables Count:', filteredTables.length);
    console.log('✅ Filtered Tables:', filteredTables);

    return (
      <>
        {/* Header with back button */}
        <View style={styles.tablesHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setViewMode('games');
              setSelectedGameId(null);
            }}
          >
            <Icon name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <View style={styles.tablesHeaderInfo}>
            <Text style={styles.tablesHeaderTitle}>
              {selectedGame?.game_name || selectedGame?.gamename || 'Game'}{' '}
              Tables
            </Text>
            <Text style={styles.tablesHeaderSubtitle}>
              {filteredTables.length}{' '}
              {filteredTables.length === 1 ? 'table' : 'tables'}
            </Text>
          </View>
        </View>

        <View style={styles.tablesSection}>
          <FlatList
            data={filteredTables}
            keyExtractor={item => String(item.id || Math.random())}
            renderItem={({ item, index }) => (
              <View style={styles.enhancedTableCard}>
                <View style={styles.tableIndexContainer}>
                  <Text style={styles.tableIndexText}>{index + 1}</Text>
                </View>

                <View style={styles.tableCardContent}>
                  <Text style={styles.enhancedTableName}>
                    {item.name || item.table_name || `Table ${item.id}`}
                  </Text>

                  <View style={styles.tableStatusRow}>
                    <Text style={styles.statusLabel}>Status: </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'available'
                          ? styles.statusBadgeAvailable
                          : styles.statusBadgeOccupied,
                      ]}
                    >
                      <Text style={styles.statusBadgeText}>
                        {item.status || 'Available'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.tableMeta}>
                    Price: ₹{item.price_per_min || item.pricePerMin || 0}/min
                  </Text>
                </View>

                <View style={styles.tableCardActions}>
                  <TouchableOpacity
                    style={styles.editTableBtn}
                    onPress={() => handleEditTable(item)}
                  >
                    <Icon name="create-outline" size={18} color="#FF8C42" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteTableBtn}
                    onPress={() => handleDeleteTable(item)}
                  >
                    <Icon name="trash-outline" size={18} color="#FF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyTablesList}>
                <Icon name="cube-outline" size={48} color="#CCC" />
                <Text style={styles.emptyTablesText}>
                  No tables for this game
                </Text>
                <Text style={styles.emptyTablesSubtext}>
                  Add your first table to get started
                </Text>
              </View>
            }
          />
        </View>

        <TouchableOpacity
          style={styles.enhancedAddTableBtn}
          onPress={() => {
            setTableForm({
              ...tableForm,
              game_id: selectedGameId,
            });
            setAddTableModal(true);
          }}
        >
          <Icon name="add-circle-outline" size={22} color="#FFF" />
          <Text style={styles.enhancedAddBtnText}>Add New Table</Text>
        </TouchableOpacity>
      </>
    );
  };

  if (loading && games.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C42" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'games' ? renderGamesDashboard() : renderTablesManagement()}

      {/* Add Game Modal */}
      {viewMode === 'games' && (
        <TouchableOpacity
          style={styles.fixedAddBtn}
          onPress={() => setAddGameModal(true)}
        >
          <Icon name="add-circle-outline" size={22} color="#FFF" />
          <Text style={styles.addBtnText}>Add New Game</Text>
        </TouchableOpacity>
      )}

      {/* Add Game Modal */}
      <Modal visible={addGameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Game</Text>
              <TouchableOpacity onPress={() => setAddGameModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Game Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter game name"
                value={gameForm.name}
                onChangeText={text => setGameForm({ ...gameForm, name: text })}
              />

              <Text style={styles.inputLabel}>Game Image</Text>
              <ImageSelector
                onSelectImage={key =>
                  setGameForm({ ...gameForm, image_key: key })
                }
                selectedImage={gameForm.image_key}
                imageType="game"
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setAddGameModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={async () => {
                    if (!gameForm.name.trim()) {
                      Alert.alert('Error', 'Please enter game name');
                      return;
                    }
                    try {
                      await addGameAPI(
                        gameForm.name.trim(),
                        gameForm.image_key,
                      );
                      Alert.alert('Success', 'Game added successfully');
                      setAddGameModal(false);
                      setGameForm({
                        name: '',
                        dimension: '',
                        date: '',
                        framePrice: '',
                        hourPrice: '',
                        image_key: '',
                      });
                      setGameSuccess(prev => !prev);
                    } catch (err) {
                      Alert.alert('Error', err.message || 'Failed to add game');
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Add Game</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Game Modal */}
      <Modal visible={editGameModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Game</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditGameModal(false);
                  setEditGameForm({ game_id: null, name: '', image_key: '' });
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Game Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter game name"
                value={editGameForm.name}
                onChangeText={text =>
                  setEditGameForm({ ...editGameForm, name: text })
                }
              />

              <Text style={styles.inputLabel}>Game Image</Text>
              <ImageSelector
                onSelectImage={key =>
                  setEditGameForm({ ...editGameForm, image_key: key })
                }
                selectedImage={editGameForm.image_key}
                imageType="game"
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditGameModal(false);
                    setEditGameForm({ game_id: null, name: '', image_key: '' });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={saveEditedGame}
                >
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Game Confirmation Modal */}
      <Modal visible={deleteConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmIconContainer}>
              <Icon name="warning" size={48} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Game?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "
              {gameToDelete?.game_name || gameToDelete?.gamename || 'this game'}
              "? This action cannot be undone.
            </Text>
            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setDeleteConfirmModal(false);
                  setGameToDelete(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteGame}
              >
                <Text style={styles.confirmDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Table Modal */}
      <Modal visible={addTableModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Table</Text>
              <TouchableOpacity onPress={() => setAddTableModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Table Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter table name"
                value={tableForm.name}
                onChangeText={text =>
                  setTableForm({ ...tableForm, name: text })
                }
              />

              <Text style={styles.inputLabel}>Dimension</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 8ft x 4ft"
                value={tableForm.dimension}
                onChangeText={text =>
                  setTableForm({ ...tableForm, dimension: text })
                }
              />

              <Text style={styles.inputLabel}>Type</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pool, Snooker"
                value={tableForm.type}
                onChangeText={text =>
                  setTableForm({ ...tableForm, type: text })
                }
              />

              <Text style={styles.inputLabel}>Price Per Minute (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price per minute"
                keyboardType="numeric"
                value={tableForm.pricePerMin}
                onChangeText={text =>
                  setTableForm({ ...tableForm, pricePerMin: text })
                }
              />

              <Text style={styles.inputLabel}>Frame Charge (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter frame charge"
                keyboardType="numeric"
                value={tableForm.frameCharge}
                onChangeText={text =>
                  setTableForm({ ...tableForm, frameCharge: text })
                }
              />

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setAddTableModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={async () => {
                    if (!tableForm.name.trim()) {
                      Alert.alert('Error', 'Please enter table name');
                      return;
                    }
                    if (!tableForm.pricePerMin) {
                      Alert.alert('Error', 'Please enter price per minute');
                      return;
                    }
                    const success = await addTableAPI(tableForm);
                    if (success) {
                      Alert.alert('Success', 'Table added successfully');
                      setAddTableModal(false);
                      setTableForm({
                        name: '',
                        dimension: '',
                        onboardDate: '',
                        type: '',
                        pricePerMin: '',
                        frameCharge: '',
                        game_id: selectedGameId,
                        status: 'available',
                      });
                      setTableSuccess(prev => !prev);
                    }
                  }}
                >
                  <Text style={styles.submitButtonText}>Add Table</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Table Modal */}
      <Modal visible={editTableModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Table</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditTableModal(false);
                  setEditTableForm({
                    id: null,
                    name: '',
                    dimension: '',
                    type: '',
                    pricePerMin: '',
                    frameCharge: '',
                    status: 'available',
                  });
                }}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Table Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter table name"
                value={editTableForm.name}
                onChangeText={text =>
                  setEditTableForm({ ...editTableForm, name: text })
                }
              />

              <Text style={styles.inputLabel}>Dimension</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 8ft x 4ft"
                value={editTableForm.dimension}
                onChangeText={text =>
                  setEditTableForm({ ...editTableForm, dimension: text })
                }
              />

              <Text style={styles.inputLabel}>Type</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Pool, Snooker"
                value={editTableForm.type}
                onChangeText={text =>
                  setEditTableForm({ ...editTableForm, type: text })
                }
              />

              <Text style={styles.inputLabel}>Price Per Minute (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter price per minute"
                keyboardType="numeric"
                value={editTableForm.pricePerMin}
                onChangeText={text =>
                  setEditTableForm({ ...editTableForm, pricePerMin: text })
                }
              />

              <Text style={styles.inputLabel}>Frame Charge (₹)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter frame charge"
                keyboardType="numeric"
                value={editTableForm.frameCharge}
                onChangeText={text =>
                  setEditTableForm({ ...editTableForm, frameCharge: text })
                }
              />

              <Text style={styles.inputLabel}>Status</Text>
              <View style={styles.statusSelector}>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    editTableForm.status === 'available' &&
                      styles.statusOptionActive,
                  ]}
                  onPress={() =>
                    setEditTableForm({ ...editTableForm, status: 'available' })
                  }
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      editTableForm.status === 'available' &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    Available
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statusOption,
                    editTableForm.status === 'occupied' &&
                      styles.statusOptionActive,
                  ]}
                  onPress={() =>
                    setEditTableForm({ ...editTableForm, status: 'occupied' })
                  }
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      editTableForm.status === 'occupied' &&
                        styles.statusOptionTextActive,
                    ]}
                  >
                    Occupied
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setEditTableModal(false);
                    setEditTableForm({
                      id: null,
                      name: '',
                      dimension: '',
                      type: '',
                      pricePerMin: '',
                      frameCharge: '',
                      status: 'available',
                    });
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={saveEditedTable}
                >
                  <Text style={styles.submitButtonText}>Save Changes</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Table Confirmation Modal */}
      <Modal visible={deleteTableConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContainer}>
            <View style={styles.confirmIconContainer}>
              <Icon name="warning" size={48} color="#FF4444" />
            </View>
            <Text style={styles.confirmTitle}>Delete Table?</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to delete "
              {tableToDelete?.name || tableToDelete?.table_name || 'this table'}
              "? This action cannot be undone.
            </Text>
            <View style={styles.confirmFooter}>
              <TouchableOpacity
                style={styles.confirmCancelButton}
                onPress={() => {
                  setDeleteTableConfirmModal(false);
                  setTableToDelete(null);
                }}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={confirmDeleteTable}
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
  dashboardScrollView: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  gameCountBadge: {
    backgroundColor: '#FF8C42',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  gameCountText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dashboardSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  gameCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  gameIndexBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  gameIndexText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gameCardInfo: {
    flex: 1,
  },
  gameCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gameCardMeta: {
    fontSize: 12,
    color: '#999',
  },
  gameCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  enhancedEditBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  enhancedDeleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedAddBtn: {
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
  addBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  tablesSection: {
    flex: 1,
    padding: 16,
  },
  enhancedTableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tableIndexContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tableIndexText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  tableCardContent: {
    flex: 1,
  },
  enhancedTableName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  tableStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeAvailable: {
    backgroundColor: '#E8F5E9',
  },
  statusBadgeOccupied: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4CAF50',
    textTransform: 'capitalize',
  },
  tableMeta: {
    fontSize: 12,
    color: '#999',
  },
  tableCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editTableBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteTableBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTablesList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTablesText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    fontWeight: '600',
  },
  emptyTablesSubtext: {
    fontSize: 14,
    color: '#BBB',
    marginTop: 8,
  },
  tablesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tablesHeaderInfo: {
    flex: 1,
  },
  tablesHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  tablesHeaderSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  enhancedAddTableBtn: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  enhancedAddBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    maxHeight: '80%',
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
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
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
  statusSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  statusOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  statusOptionActive: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  statusOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusOptionTextActive: {
    color: '#FFF',
  },
});
