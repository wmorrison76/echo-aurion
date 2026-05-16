import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface Stage1SetupProps {
  session: any;
  onComplete: () => void;
}
interface Venue {
  id: string;
  name: string;
  location?: string;
  total_sqft?: number;
}
interface Room {
  id: string;
  venue_id: string;
  name: string;
  room_type: string;
  width_ft: number;
  depth_ft: number;
  capacity?: number;
}
const ROOM_TYPES = [
  { value: "ballroom", label: "Ballroom" },
  { value: "banquet", label: "Banquet Hall" },
  { value: "dining", label: "Dining Room" },
  { value: "cocktail", label: "Cocktail Lounge" },
  { value: "conference", label: "Conference Room" },
  { value: "garden", label: "Garden/Outdoor" },
  { value: "pool", label: "Pool Area" },
];
export default function Stage1Setup({ session, onComplete }: Stage1SetupProps) {
  const { toast } = useToast();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedVenue, setSelectedVenue] = useState<string>(
    session.venue_id || "",
  );
  const [selectedRoom, setSelectedRoom] = useState<string>(
    session.room_id || "",
  );
  const [showNewVenue, setShowNewVenue] = useState(false);
  const [showNewRoom, setShowNewRoom] = useState(false);
  const [newVenueName, setNewVenueName] = useState("");
  const [newRoomData, setNewRoomData] = useState({
    name: "",
    room_type: "ballroom",
    width_ft: 0,
    depth_ft: 0,
    capacity: 0,
  });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    loadVenues();
  }, []);
  useEffect(() => {
    if (selectedVenue) {
      loadRooms(selectedVenue);
    }
  }, [selectedVenue]);
  const loadVenues = async () => {
    try {
      const { data, error } = await supabase
        .from("venues")
        .select("*")
        .order("name");
      if (error) throw error;
      setVenues(data || []);
    } catch (error) {
      console.error("Failed to load venues:", error);
      toast({ title: "Failed to load venues", variant: "destructive" });
    }
  };
  const loadRooms = async (venueId: string) => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("venue_id", venueId)
        .order("name");
      if (error) throw error;
      setRooms(data || []);
    } catch (error) {
      console.error("Failed to load rooms:", error);
      toast({ title: "Failed to load rooms", variant: "destructive" });
    }
  };
  const createVenue = async () => {
    if (!newVenueName.trim()) {
      toast({ title: "Please enter a venue name" });
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("venues")
        .insert({ name: newVenueName })
        .select()
        .single();
      if (error) throw error;
      setVenues([...venues, data]);
      setSelectedVenue(data.id);
      setNewVenueName("");
      setShowNewVenue(false);
      toast({ title: "Venue created successfully" });
    } catch (error) {
      console.error("Failed to create venue:", error);
      toast({ title: "Failed to create venue", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const createRoom = async () => {
    if (!selectedVenue || !newRoomData.name.trim()) {
      toast({ title: "Please fill in all required fields" });
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("rooms")
        .insert({
          venue_id: selectedVenue,
          name: newRoomData.name,
          room_type: newRoomData.room_type,
          width_ft: newRoomData.width_ft,
          depth_ft: newRoomData.depth_ft,
          capacity: newRoomData.capacity,
        })
        .select()
        .single();
      if (error) throw error;
      setRooms([...rooms, data]);
      setSelectedRoom(data.id);
      setNewRoomData({
        name: "",
        room_type: "ballroom",
        width_ft: 0,
        depth_ft: 0,
        capacity: 0,
      });
      setShowNewRoom(false);
      toast({ title: "Room created successfully" });
    } catch (error) {
      console.error("Failed to create room:", error);
      toast({ title: "Failed to create room", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const handleComplete = async () => {
    if (!selectedVenue || !selectedRoom) {
      toast({ title: "Please select a venue and room" });
      return;
    }
    try {
      const { error } = await supabase
        .from("layout_sessions")
        .update({ venue_id: selectedVenue, room_id: selectedRoom })
        .eq("id", session.id);
      if (error) throw error;
      toast({ title: "Setup complete! Proceeding to next stage." });
      onComplete();
    } catch (error) {
      console.error("Failed to save setup:", error);
      toast({ title: "Failed to save setup", variant: "destructive" });
    }
  };
  const selectedRoomData = rooms.find((r) => r.id === selectedRoom);
  return (
    <div className="space-y-8">
      {" "}
      <div>
        {" "}
        <h2 className="text-2xl font-bold mb-2">
          Stage 1: Setup Your Space
        </h2>{" "}
        <p className="text-muted-foreground">
          {" "}
          Select or create a venue and room. Provide basic dimensions for
          reference.{" "}
        </p>{" "}
      </div>{" "}
      {/* Venue Selection */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Select Venue</CardTitle>{" "}
          <CardDescription>
            Choose an existing venue or create a new one
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          <div className="space-y-2">
            {" "}
            <label className="text-sm font-medium">Venue</label>{" "}
            <div className="flex gap-2">
              {" "}
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                {" "}
                <SelectTrigger className="flex-1">
                  {" "}
                  <SelectValue placeholder="Choose a venue" />{" "}
                </SelectTrigger>{" "}
                <SelectContent>
                  {" "}
                  {venues.map((venue) => (
                    <SelectItem key={venue.id} value={venue.id}>
                      {" "}
                      {venue.name}{" "}
                    </SelectItem>
                  ))}{" "}
                </SelectContent>{" "}
              </Select>{" "}
              <Button
                variant="outline"
                onClick={() => setShowNewVenue(!showNewVenue)}
              >
                {" "}
                New Venue{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
          {showNewVenue && (
            <div className="space-y-2 p-4 bg-slate-50 rounded-lg">
              {" "}
              <input
                type="text"
                placeholder="Venue name (e.g., Grand Resort)"
                value={newVenueName}
                onChange={(e) => setNewVenueName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              />{" "}
              <div className="flex gap-2">
                {" "}
                <Button
                  onClick={createVenue}
                  disabled={loading}
                  className="flex-1"
                >
                  {" "}
                  Create Venue{" "}
                </Button>{" "}
                <Button
                  variant="outline"
                  onClick={() => setShowNewVenue(false)}
                  className="flex-1"
                >
                  {" "}
                  Cancel{" "}
                </Button>{" "}
              </div>{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Room Selection */}{" "}
      {selectedVenue && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Select or Create Room</CardTitle>{" "}
            <CardDescription>
              {" "}
              Add the room details for your layout{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <div className="space-y-2">
              {" "}
              <label className="text-sm font-medium">Room</label>{" "}
              <div className="flex gap-2">
                {" "}
                <Select value={selectedRoom} onValueChange={setSelectedRoom}>
                  {" "}
                  <SelectTrigger className="flex-1">
                    {" "}
                    <SelectValue placeholder="Choose a room" />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {" "}
                        {room.name} ({room.room_type}){" "}
                      </SelectItem>
                    ))}{" "}
                  </SelectContent>{" "}
                </Select>{" "}
                <Button
                  variant="outline"
                  onClick={() => setShowNewRoom(!showNewRoom)}
                >
                  {" "}
                  New Room{" "}
                </Button>{" "}
              </div>{" "}
            </div>{" "}
            {showNewRoom && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
                {" "}
                <div className="grid grid-cols-2 gap-4">
                  {" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Room Name
                    </label>{" "}
                    <input
                      type="text"
                      placeholder="e.g., Ballroom A"
                      value={newRoomData.name}
                      onChange={(e) =>
                        setNewRoomData({ ...newRoomData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Room Type
                    </label>{" "}
                    <Select
                      value={newRoomData.room_type}
                      onValueChange={(value) =>
                        setNewRoomData({ ...newRoomData, room_type: value })
                      }
                    >
                      {" "}
                      <SelectTrigger>
                        {" "}
                        <SelectValue />{" "}
                      </SelectTrigger>{" "}
                      <SelectContent>
                        {" "}
                        {ROOM_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {" "}
                            {type.label}{" "}
                          </SelectItem>
                        ))}{" "}
                      </SelectContent>{" "}
                    </Select>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Width (ft)
                    </label>{" "}
                    <input
                      type="number"
                      value={newRoomData.width_ft}
                      onChange={(e) =>
                        setNewRoomData({
                          ...newRoomData,
                          width_ft: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Depth (ft)
                    </label>{" "}
                    <input
                      type="number"
                      value={newRoomData.depth_ft}
                      onChange={(e) =>
                        setNewRoomData({
                          ...newRoomData,
                          depth_ft: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <label className="text-sm font-medium">
                      Capacity (Fire Marshal)
                    </label>{" "}
                    <input
                      type="number"
                      value={newRoomData.capacity}
                      onChange={(e) =>
                        setNewRoomData({
                          ...newRoomData,
                          capacity: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Button
                    onClick={createRoom}
                    disabled={loading}
                    className="flex-1"
                  >
                    {" "}
                    Create Room{" "}
                  </Button>{" "}
                  <Button
                    variant="outline"
                    onClick={() => setShowNewRoom(false)}
                    className="flex-1"
                  >
                    {" "}
                    Cancel{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Room Summary */}{" "}
      {selectedRoomData && (
        <Card className="bg-blue-50 border-blue-200">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-lg">Room Summary</CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="grid grid-cols-2 gap-4 text-sm">
              {" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Venue:</span>{" "}
                <p className="font-semibold">
                  {" "}
                  {venues.find((v) => v.id === selectedVenue)?.name}{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Room:</span>{" "}
                <p className="font-semibold">{selectedRoomData.name}</p>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Type:</span>{" "}
                <p className="font-semibold capitalize">
                  {selectedRoomData.room_type}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Dimensions:</span>{" "}
                <p className="font-semibold">
                  {" "}
                  {selectedRoomData.width_ft}' × {selectedRoomData.depth_ft}
                  '{" "}
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Capacity:</span>{" "}
                <p className="font-semibold">
                  {selectedRoomData.capacity} guests
                </p>{" "}
              </div>{" "}
              <div>
                {" "}
                <span className="text-muted-foreground">Sqft:</span>{" "}
                <p className="font-semibold">
                  {" "}
                  {(
                    selectedRoomData.width_ft * selectedRoomData.depth_ft
                  ).toFixed(0)}{" "}
                  sqft{" "}
                </p>{" "}
              </div>{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2 justify-end">
        {" "}
        <Button variant="outline" disabled={!selectedVenue || !selectedRoom}>
          {" "}
          Skip for Now{" "}
        </Button>{" "}
        <Button
          onClick={handleComplete}
          disabled={!selectedVenue || !selectedRoom || loading}
        >
          {" "}
          Continue to Next Stage{" "}
        </Button>{" "}
      </div>{" "}
    </div>
  );
}
