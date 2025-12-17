import { type Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: ["{routes,islands,components}/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        ud: ['"Noto Sans JP"', "sans-serif"],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        // カスタムテーマ（アクセシビリティ重視）
        polimoney: {
          primary: "#0284c7", // sky-600
          "primary-content": "#ffffff",
          secondary: "#7c3aed", // violet-600
          "secondary-content": "#ffffff",
          accent: "#059669", // emerald-600
          "accent-content": "#ffffff",
          neutral: "#374151", // gray-700
          "neutral-content": "#ffffff",
          "base-100": "#ffffff",
          "base-200": "#f9fafb", // gray-50
          "base-300": "#f3f4f6", // gray-100
          "base-content": "#1f2937", // gray-800
          info: "#0ea5e9", // sky-500
          "info-content": "#ffffff",
          success: "#22c55e", // green-500
          "success-content": "#ffffff",
          warning: "#f59e0b", // amber-500
          "warning-content": "#000000",
          error: "#ef4444", // red-500
          "error-content": "#ffffff",
        },
      },
      "light",
      "dark",
    ],
    darkTheme: "dark",
    logs: false,
  },
} satisfies Config;
