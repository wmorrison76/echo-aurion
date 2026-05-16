import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Plus, Settings, Zap } from "lucide-react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  timezone: string;
  recipe_overrides: number;
  menu_customizations: number;
  created_at: string;
}

export default function MultiLocationWorkspace() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationCity, setNewLocationCity] = useState("");

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLocations(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch locations",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLocation = async () => {
    if (!supabase || !newLocationName.trim() || !newLocationAddress.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("locations")
        .insert({
          name: newLocationName,
          address: newLocationAddress,
          city: newLocationCity,
          timezone: "America/New_York",
        })
        .select()
        .single();

      if (error) throw error;
      setLocations([data, ...locations]);
      setNewLocationName("");
      setNewLocationAddress("");
      setNewLocationCity("");
      setShowCreateDialog(false);
      toast.success("Location created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create location",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!selectedLocation) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Locations</h2>
            <p className="text-sm text-muted-foreground">
              Manage multi-location deployments with local customizations
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Location
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {locations.map((location) => (
            <Card
              key={location.id}
              className="cursor-pointer transition hover:shadow-lg"
              onClick={() => setSelectedLocation(location)}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  {location.name}
                </CardTitle>
                <CardDescription>{location.address}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="text-muted-foreground">City</p>
                  <p className="font-semibold">{location.city}</p>
                </div>
                <div className="text-sm">
                  <p className="text-muted-foreground">Customizations</p>
                  <p className="font-semibold">
                    {location.recipe_overrides} recipe overrides
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  Created {new Date(location.created_at).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showCreateDialog && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Location Name</Label>
                <Input
                  placeholder="Downtown Cafe"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  placeholder="123 Main Street"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  placeholder="New York"
                  value={newLocationCity}
                  onChange={(e) => setNewLocationCity(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleCreateLocation} disabled={loading}>
                  {loading ? "Creating..." : "Create Location"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSelectedLocation(null)}
        >
          ←
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{selectedLocation.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedLocation.address}, {selectedLocation.city}
          </p>
        </div>
      </div>

      <Tabs defaultValue="recipes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="recipes">Recipe Overrides</TabsTrigger>
          <TabsTrigger value="menu">Menu Customizations</TabsTrigger>
        </TabsList>

        <TabsContent value="recipes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recipe Overrides</CardTitle>
              <CardDescription>
                Local recipe modifications for this location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {Array.from({ length: selectedLocation.recipe_overrides }).map(
                  (_, i) => (
                    <Card key={i} className="border-l-4 border-l-blue-500">
                      <CardContent className="flex items-center justify-between pt-6">
                        <div>
                          <p className="font-semibold">
                            Recipe Override {i + 1}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Modified from central version
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </CardContent>
                    </Card>
                  ),
                )}
              </div>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Override
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu Customizations</CardTitle>
              <CardDescription>
                Menu items specific to this location
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {Array.from({
                  length: selectedLocation.menu_customizations,
                }).map((_, i) => (
                  <Card key={i} className="border-l-4 border-l-green-500">
                    <CardContent className="flex items-center justify-between pt-6">
                      <div>
                        <p className="font-semibold">Menu Item {i + 1}</p>
                        <p className="text-sm text-muted-foreground">
                          Location-specific item
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Rollout & Release Waves
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Control when recipe updates are applied to this location
          </p>
          <Button variant="outline" className="w-full gap-2">
            <Settings className="h-4 w-4" />
            Configure Rollout Schedule
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
