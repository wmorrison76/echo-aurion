/** * Professional 3D Models Library * Procedural generation of dining furniture and fixtures */ import * as THREE from "three";
export interface ModelProps {
  scale?: number;
  color?: string;
  materialProps?: Partial<THREE.MeshStandardMaterialParameters>;
} // Create procedural wood texture
function createWoodTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!; // Wood grain background ctx.fillStyle = '#8B7355'; ctx.fillRect(0, 0, canvas.width, canvas.height); // Add grain lines for (let i = 0; i < 100; i++) { ctx.strokeStyle = `rgba(0, 0, 0, ${Math.random() * 0.3})`; ctx.lineWidth = Math.random() * 3; ctx.beginPath(); ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height); ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height); ctx.stroke(); } const texture = new THREE.CanvasTexture(canvas); texture.magFilter = THREE.LinearFilter; texture.minFilter = THREE.LinearMipmapLinearFilter; return texture;
} // Create metallic texture
function createMetallicTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(256, 256);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = Math.random() * 100 + 150;
    data[i] = noise;
    data[i + 1] = noise;
    data[i + 2] = noise;
    data[i + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.LinearFilter;
  return texture;
} // ============================================================================
// ROUND TABLE (8-Top Banquet)
// ============================================================================
export function createRoundTable(props: ModelProps = {}) {
  const { scale = 1, color = "#d4af87", materialProps = {} } = props;
  const group = new THREE.Group(); // Table top - warm wood finish with texture const topGeo = new THREE.CylinderGeometry(1.6 * scale, 1.6 * scale, 0.08 * scale, 64); const woodTexture = createWoodTexture(); const topMat = new THREE.MeshStandardMaterial({ map: woodTexture, color, roughness: 0.6, metalness: 0.05, ...materialProps, }); const top = new THREE.Mesh(topGeo, topMat); top.position.y = 0.9 * scale; top.castShadow = true; top.receiveShadow = true; group.add(top); // Pedestal - elegant tapered cylinder const pedestalGeo = new THREE.CylinderGeometry(0.12 * scale, 0.16 * scale, 0.85 * scale, 32); const metallicTexture = createMetallicTexture(); const pedestalMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#4a4a4a', roughness: 0.8, metalness: 0.1, }); const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat); pedestal.position.y = 0.42 * scale; pedestal.castShadow = true; group.add(pedestal); // Base ring const baseGeo = new THREE.CylinderGeometry(0.35 * scale, 0.35 * scale, 0.08 * scale, 48); const baseMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#2a2a2a', roughness: 0.9, metalness: 0, }); const base = new THREE.Mesh(baseGeo, baseMat); base.position.y = 0.04 * scale; base.receiveShadow = true; group.add(base); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// RECTANGULAR TABLE (6-Top, 8-Top, 10-Top)
// ============================================================================
export function createRectTable(props: ModelProps & { seats?: number } = {}) {
  const { scale = 1, color = "#d4af87", seats = 8, materialProps = {} } = props;
  const group = new THREE.Group(); // Determine dimensions based on seat count const width = seats === 6 ? 1.2 : seats === 10 ? 2.0 : 1.5; const depth = 0.8; // Table top with wood texture const topGeo = new THREE.BoxGeometry(width * scale, 0.08 * scale, depth * scale); const woodTexture = createWoodTexture(); const topMat = new THREE.MeshStandardMaterial({ map: woodTexture, color, roughness: 0.6, metalness: 0.05, ...materialProps, }); const top = new THREE.Mesh(topGeo, topMat); top.position.y = 0.9 * scale; top.castShadow = true; top.receiveShadow = true; group.add(top); // Legs - tapered design with metallic texture const legGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.85 * scale, 16); const metallicTexture = createMetallicTexture(); const legMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#4a4a4a', roughness: 0.8, metalness: 0.1, }); const legPositions = [ [-width / 2 + 0.2, 0.9 / 2, -depth / 2 + 0.15], [width / 2 - 0.2, 0.9 / 2, -depth / 2 + 0.15], [-width / 2 + 0.2, 0.9 / 2, depth / 2 - 0.15], [width / 2 - 0.2, 0.9 / 2, depth / 2 - 0.15], ]; legPositions.forEach((pos) => { const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale); leg.castShadow = true; group.add(leg); }); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// BUFFET / SERVING STATION
// ============================================================================
export function createBuffetStation(
  props: ModelProps & { length?: number } = {},
) {
  const {
    scale = 1,
    color = "#8e9aa9",
    length = 3,
    materialProps = {},
  } = props;
  const group = new THREE.Group(); // Main counter with texture const counterGeo = new THREE.BoxGeometry(length * scale, 0.9 * scale, 0.6 * scale); const metallicTexture = createMetallicTexture(); const counterMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color, roughness: 0.6, metalness: 0.15, ...materialProps, }); const counter = new THREE.Mesh(counterGeo, counterMat); counter.position.y = 0.45 * scale; counter.castShadow = true; counter.receiveShadow = true; group.add(counter); // Top shelf/warming surface - stainless steel appearance const shelfGeo = new THREE.BoxGeometry(length * scale, 0.08 * scale, 0.6 * scale); const shelfMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#a0a8b8', roughness: 0.5, metalness: 0.4, }); const shelf = new THREE.Mesh(shelfGeo, shelfMat); shelf.position.y = 0.9 * scale; shelf.castShadow = true; group.add(shelf); // Accent line - gold trim const accentGeo = new THREE.BoxGeometry(length * scale, 0.02 * scale, 0.6 * scale); const accentMat = new THREE.MeshStandardMaterial({ color: '#c0a060', metalness: 0.8, roughness: 0.2, emissive: '#c0a060', emissiveIntensity: 0.1, }); const accent = new THREE.Mesh(accentGeo, accentMat); accent.position.y = 0.93 * scale; group.add(accent); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// COCKTAIL TABLE (Bar Height)
// ============================================================================
export function createCocktailTable(props: ModelProps = {}) {
  const { scale = 1, color = "#2a2a2a", materialProps = {} } = props;
  const group = new THREE.Group(); // Top - small round with high gloss finish const topGeo = new THREE.CylinderGeometry(0.8 * scale, 0.8 * scale, 0.06 * scale, 48); const metallicTexture = createMetallicTexture(); const topMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#1a1a1a', roughness: 0.4, metalness: 0.5, ...materialProps, }); const top = new THREE.Mesh(topGeo, topMat); top.position.y = 1.1 * scale; top.castShadow = true; group.add(top); // Pedestal - sleek and modern const pedestalGeo = new THREE.CylinderGeometry(0.1 * scale, 0.12 * scale, 1.0 * scale, 24); const pedestalMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#3a3a3a', roughness: 0.7, metalness: 0.3, }); const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat); pedestal.position.y = 0.5 * scale; pedestal.castShadow = true; group.add(pedestal); // Base disc - premium appearance const baseGeo = new THREE.CylinderGeometry(0.3 * scale, 0.3 * scale, 0.08 * scale, 32); const baseMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#1a1a1a', roughness: 0.9, metalness: 0.2, }); const base = new THREE.Mesh(baseGeo, baseMat); base.position.y = 0.04 * scale; base.receiveShadow = true; group.add(base); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// BANQUET CHAIR
// ============================================================================
export function createBanquetChair(props: ModelProps = {}) {
  const { scale = 1, color = "#4a4a4a", materialProps = {} } = props;
  const group = new THREE.Group(); // Scale chair to be properly visible (multiply by 1.5) const chairScale = scale * 1.5; // Seat - larger and more visible const seatGeo = new THREE.BoxGeometry(0.5 * chairScale, 0.08 * chairScale, 0.5 * chairScale); const seatMat = new THREE.MeshStandardMaterial({ color: '#5a5a5a', roughness: 0.8, ...materialProps, }); const seat = new THREE.Mesh(seatGeo, seatMat); seat.position.y = 0.45 * chairScale; seat.castShadow = true; group.add(seat); // Backrest - with proper fabric appearance const backGeo = new THREE.BoxGeometry(0.5 * chairScale, 0.4 * chairScale, 0.08 * chairScale); const fabricTexture = createWoodTexture(); const backMat = new THREE.MeshStandardMaterial({ map: fabricTexture, color, roughness: 0.75, ...materialProps, }); const back = new THREE.Mesh(backGeo, backMat); back.position.set(0, 0.65 * chairScale, -0.25 * chairScale); back.rotation.z = 0.1; back.castShadow = true; group.add(back); // Legs - 4 cylindrical with metallic look const legGeo = new THREE.CylinderGeometry(0.04 * chairScale, 0.04 * chairScale, 0.45 * chairScale, 12); const metallicTexture = createMetallicTexture(); const legMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#3a3a3a', roughness: 0.9, metalness: 0.3, }); const legPositions = [ [-0.15, 0.225, -0.15], [0.15, 0.225, -0.15], [-0.15, 0.225, 0.15], [0.15, 0.225, 0.15], ]; legPositions.forEach((pos) => { const leg = new THREE.Mesh(legGeo, legMat); leg.position.set(pos[0] * chairScale, pos[1] * chairScale, pos[2] * chairScale); leg.castShadow = true; group.add(leg); }); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// PODIUM / LECTERN
// ============================================================================
export function createPodium(props: ModelProps = {}) {
  const { scale = 1, color = "#8b7355", materialProps = {} } = props;
  const group = new THREE.Group(); // Base const baseGeo = new THREE.BoxGeometry(0.8 * scale, 0.08 * scale, 0.6 * scale); const baseMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', }); const base = new THREE.Mesh(baseGeo, baseMat); base.receiveShadow = true; group.add(base); // Pedestal const pedestalGeo = new THREE.BoxGeometry(0.6 * scale, 0.9 * scale, 0.5 * scale); const pedestalMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05, ...materialProps, }); const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat); pedestal.position.y = 0.5 * scale; pedestal.castShadow = true; pedestal.receiveShadow = true; group.add(pedestal); // Top surface (reading area) const topGeo = new THREE.BoxGeometry(0.6 * scale, 0.08 * scale, 0.4 * scale); const topMat = new THREE.MeshStandardMaterial({ color: '#a0826d', roughness: 0.5, metalness: 0.1, }); const top = new THREE.Mesh(topGeo, topMat); top.position.y = 1.0 * scale; top.castShadow = true; group.add(top); // Back panel (for branding) const panelGeo = new THREE.BoxGeometry(0.6 * scale, 0.3 * scale, 0.04 * scale); const panelMat = new THREE.MeshStandardMaterial({ color: '#667eea', metalness: 0.1, }); const panel = new THREE.Mesh(panelGeo, panelMat); panel.position.set(0, 1.15 * scale, -0.28 * scale); panel.castShadow = true; group.add(panel); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// FLOOR DECAL / RUG
// ============================================================================
export function createFloorDecal(
  props: {
    width?: number;
    length?: number;
    color?: string;
    scale?: number;
  } = {},
) {
  const { width = 3, length = 4, color = "#e8d4c4", scale = 1 } = props;
  const group = new THREE.Group();
  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(width * scale, 0.01, length * scale),
    new THREE.MeshStandardMaterial({ color, roughness: 0.95, metalness: 0 }),
  );
  rug.position.y = 0.05;
  rug.receiveShadow = true;
  group.add(rug);
  return group;
} // ============================================================================
// LIGHTING FIXTURE
// ============================================================================
export function createChandelierLight(props: { scale?: number } = {}) {
  const { scale = 1 } = props;
  const group = new THREE.Group(); // Canopy const canopyGeo = new THREE.CylinderGeometry(0.2 * scale, 0.2 * scale, 0.08 * scale, 32); const canopyMat = new THREE.MeshStandardMaterial({ color: '#c0a060', metalness: 0.8, }); const canopy = new THREE.Mesh(canopyGeo, canopyMat); canopy.position.y = 0.04 * scale; group.add(canopy); // Chain const chainGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.4 * scale, 8); const chainMat = new THREE.MeshStandardMaterial({ color: '#808080', metalness: 0.6, }); const chain = new THREE.Mesh(chainGeo, chainMat); chain.position.y = -0.2 * scale; group.add(chain); // Bulb sphere const bulbGeo = new THREE.SphereGeometry(0.15 * scale, 16, 16); const bulbMat = new THREE.MeshStandardMaterial({ color: '#fff9e6', emissive: '#ffeb99', emissiveIntensity: 0.4, metalness: 0.1, }); const bulb = new THREE.Mesh(bulbGeo, bulbMat); bulb.position.y = -0.45 * scale; group.add(bulb); // Light source const light = new THREE.PointLight('#ffe699', 1, 15); light.position.y = -0.45 * scale; light.castShadow = true; group.add(light); return group;
} // ============================================================================
// DANCE FLOOR / STAGE PLATFORM
// ============================================================================
export function createDanceFloor(
  props: { width?: number; length?: number; scale?: number } = {},
) {
  const { width = 4, length = 4, scale = 1 } = props;
  const group = new THREE.Group(); // Main platform - reduced height to match table height const platformGeo = new THREE.BoxGeometry(width * scale, 0.05 * scale, length * scale); const metallicTexture = createMetallicTexture(); const platformMat = new THREE.MeshStandardMaterial({ map: metallicTexture, color: '#1a1a2e', metalness: 0.4, roughness: 0.3, }); const platform = new THREE.Mesh(platformGeo, platformMat); platform.position.y = 0.025 * scale; platform.castShadow = true; platform.receiveShadow = true; group.add(platform); // Edge accent lights - reduced intensity for (let i = 0; i < 12; i++) { const angle = (i / 12) * Math.PI * 2; const x = Math.cos(angle) * (width / 2 - 0.2) * scale; const z = Math.sin(angle) * (length / 2 - 0.2) * scale; const light = new THREE.PointLight('#ff1493', 0.5, 5); light.position.set(x, 0.15 * scale, z); light.castShadow = false; group.add(light); } group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// DECORATIVE PLANT (Large)
// ============================================================================
export function createPlantLarge(props: ModelProps = {}) {
  const { scale = 1, color = "#2d5016", materialProps = {} } = props;
  const group = new THREE.Group(); // Pot const potGeo = new THREE.CylinderGeometry(0.25 * scale, 0.3 * scale, 0.4 * scale, 32); const potMat = new THREE.MeshStandardMaterial({ color: '#8b7355', roughness: 0.7, metalness: 0, }); const pot = new THREE.Mesh(potGeo, potMat); pot.position.y = 0.2 * scale; pot.castShadow = true; group.add(pot); // Soil const soilGeo = new THREE.CylinderGeometry(0.23 * scale, 0.23 * scale, 0.1 * scale, 32); const soilMat = new THREE.MeshStandardMaterial({ color: '#654321', roughness: 0.9, }); const soil = new THREE.Mesh(soilGeo, soilMat); soil.position.y = 0.43 * scale; group.add(soil); // Plant foliage (sphere) const foliageGeo = new THREE.SphereGeometry(0.35 * scale, 16, 16); const foliageMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...materialProps, }); const foliage = new THREE.Mesh(foliageGeo, foliageMat); foliage.position.y = 0.7 * scale; foliage.castShadow = true; foliage.receiveShadow = true; group.add(foliage); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// DECORATIVE TREE
// ============================================================================
export function createDecorativeTree(props: ModelProps = {}) {
  const { scale = 1, color = "#1a3a1a", materialProps = {} } = props;
  const group = new THREE.Group(); // Trunk const trunkGeo = new THREE.CylinderGeometry(0.08 * scale, 0.12 * scale, 1.2 * scale, 16); const woodTexture = createWoodTexture(); const trunkMat = new THREE.MeshStandardMaterial({ map: woodTexture, color: '#5c3317', roughness: 0.8, }); const trunk = new THREE.Mesh(trunkGeo, trunkMat); trunk.position.y = 0.6 * scale; trunk.castShadow = true; group.add(trunk); // Multiple foliage spheres for fuller look const foliagePositions = [ [0, 1.3, 0], [-0.2, 1.0, 0.1], [0.2, 1.0, -0.1], [0, 0.9, 0], ]; foliagePositions.forEach((pos) => { const foliageGeo = new THREE.SphereGeometry(0.3 * scale, 16, 16); const foliageMat = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...materialProps, }); const foliage = new THREE.Mesh(foliageGeo, foliageMat); foliage.position.set(pos[0] * scale, pos[1] * scale, pos[2] * scale); foliage.castShadow = true; foliage.receiveShadow = true; group.add(foliage); }); group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// TABLE CENTERPIECE
// ============================================================================
export function createCenterpiece(props: ModelProps = {}) {
  const { scale = 1, color = "#d4416b", materialProps = {} } = props;
  const group = new THREE.Group(); // Vase const vaseGeo = new THREE.ConeGeometry(0.1 * scale, 0.2 * scale, 16); const vaseMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3, metalness: 0.2, }); const vase = new THREE.Mesh(vaseGeo, vaseMat); vase.position.y = 0.1 * scale; vase.castShadow = true; group.add(vase); // Flowers for (let i = 0; i < 5; i++) { const angle = (i / 5) * Math.PI * 2; const x = Math.cos(angle) * 0.06 * scale; const z = Math.sin(angle) * 0.06 * scale; const flowerGeo = new THREE.SphereGeometry(0.04 * scale, 8, 8); const flowerMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...materialProps, }); const flower = new THREE.Mesh(flowerGeo, flowerMat); flower.position.set(x, 0.15 * scale, z); flower.castShadow = true; group.add(flower); } group.castShadow = true; group.receiveShadow = true; return group;
} // ============================================================================
// UPLIGHTING (Decorative)
// ============================================================================
export function createUplighting(props: { scale?: number } = {}) {
  const { scale = 1 } = props;
  const group = new THREE.Group(); // Base const baseGeo = new THREE.CylinderGeometry(0.1 * scale, 0.1 * scale, 0.05 * scale, 16); const baseMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.8, roughness: 0.2, }); const base = new THREE.Mesh(baseGeo, baseMat); base.castShadow = true; group.add(base); // Pole const poleGeo = new THREE.CylinderGeometry(0.015 * scale, 0.015 * scale, 0.3 * scale, 8); const poleMat = new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.9, }); const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 0.15 * scale; group.add(pole); // Light dome const lightGeo = new THREE.SphereGeometry(0.08 * scale, 16, 16); const lightMat = new THREE.MeshStandardMaterial({ color: '#ff00ff', emissive: '#ff00ff', emissiveIntensity: 0.5, metalness: 0.2, }); const light = new THREE.Mesh(lightGeo, lightMat); light.position.y = 0.3 * scale; group.add(light); // Light source const pointLight = new THREE.PointLight('#ff00ff', 1, 10); pointLight.position.y = 0.3 * scale; pointLight.castShadow = true; group.add(pointLight); group.castShadow = true; group.receiveShadow = true; return group;
}
