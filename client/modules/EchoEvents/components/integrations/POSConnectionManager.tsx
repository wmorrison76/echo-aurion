import React, { useState, useCallback } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
interface POSProvider {
  id: "toast" | "lightspeed" | "gotab";
  name: string;
  icon: string;
  docs: string;
}
interface POSConnectionManagerProps {
  eventId: string;
  onConnectionSuccess?: (provider: string) => void;
  isLoading?: boolean;
}
interface ConnectionStatus {
  provider: string;
  isConnected: boolean;
  lastSync?: Date;
  storeId?: string;
}
export const POSConnectionManager: React.FC<POSConnectionManagerProps> = ({
  eventId,
  onConnectionSuccess,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<string>("toast");
  const [connections, setConnections] = useState<
    Record<string, ConnectionStatus>
  >({});
  const [formData, setFormData] = useState({ storeId: "", apiKey: "" });
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    status: "success" | "error" | null;
    message: string;
  }>({ status: null, message: "" });
  const posProviders: POSProvider[] = [
    {
      id: "toast",
      name: "Toast",
      icon: "🍞",
      docs: "https://developers.toasttab.com",
    },
    {
      id: "lightspeed",
      name: "Lightspeed",
      icon: "⚡",
      docs: "https://developer.lightspeedhq.com",
    },
    { id: "gotab", name: "GoTab", icon: "📱", docs: "https://docs.gotab.io" },
  ];
  const activeProvider = posProviders.find((p) => p.id === activeTab);
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData({ ...formData, [name]: value });
    },
    [formData],
  );
  const handleTestConnection = useCallback(async () => {
    if (!formData.storeId || !formData.apiKey) {
      setConnectionResult({
        status: "error",
        message: "Please fill in all fields",
      });
      return;
    }
    setTestingConnection(true);
    setConnectionResult({ status: null, message: "" });
    try {
      const response = await fetch(
        `/api/v1/pos-integrations/status/${activeTab}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      if (response.ok) {
        setConnectionResult({
          status: "success",
          message: `Successfully connected to ${activeProvider?.name}`,
        });
        setConnections({
          ...connections,
          [activeTab]: {
            provider: activeTab,
            isConnected: true,
            storeId: formData.storeId,
            lastSync: new Date(),
          },
        });
        onConnectionSuccess?.(activeTab);
      } else {
        setConnectionResult({
          status: "error",
          message: `Failed to connect to ${activeProvider?.name}. Please check your credentials.`,
        });
      }
    } catch (error: any) {
      setConnectionResult({
        status: "error",
        message: error.message || "Connection test failed",
      });
    } finally {
      setTestingConnection(false);
    }
  }, [formData, activeTab, activeProvider, connections, onConnectionSuccess]);
  const handleDisconnect = useCallback(
    (provider: string) => {
      setConnections({
        ...connections,
        [provider]: { ...connections[provider], isConnected: false },
      });
    },
    [connections],
  );
  const handleSync = useCallback(
    async (provider: string) => {
      try {
        const response = await fetch(
          `/api/v1/pos-integrations/sync/${eventId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setConnectionResult({
            status: "success",
            message: `Synced ${data.data.itemsSuccessful} items successfully`,
          });
          setConnections({
            ...connections,
            [provider]: { ...connections[provider], lastSync: new Date() },
          });
        }
      } catch (error: any) {
        setConnectionResult({
          status: "error",
          message: `Sync failed: ${error.message}`,
        });
      }
    },
    [eventId, connections],
  );
  return (
    <div className="space-y-6 p-6 bg-surface rounded-lg">
      {" "}
      {/* Tab Navigation */}{" "}
      <div className="flex gap-2 border-b">
        {" "}
        {posProviders.map((provider) => (
          <button
            key={provider.id}
            onClick={() => {
              setActiveTab(provider.id);
              setConnectionResult({ status: null, message: "" });
            }}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition ${activeTab === provider.id ? "border-blue-500 text-primary" : "border-transparent text-muted-foreground hover:text-gray-900"}`}
          >
            {" "}
            <span className="mr-2">{provider.icon}</span> {provider.name}{" "}
            {connections[provider.id]?.isConnected && (
              <Badge variant="default" className="ml-2 text-xs">
                {" "}
                Connected{" "}
              </Badge>
            )}{" "}
          </button>
        ))}{" "}
      </div>{" "}
      {/* Provider Content */}{" "}
      {activeProvider && (
        <div className="grid grid-cols-2 gap-6">
          {" "}
          {/* Connection Form */}{" "}
          <Card className="p-6">
            {" "}
            <h3 className="font-semibold mb-4 text-sm">
              {" "}
              Connect {activeProvider.name}{" "}
            </h3>{" "}
            {connections[activeTab]?.isConnected ? (
              <div className="space-y-4">
                {" "}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  {" "}
                  <div className="flex items-center gap-2 mb-2">
                    {" "}
                    <CheckCircle size={18} className="text-green-600" />{" "}
                    <span className="font-semibold text-sm text-green-800">
                      {" "}
                      Connected{" "}
                    </span>{" "}
                  </div>{" "}
                  <div className="text-sm text-foreground space-y-1">
                    {" "}
                    <div>
                      {" "}
                      <strong>Store ID:</strong>
                      {""} {connections[activeTab]?.storeId}{" "}
                    </div>{" "}
                    {connections[activeTab]?.lastSync && (
                      <div>
                        {" "}
                        <strong>Last Sync:</strong>
                        {""}{" "}
                        {new Date(
                          connections[activeTab]?.lastSync!,
                        ).toLocaleDateString()}{" "}
                      </div>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="space-y-2">
                  {" "}
                  <Button
                    onClick={() => handleSync(activeTab)}
                    className="w-full"
                    variant="outline"
                  >
                    {" "}
                    Sync Now{" "}
                  </Button>{" "}
                  <Button
                    onClick={() => handleDisconnect(activeTab)}
                    className="w-full"
                    variant="destructive"
                  >
                    {" "}
                    Disconnect{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            ) : (
              <div className="space-y-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-xs font-medium">Store ID *</label>{" "}
                  <Input
                    name="storeId"
                    value={formData.storeId}
                    onChange={handleInputChange}
                    placeholder={`Enter your ${activeProvider.name} Store ID`}
                    className="mt-1"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-xs font-medium">API Key *</label>{" "}
                  <Input
                    name="apiKey"
                    type="password"
                    value={formData.apiKey}
                    onChange={handleInputChange}
                    placeholder="Enter your API Key"
                    className="mt-1"
                  />{" "}
                </div>{" "}
                <Button
                  onClick={handleTestConnection}
                  disabled={testingConnection || isLoading}
                  className="w-full"
                >
                  {" "}
                  {testingConnection ? (
                    <>
                      {" "}
                      <Loader size={14} className="mr-2 animate-spin" />{" "}
                      Testing...{" "}
                    </>
                  ) : (
                    "Test Connection"
                  )}{" "}
                </Button>{" "}
                <div className="text-xs text-muted-foreground">
                  {" "}
                  <a
                    href={activeProvider.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {" "}
                    View {activeProvider.name} Documentation{" "}
                  </a>{" "}
                </div>{" "}
              </div>
            )}{" "}
          </Card>{" "}
          {/* Status & Results */}{" "}
          <div className="space-y-4">
            {" "}
            {connectionResult.status && (
              <Card
                className={`p-4 border-l-4 ${connectionResult.status === "success" ? "border-l-green-500 bg-green-50" : "border-l-red-500 bg-red-50"}`}
              >
                {" "}
                <div className="flex items-start gap-3">
                  {" "}
                  {connectionResult.status === "success" ? (
                    <CheckCircle
                      size={20}
                      className="text-green-600 flex-shrink-0 mt-0.5"
                    />
                  ) : (
                    <AlertCircle
                      size={20}
                      className="text-red-600 flex-shrink-0 mt-0.5"
                    />
                  )}{" "}
                  <div>
                    {" "}
                    <p
                      className={`font-semibold text-sm ${connectionResult.status === "success" ? "text-green-800" : "text-red-800"}`}
                    >
                      {" "}
                      {connectionResult.status === "success"
                        ? "Success"
                        : "Error"}{" "}
                    </p>{" "}
                    <p className="text-sm text-foreground mt-1">
                      {" "}
                      {connectionResult.message}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </Card>
            )}{" "}
            {/* Connected Providers Summary */}{" "}
            <Card className="p-4">
              {" "}
              <h4 className="font-semibold text-sm mb-3">
                {" "}
                Connected Providers{" "}
              </h4>{" "}
              <div className="space-y-2">
                {" "}
                {posProviders.map((provider) =>
                  connections[provider.id]?.isConnected ? (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-2 bg-green-50 rounded"
                    >
                      {" "}
                      <div className="flex items-center gap-2">
                        {" "}
                        <CheckCircle
                          size={16}
                          className="text-green-600"
                        />{" "}
                        <span className="text-sm font-medium">
                          {" "}
                          {provider.name}{" "}
                        </span>{" "}
                      </div>{" "}
                      <Badge variant="secondary" className="text-xs">
                        {" "}
                        Active{" "}
                      </Badge>{" "}
                    </div>
                  ) : null,
                )}{" "}
                {Object.values(connections).filter((c) => c.isConnected)
                  .length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {" "}
                    No connected providers{" "}
                  </p>
                )}{" "}
              </div>{" "}
            </Card>{" "}
          </div>{" "}
        </div>
      )}{" "}
    </div>
  );
};
