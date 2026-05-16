import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/**/*.{ts,tsx}", "./shared/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      cursor: {
        "nw-resize": "nw-resize",
        "ne-resize": "ne-resize",
        "sw-resize": "sw-resize",
        "se-resize": "se-resize",
        "n-resize": "n-resize",
        "s-resize": "s-resize",
        "e-resize": "e-resize",
        "w-resize": "w-resize",
        "ns-resize": "ns-resize",
        "ew-resize": "ew-resize",
        "nesw-resize": "nesw-resize",
        "nwse-resize": "nwse-resize",
      },
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        // iter210 · Audit FE-5 · Echo brand tokens (fed by WhiteLabelProvider).
        // Use `text-echo-primary`, `bg-echo-primary/10`, `border-echo-accent/30`, etc.
        echo: {
          primary: "var(--brand-primary, #c8a97e)",
          accent: "var(--brand-accent, #a855f7)",
          gold: "#c8a97e",
          amber: "#fbbf24",
          emerald: "#10b981",
          rose: "#f43f5e",
          slate: "#64748b",
        },
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      boxShadow: {
        neon: "0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 18px color-mix(in srgb, var(--primary) 35%, transparent), 0 0 40px color-mix(in srgb, var(--primary) 20%, transparent)",
      },
      backgroundImage: {
        "radial-fade":
          "radial-gradient(1200px 600px at 50% -20%, color-mix(in srgb, var(--primary) 20%, transparent), transparent 70%)",
      },
      zIndex: {
        "100": "100",
        "200": "200",
        "300": "300",
        "400": "400",
        "500": "500",
        "600": "600",
        "700": "700",
        "800": "800",
        "900": "900",
        "1000": "1000",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }: any) {
      addUtilities({
        ".scrollbar-hide": {
          "-ms-overflow-style": "none",
          "scrollbar-width": "none",
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      });
    },
  ],
} satisfies Config;
