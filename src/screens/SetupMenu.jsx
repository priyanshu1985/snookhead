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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config'; // or your config location
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
  });

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
  });

  const [selectedGameId, setSelectedGameId] = useState(null); // NEW

  // --- Fetch from backend, always array, with auth token ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const token = await getAuthToken();
      try {
        if (activeTab === 'SET DASHBOARD') {
          const res = await fetch(`${API_URL}/api/games`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const result = await res.json();
          console.log('Returned games:', result);
          setGames(
            Array.isArray(result) ? result : result.games || result.data || [],
          );
        }
        if (activeTab === 'MANAGE TABLE GAMES') {
          const res = await fetch(`${API_URL}/api/tables`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const result = await res.json();
          setTables(
            Array.isArray(result) ? result : result.tables || result.data || [],
          );
        }
        if (activeTab === 'MANAGE MENU') {
          const res = await fetch(`${API_URL}/api/menu`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
          });
          const result = await res.json();
          setMenus(
            Array.isArray(result)
              ? result
              : result.menus || result.items || result.data || [],
          );
        }
      } catch {
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
      await fetch(`${API_URL}/api/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ game_name: form.name }),
      });
    } finally {
      setLoading(false);
    }
  }

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
    // form should be your menuForm state: { category, name, description, price, supplier }
    const token = await getAuthToken();
    try {
      const response = await fetch(`${API_URL}/api/menu`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
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

  // --- Add Game Modal flow ---
  const AddGameFlow = (
    <>
      <Modal visible={addGameModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.formCard}>
            <TouchableOpacity style={styles.uploadImageBox}>
              <Text style={styles.uploadImageText}>Upload table image</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Game name"
              value={gameForm.name}
              onChangeText={v => setGameForm(f => ({ ...f, name: v }))}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setAddGameModal(false)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={async () => {
                  await addGameAPI(gameForm);
                  setAddGameModal(false);
                  setAddGameConfirm(true);
                }}
              >
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={addGameConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Table details</Text>
            <Image
              style={{
                width: 80,
                height: 40,
                borderRadius: 10,
                alignSelf: 'center',
              }}
              source={{
                uri: 'https://img.icons8.com/fluency/96/pool-table.png',
              }}
            />
            <Text style={styles.detailRow}>Type of table: {gameForm.name}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setAddGameConfirm(false);
                setGameSuccess(true);
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={gameSuccess} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.successText}>Table successfully added!</Text>
            <TouchableOpacity onPress={() => setGameSuccess(false)}>
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
            <TextInput
              style={styles.input}
              placeholder="Game ID"
              value={selectedGameId ? String(selectedGameId) : ''}
              editable={false}
            />
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
          <View style={styles.formCard}>
            <TextInput
              style={styles.input}
              placeholder="Category"
              value={menuForm.category}
              onChangeText={v => setMenuForm(f => ({ ...f, category: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Item name"
              value={menuForm.name}
              onChangeText={v => setMenuForm(f => ({ ...f, name: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Description"
              value={menuForm.description}
              onChangeText={v => setMenuForm(f => ({ ...f, description: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Price"
              value={menuForm.price}
              onChangeText={v => setMenuForm(f => ({ ...f, price: v }))}
            />
            <TextInput
              style={styles.input}
              placeholder="Supplier mobile"
              value={menuForm.supplier}
              onChangeText={v => setMenuForm(f => ({ ...f, supplier: v }))}
            />
            <View style={styles.formBtnRow}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => setAddMenuModal(false)}
              >
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.continueBtn}
                onPress={async () => {
                  await addMenuAPI(menuForm);
                  setAddMenuModal(false);
                  setAddMenuConfirm(true);
                }}
              >
                <Text style={styles.continueBtnText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={addMenuConfirm} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>Menu details</Text>
            <Text style={styles.detailRow}>Type: {menuForm.category}</Text>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => {
                setAddMenuConfirm(false);
                setMenuSuccess(true);
              }}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={menuSuccess} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.popupCard}>
            <Text style={styles.successText}>Menu successfully added!</Text>
            <TouchableOpacity onPress={() => setMenuSuccess(false)}>
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
        <View style={styles.dashboardSection}>
          {Array.isArray(games) &&
            games.map((g, i) => (
              <View style={styles.dashboardRow} key={g.game_id || g.id || i}>
                <Text style={styles.dashboardIndex}>{i + 1}.</Text>
                <Text style={styles.dashboardName}>
                  {g.gamename || g.game_name || 'Unknown'}
                </Text>
              </View>
            ))}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setAddGameModal(true)}
        >
          <Text style={styles.addBtnText}>Add New game</Text>
        </TouchableOpacity>
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
                    g.gamename || g.game_name,
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
                  {g.gamename || g.game_name}
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
                  {item.name || item.game_name || item.id}
                </Text>
              </View>
            )}
            columnWrapperStyle={styles.gridRow}
            scrollEnabled={false}
            contentContainerStyle={styles.tablesGrid}
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
              <View style={styles.menuIcon}>
                <Icon name="fast-food" size={26} color="#FF8C42" />
              </View>
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
              style={activeTab === tab ? styles.activeTabText : styles.tabText}
            >
              {tab.replace('MANAGE ', '')}
            </Text>
            {activeTab === tab && <View style={styles.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>
      {Content}
      {AddGameFlow}
      {AddTableFlow}
      {AddMenuFlow}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 13,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  tabText: { fontSize: 12, color: '#AAA', fontWeight: '700' },
  activeTabText: { fontSize: 12, color: '#FF8C42', fontWeight: '700' },
  tabLine: {
    marginTop: 6,
    height: 3.5,
    borderRadius: 2,
    backgroundColor: '#FF8C42',
    width: '60%',
    alignSelf: 'center',
  },
  gridSection: { flex: 1, backgroundColor: '#FAFAFA', marginTop: 0 },
  tableCard: {
    width: width / 3.5,
    aspectRatio: 1,
    margin: 10,
    borderRadius: 18,
    backgroundColor: '#FFE5C4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  tableCardText: { fontSize: 21, fontWeight: 'bold', color: '#FF8C42' },
  gridRow: { justifyContent: 'center' },
  dashboardSection: {
    flex: 1,
    marginTop: 18,
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  dashboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#EEE',
  },
  dashboardIndex: {
    fontWeight: 'bold',
    color: '#333',
    marginRight: 18,
    fontSize: 16,
  },
  dashboardName: { fontWeight: 'bold', color: '#09790F', fontSize: 16 },
  addBtn: {
    marginTop: 18,
    backgroundColor: '#FF8C42',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    marginHorizontal: 18,
    elevation: 2,
  },
  addBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  categoryTabs: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#fff',
    justifyContent: 'space-evenly',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    elevation: 1,
    marginBottom: 7,
  },
  catTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 22,
    marginHorizontal: 8,
    alignItems: 'center',
    backgroundColor: '#F3F2F0',
  },
  catTabActive: { backgroundColor: '#FF8C42' },
  catTabText: { color: '#888', fontWeight: '700', fontSize: 12.8 },
  catTabTextActive: { color: '#fff' },
  menuList: { padding: 7 },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 11,
    alignItems: 'center',
    elevation: 1,
    padding: 7,
  },
  menuIcon: {
    width: 55,
    height: 55,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  menuInfo: { flex: 1 },
  menuName: { fontWeight: 'bold', fontSize: 15, color: '#333' },
  menuDesc: { fontSize: 12, color: '#666', marginVertical: 2 },
  menuPrice: { fontWeight: 'bold', color: '#FF8C42', fontSize: 15 },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formCard: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
  },
  popupCard: {
    width: '80%',
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  popupTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  detailRow: { fontSize: 14, color: '#666', marginBottom: 2 },
  confirmBtn: {
    marginTop: 18,
    backgroundColor: '#FF8C42',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  formBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  continueBtn: {
    flex: 1,
    backgroundColor: '#FF8C42',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  continueBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    paddingVertical: 10,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backBtnText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 15,
    paddingVertical: 10,
  },
  input: {
    marginVertical: 7,
    borderColor: '#EEE',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#333',
  },
  uploadImageBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#bbb',
    padding: 18,
    alignItems: 'center',
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadImageText: { color: '#222', fontWeight: 'bold', fontSize: 13 },
  successText: {
    color: '#FF8C42',
    fontWeight: 'bold',
    fontSize: 17,
    textAlign: 'center',
  },

  // Add these into your existing styles object
gameHeaderContainer: {
  paddingVertical: 10,        // vertical padding for the header bar
  paddingLeft: 12,            // left padding so first tab isn't glued to edge
  backgroundColor: '#fff',
  borderBottomWidth: 1,
  borderBottomColor: '#EEE',
},

gameHeaderScroll: {
  alignItems: 'center',       // vertically center items inside the horizontal ScrollView
  paddingRight: 12,           // breathing room at the end
},

gameHeaderTab: {
  paddingVertical: 8,
  paddingHorizontal: 14,
  marginRight: 10,            // spacing between tabs
  borderRadius: 4,
  backgroundColor: '#F3F2F0', // inactive background
},

gameHeaderTabActive: {
  backgroundColor: '#FF8C42', // active background (orange)
  elevation: 2,
},

gameHeaderText: {
  color: '#555',
  fontWeight: '700',
  fontSize: 13,
},

gameHeaderTextActive: {
  color: '#fff',
},

// containers for the grid below the header (you referenced tablesContainer, tablesList, tablesGrid)
tablesContainer: {
  paddingHorizontal: 12,
  paddingTop: 12,
  backgroundColor: '#FAFAFA',
},

tablesList: {
  // optional: if you want padding / margin on the FlatList itself
  // leave empty or set e.g. marginHorizontal: -6 to compensate for item margins
},

tablesGrid: {
  // optional contentContainerStyle for FlatList: add bottom padding
  paddingBottom: 18,
},

});
