import React, { useState, useEffect, useCallback } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Star, MapPin, Phone, Mail, ChevronRight } from "lucide-react";
interface Vendor {
  id: string;
  name: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  qualityRating: number;
  reliabilityRating: number;
}
interface VendorBrowserProps {
  onVendorSelect?: (vendor: Vendor) => void;
  category?: string;
}
export const VendorBrowser: React.FC<VendorBrowserProps> = ({
  onVendorSelect,
  category,
}) => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(category || "");
  const [showFilters, setShowFilters] = useState(false);
  const categories = ["catering", "equipment", "decor", "photography", "music"];
  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        const url = new URL(
          "/api/v1/marketplace/vendors",
          window.location.origin,
        );
        if (selectedCategory)
          url.searchParams.append("category", selectedCategory);
        const response = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        if (!response.ok) throw new Error("Failed to fetch vendors");
        const data = await response.json();
        setVendors(data.data || []);
      } catch (error) {
        console.error("Error fetching vendors:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchVendors();
  }, [selectedCategory]);
  useEffect(() => {
    let filtered = vendors;
    if (searchQuery) {
      filtered = filtered.filter((v) =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    setFilteredVendors(filtered);
  }, [vendors, searchQuery]);
  const getRatingColor = (rating: number): string => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 4) return "text-primary";
    if (rating >= 3.5) return "text-yellow-600";
    return "text-orange-600";
  };
  return (
    <div className="space-y-4 p-6 bg-surface">
      {" "}
      {/* Search and Filters */}{" "}
      <div className="space-y-4">
        {" "}
        <div className="flex gap-2">
          {" "}
          <Input
            placeholder="Search vendors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />{" "}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            {" "}
            Filters{" "}
          </Button>{" "}
        </div>{" "}
        {showFilters && (
          <Card className="p-4">
            {" "}
            <h3 className="font-semibold mb-3 text-sm">Category</h3>{" "}
            <div className="flex flex-wrap gap-2">
              {" "}
              <Button
                size="sm"
                variant={!selectedCategory ? "default" : "outline"}
                onClick={() => setSelectedCategory("")}
              >
                {" "}
                All{" "}
              </Button>{" "}
              {categories.map((cat) => (
                <Button
                  key={cat}
                  size="sm"
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className="capitalize"
                >
                  {" "}
                  {cat}{" "}
                </Button>
              ))}{" "}
            </div>{" "}
          </Card>
        )}{" "}
      </div>{" "}
      {/* Results Count */}{" "}
      <div className="text-sm text-muted-foreground">
        {" "}
        Showing {filteredVendors.length} vendors{" "}
      </div>{" "}
      {/* Vendors Grid */}{" "}
      {loading ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>Loading vendors...</p>{" "}
        </Card>
      ) : filteredVendors.length === 0 ? (
        <Card className="p-8 text-center text-gray-400">
          {" "}
          <p>No vendors found matching your criteria</p>{" "}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {" "}
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="p-4 hover:shadow-lg transition cursor-pointer"
              onClick={() => onVendorSelect?.(vendor)}
            >
              {" "}
              <div className="flex justify-between items-start mb-3">
                {" "}
                <div>
                  {" "}
                  <h3 className="font-semibold">{vendor.name}</h3>{" "}
                  <Badge
                    variant="secondary"
                    className="text-xs mt-1 capitalize"
                  >
                    {" "}
                    {vendor.category}{" "}
                  </Badge>{" "}
                </div>{" "}
                <ChevronRight size={20} className="text-gray-400" />{" "}
              </div>{" "}
              {/* Rating */}{" "}
              <div className="flex items-center gap-4 mb-3 text-sm">
                {" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <Star
                    size={16}
                    className={`${getRatingColor(vendor.qualityRating)}`}
                    fill="currentColor"
                  />{" "}
                  <span className="font-medium">
                    {" "}
                    {vendor.qualityRating.toFixed(1)}{" "}
                  </span>{" "}
                  <span className="text-muted-foreground">(Quality)</span>{" "}
                </div>{" "}
                <div className="flex items-center gap-1">
                  {" "}
                  <span className="font-medium">
                    {" "}
                    {vendor.reliabilityRating.toFixed(1)}{" "}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    (Reliability)
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              {/* Contact Info */}{" "}
              <div className="space-y-2 text-xs text-muted-foreground">
                {" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Mail size={14} /> {vendor.contactEmail}{" "}
                </div>{" "}
                <div className="flex items-center gap-2">
                  {" "}
                  <Phone size={14} /> {vendor.contactPhone}{" "}
                </div>{" "}
              </div>{" "}
              {/* CTA */}{" "}
              <Button className="w-full mt-4" size="sm">
                {" "}
                View Details{" "}
              </Button>{" "}
            </Card>
          ))}{" "}
        </div>
      )}{" "}
    </div>
  );
};
