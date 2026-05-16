/** * Internal Fulfillment Queue Panel (Patch B) * Hard-gates fulfillment queue actions with RBAC: * - QUEUE_VIEW_ALL: see all requests * - QUEUE_VIEW_OWN: see only own requests * - QUEUE_CREATE_REQUEST: create new requests * - QUEUE_CLAIM: claim a request * - QUEUE_FULFILL: mark request as fulfilled * - QUEUE_CANCEL: cancel a request */ import React, {
  useEffect,
  useState,
} from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  Plus,
  X,
  User,
} from "lucide-react";
import type { User } from "@/../shared/types/genesis-permissions";
import { getCurrentUser } from "@/stores/genesisAuthStore";
import { can } from "@/lib/genesis/permissions/permissionChecks";
import { osBus } from "@/lib/os-bus";
interface FulfillmentRequest {
  requestId: string;
  createdBy: string;
  createdByName: string;
  sourceOutlet: string;
  targetCommissary: string;
  itemName: string;
  quantity: number;
  unit: string;
  priority: "URGENT" | "STANDARD" | "LOW";
  status: "PENDING" | "CLAIMED" | "FULFILLED" | "CANCELLED";
  claimedBy?: string;
  claimedByName?: string;
  createdAt: string;
  dueAt: string;
}
const MOCK_QUEUE: FulfillmentRequest[] = [
  {
    requestId: "req_001",
    createdBy: "user_restaurant",
    createdByName: "Restaurant Manager",
    sourceOutlet: "Kitchen Commissary",
    targetCommissary: "Pastry Station",
    itemName: "All-Purpose Flour",
    quantity: 25,
    unit: "lbs",
    priority: "URGENT",
    status: "PENDING",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    dueAt: new Date(Date.now() + 7200000).toISOString(),
  },
  {
    requestId: "req_002",
    createdBy: "user_banquet",
    createdByName: "Banquet Chef",
    sourceOutlet: "Main Kitchen",
    targetCommissary: "Pastry Station",
    itemName: "Unsalted Butter",
    quantity: 10,
    unit: "lbs",
    priority: "STANDARD",
    status: "CLAIMED",
    claimedBy: "user_commissary",
    claimedByName: "Commissary Staff",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    dueAt: new Date(Date.now() + 3600000).toISOString(),
  },
  {
    requestId: "req_003",
    createdBy: "user_restaurant",
    createdByName: "Restaurant Manager",
    sourceOutlet: "Main Kitchen",
    targetCommissary: "Pastry Station",
    itemName: "Chocolate Chips",
    quantity: 5,
    unit: "lbs",
    priority: "LOW",
    status: "FULFILLED",
    claimedBy: "user_commissary",
    claimedByName: "Commissary Staff",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    dueAt: new Date(Date.now()).toISOString(),
  },
];
function getPriorityColor(priority: FulfillmentRequest["priority"]): string {
  switch (priority) {
    case "URGENT":
      return "bg-red-500/10 border-red-500/30 text-red-200";
    case "STANDARD":
      return "bg-primary/10 border-blue-500/30 text-blue-200";
    case "LOW":
      return "bg-surface/10 border-gray-500/30 text-gray-200";
  }
}
function getStatusIcon(status: FulfillmentRequest["status"]) {
  switch (status) {
    case "PENDING":
      return <Clock className="w-4 h-4" />;
    case "CLAIMED":
      return <User className="w-4 h-4" />;
    case "FULFILLED":
      return <CheckCircle2 className="w-4 h-4" />;
    case "CANCELLED":
      return <X className="w-4 h-4" />;
  }
}
export default function InternalFulfillmentQueuePanel() {
  const [user, setUser] = useState<User | null>(null);
  const [queue, setQueue] = useState<FulfillmentRequest[]>([]);
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "CLAIMED" | "FULFILLED"
  >("PENDING");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setQueue(MOCK_QUEUE);
  }, []);
  const canViewAll = can(user, "QUEUE_VIEW_ALL");
  const canViewOwn = can(user, "QUEUE_VIEW_OWN");
  const canCreate = can(user, "QUEUE_CREATE_REQUEST");
  const canClaim = can(user, "QUEUE_CLAIM");
  const canFulfill = can(user, "QUEUE_FULFILL");
  const canCancel = can(user, "QUEUE_CANCEL"); // Filter queue based on permissions const visibleQueue = canViewAll ? queue : canViewOwn ? queue.filter((r) => r.createdBy === user?.userId) : []; const filteredQueue = filter ==="ALL" ? visibleQueue : visibleQueue.filter((r) => r.status === filter); const handleClaimRequest = (requestId: string) => { if (!canClaim) { setMessage({ type:"error", text:"Insufficient permission: QUEUE_CLAIM", }); return; } setQueue( queue.map((r) => r.requestId === requestId ? { ...r, status:"CLAIMED" as const, claimedBy: user?.userId, claimedByName: user?.name, } : r, ), ); osBus.emit("genesis:queue_request_claimed", { requestId, claimedBy: user?.userId, timestamp: new Date().toISOString(), }); setMessage({ type:"success", text:"Request claimed successfully!", }); setTimeout(() => setMessage(null), 3000); }; const handleFulfillRequest = (requestId: string) => { if (!canFulfill) { setMessage({ type:"error", text:"Insufficient permission: QUEUE_FULFILL", }); return; } setQueue( queue.map((r) => r.requestId === requestId ? { ...r, status:"FULFILLED" as const } : r, ), ); osBus.emit("genesis:queue_request_fulfilled", { requestId, fulfilledBy: user?.userId, timestamp: new Date().toISOString(), }); setMessage({ type:"success", text:"Request fulfilled successfully!", }); setTimeout(() => setMessage(null), 3000); }; const handleCancelRequest = (requestId: string) => { if (!canCancel) { setMessage({ type:"error", text:"Insufficient permission: QUEUE_CANCEL", }); return; } setQueue( queue.map((r) => r.requestId === requestId ? { ...r, status:"CANCELLED" as const } : r, ), ); osBus.emit("genesis:queue_request_cancelled", { requestId, cancelledBy: user?.userId, timestamp: new Date().toISOString(), }); setMessage({ type:"success", text:"Request cancelled successfully!", }); setTimeout(() => setMessage(null), 3000); }; if (!canViewAll && !canViewOwn) { return ( <div className="w-full h-full flex items-center justify-center bg-background p-4"> <Card className="p-6 max-w-md text-center"> <Lock className="w-12 h-12 mx-auto mb-4 text-amber-500" /> <h3 className="text-lg font-semibold text-foreground"> Access Restricted </h3> <p className="text-sm text-foreground/70 mt-2"> You don't have permission to view the fulfillment queue. </p> <p className="text-xs text-foreground/60 mt-3"> Required permission:{""} <code className="bg-foreground/10 px-2 py-1 rounded"> QUEUE_VIEW_ALL </code>{""} or{""} <code className="bg-foreground/10 px-2 py-1 rounded"> QUEUE_VIEW_OWN </code> </p> </Card> </div> ); } const stats = { total: filteredQueue.length, pending: filteredQueue.filter((r) => r.status ==="PENDING").length, claimed: filteredQueue.filter((r) => r.status ==="CLAIMED").length, fulfilled: filteredQueue.filter((r) => r.status ==="FULFILLED").length, }; return ( <div className="w-full h-full flex flex-col bg-background overflow-hidden"> {/* Header */} <div className="flex-shrink-0 border-b border-border/30 p-4"> <div className="flex items-start justify-between gap-3"> <div> <div className="text-lg font-semibold text-foreground"> Internal Fulfillment Queue </div> <div className="text-sm text-foreground/70 mt-1"> Manage internal commissary requests and fulfillment operations </div> </div> <Badge variant="outline">Live</Badge> </div> </div> {/* Content */} <div className="flex-1 overflow-auto p-4 space-y-4"> {/* Message */} {message && ( <Card className={`p-4 flex gap-3 ${ message.type ==="success" ?"bg-green-500/10 border-green-500/30" :"bg-red-500/10 border-red-500/30" }`} > {message.type ==="success" ? ( <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" /> ) : ( <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /> )} <div> <p className={ message.type ==="success" ?"text-green-200" :"text-red-200" } > {message.text} </p> </div> </Card> )} {/* Stats */} <div className="grid grid-cols-4 gap-3"> <Card className="p-3"> <div className="text-xs text-foreground/70">Total</div> <div className="text-2xl font-bold text-foreground"> {stats.total} </div> </Card> <Card className="p-3"> <div className="text-xs text-foreground/70">Pending</div> <div className="text-2xl font-bold text-orange-500"> {stats.pending} </div> </Card> <Card className="p-3"> <div className="text-xs text-foreground/70">Claimed</div> <div className="text-2xl font-bold text-blue-500"> {stats.claimed} </div> </Card> <Card className="p-3"> <div className="text-xs text-foreground/70">Fulfilled</div> <div className="text-2xl font-bold text-green-500"> {stats.fulfilled} </div> </Card> </div> {/* Filter */} <div className="flex gap-2"> {(["ALL","PENDING","CLAIMED","FULFILLED"] as const).map((f) => ( <Button key={f} variant={filter === f ?"default" :"outline"} size="sm" onClick={() => setFilter(f)} > {f ==="ALL" ?"All" : f} </Button> ))} </div> {/* Queue Items */} <div className="space-y-3"> {filteredQueue.length === 0 ? ( <Card className="p-8 text-center"> <Clock className="w-12 h-12 mx-auto mb-3 text-foreground/30" /> <p className="text-foreground/70"> {canViewOwn && !canViewAll ?"No requests created by you" :"Queue is empty"} </p> </Card> ) : ( filteredQueue.map((request) => ( <Card key={request.requestId} className={`p-4 border transition-colors ${ request.status ==="FULFILLED" ?"border-green-500/30 bg-green-500/5 opacity-75" : request.status ==="CANCELLED" ?"border-gray-500/30 bg-surface/5 opacity-75" :"border-border/30" }`} > <div className="space-y-3"> {/* Header */} <div className="flex items-start justify-between gap-3"> <div className="flex-1"> <div className="flex items-center gap-2 mb-1"> <span className="font-semibold text-foreground"> {request.itemName} </span> <Badge variant="secondary" className={`${getPriorityColor(request.priority)} border`} > {request.priority} </Badge> </div> <p className="text-sm text-foreground/70"> {request.quantity} {request.unit} •{""} {request.sourceOutlet} → {request.targetCommissary} </p> </div> <div className="flex items-center gap-2 text-sm"> {getStatusIcon(request.status)} <Badge variant="outline">{request.status}</Badge> </div> </div> {/* Details */} <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs"> <div> <span className="text-foreground/60">Created by</span> <div className="font-medium text-foreground"> {request.createdByName} </div> </div> {request.claimedBy && ( <div> <span className="text-foreground/60">Claimed by</span> <div className="font-medium text-foreground"> {request.claimedByName} </div> </div> )} <div> <span className="text-foreground/60">Created</span> <div className="font-medium text-foreground"> {new Date(request.createdAt).toLocaleString()} </div> </div> <div> <span className="text-foreground/60">Due</span> <div className="font-medium text-foreground"> {new Date(request.dueAt).toLocaleString()} </div> </div> </div> {/* Actions */} {request.status ==="PENDING" && ( <div className="flex gap-2 pt-2 border-t border-border/30"> <Button size="sm" variant="default" onClick={() => handleClaimRequest(request.requestId)} disabled={!canClaim} title={ !canClaim ?"Missing permission: QUEUE_CLAIM" : undefined } > Claim </Button> </div> )} {request.status ==="CLAIMED" && ( <div className="flex gap-2 pt-2 border-t border-border/30"> <Button size="sm" variant="default" onClick={() => handleFulfillRequest(request.requestId)} disabled={!canFulfill} title={ !canFulfill ?"Missing permission: QUEUE_FULFILL" : undefined } > Fulfill </Button> <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request.requestId)} disabled={!canCancel} title={ !canCancel ?"Missing permission: QUEUE_CANCEL" : undefined } > Cancel </Button> </div> )} {request.status ==="PENDING" && ( <div className="flex gap-2 pt-2 border-t border-border/30"> <Button size="sm" variant="outline" onClick={() => handleCancelRequest(request.requestId)} disabled={!canCancel} title={ !canCancel ?"Missing permission: QUEUE_CANCEL" : undefined } > Cancel </Button> </div> )} </div> </Card> )) )} </div> </div> {/* Footer */} <div className="flex-shrink-0 border-t border-border/30 p-4 bg-background"> {!canCreate && ( <p className="text-sm text-amber-600 dark:text-amber-400 flex gap-2 mb-2"> <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" /> You don't have permission to create requests. </p> )} <Button onClick={() => setShowCreateForm(!showCreateForm)} disabled={!canCreate} className="w-full" size="lg" > <Plus className="w-4 h-4 mr-2" /> Create Request </Button> </div> </div> );
}
