import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';

export default function HeaderTabs({ tabs, activeTab, onTabPress }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      {tabs.map((tab, index) => (
        <TouchableOpacity
          key={index}
          onPress={() => onTabPress(index)}
          style={[
            styles.tab,
            activeTab === index && styles.activeTab, // Add underline if active
          ]}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === index && styles.activeTabText, // Bold if active
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffffff',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  tab: {
    marginRight: 24,
    paddingBottom: 8,
    marginBottom: -17,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C42', // Orange underline
    marginBottom: -15,
  },
  tabText: {
    fontSize: 16,
    color: '#888',
  },
  activeTabText: {
    color: '#1E3A5F',
    fontWeight: 'bold',
  },
});
