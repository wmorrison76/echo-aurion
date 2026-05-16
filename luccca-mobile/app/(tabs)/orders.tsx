/**
 * React Native Orders Screen
 * Supply and work order management on mobile
 * Week 11 Implementation
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '@/context/AuthContext';

interface Order {
  id: string;
  type: 'supply' | 'work';
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  estimatedCost?: number;
  items?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    unitPrice?: number;
  }>;
}

export default function OrdersScreen() {
  const { state: authState } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'supply' | 'work'>('supply');
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrder, setNewOrder] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
  });
  const [error, setError] = useState<string | null>(null);

  // Fetch orders
  useEffect(() => {
    if (!authState.userToken) return;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://api.luccca.app/api/orders?type=${activeTab}`,
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        setOrders(data.orders || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load orders';
        setError(message);
        console.error('[ORDERS] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [activeTab, authState.userToken]);

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter(
        (order) =>
          order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          order.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedStatus) {
      filtered = filtered.filter((order) => order.status === selectedStatus);
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, selectedStatus]);

  const handleCreateOrder = async () => {
    if (!newOrder.title.trim() || !authState.userToken) return;

    try {
      const response = await fetch('https://api.luccca.app/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.userToken}`,
        },
        body: JSON.stringify({
          ...newOrder,
          type: activeTab,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');

      const order = await response.json();
      setOrders([order, ...orders]);
      setShowCreateModal(false);
      setNewOrder({
        title: '',
        description: '',
        priority: 'medium',
      });
      Alert.alert('Success', 'Order created successfully');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create order';
      Alert.alert('Error', message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#fbbf24';
      case 'approved':
        return '#3b82f6';
      case 'in_progress':
        return '#a78bfa';
      case 'completed':
        return '#10b981';
      case 'rejected':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#6b7280';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderTitle}>{item.title}</Text>
          <Text style={styles.orderType}>{item.type} order</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.orderDescription} numberOfLines={2}>
          {item.description}
        </Text>
      )}

      <View style={styles.orderMeta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="calendar" size={14} color="#6b7280" />
          <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
        </View>

        <View style={[styles.priorityBadge, { borderColor: getPriorityColor(item.priority) }]}>
          <Text style={[styles.priorityText, { color: getPriorityColor(item.priority) }]}>
            {item.priority}
          </Text>
        </View>

        {item.estimatedCost && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="cash" size={14} color="#6b7280" />
            <Text style={styles.metaText}>${item.estimatedCost.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.itemsSection}>
          <Text style={styles.itemsLabel}>Items ({item.items.length})</Text>
          {item.items.slice(0, 2).map((itemEntry) => (
            <Text key={itemEntry.id} style={styles.itemText}>
              • {itemEntry.name} × {itemEntry.quantity} {itemEntry.unit}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} more</Text>
          )}
        </View>
      )}

      <View style={styles.orderActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        {item.status === 'pending' && (
          <TouchableOpacity style={[styles.actionButton, styles.editButton]}>
            <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Orders</Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <MaterialCommunityIcons name="plus" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'supply' && styles.tabActive]}
            onPress={() => setActiveTab('supply')}
          >
            <MaterialCommunityIcons
              name="package"
              size={16}
              color={activeTab === 'supply' ? '#1e3a8a' : '#9ca3af'}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'supply' && styles.tabTextActive,
              ]}
            >
              Supply
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'work' && styles.tabActive]}
            onPress={() => setActiveTab('work')}
          >
            <MaterialCommunityIcons
              name="hammer"
              size={16}
              color={activeTab === 'work' ? '#1e3a8a' : '#9ca3af'}
            />
            <Text
              style={[styles.tabText, activeTab === 'work' && styles.tabTextActive]}
            >
              Work
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <MaterialCommunityIcons name="magnify" size={18} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, selectedStatus && styles.filterButtonActive]}
          onPress={() => setSelectedStatus(selectedStatus ? null : 'pending')}
        >
          <MaterialCommunityIcons name="filter" size={18} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {error && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="package-outline" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>
            {searchQuery ? 'No orders found' : 'No orders yet'}
          </Text>
          <Text style={styles.emptySubtext}>
            {searchQuery ? 'Try a different search' : 'Create your first order'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}

      {/* Create Order Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create {activeTab} Order</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalForm}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Order Title</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g., Chicken order"
                  value={newOrder.title}
                  onChangeText={(text) =>
                    setNewOrder({ ...newOrder, title: text })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
                <TextInput
                  style={[styles.formInput, styles.formTextarea]}
                  placeholder="Order details..."
                  value={newOrder.description}
                  onChangeText={(text) =>
                    setNewOrder({ ...newOrder, description: text })
                  }
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Priority</Text>
                <View style={styles.priorityOptions}>
                  {(['low', 'medium', 'high'] as const).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityOption,
                        newOrder.priority === priority &&
                          styles.priorityOptionActive,
                      ]}
                      onPress={() =>
                        setNewOrder({ ...newOrder, priority })
                      }
                    >
                      <Text
                        style={[
                          styles.priorityOptionText,
                          newOrder.priority === priority &&
                            styles.priorityOptionTextActive,
                        ]}
                      >
                        {priority}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    !newOrder.title.trim() && styles.submitButtonDisabled,
                  ]}
                  onPress={handleCreateOrder}
                  disabled={!newOrder.title.trim()}
                >
                  <Text style={styles.submitButtonText}>Create Order</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 2,
    gap: 6,
  },
  tabActive: {
    borderBottomColor: '#1e3a8a',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9ca3af',
  },
  tabTextActive: {
    color: '#1e3a8a',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    gap: 8,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    height: 36,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#1e3a8a',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderColor: '#fecaca',
    borderWidth: 1,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  orderInfo: {
    flex: 1,
  },
  orderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  orderType: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  orderDescription: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
  },
  orderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  itemsSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
  },
  itemsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  itemText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 11,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  orderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  editButtonText: {
    color: '#374151',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000aa',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  modalForm: {
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  formTextarea: {
    paddingVertical: 12,
    textAlignVertical: 'top',
  },
  priorityOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    alignItems: 'center',
  },
  priorityOptionActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a',
  },
  priorityOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    textTransform: 'capitalize',
  },
  priorityOptionTextActive: {
    color: '#ffffff',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderColor: '#e5e7eb',
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1e3a8a',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});
