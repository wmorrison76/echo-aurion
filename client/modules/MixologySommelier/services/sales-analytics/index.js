import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import analyticsRouter from "./analytics.controller.ts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "LUCCCA Sales & Menu Analytics",
    version: "1.0.0",
    status: "active",
  });
});

app.use("/analytics", analyticsRouter);

const PORT = process.env.ANALYTICS_PORT || process.env.PORT || 8120;
app.listen(PORT, () => {
  console.log(`📊 Sales Analytics Service running on port ${PORT}`);
  console.log(`   GET /analytics/mix/:venueId — sales mix (wine vs food)`);
  console.log(`   GET /analytics/top/:venueId — top-performing pairings`);
  console.log(
    `   GET /analytics/missed/:venueId — missed pairing opportunities`,
  );
  console.log(`   GET /analytics/trend/:venueId/:menuItemId — sales trends`);
  console.log(`   POST /analytics/menu/sync — sync POS menu items`);
  console.log(`   GET /analytics/recipes — list all recipes`);
  console.log(`   PATCH /analytics/recipes/:id — update recipe`);
});
