import React from 'react';
import { XCircle, ChevronLeft, RefreshCw, Users, AlertCircle, PlusCircle } from 'lucide-react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';

export default function QueueListView({
  queueData,
  loading,
  error,
  refreshing,
  onRefresh,
  onAddPress,
  onRemovePress,
  navigation,
}) {
  const renderQueueItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.queueItem}
      onLongPress={() => onRemovePress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.queueNumberCircle}>
        <Text style={styles.queueNumber}>{index + 1}</Text>
      </View>
      <View style={styles.queueInfo}>
        <Text style={styles.queueName}>{item.customer_name || item.name}</Text>
        <Text style={styles.queuePhone}>
          {item.customer_phone || item.phone || 'No phone'}
        </Text>
      </View>
      <View style={styles.queueStatus}>
        <View style={[styles.statusBadge, styles.statusWaiting]}>
          <Text style={styles.statusText}>
            {item.status === 'waiting' ? 'Waiting' : 'Active'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => onRemovePress(item)}
      >
        <XCircle size={22} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Queue Management</Text>
        <TouchableOpacity
          style={styles.headerRefreshButton}
          onPress={onRefresh}
          activeOpacity={0.7}
        >
          <RefreshCw size={22} color="#FF8C42" />
        </TouchableOpacity>
      </View>

      {/* Queue Count */}
      <View style={styles.countContainer}>
        <View style={styles.countBadge}>
          <Users size={18} color="#FF8C42" />
          <Text style={styles.countText}>{queueData.length} in queue</Text>
        </View>
        <Text style={styles.hintText}>Long press to remove</Text>
      </View>

      {/* Queue List */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.centerContainer}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="large" color="#FF8C42" />
            </View>
            <Text style={styles.loadingText}>Loading queue...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={48} color="#D32F2F" />
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={onRefresh}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : queueData.length === 0 ? (
          <View style={styles.centerContainer}>
            <View style={styles.emptyIcon}>
              <Users size={48} color="#FF8C42" />
            </View>
            <Text style={styles.emptyText}>Queue is Empty</Text>
            <Text style={styles.emptySubText}>
              Add customers to the waiting queue
            </Text>
          </View>
        ) : (
          <FlatList
            data={queueData}
            keyExtractor={item =>
              item.id?.toString() || Math.random().toString()
            }
            renderItem={renderQueueItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        )}
      </View>

      {/* Add Queue Button */}
      <View style={styles.buttonContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.addButton}
          onPress={onAddPress}
          activeOpacity={0.7}
        >
          <PlusCircle
            size={22}
            color="#FFFFFF"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.addButtonText}>Add to Queue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: 0.3,
  },
  headerRefreshButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Count Badge
  countContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  countText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF8C42',
    marginLeft: 6,
  },
  hintText: {
    fontSize: 11,
    color: '#999999',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },

  // Queue Item
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  queueNumberCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  queueNumber: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  queuePhone: {
    fontSize: 12,
    color: '#888888',
  },
  queueStatus: {
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusWaiting: {
    backgroundColor: '#FFF8E1',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666666',
  },
  removeButton: {
    padding: 4,
  },

  // Center States
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#666666',
    fontWeight: '500',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#FF8C42',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '700',
  },
  emptySubText: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
  },

  // Button Container
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#F8F9FA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    elevation: 10,
    zIndex: 10,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#FF8C42',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
