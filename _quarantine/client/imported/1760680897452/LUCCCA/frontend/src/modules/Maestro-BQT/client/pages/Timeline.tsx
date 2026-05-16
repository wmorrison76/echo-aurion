/**
 * Event Timeline - Maestro Banquets
 */
import React from 'react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useBEOStore } from '../stores/beoStore';
import { Calendar, Clock } from 'lucide-react';

export default function Timeline() {
  const { events } = useBEOStore();
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <DashboardLayout title="Event Timeline" subtitle="Chronological view of upcoming events">
      <Card>
        <CardHeader className="border-b"><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Schedule</CardTitle></CardHeader>
        <CardContent className="p-6 space-y-6">
          {sorted.map(ev => (
            <div key={ev.id} className="flex items-start gap-4">
              <div className="w-28 text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-4 w-4" />{new Date(ev.date).toLocaleDateString()}</div>
              <div className="flex-1 p-4 rounded-lg border bg-background/50">
                <div className="font-medium">{ev.title}</div>
                <div className="text-sm text-muted-foreground">{ev.time} • {ev.room} • {ev.guestCount} guests</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
