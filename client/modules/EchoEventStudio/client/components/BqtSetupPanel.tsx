import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChairIcon,
  Users,
  Utensils,
  Wine,
  TableIcon,
  Plus,
  Minus,
} from "lucide-react";
export interface BqtSetup {
  tables: { type: string; count: number; capacity: number }[];
  chairs: { type: string; count: number }[];
  buffets: { count: number; equipment: string[] }[];
  serviceEquipment: { item: string; quantity: number }[];
}
interface BqtSetupPanelProps {
  guestCount: number;
  serviceStyle: "plated" | "buffet" | "family_style" | "cocktail_reception";
  onSetupChange: (setup: BqtSetup) => void;
  onNext?: () => void;
}
export function BqtSetupPanel({
  guestCount,
  serviceStyle,
  onSetupChange,
  onNext,
}: BqtSetupPanelProps) {
  const [roundTableCount, setRoundTableCount] = useState<number>(
    Math.ceil(guestCount / 8),
  );
  const [roundTableCapacity, setRoundTableCapacity] = useState<number>(8);
  const [rectangleTableCount, setRectangleTableCount] = useState<number>(0);
  const [buffetCount, setBuffetCount] = useState<number>(
    serviceStyle === "buffet" ? Math.ceil(guestCount / 40) : 0,
  );
  const [hasHeadTable, setHasHeadTable] = useState<boolean>(true);
  const [chairType, setChairType] = useState<string>("chiavari-gold"); // Calculate setup based on inputs const calculatedSetup = useMemo(() => { const tables: BqtSetup["tables"] = []; const chairs: BqtSetup["chairs"] = []; const serviceEquipment: BqtSetup["serviceEquipment"] = [ { item:"Dinner Plates", quantity: guestCount }, { item:"Glasses (Water)", quantity: guestCount }, { item:"Napkins", quantity: guestCount * 2 }, ]; // Tables if (roundTableCount > 0) { tables.push({ type: 'Round 60"', count: roundTableCount, capacity: roundTableCapacity, }); } if (rectangleTableCount > 0) { tables.push({ type:"Rectangle 6ft", count: rectangleTableCount, capacity: 6, }); } if (hasHeadTable) { tables.push({ type:"Head Table", count: 1, capacity: 12 }); } // Chairs const totalChairsNeeded = roundTableCount * roundTableCapacity + rectangleTableCount * 6 + (hasHeadTable ? 12 : 0); chairs.push({ type: `${chairType.replace(/-/g,"")}`, count: totalChairsNeeded, }); // Service Equipment based on service style if (serviceStyle ==="buffet") { serviceEquipment.push({ item:"Chafing Dishes", quantity: buffetCount * 3, }); serviceEquipment.push({ item:"Buffet Utensils", quantity: buffetCount * 2, }); serviceEquipment.push({ item:"Serving Spoons", quantity: buffetCount * 3, }); } else if (serviceStyle ==="plated") { serviceEquipment.push({ item:"Charger Plates", quantity: guestCount }); serviceEquipment.push({ item:"Silverware Sets", quantity: guestCount }); serviceEquipment.push({ item:"Bread Plates", quantity: guestCount }); } const buffets: BqtSetup["buffets"] = []; if (buffetCount > 0) { buffets.push({ count: buffetCount, equipment: ["Heat Lamp","Serving Trays","Utensils","Napkins & Plates", ], }); } return { tables, chairs, buffets, serviceEquipment }; }, [ roundTableCount, roundTableCapacity, rectangleTableCount, buffetCount, hasHeadTable, chairType, serviceStyle, guestCount, ]); // Notify parent of changes React.useEffect(() => { onSetupChange(calculatedSetup); }, [calculatedSetup, onSetupChange]); const totalChairs = calculatedSetup.chairs.reduce( (sum, c) => sum + c.count, 0, ); const totalTables = calculatedSetup.tables.reduce( (sum, t) => sum + t.count, 0, ); return ( <div className="space-y-6"> <Card> <CardHeader> <CardTitle>BQT Setup Configuration</CardTitle> <CardDescription> Configure tables, chairs, buffets, and service equipment for{""} {guestCount} guests </CardDescription> </CardHeader> </Card> <Tabs defaultValue="tables" className="space-y-4"> <TabsList className="grid w-full grid-cols-4"> <TabsTrigger value="tables" className="gap-2"> <TableIcon className="h-4 w-4" /> <span className="hidden sm:inline">Tables</span> </TabsTrigger> <TabsTrigger value="chairs" className="gap-2"> <ChairIcon className="h-4 w-4" /> <span className="hidden sm:inline">Chairs</span> </TabsTrigger> <TabsTrigger value="buffets" className="gap-2"> <Utensils className="h-4 w-4" /> <span className="hidden sm:inline">Buffets</span> </TabsTrigger> <TabsTrigger value="equipment" className="gap-2"> <Wine className="h-4 w-4" /> <span className="hidden sm:inline">Equipment</span> </TabsTrigger> </TabsList> <TabsContent value="tables" className="space-y-4"> <Card> <CardHeader> <CardTitle className="text-lg">Table Configuration</CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> {/* Round Tables */} <div className="space-y-3 p-4 border rounded-lg"> <div className="flex items-center justify-between"> <h4 className="font-medium">Round Tables (60")</h4> <Badge variant="outline">{roundTableCount} tables</Badge> </div> <div className="space-y-2"> <div className="space-y-1"> <Label htmlFor="round-count" className="text-sm"> Number of Tables </Label> <div className="flex items-center gap-2"> <Button size="sm" variant="outline" onClick={() => setRoundTableCount(Math.max(0, roundTableCount - 1)) } > <Minus className="h-4 w-4" /> </Button> <Input id="round-count" type="number" value={roundTableCount} onChange={(e) => setRoundTableCount( Math.max(0, parseInt(e.target.value) || 0), ) } className="w-16 text-center" /> <Button size="sm" variant="outline" onClick={() => setRoundTableCount(roundTableCount + 1) } > <Plus className="h-4 w-4" /> </Button> </div> </div> <div className="space-y-1"> <Label htmlFor="round-capacity" className="text-sm"> Capacity per Table </Label> <Select value={roundTableCapacity.toString()} onValueChange={(v) => setRoundTableCapacity(parseInt(v)) } > <SelectTrigger id="round-capacity" className="h-9"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="6">6 guests</SelectItem> <SelectItem value="8">8 guests</SelectItem> <SelectItem value="10">10 guests</SelectItem> <SelectItem value="12">12 guests</SelectItem> </SelectContent> </Select> </div> </div> </div> {/* Rectangle Tables */} <div className="space-y-3 p-4 border rounded-lg"> <div className="flex items-center justify-between"> <h4 className="font-medium">Rectangle Tables (6ft)</h4> <Badge variant="outline"> {rectangleTableCount} tables </Badge> </div> <div className="space-y-2"> <div className="space-y-1"> <Label htmlFor="rect-count" className="text-sm"> Number of Tables </Label> <div className="flex items-center gap-2"> <Button size="sm" variant="outline" onClick={() => setRectangleTableCount( Math.max(0, rectangleTableCount - 1), ) } > <Minus className="h-4 w-4" /> </Button> <Input id="rect-count" type="number" value={rectangleTableCount} onChange={(e) => setRectangleTableCount( Math.max(0, parseInt(e.target.value) || 0), ) } className="w-16 text-center" /> <Button size="sm" variant="outline" onClick={() => setRectangleTableCount(rectangleTableCount + 1) } > <Plus className="h-4 w-4" /> </Button> </div> </div> <p className="text-sm text-muted-foreground"> Capacity: 6 guests per table </p> </div> </div> </div> {/* Head Table */} <div className="p-4 border rounded-lg"> <label className="flex items-center gap-3 cursor-pointer"> <input type="checkbox" checked={hasHeadTable} onChange={(e) => setHasHeadTable(e.target.checked)} className="rounded" /> <div> <p className="font-medium">Include Head Table</p> <p className="text-sm text-muted-foreground"> 6ft table for VIPs (capacity: 12 guests) </p> </div> </label> </div> </CardContent> </Card> </TabsContent> <TabsContent value="chairs" className="space-y-4"> <Card> <CardHeader> <CardTitle className="text-lg">Chair Configuration</CardTitle> <CardDescription> Total chairs needed:{""} <span className="font-semibold">{totalChairs}</span> </CardDescription> </CardHeader> <CardContent className="space-y-4"> <div className="space-y-3"> <div className="space-y-2"> <Label htmlFor="chair-type">Chair Style</Label> <Select value={chairType} onValueChange={setChairType}> <SelectTrigger id="chair-type"> <SelectValue /> </SelectTrigger> <SelectContent> <SelectItem value="chiavari-gold"> Chiavari Gold </SelectItem> <SelectItem value="chiavari-silver"> Chiavari Silver </SelectItem> <SelectItem value="chiavari-white"> Chiavari White </SelectItem> <SelectItem value="napoleon-black"> Napoleon Black </SelectItem> <SelectItem value="folding-white"> Folding White </SelectItem> <SelectItem value="cross-back">Cross Back</SelectItem> </SelectContent> </Select> </div> </div> <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30 rounded"> <p className="text-sm text-blue-900 dark:text-blue-100"> <span className="font-semibold">Recommendation:</span>{""} {totalChairs} {chairType.replace(/-/g,"")} chairs will be required for your setup. </p> </div> </CardContent> </Card> </TabsContent> <TabsContent value="buffets" className="space-y-4"> <Card> <CardHeader> <CardTitle className="text-lg">Buffet Configuration</CardTitle> <CardDescription> Set up buffet stations for food service </CardDescription> </CardHeader> <CardContent className="space-y-4"> {serviceStyle !=="buffet" && ( <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/30 rounded"> <p className="text-sm text-yellow-900 dark:text-yellow-100"> Your service style is set to{""} <span className="font-semibold">{serviceStyle}</span>. Buffets are typically used for buffet service. </p> </div> )} <div className="space-y-3"> <div className="space-y-1"> <Label htmlFor="buffet-count"> Number of Buffet Stations </Label> <div className="flex items-center gap-2"> <Button size="sm" variant="outline" onClick={() => setBuffetCount(Math.max(0, buffetCount - 1)) } > <Minus className="h-4 w-4" /> </Button> <Input id="buffet-count" type="number" value={buffetCount} onChange={(e) => setBuffetCount( Math.max(0, parseInt(e.target.value) || 0), ) } className="w-16 text-center" /> <Button size="sm" variant="outline" onClick={() => setBuffetCount(buffetCount + 1)} > <Plus className="h-4 w-4" /> </Button> </div> <p className="text-xs text-muted-foreground"> Recommended: 1 station per 40 guests </p> </div> </div> </CardContent> </Card> </TabsContent> <TabsContent value="equipment" className="space-y-4"> <Card> <CardHeader> <CardTitle className="text-lg">Service Equipment</CardTitle> </CardHeader> <CardContent> <div className="border rounded-lg overflow-hidden"> <Table> <TableHeader> <TableRow className="bg-muted/50"> <TableHead>Equipment</TableHead> <TableHead className="text-right">Quantity</TableHead> </TableRow> </TableHeader> <TableBody> {calculatedSetup.serviceEquipment.map((item, index) => ( <TableRow key={index}> <TableCell>{item.item}</TableCell> <TableCell className="text-right font-medium"> {item.quantity} </TableCell> </TableRow> ))} </TableBody> </Table> </div> </CardContent> </Card> </TabsContent> </Tabs> {/* Summary Card */} <Card className="border-cyan-200 bg-cyan-50/50"> <CardHeader> <CardTitle className="text-base">Setup Summary</CardTitle> </CardHeader> <CardContent> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> <div className="text-center p-3 bg-background rounded border"> <p className="text-sm text-muted-foreground">Tables</p> <p className="text-2xl font-bold">{totalTables}</p> </div> <div className="text-center p-3 bg-background rounded border"> <p className="text-sm text-muted-foreground">Chairs</p> <p className="text-2xl font-bold">{totalChairs}</p> </div> <div className="text-center p-3 bg-background rounded border"> <p className="text-sm text-muted-foreground">Buffets</p> <p className="text-2xl font-bold">{buffetCount}</p> </div> <div className="text-center p-3 bg-background rounded border"> <p className="text-sm text-muted-foreground">Equipment Items</p> <p className="text-2xl font-bold"> {calculatedSetup.serviceEquipment.length} </p> </div> </div> </CardContent> </Card> {/* Next Button */} <Button onClick={onNext} className="w-full bg-cyan-500 hover:bg-cyan-600"> Review & Generate BEO </Button> </div> );
}
