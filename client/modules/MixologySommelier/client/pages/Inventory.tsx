import React, { useState } from "react";
import { useTheme } from "../components/ThemeProvider";
import {
  Package,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Wine,
  Plus,
  Search,
} from "lucide-react";
interface InventoryItem {
  id: string;
  wineName: string;
  producer: string;
  region: string;
  vintage: number;
  quantity: number;
  reorderLevel: number;
  costPerBottle: number;
  retailPrice: number;
  location: string;
  lastInventory: string;
}
const mockInventory: InventoryItem[] = [
  {
    id: "1",
    wineName: "Château Margaux",
    producer: "Château Margaux",
    region: "Bordeaux",
    vintage: 2015,
    quantity: 12,
    reorderLevel: 6,
    costPerBottle: 180,
    retailPrice: 350,
    location: "A-1-3",
    lastInventory: "2024-01-15",
  },
  {
    id: "2",
    wineName: "Chablis William Fèvre",
    producer: "William Fèvre",
    region: "Burgundy",
    vintage: 2022,
    quantity: 3,
    reorderLevel: 12,
    costPerBottle: 22,
    retailPrice: 48,
    location: "B-2-1",
    lastInventory: "2024-01-18",
  },
  {
    id: "3",
    wineName: "Barolo Luciano Sandrone",
    producer: "Luciano Sandrone",
    region: "Piedmont",
    vintage: 2018,
    quantity: 8,
    reorderLevel: 8,
    costPerBottle: 95,
    retailPrice: 185,
    location: "A-3-2",
    lastInventory: "2024-01-16",
  },
]; // Import optimized version
import { InventoryOptimized } from "./InventoryOptimized"; // Export optimized version as default
export const Inventory: React.FC = () => {
  return <InventoryOptimized />;
}; // Legacy component kept for reference
export const InventoryLegacy: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "table">("table");
  const filteredInventory = mockInventory.filter(
    (item) =>
      item.wineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.producer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.region.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const lowStockItems = mockInventory.filter(
    (item) => item.quantity <= item.reorderLevel,
  );
  const totalInventoryValue = mockInventory.reduce(
    (sum, item) => sum + item.quantity * item.costPerBottle,
    0,
  );
  const totalRetailValue = mockInventory.reduce(
    (sum, item) => sum + item.quantity * item.retailPrice,
    0,
  );
  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div
      style={{
        backgroundColor: theme.colors.card,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: "12px",
        padding: "1.5rem",
        display: "flex",
        gap: "1.25rem",
        alignItems: "flex-start",
      }}
    >
      {" "}
      <div
        style={{
          backgroundColor: `rgba(${parseInt(color.slice(1, 3), 16)}, ${parseInt(color.slice(3, 5), 16)}, ${parseInt(color.slice(5, 7), 16)}, 0.1)`,
          borderRadius: "10px",
          padding: "0.875rem",
          color: color,
        }}
      >
        {" "}
        <Icon size={24} />{" "}
      </div>{" "}
      <div>
        {" "}
        <p
          style={{
            color: theme.text.secondary,
            fontSize: "0.85rem",
            margin: 0,
            marginBottom: "0.375rem",
          }}
        >
          {" "}
          {label}{" "}
        </p>{" "}
        <p
          style={{
            color: theme.colors.foreground,
            fontSize: "1.75rem",
            fontWeight: "700",
            margin: 0,
          }}
        >
          {" "}
          {value}{" "}
        </p>{" "}
      </div>{" "}
    </div>
  );
  return (
    <div
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.foreground,
        minHeight: "100vh",
        padding: "3rem 2rem",
        background: isDark
          ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.03) 100%)`
          : theme.colors.background,
      }}
    >
      {" "}
      <div style={{ maxWidth: "1600px", margin: "0 auto" }}>
        {" "}
        {/* Header */}{" "}
        <div style={{ marginBottom: "3rem" }}>
          {" "}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "0.75rem",
            }}
          >
            {" "}
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary})`,
                borderRadius: "12px",
                padding: "0.75rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              <Package
                size={28}
                style={{ color: theme.colors.background }}
              />{" "}
            </div>{" "}
            <h1
              style={{
                fontSize: "2.75rem",
                fontWeight: "700",
                marginBottom: 0,
                color: theme.colors.foreground,
                letterSpacing: "-0.5px",
              }}
            >
              {" "}
              Cellar Inventory{" "}
            </h1>{" "}
          </div>{" "}
          <p
            style={{
              color: theme.text.secondary,
              fontSize: "1.05rem",
              marginTop: "0.5rem",
            }}
          >
            {" "}
            Manage wine stock, track locations, and monitor inventory value{" "}
          </p>{" "}
        </div>{" "}
        {/* Stats Grid */}{" "}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
          }}
        >
          {" "}
          <StatCard
            icon={Wine}
            label="Total Bottles"
            value={mockInventory.reduce((sum, item) => sum + item.quantity, 0)}
            color={theme.colors.primary}
          />{" "}
          <StatCard
            icon={DollarSign}
            label="Cost Value"
            value={`$${(totalInventoryValue / 1000).toFixed(1)}K`}
            color={theme.colors.secondary}
          />{" "}
          <StatCard
            icon={TrendingUp}
            label="Retail Value"
            value={`$${(totalRetailValue / 1000).toFixed(1)}K`}
            color={theme.colors.accent}
          />{" "}
          <StatCard
            icon={AlertTriangle}
            label="Low Stock Items"
            value={lowStockItems.length}
            color="#EF4444"
          />{" "}
        </div>{" "}
        {/* Low Stock Alert */}{" "}
        {lowStockItems.length > 0 && (
          <div
            style={{
              backgroundColor: `rgba(239, 68, 68, 0.1)`,
              border: "1px solid #FCA5A5",
              borderRadius: "12px",
              padding: "1.5rem",
              marginBottom: "2rem",
              display: "flex",
              gap: "1rem",
            }}
          >
            {" "}
            <AlertTriangle
              size={24}
              style={{ color: "#DC2626", flexShrink: 0 }}
            />{" "}
            <div>
              {" "}
              <h3
                style={{
                  color: "#DC2626",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                }}
              >
                {" "}
                Low Stock Alert{" "}
              </h3>{" "}
              <p
                style={{
                  color: theme.text.secondary,
                  margin: 0,
                  fontSize: "0.9rem",
                }}
              >
                {" "}
                {lowStockItems.length} wine(s) below reorder level. Review
                purchase orders to maintain cellar levels.{" "}
              </p>{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Search and Controls */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          {" "}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
            {" "}
            <div style={{ flex: 1, position: "relative" }}>
              {" "}
              <Search
                size={20}
                style={{
                  position: "absolute",
                  left: "1rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: theme.colors.primary,
                }}
              />{" "}
              <input
                type="text"
                placeholder="Search by wine name, producer, or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.875rem 1rem 0.875rem 2.75rem",
                  backgroundColor: theme.colors.background,
                  color: theme.colors.foreground,
                  border: `1.5px solid ${theme.colors.border}`,
                  borderRadius: "10px",
                  fontSize: "0.95rem",
                  outline: "none",
                  transition: "all 0.2s",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.primary;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                }}
              />{" "}
            </div>{" "}
            <button
              style={{
                padding: "0.875rem 1.5rem",
                backgroundColor: theme.colors.primary,
                color: theme.colors.background,
                border: "none",
                borderRadius: "10px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                transition: "all 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {" "}
              <Plus size={20} /> Add Wine{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
        {/* Inventory Table */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {" "}
          <div style={{ overflowX: "auto" }}>
            {" "}
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              {" "}
              <thead>
                {" "}
                <tr style={{ backgroundColor: theme.colors.muted }}>
                  {" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Wine{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Producer{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "left",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Vintage{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Qty{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Reorder{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Cost/Bottle{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "right",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Total Value{" "}
                  </th>{" "}
                  <th
                    style={{
                      padding: "1rem",
                      textAlign: "center",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                    }}
                  >
                    {" "}
                    Location{" "}
                  </th>{" "}
                </tr>{" "}
              </thead>{" "}
              <tbody>
                {" "}
                {filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    style={{
                      borderTop: `1px solid ${theme.colors.border}`,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        theme.colors.muted;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {" "}
                    <td style={{ padding: "1rem", fontWeight: "500" }}>
                      {" "}
                      {item.wineName}{" "}
                    </td>{" "}
                    <td
                      style={{ padding: "1rem", color: theme.text.secondary }}
                    >
                      {" "}
                      {item.producer}{" "}
                    </td>{" "}
                    <td
                      style={{ padding: "1rem", color: theme.text.secondary }}
                    >
                      {" "}
                      {item.vintage}{" "}
                    </td>{" "}
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color:
                          item.quantity <= item.reorderLevel
                            ? "#DC2626"
                            : theme.colors.foreground,
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      {item.quantity}{" "}
                    </td>{" "}
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: theme.text.secondary,
                      }}
                    >
                      {" "}
                      {item.reorderLevel}{" "}
                    </td>{" "}
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        color: theme.text.secondary,
                      }}
                    >
                      {" "}
                      ${item.costPerBottle}{" "}
                    </td>{" "}
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "right",
                        fontWeight: "600",
                      }}
                    >
                      {" "}
                      $
                      {(
                        item.quantity * item.costPerBottle
                      ).toLocaleString()}{" "}
                    </td>{" "}
                    <td
                      style={{
                        padding: "1rem",
                        textAlign: "center",
                        color: theme.text.secondary,
                      }}
                    >
                      {" "}
                      {item.location}{" "}
                    </td>{" "}
                  </tr>
                ))}{" "}
              </tbody>{" "}
            </table>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default Inventory;
