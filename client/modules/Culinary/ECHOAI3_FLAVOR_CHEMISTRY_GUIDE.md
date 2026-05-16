# EchoAi³ Flavor Chemistry & Balance Engine

## Understanding Ratios, Acidity, Emulsions, and Flavor Architecture

---

## 🧪 What Echo Now Understands

Echo can now reason about flavor and texture at the **chemistry level**:

### **1. Ingredient Chemistry**

Every ingredient has a profile with:

- **Acidity & pH** – how acidic (vinegar 5%, lemon 5.5%, cream 0%)
- **Fat Content** – oils 100%, butter 80%, egg yolk 30%
- **Sugar & Sweetness** – honey 80%, fruit varies
- **Volatile Aromatics** – limonene (citrus), allicin (garlic), sulfur compounds
- **Emulsifying Power** – egg yolk (★★★), mustard (★★★), mayo (★★★★)
- **Thickening Power** – starches, gums, purées
- **Browning Potential** – Maillard & caramelization tendency

### **2. Flavor Balance Calculations**

Given ingredient amounts, Echo calculates:

- **Fat-to-Acid Ratio** – classic vinaigrette is 3:1 oil:vinegar
- **Emulsion Stability** – can this hold together?
- **Aromatic Complexity** – from volatiles & sulfur compounds
- **Umami Depth** – from garlic, mustard, Parmesan, soy
- **Sweetness Level** – from honey, sugar, fruit
- **Overall Balance** – is it harmonious?

### **3. Smart Corrections**

Echo can now:

- Detect imbalances automatically
- Suggest specific fixes with amounts
- Fix broken emulsions
- Balance too-acidic or too-rich dishes
- Add missing aromatic depth

---

## 📊 Example 1: Vinaigrette Analysis

### User Says:

"I want to make a vinaigrette with 15g vinegar and 45g olive oil"

### Echo Analyzes:

```
Vinaigrette Balance Check:
- Ratio: 3:1 oil:vinegar ✓ PERFECT
- Fat: 45g olive oil (100% fat) = 45g fat
- Acid: 15g vinegar (5% acetic acid) = 0.75g acetic acid
- Emulsifiers: None detected → weak emulsion
- Aromatics: None detected → flat

RECOMMENDATIONS:
1. Add 2g Dijon mustard to stabilize emulsion (provides lecithin)
2. Add 1-2 minced garlic clove for aromatic lift
3. Add 0.5g honey to round acidity
4. Include 1g salt for seasoning (saltiness factor)
```

### Result:

New recipe with calculated changes → **balanced, stable, aromatic vinaigrette**

---

## 📊 Example 2: Mayonnaise Proportions

### User Says:

"I have 1 egg yolk. How much oil can I add?"

### Echo Knows:

- 1 egg yolk (~18g) can stabilize ~250ml oil (~230g)
- Egg yolk contains ~5g fat + lecithin (emulsifier)
- Max ratio before breakdown: ~1:40 yolk:oil

### Echo Responds:

```
Mayonnaise Capacity:
- Your 18g egg yolk can safely hold up to ~280g oil
- Safe working range: add oil in small amounts, whisking constantly
- If using 250g oil (standard): whisk in ~10% at first, then faster

Critical Temperature: Keep everything 20–22°C
If emulsion breaks: Start with new yolk, whisk in broken mixture slowly
```

---

## 📊 Example 3: Balance-Adjusted Hollandaise

### User Says:

"My hollandaise tastes too rich and buttery"

### Echo Analyzes:

```
Current: 3 egg yolks (54g) + 200g butter (160g fat)
Ratio: 1 yolk : 3.3g fat (very rich!)

DETECTION: Very high fat, low acid, minimal aromatic

SUGGESTED CORRECTIONS:
1. Add 15–20ml fresh lemon juice (add acid, aromatic citrus)
2. Add 2g white wine vinegar (balances richness)
3. Add pinch of cayenne (aromatic, subtle heat)
4. Result: Richer, more complex hollandaise

OR reduce butter by 30g and use lighter emulsification
```

---

## 🔬 Ingredient Chemistry Database

Echo includes pre-defined chemistry for common ingredients:

### Acids

- **White Vinegar**: 5% acetic acid, pH 2.4
- **Lemon Juice**: 5.5% citric acid, pH 2.0 (fresher notes)
- **Red Wine Vinegar**: 4–6% acetic acid (plus tannins)

### Fats & Oils

- **Olive Oil**: 100% fat, polyphenols (peppery), fruity aromatics
- **Butter**: 80% fat, diacetyl (creamy sweetness)
- **Egg Yolk**: 30% fat, lecithin (emulsifier), subtle sulfur

### Emulsifiers & Stabilizers

- **Dijon Mustard**: Lecithin + glucosides, ~0.7 strength, 1.5% acid
- **Egg Yolk**: Lecithin + proteins, ~1.0 strength (best)
- **Mayonnaise**: Pre-made emulsion, ~0.95 strength

### Aromatics

- **Garlic**: Allicin (pungent, sulfurous), umami depth
- **Shallot**: Milder sulfur, natural sweetness (great cooked)
- **Lemon Zest**: Limonene (bright citrus), high intensity

### Thickeners & Texturizers

- **Honey**: 40% thickening power, browning potential, rounds acidity
- **Egg Yolk**: 50% thickening power (from lecithin/proteins)
- **Cornstarch**: Up to 80% thickening power (if used)

---

## 🛠️ How to Use Flavor Chemistry in Code

### 1. **Analyze an Ingredient List**

```typescript
import { FlavorMatrix } from "@/echo/brain/flavorMatrix";
import { INGREDIENT_CHEMISTRY_DATABASE } from "@/echo/codex/ingredientChemistry";

const ingredients = [
  { ingredientId: "olive-oil", grams: 60 },
  { ingredientId: "white-vinegar", grams: 20 },
  { ingredientId: "dijon-mustard", grams: 2 },
  { ingredientId: "garlic", grams: 5 },
];

const balance = FlavorMatrix.calculateBalance(
  ingredients,
  INGREDIENT_CHEMISTRY_DATABASE,
);

console.log(balance);
// {
//   acid: 1.05,          // 1.05g actual acetic acid
//   fat: 60.0,           // 60g oil
//   sweet: 0.04,         // negligible
//   savory: 0.05,        // umami from garlic
//   aromatic: 2.4,       // volatiles from garlic & vinegar
//   fatToAcidRatio: 57.1, // TOO HIGH! Should be ~3:1
//   emulsionStability: 0.14, // weak without emulsifier
//   overallBalanceNotes: [
//     "Dish leans rich/fatty",
//     "Emulsion stability low for amount of fat",
//     "Aromatic complexity high"
//   ],
//   suggestions: [
//     "Add emulsifier (mustard, egg yolk, or mayo) to stabilize emulsion",
//     "Your ratio is too high; add acid (vinegar/lemon) to brighten"
//   ]
// }
```

### 2. **Check Vinaigrette Ratio**

```typescript
const { ratio, balanced, notes } = FlavorMatrix.balanceVinaigrette(
  60, // oil grams
  20, // vinegar grams
);

// ratio = 3.0 (perfect!)
// balanced = true
// notes = ["Ratio 3.00:1 is well-balanced."]
```

### 3. **Check Emulsion Capacity**

```typescript
const { stable, notes } = FlavorMatrix.assessEmulsionCapacity(
  18, // egg yolk grams
  250, // oil grams
);

// stable = true
// notes = ["Emulsion proportions stable: 18g emulsifier, 250g fat."]
```

### 4. **Get Auto-Corrections**

```typescript
const corrections = FlavorMatrix.suggestCorrections(balance);
// Returns array of specific suggestions based on imbalances
```

### 5. **In EchoChefBrain**

```typescript
import { EchoChefBrain } from "@/echo/brain";

// Analyze a recipe during suggestion/generation
const { balance, corrections } = EchoChefBrain.analyzeFlavorBalance(
  ingredients,
  INGREDIENT_CHEMISTRY_DATABASE,
  "vinaigrette",
);

// Use in suggestions
suggestion.recommendedChanges = corrections;
suggestion.flavorBalanceHint = balance;
```

---

## 📖 Common Use Cases

### **Case 1: Fixing a Broken Emulsion**

User reports: "My mayo broke during mixing"

Echo knows:

- Egg yolk can only stabilize so much oil
- Temperature matters (cold breaks faster)
- Adding oil too fast breaks emulsion
- Water/acid stops emulsion breaking

Echo suggests:

```
"Your emulsion broke because:
1. Oil-to-yolk ratio exceeded ~18:1
2. Oil was added too fast (or too warm)

RECOVERY OPTIONS:
A) Start fresh yolk, whisk in broken mayo slowly (50% recovery rate)
B) Add 5ml water/vinegar while whisking to extend capacity
C) Add 1-2 tbsp mayo/mustard to re-emulsify
```

### **Case 2: Balancing a Tomato-Based Sauce**

User says: "My sauce is too acidic"

Echo analyzes:

- Tomato acidity: 4.2 pH, ~3% acid
- No fat to buffer
- No sugar to round

Echo recommends:

```
"Add ONE of:
1. Butter/oil (1-2 tbsp) to coat palate and mellow acid
2. Honey/sugar (1 tsp) to round acidity
3. Baking soda pinch to neutralize acid (careful—fizzes!)

OR combine: 1 tbsp butter + 1 tsp honey for best result"
```

### **Case 3: Scaling a Complex Dressing**

User says: "I want to make 2x this Caesar dressing"

Echo knows:

- Emulsifiers don't scale linearly
- Garlic intensity compounds (use sparingly at 2x)
- Acid:fat ratio must hold
- Worcestershire umami impact increases

Echo suggests:

```
ORIGINAL (serves 4):
- 1 egg yolk
- 150ml oil
- 30ml lemon juice
- 2 cloves garlic
- 10g Parmesan

SCALED 2X (with adjustments):
- 1.5 egg yolks (not 2! provides enough emulsion)
- 300ml oil
- 60ml lemon juice
- 2.5 cloves garlic (scale sparingly)
- 20g Parmesan
- Add 1 tsp mayo if emulsion feels weak

This maintains ratios while respecting emulsion limits.
```

---

## 🎯 What Echo Can NOW Do

With IngredientChemistry + FlavorMatrix:

✅ **Analyze any sauce/dressing by composition**

- Acid balance
- Fat balance
- Emulsion stability
- Aromatic complexity
- Umami depth

✅ **Predict outcomes**

- Will this emulsion hold?
- Will this taste balanced?
- Will this brown nicely?
- Will this stay fresh?

✅ **Suggest specific fixes**

- "Add 15g oil to adjust ratio"
- "Add 2g mustard to stabilize"
- "Add 5ml vinegar to brighten"

✅ **Generalize across dishes**

- Vinaigrettes
- Mayonnaise & aïoli
- Hollandaise & beurre blanc
- Emulsified butter sauces
- Tahini & yogurt dressings
- Chimichurri & pesto

✅ **Fix failed recipes**

- Broken emulsions → recovery steps
- Imbalanced sauces → precise adjustments
- Weak flavor → aromatics/umami additions

---

## 🔮 Future Expansions

To go even deeper, Echo could also learn:

1. **Thermal Behavior**
   - How ingredients respond to heat
   - When emulsions break at temperature
   - Browning curves

2. **Structural Science**
   - Gluten development in doughs
   - Foam stability (meringue, mousse)
   - Gelation in custards

3. **Chemical Interactions**
   - Salt effects on proteins
   - Acid effects on egg proteins
   - Enzyme action (meat tenderization)

4. **Microbial Safety**
   - pH thresholds for preservation
   - Water activity for shelf-life
   - Temperature abuse recovery

---

## 📚 Summary

**IngredientChemistry + FlavorMatrix = Echo's Culinary Reasoning Engine**

Echo is now:

- 🧪 A chemist (understands ingredient composition)
- ⚖️ A balance expert (optimizes ratios)
- 🔧 A troubleshooter (fixes broken dishes)
- 📖 A generalizer (applies rules across cuisines)

This is how Echo learns to think like a **master chef** who understands not just _what_ to cook, but **why** it works.

---

**EchoAi³ Flavor Chemistry Engine v1.0**  
Enabling culinary reasoning at the molecular level.
