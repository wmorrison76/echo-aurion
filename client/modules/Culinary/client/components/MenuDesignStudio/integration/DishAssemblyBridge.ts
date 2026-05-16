import type { DesignerElement } from "../hooks";

export interface DishData {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  components: string[];
  allergens: string[];
  image?: string;
  serverNotes?: string;
  popularity?: number;
  engineeringClass?: string;
}

export interface MenuLayoutConfig {
  layout: "grid" | "list" | "featured" | "multi-column";
  columns?: number;
  spacing: number;
  itemsPerRow?: number;
  featuredPosition?: "top" | "left" | "center";
}

/**
 * AI³ Layout Generator
 * Analyzes dishes and generates optimal menu layouts
 */
export class AI3LayoutGenerator {
  /**
   * Generate a complete menu design from a collection of dishes
   */
  static generateMenuDesignFromDishes(
    dishes: DishData[],
    config: MenuLayoutConfig = {
      layout: "grid",
      spacing: 24,
      columns: 2,
    }
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];
    const pageWidth = 1200;
    const pageHeight = 1600;
    let currentY = 60;

    // Add title
    elements.push({
      type: "heading",
      name: "Menu Title",
      text: "Our Menu",
      x: 40,
      y: currentY,
      width: pageWidth - 80,
      height: 80,
      fontSize: 48,
      fontWeight: 700,
      fontFamily: "'Georgia', serif",
      color: "#1a1a1a",
      align: "center",
      rotation: 0,
      opacity: 1,
      zIndex: 0,
    });

    currentY += 100;

    // Generate layout based on config
    if (config.layout === "grid" && config.columns) {
      elements.push(
        ...this.generateGridLayout(dishes, pageWidth, currentY, config.columns, config.spacing)
      );
    } else if (config.layout === "list") {
      elements.push(...this.generateListLayout(dishes, pageWidth, currentY, config.spacing));
    } else if (config.layout === "featured") {
      elements.push(
        ...this.generateFeaturedLayout(dishes, pageWidth, currentY, config.spacing)
      );
    } else if (config.layout === "multi-column") {
      elements.push(...this.generateMultiColumnLayout(dishes, pageWidth, currentY, config.spacing));
    }

    return elements;
  }

  /**
   * Generate grid-based layout for menu items
   */
  private static generateGridLayout(
    dishes: DishData[],
    pageWidth: number,
    startY: number,
    columns: number,
    spacing: number
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];
    const itemWidth = (pageWidth - 80 - spacing * (columns - 1)) / columns;
    const itemHeight = 180;

    dishes.forEach((dish, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 40 + col * (itemWidth + spacing);
      const y = startY + row * (itemHeight + spacing + 20);

      elements.push(
        ...this.createMenuItemCard(dish, x, y, itemWidth, itemHeight, index)
      );
    });

    return elements;
  }

  /**
   * Generate vertical list layout for menu items
   */
  private static generateListLayout(
    dishes: DishData[],
    pageWidth: number,
    startY: number,
    spacing: number
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];
    const itemWidth = pageWidth - 80;
    const itemHeight = 120;

    dishes.forEach((dish, index) => {
      const y = startY + index * (itemHeight + spacing);
      elements.push(...this.createMenuItemCard(dish, 40, y, itemWidth, itemHeight, index));
    });

    return elements;
  }

  /**
   * Generate featured layout with one large item and smaller supporting items
   */
  private static generateFeaturedLayout(
    dishes: DishData[],
    pageWidth: number,
    startY: number,
    spacing: number
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];

    // Featured item (first dish)
    if (dishes.length > 0) {
      const featuredWidth = pageWidth - 80;
      const featuredHeight = 240;
      elements.push(
        ...this.createMenuItemCard(dishes[0], 40, startY, featuredWidth, featuredHeight, 0, true)
      );
    }

    // Supporting items in 2-column grid
    const supportingDishes = dishes.slice(1);
    const gridStartY = startY + 240 + spacing + 20;
    const itemWidth = (pageWidth - 80 - spacing) / 2;
    const itemHeight = 160;

    supportingDishes.forEach((dish, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = 40 + col * (itemWidth + spacing);
      const y = gridStartY + row * (itemHeight + spacing + 20);

      elements.push(...this.createMenuItemCard(dish, x, y, itemWidth, itemHeight, index + 1));
    });

    return elements;
  }

  /**
   * Generate multi-column layout with sections
   */
  private static generateMultiColumnLayout(
    dishes: DishData[],
    pageWidth: number,
    startY: number,
    spacing: number
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];
    const columnWidth = (pageWidth - 80 - spacing) / 2;
    const itemHeight = 140;

    // Split dishes evenly between left and right columns
    const midpoint = Math.ceil(dishes.length / 2);
    const leftDishes = dishes.slice(0, midpoint);
    const rightDishes = dishes.slice(midpoint);

    // Left column
    leftDishes.forEach((dish, index) => {
      const y = startY + index * (itemHeight + spacing + 15);
      elements.push(...this.createMenuItemCard(dish, 40, y, columnWidth, itemHeight, index));
    });

    // Right column
    rightDishes.forEach((dish, index) => {
      const y = startY + index * (itemHeight + spacing + 15);
      elements.push(
        ...this.createMenuItemCard(
          dish,
          40 + columnWidth + spacing,
          y,
          columnWidth,
          itemHeight,
          midpoint + index
        )
      );
    });

    return elements;
  }

  /**
   * Create a complete menu item card with all elements
   */
  private static createMenuItemCard(
    dish: DishData,
    x: number,
    y: number,
    width: number,
    height: number,
    index: number,
    featured: boolean = false
  ): Omit<DesignerElement, "id">[] {
    const elements: Omit<DesignerElement, "id">[] = [];
    const padding = 16;

    // Background/border element
    elements.push({
      type: "shape",
      name: `Card Background ${index}`,
      shape: "rectangle",
      x,
      y,
      width,
      height,
      fill: "rgba(255, 255, 255, 0.7)",
      borderColor: "#d1d5db",
      borderWidth: 1,
      rotation: 0,
      opacity: 1,
      zIndex: index * 10,
    });

    // Image (if available)
    if (dish.image) {
      const imageHeight = featured ? height * 0.5 : height * 0.35;
      elements.push({
        type: "image",
        name: `${dish.name} Image`,
        imageUrl: dish.image,
        x: x + padding,
        y: y + padding,
        width: width - padding * 2,
        height: imageHeight,
        rotation: 0,
        opacity: 1,
        zIndex: index * 10 + 1,
      });
    }

    // Dish name
    const nameY = dish.image
      ? y + (featured ? height * 0.5 : height * 0.35) + padding * 2
      : y + padding;
    elements.push({
      type: "heading",
      name: `${dish.name} Title`,
      text: dish.name,
      x: x + padding,
      y: nameY,
      width: width - padding * 2,
      height: featured ? 60 : 45,
      fontSize: featured ? 28 : 18,
      fontWeight: 700,
      fontFamily: "'Georgia', serif",
      color: "#1a1a1a",
      align: "left",
      rotation: 0,
      opacity: 1,
      zIndex: index * 10 + 2,
    });

    // Description
    const descriptionY = nameY + (featured ? 65 : 50);
    elements.push({
      type: "body",
      name: `${dish.name} Description`,
      text: dish.description,
      x: x + padding,
      y: descriptionY,
      width: width - padding * 2,
      height: featured ? 90 : 60,
      fontSize: featured ? 14 : 12,
      fontWeight: 400,
      fontFamily: "'Inter', sans-serif",
      color: "#666666",
      align: "left",
      rotation: 0,
      opacity: 1,
      zIndex: index * 10 + 2,
    });

    // Price
    const priceY = height - padding - 30;
    elements.push({
      type: "menu-item",
      name: `${dish.name} Price`,
      text: `${dish.currency} ${dish.price.toFixed(2)}`,
      x: x + padding,
      y: y + priceY,
      width: width - padding * 2,
      height: 30,
      fontSize: featured ? 20 : 14,
      fontWeight: 700,
      fontFamily: "'Georgia', serif",
      color: "#1a1a1a",
      align: "right",
      price: dish.price,
      currency: dish.currency,
      rotation: 0,
      opacity: 1,
      zIndex: index * 10 + 3,
    });

    // Allergen indicators (if any)
    if (dish.allergens && dish.allergens.length > 0) {
      const allergenText = dish.allergens.join(", ");
      elements.push({
        type: "subheading",
        name: `${dish.name} Allergens`,
        text: `⚠ ${allergenText}`,
        x: x + padding,
        y: y + height - padding - 18,
        width: width - padding * 2,
        height: 16,
        fontSize: 10,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        color: "#dc2626",
        align: "left",
        rotation: 0,
        opacity: 0.9,
        zIndex: index * 10 + 3,
      });
    }

    // Popularity badge (if available)
    if (dish.popularity && dish.popularity > 0) {
      const popBadgeY = y + padding;
      const popBadgeX = x + width - padding - 80;
      elements.push({
        type: "shape",
        name: `${dish.name} Popularity Badge`,
        shape: "rectangle",
        x: popBadgeX,
        y: popBadgeY,
        width: 70,
        height: 28,
        fill: "#fef3c7",
        borderColor: "#fbbf24",
        borderWidth: 1,
        rotation: 0,
        opacity: 0.95,
        zIndex: index * 10 + 5,
      });

      elements.push({
        type: "subheading",
        name: `${dish.name} Popularity Text`,
        text: `${Math.round(dish.popularity)}% ⭐`,
        x: popBadgeX,
        y: popBadgeY + 4,
        width: 70,
        height: 20,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        color: "#92400e",
        align: "center",
        rotation: 0,
        opacity: 1,
        zIndex: index * 10 + 6,
      });
    }

    return elements;
  }

  /**
   * Generate color palette based on dishes and theme
   */
  static generateColorPalette(dishes: DishData[], theme: string = "elegant") {
    const palettes: Record<string, Record<string, string>> = {
      elegant: {
        primary: "#8B4513",
        secondary: "#D2691E",
        accent: "#FFD700",
        text: "#1a1a1a",
        background: "#FFFAF0",
      },
      modern: {
        primary: "#1F2937",
        secondary: "#6366F1",
        accent: "#EC4899",
        text: "#111827",
        background: "#F9FAFB",
      },
      vibrant: {
        primary: "#DC2626",
        secondary: "#EA580C",
        accent: "#EAAC39",
        text: "#1F2937",
        background: "#FEFEF9",
      },
      luxury: {
        primary: "#1a1a1a",
        secondary: "#FFD700",
        accent: "#C0C0C0",
        text: "#FFFFFF",
        background: "#0F0F0F",
      },
    };

    return palettes[theme] || palettes.elegant;
  }

  /**
   * Generate typography recommendations based on dishes
   */
  static generateTypography(dishes: DishData[], style: string = "classic") {
    const typographies: Record<string, Record<string, string>> = {
      classic: {
        heading: "Georgia, serif",
        body: "Inter, sans-serif",
        accent: "Playfair Display, serif",
      },
      modern: {
        heading: "Helvetica Neue, sans-serif",
        body: "Open Sans, sans-serif",
        accent: "Montserrat, sans-serif",
      },
      premium: {
        heading: "Bodoni Moda, serif",
        body: "Lato, sans-serif",
        accent: "Cormorant Garamond, serif",
      },
      contemporary: {
        heading: "Poppins, sans-serif",
        body: "Inter, sans-serif",
        accent: "Space Mono, monospace",
      },
    };

    return typographies[style] || typographies.classic;
  }
}

/**
 * Dish Assembly to Designer connector
 */
export const DishAssemblyBridge = {
  /**
   * Convert a dish to a designer element
   */
  convertDishToElement(dish: DishData, position: { x: number; y: number }): Omit<DesignerElement, "id">[] {
    return AI3LayoutGenerator.createMenuItemCard(
      dish,
      position.x,
      position.y,
      300,
      200,
      0
    );
  },

  /**
   * Generate a complete menu from multiple dishes
   */
  generateMenuFromDishes(
    dishes: DishData[],
    layoutStyle: "grid" | "list" | "featured" | "multi-column" = "grid"
  ): Omit<DesignerElement, "id">[] {
    return AI3LayoutGenerator.generateMenuDesignFromDishes(dishes, {
      layout: layoutStyle,
      spacing: 24,
      columns: layoutStyle === "grid" ? 2 : undefined,
    });
  },

  /**
   * Get color recommendations for dishes
   */
  getColorRecommendations(dishes: DishData[], theme?: string) {
    return AI3LayoutGenerator.generateColorPalette(dishes, theme);
  },

  /**
   * Get typography recommendations
   */
  getTypographyRecommendations(dishes: DishData[], style?: string) {
    return AI3LayoutGenerator.generateTypography(dishes, style);
  },
};

export default DishAssemblyBridge;
