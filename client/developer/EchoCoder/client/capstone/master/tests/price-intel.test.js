import { priceBand, inferPrice } from "../src/modules/LiquorAI/price-intel.js";

test("Price banding for gin", ()=>{
  expect(priceBand("gin", 15)).toBe("low");
  expect(priceBand("gin", 40)).toBe("premium");
});

test("Infer price with reference", ()=>{
  const rec = { category:"gin", abv:40, size_ml:750 };
  const info = inferPrice(rec, 30);
  expect(info.band).toBe("fair");
});
