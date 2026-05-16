import express from "express";
import dotenv from "dotenv";
import pairingRouter from "./pairing.controller.ts";

dotenv.config();

const app = express();
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "EchoAI³ Pairing Engine",
    version: "1.0.0",
    status: "active",
  });
});

app.use("/pairings", pairingRouter);

const PORT = process.env.PAIRING_ENGINE_PORT || process.env.PORT || 8090;
app.listen(PORT, () => {
  console.log(`🍷 EchoAI³ Pairing Engine running on port ${PORT}`);
  console.log(
    `   POST /pairings/compute/:recipeId — compute pairings for recipe`,
  );
  console.log(`   POST /pairings/compute-all — bulk compute all pairings`);
  console.log(`   GET /pairings/health — health check`);
});
