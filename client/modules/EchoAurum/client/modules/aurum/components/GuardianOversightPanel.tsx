/** * Guardian Oversight Panel * Real-time display of Guardian checks: Argus, Zelda, Phoenix, Odin * Shows validation results, anomalies, and audit trail status */ import React, {
  useState,
  useEffect,
} from "react";
import type { GuardianOrchestrationResult } from "@shared/aurum";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, AlertCircle, AlertTriangle, Lock } from "lucide-react";
interface GuardianOversightPanelProps {
  result?: GuardianOrchestrationResult;
  loading?: boolean;
  error?: string;
}
export function GuardianOversightPanel({
  result,
  loading,
  error,
}: GuardianOversightPanelProps) {
  if (loading) {
    return (
      <Card className="w-full">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Guardian Oversight System</CardTitle>{" "}
          <CardDescription>Running security checks...</CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="flex items-center justify-center p-8">
            {" "}
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error) {
    return (
      <Alert variant="destructive">
        {" "}
        <AlertCircle className="h-4 w-4" />{" "}
        <AlertTitle>Guardian Error</AlertTitle>{" "}
        <AlertDescription>{error}</AlertDescription>{" "}
      </Alert>
    );
  }
  if (!result) {
    return (
      <Card className="w-full">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Guardian Oversight System</CardTitle>{" "}
          <CardDescription>No checks have been run yet</CardDescription>{" "}
        </CardHeader>{" "}
      </Card>
    );
  }
  const statusColor = {
    PASSED: "bg-green-50",
    WARNINGS: "bg-yellow-50",
    BLOCKED: "bg-red-50",
  };
  const statusBadge = {
    PASSED: <Badge className="bg-green-600">✓ PASSED</Badge>,
    WARNINGS: <Badge className="bg-yellow-600">⚠ WARNINGS</Badge>,
    BLOCKED: <Badge className="bg-red-600">✗ BLOCKED</Badge>,
  };
  return (
    <div className="w-full space-y-4">
      {" "}
      {/* Overall Status Banner */}{" "}
      <div
        className={`p-4 rounded-lg border ${statusColor[result.overallStatus]}`}
      >
        {" "}
        <div className="flex items-center justify-between">
          {" "}
          <div>
            {" "}
            <h3 className="font-semibold text-lg flex items-center gap-2">
              {" "}
              {result.overallStatus === "PASSED" && (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              )}{" "}
              {result.overallStatus === "WARNINGS" && (
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              )}{" "}
              {result.overallStatus === "BLOCKED" && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}{" "}
              Guardian System Status: {result.overallStatus}{" "}
            </h3>{" "}
            <p className="text-sm text-muted-foreground mt-1">
              {" "}
              Risk Score: {result.riskScore.toFixed(1)}% | Checked at{" "}
              {new Date(result.timestamp).toLocaleTimeString()}{" "}
            </p>{" "}
          </div>{" "}
          {statusBadge[result.overallStatus]}{" "}
        </div>{" "}
        {result.blockingErrors.length > 0 && (
          <div className="mt-3 space-y-2">
            {" "}
            <p className="text-sm font-semibold text-red-700">
              Critical Issues:
            </p>{" "}
            <ul className="list-disc list-inside space-y-1 text-sm text-red-700">
              {" "}
              {result.blockingErrors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}{" "}
            </ul>{" "}
          </div>
        )}{" "}
        {result.warnings.length > 0 && result.blockingErrors.length === 0 && (
          <div className="mt-3 space-y-2">
            {" "}
            <p className="text-sm font-semibold text-yellow-700">
              Warnings:
            </p>{" "}
            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
              {" "}
              {result.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}{" "}
            </ul>{" "}
          </div>
        )}{" "}
      </div>{" "}
      {/* Guardian Checks Tabs */}{" "}
      <Card>
        {" "}
        <CardHeader>
          {" "}
          <CardTitle>Guardian Checks Detail</CardTitle>{" "}
          <CardDescription>
            Individual check results from all 4 Guardians
          </CardDescription>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <Tabs defaultValue="argus" className="w-full">
            {" "}
            <TabsList className="grid w-full grid-cols-4">
              {" "}
              <TabsTrigger value="argus" className="flex items-center gap-2">
                {" "}
                <span
                  className={
                    result.argus.passed ? "text-green-600" : "text-red-600"
                  }
                >
                  {" "}
                  {result.argus.passed ? "✓" : "✗"}{" "}
                </span>{" "}
                Argus{" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="zelda" className="flex items-center gap-2">
                {" "}
                <span
                  className={
                    result.zelda.passed ? "text-green-600" : "text-yellow-600"
                  }
                >
                  {" "}
                  {result.zelda.passed ? "✓" : "⚠"}{" "}
                </span>{" "}
                Zelda{" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="phoenix" className="flex items-center gap-2">
                {" "}
                <span
                  className={
                    result.phoenix.passed ? "text-green-600" : "text-yellow-600"
                  }
                >
                  {" "}
                  {result.phoenix.passed ? "✓" : "⚠"}{" "}
                </span>{" "}
                Phoenix{" "}
              </TabsTrigger>{" "}
              <TabsTrigger value="odin" className="flex items-center gap-2">
                {" "}
                <Lock className="h-4 w-4" /> Odin{" "}
              </TabsTrigger>{" "}
            </TabsList>{" "}
            {/* ARGUS TAB */}{" "}
            <TabsContent value="argus" className="space-y-4 mt-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold flex items-center gap-2">
                      {" "}
                      {result.argus.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      )}{" "}
                      Data Compliance & GL Validation{" "}
                    </h4>{" "}
                    <p className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {result.argus.checksRun.length} checks executed{" "}
                    </p>{" "}
                  </div>{" "}
                  <Badge
                    variant={result.argus.passed ? "default" : "destructive"}
                  >
                    {" "}
                    {result.argus.passed ? "PASSED" : "FAILED"}{" "}
                  </Badge>{" "}
                </div>{" "}
                {result.argus.errors.length > 0 && (
                  <div className="bg-red-50 p-3 rounded border border-red-200">
                    {" "}
                    <p className="text-sm font-semibold text-red-700 mb-2">
                      Errors:
                    </p>{" "}
                    <ul className="space-y-1 text-sm text-red-700">
                      {" "}
                      {result.argus.errors.map((error, i) => (
                        <li key={i} className="flex gap-2">
                          {" "}
                          <span>•</span> <span>{error}</span>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                )}{" "}
                {result.argus.warnings.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    {" "}
                    <p className="text-sm font-semibold text-yellow-700 mb-2">
                      Warnings:
                    </p>{" "}
                    <ul className="space-y-1 text-sm text-yellow-700">
                      {" "}
                      {result.argus.warnings.map((warning, i) => (
                        <li key={i} className="flex gap-2">
                          {" "}
                          <span>•</span> <span>{warning}</span>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                )}{" "}
                <div className="text-xs text-muted-foreground pt-2">
                  {" "}
                  <p>Checks run: {result.argus.checksRun.join(",")}</p>{" "}
                </div>{" "}
              </div>{" "}
            </TabsContent>{" "}
            {/* ZELDA TAB */}{" "}
            <TabsContent value="zelda" className="space-y-4 mt-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold flex items-center gap-2">
                      {" "}
                      {result.zelda.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}{" "}
                      Duplicate Detection & Auto-Healing{" "}
                    </h4>{" "}
                    <p className="text-sm text-muted-foreground mt-1">
                      {" "}
                      {result.zelda.duplicatesDetected.length} potential
                      duplicates detected{" "}
                    </p>{" "}
                  </div>{" "}
                  <Badge
                    variant={result.zelda.passed ? "default" : "secondary"}
                  >
                    {" "}
                    {result.zelda.passed ? "PASSED" : "REVIEW"}{" "}
                  </Badge>{" "}
                </div>{" "}
                {result.zelda.duplicatesDetected.length > 0 && (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    {" "}
                    <p className="text-sm font-semibold text-yellow-700 mb-2">
                      Duplicates Found:
                    </p>{" "}
                    <ul className="space-y-2 text-sm">
                      {" "}
                      {result.zelda.duplicatesDetected.map((dup, i) => (
                        <li
                          key={i}
                          className="text-yellow-700 flex justify-between items-start"
                        >
                          {" "}
                          <span>
                            {" "}
                            <strong>{dup.type}:</strong> {dup.message}{" "}
                          </span>{" "}
                          <Badge variant="secondary">
                            {(dup.confidence * 100).toFixed(0)}%
                          </Badge>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                )}{" "}
                {result.zelda.autoHeals.length > 0 && (
                  <div className="bg-green-50 p-3 rounded border border-green-200">
                    {" "}
                    <p className="text-sm font-semibold text-green-700 mb-2">
                      Auto-Healed Issues:
                    </p>{" "}
                    <ul className="space-y-1 text-sm text-green-700">
                      {" "}
                      {result.zelda.autoHeals.map((heal, i) => (
                        <li key={i} className="flex gap-2">
                          {" "}
                          <span>✓</span> <span>{heal.description}</span>{" "}
                        </li>
                      ))}{" "}
                    </ul>{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </TabsContent>{" "}
            {/* PHOENIX TAB */}{" "}
            <TabsContent value="phoenix" className="space-y-4 mt-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold flex items-center gap-2">
                      {" "}
                      {result.phoenix.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      )}{" "}
                      Anomaly Detection & Fraud Prevention{" "}
                    </h4>{" "}
                    <p className="text-sm text-muted-foreground mt-1">
                      {" "}
                      Risk Score: {result.phoenix.riskScore.toFixed(1)}%{" "}
                    </p>{" "}
                  </div>{" "}
                  <Badge
                    variant={
                      result.phoenix.riskScore < 30
                        ? "default"
                        : result.phoenix.riskScore < 60
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {" "}
                    {result.phoenix.riskScore < 30
                      ? "LOW"
                      : result.phoenix.riskScore < 60
                        ? "MEDIUM"
                        : "HIGH"}{" "}
                    RISK{" "}
                  </Badge>{" "}
                </div>{" "}
                {/* Risk Score Bar */}{" "}
                <div className="space-y-2">
                  {" "}
                  <p className="text-xs font-semibold text-foreground">
                    Risk Level
                  </p>{" "}
                  <div className="w-full bg-surface rounded-full h-2">
                    {" "}
                    <div
                      className={`h-2 rounded-full ${result.phoenix.riskScore < 30 ? "bg-green-600" : result.phoenix.riskScore < 60 ? "bg-yellow-600" : "bg-red-600"}`}
                      style={{ width: `${result.phoenix.riskScore}%` }}
                    />{" "}
                  </div>{" "}
                </div>{" "}
                {result.phoenix.anomalies.length > 0 && (
                  <div className="space-y-2">
                    {" "}
                    <p className="text-sm font-semibold text-foreground">
                      Anomalies Detected:
                    </p>{" "}
                    {result.phoenix.anomalies.map((anomaly, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded text-sm ${anomaly.severity === "ERROR" ? "bg-red-50 border border-red-200" : anomaly.severity === "WARNING" ? "bg-yellow-50 border border-yellow-200" : "bg-blue-50 border border-blue-200"}`}
                      >
                        {" "}
                        <div className="font-semibold">
                          {" "}
                          {anomaly.severity === "ERROR" && (
                            <span className="text-red-700">
                              🚨 {anomaly.type}
                            </span>
                          )}{" "}
                          {anomaly.severity === "WARNING" && (
                            <span className="text-yellow-700">
                              ⚠ {anomaly.type}
                            </span>
                          )}{" "}
                          {anomaly.severity === "INFO" && (
                            <span className="text-blue-700">
                              ℹ {anomaly.type}
                            </span>
                          )}{" "}
                        </div>{" "}
                        <p className="text-xs mt-1">{anomaly.message}</p>{" "}
                      </div>
                    ))}{" "}
                  </div>
                )}{" "}
              </div>{" "}
            </TabsContent>{" "}
            {/* ODIN TAB */}{" "}
            <TabsContent value="odin" className="space-y-4 mt-4">
              {" "}
              <div className="space-y-3">
                {" "}
                <div className="flex items-start justify-between">
                  {" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold flex items-center gap-2">
                      {" "}
                      <Lock className="h-5 w-5 text-primary" /> Immutable Audit
                      Trail{" "}
                    </h4>{" "}
                    <p className="text-sm text-muted-foreground mt-1">
                      Cryptographically secured record
                    </p>{" "}
                  </div>{" "}
                  <Badge className="bg-primary">LOGGED</Badge>{" "}
                </div>{" "}
                <div className="bg-blue-50 p-3 rounded border border-blue-200 space-y-2">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      Audit Trail ID:
                    </p>{" "}
                    <code className="text-xs bg-background p-2 rounded block break-all text-foreground">
                      {" "}
                      {result.odin.auditTrailId}{" "}
                    </code>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs font-semibold text-blue-700 mb-1">
                      Transaction Hash (SHA256):
                    </p>{" "}
                    <code className="text-xs bg-background p-2 rounded block break-all font-mono text-foreground">
                      {" "}
                      {result.odin.transactionHash.substring(0, 32)}...{" "}
                    </code>{" "}
                  </div>{" "}
                  <p className="text-xs text-blue-700 italic">
                    {" "}
                    ✓ This record is immutable. Any tampering would break the
                    cryptographic chain.{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </TabsContent>{" "}
          </Tabs>{" "}
        </CardContent>{" "}
      </Card>{" "}
      {/* Action Button Area */}{" "}
      {result.overallStatus !== "BLOCKED" && (
        <div className="flex gap-2 justify-end">
          {" "}
          <button
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            disabled={result.blockingErrors.length > 0}
          >
            {" "}
            Post Entry{" "}
          </button>{" "}
          <button className="px-4 py-2 bg-surface text-gray-800 rounded hover:bg-gray-300">
            {" "}
            View Details{" "}
          </button>{" "}
        </div>
      )}{" "}
    </div>
  );
}
export default GuardianOversightPanel;
