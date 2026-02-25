import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  StatusBar,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  PermissionsAndroid,
  InteractionManager,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../services/apiClient';

const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form States
  const [updatedName, setUpdatedName] = useState(user?.name || '');
  const [updatedStationName, setUpdatedStationName] = useState(user?.station?.stationname || '');
  const [updatedPhone, setUpdatedPhone] = useState(user?.phone || '');
  const [updatedCity, setUpdatedCity] = useState(user?.station?.locationcity || '');
  const [updatedState, setUpdatedState] = useState(user?.station?.locationstate || '');
  const [selectedImage, setSelectedImage] = useState(null);
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);

  const openGallery = async () => {
    setShowPhotoOptions(false);
    
    // Using InteractionManager ensures the modal is fully closed before opening the picker
    InteractionManager.runAfterInteractions(async () => {
      const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 1000,
        maxWidth: 1000,
        quality: 0.8,
      };

      try {
        console.log('Opening launchImageLibrary...');
        const response = await launchImageLibrary(options);
        
        if (response.didCancel) {
          console.log('User cancelled image picker');
        } else if (response.errorCode) {
          console.log('ImagePicker Error: ', response.errorMessage);
          Alert.alert('Error', response.errorMessage || 'Could not open gallery');
        } else if (response.assets && response.assets.length > 0) {
          setSelectedImage(response.assets[0]);
        }
      } catch (error) {
        console.error('ImagePicker Catch Error:', error);
        Alert.alert('Error', 'An unexpected error occurred while selecting image');
      }
    });
  };

  const pickImage = openGallery;

  const handleUpdate = async () => {
    if (!updatedName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      let stationphotourl = user?.station?.stationphotourl;

      // 1. Upload image if selected
      if (selectedImage) {
        console.log('Uploading image...');
        const formData = new FormData();
        
        // Ensure URI is correct for the platform
        const uri = Platform.OS === 'android' ? selectedImage.uri : selectedImage.uri.replace('file://', '');
        
        formData.append('file', {
          uri: uri,
          type: selectedImage.type || 'image/jpeg',
          name: selectedImage.fileName || 'profile.jpg',
        });

        const uploadResponse = await apiClient.uploadFile('/api/upload', formData);
        
        if (uploadResponse.success || uploadResponse.url) {
          stationphotourl = uploadResponse.url || uploadResponse.data?.url;
          console.log('Upload successful:', stationphotourl);
        } else {
          throw new Error(uploadResponse.error || uploadResponse.message || 'Failed to upload image');
        }
      }

      // 2. Update profile
      console.log('Updating profile details...');
      const response = await apiClient.put('/api/auth/profile', {
        name: updatedName,
        phone: updatedPhone,
        stationname: updatedStationName,
        locationcity: updatedCity,
        locationstate: updatedState,
        stationphotourl: stationphotourl,
      });

      if (response.success || response.message) {
        console.log('Profile updated successfully in backend');
        await updateUser({
          name: updatedName,
          phone: updatedPhone,
          stationname: updatedStationName,
          locationcity: updatedCity,
          locationstate: updatedState,
          stationphotourl: stationphotourl,
        });
        
        setIsEditing(false);
        setSelectedImage(null);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        throw new Error(response.error || response.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update operation failed:', error);
      
      // Provide more specific error messages for debugging
      let errorMessage = error.message || 'An unexpected error occurred';
      if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
        errorMessage = 'Network connection error. Please ensure the server is running and accessible.';
      }
      
      Alert.alert('Update Failed', errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };

  const displayAvatar = () => {
    if (selectedImage) return { uri: selectedImage.uri };
    if (user?.station?.stationphotourl) return { uri: user.station.stationphotourl };
    if (user?.profile_picture) return { uri: user.profile_picture };
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{isEditing ? 'Edit Profile' : 'Owner Profile'}</Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.closeButton}
        >
          <Icon name={isEditing ? "close-outline" : "close-outline"} size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Section */}
          <View style={styles.profileSection}>
            {!isEditing && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => setIsEditing(true)}
              >
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>
            )}

            <View style={styles.avatarContainer}>
              <View style={styles.avatarBorder}>
                <View style={styles.avatar}>
                  {displayAvatar() ? (
                    <Image 
                      source={displayAvatar()} 
                      style={styles.profileImage}
                    />
                  ) : (
                    <Icon name="person" size={60} color="#fff" />
                  )}
                </View>
              </View>
              {isEditing && (
                <TouchableOpacity 
                  style={styles.changePhotoButton} 
                  onPress={() => setShowPhotoOptions(true)}
                >
                  <Text style={styles.changePhotoText}>Change Photo</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isEditing && (
              <>
                <Text style={styles.userName}>{user?.name?.toUpperCase() || 'USER NAME'}</Text>
                <Text style={styles.userSubtitle}>{user?.station?.stationname || 'OWNER Club'}</Text>
              </>
            )}
          </View>

          {/* Details Section / Edit Form */}
          {isEditing ? (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Owner Name</Text>
                <TextInput
                  style={styles.input}
                  value={updatedName}
                  onChangeText={setUpdatedName}
                  placeholder="Enter owner name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Club Name</Text>
                <TextInput
                  style={styles.input}
                  value={updatedStationName}
                  onChangeText={setUpdatedStationName}
                  placeholder="Enter club name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={updatedPhone}
                  onChangeText={setUpdatedPhone}
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>City</Text>
                <TextInput
                  style={styles.input}
                  value={updatedCity}
                  onChangeText={setUpdatedCity}
                  placeholder="Enter city"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={updatedState}
                  onChangeText={setUpdatedState}
                  placeholder="Enter state"
                />
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity 
                  style={styles.formCancelButton}
                  onPress={() => {
                    setIsEditing(false);
                    setSelectedImage(null);
                  }}
                >
                  <Text style={styles.formCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveChangesButton, isUpdating && styles.disabledButton]}
                  onPress={handleUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveChangesText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.detailsCard}>
              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>{user?.phone || 'Not Provided'}</Text>
              </View>

              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{user?.email || 'user@example.com'}</Text>
              </View>

              <View style={styles.detailGroup}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>
                  {user?.station?.locationcity || 'Unknown City'}, {user?.station?.locationstate || 'Unknown State'}
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Photo Options Modal - WhatsApp Style */}
      <Modal
        visible={showPhotoOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPhotoOptions(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptions(false)}
        >
          <View style={styles.photoOptionsContainer}>
            <Text style={styles.photoOptionsTitle}>Profile Photo</Text>
            <View style={styles.optionsRow}>
              <TouchableOpacity style={styles.optionItem} onPress={openGallery}>
                <View style={[styles.optionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                  <Icon name="image" size={24} color="#43A047" />
                </View>
                <Text style={styles.optionLabel}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionItem} onPress={() => setShowPhotoOptions(false)}>
                <View style={[styles.optionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                  <Icon name="trash-outline" size={24} color="#D32F2F" />
                </View>
                <Text style={styles.optionLabel}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingBottom: 40,
  },
  profileSection: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
    position: 'relative',
  },
  editButton: {
    position: 'absolute',
    right: 0,
    top: 10,
    padding: 10,
  },
  editText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarBorder: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: '#FF8C42',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 62,
    backgroundColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  changePhotoButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changePhotoText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#333',
    marginBottom: 5,
    textAlign: 'center',
  },
  userSubtitle: {
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
    textAlign: 'center',
  },
  detailsCard: {
    width: '100%',
    backgroundColor: '#F7F8F9',
    borderRadius: 15,
    padding: 24,
    marginTop: 10,
  },
  detailGroup: {
    marginBottom: 20,
  },
  detailLabel: {
    fontSize: 15,
    color: '#888',
    fontWeight: '600',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    color: '#333',
    fontWeight: '700',
  },
  formContainer: {
    width: '100%',
    marginTop: 10,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F6F7',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#EEE',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  formCancelButton: {
    flex: 1,
    backgroundColor: '#6C757D',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  formCancelText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  saveChangesButton: {
    flex: 1.5,
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveChangesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoOptionsContainer: {
    width: width * 0.8,
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },
  photoOptionsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 30,
  },
  optionItem: {
    alignItems: 'center',
  },
  optionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});
