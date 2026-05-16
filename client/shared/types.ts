export interface CakeLayer {
  id: string;
  name: string;
  type: "tier" | "frosting" | "filling" | "fondant" | "decoration";
  imageUrl?: string;
  textureUrl?: string;
  approved?: boolean;
  visible: boolean;
  opacity: number;
  blendMode?: string;
  order: number;
}

export interface CakeDesign {
  id: string;
  name: string;
  layers: CakeLayer[];
  tiers: number;
  shape: "round" | "square" | "sheet" | "heart" | "hexagon";
  created_at: string;
  updated_at: string;
}
