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
    <View style={styles.outerContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { flexDirection: 'row' }]}
        style={styles.container}
        decelerationRate="fast"
        snapToAlignment="start"
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onTabPress(index)}
            activeOpacity={0.7}
            style={[styles.tab, activeTab === index && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}
              numberOfLines={1}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.bottomBorder} />
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  container: {
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'transparent',
    minWidth: 60,
  },
  activeTab: {
    backgroundColor: '#FF8C42',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomBorder: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});
