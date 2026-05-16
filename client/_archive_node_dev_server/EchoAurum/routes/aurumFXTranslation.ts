/** * FX Translation API Routes * Multi-currency GL translation, rate management, FX gain/loss calculation */ import {
  Router,
  Request,
  Response,
} from "express";
import { AurumDatabaseService } from "../services/aurumDatabase";
import { ExchangeRateService } from "../services/exchangeRateService";
import { FXTranslationEngine } from "../services/fxTranslationEngine";
import { jwtAuth, AuthenticatedRequest } from "../middleware/jwtAuth";
export function createAurumFXTranslationRouter(
  db: AurumDatabaseService,
  rateService?: ExchangeRateService,
): Router {
  const router = Router();
  router.use(jwtAuth);
  const exchangeRateService = rateService || new ExchangeRateService(db.pool);
  const fxEngine = new FXTranslationEngine(db.pool, exchangeRateService);
  /** * GET /api/aurum/fx/rates/current * Get current exchange rates */ router.get(
    "/rates/current",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const rates = await exchangeRateService.getCurrentRates();
        const ratesObj: Record<string, number> = {};
        for (const [currency, rate] of rates) {
          ratesObj[currency] = rate;
        }
        res.json({
          success: true,
          rates: ratesObj,
          timestamp: new Date().toISOString(),
          supportedCurrencies: exchangeRateService.getSupportedCurrencies(),
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch current rates",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * GET /api/aurum/fx/rates/historical * Get historical exchange rate for specific date */ router.get(
    "/rates/historical",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { fromCurrency, toCurrency, date } = req.query;
        if (!fromCurrency || !toCurrency || !date) {
          return res.status(400).json({
            error: "Missing parameters: fromCurrency, toCurrency, date",
          });
        }
        const rateDate = new Date(date as string);
        const result = await exchangeRateService.getHistoricalRate(
          fromCurrency as string,
          toCurrency as string,
          rateDate,
        );
        if (!result) {
          return res.status(404).json({
            error: `No rate found for ${fromCurrency}->${toCurrency} on ${date}`,
          });
        }
        res.json({ success: true, ...result });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch historical rate",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * GET /api/aurum/fx/rates/variance-alerts * Get FX rate variance alerts (rate movements >2%) */ router.get(
    "/rates/variance-alerts",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const alerts = await exchangeRateService.getVarianceAlerts();
        res.json({ success: true, alerts, count: alerts.length });
      } catch (error) {
        res.status(500).json({
          error: "Failed to fetch variance alerts",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * POST /api/aurum/fx/rates/variance-alerts/acknowledge * Acknowledge a rate variance alert */ router.post(
    "/rates/variance-alerts/acknowledge",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { alertId } = req.body;
        if (!alertId) {
          return res.status(400).json({ error: "Missing parameter: alertId" });
        }
        const success = await exchangeRateService.acknowledgeVarianceAlert(
          alertId,
          req.user?.id || "system",
        );
        if (!success) {
          return res.status(404).json({ error: "Alert not found" });
        }
        res.json({ success: true, message: "Alert acknowledged" });
      } catch (error) {
        res.status(500).json({
          error: "Failed to acknowledge alert",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * POST /api/aurum/fx/rates/manual * Set manual exchange rate (for edge cases, bank holidays) */ router.post(
    "/rates/manual",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { fromCurrency, toCurrency, rate, reason } = req.body;
        if (!fromCurrency || !toCurrency || !rate || !reason) {
          return res.status(400).json({
            error: "Missing parameters: fromCurrency, toCurrency, rate, reason",
          });
        }
        await exchangeRateService.setManualRate(
          fromCurrency,
          toCurrency,
          rate,
          reason,
          req.user?.id || "system",
        );
        res.json({
          success: true,
          message: `Manual rate set: ${fromCurrency}/${toCurrency} = ${rate}`,
        });
      } catch (error) {
        res.status(500).json({
          error: "Failed to set manual rate",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * POST /api/aurum/fx/translate/temporal * Translate GL balance using Temporal Method (IFRS standard) */ router.post(
    "/translate/temporal",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency,
          transactionDate,
          periodEndDate,
        } = req.body;
        if (
          !entityId ||
          !accountCode ||
          !accountType ||
          !originalAmount ||
          !originalCurrency ||
          !transactionDate ||
          !periodEndDate
        ) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const adjustment = await fxEngine.translateTemporalMethod(
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency || "USD",
          new Date(transactionDate),
          new Date(periodEndDate),
        );
        if (!adjustment) {
          return res.status(400).json({ error: "Translation failed" });
        }
        res.json({ success: true, adjustment });
      } catch (error) {
        res.status(500).json({
          error: "Failed to translate using temporal method",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * POST /api/aurum/fx/translate/current-rate * Translate GL balance using Current Rate Method */ router.post(
    "/translate/current-rate",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency,
          periodEndDate,
        } = req.body;
        if (
          !entityId ||
          !accountCode ||
          !accountType ||
          !originalAmount ||
          !originalCurrency ||
          !periodEndDate
        ) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const adjustment = await fxEngine.translateCurrentRateMethod(
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency || "USD",
          new Date(periodEndDate),
        );
        if (!adjustment) {
          return res.status(400).json({ error: "Translation failed" });
        }
        res.json({ success: true, adjustment });
      } catch (error) {
        res.status(500).json({
          error: "Failed to translate using current rate method",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * POST /api/aurum/fx/translate/monetary-nonmonetary * Translate GL balance using Monetary/Non-Monetary Method (US GAAP) */ router.post(
    "/translate/monetary-nonmonetary",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency,
          transactionDate,
          periodEndDate,
        } = req.body;
        if (
          !entityId ||
          !accountCode ||
          !accountType ||
          !originalAmount ||
          !originalCurrency ||
          !transactionDate ||
          !periodEndDate
        ) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        const adjustment = await fxEngine.translateMonetaryNonMonetaryMethod(
          entityId,
          accountCode,
          accountType,
          originalAmount,
          originalCurrency,
          baseCurrency || "USD",
          new Date(transactionDate),
          new Date(periodEndDate),
        );
        if (!adjustment) {
          return res.status(400).json({ error: "Translation failed" });
        }
        res.json({ success: true, adjustment });
      } catch (error) {
        res.status(500).json({
          error: "Failed to translate using monetary/non-monetary method",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * GET /api/aurum/fx/gains-losses * Calculate total FX gains/losses for entity and period */ router.get(
    "/gains-losses",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { entityId, periodEndDate } = req.query;
        if (!entityId || !periodEndDate) {
          return res
            .status(400)
            .json({ error: "Missing parameters: entityId, periodEndDate" });
        }
        const result = await fxEngine.calculateFXGainLoss(
          entityId as string,
          new Date(periodEndDate as string),
        );
        res.json({ success: true, ...result });
      } catch (error) {
        res.status(500).json({
          error: "Failed to calculate FX gains/losses",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * GET /api/aurum/fx/adjustments * Get all FX adjustments for entity and period */ router.get(
    "/adjustments",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { entityId, periodEndDate } = req.query;
        if (!entityId || !periodEndDate) {
          return res
            .status(400)
            .json({ error: "Missing parameters: entityId, periodEndDate" });
        }
        const adjustments = await fxEngine.getAdjustments(
          entityId as string,
          new Date(periodEndDate as string),
        );
        res.json({ success: true, adjustments, count: adjustments.length });
      } catch (error) {
        res.status(500).json({
          error: "Failed to retrieve adjustments",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  /** * GET /api/aurum/fx/currencies * Get list of supported currencies */ router.get(
    "/currencies",
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const currencies = exchangeRateService.getSupportedCurrencies();
        res.json({ success: true, currencies, count: currencies.length });
      } catch (error) {
        res.status(500).json({
          error: "Failed to retrieve currencies",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );
  return router;
}
