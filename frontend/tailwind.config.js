// (chemin : /frontend/tailwind.config.js)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          // fond général sombre
          bg: "#111111",
          // cartes / panneaux
          card: "#181818",
          // rouge principal (triangle)
          accent: "#c00000",
          // rouge plus sombre
          accentDark: "#401a1a",
          // texte clair
          text: "#f9fafb",
        },
      },
    },
  },
  plugins: [],
};
