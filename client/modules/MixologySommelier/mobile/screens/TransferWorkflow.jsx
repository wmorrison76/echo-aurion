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
import { Canvas, Path } from "@react-native-canvas/canvas";
import { SyncEngine } from "../services/sync";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

export default function TransferWorkflow({ route }) {
  const { venueId, venues } = route.params || {};
  const canvasRef = useRef(null);
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");
  const [newTransferModal, setNewTransferModal] = useState(false);
  const [signatureModal, setSignatureModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [inventory, setInventory] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [toVenue, setToVenue] = useState("");
  const [reason, setReason] = useState("");
  const [signaturePath, setSignaturePath] = useState("");
  const [syncEngine] = useState(new SyncEngine());

  useEffect(() => {
    initializeScreen();
  }, []);

  async function initializeScreen() {
    try {
      await syncEngine.initialize();
      await loadTransfers();
      await loadInventory();
      setLoading(false);
    } catch (error) {
      Alert.alert("Error", "Failed to initialize transfer screen");
      setLoading(false);
    }
  }

  async function loadTransfers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/transfers`, {
        params: { venue_id: venueId },
      });
      setTransfers(response.data || []);
    } catch (error) {
      console.error("Failed to load transfers:", error);
    }
  }

  async function loadInventory() {
    try {
      const response = await axios.get(`${API_BASE_URL}/liquor-inventory`, {
        params: { venue_id: venueId },
      });
      setInventory(response.data || []);
    } catch (error) {
      console.error("Failed to load inventory:", error);
    }
  }

  async function createTransferRequest() {
    if (!toVenue || selectedItems.length === 0) {
      Alert.alert("Missing", "Select destination venue and items");
      return;
    }

    try {
      const transferData = {
        from_venue_id: venueId,
        to_venue_id: toVenue,
        items: selectedItems.map((item) => ({
          item_id: item.id,
          quantity: item.transfer_quantity,
          unit: item.unit,
        })),
        reason,
        status: "requested",
        created_by: "staff",
      };

      await syncEngine.queueAction(
        "transfer_request",
        `transfer-${Date.now()}`,
        "create",
        transferData
      );

      Alert.alert("Success", "Transfer request created");
      setNewTransferModal(false);
      resetForm();
      loadTransfers();
    } catch (error) {
      Alert.alert("Error", "Failed to create transfer request");
    }
  }

  async function approveTransfer() {
    if (!signaturePath) {
      Alert.alert("Required", "Please sign to approve transfer");
      return;
    }

    try {
      await axios.patch(`${API_BASE_URL}/transfers/${selectedTransfer.id}`, {
        status: "approved",
        signature: signaturePath,
        approved_by: "manager",
        approved_at: new Date().toISOString(),
      });

      Alert.alert("Success", "Transfer approved");
      setSignatureModal(false);
      loadTransfers();
    } catch (error) {
      Alert.alert("Error", "Failed to approve transfer");
    }
  }

  async function receiveTransfer() {
    try {
      const response = await axios.patch(
        `${API_BASE_URL}/transfers/${selectedTransfer.id}/receive`,
        {
          received_by: "staff",
          received_at: new Date().toISOString(),
        }
      );

      if (response.status === 200) {
        Alert.alert("Success", "Transfer received and inventory updated");
        loadTransfers();
        loadInventory();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to receive transfer");
    }
  }

  function resetForm() {
    setSelectedItems([]);
    setToVenue("");
    setReason("");
    setSignaturePath("");
  }

  function toggleItemSelection(item) {
    const existing = selectedItems.find((i) => i.id === item.id);
    if (existing) {
      setSelectedItems(selectedItems.filter((i) => i.id !== item.id));
    } else {
      setSelectedItems([
        ...selectedItems,
        { ...item, transfer_quantity: 1 },
      ]);
    }
  }

  function updateItemQuantity(itemId, quantity) {
    setSelectedItems(
      selectedItems.map((item) =>
        item.id === itemId ? { ...item, transfer_quantity: quantity } : item
      )
    );
  }

  function renderTransferItem({ item }) {
    const statusColor = {
      requested: "#ff9800",
      approved: "#2196f3",
      in_transit: "#9c27b0",
      received: "#4caf50",
      cancelled: "#f44336",
    }[item.status] || "#666";

    return (
      <TouchableOpacity
        style={styles.transferCard}
        onPress={() => setSelectedTransfer(item)}
      >
        <View style={styles.transferHeader}>
          <Text style={styles.transferTitle}>
            {item.from_venue} → {item.to_venue}
          </Text>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor },
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.transferInfo}>
          <Text style={styles.infoLabel}>Items:</Text>
          <Text style={styles.infoValue}>{item.items?.length || 0}</Text>
        </View>

        <View style={styles.transferInfo}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>

        {item.reason && (
          <View style={styles.transferInfo}>
            <Text style={styles.infoLabel}>Reason:</Text>
            <Text style={styles.infoValue}>{item.reason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  const requestTransfers = transfers.filter((t) => t.status === "requested");
  const approvedTransfers = transfers.filter((t) => t.status === "approved");
  const receivedTransfers = transfers.filter((t) => t.status === "received");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Transfer Workflow</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => setNewTransferModal(true)}
        >
          <Text style={styles.newButtonText}>+ New Transfer</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "requests" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("requests")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "requests" && styles.activeTabText,
            ]}
          >
            Requests ({requestTransfers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "approved" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("approved")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "approved" && styles.activeTabText,
            ]}
          >
            Approved ({approvedTransfers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            activeTab === "received" && styles.activeTab,
          ]}
          onPress={() => setActiveTab("received")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "received" && styles.activeTabText,
            ]}
          >
            Received ({receivedTransfers.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={
          activeTab === "requests"
            ? requestTransfers
            : activeTab === "approved"
            ? approvedTransfers
            : receivedTransfers
        }
        keyExtractor={(item) => item.id}
        renderItem={renderTransferItem}
        contentContainerStyle={styles.list}
        ListEmptyMessage={
          <Text style={styles.emptyText}>No transfers in this category</Text>
        }
      />

      {selectedTransfer && (
        <View style={styles.detailsPanel}>
          <TouchableOpacity onPress={() => setSelectedTransfer(null)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>

          <ScrollView style={styles.details}>
            <Text style={styles.detailsTitle}>Transfer Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>From:</Text>
              <Text style={styles.detailValue}>{selectedTransfer.from_venue}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>To:</Text>
              <Text style={styles.detailValue}>{selectedTransfer.to_venue}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{selectedTransfer.status}</Text>
            </View>

            {selectedTransfer.items && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Items</Text>
                {selectedTransfer.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemQty}>
                      {item.quantity} {item.unit}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {selectedTransfer.status === "approved" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={receiveTransfer}
              >
                <Text style={styles.actionButtonText}>✓ Mark as Received</Text>
              </TouchableOpacity>
            )}

            {selectedTransfer.status === "requested" && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => setSignatureModal(true)}
              >
                <Text style={styles.actionButtonText}>
                  ✓ Approve Transfer
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      )}

      <Modal visible={newTransferModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setNewTransferModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Transfer Request</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Destination Venue</Text>
              <FlatList
                data={venues || []}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.venueOption,
                      toVenue === item.id && styles.selectedVenue,
                    ]}
                    onPress={() => setToVenue(item.id)}
                  >
                    <Text style={styles.venueName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Items</Text>
              <FlatList
                data={inventory}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const selected = selectedItems.find((i) => i.id === item.id);
                  return (
                    <View
                      style={[
                        styles.itemOption,
                        selected && styles.selectedItem,
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.itemSelectButton}
                        onPress={() => toggleItemSelection(item)}
                      >
                        <Text style={styles.checkbox}>
                          {selected ? "☑" : "☐"}
                        </Text>
                      </TouchableOpacity>

                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemSKU}>SKU: {item.sku}</Text>
                      </View>

                      {selected && (
                        <TextInput
                          style={styles.qtyInput}
                          value={String(selected.transfer_quantity)}
                          onChangeText={(text) =>
                            updateItemQuantity(item.id, parseFloat(text) || 0)
                          }
                          keyboardType="decimal-pad"
                          placeholder="Qty"
                        />
                      )}
                    </View>
                  );
                }}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Reason</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Why are you transferring these items?"
                value={reason}
                onChangeText={setReason}
                multiline
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={createTransferRequest}
            >
              <Text style={styles.submitButtonText}>Create Request</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={signatureModal} animationType="slide">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setSignatureModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Digital Signature</Text>
            <TouchableOpacity onPress={() => setSignaturePath("")}>
              <Text style={styles.clearButton}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.signaturePad}>
            <Text style={styles.signatureText}>Sign below to approve</Text>
            <View
              style={styles.canvas}
              onLayout={(event) => {
                const { x, y, width, height } = event.nativeEvent.layout;
              }}
            />
            <Text style={styles.signatureHint}>Use your finger to sign</Text>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={approveTransfer}
          >
            <Text style={styles.submitButtonText}>Approve Transfer</Text>
          </TouchableOpacity>
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
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  newButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  newButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: "#8B0000",
  },
  tabText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  activeTabText: {
    color: "#8B0000",
    fontWeight: "600",
  },
  list: {
    padding: 12,
  },
  transferCard: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  transferHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transferTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  transferInfo: {
    flexDirection: "row",
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  infoValue: {
    fontSize: 12,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    marginTop: 40,
    fontSize: 14,
  },
  detailsPanel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  closeButton: {
    fontSize: 24,
    color: "#666",
  },
  details: {
    flex: 1,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "600",
  },
  section: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 13,
    color: "#1a1a1a",
  },
  itemQty: {
    fontSize: 13,
    color: "#8B0000",
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 12,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
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
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  clearButton: {
    color: "#8B0000",
    fontSize: 14,
    fontWeight: "600",
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  venueOption: {
    backgroundColor: "#f5f5f5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedVenue: {
    backgroundColor: "#8B0000",
    borderColor: "#8B0000",
  },
  venueName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  itemOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  selectedItem: {
    borderColor: "#8B0000",
    borderWidth: 2,
  },
  itemSelectButton: {
    marginRight: 12,
  },
  checkbox: {
    fontSize: 18,
    color: "#8B0000",
  },
  itemDetails: {
    flex: 1,
  },
  itemSKU: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  qtyInput: {
    width: 50,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
  },
  reasonInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    fontSize: 14,
    textAlignVertical: "top",
  },
  submitButton: {
    backgroundColor: "#8B0000",
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
    marginBottom: 20,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  signaturePad: {
    flex: 1,
    padding: 16,
    justifyContent: "space-around",
  },
  signatureText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 8,
  },
  canvas: {
    flex: 1,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#ddd",
    borderRadius: 8,
    marginVertical: 12,
  },
  signatureHint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
  },
});
