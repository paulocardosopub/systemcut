import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: "#070a0d",
          900: "#0d1217",
          850: "#111820",
          800: "#17202a"
        },
        signal: {
          teal: "#24d6c5",
          amber: "#f5b84b",
          coral: "#ff6b5f"
        }
      },
      boxShadow: {
        glow: "0 0 40px rgba(36, 214, 197, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
