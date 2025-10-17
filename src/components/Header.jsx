import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function Header({ navigation }) {
  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Icon name="fish" size={24} color="#1E3A5F" />
        <Text style={styles.logoText}>SNOKEHEAD</Text>
      </View>

      {/* Right side icons */}
      <View style={styles.rightIcons}>
        {/* Notification Bell */}
        <TouchableOpacity style={styles.iconButton}>
          <Icon name="notifications" size={24} color="#FF8C42" />
        </TouchableOpacity>

        {/* Menu Button */}
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => navigation.navigate('Menu')}
        >
          <Icon name="menu" size={28} color="#1E3A5F" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    marginTop: 46,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F',
    marginLeft: 8,
  },
  rightIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
});
