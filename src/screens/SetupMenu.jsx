import React, { useState } from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export default function SetupMenu({ navigation }) {
  // ===== DECLARE ALL HOOKS AT THE VERY TOP - IN EXACT ORDER =====

  // 1. Tab selection
  const [activeTab, setActiveTab] = useState('MANAGE TABLE GAMES');

  // 2-7. Table states
  const [tables, setTables] = useState([
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
    { id: 5 },
    { id: 6 },
  ]);
  const [showTableForm, setShowTableForm] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [tableData, setTableData] = useState({
    uploadedImage: false,
    dimensions: '',
    assetDate: '',
    pricePerMin: '',
  });

  // 8-13. Digital games states
  const [digitalGames, setDigitalGames] = useState([
    { id: 1 },
    { id: 2 },
    { id: 3 },
    { id: 4 },
  ]);
  const [showDigitalForm, setShowDigitalForm] = useState(false);
  const [showDigitalPopup, setShowDigitalPopup] = useState(false);
  const [digitalData, setDigitalData] = useState({
    uploadedImage: false,
    gameName: '',
    gameAssetDate: '',
    gamePricePerMin: '',
  });

  // 14-19. Menu states
  const [menuItems, setMenuItems] = useState([
    { id: 1, name: 'Paneer wrap', category: 'Prepared food', price: 'Rs 170' },
    { id: 2, name: 'Paneer wrap', category: 'Packed food', price: 'Rs 170' },
  ]);
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

  // ===== HANDLER FUNCTIONS =====

  // Table Handlers
  const handleAddTable = () => setShowTableForm(true);

  const handleTableImageUpload = () => {
    setTableData({ ...tableData, uploadedImage: true });
    Alert.alert('Success', 'Table image uploaded!');
  };

  const handleTableContinue = () => {
    if (
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

  const handleTableConfirm = () => {
    setTables([
      ...tables,
      {
        id: tables.length + 1,
        dimensions: tableData.dimensions,
        assetDate: tableData.assetDate,
        pricePerMin: tableData.pricePerMin,
      },
    ]);
    setShowTablePopup(false);
    setTableData({
      uploadedImage: false,
      dimensions: '',
      assetDate: '',
      pricePerMin: '',
    });
    Alert.alert('Success', 'Table added!');
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
    <View style={styles.gridContainer}>
      <FlatList
        data={tables}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View
                style={[styles.xLine, { transform: [{ rotate: '45deg' }] }]}
              />
              <View
                style={[styles.xLine, { transform: [{ rotate: '-45deg' }] }]}
              />
            </View>
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAddTable}>
        <Text style={styles.addBtnText}>Add New Table</Text>
      </TouchableOpacity>
    </View>
  );

  const DigitalGamesGrid = () => (
    <View style={styles.gridContainer}>
      <FlatList
        data={digitalGames}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Icon name="game-controller" size={50} color="#FF8C42" />
          </View>
        )}
        keyExtractor={item => item.id.toString()}
        scrollEnabled={false}
      />
      <TouchableOpacity style={styles.addBtn} onPress={handleAddDigitalGame}>
        <Text style={styles.addBtnText}>Add New Digital Game</Text>
      </TouchableOpacity>
    </View>
  );

  const MenuItemsView = () => (
    <View style={styles.container}>
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
                <Icon name="fast-food" size={32} color="#FF8C42" />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuName}>{item.name}</Text>
                <Text style={styles.menuCategory}>{item.category}</Text>
                <Text style={styles.menuPrice}>{item.price}</Text>
              </View>
            </View>
          ))}
        <View style={{ height: 100 }} />
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
          <Icon name="arrow-back" size={24} color="#333" />
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
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
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

      {/* TABLE FORM */}
      <Modal visible={showTableForm} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowTableForm(false)}>
              <Icon name="arrow-back" size={24} color="#333" />
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
              style={[
                styles.upload,
                tableData.uploadedImage && styles.uploadActive,
              ]}
              onPress={handleTableImageUpload}
            >
              {tableData.uploadedImage ? (
                <View style={styles.uploadContent}>
                  <Icon name="checkmark-circle" size={40} color="#4CAF50" />
                  <Text style={styles.uploadSuccess}>Image Uploaded</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Icon name="image-outline" size={32} color="#FF8C42" />
                  <Text style={styles.uploadText}>Upload table image</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Dimention of table</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 10 ft x 5 ft"
              value={tableData.dimensions}
              onChangeText={text =>
                setTableData({ ...tableData, dimensions: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Asset onboarding table</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 11-08-2025"
              value={tableData.assetDate}
              onChangeText={text =>
                setTableData({ ...tableData, assetDate: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Set price of table per min</Text>
            <TextInput
              style={styles.input}
              placeholder="Based on per min"
              value={tableData.pricePerMin}
              onChangeText={text =>
                setTableData({ ...tableData, pricePerMin: text })
              }
              placeholderTextColor="#CCC"
            />
            <View style={{ height: 100 }} />
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

      {/* DIGITAL GAME FORM */}
      <Modal visible={showDigitalForm} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowDigitalForm(false)}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Set up menu</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.tabs}>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE TABLE GAMES</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.activeTabText}>MANAGE DIGITAL GAME</Text>
              <View style={styles.tabLine} />
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE MENU</Text>
            </View>
          </View>

          <ScrollView style={styles.form}>
            <TouchableOpacity
              style={[
                styles.upload,
                digitalData.uploadedImage && styles.uploadActive,
              ]}
              onPress={handleDigitalImageUpload}
            >
              {digitalData.uploadedImage ? (
                <View style={styles.uploadContent}>
                  <Icon name="checkmark-circle" size={40} color="#4CAF50" />
                  <Text style={styles.uploadSuccess}>Image Uploaded</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Icon name="image-outline" size={32} color="#FF8C42" />
                  <Text style={styles.uploadText}>Upload game image</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Game name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., FIFA 24"
              value={digitalData.gameName}
              onChangeText={text =>
                setDigitalData({ ...digitalData, gameName: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Asset onboarding date</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 11-08-2025"
              value={digitalData.gameAssetDate}
              onChangeText={text =>
                setDigitalData({ ...digitalData, gameAssetDate: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Set price per min</Text>
            <TextInput
              style={styles.input}
              placeholder="Based on per min"
              value={digitalData.gamePricePerMin}
              onChangeText={text =>
                setDigitalData({ ...digitalData, gamePricePerMin: text })
              }
              placeholderTextColor="#CCC"
            />
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setShowDigitalForm(false)}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleDigitalContinue}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MENU FORM */}
      <Modal visible={showMenuForm} animationType="slide">
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setShowMenuForm(false)}>
              <Icon name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.title}>Set up menu</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.tabs}>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE TABLE GAMES</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.tabText}>MANAGE DIGITAL GAME</Text>
            </View>
            <View style={styles.tab}>
              <Text style={styles.activeTabText}>MANAGE MENU</Text>
              <View style={styles.tabLine} />
            </View>
          </View>

          <ScrollView style={styles.form}>
            <TouchableOpacity
              style={[
                styles.upload,
                menuData.uploadedImage && styles.uploadActive,
              ]}
              onPress={handleMenuImageUpload}
            >
              {menuData.uploadedImage ? (
                <View style={styles.uploadContent}>
                  <Icon name="checkmark-circle" size={40} color="#4CAF50" />
                  <Text style={styles.uploadSuccess}>Image Uploaded</Text>
                </View>
              ) : (
                <View style={styles.uploadContent}>
                  <Icon name="image-outline" size={32} color="#FF8C42" />
                  <Text style={styles.uploadText}>Upload menu image</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Category of food</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Prepared food"
              value={menuData.category}
              onChangeText={text =>
                setMenuData({ ...menuData, category: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Item name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter item name"
              value={menuData.itemName}
              onChangeText={text =>
                setMenuData({ ...menuData, itemName: text })
              }
              placeholderTextColor="#CCC"
            />

            <Text style={styles.label}>Description of item</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Enter description"
              value={menuData.description}
              onChangeText={text =>
                setMenuData({ ...menuData, description: text })
              }
              placeholderTextColor="#CCC"
              multiline
            />

            <Text style={styles.label}>Set price of item</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter price"
              value={menuData.price}
              onChangeText={text => setMenuData({ ...menuData, price: text })}
              placeholderTextColor="#CCC"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Supplier mobile (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter number"
              value={menuData.supplier}
              onChangeText={text =>
                setMenuData({ ...menuData, supplier: text })
              }
              placeholderTextColor="#CCC"
              keyboardType="phone-pad"
            />
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setShowMenuForm(false)}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleMenuContinue}
            >
              <Text style={styles.continueBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* TABLE POPUP */}
      <Modal visible={showTablePopup} animationType="fade" transparent>
        <View style={styles.popup}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <TouchableOpacity onPress={() => setShowTablePopup(false)}>
                <Icon name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.popupTitle}>Table details</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.preview}>
              <View style={styles.snookerTable}>
                <View style={styles.snookerBorder} />
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="Type of table :" value="Snooker" />
              <DetailRow
                label="Dimensions of table :"
                value={tableData.dimensions}
              />
              <DetailRow
                label="Asset onboarding date :"
                value={tableData.assetDate}
              />
              <DetailRow
                label="Set price of table :"
                value={tableData.pricePerMin}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleTableConfirm}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DIGITAL GAME POPUP */}
      <Modal visible={showDigitalPopup} animationType="fade" transparent>
        <View style={styles.popup}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <TouchableOpacity onPress={() => setShowDigitalPopup(false)}>
                <Icon name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.popupTitle}>Digital Game details</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.preview}>
              <View style={styles.console}>
                <Icon name="game-controller" size={60} color="#fff" />
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="Type of game :" value="PlayStation 5" />
              <DetailRow label="Game name :" value={digitalData.gameName} />
              <DetailRow
                label="Asset onboarding date :"
                value={digitalData.gameAssetDate}
              />
              <DetailRow
                label="Set price per min :"
                value={digitalData.gamePricePerMin}
              />
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleDigitalConfirm}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MENU POPUP */}
      <Modal visible={showMenuPopup} animationType="fade" transparent>
        <View style={styles.popup}>
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <TouchableOpacity onPress={() => setShowMenuPopup(false)}>
                <Icon name="arrow-back" size={20} color="#333" />
              </TouchableOpacity>
              <Text style={styles.popupTitle}>Menu details</Text>
              <View style={{ width: 20 }} />
            </View>

            <View style={styles.preview}>
              <View style={styles.menuPreview}>
                <Icon name="fast-food" size={60} color="#FF8C42" />
              </View>
            </View>

            <View style={styles.details}>
              <DetailRow label="Category of food :" value={menuData.category} />
              <DetailRow label="Item name :" value={menuData.itemName} />
              <DetailRow
                label="Set price of item :"
                value={'₹' + menuData.price}
              />
              <DetailRow label="Description :" value={menuData.description} />
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleMenuConfirm}
            >
              <Text style={styles.confirmBtnText}>Confirm details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  console: {
    width: 180,
    height: 100,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuPreview: {
    width: 180,
    height: 100,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
