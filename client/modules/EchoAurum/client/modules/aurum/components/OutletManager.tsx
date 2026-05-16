import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  MapPin,
} from "lucide-react";
import type { Outlet, OutletType } from "@shared/outlets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchWithLucccaSession } from "../../auth";
const OUTLET_TYPES: { value: OutletType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "spa", label: "Spa" },
  { value: "entertainment", label: "Entertainment" },
  { value: "other", label: "Other" },
];
const OUTLET_TYPE_ICONS: Record<OutletType, React.ReactNode> = {
  hotel: <Building2 className="h-4 w-4" />,
  restaurant: <Building2 className="h-4 w-4" />,
  spa: <Building2 className="h-4 w-4" />,
  entertainment: <Building2 className="h-4 w-4" />,
  other: <Building2 className="h-4 w-4" />,
};
interface NewOutletForm {
  code: string;
  name: string;
  type: OutletType;
  location: string;
  currency: string;
}
export function OutletManager() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<NewOutletForm>({
    code: "",
    name: "",
    type: "hotel",
    location: "",
    currency: "USD",
  });
  useEffect(() => {
    fetchOutlets();
  }, []);
  const fetchOutlets = async () => {
    setLoading(true);
    try {
      const response = await fetchWithLucccaSession("/api/outlets");
      if (response.ok) {
        const data = await response.json();
        setOutlets(data.outlets);
      }
    } catch (error) {
      console.error("Failed to fetch outlets:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleAddOutlet = async () => {
    if (!form.code || !form.name) {
      return;
    }
    try {
      const response = await fetchWithLucccaSession("/api/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (response.ok) {
        const data = await response.json();
        setOutlets([...outlets, data.outlet]);
        setForm({
          code: "",
          name: "",
          type: "hotel",
          location: "",
          currency: "USD",
        });
        setShowForm(false);
      }
    } catch (error) {
      console.error("Failed to create outlet:", error);
    }
  };
  const handleDeleteOutlet = async (id: string) => {
    try {
      await fetchWithLucccaSession(`/api/outlets/${id}`, { method: "DELETE" });
      setOutlets(outlets.filter((o) => o.id !== id));
    } catch (error) {
      console.error("Failed to delete outlet:", error);
    }
  };
  const parentOutlets = outlets.filter((o) => !o.parentId);
  const getChildOutlets = (parentId: string) =>
    outlets.filter((o) => o.parentId === parentId);
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-aurum-200">
            {" "}
            Management{" "}
          </p>{" "}
          <h3 className="mt-2 text-lg font-semibold text-foreground">
            {" "}
            Outlet Configuration{" "}
          </h3>{" "}
          <p className="mt-2 text-sm text-muted-foreground">
            {" "}
            Configure outlets (hotels, restaurants, spas) and define P&L drivers
            for budget forecasting.{" "}
          </p>{" "}
        </div>{" "}
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-aurum-500 hover:bg-aurum-400"
        >
          {" "}
          <Plus className="mr-2 h-4 w-4" /> Add Outlet{" "}
        </Button>{" "}
      </div>{" "}
      {showForm && (
        <div className="space-y-4 rounded-2xl border border-border/40 bg-surface-variant/60 p-5">
          {" "}
          <div className="grid gap-4 sm:grid-cols-2">
            {" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Code{" "}
              </label>{" "}
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="HTL-001"
                className="mt-1"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Name{" "}
              </label>{" "}
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Resort Name"
                className="mt-1"
              />{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Type{" "}
              </label>{" "}
              <Select
                value={form.type}
                onValueChange={(v) =>
                  setForm({ ...form, type: v as OutletType })
                }
              >
                {" "}
                <SelectTrigger className="mt-1">
                  {" "}
                  <SelectValue />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {OUTLET_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {" "}
                      {t.label}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
            </div>{" "}
            <div>
              {" "}
              <label className="text-xs font-semibold text-muted-foreground">
                {" "}
                Location{" "}
              </label>{" "}
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="City, State"
                className="mt-1"
              />{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex gap-2">
            {" "}
            <Button onClick={handleAddOutlet} className="flex-1">
              {" "}
              Create Outlet{" "}
            </Button>{" "}
            <Button
              onClick={() => setShowForm(false)}
              variant="outline"
              className="flex-1"
            >
              {" "}
              Cancel{" "}
            </Button>{" "}
          </div>{" "}
        </div>
      )}{" "}
      <div className="space-y-3">
        {" "}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            {" "}
            <Loader2 className="h-5 w-5 animate-spin text-aurum-300" />{" "}
          </div>
        ) : outlets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/40 p-8 text-center">
            {" "}
            <Building2 className="mx-auto h-8 w-8 text-muted-foreground/40" />{" "}
            <p className="mt-3 text-sm text-muted-foreground">
              {" "}
              No outlets configured yet{" "}
            </p>{" "}
          </div>
        ) : (
          parentOutlets.map((outlet) => {
            const children = getChildOutlets(outlet.id);
            const isExpanded = expandedId === outlet.id;
            return (
              <div key={outlet.id} className="space-y-2">
                {" "}
                <div
                  className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-variant/60 p-4 cursor-pointer hover:bg-surface-variant/80 transition"
                  onClick={() => setExpandedId(isExpanded ? null : outlet.id)}
                >
                  {" "}
                  <div className="flex items-center gap-3 flex-1">
                    {" "}
                    {children.length > 0 && (
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 transition",
                          isExpanded && "rotate-180",
                        )}
                      />
                    )}{" "}
                    {OUTLET_TYPE_ICONS[outlet.type]}{" "}
                    <div className="flex-1">
                      {" "}
                      <p className="font-medium text-foreground">
                        {" "}
                        {outlet.name}{" "}
                      </p>{" "}
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {" "}
                        <span>{outlet.code}</span>{" "}
                        <span className="flex items-center gap-1">
                          {" "}
                          <MapPin className="h-3 w-3" /> {outlet.location}{" "}
                        </span>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    {outlet.status === "active" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                    )}{" "}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(outlet.id);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      {" "}
                      <Edit2 className="h-4 w-4" />{" "}
                    </Button>{" "}
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutlet(outlet.id);
                      }}
                      size="sm"
                      variant="ghost"
                    >
                      {" "}
                      <Trash2 className="h-4 w-4 text-red-400" />{" "}
                    </Button>{" "}
                  </div>{" "}
                </div>{" "}
                {isExpanded && children.length > 0 && (
                  <div className="ml-4 space-y-2 border-l border-border/40 pl-4">
                    {" "}
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 bg-surface/60 p-3"
                      >
                        {" "}
                        <div className="flex items-center gap-3 flex-1">
                          {" "}
                          {OUTLET_TYPE_ICONS[child.type]}{" "}
                          <div>
                            {" "}
                            <p className="text-sm font-medium text-foreground">
                              {" "}
                              {child.name}{" "}
                            </p>{" "}
                            <p className="text-xs text-muted-foreground">
                              {" "}
                              {child.code}{" "}
                            </p>{" "}
                          </div>{" "}
                        </div>{" "}
                        <div className="flex gap-2">
                          {" "}
                          <Button size="sm" variant="ghost">
                            {" "}
                            <Edit2 className="h-3 w-3" />{" "}
                          </Button>{" "}
                          <Button size="sm" variant="ghost">
                            {" "}
                            <Trash2 className="h-3 w-3 text-red-400" />{" "}
                          </Button>{" "}
                        </div>{" "}
                      </div>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>
            );
          })
        )}{" "}
      </div>{" "}
    </div>
  );
}
