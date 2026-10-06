import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    fontFamily: {
      sans: ["Archivo", "system-ui", "sans-serif"],
      display: ["Archivo", "system-ui", "sans-serif"],
    },
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        "atleita-ink": "#18231F",
        "atleita-green": "#214B3A",
        "atleita-citron": "#D7ED70",
        cyan: "#214B3A",
        "cyan-light": "#2F6B52",
        "blue-electric": "#214B3A",
        "purple-accent": "#214B3A",
        "navy-deep": "#18231F",
        "bg-dark": "#18231F",
        "surface-dark": "#1a2e26",
        success: "#22c55e",
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
        "glow-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "slide-up": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "counter": {
          from: {
            opacity: "0",
          },
          to: {
            opacity: "1",
          },
        },
        "featured-skeleton-shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.6s ease-out",
        "counter": "counter 0.3s ease-out",
        "featured-skeleton-shimmer":
          "featured-skeleton-shimmer 2s ease-in-out infinite",
      },
      backgroundImage: {
        "gradient-dark":
          "linear-gradient(180deg, hsl(var(--page-gradient-start)) 0%, hsl(var(--page-gradient-end)) 100%)",
        "gradient-cyan": "linear-gradient(135deg, #D7ED70 0%, #214B3A 100%)",
        "atleita-gradient": "linear-gradient(135deg, #D7ED70 0%, #214B3A 100%)",
      },
      boxShadow: {
        "glow-cyan": "0 0 30px rgba(33, 75, 58, 0.35)",
        "glow-cyan-lg": "0 0 60px rgba(33, 75, 58, 0.4)",
        "glow-atleita": "0 0 30px rgba(33, 75, 58, 0.35)",
        "glow-atleita-lg": "0 0 50px rgba(215, 237, 112, 0.35)",
        "glow-blue": "0 0 30px rgba(33, 75, 58, 0.3)",
        "glow-purple": "0 0 30px rgba(215, 237, 112, 0.25)",
        panel: "0 24px 60px rgba(24, 35, 31, 0.45)",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    plugin(({ addVariant }) => {
      addVariant("dark", [
        '[data-preview-theme="dark"] &',
        '&:is(.dark *):not(:is([data-preview-theme="light"] *))',
        "&.dark:not([data-preview-theme='light']):not(:is([data-preview-theme='light'] *))",
      ]);
    }),
  ],
} satisfies Config;
