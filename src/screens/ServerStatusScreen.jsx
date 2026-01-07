import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_URL } from '../config';

const ServerStatusScreen = ({ navigation }) => {
  const [testing, setTesting] = useState(false);
  const [serverStatus, setServerStatus] = useState({
    reachable: null,
    health: null,
    inventory: null,
    lastCheck: null,
  });

  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    setTesting(true);
    const status = {
      reachable: null,
      health: null,
      inventory: null,
      lastCheck: new Date().toISOString(),
    };

    try {
      // Test 1: Basic server connectivity
      console.log('Testing basic server connectivity...');
      const basicResponse = await fetch(`${API_URL}/api/test`, {
        method: 'GET',
        timeout: 10000,
      });

      if (basicResponse.ok) {
        const basicData = await basicResponse.json();
        status.reachable = {
          success: true,
          message: `Server running on port ${basicData.port}`,
          data: basicData,
        };
      } else {
        status.reachable = {
          success: false,
          message: `Server responded with status ${basicResponse.status}`,
        };
      }
    } catch (error) {
      console.log('Basic connectivity test failed:', error);
      status.reachable = {
        success: false,
        message: error.message,
      };
    }

    // Test 2: Health check endpoint
    if (status.reachable?.success) {
      try {
        console.log('Testing health endpoint...');
        const healthResponse = await fetch(`${API_URL}/api/health`, {
          method: 'GET',
          timeout: 5000,
        });

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          status.health = {
            success: true,
            message: 'Health check passed',
            data: healthData,
          };
        } else {
          status.health = {
            success: false,
            message: `Health check failed with status ${healthResponse.status}`,
          };
        }
      } catch (error) {
        console.log('Health check failed:', error);
        status.health = {
          success: false,
          message: error.message,
        };
      }

      // Test 3: Inventory API endpoint
      try {
        console.log('Testing inventory endpoint...');
        const inventoryResponse = await fetch(`${API_URL}/api/inventory/test`, {
          method: 'GET',
          timeout: 5000,
        });

        if (inventoryResponse.ok) {
          const inventoryData = await inventoryResponse.json();
          status.inventory = {
            success: true,
            message: 'Inventory API working',
            data: inventoryData,
          };
        } else {
          status.inventory = {
            success: false,
            message: `Inventory API failed with status ${inventoryResponse.status}`,
          };
        }
      } catch (error) {
        console.log('Inventory API test failed:', error);
        status.inventory = {
          success: false,
          message: error.message,
        };
      }
    }

    setServerStatus(status);
    setTesting(false);
  };

  const getStatusIcon = (status) => {
    if (status === null) return { name: 'help', color: '#95a5a6' };
    if (status?.success) return { name: 'check-circle', color: '#27ae60' };
    return { name: 'error', color: '#e74c3c' };
  };

  const StatusCard = ({ title, status, description }) => {
    const icon = getStatusIcon(status);
    
    return (
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Icon name={icon.name} size={24} color={icon.color} />
          <Text style={styles.statusTitle}>{title}</Text>
        </View>
        <Text style={[styles.statusMessage, { color: icon.color }]}>
          {status?.message || description}
        </Text>
        {status?.data && (
          <View style={styles.statusDetails}>
            <Text style={styles.statusDetailsText}>
              {JSON.stringify(status.data, null, 2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const showServerStartInstructions = () => {
    Alert.alert(
      'Start Server',
      `To start the server manually:\n\n1. Open Command Prompt or Terminal\n2. Navigate to: SNOOKHEAD folder\n3. Run: node server.js\n4. Server should start on port 4000\n\nCurrent API URL: ${API_URL}`,
      [
        { text: 'OK' },
        { text: 'Test Again', onPress: testConnection },
      ]
    );
  };

  const navigateToInventory = () => {
    if (serverStatus.inventory?.success) {
      navigation.navigate('Inventory');
    } else {
      Alert.alert(
        'Server Not Ready',
        'Please fix server connection issues before accessing inventory.',
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Server Status</Text>
        <TouchableOpacity onPress={testConnection} disabled={testing}>
          <Icon name="refresh" size={24} color={testing ? '#95a5a6' : '#fff'} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Connection Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Connection Details</Text>
          <Text style={styles.infoText}>API URL: {API_URL}</Text>
          <Text style={styles.infoText}>
            Last Check: {serverStatus.lastCheck ? new Date(serverStatus.lastCheck).toLocaleTimeString() : 'Never'}
          </Text>
        </View>

        {/* Status Tests */}
        <StatusCard
          title="Server Connectivity"
          status={serverStatus.reachable}
          description="Testing if server is running and reachable"
        />

        <StatusCard
          title="Health Check"
          status={serverStatus.health}
          description="Testing server health endpoint"
        />

        <StatusCard
          title="Inventory API"
          status={serverStatus.inventory}
          description="Testing inventory management endpoints"
        />

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.testButton]}
            onPress={testConnection}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="refresh" size={20} color="#fff" />
            )}
            <Text style={styles.actionButtonText}>
              {testing ? 'Testing...' : 'Test Connection'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.helpButton]}
            onPress={showServerStartInstructions}
          >
            <Icon name="help" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Server Help</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.actionButton, 
              serverStatus.inventory?.success ? styles.successButton : styles.disabledButton
            ]}
            onPress={navigateToInventory}
            disabled={!serverStatus.inventory?.success}
          >
            <Icon name="inventory" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Go to Inventory</Text>
          </TouchableOpacity>
        </View>

        {/* Troubleshooting */}
        <View style={styles.troubleshootCard}>
          <Text style={styles.troubleshootTitle}>Troubleshooting</Text>
          <Text style={styles.troubleshootText}>
            • Make sure the server is running: node server.js{'\n'}
            • Check if port 4000 is available{'\n'}
            • Verify network connection{'\n'}
            • Check if database is connected{'\n'}
            • Ensure inventory routes are registered
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#2c3e50',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 8,
  },
  statusMessage: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusDetails: {
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
    padding: 8,
  },
  statusDetailsText: {
    fontSize: 12,
    color: '#7f8c8d',
    fontFamily: 'monospace',
  },
  actionsContainer: {
    marginVertical: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  testButton: {
    backgroundColor: '#3498db',
  },
  helpButton: {
    backgroundColor: '#f39c12',
  },
  successButton: {
    backgroundColor: '#27ae60',
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  troubleshootCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12',
  },
  troubleshootTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  troubleshootText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
});

export default ServerStatusScreen;