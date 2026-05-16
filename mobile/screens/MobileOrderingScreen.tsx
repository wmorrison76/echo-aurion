/**
 * Mobile Ordering Screen
 * Manage supply and work orders on mobile devices
 * Weeks 8-9 Implementation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EchoAiUsageBanner from '@/components/ai/EchoAiUsageBanner';
import {
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Search,
  Sparkles,
  Barcode,
  Mic,
  Wifi,
  ChevronRight,
  Building2,
} from 'lucide-react';

interface Order {
  id: string;
  type: 'supply' | 'work';
  title: string;
  description?: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  dueDate?: string;
  assignedTo?: string;
  items?: OrderItem[];
  quantity?: number;
  estimatedCost?: number;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
}

interface MobileOrderingScreenProps {
  employeeId?: string;
  onOrderCreate?: (order: Order) => void;
}

export const MobileOrderingScreen: React.FC<MobileOrderingScreenProps> = ({
  employeeId = 'default-employee',
  onOrderCreate,
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('supply');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newOrder, setNewOrder] = useState({
    title: '',
    description: '',
    type: 'supply' as const,
    priority: 'medium' as const,
  });
  const [activeOutlet, setActiveOutlet] = useState(() => {
    const profiles = JSON.parse(localStorage.getItem('outlet.profiles') || '[]');
    const defaultId = localStorage.getItem('outlet.defaultId');
    const match = profiles.find((p: { id: string }) => p.id === defaultId);
    return match?.name || profiles[0]?.name || 'Main Kitchen';
  });

  const echoChecklist = [
    'Confirm outlet and role before submitting',
    'Review vendor pricing changes',
    'Check low-stock alerts before reorder',
    'Validate transfer requests for priority items',
    'Confirm waste reason tags on daily log',
  ];

  const pairedDevices = JSON.parse(
    localStorage.getItem('quickSync.pairedDevices') || '[]'
  );

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/orders?employeeId=${employeeId}&type=${activeTab}`
        );

        if (!response.ok) throw new Error('Failed to fetch orders');

        const data = await response.json();
        setOrders(data.orders || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders');
        console.error('[MOBILE-ORDERING] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [activeTab, employeeId]);

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    if (searchQuery) {
      filtered = filtered.filter((order) =>
        order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter((order) => order.status === filterStatus);
    }

    setFilteredOrders(filtered);
  }, [orders, searchQuery, filterStatus]);

  // Handle create order
  const handleCreateOrder = async () => {
    if (!newOrder.title.trim()) {
      setError('Order title is required');
      return;
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newOrder,
          employeeId,
          createdAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) throw new Error('Failed to create order');

      const order = await response.json();
      setOrders([order, ...orders]);
      setSuccess('Order created successfully');
      setShowCreateDialog(false);
      setNewOrder({
        title: '',
        description: '',
        type: 'supply',
        priority: 'medium',
      });

      if (onOrderCreate) {
        onOrderCreate(order);
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-gray-600';
      case 'medium':
        return 'text-yellow-600';
      case 'high':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-slate-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-slate-200/70 shadow-sm">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Ordering</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                <Building2 className="h-3.5 w-3.5" />
                <span>{activeOutlet}</span>
                <Badge variant="outline" className="bg-white">
                  {pairedDevices.length} device
                  {pairedDevices.length === 1 ? '' : 's'} paired
                </Badge>
                <div className="flex items-center gap-1">
                  <Wifi className="h-3.5 w-3.5" />
                  Sync ready
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center shadow-sm"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>

          <EchoAiUsageBanner
            storageKey="echoai.banner.mobile-ordering"
            checklist={echoChecklist}
            contextLabel="Tap to review critical checks before ordering."
          />

          {/* Search */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-gray-50 border-gray-300"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-3"
              onClick={() => setFilterStatus(filterStatus ? null : 'pending')}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start rounded-full bg-slate-100 p-1 h-auto">
            <TabsTrigger
              value="supply"
              className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs"
            >
              Supply Orders
            </TabsTrigger>
            <TabsTrigger
              value="work"
              className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm px-4 py-2 text-xs"
            >
              Work Orders
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="m-4 bg-green-50 text-green-800 border-green-300">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Orders List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <Card className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
                <p className="text-xs text-slate-500">
                  Apple-style shortcuts for speed.
                </p>
              </div>
              <Sparkles className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button variant="outline" className="rounded-2xl text-xs">
                <Barcode className="mr-1 h-4 w-4" />
                Scan
              </Button>
              <Button variant="outline" className="rounded-2xl text-xs">
                <Mic className="mr-1 h-4 w-4" />
                Voice
              </Button>
              <Button variant="outline" className="rounded-2xl text-xs">
                Templates
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>

        {filteredOrders.length === 0 ? (
          <Card className="p-6 text-center rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">
              {searchQuery ? 'No orders found' : 'No orders yet'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {searchQuery
                ? 'Try a different search'
                : 'Create your first order to get started'}
            </p>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card
              key={order.id}
              className="p-4 hover:shadow-md transition-shadow border border-slate-200/70 rounded-2xl bg-white/90 backdrop-blur"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{order.title}</h3>
                  {order.description && (
                    <p className="text-sm text-gray-600 mt-1">{order.description}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                {order.dueDate && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span>Due {formatDate(order.dueDate)}</span>
                  </div>
                )}
                <span className={`font-medium capitalize ${getPriorityColor(order.priority)}`}>
                  {order.priority}
                </span>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mb-3 p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Items:</p>
                  <div className="space-y-1">
                    {order.items.map((item) => (
                      <div key={item.id} className="text-xs text-gray-600">
                        {item.name} × {item.quantity} {item.unit}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.estimatedCost && (
                <div className="mb-3 text-sm font-semibold text-gray-900">
                  Est. Cost: ${order.estimatedCost.toFixed(2)}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                >
                  View Details
                </Button>
                {order.status === 'pending' && (
                  <Button
                    size="sm"
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    Edit
                  </Button>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Create Order Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>Create New Order</AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Title
                </label>
                <Input
                  type="text"
                  placeholder="e.g., Chicken order"
                  value={newOrder.title}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, title: e.target.value })
                  }
                  className="h-10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Input
                  type="text"
                  placeholder="Order details..."
                  value={newOrder.description}
                  onChange={(e) =>
                    setNewOrder({ ...newOrder, description: e.target.value })
                  }
                  className="h-10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={newOrder.type}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        type: e.target.value as 'supply' | 'work',
                      })
                    }
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="supply">Supply</option>
                    <option value="work">Work</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newOrder.priority}
                    onChange={(e) =>
                      setNewOrder({
                        ...newOrder,
                        priority: e.target.value as 'low' | 'medium' | 'high',
                      })
                    }
                    className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateOrder}
              className="bg-blue-600"
            >
              Create Order
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileOrderingScreen;
