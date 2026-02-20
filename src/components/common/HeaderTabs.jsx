import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// A single Draggable Tab component
const DraggableTab = ({
  tab,
  index,
  isActive,
  onPress,
  onDragStart,
  onDragEnd,
  onMove,
  xOffset,
}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only start dragging if moving horizontally more than vertically
        return Math.abs(gesture.dx) > Math.abs(gesture.dy) && Math.abs(gesture.dx) > 10;
      },
      onPanResponderGrant: () => {
        setIsDragging(true);
        pan.setOffset({ x: pan.x._value, y: 0 });
        pan.setValue({ x: 0, y: 0 });
        onDragStart();
        
        // Quick pop animation
        Animated.spring(scale, {
          toValue: 1.1,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: 0 });
        onMove(index, pan.x._value + gestureState.dx);
      },
      onPanResponderRelease: () => {
        setIsDragging(false);
        pan.flattenOffset();
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
        
        // Snap back to 0 (the new position handles actual layout)
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: true,
        }).start(() => {
          onDragEnd();
        });
      },
      onPanResponderTerminate: () => {
        setIsDragging(false);
        Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        onDragEnd();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.tab,
        isActive && styles.activeTab,
        isDragging && styles.draggingTab,
        {
          transform: [
            { translateX: Animated.add(pan.x, xOffset) },
            { scale }
          ],
          zIndex: isDragging ? 2 : 1,
        }
      ]}
    >
      <Text
        style={[styles.tabText, isActive && styles.activeTabText]}
        numberOfLines={1}
        onPress={isDragging ? null : () => onPress(index)}
      >
        {tab}
      </Text>
    </Animated.View>
  );
};

export default function HeaderTabs({ tabs, activeTab, onTabPress, onReorder }) {
  const [internalTabs, setInternalTabs] = useState(tabs);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  
  // Store the animated positions for all tabs
  const tabPositions = useRef(tabs.map(() => new Animated.Value(0))).current;
  // Approximated tab width for hit detection (can be improved with onLayout tracking)
  const ITEM_WIDTH = 80; 

  // Sync when external tabs change (e.g., initial load)
  useEffect(() => {
    setInternalTabs(tabs);
    // Ensure we have enough position values
    while (tabPositions.length < tabs.length) {
      tabPositions.push(new Animated.Value(0));
    }
  }, [tabs]);

  const handleDragStart = () => {
    setIsScrollEnabled(false);
  };

  const handleMove = (dragIndex, dx) => {
    // Determine if we've moved far enough to swap with neighbors
    const itemsScrolled = Math.round(dx / ITEM_WIDTH);
    const targetIndex = Math.max(0, Math.min(internalTabs.length - 1, dragIndex + itemsScrolled));
    
    if (targetIndex !== dragIndex) {
      // We need to visually shift the items that are being swapped
      // For a full robust impl without libraries, we'd animate `targetIndex` offset.
      // For simplicity in pure JS, we reorder the array on DragEnd.
    }
  };

  const handleDragEnd = (dragIndex, dx) => {
    setIsScrollEnabled(true);
    
    // Calculate new index
    const itemsScrolled = Math.round(dx / ITEM_WIDTH);
    const newIndex = Math.max(0, Math.min(internalTabs.length - 1, dragIndex + itemsScrolled));
    
    if (newIndex !== dragIndex) {
      // Create new array with moved item
      const newTabs = [...internalTabs];
      const [movedItem] = newTabs.splice(dragIndex, 1);
      newTabs.splice(newIndex, 0, movedItem);
      
      setInternalTabs(newTabs);
      
      // Reset all offsets
      tabPositions.forEach(pos => pos.setValue(0));
      
      // Notify parent to save to backend
      if (onReorder) {
        onReorder(newTabs);
      }
    }
  };

  return (
    <View style={styles.outerContainer}>
      <Animated.ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEnabled={isScrollEnabled}
        contentContainerStyle={[styles.scrollContent, { flexDirection: 'row' }]}
        style={styles.container}
      >
        {internalTabs.map((tab, index) => (
          <DraggableTab
            key={tab} // Assume tab names are unique for this simple approach
            tab={tab}
            index={index}
            isActive={tabs[activeTab] === tab} // Check against original array to keep selection
            onPress={() => {
              // Find the original index of this tab name to keep logic consistent
              const origIndex = tabs.findIndex(t => t === tab);
              if (origIndex !== -1) onTabPress(origIndex);
            }}
            onDragStart={handleDragStart}
            onDragEnd={(dx) => handleDragEnd(index, dx)}
            onMove={(idx, dx) => handleMove(index, dx)}
            xOffset={tabPositions[index]}
          />
        ))}
      </Animated.ScrollView>
      <View style={styles.bottomBorder} />
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>Hold and drag to reorder tabs</Text>
      </View>
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
    paddingBottom: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    minWidth: 70,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  activeTab: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  draggingTab: {
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  tabText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  bottomBorder: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  hintContainer: {
    paddingBottom: 6,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  hintText: {
    fontSize: 10,
    color: '#AAAAAA',
    fontStyle: 'italic',
  }
});
