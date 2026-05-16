import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { SyncEngine } from "../services/sync";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

export default function InventoryCount({ route }) {
  const { venueId } = route.params || {};
  const [permission, requestPermission] = useCameraPermissions();
  const [inventory, setInventory] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [photoModal, setPhotoModal] = useState(false);
  const [notesModal, setNotesModal] = useState(false);
  const [currentNotes, setCurrentNotes] = useState("");
  const [currentPhoto, setCurrentPhoto] = useState(null);
  const [syncEngine] = useState(new SyncEngine());
  const cameraRef = useRef(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  async function initializeScreen() {
    try {
      await syncEngine.initialize();
      await loadInventory();
      setLoading(false);
    } catch (error) {
      Alert.alert("Error", "Failed to initialize inventory screen");
      setLoading(false);
    }
  }

  async function loadInventory() {
    try {
      const response = await axios.get(`${API_BASE_URL}/liquor-inventory`, {
        params: { venue_id: venueId },
      });

      const items = response.data || [];
      setInventory(items);

      const localInventory = await syncEngine.getLocalInventory(venueId);
      await syncEngine.saveInventoryLocally(items);

      const countsMap = {};
      items.forEach((item) => {
        countsMap[item.id] = { quantity: 0, photo: null, notes: "" };
      });
      setCounts(countsMap);
    } catch (error) {
      console.error("Failed to load inventory:", error);
      const localInventory = await syncEngine.getLocalInventory(venueId);
      setInventory(localInventory);
    }
  }

  async function handleBarcodeScan(data) {
    const barcode = data.data;
    setScannedBarcode(barcode);
    setScanning(false);

    const foundItem = inventory.find(
      (item) => item.sku === barcode || item.id === barcode
    );
    if (foundItem) {
      setSelectedItem(foundItem);
    } else {
      Alert.alert("Not Found", `Barcode ${barcode} not found in inventory`);
    }
  }

  async function recordCount() {
    if (!selectedItem || !counts[selectedItem.id]?.quantity) {
      Alert.alert("Missing", "Please enter a quantity");
      return;
    }

    const countData = counts[selectedItem.id];

    try {
      await syncEngine.addCount(
        venueId,
        selectedItem.id,
        countData.quantity,
        "staff",
        countData.photo,
        countData.notes
      );

      Alert.alert(
        "Success",
        `Recorded ${countData.quantity} ${selectedItem.unit} of ${selectedItem.name}`
      );

      setCounts({
        ...counts,
        [selectedItem.id]: { quantity: 0, photo: null, notes: "" },
      });
      setSelectedItem(null);
      setCurrentNotes("");
      setCurrentPhoto(null);
    } catch (error) {
      Alert.alert("Error", "Failed to record count");
    }
  }

  async function takePhoto() {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && selectedItem) {
        const photoUri = result.assets[0].uri;
        setCurrentPhoto(photoUri);
        setCounts({
          ...counts,
          [selectedItem.id]: { ...counts[selectedItem.id], photo: photoUri },
        });
        setPhotoModal(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  }

  async function saveNotes() {
    if (selectedItem) {
      setCounts({
        ...counts,
        [selectedItem.id]: { ...counts[selectedItem.id], notes: currentNotes },
      });
      setNotesModal(false);
    }
  }

  async function syncCounts() {
    Alert.alert("Syncing", "Uploading counts to server...");
    try {
      const result = await syncEngine.syncPendingChanges();
      Alert.alert(
        "Sync Complete",
        `Synced ${result.synced} items. Failed: ${result.failed}`
      );
    } catch (error) {
      Alert.alert("Sync Failed", "Could not sync counts");
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Count</Text>
        <Text style={styles.subtitle}>
          {Object.values(counts).filter((c) => c.quantity > 0).length} items
          counted
        </Text>
      </View>

      {!selectedItem ? (
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => setScanning(!scanning)}
          >
            <Text style={styles.scanButtonText}>
              {scanning ? "Stop Scanning" : "Scan Barcode"}
            </Text>
          </TouchableOpacity>

          {scanning && permission?.granted && (
            <View style={styles.cameraContainer}>
              <CameraView
                ref={cameraRef}
                style={styles.camera}
                onBarcodeScanned={handleBarcodeScan}
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "ean13",
                    "ean8",
                    "code128",
                    "upca",
                    "code39",
                  ],
                }}
              />
            </View>
          )}

          <View style={styles.manualSection}>
            <Text style={styles.sectionTitle}>Or Search Manually</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by item name..."
              onChangeText={(text) => {
                if (text.length > 0) {
                  const found = inventory.find(
                    (item) =>
                      item.name.toLowerCase().includes(text.toLowerCase()) ||
                      item.sku === text
                  );
                  if (found) setSelectedItem(found);
                }
              }}
            />
          </View>

          <FlatList
            data={inventory.filter((item) => counts[item.id]?.quantity > 0)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.countedItem}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemSKU}>SKU: {item.sku}</Text>
                </View>
                <View style={styles.countValue}>
                  <Text style={styles.quantity}>
                    {counts[item.id]?.quantity}
                  </Text>
                  <Text style={styles.unit}>{item.unit}</Text>
                </View>
              </View>
            )}
            ListEmptyMessage={
              <Text style={styles.emptyText}>No items counted yet</Text>
            }
          />

          <TouchableOpacity style={styles.syncButton} onPress={syncCounts}>
            <Text style={styles.syncButtonText}>Sync All Counts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.selectedItemView}>
          <View style={styles.selectedHeader}>
            <TouchableOpacity onPress={() => setSelectedItem(null)}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.selectedName}>{selectedItem.name}</Text>
          </View>

          <ScrollView style={styles.details}>
            <View style={styles.infoRow}>
              <Text style={styles.label}>SKU:</Text>
              <Text style={styles.value}>{selectedItem.sku}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Current Stock:</Text>
              <Text style={styles.value}>
                {selectedItem.quantity} {selectedItem.unit}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Cost:</Text>
              <Text style={styles.value}>${selectedItem.cost_price}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Retail:</Text>
              <Text style={styles.value}>${selectedItem.retail_price}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actual Count</Text>
              <View style={styles.quantityInput}>
                <TouchableOpacity
                  onPress={() => {
                    const current = counts[selectedItem.id]?.quantity || 0;
                    setCounts({
                      ...counts,
                      [selectedItem.id]: {
                        ...counts[selectedItem.id],
                        quantity: Math.max(0, current - 1),
                      },
                    });
                  }}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.quantityField}
                  value={String(counts[selectedItem.id]?.quantity || "")}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setCounts({
                      ...counts,
                      [selectedItem.id]: {
                        ...counts[selectedItem.id],
                        quantity: num,
                      },
                    });
                  }}
                  keyboardType="decimal-pad"
                  placeholder="0"
                />

                <TouchableOpacity
                  onPress={() => {
                    const current = counts[selectedItem.id]?.quantity || 0;
                    setCounts({
                      ...counts,
                      [selectedItem.id]: {
                        ...counts[selectedItem.id],
                        quantity: current + 1,
                      },
                    });
                  }}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {currentPhoto && (
              <View style={styles.photoPreview}>
                <Text style={styles.sectionTitle}>Photo Attached</Text>
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoCheckmark}>✓</Text>
                  <Text style={styles.photoText}>Photo recorded</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setPhotoModal(true)}
            >
              <Text style={styles.actionButtonText}>📷 Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setNotesModal(true)}
            >
              <Text style={styles.actionButtonText}>📝 Add Notes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={recordCount}
            >
              <Text style={styles.saveButtonText}>Save Count</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      <Modal visible={photoModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setPhotoModal(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Take Photo</Text>
            <View style={{ width: 60 }} />
          </View>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={takePhoto}
          >
            <Text style={styles.photoButtonText}>📷 Take Photo</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      <Modal visible={notesModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNotesModal(false)}>
              <Text style={styles.closeButton}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Notes</Text>
            <View style={{ width: 60 }} />
          </View>
          <View style={styles.notesContainer}>
            <TextInput
              style={styles.notesInput}
              placeholder="Add any notes about this count..."
              multiline
              numberOfLines={6}
              value={currentNotes}
              onChangeText={setCurrentNotes}
            />
            <TouchableOpacity style={styles.saveButton} onPress={saveNotes}>
              <Text style={styles.saveButtonText}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scanButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  scanButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  cameraContainer: {
    height: 300,
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  manualSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  searchInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
  },
  countedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  itemSKU: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  countValue: {
    alignItems: "flex-end",
  },
  quantity: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8B0000",
  },
  unit: {
    fontSize: 12,
    color: "#666",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 14,
  },
  syncButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  selectedItemView: {
    flex: 1,
  },
  selectedHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  backButton: {
    fontSize: 16,
    color: "#8B0000",
    fontWeight: "600",
  },
  selectedName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginLeft: 16,
  },
  details: {
    flex: 1,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  section: {
    marginTop: 16,
  },
  quantityInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    overflow: "hidden",
  },
  quantityButton: {
    width: 50,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f5f5",
  },
  quantityButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#8B0000",
  },
  quantityField: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    color: "#1a1a1a",
    paddingVertical: 12,
  },
  photoPreview: {
    marginTop: 16,
  },
  photoPlaceholder: {
    backgroundColor: "#e8f5e9",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  photoCheckmark: {
    fontSize: 32,
    color: "#4caf50",
  },
  photoText: {
    fontSize: 14,
    color: "#4caf50",
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: "#f5f5f5",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  modal: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  closeButton: {
    fontSize: 16,
    color: "#8B0000",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  photoButton: {
    backgroundColor: "#8B0000",
    margin: 16,
    paddingVertical: 14,
    borderRadius: 8,
  },
  photoButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  notesContainer: {
    flex: 1,
    padding: 16,
  },
  notesInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
    marginBottom: 16,
  },
});
