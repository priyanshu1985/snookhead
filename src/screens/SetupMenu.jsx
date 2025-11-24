import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// ===== API BASE URL - CHANGE THIS TO YOUR BACKEND URL =====
const API_BASE_URL = 'http://10.0.2.2:4000/api'; // e.g., http://192.168.1.100:3000/api

export default function SetupMenu({ navigation }) {
  // ===== DECLARE ALL HOOKS AT THE VERY TOP - IN EXACT ORDER =====
  // 1. Tab selection
  const [activeTab, setActiveTab] = useState('MANAGE TABLE GAMES');

  // 2. Loading state
  const [loading, setLoading] = useState(false);

  // 3-8. Table states
  const [tables, setTables] = useState([]);
  const [showTableForm, setShowTableForm] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableData, setTableData] = useState({
    uploadedImage: false,
    game_name: '',
    dimensions: '',
    assetDate: '',
    pricePerMin: '',
  });

  // 9-14. Digital games states
  const [digitalGames, setDigitalGames] = useState([]);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [showDigitalPopup, setShowDigitalPopup] = useState(false);
  const [digitalData, setDigitalData] = useState({
    uploadedImage: false,
    gameName: '',
    gameAssetDate: '',
    gamePricePerMin: '',
  });

  // 15-20. Menu states
  const [menuItems, setMenuItems] = useState([]);
  const [showMenuForm, setShowMenuForm] = useState(false);
  const [showMenuPopup, setShowMenuPopup] = useState(false);
  const [selectedMenuCategory, setSelectedMenuCategory] =
    useState('Prepared food');
  const [menuData, setMenuData] = useState({
    uploadedImage: false,
    category: '',
    itemName: '',
    description: '',
    price: '',
    supplier: '',
  });

  // ===== FETCH TOKEN FROM STORAGE =====
  const getAuthToken = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  };

  // ===== API CALLS =====

  // Fetch all games (tables)
  const fetchGames = async () => {
    setLoading(true);
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch games');
      }

      const data = await response.json();
      const transformedData = data.map(item => ({
        id: item.game_id,
        name: item.game_name,
        ...item,
      }));
      setTables(transformedData);
    } catch (error) {
      console.error('Error fetching games:', error);
      Alert.alert('Error', 'Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  // Create new game
  const createGame = async gameData => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/games`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_name: gameData.game_name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create game');
      }

      const newGame = await response.json();
      return newGame;
    } catch (error) {
      console.error('Error creating game:', error);
      Alert.alert('Error', 'Failed to create game');
      throw error;
    }
  };

  // Update game
  const updateGame = async (id, gameData) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          game_name: gameData.game_name,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      const updatedGame = await response.json();
      return updatedGame;
    } catch (error) {
      console.error('Error updating game:', error);
      Alert.alert('Error', 'Failed to update game');
      throw error;
    }
  };

  // Delete game
  const deleteGame = async id => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/games/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete game');
      }

      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      Alert.alert('Error', 'Failed to delete game');
      throw error;
    }
  };

  // ===== LOAD DATA ON MOUNT =====
  useEffect(() => {
    fetchGames();
  }, []);

  // ===== HANDLER FUNCTIONS =====

  // Table Handlers
  const handleAddTable = () => setShowTableForm(true);

  const handleTableImageUpload = () => {
    setTableData({ ...tableData, uploadedImage: true });
    Alert.alert('Success', 'Table image uploaded!');
  };

  const handleTableContinue = () => {
    if (
      !tableData.game_name ||
      !tableData.dimensions ||
      !tableData.assetDate ||
      !tableData.pricePerMin
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setShowTableForm(false);
    setShowTablePopup(true);
  };

  const handleTableConfirm = async () => {
    try {
      setLoading(true);
      const newGame = await createGame({
        game_name: tableData.game_name,
      });

      // Refresh the list
      await fetchGames();

      setShowTablePopup(false);
      setTableData({
        uploadedImage: false,
        game_name: '',
        dimensions: '',
        assetDate: '',
        pricePerMin: '',
      });
      Alert.alert('Success', 'Table added successfully!');
    } catch (error) {
      console.error('Error adding table:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTable = async id => {
    Alert.alert('Delete Table', 'Are you sure you want to delete this table?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            await deleteGame(id);
            await fetchGames();
            Alert.alert('Success', 'Table deleted successfully!');
          } catch (error) {
            console.error('Error deleting table:', error);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // Digital Game Handlers
  const handleAddDigitalGame = () => setShowDigitalForm(true);

  const handleDigitalImageUpload = () => {
    setDigitalData({ ...digitalData, uploadedImage: true });
    Alert.alert('Success', 'Game image uploaded!');
  };

  const handleDigitalContinue = () => {
    if (
      !digitalData.gameName ||
      !digitalData.gameAssetDate ||
      !digitalData.gamePricePerMin
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setShowDigitalForm(false);
    setShowDigitalPopup(true);
  };

  const handleDigitalConfirm = () => {
    setDigitalGames([
      ...digitalGames,
      {
        id: digitalGames.length + 1,
        name: digitalData.gameName,
        assetDate: digitalData.gameAssetDate,
        pricePerMin: digitalData.gamePricePerMin,
      },
    ]);
    setShowDigitalPopup(false);
    setDigitalData({
      uploadedImage: false,
      gameName: '',
      gameAssetDate: '',
      gamePricePerMin: '',
    });
    Alert.alert('Success', 'Game added!');
  };

  // Menu Handlers
  const handleAddMenu = () => setShowMenuForm(true);

  const handleMenuImageUpload = () => {
    setMenuData({ ...menuData, uploadedImage: true });
    Alert.alert('Success', 'Menu image uploaded!');
  };

  const handleMenuContinue = () => {
    if (
      !menuData.category ||
      !menuData.itemName ||
      !menuData.description ||
      !menuData.price
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    setShowMenuForm(false);
    setShowMenuPopup(true);
  };

  const handleMenuConfirm = () => {
    setMenuItems([
      ...menuItems,
      {
        id: menuItems.length + 1,
        name: menuData.itemName,
        category: menuData.category,
        description: menuData.description,
        price: menuData.price,
        supplier: menuData.supplier,
      },
    ]);
    setShowMenuPopup(false);
    setMenuData({
      uploadedImage: false,
      category: '',
      itemName: '',
      description: '',
      price: '',
      supplier: '',
    });
    Alert.alert('Success', 'Menu successfully added!');
  };

  // ===== RENDER FUNCTIONS (NO HOOKS) =====
  const TableGrid = () => (
    <ScrollView style={styles.gridContainer}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF8C42"
          style={{ marginTop: 50 }}
        />
      ) : (
        <>
          <FlatList
            data={tables}
            numColumns={2}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                onLongPress={() => handleDeleteTable(item.id)}
              >
                <View style={styles.cardContent}>
                  <View style={styles.xLine} />
                  <View
                    style={[styles.xLine, { transform: [{ rotate: '90deg' }] }]}
                  />
                  <Text
                    style={{
                      color: '#FF8C42',
                      fontWeight: 'bold',
                      marginTop: 10,
                    }}
                  >
                    {item.game_name}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={item => item.id.toString()}
            scrollEnabled={false}
            columnWrapperStyle={styles.gridRow}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddTable}>
            <Text style={styles.addBtnText}>Add New Table</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );

  const DigitalGamesGrid = () => (
    <ScrollView style={styles.gridContainer}>
      <FlatList
        data={digitalGames}
        numColumns={2}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <Icon name="game-controller" size={40} color="#FF8C42" />
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAddDigitalGame}>
        <Text style={styles.addBtnText}>Add New Digital Game</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const MenuItemsView = () => (
    <View style={{ flex: 1 }}>
      <View style={styles.categoryTabs}>
        {['Prepared food', 'Packed food', 'Cigarette'].map(cat => (
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
        {menuItems
          .filter(item => item.category === selectedMenuCategory)
          .map(item => (
            <View key={item.id} style={styles.menuCard}>
              <View style={styles.menuIcon}>
                <Icon name="fast-food" size={24} color="#FF8C42" />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuCategory}>{item.category}</Text>
                <Text style={styles.menuPrice}>{item.price}</Text>
              </View>
            </View>
          ))}
      </ScrollView>
      <View style={styles.addMenuBtnContainer}>
        <TouchableOpacity style={styles.addBtn} onPress={handleAddMenu}>
          <Text style={styles.addBtnText}>Add New menu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getContent = () => {
    if (activeTab === 'MANAGE TABLE GAMES') return <TableGrid />;
    if (activeTab === 'MANAGE DIGITAL GAME') return <DigitalGamesGrid />;
    return <MenuItemsView />;
  };

  // ===== MAIN RENDER =====
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Set up menu</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {['MANAGE TABLE GAMES', 'MANAGE DIGITAL GAME', 'MANAGE MENU'].map(
          tab => (
            <TouchableOpacity
              key={tab}
              style={styles.tab}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                style={
                  activeTab === tab ? styles.activeTabText : styles.tabText
                }
              >
                {tab}
              </Text>
              {activeTab === tab && <View style={styles.tabLine} />}
            </TouchableOpacity>
          ),
        )}
      </View>

      {/* Content */}
      {getContent()}

      {/* TABLE FORM MODAL */}
      <Modal visible={showTableForm} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowTableForm(false)}>
              <Icon name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Set up menu</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.tabs}>
            <View style={styles.tab}>
              <Text style={styles.activeTabText}>MANAGE TABLE GAMES</Text>
              <View style={styles.tabLine} />
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE DIGITAL GAME</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE MENU</Text>
            </View>
          </View>

          <ScrollView style={styles.form}>
            <TouchableOpacity
              style={styles.upload}
              onPress={handleTableImageUpload}
            >
              <View style={styles.uploadContent}>
                <Icon
                  name={
                    tableData.uploadedImage
                      ? 'checkmark-circle'
                      : 'cloud-upload'
                  }
                  size={32}
                  color={tableData.uploadedImage ? '#4CAF50' : '#FF8C42'}
                />
                <Text
                  style={
                    tableData.uploadedImage
                      ? styles.uploadSuccess
                      : styles.uploadText
                  }
                >
                  {tableData.uploadedImage
                    ? 'Image Uploaded'
                    : 'Upload table image'}
                </Text>
              </View>
            </TouchableOpacity>

            <Text style={styles.label}>Game name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter game name (e.g., Snooker Table 1)"
              value={tableData.game_name}
              onChangeText={text =>
                setTableData({ ...tableData, game_name: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Dimension of table</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter dimensions"
              value={tableData.dimensions}
              onChangeText={text =>
                setTableData({ ...tableData, dimensions: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Asset onboarding date</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              value={tableData.assetDate}
              onChangeText={text =>
                setTableData({ ...tableData, assetDate: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Set price of table per min</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              value={tableData.pricePerMin}
              onChangeText={text =>
                setTableData({ ...tableData, pricePerMin: text })
              }
              placeholderTextColor="#CCC"
              keyboardType="numeric"
            />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setShowTableForm(false)}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleTableContinue}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TABLE CONFIRMATION POPUP */}
      <Modal
        visible={showTablePopup}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTablePopup(false)}
      >
        <View style={styles.popup}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupTitle}>Table details</Text>
              <TouchableOpacity onPress={() => setShowTablePopup(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.preview}>
              <View style={styles.snookerTable}>
                <View style={styles.snookerBorder} />
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="Game Name" value={tableData.game_name} />
              <DetailRow label="Dimensions" value={tableData.dimensions} />
              <DetailRow label="Asset Date" value={tableData.assetDate} />
              <DetailRow
                label="Price/min"
                value={`₹${tableData.pricePerMin}`}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleTableConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.confirmBtnText}>Confirm details</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ... Rest of your modals (Digital Game Form, Menu Form, etc.) ... */}
    </View>
  );
}

// Detail row component
const DetailRow = ({ label, value }) => (
  <View style={styles.detail}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: { fontSize: 11, color: '#999', fontWeight: '600' },
  activeTabText: { fontSize: 11, color: '#FF8C42', fontWeight: '600' },
  tabLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: '#FF8C42',
  },
  gridContainer: { flex: 1, padding: 28 },
  gridRow: { justifyContent: 'space-between', marginBottom: 24 },
  card: {
    width: (width - 96) / 2,
    aspectRatio: 1,
    borderWidth: 2,
    borderColor: '#FF8C42',
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    width: '90%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  xLine: {
    position: 'absolute',
    width: 2,
    height: '141%',
    backgroundColor: '#FF8C42',
  },
  categoryTabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
  },
  catTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  catTabActive: { backgroundColor: '#FF8C42' },
  catTabText: { fontSize: 12, color: '#666', fontWeight: '600' },
  catTabTextActive: { color: '#fff' },
  menuList: { flex: 1, padding: 16 },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF8C42',
  },
  menuIcon: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuInfo: { flex: 1 },
  menuName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  menuCategory: { fontSize: 12, color: '#888', marginBottom: 4 },
  menuPrice: { fontSize: 13, fontWeight: 'bold', color: '#FF8C42' },
  addMenuBtnContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  addBtn: {
    marginTop: 32,
    borderRadius: 25,
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  form: { flex: 1, padding: 16 },
  upload: {
    height: 100,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadActive: { backgroundColor: '#E8F5E9', borderColor: '#C8E6C9' },
  uploadContent: { alignItems: 'center' },
  uploadText: { fontSize: 13, color: '#FF8C42', fontWeight: '600' },
  uploadSuccess: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 8,
  },
  label: { fontSize: 14, color: '#FF8C42', fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#333',
  },
  buttons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  backBtnText: { color: '#333', fontSize: 14, fontWeight: 'bold' },
  continueBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 25,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  continueBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  popup: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  popupCard: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  popupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  popupTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  preview: { alignItems: 'center', marginBottom: 24 },
  snookerTable: {
    width: 180,
    height: 100,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    borderWidth: 8,
    borderColor: '#8B4513',
  },
  snookerBorder: {
    position: 'absolute',
    top: 4,
    left: 4,
    right: 4,
    bottom: 4,
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 2,
  },
  details: { marginBottom: 24 },
  detail: { marginBottom: 12 },
  detailLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  detailValue: { fontSize: 14, color: '#333', fontWeight: '600' },
  confirmBtn: {
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    borderRadius: 25,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
