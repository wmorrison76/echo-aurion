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
import { AlertCircle, Upload, Camera } from "lucide-react";
interface Stage4DesignProps {
  session: any;
  onComplete: () => void;
}
export default function Stage4Design({
  session,
  onComplete,
}: Stage4DesignProps) {
  const [view, setView] = useState<"2d" | "3d">("2d");
  return (
    <div className="space-y-8">
      {" "}
      <div>
        {" "}
        <h2 className="text-2xl font-bold mb-2">
          Stage 4: Design Your Layout
        </h2>{" "}
        <p className="text-muted-foreground">
          {" "}
          Place tables, chairs, equipment, and decor. Add custom items from
          photos.{" "}
        </p>{" "}
      </div>{" "}
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as "2d" | "3d")}
        className="w-full"
      >
        {" "}
        <TabsList className="grid w-full grid-cols-2">
          {" "}
          <TabsTrigger value="2d">2D Layout (Top View)</TabsTrigger>{" "}
          <TabsTrigger value="3d">3D Preview</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* 2D View */}{" "}
        <TabsContent value="2d">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>2D Layout Editor</CardTitle>{" "}
              <CardDescription>
                {" "}
                Drag and drop items to arrange your layout. Click to select and
                drag to move.{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid grid-cols-12 gap-4">
                {" "}
                {/* Asset Palette */}{" "}
                <div className="col-span-3 border rounded-lg p-4 bg-slate-50">
                  {" "}
                  <h3 className="font-semibold mb-4 text-sm">
                    Asset Library
                  </h3>{" "}
                  <div className="space-y-2">
                    {" "}
                    <div className="text-sm font-medium">Tables</div>{" "}
                    <div className="space-y-2 ml-2">
                      {" "}
                      <div className="p-2 bg-background border rounded cursor-move hover:bg-blue-50">
                        {" "}
                        Round 60"{" "}
                      </div>{" "}
                      <div className="p-2 bg-background border rounded cursor-move hover:bg-blue-50">
                        {" "}
                        Round 72"{" "}
                      </div>{" "}
                      <div className="p-2 bg-background border rounded cursor-move hover:bg-blue-50">
                        {" "}
                        Rectangular{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-sm font-medium mt-4">
                      Furniture
                    </div>{" "}
                    <div className="space-y-2 ml-2">
                      {" "}
                      <div className="p-2 bg-background border rounded cursor-move hover:bg-blue-50">
                        {" "}
                        Chairs{" "}
                      </div>{" "}
                      <div className="p-2 bg-background border rounded cursor-move hover:bg-blue-50">
                        {" "}
                        Buffet{" "}
                      </div>{" "}
                    </div>{" "}
                    <div className="text-sm font-medium mt-4">
                      Custom Items
                    </div>{" "}
                    <button className="w-full p-2 border border-dashed border-primary rounded text-primary text-sm hover:bg-blue-50 flex items-center justify-center gap-2">
                      {" "}
                      <Camera className="h-4 w-4" /> Add from Photo{" "}
                    </button>{" "}
                  </div>{" "}
                </div>{" "}
                {/* Canvas */}{" "}
                <div
                  className="col-span-9 border rounded-lg bg-background"
                  style={{ minHeight: "500px" }}
                >
                  {" "}
                  <div className="w-full h-full bg-gradient-to-b from-slate-50 to-white relative overflow-auto">
                    {" "}
                    <div
                      className="absolute inset-0 opacity-10 bg-grid"
                      style={{
                        backgroundImage:
                          "linear-gradient(0deg,transparent 24%,rgba(200,200,200,.05) 25%,rgba(200,200,200,.05) 26%,transparent 27%,transparent 74%,rgba(200,200,200,.05) 75%,rgba(200,200,200,.05) 76%,transparent 77%,transparent),linear-gradient(90deg,transparent 24%,rgba(200,200,200,.05) 25%,rgba(200,200,200,.05) 26%,transparent 27%,transparent 74%,rgba(200,200,200,.05) 75%,rgba(200,200,200,.05) 76%,transparent 77%,transparent)",
                        backgroundSize: "50px 50px",
                      }}
                    />{" "}
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                      {" "}
                      <div className="text-center">
                        {" "}
                        <p>Drag items here to place them</p>{" "}
                        <p className="text-xs mt-2">
                          2D grid snap enabled
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {/* Quick Actions */}{" "}
              <div className="flex gap-2 justify-between">
                {" "}
                <div className="flex gap-2">
                  {" "}
                  <Button variant="outline" size="sm">
                    Snap to Grid
                  </Button>{" "}
                  <Button variant="outline" size="sm">
                    Show Dimensions
                  </Button>{" "}
                </div>{" "}
                <div className="flex gap-2">
                  {" "}
                  <Button variant="outline" size="sm">
                    Undo
                  </Button>{" "}
                  <Button variant="outline" size="sm">
                    Redo
                  </Button>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* 3D View */}{" "}
        <TabsContent value="3d">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>3D Preview</CardTitle>{" "}
              <CardDescription>
                {" "}
                View your layout in 3D with realistic rendering{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div
                className="w-full bg-surface rounded-lg flex items-center justify-center"
                style={{ minHeight: "500px" }}
              >
                {" "}
                <div className="text-center text-slate-400">
                  {" "}
                  <p className="mb-2">3D Canvas Area</p>{" "}
                  <p className="text-xs">Press 'V' to toggle 2D/3D view</p>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
      {/* Custom Item Feature */}{" "}
      <Card className="bg-purple-50 border-purple-200">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="flex items-center gap-2">
            {" "}
            <Camera className="h-5 w-5" /> Add Custom Item from Photo{" "}
          </CardTitle>{" "}
          <CardDescription>
            {" "}
            Don't see what you need? Photograph or video a unique item to add to
            your layout{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <Button variant="outline" className="h-24">
              {" "}
              <div className="text-center">
                {" "}
                <Camera className="h-6 w-6 mx-auto mb-2" />{" "}
                <div className="text-sm">Take Photo</div>{" "}
              </div>{" "}
            </Button>{" "}
            <Button variant="outline" className="h-24">
              {" "}
              <div className="text-center">
                {" "}
                <Upload className="h-6 w-6 mx-auto mb-2" />{" "}
                <div className="text-sm">Upload Image/Video</div>{" "}
              </div>{" "}
            </Button>{" "}
          </div>{" "}
          <p className="text-sm text-purple-900">
            {" "}
            Once added, the system will auto-detect dimensions and you can
            adjust as needed.{" "}
          </p>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Action Buttons */}{" "}
      <div className="flex gap-2 justify-end">
        {" "}
        <Button variant="outline">Skip for Now</Button>{" "}
        <Button onClick={onComplete}>Continue to Next Stage</Button>{" "}
      </div>{" "}
    </div>
  );
}
