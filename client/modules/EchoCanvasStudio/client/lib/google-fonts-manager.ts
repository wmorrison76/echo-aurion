/**
 * Google Fonts Manager
 * Loads and manages Google Fonts for the editor
 */

export interface GoogleFont {
  family: string;
  variants: string[];
  category: string;
}

const POPULAR_GOOGLE_FONTS: GoogleFont[] = [
  { family: "Arial", variants: ["400", "700"], category: "sans-serif" },
  { family: "Roboto", variants: ["400", "500", "700", "900"], category: "sans-serif" },
  { family: "Open Sans", variants: ["400", "600", "700"], category: "sans-serif" },
  { family: "Montserrat", variants: ["400", "700", "900"], category: "sans-serif" },
  { family: "Playfair Display", variants: ["400", "700"], category: "serif" },
  { family: "Lora", variants: ["400", "600", "700"], category: "serif" },
  { family: "Poppins", variants: ["400", "600", "700"], category: "sans-serif" },
  { family: "Inter", variants: ["400", "600", "700"], category: "sans-serif" },
  { family: "Raleway", variants: ["400", "700"], category: "sans-serif" },
  { family: "Merriweather", variants: ["400", "700"], category: "serif" },
  { family: "Dancing Script", variants: ["400", "700"], category: "cursive" },
  { family: "Pacifico", variants: ["400"], category: "cursive" },
];

class GoogleFontsManager {
  private loadedFonts: Set<string> = new Set();

  /**
   * Load a font from Google Fonts CDN
   */
  loadFont(fontFamily: string, weights: string[] = ["400", "700"]): Promise<void> {
    const fontKey = `${fontFamily}-${weights.join("-")}`;

    if (this.loadedFonts.has(fontKey)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        // Create link element for Google Fonts
        const link = document.createElement("link");
        const weightString = weights.join(";");
        link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${weightString}&display=swap`;
        link.rel = "stylesheet";

        link.onload = () => {
          this.loadedFonts.add(fontKey);
          // Update CSS custom property
          document.documentElement.style.setProperty(`--font-${fontFamily.replace(/ /g, "-")}`, fontFamily);
          resolve();
        };

        link.onerror = () => {
          reject(new Error(`Failed to load font: ${fontFamily}`));
        };

        document.head.appendChild(link);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get list of popular fonts
   */
  getPopularFonts(): GoogleFont[] {
    return POPULAR_GOOGLE_FONTS;
  }

  /**
   * Apply font to canvas context
   */
  getFontCSS(family: string, size: number, weight: string = "400"): string {
    return `${weight} ${size}px "${family}", sans-serif`;
  }

  /**
   * Preload multiple fonts at once
   */
  async preloadFonts(fonts: string[]): Promise<void> {
    try {
      await Promise.all(fonts.map((font) => this.loadFont(font)));
    } catch (error) {
      console.error("Error preloading fonts:", error);
    }
  }

  /**
   * Clear loaded fonts cache
   */
  clearCache(): void {
    this.loadedFonts.clear();
  }
}

// Export singleton instance
export const googleFontsManager = new GoogleFontsManager();

// Preload popular fonts on module load
if (typeof document !== "undefined") {
  googleFontsManager.preloadFonts([
    "Roboto",
    "Open Sans",
    "Montserrat",
    "Playfair Display",
    "Poppins",
  ]).catch(console.error);
}
