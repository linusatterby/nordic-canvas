import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          muted: "hsl(var(--c-primary-muted))",
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
        // Semantic colors
        verified: {
          DEFAULT: "hsl(var(--verified))",
          foreground: "hsl(var(--verified-foreground))",
          muted: "hsl(var(--verified-muted))",
        },
        delight: {
          DEFAULT: "hsl(var(--delight))",
          foreground: "hsl(var(--delight-foreground))",
          muted: "hsl(var(--delight-muted))",
        },
        warn: {
          DEFAULT: "hsl(var(--warn))",
          foreground: "hsl(var(--warn-foreground))",
          muted: "hsl(var(--warn-muted))",
        },
        busy: {
          DEFAULT: "hsl(var(--busy))",
          foreground: "hsl(var(--busy-foreground))",
          muted: "hsl(var(--busy-muted))",
        },
        ink: "hsl(var(--ink))",
        frost: "hsl(var(--frost))",
        warm: {
          1: "hsl(var(--warm-1))",
          2: "hsl(var(--warm-2))",
          accent: "hsl(var(--accent-warm))",
          "accent-muted": "hsl(var(--accent-warm-muted))",
          muted: "hsl(var(--muted-warm))",
        },
        slate: {
          DEFAULT: "hsl(var(--slate))",
          dark: "hsl(var(--c-slate-dark))",
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
      },
      borderRadius: {
        xs: "var(--r-xs)",
        sm: "var(--r-sm)",
        md: "var(--r-md)",
        lg: "var(--r-card)",
        xl: "var(--r-lg)",
        "2xl": "var(--r-modal)",
        pill: "var(--r-pill)",
        input: "var(--r-input)",
      },
      boxShadow: {
        soft: "var(--sh-soft)",
        card: "var(--sh-card)",
        lift: "var(--sh-lift)",
        modal: "var(--sh-modal)",
        hover: "var(--sh-hover)",
      },
      spacing: {
        "sp-1": "var(--sp-1)",
        "sp-2": "var(--sp-2)",
        "sp-3": "var(--sp-3)",
        "sp-4": "var(--sp-4)",
        "sp-6": "var(--sp-6)",
        "sp-8": "var(--sp-8)",
        "sp-12": "var(--sp-12)",
        "sp-16": "var(--sp-16)",
      },
      transitionDuration: {
        fast: "var(--t-fast)",
        base: "var(--t-base)",
        slow: "var(--t-slow)",
      },
      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s var(--ease-out)",
        "scale-in": "scale-in 0.2s var(--ease-out)",
        "slide-up": "slide-up 0.4s var(--ease-out)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
