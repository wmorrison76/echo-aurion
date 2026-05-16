import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Users, MapPin, TrendingUp } from "lucide-react";
interface EchoEventStudioProps {
  onClose?: () => void;
}
const EchoEventStudioModule: React.FC<EchoEventStudioProps> = ({ onClose }) => {
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800 text-white overflow-hidden">
      {" "}
      {/* Header */}{" "}
      <div className="border-b border-border p-6 backdrop-blur-sm bg-surface">
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
              {" "}
              EchoEvents{" "}
            </h1>{" "}
            <p className="text-slate-300 mt-1">
              Event planning and management studio
            </p>{" "}
          </div>{" "}
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              {" "}
              ✕{" "}
            </button>
          )}{" "}
        </div>{" "}
      </div>{" "}
      {/* Content */}{" "}
      <div className="flex-1 overflow-y-auto p-6">
        {" "}
        <div className="max-w-6xl mx-auto space-y-6">
          {" "}
          {/* Key Features */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {" "}
            <Card className="bg-slate-800/50 border-border hover:border-yellow-500/50 transition-colors">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  {" "}
                  <CalendarDays className="w-5 h-5" /> Event Scheduling{" "}
                </CardTitle>{" "}
                <CardDescription>
                  Plan and organize events with ease
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-slate-300 text-sm">
                  {" "}
                  Create, schedule, and manage events with integrated calendar
                  views, reminders, and conflict detection.{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/50 border-border hover:border-yellow-500/50 transition-colors">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  {" "}
                  <Users className="w-5 h-5" /> Guest Management{" "}
                </CardTitle>{" "}
                <CardDescription>
                  Manage attendees and RSVPs
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-slate-300 text-sm">
                  {" "}
                  Track guest lists, manage invitations, handle RSVPs, and send
                  automated notifications to attendees.{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/50 border-border hover:border-yellow-500/50 transition-colors">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  {" "}
                  <MapPin className="w-5 h-5" /> Venue & Logistics{" "}
                </CardTitle>{" "}
                <CardDescription>
                  Coordinate event logistics
                </CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-slate-300 text-sm">
                  {" "}
                  Manage venues, equipment, seating arrangements, and other
                  event logistics in one centralized platform.{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/50 border-border hover:border-yellow-500/50 transition-colors">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="flex items-center gap-2 text-yellow-400">
                  {" "}
                  <TrendingUp className="w-5 h-5" /> Event Analytics{" "}
                </CardTitle>{" "}
                <CardDescription>Track event performance</CardDescription>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <p className="text-slate-300 text-sm">
                  {" "}
                  Get insights into event attendance, guest satisfaction, and
                  ROI with comprehensive analytics and reporting.{" "}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          {/* Welcome Section */}{" "}
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/30">
            {" "}
            <CardHeader>
              {" "}
              <Badge className="w-fit bg-yellow-500/20 text-yellow-300 border border-yellow-500/50">
                {" "}
                Getting Started{" "}
              </Badge>{" "}
              <CardTitle className="mt-4">
                Welcome to EchoEvents Studio
              </CardTitle>{" "}
              <CardDescription>
                {" "}
                Create and manage events for your hospitality business{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid grid-cols-3 gap-4 text-center">
                {" "}
                <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
                  {" "}
                  <div className="text-2xl font-bold text-yellow-400">
                    0
                  </div>{" "}
                  <div className="text-sm text-slate-400 mt-1">Events</div>{" "}
                </div>{" "}
                <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
                  {" "}
                  <div className="text-2xl font-bold text-yellow-400">
                    0
                  </div>{" "}
                  <div className="text-sm text-slate-400 mt-1">Guests</div>{" "}
                </div>{" "}
                <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-600">
                  {" "}
                  <div className="text-2xl font-bold text-yellow-400">
                    0
                  </div>{" "}
                  <div className="text-sm text-slate-400 mt-1">Venues</div>{" "}
                </div>{" "}
              </div>{" "}
              <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-foreground font-semibold rounded-lg transition-all">
                {" "}
                Create New Event{" "}
              </button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
};
export default EchoEventStudioModule;
