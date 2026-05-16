import React, { useMemo, useState } from "react";
import {
  Bell,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
  CircleDot,
  Archive,
  Loader2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface Notification {
  id: string;
  type:
    | "approval_request"
    | "approval_approved"
    | "approval_rejected"
    | "system";
  title: string;
  message: string;
  relatedId?: string;
  read: boolean;
  archived: boolean;
  createdAt: string;
  priority: "high" | "medium" | "low";
}
const formatTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const getNotificationIcon = (type: string) => {
  switch (type) {
    case "approval_request":
      return <Clock className="w-5 h-5 text-amber-600" />;
    case "approval_approved":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "approval_rejected":
      return <XCircle className="w-5 h-5 text-red-600" />;
    case "system":
      return <AlertCircle className="w-5 h-5 text-primary" />;
    default:
      return <Bell className="w-5 h-5 text-muted-foreground" />;
  }
};
const getNotificationColor = (type: string, priority: string) => {
  if (priority === "high") {
    return "bg-red-50 border-red-200";
  }
  switch (type) {
    case "approval_request":
      return "bg-amber-50 border-amber-200";
    case "approval_approved":
      return "bg-green-50 border-green-200";
    case "approval_rejected":
      return "bg-red-50 border-red-200";
    case "system":
      return "bg-blue-50 border-blue-200";
    default:
      return "bg-surface border-border";
  }
};
interface NotificationPanelProps {
  onNotificationClick?: (notification: Notification) => void;
  maxHeight?: string;
}
export function NotificationPanel({
  onNotificationClick,
  maxHeight = "max-h-96",
}: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: "notif_1",
      type: "approval_request",
      title: "New Approval Request",
      message: "Invoice INV-2024-001 from ACME Corp requires your approval",
      relatedId: "appreq_123",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
      priority: "high",
    },
    {
      id: "notif_2",
      type: "approval_approved",
      title: "Approval Completed",
      message: "Your approval of Journal Entry JE-2024-015 has been confirmed",
      relatedId: "je_456",
      read: false,
      archived: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      priority: "medium",
    },
    {
      id: "notif_3",
      type: "approval_request",
      title: "Payment Approval Pending",
      message: "Payment of $5,000.00 to Vendor XYZ needs your review",
      relatedId: "pay_789",
      read: true,
      archived: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      priority: "medium",
    },
  ]);
  const [filterType, setFilterType] = useState("");
  const [filterRead, setFilterRead] = useState("unread");
  const [loading, setLoading] = useState(false);
  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((notif) => !notif.archived)
      .filter((notif) => filterType === "all" || notif.type === filterType)
      .filter((notif) => {
        if (filterRead === "unread") return !notif.read;
        if (filterRead === "read") return notif.read;
        return true;
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [notifications, filterType, filterRead]);
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read && !n.archived).length,
    [notifications],
  );
  const markAsRead = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  };
  const markAsUnread = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, read: false } : n)),
    );
  };
  const archiveNotification = (id: string) => {
    setNotifications(
      notifications.map((n) => (n.id === id ? { ...n, archived: true } : n)),
    );
  };
  const deleteNotification = (id: string) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };
  const markAllAsRead = () => {
    setNotifications(notifications.map((n) => ({ ...n, read: true })));
  };
  return (
    <div className="space-y-4">
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Bell className="w-5 h-5 text-foreground" />{" "}
          <h3 className="font-semibold text-foreground">Notifications</h3>{" "}
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-red-600 text-white">
              {" "}
              {unreadCount}{" "}
            </span>
          )}{" "}
        </div>{" "}
        {unreadCount > 0 && (
          <Button
            onClick={markAllAsRead}
            variant="ghost"
            size="sm"
            className="text-xs"
          >
            {" "}
            Mark all as read{" "}
          </Button>
        )}{" "}
      </div>{" "}
      {/* Filters */}{" "}
      <div className="flex gap-2">
        {" "}
        <Select value={filterType} onValueChange={setFilterType}>
          {" "}
          <SelectTrigger className="h-8 text-xs flex-1">
            {" "}
            <SelectValue placeholder="All types" />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="all">All types</SelectItem>{" "}
            <SelectItem value="approval_request">Approval Requests</SelectItem>{" "}
            <SelectItem value="approval_approved">Approvals</SelectItem>{" "}
            <SelectItem value="approval_rejected">Rejections</SelectItem>{" "}
            <SelectItem value="system">System</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
        <Select value={filterRead} onValueChange={setFilterRead}>
          {" "}
          <SelectTrigger className="h-8 text-xs flex-1">
            {" "}
            <SelectValue placeholder="All" />{" "}
          </SelectTrigger>{" "}
          <SelectContent>
            {" "}
            <SelectItem value="all">All</SelectItem>{" "}
            <SelectItem value="unread">Unread</SelectItem>{" "}
            <SelectItem value="read">Read</SelectItem>{" "}
          </SelectContent>{" "}
        </Select>{" "}
      </div>{" "}
      {/* Notifications List */}{" "}
      <div className={cn("space-y-2 overflow-y-auto", maxHeight)}>
        {" "}
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                "border rounded-lg p-3 cursor-pointer transition-colors hover:bg-opacity-75",
                getNotificationColor(notif.type, notif.priority),
                !notif.read && "border-l-4",
              )}
              onClick={() => {
                markAsRead(notif.id);
                onNotificationClick?.(notif);
              }}
            >
              {" "}
              <div className="flex items-start gap-3">
                {" "}
                <div className="flex-shrink-0 mt-0.5">
                  {" "}
                  {getNotificationIcon(notif.type)}{" "}
                </div>{" "}
                <div className="flex-1 min-w-0">
                  {" "}
                  <div className="flex items-start justify-between mb-1">
                    {" "}
                    <h4 className="font-semibold text-sm text-foreground truncate">
                      {" "}
                      {notif.title}{" "}
                    </h4>{" "}
                    {!notif.read && (
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary ml-2"></div>
                    )}{" "}
                  </div>{" "}
                  <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                    {" "}
                    {notif.message}{" "}
                  </p>{" "}
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {formatTime(notif.createdAt)}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex gap-1 flex-shrink-0">
                  {" "}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      notif.read
                        ? markAsUnread(notif.id)
                        : markAsRead(notif.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title={notif.read ? "Mark as unread" : "Mark as read"}
                  >
                    {" "}
                    {notif.read ? (
                      <CircleDot className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}{" "}
                  </Button>{" "}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      archiveNotification(notif.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Archive"
                  >
                    {" "}
                    <Archive className="w-3 h-3" />{" "}
                  </Button>{" "}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notif.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                    title="Delete"
                  >
                    {" "}
                    <Trash2 className="w-3 h-3" />{" "}
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            {" "}
            <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2" />{" "}
            <p className="text-xs text-muted-foreground">
              {" "}
              {notifications.length === 0
                ? "No notifications"
                : "No notifications match your filters"}{" "}
            </p>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Footer */}{" "}
      {notifications.length > filteredNotifications.length && (
        <div className="text-center pt-2 border-t">
          {" "}
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setNotifications(notifications.filter((n) => !n.archived));
            }}
          >
            {" "}
            Show archived ({notifications.filter((n) => n.archived).length}
            ){" "}
          </Button>{" "}
        </div>
      )}{" "}
    </div>
  );
}
