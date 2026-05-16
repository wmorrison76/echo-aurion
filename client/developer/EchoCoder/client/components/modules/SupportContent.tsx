import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  status: "open" | "in-progress" | "resolved" | "closed";
  category: string;
  submittedBy: string;
  submittedDate: string;
  resolvedDate?: string;
  notes: string[];
}

const defaultTickets: SupportTicket[] = [
  {
    id: "TKT-001",
    title: "Oven temperature calibration needed",
    description:
      "Main convection oven reading 50 degrees higher than set temperature",
    priority: "urgent",
    status: "in-progress",
    category: "Equipment",
    submittedBy: "Chef Marco",
    submittedDate: "2025-01-13",
    notes: [
      "Technician scheduled for Tuesday",
      "Spare oven available in backup kitchen",
    ],
  },
  {
    id: "TKT-002",
    title: "Inventory system syncing issue",
    description: "Pantry stock not updating in system after deliveries",
    priority: "high",
    status: "open",
    category: "Software",
    submittedBy: "Lisa Chen",
    submittedDate: "2025-01-12",
    notes: ["Waiting for vendor contact"],
  },
  {
    id: "TKT-003",
    title: "Special dietary accommodation request",
    description: "Customer requires vegan and gluten-free menu for event",
    priority: "high",
    status: "in-progress",
    category: "Customer Request",
    submittedBy: "Sarah Johnson",
    submittedDate: "2025-01-10",
    notes: ["Menu planning in progress", "Sourcing specialty ingredients"],
  },
  {
    id: "TKT-004",
    title: "Delivery schedule optimization",
    description:
      "Need to consolidate morning deliveries to reduce dock congestion",
    priority: "medium",
    status: "open",
    category: "Operations",
    submittedBy: "Robert Lee",
    submittedDate: "2025-01-09",
    notes: [],
  },
  {
    id: "TKT-005",
    title: "Staff scheduling conflict resolved",
    description: "Coverage arranged for Friday evening service",
    priority: "medium",
    status: "resolved",
    category: "Staffing",
    submittedBy: "Maria Santos",
    submittedDate: "2025-01-08",
    resolvedDate: "2025-01-10",
    notes: ["Extra pay approved", "James Wilson confirmed available"],
  },
];

export default function SupportContent() {
  const [tickets, setTickets] = useState<SupportTicket[]>(defaultTickets);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [newNote, setNewNote] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "open" | "in-progress" | "resolved"
  >("all");

  const filteredTickets = tickets.filter(
    (t) => filterStatus === "all" || t.status === filterStatus,
  );

  const handleAddNote = (ticketId: string) => {
    if (!newNote.trim()) return;

    setTickets(
      tickets.map((t) =>
        t.id === ticketId ? { ...t, notes: [...t.notes, newNote] } : t,
      ),
    );

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({
        ...selectedTicket,
        notes: [...selectedTicket.notes, newNote],
      });
    }

    setNewNote("");
  };

  const handleStatusChange = (
    ticketId: string,
    newStatus: SupportTicket["status"],
  ) => {
    setTickets(
      tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              status: newStatus,
              resolvedDate:
                newStatus === "resolved"
                  ? new Date().toISOString().split("T")[0]
                  : undefined,
            }
          : t,
      ),
    );

    if (selectedTicket?.id === ticketId) {
      setSelectedTicket({
        ...selectedTicket,
        status: newStatus,
        resolvedDate:
          newStatus === "resolved"
            ? new Date().toISOString().split("T")[0]
            : undefined,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      urgent: "bg-red-500/20 text-red-700 dark:text-red-400",
      high: "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      medium: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
      low: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
    };
    return colors[priority as keyof typeof colors] || colors.low;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-3 gap-4 h-full">
      {/* Tickets List */}
      <div className="col-span-1 flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("all")}
          >
            All
          </Button>
          <Button
            variant={filterStatus === "open" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("open")}
          >
            Open
          </Button>
          <Button
            variant={filterStatus === "in-progress" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus("in-progress")}
          >
            Active
          </Button>
        </div>

        <div className="overflow-y-auto space-y-2 flex-1">
          {filteredTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className={`cursor-pointer transition-colors ${
                selectedTicket?.id === ticket.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
              onClick={() => setSelectedTicket(ticket)}
            >
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {ticket.id}
                    </span>
                    <Badge
                      className={getPriorityColor(ticket.priority)}
                      variant="secondary"
                    >
                      {ticket.priority}
                    </Badge>
                  </div>
                  <p className="font-semibold text-sm line-clamp-2">
                    {ticket.title}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {getStatusIcon(ticket.status)}
                    <span className="capitalize">{ticket.status}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Ticket Details */}
      <div className="col-span-2 flex flex-col gap-4">
        {selectedTicket ? (
          <>
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {getStatusIcon(selectedTicket.status)}
                      {selectedTicket.title}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedTicket.id} • {selectedTicket.category}
                    </p>
                  </div>
                  <Badge
                    className={getPriorityColor(selectedTicket.priority)}
                    variant="secondary"
                  >
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Description</p>
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Submitted By
                    </p>
                    <p className="text-sm font-semibold">
                      {selectedTicket.submittedBy}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Submitted Date
                    </p>
                    <p className="text-sm">{selectedTicket.submittedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <div className="flex gap-2 mt-1">
                      <select
                        value={selectedTicket.status}
                        onChange={(e) =>
                          handleStatusChange(
                            selectedTicket.id,
                            e.target.value as SupportTicket["status"],
                          )
                        }
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>
                  </div>
                </div>

                {selectedTicket.resolvedDate && (
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Resolved Date
                    </p>
                    <p className="text-sm">{selectedTicket.resolvedDate}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="max-h-32 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                  {selectedTicket.notes.length > 0 ? (
                    selectedTicket.notes.map((note, idx) => (
                      <div
                        key={idx}
                        className="text-sm bg-white dark:bg-slate-800 p-2 rounded border"
                      >
                        • {note}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No notes yet
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                  <Button
                    onClick={() => handleAddNote(selectedTicket.id)}
                    className="self-end"
                    size="sm"
                  >
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card className="flex items-center justify-center h-full">
            <CardContent>
              <p className="text-muted-foreground">
                Select a ticket to view details
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
