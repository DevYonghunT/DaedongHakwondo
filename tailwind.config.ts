import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Pretendard",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      },
      zIndex: {
        base: "0",
        map: "10",
        docked: "20",
        overlay: "30",
        modal: "40",
        toast: "50"
      }
    }
  },
  plugins: []
};

export default config;
