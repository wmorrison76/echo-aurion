/**
 * Template Gallery Panel
 * Browse, search, and manage cake design templates
 *
 * Features:
 * - Browse templates by category
 * - Search and filter
 * - Duplicate templates
 * - Share templates with team
 * - Save custom templates
 * - Rating and usage stats
 */

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Copy,
  Share2,
  Star,
  Loader,
  AlertCircle,
  Download,
  Eye,
  Trash2,
  Heart,
} from "lucide-react";
import type { CakeTemplate } from "../../shared/types";
import { supabase } from "@/lib/supabase";

interface TemplateGalleryPanelProps {
  onTemplateSelect?: (template: CakeTemplate) => void;
  onTemplateLoad?: (templateId: string) => void;
  bakeryId?: string;
  isAdmin?: boolean;
}

interface TemplateWithStats extends CakeTemplate {
  viewCount?: number;
  isFavorite?: boolean;
  rating?: number;
}

export default function TemplateGalleryPanel({
  onTemplateSelect,
  onTemplateLoad,
  bakeryId = "",
  isAdmin = false,
}: TemplateGalleryPanelProps) {
  const [templates, setTemplates] = useState<TemplateWithStats[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<
    TemplateWithStats[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"recent" | "popular" | "rating">(
    "recent",
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Load templates from Supabase
   */
  const loadTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase.from("cake_templates").select("*");

      if (bakeryId) {
        query = query.eq("bakery_id", bakeryId);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        throw fetchError;
      }

      setTemplates((data || []) as TemplateWithStats[]);
      setFilteredTemplates((data || []) as TemplateWithStats[]);

      // Templates loaded successfully
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load templates";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [bakeryId]);

  /**
   * Filter and sort templates
   */
  const applyFilters = useCallback(() => {
    let result = [...templates];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          false,
      );
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Sort
    if (sortBy === "popular") {
      result.sort(
        (a, b) =>
          (b.metadata?.usage_count || 0) - (a.metadata?.usage_count || 0),
      );
    } else if (sortBy === "rating") {
      result.sort(
        (a, b) => (b.metadata?.rating || 0) - (a.metadata?.rating || 0),
      );
    } else {
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    setFilteredTemplates(result);
  }, [templates, searchQuery, selectedCategory, sortBy]);

  /**
   * Duplicate template
   */
  const handleDuplicateTemplate = useCallback(
    async (template: CakeTemplate) => {
      try {
        setIsSaving(true);

        const newTemplate = {
          ...template,
          name: `${template.name} (Copy)`,
          created_by: bakeryId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          sharing: {
            shared: false,
            shared_with: [],
            can_duplicate: true,
            can_modify: true,
          },
        };

        delete (newTemplate as any).id;

        const { data, error: saveError } = await supabase
          .from("cake_templates")
          .insert(newTemplate)
          .select()
          .single();

        if (saveError) {
          throw saveError;
        }

        // Template duplicated, reload
        // Reload templates
        await loadTemplates();

        // Notify user
        onTemplateLoad?.(data?.id);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to duplicate";
        console.error("[TemplateGallery] Duplicate error:", errorMessage);
        setError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [bakeryId, loadTemplates, onTemplateLoad],
  );

  /**
   * Delete template
   */
  const handleDeleteTemplate = useCallback(
    async (templateId: string) => {
      if (!confirm("Are you sure you want to delete this template?")) {
        return;
      }

      try {
        setIsSaving(true);

        const { error: deleteError } = await supabase
          .from("cake_templates")
          .delete()
          .eq("id", templateId);

        if (deleteError) {
          throw deleteError;
        }

        // Template deleted, reload
        // Reload templates
        await loadTemplates();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete";
        setError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [loadTemplates],
  );

  /**
   * Share template
   */
  const handleShareTemplate = useCallback(
    async (templateId: string, shareWith: string[]) => {
      try {
        setIsSaving(true);

        const template = templates.find((t) => t.id === templateId);
        if (!template) return;

        const { error: updateError } = await supabase
          .from("cake_templates")
          .update({
            sharing: {
              shared: true,
              shared_with: shareWith,
              can_duplicate: true,
              can_modify: false,
            },
          })
          .eq("id", templateId);

        if (updateError) {
          throw updateError;
        }

        // Template shared, reload
        await loadTemplates();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to share";
        // Share failed, error already captured
        setError(errorMessage);
      } finally {
        setIsSaving(false);
      }
    },
    [templates, loadTemplates],
  );

  // Load templates on mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Apply filters when search/category/sort changes
  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, sortBy, applyFilters]);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Template Gallery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search bar */}
          <div>
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Filters and sorting */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div>
              <label className="text-sm font-semibold block mb-2">
                Category
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="wedding">Wedding</SelectItem>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="corporate">Corporate</SelectItem>
                  <SelectItem value="seasonal">Seasonal</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                Sort by
              </label>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-semibold block mb-2">
                View Mode
              </label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="flex-1"
                >
                  Grid
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("list")}
                  className="flex-1"
                >
                  List
                </Button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-sm text-gray-600">
            Showing {filteredTemplates.length} of {templates.length} templates
          </p>
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <p className="font-semibold text-red-800">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <Card>
          <CardContent className="py-12">
            <div className="flex justify-center items-center gap-3">
              <Loader className="animate-spin" size={24} />
              <span>Loading templates...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Templates grid/list */}
      {!isLoading && filteredTemplates.length > 0 && (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
              : "space-y-3"
          }
        >
          {filteredTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer hover:shadow-lg transition-shadow ${
                selectedTemplate === template.id ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => setSelectedTemplate(template.id)}
            >
              <CardContent className="pt-4 space-y-3">
                {/* Thumbnail */}
                {template.thumbnail_url && (
                  <div className="aspect-video bg-gray-100 rounded overflow-hidden">
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Template info */}
                <div>
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                  )}
                </div>

                {/* Category and stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded">
                    {template.category}
                  </span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <Eye size={14} />
                      {template.metadata?.usage_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={14} />
                      {template.metadata?.rating?.toFixed(1) || "0.0"}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTemplateSelect?.(template);
                    }}
                    className="flex-1"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateTemplate(template);
                    }}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Duplicate
                  </Button>
                  {isAdmin && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareTemplate(template.id, []);
                        }}
                      >
                        <Share2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(template.id);
                        }}
                        disabled={isSaving}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Heart size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No templates found</p>
            <p className="text-sm text-gray-400 mt-2">
              Try adjusting your search or filters
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
