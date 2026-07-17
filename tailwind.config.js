/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tosca: {
          DEFAULT: '#7ECDC0',
          dark: '#5DB9AA',
          light: '#E8F6F3',
        },
        primary: '#2D3436',
        secondary: '#636E72',
        muted: '#B2BEC3',
        danger: '#FF6B6B',
        warning: '#FDCB6E',
        success: '#00B894',
      },
    },
  },
  plugins: [],
};
