// Zelda Data Vault Backup Tool
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");

const dataDirs = ["user_uploads", "invoices", "pdf_menus"];
const srcRoot = path.resolve(__dirname, "../LUCCCA");
const destRoot = path.resolve(__dirname, "../LUCCCA_DataVault");

dataDirs.forEach(dir => {
  const src = path.join(srcRoot, dir);
  const dest = path.join(destRoot, dir);
  if (fs.existsSync(src)) {
    fse.copySync(src, dest, { overwrite: true });
    console.log(`✅ Backed up ${dir} to DataVault`);
  }
});
