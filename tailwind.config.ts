/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./context/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // iOS System Colors
        ios: {
          blue: "#007AFF",
          blueDark: "#0051D5",
          gray: "#8E8E93",
          grayLight: "#F2F2F7",
          grayDark: "#1C1C1E",
          green: "#34C759",
          red: "#FF3B30",
          orange: "#FF9500",
          purple: "#AF52DE",
          pink: "#FF2D55",
          teal: "#5AC8FA",
          indigo: "#5856D6",
        },
        primary: {
          DEFAULT: "#007AFF", // iOS Blue
          dark: "#0051D5",
          light: "#5AC8FA",
        },
      },
      borderRadius: {
        'ios': '20px',
        'ios-sm': '12px',
        'ios-lg': '28px',
      },
      boxShadow: {
        'ios': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'ios-lg': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'ios-button': '0 2px 8px rgba(0, 122, 255, 0.3)',
        'ios-lg-dark': '0 8px 32px rgba(0, 0, 0, 0.5), 0 2px 8px rgba(0, 122, 255, 0.1)',
        'ios-glow': '0 0 20px rgba(0, 122, 255, 0.3), 0 4px 16px rgba(0, 122, 255, 0.2)',
        'ios-glow-dark': '0 0 30px rgba(0, 122, 255, 0.4), 0 0 60px rgba(0, 122, 255, 0.15)',
      },
      backdropBlur: {
        'ios': '20px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'bubble': 'bubbleAppear 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-down': 'slideDown 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
