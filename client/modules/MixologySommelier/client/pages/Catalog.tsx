import React, { useState, useMemo } from "react";
import { useTheme } from "../components/ThemeProvider";
import { WineCard } from "../components/WineCard";
import { wines } from "../lib/wines";
import { Search, Wine as WineIcon, Grid3x3, List } from "lucide-react";
export const Catalog: React.FC = () => {
  const { theme, isDark } = useTheme();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "rating" | "price">("name");
  const filteredWines = useMemo(() => {
    return wines
      .filter((wine) => {
        const matchesSearch =
          wine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          wine.region.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType =
          selectedType === "all" || wine.type === selectedType;
        return matchesSearch && matchesType;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
        if (sortBy === "price")
          return (b.retail_price || 0) - (a.retail_price || 0);
        return 0;
      });
  }, [searchTerm, selectedType, sortBy]);
  const wineTypes = [
    { value: "all", label: "All Wines" },
    { value: "red", label: "Red" },
    { value: "white", label: "White" },
    { value: "rosé", label: "Rosé" },
    { value: "sparkling", label: "Sparkling" },
  ];
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
      <div style={{ maxWidth: "1400px", margin: "0 auto" }}>
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
              <WineIcon
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
              Wine Catalog{" "}
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
            Explore our hand-selected premium wine collection from around the
            world{" "}
          </p>{" "}
        </div>{" "}
        {/* Search and Filter Section */}{" "}
        <div
          style={{
            backgroundColor: theme.colors.card,
            border: `1px solid ${theme.colors.border}`,
            borderRadius: "16px",
            padding: "2rem",
            marginBottom: "2.5rem",
          }}
        >
          {" "}
          {/* Search Bar */}{" "}
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {" "}
            <div
              style={{
                flex: 1,
                position: "relative",
                display: "flex",
                alignItems: "center",
                minWidth: "250px",
              }}
            >
              {" "}
              <Search
                size={20}
                style={{
                  position: "absolute",
                  left: "1rem",
                  color: theme.colors.primary,
                }}
              />{" "}
              <input
                type="text"
                placeholder="Search wines by name or region..."
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
                  e.currentTarget.style.boxShadow = `0 0 0 3px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.1)`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = theme.colors.border;
                  e.currentTarget.style.boxShadow = "none";
                }}
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label
                style={{
                  color: theme.text.secondary,
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  marginRight: "0.5rem",
                }}
              >
                {" "}
                Sort By:{" "}
              </label>{" "}
              <select
                value={sortBy}
                onChange={(e) =>
                  setSortBy(e.target.value as "name" | "rating" | "price")
                }
                style={{
                  padding: "0.625rem 1rem",
                  backgroundColor: theme.colors.background,
                  color: theme.colors.foreground,
                  border: `1.5px solid ${theme.colors.border}`,
                  borderRadius: "10px",
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                {" "}
                <option value="name">Name</option>{" "}
                <option value="rating">Rating</option>{" "}
                <option value="price">Price</option>{" "}
              </select>{" "}
            </div>{" "}
          </div>{" "}
          {/* Filter Buttons */}{" "}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {" "}
            {wineTypes.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                style={{
                  padding: "0.625rem 1.25rem",
                  backgroundColor:
                    selectedType === type.value
                      ? theme.colors.primary
                      : theme.colors.background,
                  color:
                    selectedType === type.value
                      ? theme.colors.background
                      : theme.colors.foreground,
                  border: `1.5px solid ${selectedType === type.value ? theme.colors.primary : theme.colors.border}`,
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow:
                    selectedType === type.value && isDark
                      ? `0 0 12px rgba(${parseInt(theme.colors.primary.slice(1, 3), 16)}, ${parseInt(theme.colors.primary.slice(3, 5), 16)}, ${parseInt(theme.colors.primary.slice(5, 7), 16)}, 0.3)`
                      : "none",
                }}
                onMouseEnter={(e) => {
                  if (selectedType !== type.value) {
                    e.currentTarget.style.backgroundColor = theme.colors.muted;
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedType !== type.value) {
                    e.currentTarget.style.backgroundColor =
                      theme.colors.background;
                  }
                }}
              >
                {" "}
                {type.label}{" "}
              </button>
            ))}{" "}
          </div>{" "}
        </div>{" "}
        {/* Results Counter */}{" "}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2rem",
          }}
        >
          {" "}
          <p style={{ color: theme.text.secondary, fontSize: "0.95rem" }}>
            {" "}
            Showing{""}{" "}
            <span style={{ fontWeight: "700", color: theme.colors.foreground }}>
              {" "}
              {filteredWines.length}{" "}
            </span>
            {""} wine{filteredWines.length !== 1 ? "s" : ""}{" "}
          </p>{" "}
        </div>{" "}
        {/* Wine Grid */}{" "}
        {filteredWines.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: "2rem",
            }}
          >
            {" "}
            {filteredWines.map((wine) => (
              <WineCard key={wine.id} wine={wine} />
            ))}{" "}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "4rem 2rem",
              backgroundColor: theme.colors.card,
              borderRadius: "12px",
              border: `1px dashed ${theme.colors.border}`,
            }}
          >
            {" "}
            <WineIcon
              size={48}
              style={{ opacity: 0.3, marginBottom: "1rem" }}
            />{" "}
            <p
              style={{
                fontSize: "1.1rem",
                color: theme.text.secondary,
                marginBottom: "0.5rem",
              }}
            >
              {" "}
              No wines found matching your search{" "}
            </p>{" "}
            <p style={{ fontSize: "0.9rem", color: theme.text.secondary }}>
              {" "}
              Try adjusting your filters or search terms{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
    </div>
  );
};
export default Catalog;
