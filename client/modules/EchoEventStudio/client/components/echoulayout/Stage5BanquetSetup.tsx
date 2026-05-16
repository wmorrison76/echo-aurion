import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChefHat, Users, Clock } from "lucide-react";
interface Stage5BanquetSetupProps {
  session: any;
  onComplete: () => void;
}
export default function Stage5BanquetSetup({
  session,
  onComplete,
}: Stage5BanquetSetupProps) {
  const [eventType, setEventType] = useState("wedding");
  const [guestCount, setGuestCount] = useState(200);
  const [eventDate, setEventDate] = useState("");
  return (
    <div className="space-y-8">
      {" "}
      <div>
        {" "}
        <h2 className="text-2xl font-bold mb-2">
          Stage 5: Banquet Event Setup
        </h2>{" "}
        <p className="text-muted-foreground">
          {" "}
          Configure banquet details, equipment, and catering requirements{" "}
        </p>{" "}
      </div>{" "}
      <Tabs defaultValue="event" className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-3">
          {" "}
          <TabsTrigger value="event">
            {" "}
            <Users className="h-4 w-4 mr-2" /> Event Details{" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="buffet">
            {" "}
            <ChefHat className="h-4 w-4 mr-2" /> Buffet Setup{" "}
          </TabsTrigger>{" "}
          <TabsTrigger value="equipment">
            {" "}
            <Clock className="h-4 w-4 mr-2" /> Equipment{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Event Details */}{" "}
        <TabsContent value="event">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Event Details</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Event Type
                  </label>{" "}
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    {" "}
                    <option value="wedding">Wedding Reception</option>{" "}
                    <option value="corporate">Corporate Event</option>{" "}
                    <option value="private">Private Party</option>{" "}
                    <option value="gala">Gala Dinner</option>{" "}
                    <option value="fundraiser">Fundraiser</option>{" "}
                    <option value="conference">Conference</option>{" "}
                  </select>{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Guest Count
                  </label>{" "}
                  <input
                    type="number"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Event Date
                  </label>{" "}
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm font-medium mb-2 block">
                    Service Style
                  </label>{" "}
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {" "}
                    <option>Plated Service</option>{" "}
                    <option>Buffet Service</option>{" "}
                    <option>Cocktail Reception</option>{" "}
                    <option>Family Style</option>{" "}
                  </select>{" "}
                </div>{" "}
              </div>{" "}
              <div>
                {" "}
                <label className="text-sm font-medium mb-2 block">
                  Special Requirements
                </label>{" "}
                <textarea
                  className="w-full px-3 py-2 border rounded-lg h-24"
                  placeholder="Any special dietary needs, accessibility requirements, etc."
                />{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Buffet Setup */}{" "}
        <TabsContent value="buffet">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Buffet Configuration</CardTitle>{" "}
              <CardDescription>
                {" "}
                Design your buffet stations with food, beverages, and serving
                equipment{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <div className="font-semibold">
                      Main Buffet Station
                    </div>{" "}
                    <div className="text-sm text-muted-foreground">
                      Appetizers, Main Courses
                    </div>{" "}
                  </div>{" "}
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>{" "}
                </div>{" "}
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <div className="font-semibold">Beverage Station</div>{" "}
                    <div className="text-sm text-muted-foreground">
                      Bar, Coffee, Water
                    </div>{" "}
                  </div>{" "}
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>{" "}
                </div>{" "}
                <div className="p-4 border rounded-lg flex items-center justify-between">
                  {" "}
                  <div>
                    {" "}
                    <div className="font-semibold">Dessert Station</div>{" "}
                    <div className="text-sm text-muted-foreground">
                      Cake, Pastries, Chocolate
                    </div>{" "}
                  </div>{" "}
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
              <Button variant="outline" className="w-full">
                {" "}
                + Add Buffet Station{" "}
              </Button>{" "}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
                {" "}
                <p className="text-blue-900">
                  {" "}
                  Equipment like chaffers, cutting boards, lights, and serving
                  utensils can be placed on each station.{" "}
                </p>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Equipment */}{" "}
        <TabsContent value="equipment">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Catering Equipment Checklist</CardTitle>{" "}
              <CardDescription>
                {" "}
                Required equipment and supplies for the banquet{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="space-y-2">
                {" "}
                {[
                  "Chaffers (Full Size)",
                  "Chaffers (Half Size)",
                  "Cutting Boards",
                  "Serving Utensils",
                  "Heat Lamps",
                  "Beverage Stands",
                  "Linens",
                  "Napkins",
                ].map((item, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded"
                  >
                    {" "}
                    <input type="checkbox" className="w-4 h-4" />{" "}
                    <span className="text-sm">{item}</span>{" "}
                  </label>
                ))}{" "}
              </div>{" "}
              <Button variant="outline" className="w-full">
                {" "}
                + Add Custom Equipment Item{" "}
              </Button>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2 justify-end">
        {" "}
        <Button variant="outline">Skip for Now</Button>{" "}
        <Button onClick={onComplete}>Continue to Next Stage</Button>{" "}
      </div>{" "}
    </div>
  );
}
