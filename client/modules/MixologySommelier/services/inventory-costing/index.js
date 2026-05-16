import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import reportRouter from "./reports.controller.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "EchoCellar Ops – Inventory & Costing",
    version: "1.0.0",
    status: "active",
  });
});

app.use("/reports", reportRouter);

const PORT = process.env.COSTING_PORT || process.env.PORT || 8100;
app.listen(PORT, () => {
  console.log(`📊 EchoCellar Ops Costing Service running on port ${PORT}`);
  console.log(
    `   GET /reports/month-end/:venueId/:month — month-end COGS report`,
  );
  console.log(
    `   GET /reports/variance/:venueId/:month — inventory variance analysis`,
  );
  console.log(`   GET /reports/purchases — purchase history`);
  console.log(`   POST /reports/purchases — record new purchase`);
  console.log(
    `   GET /reports/fifo/:venueId/:month — FIFO inventory valuation`,
  );
});
