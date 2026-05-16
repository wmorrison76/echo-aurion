import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Phone, Mail, Calendar } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'lead' | 'customer' | 'vip';
  lastContact: string;
  totalOrders: number;
  totalSpent: number;
  notes: string;
}

const defaultCustomers: Customer[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    phone: '+1 (555) 123-4567',
    status: 'vip',
    lastContact: '2025-01-10',
    totalOrders: 12,
    totalSpent: 2400,
    notes: 'Prefers organic ingredients, gluten-free options',
  },
  {
    id: '2',
    name: 'Michael Chen',
    email: 'michael@example.com',
    phone: '+1 (555) 234-5678',
    status: 'customer',
    lastContact: '2025-01-08',
    totalOrders: 5,
    totalSpent: 850,
    notes: 'Corporate events, budget-conscious',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    email: 'emily@example.com',
    phone: '+1 (555) 345-6789',
    status: 'lead',
    lastContact: '2025-01-12',
    totalOrders: 0,
    totalSpent: 0,
    notes: 'Wedding planning inquiry, interested in catering',
  },
  {
    id: '4',
    name: 'David Thompson',
    email: 'david@example.com',
    phone: '+1 (555) 456-7890',
    status: 'customer',
    lastContact: '2025-01-06',
    totalOrders: 8,
    totalSpent: 1650,
    notes: 'Regular client, monthly standing reservations',
  },
];

export default function CRMContent() {
  const [customers, setCustomers] = useState<Customer[]>(defaultCustomers);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Customer['status']) => {
    switch (status) {
      case 'vip':
        return 'bg-purple-500/20 text-purple-700 border-purple-500/30';
      case 'customer':
        return 'bg-blue-500/20 text-blue-700 border-blue-500/30';
      case 'lead':
        return 'bg-orange-500/20 text-orange-700 border-orange-500/30';
    }
  };

  const getStatusLabel = (status: Customer['status']) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Track relationships, orders, and communications</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredCustomers.map((customer) => (
                  <button
                    key={customer.id}
                    onClick={() => setSelectedCustomer(customer)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedCustomer?.id === customer.id
                        ? 'bg-primary/20 border border-primary/30'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="font-medium text-sm">{customer.name}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                    <div className="flex items-center gap-1 mt-1">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${getStatusColor(
                          customer.status
                        )}`}
                      >
                        {getStatusLabel(customer.status)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Details */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedCustomer.name}</CardTitle>
                      <span
                        className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                          selectedCustomer.status
                        )}`}
                      >
                        {getStatusLabel(selectedCustomer.status)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Contact Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Email</div>
                        <div className="text-sm font-medium">{selectedCustomer.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Phone</div>
                        <div className="text-sm font-medium">{selectedCustomer.phone}</div>
                      </div>
                    </div>
                  </div>

                  {/* Last Contact */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Last Contact</div>
                      <div className="text-sm font-medium">
                        {new Date(selectedCustomer.lastContact).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-2">Notes</div>
                    <div className="bg-muted/50 rounded p-3 text-sm">{selectedCustomer.notes}</div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Stats */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCustomer.totalOrders}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${selectedCustomer.totalSpent.toLocaleString()}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button className="flex-1">Contact</Button>
                <Button variant="outline" className="flex-1">
                  Edit
                </Button>
                <Button variant="outline" className="flex-1">
                  History
                </Button>
              </div>
            </div>
          ) : (
            <Card className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-muted-foreground">Select a customer to view details</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">VIP</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {customers.filter((c) => c.status === 'vip').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {customers.filter((c) => c.status === 'lead').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${customers.reduce((sum, c) => sum + c.totalSpent, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
