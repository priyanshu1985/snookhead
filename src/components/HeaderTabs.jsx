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
        contentContainerStyle={styles.scrollContent}
        style={styles.container}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => onTabPress(index)}
            activeOpacity={0.7}
            style={[
              styles.tab,
              activeTab === index && styles.activeTab,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
            {activeTab === index && <View style={styles.activeIndicator} />}
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
    paddingTop: 16,
    paddingBottom: 0,
  },
  tab: {
    marginRight: 28,
    paddingBottom: 14,
    position: 'relative',
  },
  activeTab: {
    // Active state handled by indicator
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#FF8C42',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tabText: {
    fontSize: 15,
    color: '#999999',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  activeTabText: {
    color: '#1A1A1A',
    fontWeight: '700',
  },
  bottomBorder: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
});
