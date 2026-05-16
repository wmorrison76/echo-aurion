import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  DollarSign,
} from "lucide-react";
interface TaskItem {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  time: string;
}
interface GuestItem {
  id: string;
  name: string;
  status: "checked_in" | "pending" | "no_show";
}
interface DayOfOpsViewProps {
  eventId: string;
  eventName: string;
  eventDate: Date;
  guestCount: number;
  projectedRevenue: number;
}
export const DayOfOpsView: React.FC<DayOfOpsViewProps> = ({
  eventId,
  eventName,
  eventDate,
  guestCount,
  projectedRevenue,
}) => {
  const [tasks, setTasks] = useState<TaskItem[]>([
    {
      id: "1",
      title: "Setup registration table",
      status: "completed",
      time: "08:00 AM",
    },
    {
      id: "2",
      title: "Verify catering arrival",
      status: "in_progress",
      time: "09:30 AM",
    },
    {
      id: "3",
      title: "Final sound check",
      status: "pending",
      time: "10:00 AM",
    },
    { id: "4", title: "Guest arrival", status: "pending", time: "10:30 AM" },
  ]);
  const [guests, setGuests] = useState<GuestItem[]>([
    { id: "1", name: "John Smith", status: "checked_in" },
    { id: "2", name: "Jane Doe", status: "checked_in" },
    { id: "3", name: "Bob Johnson", status: "pending" },
  ]);
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const checkedInGuests = guests.filter(
    (g) => g.status === "checked_in",
  ).length;
  const getTaskIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle size={16} className="text-green-600" />;
      case "in_progress":
        return <Clock size={16} className="text-primary animate-spin" />;
      default:
        return <AlertCircle size={16} className="text-gray-400" />;
    }
  };
  return (
    <div className="space-y-4 p-6 bg-surface">
      {" "}
      {/* Event Summary */}{" "}
      <Card className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white">
        {" "}
        <h2 className="text-lg font-bold">{eventName}</h2>{" "}
        <p className="text-sm text-blue-100 mt-1">
          {" "}
          {eventDate.toLocaleDateString()} • Today{" "}
        </p>{" "}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {" "}
          <div>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {checkedInGuests}/{guestCount}{" "}
            </div>{" "}
            <p className="text-xs text-blue-100">Guests Checked In</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              {completedTasks}/{tasks.length}{" "}
            </div>{" "}
            <p className="text-xs text-blue-100">Tasks Complete</p>{" "}
          </div>{" "}
          <div>
            {" "}
            <div className="text-2xl font-bold">
              {" "}
              ${(projectedRevenue * 0.85).toFixed(0)}{" "}
            </div>{" "}
            <p className="text-xs text-blue-100">Current Revenue</p>{" "}
          </div>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Task Checklist */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {" "}
          <CheckCircle size={18} /> Task Checklist{" "}
        </h3>{" "}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {" "}
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2 hover:bg-surface rounded"
            >
              {" "}
              <div className="flex items-center gap-3 flex-1">
                {" "}
                {getTaskIcon(task.status)}{" "}
                <div>
                  {" "}
                  <p className="text-sm font-medium">{task.title}</p>{" "}
                  <p className="text-xs text-muted-foreground">
                    {task.time}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <Badge
                variant={
                  task.status === "completed"
                    ? "default"
                    : task.status === "in_progress"
                      ? "secondary"
                      : "outline"
                }
                className="text-xs"
              >
                {" "}
                {task.status.replace("_", "")}{" "}
              </Badge>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </Card>{" "}
      {/* Guest Tracking */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {" "}
          <Users size={18} /> Guest Check-in ({checkedInGuests}/{guestCount}
          ){" "}
        </h3>{" "}
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {" "}
          {guests.map((guest) => (
            <div
              key={guest.id}
              className="flex items-center justify-between p-2 hover:bg-surface rounded"
            >
              {" "}
              <div>
                {" "}
                <p className="text-sm font-medium">{guest.name}</p>{" "}
              </div>{" "}
              {guest.status === "checked_in" ? (
                <CheckCircle size={16} className="text-green-600" />
              ) : (
                <Badge variant="outline" className="text-xs">
                  {" "}
                  {guest.status === "no_show" ? "No Show" : "Pending"}{" "}
                </Badge>
              )}{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </Card>{" "}
      {/* Quick Actions */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3">Quick Actions</h3>{" "}
        <div className="grid grid-cols-2 gap-2">
          {" "}
          <Button variant="outline" size="sm" className="w-full">
            {" "}
            <Users size={14} className="mr-2" /> Add Guest{" "}
          </Button>{" "}
          <Button variant="outline" size="sm" className="w-full">
            {" "}
            <DollarSign size={14} className="mr-2" /> Process Payment{" "}
          </Button>{" "}
          <Button variant="outline" size="sm" className="w-full">
            {" "}
            Check Inventory{" "}
          </Button>{" "}
          <Button variant="outline" size="sm" className="w-full">
            {" "}
            Send Alert{" "}
          </Button>{" "}
        </div>{" "}
      </Card>{" "}
      {/* Notes */}{" "}
      <Card className="p-4">
        {" "}
        <h3 className="font-semibold mb-3">Notes</h3>{" "}
        <textarea
          placeholder="Add real-time event notes..."
          className="w-full h-20 p-2 border rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />{" "}
      </Card>{" "}
    </div>
  );
};
