import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  CheckCircle,
  Database,
  Zap,
  RefreshCw,
  Download,
} from "lucide-react";

interface PineconeStatus {
  connected: boolean;
  indexName: string;
  indexStats: {
    totalVectors: number;
    totalNamespaces: number;
  } | null;
  trainingDataVectors: {
    total: number;
    byDomain: Record<string, number>;
  } | null;
  error?: string;
}

interface VerificationResult {
  found: boolean;
  count: number;
  vectors: Array<{
    id: string;
    domain: string;
    title: string;
    confidence: number;
  }>;
  error?: string;
}

export function PineconeVerificationDashboard() {
  const [status, setStatus] = useState<PineconeStatus | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStoring, setIsStoring] = useState(false);
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const checkStatus = async () => {
    setIsLoading(true);
    try {
      const [statusRes, verifyRes] = await Promise.all([
        fetch("/api/multi-domain-training/pinecone/status"),
        fetch("/api/multi-domain-training/pinecone/verify"),
      ]);

      const statusData = await statusRes.json();
      const verifyData = await verifyRes.json();

      setStatus(statusData.pinecone);
      setVerification(verifyData.verification);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to check Pinecone status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const storeCompletedTraining = async () => {
    setIsStoring(true);
    setStoreMessage(null);
    try {
      const response = await fetch(
        "/api/multi-domain-training/pinecone/store-completed",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      const data = await response.json();

      if (data.success) {
        if (data.alreadyStored) {
          setStoreMessage(
            `ℹ Vectors already stored in Pinecone (${data.total} vectors found). Skipping duplicate storage.`,
          );
        } else {
          setStoreMessage(
            `✓ Successfully stored ${data.stored}/${data.total} training vectors!`,
          );
        }
        // Refresh status after storing
        setTimeout(() => checkStatus(), 1000);
      } else {
        setStoreMessage(`✗ Failed to store: ${data.error}`);
      }
    } catch (error) {
      console.error("Failed to store training data:", error);
      setStoreMessage("✗ Error storing training data");
    } finally {
      setIsStoring(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  if (!status) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Pinecone Verification</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={checkStatus}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {isLoading ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {/* Connection Status */}
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {status.connected ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <div>
              <h4 className="font-semibold">
                {status.connected ? "Connected" : "Disconnected"}
              </h4>
              <p className="text-sm text-gray-600">
                Index: <span className="font-mono">{status.indexName}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            {status.error && (
              <p className="text-sm text-amber-600 mb-2">{status.error}</p>
            )}
            {status.connected && !verification?.found && (
              <Button
                size="sm"
                onClick={storeCompletedTraining}
                disabled={isStoring}
                className="gap-2 bg-green-600 hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                {isStoring ? "Storing..." : "Store 246 Vectors"}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Store Message */}
      {storeMessage && (
        <Alert
          className={
            storeMessage.startsWith("✓")
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          <AlertDescription
            className={
              storeMessage.startsWith("✓") ? "text-green-800" : "text-red-800"
            }
          >
            {storeMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Index Stats */}
      {status.connected && status.indexStats && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Index Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Total Vectors</p>
                <p className="text-2xl font-bold">
                  {status.indexStats.totalVectors.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">Namespaces</p>
                <p className="text-2xl font-bold">
                  {status.indexStats.totalNamespaces}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Training Data Vectors */}
      {status.connected && status.trainingDataVectors && (
        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <h4 className="font-semibold mb-3 text-green-900">
            Training Vectors
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-green-800">Total Training Vectors</span>
              <span className="text-2xl font-bold text-green-600">
                {status.trainingDataVectors.total}
              </span>
            </div>

            {Object.keys(status.trainingDataVectors.byDomain).length > 0 && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-2">
                  By Domain:
                </p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(status.trainingDataVectors.byDomain).map(
                    ([domain, count]) => (
                      <div key={domain} className="flex justify-between">
                        <span className="text-green-700">{domain}</span>
                        <span className="font-semibold text-green-600">
                          {count}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Verification Results */}
      {verification && (
        <Card
          className={`p-4 ${
            verification.found
              ? "bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200"
              : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200"
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold mb-2">Training Data Verification</h4>
              <p
                className={`text-sm ${
                  verification.found ? "text-green-700" : "text-amber-700"
                }`}
              >
                {verification.found
                  ? `✓ Found ${verification.count} training vectors in Pinecone`
                  : "⚠ No training vectors found"}
              </p>
            </div>
            {verification.found && (
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            )}
          </div>

          {verification.vectors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-200">
              <p className="text-sm font-semibold mb-2">Sample Vectors</p>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {verification.vectors.slice(0, 5).map((vector) => (
                  <div key={vector.id} className="text-xs">
                    <p className="font-mono text-emerald-700">
                      {vector.domain}
                    </p>
                    <p className="text-gray-600 truncate">{vector.title}</p>
                  </div>
                ))}
                {verification.vectors.length > 5 && (
                  <p className="text-xs text-gray-500 pt-1">
                    ... and {verification.vectors.length - 5} more
                  </p>
                )}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Last Updated */}
      {lastUpdated && (
        <p className="text-xs text-gray-500 text-center">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
