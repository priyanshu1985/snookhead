import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = (width - 120) / 3; // 3 columns with padding for modal

async function getAuthToken() {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch {
    return null;
  }
}

export default function ImageSelector({ selectedImage, onSelectImage, style, imageType = 'games' }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const getFullImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_URL}${url}`;
  };

  const renderImageItem = (item) => {
    const isSelected = selectedImage === item.key;
    const imageUrl = getFullImageUrl(item.url);

    return (
      <TouchableOpacity
        key={item.key}
        style={[
          styles.imageItem,
          isSelected && styles.imageItemSelected,
        ]}
        onPress={() => onSelectImage(item.key)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="cover"
          onError={(e) => console.log('Image load error:', e.nativeEvent.error)}
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

  const title = imageType === 'menu' ? 'Select Menu Item Image' : 'Select Table Image';
  const subtitle = imageType === 'menu' ? 'Choose an image for your menu item' : 'Choose an image for your game type';

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {subtitle}
      </Text>
      <View style={styles.imagesGrid}>
        {groupedImages.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item) => renderImageItem(item))}
          </View>
        ))}
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
});
