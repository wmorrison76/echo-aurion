import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import archiveRouter from "./archive.controller.ts";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/", (_, res) => {
  res.json({
    service: "EchoVinum Grand Archive",
    version: "1.0.0",
    status: "active",
    description:
      "75-year global wine intelligence database with AI-powered analysis",
  });
});

app.use("/archive", archiveRouter);

const PORT = process.env.ARCHIVE_PORT || process.env.PORT || 8160;
app.listen(PORT, () => {
  console.log(`📚 EchoVinum Archive Service running on port ${PORT}`);
  console.log(`   GET /archive/vintage/:region/:year — get/create vintage`);
  console.log(
    `   GET /archive/vintage/decade/:region/:start — decade overview`,
  );
  console.log(
    `   GET /archive/vintage/history/:region — all vintages for region`,
  );
  console.log(`   GET /archive/vintage/best/:region — top-rated vintages`);
  console.log(`   GET /archive/producer/:name — get/create producer history`);
  console.log(`   GET /archive/producers/search — search producers`);
  console.log(`   GET /archive/producers — list all producers`);
  console.log(`   GET /archive/producers/region/:region — producers by region`);
});
