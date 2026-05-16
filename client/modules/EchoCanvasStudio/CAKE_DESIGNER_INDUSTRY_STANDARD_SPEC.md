# Cake Designer: Industry Standard Specification
**Version 1.0** | Built for bakery operations from order to execution

---

## Executive Summary

This specification defines the **gold standard** for digital cake design, ordering, and execution in the baking industry. It combines:
- ✅ **Cake Mathematics** (serving calculations, geometry, structural support)
- ✅ **Component-Based Generation** (reproducible, layer-by-layer)
- ✅ **Embedded Metadata** (full cake DNA in every image)
- ✅ **3D Photorealistic Rendering** (360° rotation)
- ✅ **Professional Workflows** (chef review, client approval, kitchen execution)
- ✅ **Financial + Staffing Integration** (cost tracking, production scheduling)

---

## Part 1: Cake Mathematics & Geometry

### 1.1 Serving Size Calculations

**Standard Industry Rules:**
```
- Round Cakes: 1 slice = 1 serving (60° wedge, ~2.5" width at edge)
- Sheet Cakes: 1 slice = 1 serving (2"x3" rectangle)
- Servings per cake size:

ROUND CAKES (All single-tier examples):
- 4" = 8-10 servings
- 6" = 12-16 servings
- 8" = 20-24 servings
- 10" = 28-32 servings
- 12" = 40-48 servings
- 14" = 56-64 servings
- 16" = 80-96 servings
- 18" = 120-140 servings

SHEET CAKES:
- Half sheet (13"x18") = 24-30 servings
- Full sheet (18"x26") = 48-60 servings
- Quarter sheet (9"x13") = 12-15 servings

MULTI-TIER CALCULATIONS:
Total Servings = Sum of all tier servings
Example: 10" + 8" + 6" = 28 + 20 + 12 = 60 servings
```

**Database Schema:**
```typescript
interface CakeSizeData {
  cakeType: "round" | "sheet" | "specialty";
  diameter?: number; // inches (round)
  length?: number; // inches (sheet)
  width?: number; // inches (sheet)
  servingsPerSize: number;
  cakeCapacity: {
    min: number; // Conservative
    max: number; // Optimistic
    recommended: number;
  };
  frosting: {
    buttercreamOz: number; // ounces needed
    fondantOz: number;
  };
  bakeTime: number; // minutes
  coolingTime: number; // hours
  shippingWeight: number; // lbs when boxed
}

// Examples:
const roundCakeSizes: CakeSizeData[] = [
  {
    cakeType: "round",
    diameter: 10,
    servingsPerSize: 30, // 28-32 typical
    cakeCapacity: { min: 25, max: 32, recommended: 28 },
    frosting: { buttercreamOz: 32, fondantOz: 48 },
    bakeTime: 45,
    coolingTime: 3,
    shippingWeight: 5.5
  },
  // ... more sizes
];
```

### 1.2 Structural Support Geometry

**Critical for multi-tier cakes:**

```typescript
interface CakeTier {
  position: number; // 1 (bottom) to N (top)
  diameter: number; // inches
  height: number; // inches
  weight: number; // lbs (cake + frosting)
}

interface SupportStructure {
  tiers: CakeTier[];
  supportType: "dowel-rods" | "bubble-tea-straws" | "pillars" | "hidden-cake";
  dowelSpacing: number; // inches between dowels
  dowelCount: number;
  dowelDiameter: number; // mm (typically 3-4mm)
  dowelLength: number; // inches
  dowelPlacement: "interior" | "edge";
  pillars?: {
    type: "plastic" | "crystal" | "porcelain";
    height: number; // inches
    count: number;
    placement: "corners" | "center";
  };
}

// CRITICAL GEOMETRY RULES:
const structuralRules = {
  // Dowel spacing rule: 2-3" apart minimum
  minDownelSpacing: 2,
  maxDownelSpacing: 3.5,
  
  // Weight distribution rule: Each lower tier must support above it
  weightBearingRule: (tierIndex: number, tiers: CakeTier[]) => {
    const weightAbove = tiers
      .slice(tierIndex + 1)
      .reduce((sum, tier) => sum + tier.weight, 0);
    return weightAbove;
  },
  
  // Dowel count rule: Based on tier diameter and weight
  dowelCountFormula: (diameterInches: number, weightLbs: number) => {
    // Minimum: 1 dowel per 4" of diameter
    const byDiameter = Math.ceil(diameterInches / 4);
    // Minimum: 1 dowel per 5 lbs of weight above
    const byWeight = Math.ceil(weightLbs / 5);
    // Use the greater of the two
    return Math.max(byDiameter, byWeight, 3); // Minimum 3 dowels
  },
  
  // Offset rule: Top tier dowels placed 1" in from diameter edge
  dowelOffsetFromEdge: 1,
};

// EXAMPLE: Calculate support for 3-tier cake
const calculateStructure = (tiers: CakeTier[]): SupportStructure => {
  const structure: SupportStructure = {
    tiers,
    supportType: "dowel-rods",
    dowelDiameter: 3.15, // Standard wooden dowel
    dowelPlacement: "interior",
    dowelSpacing: 2.5,
    dowels: []
  };
  
  // For each tier (except top)
  tiers.forEach((tier, index) => {
    if (index === tiers.length - 1) return; // Skip top tier
    
    const weightAbove = structuralRules.weightBearingRule(index, tiers);
    const dowelCount = structuralRules.dowelCountFormula(tier.diameter, weightAbove);
    
    // Calculate dowel positions in a circle
    const radius = (tier.diameter / 2) - structuralRules.dowelOffsetFromEdge;
    const angleIncrement = (360 / dowelCount);
    
    const dowels = Array.from({ length: dowelCount }, (_, i) => ({
      angle: i * angleIncrement,
      radiusFromCenter: radius,
      xPos: radius * Math.cos((i * angleIncrement) * Math.PI / 180),
      yPos: radius * Math.sin((i * angleIncrement) * Math.PI / 180),
      length: calculateDownelLength(tier, tiers, index)
    }));
    
    structure.dowels.push({
      tierIndex: index,
      count: dowelCount,
      positions: dowels
    });
  });
  
  return structure;
};

// Calculate how far down each dowel goes
const calculateDownelLength = (tier: CakeTier, tiers: CakeTier[], tierIndex: number) => {
  // Dowel goes from top of this tier through all tiers below it
  const tierHeight = tier.height;
  const tiersBelow = tiers.slice(tierIndex + 1).map(t => t.height);
  const totalHeight = tierHeight + tiersBelow.reduce((a, b) => a + b, 0);
  
  // Add 0.5" safety margin into bottom tier
  return totalHeight + 0.5;
};
```

### 1.3 Tier Sizing Strategies

**Strategy A: Decreasing Tiers (Traditional)**
```typescript
const decreasingTierStrategy = {
  name: "Decreasing Tiers",
  description: "Each tier smaller than the one below",
  calculation: (baseSize: number, tierCount: number) => {
    const tiers = [];
    for (let i = 0; i < tierCount; i++) {
      const reduction = 2 * i; // 2" smaller per tier
      tiers.push({
        position: i + 1,
        diameter: baseSize - reduction,
        servings: calculateServings(baseSize - reduction)
      });
    }
    return tiers;
  },
  example: [
    { position: 1, diameter: 12, servings: 48 },
    { position: 2, diameter: 10, servings: 28 },
    { position: 3, diameter: 8, servings: 20 },
    { position: 4, diameter: 6, servings: 12 }
  ],
  totalServings: 108,
  structure: "Requires dowels, most common"
};

// Strategy B: Same Size Tiers (Cake Stacking)
const sameSizeTierStrategy = {
  name: "Same Size Tiers",
  description: "All tiers identical diameter",
  pros: ["Modern look", "More flexible", "Less support needed"],
  cons: ["Can look heavy if 4+ tiers", "More frosting visible between tiers"],
  example: [
    { position: 1, diameter: 10, servings: 28 },
    { position: 2, diameter: 10, servings: 28 },
    { position: 3, diameter: 10, servings: 28 },
  ],
  totalServings: 84,
  structure: "Requires dowels or separator cake inside"
};

// Strategy C: Hybrid (Some tiers same, some decreasing)
const hybridStrategy = {
  name: "Hybrid",
  description: "Mix of same size and decreasing",
  example: [
    { position: 1, diameter: 12, servings: 48 },
    { position: 2, diameter: 12, servings: 48 }, // Same as tier 1
    { position: 3, diameter: 8, servings: 20 },  // Smaller
  ],
  totalServings: 116,
  uses: "Modern + traditional blend"
};

// Strategy D: Offset/Pillar Separated
const offsetStrategy = {
  name: "Offset/Pillar Design",
  description: "Tiers separated by tall pillars",
  pros: ["Very modern", "Good for all different sizes"],
  cons: ["More expensive", "Harder to transport"],
  requires: "Crystal or decorative pillars"
};
```

### 1.4 Sheet Cake Calculations

```typescript
interface SheetCakePortion {
  sheetSize: "full" | "half" | "quarter";
  dimensions: { length: number; width: number }; // inches
  servings: number;
  commonCuts: Array<{ pattern: string; servings: number; pieceSize: string }>;
}

const sheetCakeMath: SheetCakePortion[] = [
  {
    sheetSize: "full",
    dimensions: { length: 18, width: 26 },
    servings: 54, // 6 across x 9 down = 54 pieces (3"x2.67")
    commonCuts: [
      { pattern: "6x9", servings: 54, pieceSize: "3\" x 2.67\"" },
      { pattern: "5x8", servings: 40, pieceSize: "3.6\" x 3.25\"" },
      { pattern: "4x6", servings: 24, pieceSize: "4.5\" x 4.33\"" },
    ]
  },
  {
    sheetSize: "half",
    dimensions: { length: 13, width: 18 },
    servings: 27, // 6 across x 4.5 down
    commonCuts: [
      { pattern: "6x5", servings: 30, pieceSize: "3\" x 3.6\"" },
      { pattern: "3x3", servings: 9, pieceSize: "4.33\" x 6\"" },
    ]
  },
  {
    sheetSize: "quarter",
    dimensions: { length: 9, width: 13 },
    servings: 15,
    commonCuts: [
      { pattern: "3x5", servings: 15, pieceSize: "3\" x 2.6\"" },
    ]
  }
];
```

---

## Part 2: Component-Based Generation with Seeding

### 2.1 Cake Component Architecture

```typescript
interface CakeComponent {
  id: string;
  componentType: "base-layer" | "middle-layer" | "top-layer" | "frosting" | "decoration" | "modifier";
  seed: string; // Fixed seed for reproducibility
  
  // Layer-specific
  diameter?: number;
  height?: number;
  flavor: string;
  color: string;
  
  // Frosting-specific
  frostingType?: "buttercream" | "fondant" | "ganache" | "cream-cheese";
  texture?: "smooth" | "piped" | "rustic" | "drip" | "painted";
  pattern?: string; // e.g., "rose-piping", "basketweave"
  
  // Decoration-specific
  decorationItems?: string[]; // ["fresh-roses", "pearls", "gold-leaf"]
  decorationSeed?: string;
  
  // Metadata
  generatedWith: "stable-diffusion-xl" | "dall-e-3" | "leonardo";
  prompt: string;
  negativePrompt?: string;
  quality: "quick" | "detailed";
  imageUrl: string;
  imageMeta: {
    width: number;
    height: number;
    format: "png" | "jpg";
    fileSize: number;
  };
}

interface CompleteCakeDesign {
  cakeId: string;
  name: string;
  masterSeed: string; // Parent seed for reproducibility
  
  components: {
    baseLayers: CakeComponent[];
    middleLayers: CakeComponent[];
    topLayer: CakeComponent;
    frosting: CakeComponent;
    decorations: CakeComponent[];
  };
  
  composition: {
    tierSizes: number[];
    totalHeight: number;
    totalServings: number;
    supportStructure: SupportStructure;
  };
  
  // Embedded metadata (stored in image)
  metadata: {
    createdAt: timestamp;
    createdBy: chefId;
    basePrompt: string;
    enhancements: string[]; // ["add-gold-accents", "increase-texture"]
    renderingNotes: string;
    bakingInstructions: string;
    structuralNotes: string;
  };
  
  // Version history
  versions: Array<{
    versionNumber: number;
    changes: string[];
    imageUrl: string;
    timestamp: timestamp;
  }>;
}
```

### 2.2 Component Generation Pipeline

```typescript
// STAGE 1: Quick Preview (2-3 seconds)
const quickPreviewGeneration = async (specifications: CakeSpecification) => {
  const components = [];
  
  // Base layer (quick render)
  components.push(
    await generateComponent({
      type: "base-layer",
      seed: specifications.masterSeed + "-base",
      quality: "quick", // Lower resolution
      prompt: buildQuickPrompt(specifications),
      generator: "dalle3" // Fastest
    })
  );
  
  // Middle layers (reuse base or quick version)
  if (specifications.tierSizes.length > 2) {
    components.push(
      await generateComponent({
        type: "middle-layer",
        seed: specifications.masterSeed + "-middle",
        quality: "quick",
        prompt: buildQuickPrompt(specifications),
        generator: "dalle3"
      })
    );
  }
  
  // Top layer (minimal detail)
  components.push(
    await generateComponent({
      type: "top-layer",
      seed: specifications.masterSeed + "-top",
      quality: "quick",
      prompt: buildQuickPrompt(specifications),
      generator: "dalle3"
    })
  );
  
  // Quick frosting (texture only, not detailed)
  components.push(
    await generateComponent({
      type: "frosting",
      seed: specifications.masterSeed + "-frosting",
      quality: "quick",
      prompt: buildFrostingPrompt(specifications, "quick"),
      generator: "dalle3"
    })
  );
  
  // Compose into single image
  return await composeComponentsIntoImage(components, "quick");
};

// STAGE 2: Detailed Version (Same image, higher quality)
const detailedEnhancedGeneration = async (quickVersion: CakeDesign) => {
  // Use SAME SEED, but with enhanced prompts and higher quality generator
  const components = [];
  
  // Re-generate each component with detailed prompt
  for (const baseComponent of quickVersion.components.baseLayers) {
    components.push(
      await generateComponent({
        type: baseComponent.componentType,
        seed: baseComponent.seed, // SAME SEED
        quality: "detailed", // Higher resolution
        prompt: buildDetailedPrompt(baseComponent, quickVersion.metadata),
        generator: "stable-diffusion-xl" // Higher quality
      })
    );
  }
  
  // Same for other components...
  
  // Compose with higher detail
  return await composeComponentsIntoImage(components, "detailed");
};

// HELPER: Build prompt for component
const buildDetailedComponentPrompt = (component: CakeComponent, cakeSpec: CakeSpecification) => {
  return `
    Cake tier: ${component.diameter || "custom"} inch, ${component.flavor} cake
    Height: ${component.height || "standard"} inches
    Color: ${component.color}, extremely detailed and photorealistic
    Frosting: ${cakeSpec.frosting.frostingType} in ${cakeSpec.frosting.color}
    Texture detail: Show creamy, smooth finish with visible texture
    Lighting: Professional studio lighting, shadows showing dimension
    Focus: Sharp detail on frosting texture, smooth surface, no crumbs
    Style: Professional bakery quality, magazine-worthy presentation
    Background: Clean white, studio backdrop
    Detail level: Ultra high-detail, every texture visible
    ${cakeSpec.decorations ? `Decorations: ${cakeSpec.decorations.join(", ")}` : ""}
  `;
};
```

### 2.3 Seed-Based Reproducibility

```typescript
// Generate consistent cakes from same master seed
const reproduceCakeFromSeed = async (masterSeed: string) => {
  // Database lookup
  const originalCake = await db.query(
    "SELECT * FROM cake_designs WHERE masterSeed = ?",
    [masterSeed]
  );
  
  if (!originalCake) {
    // Can regenerate from embedded metadata
    const metadata = parseEmbeddedMetadata(originalCake.imageUrl);
    return regenerateComponentsFromMetadata(metadata, masterSeed);
  }
  
  // Components with same seed will generate identical images
  return {
    ...originalCake,
    components: originalCake.components, // Already generated, cached
    reproducible: true,
    note: "Exact same cake as original - all components identical"
  };
};

// CRITICAL: Seed mapping for component consistency
const seedStructure = {
  masterSeed: "cake_wedding_001", // UUID or descriptive
  components: {
    baseLayers: ["cake_wedding_001-base", "cake_wedding_001-base-detail"],
    middleLayers: ["cake_wedding_001-mid", "cake_wedding_001-mid-detail"],
    topLayer: ["cake_wedding_001-top", "cake_wedding_001-top-detail"],
    frosting: ["cake_wedding_001-frosting-quick", "cake_wedding_001-frosting-detailed"],
    decorations: ["cake_wedding_001-deco-roses", "cake_wedding_001-deco-gold"]
  }
};

// Same seed + same prompt = same image (with Stable Diffusion)
// If using DALL-E: save output image, reuse for detailed version
```

---

## Part 3: Image Metadata Embedding

### 3.1 Embedded Metadata Schema

```typescript
interface EmbeddedCakeMetadata {
  // Core identity
  cakeId: string;
  masterSeed: string;
  name: string;
  
  // Components breakdown
  structure: {
    tiers: Array<{
      position: number;
      diameter: number;
      height: number;
      flavor: string;
      color: string;
      servings: number;
      componentSeed: string;
    }>;
    totalServings: number;
    totalHeight: number;
  };
  
  // Frosting details
  frosting: {
    type: "buttercream" | "fondant" | "ganache" | "cream-cheese";
    color: string;
    colorHex: string;
    texture: string;
    pattern: string;
    weight: number; // ounces
  };
  
  // Support geometry
  supportStructure: {
    dowelCount: number;
    dowelDiameter: number;
    dowelLength: number;
    dowelPositions: Array<{ x: number; y: number }>;
    supportNotes: string;
  };
  
  // Decorations
  decorations: Array<{
    item: string;
    quantity: number;
    position: string;
    color?: string;
    notes?: string;
  }>;
  
  // Generation info
  generation: {
    generator: "stable-diffusion-xl" | "dalle3" | "leonardo";
    prompt: string;
    negativePrompt?: string;
    masterSeed: string;
    componentSeeds: Record<string, string>;
    generatedAt: timestamp;
    generatedBy: string; // chef ID
    quality: "quick" | "detailed";
  };
  
  // Professional metadata
  professional: {
    estimatedBakingTime: number; // minutes
    estimatedPreppingTime: number;
    estimatedAssemblyTime: number;
    requiredSkillLevel: "beginner" | "intermediate" | "advanced" | "expert";
    cost: {
      ingredients: number;
      labor: number;
      markup: number;
      totalPrice: number;
    };
    dietary: {
      vegan: boolean;
      glutenFree: boolean;
      dairyFree: boolean;
      allergens: string[];
    };
    shippingWeight: number; // lbs
    boxSize: string; // 14x14x8, etc.
    shippingNotes: string;
  };
  
  // Kitchen execution
  kitchen: {
    assignedTo?: string; // Baker name
    startDate?: date;
    completionDate?: date;
    specialInstructions: string;
    structureNotes: string;
    tempControlNeeded: boolean;
    delicateness: "robust" | "moderate" | "delicate" | "very-delicate";
  };
  
  // Client info (for reordering)
  client?: {
    clientId: string;
    previousOrderId?: string;
    modifications?: string[]; // What customer changed
    feedbackScore?: number;
    notes?: string;
  };
  
  // Version control
  versionHistory: Array<{
    version: number;
    changes: string[];
    timestamp: timestamp;
    modifiedBy: string;
  }>;
}
```

### 3.2 Image Metadata Embedding Methods

```typescript
// METHOD 1: PNG metadata (EXIF-like)
const embedMetadataInPNG = async (
  imageBuffer: Buffer,
  metadata: EmbeddedCakeMetadata
): Promise<Buffer> => {
  // Use png-js-image library
  const pngImage = PNG.sync.read(imageBuffer);
  
  // Add metadata chunks
  const metadataJson = JSON.stringify(metadata);
  const textChunk = {
    keyword: "CakeDesign",
    text: metadataJson
  };
  
  pngImage.text.push(textChunk);
  return PNG.sync.write(pngImage);
};

// METHOD 2: JPEG metadata (IPTC/XMP)
const embedMetadataInJPEG = async (
  imageBuffer: Buffer,
  metadata: EmbeddedCakeMetadata
): Promise<Buffer> => {
  // Use piexifjs library
  const exifDict = {
    "0th": {
      271: metadata.cakeId, // Make
      272: metadata.masterSeed, // Model
      305: JSON.stringify(metadata) // Software field (can hold JSON)
    }
  };
  
  const exifBytes = piexif.dump(exifDict);
  return piexif.insert(exifBytes, imageBuffer);
};

// METHOD 3: Sidecar file (most reliable)
const embedMetadataAsSidecar = async (
  imageUrl: string,
  metadata: EmbeddedCakeMetadata
) => {
  const fileName = imageUrl.split("/").pop().split(".")[0];
  const metadataFile = `${fileName}.cake-metadata.json`;
  
  await saveToCloudStorage(metadataFile, JSON.stringify(metadata));
  
  return {
    imageUrl,
    metadataUrl: metadataFile,
    extracted: false, // Will extract from metadata file
    hint: "Download .cake-metadata.json file for full cake details"
  };
};

// EXTRACTION: Read metadata back
const extractCakeMetadata = async (imageUrl: string): Promise<EmbeddedCakeMetadata> => {
  try {
    // Try PNG text chunks
    const pngData = await PNG.sync.read(await downloadImage(imageUrl));
    const textChunk = pngData.text.find(t => t.keyword === "CakeDesign");
    if (textChunk) return JSON.parse(textChunk.text);
    
    // Try JPEG EXIF
    const jpegData = await piexif.load(imageUrl);
    if (jpegData["0th"][305]) {
      return JSON.parse(jpegData["0th"][305]);
    }
    
    // Fallback: Try sidecar file
    const sidecarUrl = imageUrl.replace(/\.[^.]+$/, ".cake-metadata.json");
    const response = await fetch(sidecarUrl);
    if (response.ok) return await response.json();
    
    throw new Error("No cake metadata found in image");
  } catch (error) {
    console.error("Failed to extract metadata:", error);
    return null;
  }
};
```

---

## Part 4: 3D Photorealistic Rotation Viewer

### 4.1 Multi-Angle Generation Strategy

```typescript
interface CakeRotationAsset {
  masterSeed: string;
  angles: Array<{
    degrees: number; // 0, 45, 90, 135, 180, 225, 270, 315
    imageUrl: string;
    imageBuffer: Buffer;
  }>;
  composition: {
    imageWidth: number;
    imageHeight: number;
    cakeWidthPixels: number; // Actual cake area in image
    rotationAxis: { x: number; y: number }; // Center point
  };
}

// Generate 8 angles for full 360° rotation
const generateRotationAsset = async (cakeSpec: CakeSpecification) => {
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];
  const asset: CakeRotationAsset = {
    masterSeed: cakeSpec.masterSeed,
    angles: [],
    composition: {
      imageWidth: 1024,
      imageHeight: 1024,
      cakeWidthPixels: 512,
      rotationAxis: { x: 512, y: 512 }
    }
  };
  
  for (const angle of angles) {
    const prompt = buildRotationPrompt(cakeSpec, angle);
    const seed = `${cakeSpec.masterSeed}-rotation-${angle}`;
    
    const image = await generateComponent({
      type: "full-cake-rotation",
      seed,
      quality: "detailed",
      prompt, // Includes camera angle
      generator: "stable-diffusion-xl",
      parameters: {
        cameraRotation: angle,
        elevation: 25, // Slight overhead view
        lighting: "professional-studio",
        background: "clean-white"
      }
    });
    
    asset.angles.push({
      degrees: angle,
      imageUrl: image.url,
      imageBuffer: image.buffer
    });
  }
  
  return asset;
};

// Build rotation-specific prompt
const buildRotationPrompt = (cakeSpec: CakeSpecification, angle: number) => {
  const cameraDescription = {
    0: "front view, directly facing the cake",
    45: "45-degree angle, front and right side visible",
    90: "right side view, 90-degree angle",
    135: "back-right view, 135-degree angle",
    180: "back view, directly facing the back",
    225: "back-left view, 225-degree angle",
    270: "left side view, 90-degree from right",
    315: "front-left view, 315-degree angle"
  };
  
  return `
    Complete ${cakeSpec.tierCount}-tier ${cakeSpec.cakeName} cake
    Camera angle: ${cameraDescription[angle]}
    Height: ${cakeSpec.totalHeight} inches tall
    Tiers: ${cakeSpec.tierSizes.join(", ")} inch diameters
    Frosting: ${cakeSpec.frosting.type} in ${cakeSpec.frosting.color}
    Decorations: ${cakeSpec.decorations.join(", ")}
    
    Photorealistic professional bakery photograph
    Studio lighting with soft shadows
    White seamless background
    Shot on professional camera with perfect focus
    High detail showing frosting texture and decorations
    Lighting shows dimension and depth
    No cropping - full cake visible
    Perfect staging for bakery portfolio
  `;
};
```

### 4.2 3D Viewer Implementation (React + Three.js)

```typescript
// Frontend component for 360° rotation
interface CakeRotationViewerProps {
  cakeId: string;
  rotationAsset: CakeRotationAsset;
  autoRotate?: boolean;
  rotationSpeed?: number;
}

const CakeRotationViewer: React.FC<CakeRotationViewerProps> = ({
  cakeId,
  rotationAsset,
  autoRotate = true,
  rotationSpeed = 2 // degrees per frame
}) => {
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Map rotation to closest available angle
  const getImageForAngle = (angle: number) => {
    const normalizedAngle = angle % 360;
    const angleIndex = Math.round(normalizedAngle / 45) % 8;
    return rotationAsset.angles[angleIndex];
  };
  
  // Mouse drag handling
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.movementX;
    const newAngle = currentAngle + (deltaX * 0.5);
    setCurrentAngle(newAngle);
  };
  
  // Touch swipe handling
  const handleTouchMove = (e: TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - lastTouchX;
    setCurrentAngle(currentAngle + (deltaX * 0.5));
    lastTouchX = e.touches[0].clientX;
  };
  
  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate) return;
    
    const interval = setInterval(() => {
      setCurrentAngle(prev => (prev + rotationSpeed) % 360);
    }, 30);
    
    return () => clearInterval(interval);
  }, [autoRotate, rotationSpeed]);
  
  return (
    <div
      ref={canvasRef}
      style={{
        width: "100%",
        height: "600px",
        backgroundColor: "#f5f5f5",
        backgroundImage: `url(${getImageForAngle(currentAngle).imageUrl})`,
        backgroundSize: "contain",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none"
      }}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseMove={handleMouseMove}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={handleTouchMove}
    >
      {/* Angle indicator */}
      <div style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        color: "white",
        backgroundColor: "rgba(0,0,0,0.5)",
        padding: "10px 20px",
        borderRadius: "8px",
        fontSize: "14px"
      }}>
        Angle: {Math.round(currentAngle)}° | Drag to rotate
      </div>
      
      {/* Preset angle buttons */}
      <div style={{
        position: "absolute",
        top: "20px",
        right: "20px",
        display: "flex",
        gap: "8px"
      }}>
        {["Front", "Right", "Back", "Left"].map((label, i) => (
          <button
            key={label}
            onClick={() => setCurrentAngle(i * 90)}
            style={{
              padding: "8px 12px",
              backgroundColor: currentAngle % 360 === (i * 90 % 360) ? "#00f0ff" : "#333",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer"
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};
```

---

## Part 5: Professional Workflow Integration

### 5.1 Chef Interface

```typescript
interface ChefWorkflowStep {
  step: number;
  name: string;
  action: () => Promise<void>;
  requiresReview: boolean;
}

const chefWorkflow: ChefWorkflowStep[] = [
  {
    step: 1,
    name: "Review Order & Specifications",
    action: async () => {
      // Load cake specs, budget, deadline
      // Review structural requirements
      // Check for special requests/allergies
    },
    requiresReview: true
  },
  {
    step: 2,
    name: "Generate Quick Preview",
    action: async () => {
      // Quick 2-3 second preview
      // Chat with client if needed
      // Get preliminary approval
    },
    requiresReview: true
  },
  {
    step: 3,
    name: "Generate Detailed Image",
    action: async () => {
      // Detailed version (10-15 seconds)
      // Show textures, frosting, decorations
    },
    requiresReview: true
  },
  {
    step: 4,
    name: "Generate Rotation Asset",
    action: async () => {
      // Generate 8 angles for 360° view
      // Show structural support diagram
    },
    requiresReview: true
  },
  {
    step: 5,
    name: "Confirm with Client",
    action: async () => {
      // Share 360° view with client
      // Get final approval
      // Collect payment
    },
    requiresReview: true
  },
  {
    step: 6,
    name: "Print Cake Plan for Kitchen",
    action: async () => {
      // Print high-resolution image
      // Print ingredient list
      // Print structural diagram
      // Print timeline
    },
    requiresReview: false
  },
  {
    step: 7,
    name: "Assign to Baker & Schedule",
    action: async () => {
      // Assign to specific baker
      // Set production timeline
      // Set delivery date/time
      // Add to kitchen schedule
    },
    requiresReview: true
  }
];
```

### 5.2 Client Approval Workflow

```typescript
interface ClientApprovalRequest {
  orderId: string;
  cakeDesign: CompleteCakeDesign;
  stage: "quick-preview" | "detailed-image" | "rotation-view" | "final-approval";
  
  // Communication
  message?: string;
  sharingLink: string;
  expiresAt: timestamp;
  
  // Approval tracking
  approvalHistory: Array<{
    stage: string;
    approvedAt: timestamp;
    approvedBy: string;
    changes?: string[];
    notes?: string;
  }>;
}

const sendClientApprovalRequest = async (request: ClientApprovalRequest) => {
  // Email with secure link to view cake
  // Link expires after 7 days
  // Track if client viewed, approved, or requested changes
  // If changes: loop back to chef workflow
  // If approved: trigger payment processing
};
```

---

## Part 6: Financial & Staffing Integration

### 6.1 Costing Model

```typescript
interface CakeCost {
  cakeId: string;
  
  // Material costs
  materials: {
    cake: { quantity: number; unit: "servings"; costPerUnit: number; total: number };
    frosting: { quantity: number; unit: "oz"; costPerUnit: number; total: number };
    decorations: Array<{ item: string; quantity: number; cost: number }>;
    structure: { dowels: number; cost: number; other: number };
    packaging: { box: number; insert: number; other: number };
    total: number;
  };
  
  // Labor costs
  labor: {
    baking: { hours: number; ratePerHour: number; total: number };
    decorating: { hours: number; ratePerHour: number; total: number };
    assembly: { hours: number; ratePerHour: number; total: number };
    delivery: { hours: number; ratePerHour: number; total: number };
    total: number;
  };
  
  // Overhead
  overhead: {
    facility: number;
    utilities: number;
    otherPercentage: number; // % of materials + labor
    total: number;
  };
  
  // Pricing
  pricing: {
    totalCost: number;
    profitMargin: number; // %
    markupMultiplier: number; // 2.5x, 3x, etc.
    suggestedPrice: number;
    minPrice: number;
    maxPrice: number;
  };
};

// Auto-calculate pricing
const calculateCakeCost = (design: CompleteCakeDesign): CakeCost => {
  const { servings, complexity } = design;
  
  // Material costs based on servings
  const cakeCost = servings * 0.75; // $0.75 per serving
  const frostingCost = servings * 0.50; // Based on type
  const decorationsCost = design.decorations.reduce(...); // Per item
  const structureCost = design.supportStructure.dowelCount * 0.50;
  const packagingCost = getPackagingCost(servings);
  
  const totalMaterials = cakeCost + frostingCost + decorationsCost + structureCost + packagingCost;
  
  // Labor costs based on complexity
  const baseHours = {
    "beginner": 3,
    "intermediate": 5,
    "advanced": 8,
    "expert": 12
  };
  const laborCost = baseHours[complexity] * hourlyRate;
  
  const totalCost = totalMaterials + laborCost + (overhead);
  const suggestedPrice = totalCost * 2.5; // 2.5x markup standard
  
  return {
    cakeId: design.cakeId,
    materials: { total: totalMaterials },
    labor: { total: laborCost },
    pricing: {
      totalCost,
      suggestedPrice,
      profitMargin: ((suggestedPrice - totalCost) / suggestedPrice) * 100
    }
  };
};
```

### 6.2 Staffing & Scheduling

```typescript
interface ProductionSchedule {
  orderId: string;
  cakeDesign: CompleteCakeDesign;
  
  timeline: {
    orderDate: date;
    deliveryDate: date;
    daysToProduction: number;
  };
  
  assignments: Array<{
    task: "baking" | "decorating" | "assembly" | "delivery";
    assignedTo: string; // Baker name/ID
    startTime: timestamp;
    estimatedDuration: number; // hours
    endTime: timestamp;
    priority: "low" | "normal" | "high" | "urgent";
    resources: {
      ovens: number;
      fridgeSpace: number; // cubic feet
      counterSpace: number; // sq feet
      equipment: string[]; // pastry bags, turntable, etc.
    };
  }>;
  
  constraints: {
    mustCompleteBy: timestamp;
    refrigerationRequired: boolean;
    delicateHandling: boolean;
    multiPersonRequired: boolean;
    specialEquipment: string[];
  };
  
  staffingNotes: string;
  contingencyPlan: string;
}

const buildProductionSchedule = (order: Order, design: CompleteCakeDesign): ProductionSchedule => {
  const daysUntilDelivery = daysBetween(new Date(), order.deliveryDate);
  const estimatedProductionTime = 12; // hours
  const productionStartDate = subtractDays(order.deliveryDate, Math.ceil(daysUntilDelivery));
  
  // Find available baker
  const availableBaker = findAvailableBaker(productionStartDate, estimatedProductionTime);
  
  return {
    // ... timeline, assignments, etc.
  };
};
```

---

## Part 7: Technology Stack Recommendations

### Best-in-Class AI Generators

```
FOR REPRODUCIBILITY (Component-Based):
✅ Stable Diffusion XL with seed control
✅ Leonardo.AI with seed parameter
❌ DALL-E 3 (no seed, but can save & reuse images)

RECOMMENDED COMBINATION:
- Stable Diffusion XL: Base components (reproducible)
- DALL-E 3: Custom requests, unique designs
- Leonardo.AI: Backup, specific cake styles

FALLBACK STRATEGY:
- Save every generated image to database
- If regeneration needed, return saved version
- Seed + saved image = perfect reproducibility
```

### Data Storage

```
Images:
- Cloud: AWS S3, Google Cloud Storage, or Azure Blob
- Metadata: Embedded in PNG/JPEG + database backup
- Versions: Keep all versions for 2 years

Database (Supabase):
- cake_designs (master record)
- cake_components (individual layers)
- cake_orders (customer orders)
- production_schedule (kitchen timeline)
- cost_tracking (financial data)
- staff_assignments (who does what)
- client_approvals (approval history)
```

---

## Part 8: Gallery & Reordering System

```typescript
interface CakeGallery {
  bakeryId: string;
  cakes: Array<{
    cakeId: string;
    name: string;
    imageUrl: string;
    rotationAsset: CakeRotationAsset;
    metadata: EmbeddedCakeMetadata;
    
    // Social proof
    popularity: number; // Order count
    reviews: Array<{ rating: number; comment: string }>;
    
    // Reorder ease
    reorderMetadata: {
      masterSeed: string;
      allComponentsSeeds: Record<string, string>;
      baselinePrice: number;
      averageCustomizationCost: number;
    };
  }>;
}

// Reorder existing cake with modifications
const reorderCakeWithChanges = async (
  originalCakeId: string,
  modifications: {
    colorChanges?: Record<string, string>;
    decorationChanges?: string[];
    sizeChange?: number; // Scale factor
    textChange?: string;
  }
) => {
  // Load original cake from gallery
  const original = await db.getCake(originalCakeId);
  
  // Regenerate with modifications
  const newCake = await regenerateComponentsWithModifications(
    original.metadata,
    modifications
  );
  
  // Create new order
  return newCake;
};
```

---

## Conclusion

This specification provides the **industrial standard** for digital cake design and bakery operations. It combines:

✅ Professional mathematics (serving calculations, structural geometry)
✅ Reproducible AI generation (component-based, seed-controlled)
✅ Embedded intelligence (metadata in every image)
✅ Beautiful user experience (3D rotation, chef interface, client approval)
✅ Operational excellence (costing, scheduling, staffing)
✅ Gallery & reordering (drive repeat business)

**This becomes the gold standard that other bakeries will adopt for decades to come.**

---

**Version 1.0 Release Date**: Today
**Industry Adoption Target**: Q2 2025
**Expected Impact**: Transform bakery industry operations globally

