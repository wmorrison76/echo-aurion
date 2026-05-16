import React, { useCallback, useEffect, useMemo, useState } from "react";
import { get, post, put, del } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Pencil, Users } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
};

type ContactsResponse = {
  success: boolean;
  total: number;
  contacts: Contact[];
  limit: number;
  offset: number;
};

const ContactFormSchema = {
  name: "",
  email: "",
  phone: "",
  company: "",
  notes: "",
};

export default function ClientsPage() {
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(ContactFormSchema);

  const fetchContacts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await get<ContactsResponse>(
        `/api/crm/contacts?limit=100&offset=0&search=${encodeURIComponent(search)}`,
      );
      setContacts(Array.isArray(res?.contacts) ? res.contacts : []);
      setTotal(typeof res?.total === "number" ? res.total : 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch clients");
      setContacts([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filtered = useMemo(() => contacts, [contacts]);

  const openCreate = () => {
    setEditing(null);
    setForm(ContactFormSchema);
    setIsDialogOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setForm({
      name: contact.name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const onSave = async () => {
    try {
      setIsSaving(true);
      if (!form.name.trim()) {
        toast({
          title: "Name required",
          description: "Client name is required",
          variant: "destructive",
        });
        return;
      }

      if (editing) {
        await put(`/api/crm/contacts/${editing.id}`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          notes: form.notes.trim() || null,
        });
        toast({ title: "Client updated" });
      } else {
        await post(`/api/crm/contacts`, {
          name: form.name.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          company: form.company.trim() || null,
          notes: form.notes.trim() || null,
        });
        toast({ title: "Client created" });
      }

      setIsDialogOpen(false);
      await fetchContacts();
    } catch (err) {
      toast({
        title: "Save failed",
        description:
          err instanceof Error ? err.message : "Failed to save client",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onDelete = async (contact: Contact) => {
    try {
      await del(`/api/crm/contacts/${contact.id}`);
      toast({ title: "Client deleted" });
      await fetchContacts();
    } catch (err) {
      toast({
        title: "Delete failed",
        description:
          err instanceof Error ? err.message : "Failed to delete client",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Clients</h1>
            <p className="text-muted-foreground">
              Your CRM contacts (used across Prospects, BEOs, and forecasting).
            </p>
          </div>
          <Button className="shadow-glow" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Input
                  placeholder="Search by name, email, or company..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Badge variant="secondary" className="gap-2">
                <Users className="h-3 w-3" />
                {total.toLocaleString()}
              </Badge>
              <Button
                variant="outline"
                onClick={fetchContacts}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Refresh"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Client Directory</CardTitle>
            <CardDescription>
              Contacts stored in the `clients` table.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No clients found</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.phone || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {c.company || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEdit(c)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Client" : "New Client"}</DialogTitle>
            <DialogDescription>
              Saved to CRM contacts immediately.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Company</Label>
              <Input
                value={form.company}
                onChange={(e) =>
                  setForm((p) => ({ ...p, company: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
