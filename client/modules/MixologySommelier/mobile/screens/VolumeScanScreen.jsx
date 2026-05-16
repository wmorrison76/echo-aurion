/**
 * Volume Scan Screen
 * Main screen for bottle volume scanning with inventory integration
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import VolumeScanner from '../components/VolumeScanner';
import { useInventoryStore } from '../stores/inventoryStore';
import { VolumeDetectionService } from '../services/VolumeDetectionService';
import { SyncService } from '../services/sync';

export default function VolumeScanScreen({ route, navigation }) {
  const { venueId, location } = route.params || {};
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentScans, setRecentScans] = useState([]);
  const { updateItem, syncWithServer } = useInventoryStore();

  useEffect(() => {
    loadInventory();
    loadRecentScans();
  }, []);

  const loadInventory = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_BASE_URL}/liquor-inventory`,
        { params: { venueId } }
      );
      setInventory(response.data || []);
    } catch (error) {
      Alert.alert('Error', 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  const loadRecentScans = async () => {
    // Load recent scans from local storage
    const scans = await AsyncStorage.getItem('recentScans');
    if (scans) {
      setRecentScans(JSON.parse(scans).slice(0, 10));
    }
  };

  const handleScanComplete = async (result) => {
    if (!result.success) {
      Alert.alert('Scan Failed', result.error);
      return;
    }

    try {
      // Update inventory item
      await updateItem(result.itemId, {
        volumePercent: result.volumePercent,
        lastScanned: new Date().toISOString(),
        scanImage: result.imageUri,
        scanConfidence: result.confidence,
      });

      // Add to recent scans
      const newScans = [
        {
          ...result,
          timestamp: new Date().toISOString(),
        },
        ...recentScans,
      ].slice(0, 10);
      setRecentScans(newScans);
      await AsyncStorage.setItem('recentScans', JSON.stringify(newScans));

      // Queue sync
      await SyncService.queueSync({
        type: 'inventory_update',
        itemId: result.itemId,
        data: {
          volumePercent: result.volumePercent,
          lastScanned: new Date().toISOString(),
        },
      });

      Alert.alert('Success', `Updated ${result.itemName} to ${result.volumePercent.toFixed(1)}%`);
    } catch (error) {
      Alert.alert('Error', 'Failed to update inventory');
    }
  };

  const renderInventoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.inventoryCard}
      onPress={() => navigation.navigate('ItemDetails', { item })}
    >
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemType}>{item.spirit_type}</Text>
      </View>
      <View style={styles.volumeInfo}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${item.volumePercent || 0}%` },
            ]}
          />
        </View>
        <Text style={styles.volumeText}>
          {item.volumePercent?.toFixed(0) || 0}%
        </Text>
      </View>
      <Text style={styles.itemValue}>${item.estimatedValue?.toFixed(2) || '0.00'}</Text>
    </TouchableOpacity>
  );

  const renderRecentScan = ({ item }) => (
    <TouchableOpacity style={styles.scanCard}>
      <Text style={styles.scanItemName}>{item.itemName}</Text>
      <Text style={styles.scanVolume}>
        {item.volumePercent?.toFixed(1)}% • {Math.round((item.confidence || 0) * 100)}% confidence
      </Text>
      <Text style={styles.scanTime}>
        {new Date(item.timestamp).toLocaleTimeString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Volume Scanner</Text>
        <Text style={styles.subtitle}>
          Scan bottles to update inventory automatically
        </Text>
      </View>

      <View style={styles.scannerSection}>
        <VolumeScanner
          onScanComplete={handleScanComplete}
          mode="bottle"
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Recent Scans</Text>
        {recentScans.length > 0 ? (
          <FlatList
            data={recentScans}
            renderItem={renderRecentScan}
            keyExtractor={(item, index) => `scan-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
          />
        ) : (
          <Text style={styles.emptyText}>No recent scans</Text>
        )}

        <Text style={styles.sectionTitle}>Bottle Inventory</Text>
        <FlatList
          data={inventory}
          renderItem={renderInventoryItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.row}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scannerSection: {
    height: 300,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
    marginTop: 8,
  },
  inventoryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    margin: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  itemHeader: {
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  itemType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  volumeInfo: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8B0000',
  },
  volumeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B0000',
  },
  itemValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  row: {
    justifyContent: 'space-between',
  },
  scanCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  scanItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  scanVolume: {
    fontSize: 12,
    color: '#8B0000',
    marginBottom: 4,
  },
  scanTime: {
    fontSize: 10,
    color: '#999',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
});
