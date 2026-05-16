import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  hardwareManager,
  type HardwareDevice,
  type DeviceType,
} from "@/lib/hardware";
import { useToast } from "@/hooks/use-toast";
export function DeviceManagementPanel() {
  const { toast } = useToast();
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [discovering, setDiscovering] = useState(false);
  const [selectedType, setSelectedType] = useState<DeviceType | "all">("all");
  const [wifiIp, setWifiIp] = useState("");
  const [wifiPort, setWifiPort] = useState("9100");
  const [connectingWifi, setConnectingWifi] = useState(false);
  const [scannerResolution, setScannerResolution] = useState("300");
  const [scannerColorMode, setScannerColorMode] = useState<
    "color" | "grayscale" | "blackwhite"
  >("color");
  const [scannerAutoFeed, setScannerAutoFeed] = useState(true);
  const [printerQuality, setPrinterQuality] = useState<
    "draft" | "normal" | "high"
  >("normal");
  const [printerDuplex, setPrinterDuplex] = useState(false);
  useEffect(() => {
    loadDevices();
  }, []);
  const loadDevices = async () => {
    try {
      const discovered = await hardwareManager.discoverDevices();
      setDevices(discovered);
    } catch (error) {
      logger.error("Error loading devices:", error);
      toast({
        title: "Error",
        description: "Failed to discover devices",
        variant: "destructive",
      });
    }
  };
  const handleDiscoverDevices = async () => {
    setDiscovering(true);
    try {
      const discovered = await hardwareManager.discoverDevices();
      setDevices(discovered);
      toast({
        title: "Discovery complete",
        description: `Found ${discovered.length} device(s)`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to discover devices",
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };
  const handleRequestUSBDevice = async () => {
    setDiscovering(true);
    try {
      const device = await hardwareManager.requestUSBDevice();
      if (device) {
        setDevices([...devices, device]);
        toast({
          title: "Device connected",
          description: `${device.name} connected successfully`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect USB device",
        variant: "destructive",
      });
    } finally {
      setDiscovering(false);
    }
  };
  const handleConnectWiFi = async () => {
    if (!wifiIp) {
      toast({
        title: "Invalid input",
        description: "Please enter an IP address",
        variant: "destructive",
      });
      return;
    }
    setConnectingWifi(true);
    try {
      const device = await hardwareManager.connectWiFiDevice(
        wifiIp,
        parseInt(wifiPort),
      );
      if (device) {
        setDevices([...devices, device]);
        setWifiIp("");
        setWifiPort("9100");
        toast({
          title: "Device connected",
          description: `${device.name} connected successfully`,
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Could not connect to device",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect WiFi device",
        variant: "destructive",
      });
    } finally {
      setConnectingWifi(false);
    }
  };
  const handleRemoveDevice = (id: string) => {
    hardwareManager.removeDevice(id);
    setDevices(devices.filter((d) => d.id !== id));
    toast({ title: "Device removed", description: "Device has been removed" });
  };
  const handleApplyScannerConfig = async () => {
    try {
      const scanner = hardwareManager.getDevicesByType("scanner")[0];
      if (!scanner) {
        toast({
          title: "Error",
          description: "No scanner device found",
          variant: "destructive",
        });
        return;
      }
      await hardwareManager.setScannerConfig({
        deviceId: scanner.id,
        resolutionDpi: parseInt(scannerResolution),
        colorMode: scannerColorMode,
        autoFeed: scannerAutoFeed,
        duplex: false,
        paperSize: "letter",
      });
      toast({
        title: "Configuration saved",
        description: "Scanner settings have been applied",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply scanner configuration",
        variant: "destructive",
      });
    }
  };
  const handleApplyPrinterConfig = async () => {
    try {
      const printer = hardwareManager.getDevicesByType("printer")[0];
      if (!printer) {
        toast({
          title: "Error",
          description: "No printer device found",
          variant: "destructive",
        });
        return;
      }
      await hardwareManager.setPrinterConfig({
        deviceId: printer.id,
        paperSize: "letter",
        orientation: "portrait",
        quality: printerQuality,
        duplex: printerDuplex,
        colorMode: "color",
      });
      toast({
        title: "Configuration saved",
        description: "Printer settings have been applied",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to apply printer configuration",
        variant: "destructive",
      });
    }
  };
  const filteredDevices =
    selectedType === "all"
      ? devices
      : devices.filter((d) => d.type === selectedType);
  const scanners = devices.filter((d) => d.type === "scanner");
  const printers = devices.filter((d) => d.type === "printer");
  return (
    <div className="space-y-6">
      {" "}
      <Card className="border-2">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Hardware Device Management</CardTitle>{" "}
          <CardDescription>
            {" "}
            Connect and configure scanners, printers, and scales for direct
            integration with your workflow.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          <div className="flex flex-wrap gap-2">
            {" "}
            <Button onClick={handleDiscoverDevices} disabled={discovering}>
              {" "}
              {discovering ? "Discovering..." : "Discover Devices"}{" "}
            </Button>{" "}
            <Button onClick={handleRequestUSBDevice} disabled={discovering}>
              {" "}
              Connect USB Device{" "}
            </Button>{" "}
            <Dialog>
              {" "}
              <DialogTrigger asChild>
                {" "}
                <Button variant="outline">Connect WiFi Device</Button>{" "}
              </DialogTrigger>{" "}
              <DialogContent>
                {" "}
                <DialogHeader>
                  {" "}
                  <DialogTitle>Connect WiFi Device</DialogTitle>{" "}
                  <DialogDescription>
                    {" "}
                    Enter the IP address and port of your WiFi-enabled scanner
                    or printer.{" "}
                  </DialogDescription>{" "}
                </DialogHeader>{" "}
                <div className="space-y-4">
                  {" "}
                  <div>
                    {" "}
                    <Label htmlFor="wifi-ip">IP Address</Label>{" "}
                    <Input
                      id="wifi-ip"
                      placeholder="192.168.1.100"
                      value={wifiIp}
                      onChange={(e) => setWifiIp(e.target.value)}
                    />{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <Label htmlFor="wifi-port">Port</Label>{" "}
                    <Input
                      id="wifi-port"
                      placeholder="9100"
                      value={wifiPort}
                      onChange={(e) => setWifiPort(e.target.value)}
                      type="number"
                    />{" "}
                  </div>{" "}
                </div>{" "}
                <DialogFooter>
                  {" "}
                  <Button
                    onClick={handleConnectWiFi}
                    disabled={connectingWifi || !wifiIp}
                  >
                    {" "}
                    {connectingWifi ? "Connecting..." : "Connect"}{" "}
                  </Button>{" "}
                </DialogFooter>{" "}
              </DialogContent>{" "}
            </Dialog>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Connected Devices</CardTitle>{" "}
          <CardDescription>
            {" "}
            Manage your connected scanners, printers, and other hardware
            devices.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent className="space-y-4">
          {" "}
          <div className="flex gap-2">
            {" "}
            <Select
              value={selectedType}
              onValueChange={(v) => setSelectedType(v as DeviceType | "all")}
            >
              {" "}
              <SelectTrigger className="w-40">
                {" "}
                <SelectValue />{" "}
              </SelectTrigger>{" "}
              <SelectContent>
                {" "}
                <SelectItem value="all">All Devices</SelectItem>{" "}
                <SelectItem value="scanner">Scanners</SelectItem>{" "}
                <SelectItem value="printer">Printers</SelectItem>{" "}
                <SelectItem value="scale">Scales</SelectItem>{" "}
              </SelectContent>{" "}
            </Select>{" "}
          </div>{" "}
          {filteredDevices.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {" "}
              No devices found. Click"Discover Devices" or"Connect USB Device"
              to get started.{" "}
            </div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              {" "}
              <Table>
                {" "}
                <TableHeader>
                  {" "}
                  <TableRow>
                    {" "}
                    <TableHead>Device Name</TableHead>{" "}
                    <TableHead>Type</TableHead>{" "}
                    <TableHead>Connection</TableHead>{" "}
                    <TableHead>Status</TableHead>{" "}
                    <TableHead>IP Address</TableHead>{" "}
                    <TableHead className="text-right">Action</TableHead>{" "}
                  </TableRow>{" "}
                </TableHeader>{" "}
                <TableBody>
                  {" "}
                  {filteredDevices.map((device) => (
                    <TableRow key={device.id}>
                      {" "}
                      <TableCell className="font-medium">
                        {" "}
                        {device.name}{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge variant="outline">{device.type}</Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="capitalize">
                        {" "}
                        {device.connectionType}{" "}
                      </TableCell>{" "}
                      <TableCell>
                        {" "}
                        <Badge
                          variant={device.isConnected ? "secondary" : "outline"}
                        >
                          {" "}
                          {device.isConnected
                            ? "Connected"
                            : "Disconnected"}{" "}
                        </Badge>{" "}
                      </TableCell>{" "}
                      <TableCell className="text-xs text-muted-foreground">
                        {" "}
                        {device.ipAddress || "—"}{" "}
                      </TableCell>{" "}
                      <TableCell className="text-right">
                        {" "}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRemoveDevice(device.id)}
                        >
                          {" "}
                          Remove{" "}
                        </Button>{" "}
                      </TableCell>{" "}
                    </TableRow>
                  ))}{" "}
                </TableBody>{" "}
              </Table>{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
      {scanners.length > 0 && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Scanner Configuration</CardTitle>{" "}
            <CardDescription>
              {" "}
              Configure scanning settings for{""}{" "}
              {scanners[0]?.name || "your scanner"}.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <div className="grid gap-4 md:grid-cols-2">
              {" "}
              <div>
                {" "}
                <Label htmlFor="resolution">Resolution (DPI)</Label>{" "}
                <Select
                  value={scannerResolution}
                  onValueChange={setScannerResolution}
                >
                  {" "}
                  <SelectTrigger id="resolution">
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="150">150 DPI (Draft)</SelectItem>{" "}
                    <SelectItem value="200">200 DPI (Standard)</SelectItem>{" "}
                    <SelectItem value="300">300 DPI (High)</SelectItem>{" "}
                    <SelectItem value="600">
                      600 DPI (Very High)
                    </SelectItem>{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
              <div>
                {" "}
                <Label htmlFor="color-mode">Color Mode</Label>{" "}
                <Select
                  value={scannerColorMode}
                  onValueChange={(v) => setScannerColorMode(v as any)}
                >
                  {" "}
                  <SelectTrigger id="color-mode">
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="color">Color</SelectItem>{" "}
                    <SelectItem value="grayscale">Grayscale</SelectItem>{" "}
                    <SelectItem value="blackwhite">
                      Black & White
                    </SelectItem>{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <Checkbox
                id="auto-feed"
                checked={scannerAutoFeed}
                onCheckedChange={(checked) =>
                  setScannerAutoFeed(checked === true)
                }
              />{" "}
              <Label htmlFor="auto-feed" className="cursor-pointer">
                {" "}
                Enable auto-feed (batch scanning){" "}
              </Label>{" "}
            </div>{" "}
            <Button onClick={handleApplyScannerConfig}>
              {" "}
              Apply Scanner Settings{" "}
            </Button>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      {printers.length > 0 && (
        <Card>
          {" "}
          <CardHeader>
            {" "}
            <CardTitle>Printer Configuration</CardTitle>{" "}
            <CardDescription>
              {" "}
              Configure printing settings for{""}{" "}
              {printers[0]?.name || "your printer"}.{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent className="space-y-4">
            {" "}
            <div className="grid gap-4 md:grid-cols-2">
              {" "}
              <div>
                {" "}
                <Label htmlFor="print-quality">Print Quality</Label>{" "}
                <Select
                  value={printerQuality}
                  onValueChange={(v) => setPrinterQuality(v as any)}
                >
                  {" "}
                  <SelectTrigger id="print-quality">
                    {" "}
                    <SelectValue />{" "}
                  </SelectTrigger>{" "}
                  <SelectContent>
                    {" "}
                    <SelectItem value="draft">Draft</SelectItem>{" "}
                    <SelectItem value="normal">Normal</SelectItem>{" "}
                    <SelectItem value="high">High</SelectItem>{" "}
                  </SelectContent>{" "}
                </Select>{" "}
              </div>{" "}
            </div>{" "}
            <div className="flex items-center gap-2">
              {" "}
              <Checkbox
                id="duplex"
                checked={printerDuplex}
                onCheckedChange={(checked) =>
                  setPrinterDuplex(checked === true)
                }
              />{" "}
              <Label htmlFor="duplex" className="cursor-pointer">
                {" "}
                Enable duplex (double-sided) printing{" "}
              </Label>{" "}
            </div>{" "}
            <Button onClick={handleApplyPrinterConfig}>
              {" "}
              Apply Printer Settings{" "}
            </Button>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Device Capabilities</CardTitle>{" "}
          <CardDescription>
            {" "}
            Available features and specifications for connected devices.{" "}
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          {devices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {" "}
              No devices connected. Connect a device to view its
              capabilities.{" "}
            </p>
          ) : (
            <div className="space-y-4">
              {" "}
              {devices.map((device) => (
                <div key={device.id} className="rounded-lg border p-4">
                  {" "}
                  <h4 className="font-semibold">{device.name}</h4>{" "}
                  <dl className="mt-2 grid gap-2 text-sm">
                    {" "}
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      {" "}
                      <dt className="text-muted-foreground">Vendor</dt>{" "}
                      <dd>{device.vendor}</dd>{" "}
                    </div>{" "}
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      {" "}
                      <dt className="text-muted-foreground">Model</dt>{" "}
                      <dd>{device.model}</dd>{" "}
                    </div>{" "}
                    {device.serialNumber && (
                      <div className="grid grid-cols-[100px_1fr] gap-2">
                        {" "}
                        <dt className="text-muted-foreground">Serial</dt>{" "}
                        <dd>{device.serialNumber}</dd>{" "}
                      </div>
                    )}{" "}
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      {" "}
                      <dt className="text-muted-foreground">
                        Capabilities
                      </dt>{" "}
                      <dd className="flex flex-wrap gap-1">
                        {" "}
                        {device.capabilities.map((cap) => (
                          <Badge
                            key={cap}
                            variant="secondary"
                            className="text-xs"
                          >
                            {" "}
                            {cap}{" "}
                          </Badge>
                        ))}{" "}
                      </dd>{" "}
                    </div>{" "}
                  </dl>{" "}
                </div>
              ))}{" "}
            </div>
          )}{" "}
        </CardContent>{" "}
      </Card>{" "}
    </div>
  );
}
