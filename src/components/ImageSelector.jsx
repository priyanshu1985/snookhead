import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import { API_URL } from '../../config';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 120) / 3; // 3 columns with padding for modal

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function ImageSelector({
  selectedImage,
  onSelectImage,
  style,
  imageType = 'games',
}) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'device', 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingUrl, setUploadingUrl] = useState(false);
  const [uploadingDevice, setUploadingDevice] = useState(false);

  useEffect(() => {
    fetchStockImages();
  }, [imageType]);

  const fetchStockImages = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAuthToken();

      // Use imageType to determine which endpoint to call
      const endpoint = imageType === 'menu' ? 'menu' : 'games';
      const response = await fetch(`${API_URL}/api/stock-images/${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      console.log(`Fetched ${imageType} stock images:`, data);
      setImages(data);
    } catch (err) {
      console.error(`Error fetching ${imageType} stock images:`, err);
      setError('Failed to load images');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadFromDevice = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Error', 'Failed to pick image');
        return;
      }

      const asset = result.assets[0];
      setUploadingDevice(true);

      // Upload to server - will be saved directly to stock folder
      const formData = new FormData();
      formData.append('file', {
        uri:
          Platform.OS === 'ios' ? asset.uri.replace('file://', '') : asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'upload.jpg',
      });

      formData.append('folder', imageType === 'menu' ? 'menu' : 'games');

      const token = await getAuthToken();
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.key) {
        Alert.alert('Success', 'Image uploaded and added to stock!');
        // Refresh stock images
        await fetchStockImages();
        // Select the newly uploaded image
        onSelectImage(data.key);
        // Switch to stock tab to show the new image
        setActiveTab('stock');
      } else {
        Alert.alert('Error', data.error || 'Failed to upload image');
      }
    } catch (err) {
      console.error('Upload from device error:', err);
      Alert.alert('Error', 'Failed to upload image from device');
    } finally {
      setUploadingDevice(false);
    }
  };

  const handleAddFromUrl = async () => {
    if (!imageUrl.trim()) {
      Alert.alert('Error', 'Please enter an image URL');
      return;
    }

    try {
      setUploadingUrl(true);
      const token = await getAuthToken();

      const response = await fetch(`${API_URL}/api/stock-images/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          folder: imageType === 'menu' ? 'menu' : 'games',
          imageUrl: imageUrl.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert('Success', 'Image added to stock successfully!');
        setImageUrl('');
        // Refresh stock images
        await fetchStockImages();
        // Select the newly added image
        if (data.key) {
          onSelectImage(data.key);
        }
        // Switch to stock tab
        setActiveTab('stock');
      } else {
        Alert.alert('Error', data.error || 'Failed to add image from URL');
      }
    } catch (err) {
      console.error('Add from URL error:', err);
      Alert.alert('Error', 'Failed to add image from URL');
    } finally {
      setUploadingUrl(false);
    }
  };

  const getFullImageUrl = url => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const renderImageItem = item => {
    const isSelected = selectedImage === item.key;
    const imageUrl = getFullImageUrl(item.url);

    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.imageItem, isSelected && styles.imageItemSelected]}
        onPress={() => onSelectImage(item.key)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={e => console.log('Image load error:', e.nativeEvent.error)}
        />
        {isSelected && (
          <View style={styles.selectedOverlay}>
            <Icon name="checkmark-circle" size={28} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Group images into rows of 3
  const groupedImages = [];
  for (let i = 0; i < images.length; i += 3) {
    groupedImages.push(images.slice(i, i + 3));
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <ActivityIndicator size="large" color="#FF8C42" />
        <Text style={styles.loadingText}>Loading images...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Icon name="alert-circle-outline" size={40} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchStockImages}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (images.length === 0) {
    const folderName = imageType === 'menu' ? 'menu-images' : 'game-images';
    return (
      <View style={[styles.container, styles.centerContent, style]}>
        <Icon name="images-outline" size={40} color="#CCCCCC" />
        <Text style={styles.emptyText}>No images available</Text>
        <Text style={styles.emptySubtext}>
          Add images to the {folderName} folder on the server
        </Text>
      </View>
    );
  }

  const title =
    imageType === 'menu' ? 'Select Menu Item Image' : 'Select Table Image';
  const subtitle =
    imageType === 'menu'
      ? 'Choose an image for your menu item'
      : 'Choose an image for your game type';

  const renderStockTab = () => {
    if (loading) {
      return (
        <View style={[styles.centerContent, { paddingVertical: 40 }]}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.centerContent, { paddingVertical: 40 }]}>
          <Icon name="alert-circle-outline" size={40} color="#FF6B6B" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchStockImages}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (images.length === 0) {
      const folderName = imageType === 'menu' ? 'menu-images' : 'game-images';
      return (
        <View style={[styles.centerContent, { paddingVertical: 40 }]}>
          <Icon name="images-outline" size={40} color="#CCCCCC" />
          <Text style={styles.emptyText}>No images available</Text>
          <Text style={styles.emptySubtext}>
            Upload images using the other tabs to get started
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.imagesGrid}>
        {groupedImages.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map(item => renderImageItem(item))}
          </View>
        ))}
      </View>
    );
  };

  const renderDeviceTab = () => {
    return (
      <View style={styles.uploadSection}>
        <Icon name="cloud-upload-outline" size={60} color="#FF8C42" />
        <Text style={styles.uploadTitle}>Upload from Device</Text>
        <Text style={styles.uploadSubtitle}>
          Select an image from your device gallery
        </Text>
        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploadingDevice && styles.uploadButtonDisabled,
          ]}
          onPress={handleUploadFromDevice}
          disabled={uploadingDevice}
        >
          {uploadingDevice ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="images-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.uploadNote}>
          Image will be saved to stock images after upload
        </Text>
      </View>
    );
  };

  const renderUrlTab = () => {
    return (
      <View style={styles.uploadSection}>
        <Icon name="link-outline" size={60} color="#FF8C42" />
        <Text style={styles.uploadTitle}>Add from URL</Text>
        <Text style={styles.uploadSubtitle}>
          Enter the URL of an image to download and add to stock
        </Text>
        <TextInput
          style={styles.urlInput}
          placeholder="https://example.com/image.jpg"
          value={imageUrl}
          onChangeText={setImageUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <TouchableOpacity
          style={[
            styles.uploadButton,
            uploadingUrl && styles.uploadButtonDisabled,
          ]}
          onPress={handleAddFromUrl}
          disabled={uploadingUrl}
        >
          {uploadingUrl ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Icon name="download-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadButtonText}>Add to Stock Images</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.uploadNote}>
          Image will be downloaded and saved to stock images
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stock' && styles.tabActive]}
          onPress={() => setActiveTab('stock')}
        >
          <Icon
            name="albums-outline"
            size={18}
            color={activeTab === 'stock' ? '#FF8C42' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'stock' && styles.tabTextActive,
            ]}
          >
            Stock Images
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'device' && styles.tabActive]}
          onPress={() => setActiveTab('device')}
        >
          <Icon
            name="phone-portrait-outline"
            size={18}
            color={activeTab === 'device' ? '#FF8C42' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'device' && styles.tabTextActive,
            ]}
          >
            From Device
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'url' && styles.tabActive]}
          onPress={() => setActiveTab('url')}
        >
          <Icon
            name="link-outline"
            size={18}
            color={activeTab === 'url' ? '#FF8C42' : '#999'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'url' && styles.tabTextActive,
            ]}
          >
            From URL
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <View style={styles.tabContent}>
        {activeTab === 'stock' && renderStockTab()}
        {activeTab === 'device' && renderDeviceTab()}
        {activeTab === 'url' && renderUrlTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#888888',
    marginBottom: 16,
  },
  imagesGrid: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  imageItem: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  imageItemSelected: {
    borderColor: '#FF8C42',
    borderWidth: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 140, 66, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#888888',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#FF8C42',
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 15,
    color: '#666666',
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FF8C42',
  },
  tabContent: {
    minHeight: 200,
  },
  // Upload Section
  uploadSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF8C42',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  uploadButtonDisabled: {
    opacity: 0.6,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadNote: {
    fontSize: 11,
    color: '#999999',
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // URL Input
  urlInput: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DDDDDD',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1A1A1A',
    marginBottom: 20,
  },
});
