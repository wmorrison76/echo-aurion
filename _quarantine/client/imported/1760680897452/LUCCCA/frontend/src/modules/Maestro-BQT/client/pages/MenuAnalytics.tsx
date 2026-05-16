/**
 * Menu Analytics - Maestro Banquets
 * Insight dashboard for menu performance with sample analytics
 */

import React, { useMemo } from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { BarChart3, Flame, Star, DollarSign, Filter, TrendingUp } from 'lucide-react';

const sampleMenu = [
  { id: 'm1', name: 'Braised Short Rib', category: 'Entree', orders: 382, rating: 4.8, revenue: 28650, cost: 8.7, price: 28 },
  { id: 'm2', name: 'Truffle Mushroom Risotto', category: 'Entree', orders: 341, rating: 4.6, revenue: 22165, cost: 6.2, price: 24 },
  { id: 'm3', name: 'Lobster Bisque', category: 'Starter', orders: 298, rating: 4.5, revenue: 11920, cost: 3.4, price: 16 },
  { id: 'm4', name: 'Caesar Salad', category: 'Starter', orders: 415, rating: 4.2, revenue: 8300, cost: 1.9, price: 12 },
  { id: 'm5', name: 'Chocolate Lava Cake', category: 'Dessert', orders: 367, rating: 4.9, revenue: 7340, cost: 2.1, price: 12 },
];

export default function MenuAnalytics() {
  const totals = useMemo(() => {
    const totalOrders = sampleMenu.reduce((s, m) => s + m.orders, 0);
    const totalRevenue = sampleMenu.reduce((s, m) => s + m.revenue, 0);
    const avgRating = sampleMenu.reduce((s, m) => s + m.rating, 0) / sampleMenu.length;
    return { totalOrders, totalRevenue, avgRating };
  }, []);

  return (
    <DashboardLayout
      title="Menu Analytics"
      subtitle="Performance, popularity, and profitability insights"
      actions={
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <Input placeholder="Search dishes..." className="h-9 w-48" />
            <Select>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="entree">Entree</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filters</Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Total Orders</div>
              <div className="text-2xl font-bold">{totals.totalOrders.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Revenue</div>
              <div className="text-2xl font-bold text-green-600">${totals.totalRevenue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Avg Rating</div>
              <div className="text-2xl font-bold">{totals.avgRating.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardContent className="p-4">
              <div className="text-sm text-muted-foreground">Top Category</div>
              <div className="text-2xl font-bold">Entrees</div>
            </CardContent>
          </Card>
        </div>

        {/* Top Items */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Top Performing Dishes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {sampleMenu.map((m) => (
              <div key={m.id} className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-center border rounded-lg px-3 py-2 bg-background/50">
                <div className="lg:col-span-2 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />{m.name}
                  {m.rating >= 4.8 && (
                    <Badge variant="outline" className="ml-1 text-amber-600 border-amber-200"><Star className="h-3 w-3 mr-1" />Top Rated</Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{m.category}</div>
                <div className="text-sm">{m.orders} orders</div>
                <div className="text-sm text-green-700 flex items-center"><DollarSign className="h-4 w-4 mr-1" />{m.revenue.toLocaleString()}</div>
                <div>
                  <Progress value={Math.min(100, (m.orders / 450) * 100)} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Profitability */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5" /> Profitability Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {sampleMenu.map((m) => (
              <div key={m.id} className="p-4 rounded-lg border bg-background/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{m.name}</div>
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                    <TrendingUp className="h-3 w-3 mr-1" /> {(m.price - m.cost).toFixed(2)} margin
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Cost ${m.cost.toFixed(2)} • Price ${m.price.toFixed(2)}</div>
                <Progress value={Math.min(100, ((m.price - m.cost) / m.price) * 100)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
