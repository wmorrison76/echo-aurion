import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, TrendingDown, TrendingUp, Package } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
export interface InventoryMovement {
  id: string;
  timestamp: string;
  type: "received" | "placed" | "transferred" | "adjusted" | "consumed";
  productCode: string;
  productName: string;
  quantity: number;
  unitOfMeasure: string;
  fromOutlet?: string;
  toOutlet: string;
  reference?: string;
  user: string;
}
export interface OutletInventory {
  outletId: string;
  outletName: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitOfMeasure: number;
  unitCost: number;
  totalValue: number;
  minStockLevel: number;
  status: "healthy" | "low" | "critical";
}
export interface SystemwideInventoryLedgerProps {
  movements: InventoryMovement[];
  outletInventories: OutletInventory[];
  outlets: Array<{ id: string; name: string }>;
  isLoading?: boolean;
}
export function SystemwideInventoryLedger({
  movements,
  outletInventories,
  outlets,
  isLoading = false,
}: SystemwideInventoryLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedMovementType, setSelectedMovementType] =
    useState<string>("all");
  const [viewMode, setViewMode] = useState<"inventory" | "movements">(
    "inventory",
  );
  const filteredInventories = useMemo(() => {
    return outletInventories.filter((inv) => {
      const matchesSearch =
        !searchTerm ||
        inv.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.productName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOutlet =
        selectedOutlet === "all" || inv.outletId === selectedOutlet;
      return matchesSearch && matchesOutlet;
    });
  }, [outletInventories, searchTerm, selectedOutlet]);
  const filteredMovements = useMemo(() => {
    let filtered = movements;
    if (searchTerm) {
      filtered = filtered.filter(
        (m) =>
          m.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.productName.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }
    if (selectedOutlet !== "all") {
      filtered = filtered.filter((m) => m.toOutlet === selectedOutlet);
    }
    if (selectedMovementType !== "all") {
      filtered = filtered.filter((m) => m.type === selectedMovementType);
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [movements, searchTerm, selectedOutlet, selectedMovementType]);
  const totalInventoryValue = useMemo(() => {
    return outletInventories.reduce((sum, inv) => sum + inv.totalValue, 0);
  }, [outletInventories]);
  const lowStockItems = useMemo(() => {
    return outletInventories.filter(
      (inv) => inv.status === "low" || inv.status === "critical",
    );
  }, [outletInventories]);
  const getMovementIcon = (type: InventoryMovement["type"]) => {
    return type === "received" ? (
      <TrendingUp className="h-4 w-4 text-emerald-400" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-400" />
    );
  };
  const getMovementLabel = (type: InventoryMovement["type"]) => {
    const labels = {
      received: "Received",
      placed: "Placed",
      transferred: "Transferred",
      adjusted: "Adjusted",
      consumed: "Consumed",
    };
    return labels[type];
  };
  const getStatusColor = (status: OutletInventory["status"]) => {
    const colors = {
      healthy: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
      low: "border-yellow-400/40 bg-yellow-500/10 text-yellow-200",
      critical: "border-red-400/40 bg-red-500/10 text-red-200",
    };
    return colors[status];
  };
  const getStatusLabel = (status: OutletInventory["status"]) => {
    const labels = {
      healthy: "Healthy",
      low: "Low Stock",
      critical: "Critical",
    };
    return labels[status];
  };
  return (
    <div className="space-y-6">
      {" "}
      {/* Summary Cards */}{" "}
      <div className="grid gap-4 md:grid-cols-3">
        {" "}
        <Card className="border-emerald-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-emerald-200/70">
              Total Inventory Value
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-emerald-100">
              {" "}
              ${totalInventoryValue.toFixed(2)}{" "}
            </div>{" "}
            <div className="text-xs text-emerald-200/60 mt-1">
              {" "}
              {outletInventories.length} unique products{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-yellow-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-yellow-200/70">
              Low Stock Items
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-yellow-100">
              {lowStockItems.length}
            </div>{" "}
            <div className="text-xs text-yellow-200/60 mt-1">
              {" "}
              Requiring attention{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="border-cyan-400/30 bg-card">
          {" "}
          <CardHeader className="pb-3">
            {" "}
            <CardTitle className="text-sm text-cyan-200/70">
              Recent Movements
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-semibold text-cyan-100">
              {movements.length}
            </div>{" "}
            <div className="text-xs text-cyan-200/60 mt-1">
              {" "}
              Last {movements.length > 0
                ? Math.ceil(movements.length / 10)
                : 0}{" "}
              days{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* View Mode Tabs */}{" "}
      <Card className="border-cyan-400/30 bg-card">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <Package className="h-5 w-5" />{" "}
            {viewMode === "inventory"
              ? "System Inventory"
              : "Movement History"}{" "}
          </CardTitle>{" "}
          <CardDescription className="text-cyan-200/70">
            {" "}
            {viewMode === "inventory"
              ? "Current stock levels across all outlets"
              : "Track all inventory movements and adjustments"}{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          {/* Filters */}{" "}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {" "}
            <Input
              placeholder={
                viewMode === "inventory"
                  ? "Search products..."
                  : "Search by product, outlet..."
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border-cyan-400/20 bg-card"
            />{" "}
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              {" "}
              <SelectTrigger className="w-full md:w-[180px] border-cyan-400/20 bg-card">
                {" "}
                <SelectValue placeholder="All outlets" />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All Outlets</SelectItem>{" "}
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {" "}
                    {outlet.name}{" "}
                  </SelectItem>
                ))}{" "}
              </SelectContent>{" "}
            </Select>{" "}
            {viewMode === "movements" && (
              <Select
                value={selectedMovementType}
                onValueChange={setSelectedMovementType}
              >
                {" "}
                <SelectTrigger className="w-full md:w-[180px] border-cyan-400/20 bg-card">
                  {" "}
                  <SelectValue placeholder="All types" />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  <SelectItem value="all">All Types</SelectItem>{" "}
                  <SelectItem value="received">Received</SelectItem>{" "}
                  <SelectItem value="placed">Placed</SelectItem>{" "}
                  <SelectItem value="transferred">Transferred</SelectItem>{" "}
                  <SelectItem value="adjusted">Adjusted</SelectItem>{" "}
                  <SelectItem value="consumed">Consumed</SelectItem>{" "}
                </SelectContent>{" "}
              </Select>
            )}{" "}
            <div className="flex gap-2">
              {" "}
              <Button
                onClick={() => setViewMode("inventory")}
                variant={viewMode === "inventory" ? "default" : "outline"}
                size="sm"
              >
                {" "}
                Inventory{" "}
              </Button>{" "}
              <Button
                onClick={() => setViewMode("movements")}
                variant={viewMode === "movements" ? "default" : "outline"}
                size="sm"
              >
                {" "}
                Movements{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
          {/* Inventory Table */}{" "}
          {viewMode === "inventory" && (
            <div className="overflow-x-auto">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow className="border-cyan-400/20">
                    {" "}
                    <TableHead className="text-cyan-200/70">
                      Product
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">Outlet</TableHead>{" "}
                    <TableHead className="text-right text-cyan-200/70">
                      Quantity
                    </TableHead>{" "}
                    <TableHead className="text-right text-cyan-200/70">
                      Unit Cost
                    </TableHead>{" "}
                    <TableHead className="text-right text-cyan-200/70">
                      Total Value
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">
                      Status
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredInventories.length === 0 ? (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-cyan-200/60"
                      >
                        {" "}
                        No inventory items found{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ) : (
                    filteredInventories.map((inv) => (
                      <TableRow
                        key={`${inv.outletId}-${inv.productCode}`}
                        className="border-cyan-400/10"
                      >
                        {" "}
                        <TableCell className="text-cyan-100">
                          {" "}
                          <div className="font-semibold">
                            {inv.productName}
                          </div>{" "}
                          <div className="text-xs text-cyan-200/60">
                            {inv.productCode}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-cyan-100">
                          {inv.outletName}
                        </TableCell>{" "}
                        <TableCell className="text-right font-mono text-cyan-100">
                          {" "}
                          {inv.quantity.toFixed(2)} {inv.unitOfMeasure}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right font-mono text-cyan-100">
                          {" "}
                          ${inv.unitCost.toFixed(2)}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right font-mono font-semibold text-cyan-100">
                          {" "}
                          ${inv.totalValue.toFixed(2)}{" "}
                        </TableCell>{" "}
                        <TableCell>
                          {" "}
                          <Badge className={getStatusColor(inv.status)}>
                            {" "}
                            {getStatusLabel(inv.status)}{" "}
                          </Badge>{" "}
                        </TableCell>{" "}
                      </TableRow>
                    ))
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>
          )}{" "}
          {/* Movements Table */}{" "}
          {viewMode === "movements" && (
            <div className="overflow-x-auto">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow className="border-cyan-400/20">
                    {" "}
                    <TableHead className="text-cyan-200/70">
                      Timestamp
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">Type</TableHead>{" "}
                    <TableHead className="text-cyan-200/70">Product</TableHead>{" "}
                    <TableHead className="text-right text-cyan-200/70">
                      Quantity
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">
                      From Outlet
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">
                      To Outlet
                    </TableHead>{" "}
                    <TableHead className="text-cyan-200/70">
                      User
                    </TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredMovements.length === 0 ? (
                    <TableRow>
                      {" "}
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-cyan-200/60"
                      >
                        {" "}
                        No movement records found{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ) : (
                    filteredMovements.map((movement) => (
                      <TableRow
                        key={movement.id}
                        className="border-cyan-400/10"
                      >
                        {" "}
                        <TableCell className="text-xs text-cyan-200/70 font-mono">
                          {" "}
                          {new Date(movement.timestamp).toLocaleString()}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-cyan-100">
                          {" "}
                          <div className="flex items-center gap-2">
                            {" "}
                            {getMovementIcon(movement.type)}{" "}
                            {getMovementLabel(movement.type)}{" "}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-cyan-100">
                          {" "}
                          <div className="font-semibold">
                            {movement.productName}
                          </div>{" "}
                          <div className="text-xs text-cyan-200/60">
                            {movement.productCode}
                          </div>{" "}
                        </TableCell>{" "}
                        <TableCell className="text-right font-mono text-cyan-100">
                          {" "}
                          {movement.quantity} {movement.unitOfMeasure}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm text-cyan-200/80">
                          {" "}
                          {movement.fromOutlet || "—"}{" "}
                        </TableCell>{" "}
                        <TableCell className="text-sm text-cyan-200/80">
                          {movement.toOutlet}
                        </TableCell>{" "}
                        <TableCell className="text-sm text-cyan-200/80">
                          {movement.user}
                        </TableCell>{" "}
                      </TableRow>
                    ))
                  )}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Low Stock Alert */}{" "}
      {lowStockItems.length > 0 && (
        <Card className="border-red-400/40 bg-red-500/10">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="flex items-center gap-2 text-red-100">
              {" "}
              <AlertCircle className="h-5 w-5" /> Low Stock Alerts{" "}
            </CardTitle>{" "}
            <CardDescription className="text-red-200/70">
              {" "}
              {lowStockItems.length} items need attention{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2">
              {" "}
              {lowStockItems.slice(0, 10).map((item) => (
                <div
                  key={`${item.outletId}-${item.productCode}`}
                  className="flex items-center justify-between rounded-lg border border-red-400/30 bg-card px-3 py-2"
                >
                  {" "}
                  <div>
                    {" "}
                    <div className="text-sm font-semibold text-red-100">
                      {item.productName}
                    </div>{" "}
                    <div className="text-xs text-red-200/70">
                      {" "}
                      {item.outletName} • {item.quantity.toFixed(2)}{" "}
                      {item.unitOfMeasure} (min: {item.minStockLevel}){" "}
                    </div>{" "}
                  </div>{" "}
                  <Badge className={getStatusColor(item.status)}>
                    {" "}
                    {getStatusLabel(item.status)}{" "}
                  </Badge>{" "}
                </div>
              ))}{" "}
              {lowStockItems.length > 10 && (
                <div className="text-xs text-red-200/60 text-center pt-2">
                  {" "}
                  +{lowStockItems.length - 10} more items{" "}
                </div>
              )}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
    </div>
  );
}
