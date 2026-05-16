/** * FX Management Panel * Real-time exchange rate management and FX gain/loss tracking * - Current and historical exchange rates * - Rate variance alerts * - FX gains/losses summary * - Manual rate overrides * - Translation method configuration */ import React, {
  useState,
  useCallback,
} from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Zap,
  RefreshCw,
} from "lucide-react";
import { useFXManagement } from "../hooks/useFXManagement";
interface FXManagementPanelProps {
  entityId: string;
  periodDate: string;
  baseCurrency?: string;
  onTranslationComplete?: () => void;
  readonly?: boolean;
}
export function FXManagementPanel({
  entityId,
  periodDate,
  baseCurrency = "USD",
  onTranslationComplete,
  readonly = false,
}: FXManagementPanelProps) {
  const [activeTab, setActiveTab] = useState("rates");
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [translationMethod, setTranslationMethod] = useState<
    "temporal" | "current_rate" | "monetary_nonmonetary"
  >("temporal");
  const {
    currentRates,
    historicalRates,
    varianceAlerts,
    fxGainLoss,
    adjustments,
    loading,
    error,
    refreshRates,
    acknowledgeAlert,
    translateBalance,
  } = useFXManagement(entityId, periodDate, baseCurrency);
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, []);
  const formatPercentage = useCallback((value: number) => {
    return `${value.toFixed(2)}%`;
  }, []);
  const getRateTrend = useCallback(
    (currency: string): "up" | "down" | "stable" => {
      const alert = varianceAlerts.find((a) => a.currency === currency);
      if (!alert) return "stable";
      const change = alert.currentRate - alert.previousRate;
      return change > 0 ? "up" : change < 0 ? "down" : "stable";
    },
    [varianceAlerts],
  );
  const getTrendColor = useCallback((trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "text-green-600";
      case "down":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  }, []);
  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        {" "}
        <CardHeader>
          {" "}
          <CardTitle className="text-red-900">
            FX Management Error
          </CardTitle>{" "}
        </CardHeader>{" "}
        <CardContent>
          {" "}
          <div className="text-red-700 mb-4">{error}</div>{" "}
          <Button variant="outline" onClick={() => refreshRates()}>
            {" "}
            Retry{" "}
          </Button>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  return (
    <div className="space-y-6">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h2 className="text-2xl font-bold">FX Management</h2>{" "}
          <p className="text-muted-foreground text-sm mt-1">
            {" "}
            Multi-currency exchange rate management and translation{" "}
          </p>{" "}
        </div>{" "}
        <div className="flex gap-2">
          {" "}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshRates()}
            disabled={loading}
          >
            {" "}
            <RefreshCw size={16} className="mr-1" /> Refresh{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      {fxGainLoss && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Realized Gains
              </div>{" "}
              <div className="text-2xl font-bold text-green-600">
                {" "}
                {formatCurrency(fxGainLoss.realizedGains)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Realized Losses
              </div>{" "}
              <div className="text-2xl font-bold text-red-600">
                {" "}
                {formatCurrency(fxGainLoss.realizedLosses)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Unrealized Gains
              </div>{" "}
              <div className="text-2xl font-bold text-primary">
                {" "}
                {formatCurrency(fxGainLoss.unrealizedGains)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card>
            {" "}
            <CardContent className="pt-6">
              {" "}
              <div className="text-sm text-muted-foreground">
                Net FX Result
              </div>{" "}
              <div
                className={`text-2xl font-bold ${(fxGainLoss?.netFXGainLoss || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {" "}
                {formatCurrency(fxGainLoss.netFXGainLoss || 0)}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </div>
      )}{" "}
      {varianceAlerts.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          {" "}
          <CardHeader>
            {" "}
            <CardTitle className="text-yellow-900">
              {" "}
              <AlertCircle className="inline mr-2" size={20} /> FX Rate Variance
              Alerts{" "}
            </CardTitle>{" "}
            <CardDescription>
              {" "}
              {varianceAlerts.length} rate movements detected{" "}
            </CardDescription>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="space-y-2">
              {" "}
              {varianceAlerts.map((alert) => (
                <div
                  key={alert.currency}
                  className="flex items-center justify-between p-3 bg-background rounded border border-yellow-200"
                >
                  {" "}
                  <div className="flex-1">
                    {" "}
                    <div className="font-semibold">{alert.currency}</div>{" "}
                    <div className="text-sm text-muted-foreground">
                      {" "}
                      {alert.previousRate.toFixed(6)} to{""}{" "}
                      {alert.currentRate.toFixed(6)} ({" "}
                      {formatPercentage(alert.variancePercent)} change){" "}
                    </div>{" "}
                  </div>{" "}
                  {!readonly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      {" "}
                      Acknowledge{" "}
                    </Button>
                  )}{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </CardContent>{" "}
        </Card>
      )}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {" "}
        <TabsList className="grid w-full grid-cols-4">
          {" "}
          <TabsTrigger value="rates">Current Rates</TabsTrigger>{" "}
          <TabsTrigger value="history">History</TabsTrigger>{" "}
          <TabsTrigger value="translation">Translation</TabsTrigger>{" "}
          <TabsTrigger value="details">Details</TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="rates">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Current Exchange Rates</CardTitle>{" "}
              <CardDescription>
                {" "}
                As of {new Date(periodDate).toLocaleDateString()}{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="overflow-x-auto">
                {" "}
                <table className="w-full text-sm">
                  {" "}
                  <thead>
                    {" "}
                    <tr className="border-b bg-surface">
                      {" "}
                      <th className="text-left p-3 font-semibold">
                        Currency
                      </th>{" "}
                      <th className="text-right p-3 font-semibold">
                        {" "}
                        Rate per {baseCurrency}{" "}
                      </th>{" "}
                      <th className="text-center p-3 font-semibold">Trend</th>{" "}
                      <th className="text-right p-3 font-semibold">
                        Actions
                      </th>{" "}
                    </tr>{" "}
                  </thead>{" "}
                  <tbody>
                    {" "}
                    {currentRates &&
                      Object.entries(currentRates).map(([currency, rate]) => {
                        if (currency === baseCurrency) return null;
                        const trend = getRateTrend(currency);
                        return (
                          <tr
                            key={currency}
                            className="border-b hover:bg-surface"
                          >
                            {" "}
                            <td className="p-3 font-semibold">
                              {currency}
                            </td>{" "}
                            <td className="p-3 text-right font-mono">
                              {" "}
                              {(rate as number).toFixed(6)}{" "}
                            </td>{" "}
                            <td className="p-3 text-center">
                              {" "}
                              {trend === "up" && (
                                <TrendingUp
                                  size={16}
                                  className="inline text-green-600"
                                />
                              )}{" "}
                              {trend === "down" && (
                                <TrendingDown
                                  size={16}
                                  className="inline text-red-600"
                                />
                              )}{" "}
                              {trend === "stable" && (
                                <DollarSign
                                  size={16}
                                  className="inline text-muted-foreground"
                                />
                              )}{" "}
                            </td>{" "}
                            <td className="p-3 text-right">
                              {" "}
                              {!readonly && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedCurrency(currency);
                                    setActiveTab("translation");
                                  }}
                                >
                                  {" "}
                                  Translate{" "}
                                </Button>
                              )}{" "}
                            </td>{" "}
                          </tr>
                        );
                      })}{" "}
                  </tbody>{" "}
                </table>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="history">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Historical Rates</CardTitle>{" "}
              <CardDescription>Previous periods</CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              {historicalRates && historicalRates.length > 0 ? (
                <div className="overflow-x-auto">
                  {" "}
                  <table className="w-full text-sm">
                    {" "}
                    <thead>
                      {" "}
                      <tr className="border-b bg-surface">
                        {" "}
                        <th className="text-left p-3 font-semibold">
                          {" "}
                          Currency{" "}
                        </th>{" "}
                        <th className="text-left p-3 font-semibold">
                          Date
                        </th>{" "}
                        <th className="text-right p-3 font-semibold">
                          {" "}
                          Rate per {baseCurrency}{" "}
                        </th>{" "}
                        <th className="text-center p-3 font-semibold">
                          {" "}
                          Source{" "}
                        </th>{" "}
                      </tr>{" "}
                    </thead>{" "}
                    <tbody>
                      {" "}
                      {historicalRates.map((rate, idx) => (
                        <tr key={idx} className="border-b hover:bg-surface">
                          {" "}
                          <td className="p-3 font-semibold">
                            {" "}
                            {rate.fromCurrency}{" "}
                          </td>{" "}
                          <td className="p-3">
                            {" "}
                            {new Date(rate.rateDate).toLocaleDateString()}{" "}
                          </td>{" "}
                          <td className="p-3 text-right font-mono">
                            {" "}
                            {rate.rate.toFixed(6)}{" "}
                          </td>{" "}
                          <td className="p-3 text-center">
                            {" "}
                            <Badge variant="outline">{rate.method}</Badge>{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                    </tbody>{" "}
                  </table>{" "}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {" "}
                  No historical rates available{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="translation">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Translation Method Configuration</CardTitle>{" "}
              <CardDescription>
                {" "}
                Select method for consolidation translation{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-6">
              {" "}
              <div className="space-y-3">
                {" "}
                <label className="text-sm font-semibold">
                  {" "}
                  Translation Method{" "}
                </label>{" "}
                <div className="space-y-2">
                  {" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <input
                      type="radio"
                      id="temporal"
                      value="temporal"
                      checked={translationMethod === "temporal"}
                      onChange={(e) =>
                        setTranslationMethod(
                          e.target.value as
                            | "temporal"
                            | "current_rate"
                            | "monetary_nonmonetary",
                        )
                      }
                      disabled={readonly}
                      className="cursor-pointer"
                    />{" "}
                    <label htmlFor="temporal" className="cursor-pointer flex-1">
                      {" "}
                      <div className="font-semibold">Temporal Method</div>{" "}
                      <div className="text-xs text-muted-foreground">
                        {" "}
                        Assets/Liabilities at transaction date. IFRS
                        standard.{" "}
                      </div>{" "}
                    </label>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <input
                      type="radio"
                      id="current_rate"
                      value="current_rate"
                      checked={translationMethod === "current_rate"}
                      onChange={(e) =>
                        setTranslationMethod(
                          e.target.value as
                            | "temporal"
                            | "current_rate"
                            | "monetary_nonmonetary",
                        )
                      }
                      disabled={readonly}
                      className="cursor-pointer"
                    />{" "}
                    <label
                      htmlFor="current_rate"
                      className="cursor-pointer flex-1"
                    >
                      {" "}
                      <div className="font-semibold">
                        Current Rate Method
                      </div>{" "}
                      <div className="text-xs text-muted-foreground">
                        {" "}
                        All items at period-end rate. IFRS alternative.{" "}
                      </div>{" "}
                    </label>{" "}
                  </div>{" "}
                  <div className="flex items-center gap-3">
                    {" "}
                    <input
                      type="radio"
                      id="monetary_nonmonetary"
                      value="monetary_nonmonetary"
                      checked={translationMethod === "monetary_nonmonetary"}
                      onChange={(e) =>
                        setTranslationMethod(
                          e.target.value as
                            | "temporal"
                            | "current_rate"
                            | "monetary_nonmonetary",
                        )
                      }
                      disabled={readonly}
                      className="cursor-pointer"
                    />{" "}
                    <label
                      htmlFor="monetary_nonmonetary"
                      className="cursor-pointer flex-1"
                    >
                      {" "}
                      <div className="font-semibold">
                        {" "}
                        Monetary/Non-Monetary Method{" "}
                      </div>{" "}
                      <div className="text-xs text-muted-foreground">
                        {" "}
                        Mixed approach. US GAAP.{" "}
                      </div>{" "}
                    </label>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              {selectedCurrency && (
                <div className="pt-6 border-t">
                  {" "}
                  <h3 className="font-semibold mb-3">
                    {" "}
                    Translate {selectedCurrency} Balance{" "}
                  </h3>{" "}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {" "}
                    <div>
                      {" "}
                      <label className="text-sm text-muted-foreground">
                        {" "}
                        Amount ({selectedCurrency}){" "}
                      </label>{" "}
                      <input
                        type="number"
                        placeholder="0.00"
                        className="w-full border rounded px-3 py-2 mt-1"
                        step="0.01"
                      />{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <label className="text-sm text-muted-foreground">
                        Rate
                      </label>{" "}
                      <input
                        type="text"
                        value={
                          currentRates && currentRates[selectedCurrency]
                            ? (
                                currentRates[selectedCurrency] as number
                              ).toFixed(6)
                            : "0.000000"
                        }
                        disabled
                        className="w-full border rounded px-3 py-2 mt-1 bg-surface"
                      />{" "}
                    </div>{" "}
                  </div>{" "}
                  {!readonly && (
                    <Button
                      onClick={() =>
                        selectedCurrency && translateBalance(selectedCurrency)
                      }
                    >
                      {" "}
                      <Zap size={16} className="mr-1" /> Translate{" "}
                    </Button>
                  )}{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="details">
          {" "}
          <Card>
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>FX Adjustments Detail</CardTitle>{" "}
              <CardDescription>
                {" "}
                All FX translation adjustments for period{" "}
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              {adjustments && adjustments.length > 0 ? (
                <div className="overflow-x-auto">
                  {" "}
                  <table className="w-full text-xs">
                    {" "}
                    <thead>
                      {" "}
                      <tr className="border-b bg-surface">
                        {" "}
                        <th className="text-left p-2 font-semibold">
                          Account
                        </th>{" "}
                        <th className="text-left p-2 font-semibold">
                          {" "}
                          Currency{" "}
                        </th>{" "}
                        <th className="text-right p-2 font-semibold">
                          {" "}
                          Original{" "}
                        </th>{" "}
                        <th className="text-right p-2 font-semibold">
                          Rate
                        </th>{" "}
                        <th className="text-right p-2 font-semibold">
                          {" "}
                          Translated{" "}
                        </th>{" "}
                        <th className="text-center p-2 font-semibold">
                          Type
                        </th>{" "}
                      </tr>{" "}
                    </thead>{" "}
                    <tbody>
                      {" "}
                      {adjustments.map((adj, idx) => (
                        <tr key={idx} className="border-b hover:bg-surface">
                          {" "}
                          <td className="p-2">{adj.accountCode}</td>{" "}
                          <td className="p-2">{adj.originalCurrency}</td>{" "}
                          <td className="p-2 text-right">
                            {" "}
                            {formatCurrency(adj.originalAmount)}{" "}
                          </td>{" "}
                          <td className="p-2 text-right font-mono">
                            {" "}
                            {adj.exchangeRate.toFixed(6)}{" "}
                          </td>{" "}
                          <td className="p-2 text-right">
                            {" "}
                            {formatCurrency(adj.translatedAmount)}{" "}
                          </td>{" "}
                          <td className="p-2 text-center">
                            {" "}
                            <Badge variant="outline">
                              {" "}
                              {adj.adjustmentType}{" "}
                            </Badge>{" "}
                          </td>{" "}
                        </tr>
                      ))}{" "}
                    </tbody>{" "}
                  </table>{" "}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {" "}
                  No adjustments recorded{" "}
                </div>
              )}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
