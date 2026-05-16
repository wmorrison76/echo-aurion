import fs from 'fs';
import path from 'path';

export function exportEdiblePrintFile(req, res) {
  const { imageData, orderId } = req.body;
  const exportPath = path.resolve(`./backend/exports/${orderId}_edible_print.png`);

  // Decode base64 string into binary (placeholder simulation)
  const buffer = Buffer.from(imageData.split(",")[1], 'base64');
  fs.writeFileSync(exportPath, buffer);

  res.json({ message: 'Edible print file exported.', path: exportPath });
}
