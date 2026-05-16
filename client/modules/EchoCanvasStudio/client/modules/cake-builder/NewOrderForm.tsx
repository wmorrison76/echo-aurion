import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export interface OrderIntake {
  id: string;
  clientName: string;
  phone: string;
  eventDate: string;
  theme: string;
  allergies: string;
  notes: string;
}

const KEY = "cake_orders_v1";

function useOrders() {
  const [orders, setOrders] = React.useState<OrderIntake[]>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const add = (o: OrderIntake) =>
    setOrders((arr) => {
      const next = [o, ...arr].slice(0, 100);
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  return { orders, add };
}

export default function NewOrderForm() {
  const { add } = useOrders();
  const [form, setForm] = React.useState<OrderIntake>({
    id: crypto.randomUUID(),
    clientName: "",
    phone: "",
    eventDate: "",
    theme: "",
    allergies: "",
    notes: "",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    add(form);
    alert("Order saved to queue.");
    setForm({
      id: crypto.randomUUID(),
      clientName: "",
      phone: "",
      eventDate: "",
      theme: "",
      allergies: "",
      notes: "",
    });
  };

  return (
    <Card id="order">
      <CardHeader>
        <CardTitle>New Order</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={submit}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div>
            <label className="text-sm">Client Name</label>
            <Input
              value={form.clientName}
              onChange={(e) => setForm({ ...form, clientName: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm">Phone</label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="text-sm">Event Date</label>
            <Input
              type="date"
              value={form.eventDate}
              onChange={(e) => setForm({ ...form, eventDate: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="text-sm">Theme</label>
            <Input
              value={form.theme}
              onChange={(e) => setForm({ ...form, theme: e.target.value })}
              placeholder="Birthday, Holiday, etc."
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Allergies</label>
            <Input
              value={form.allergies}
              onChange={(e) => setForm({ ...form, allergies: e.target.value })}
              placeholder="e.g. nuts, gluten"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-sm">Notes</label>
            <textarea
              className="w-full h-24 rounded-md border bg-background p-2"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button type="submit">Save Order</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
