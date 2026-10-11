/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aqi: {
          good: "#10b981",
          satisfactory: "#84cc16",
          moderate: "#eab308",
          poor: "#f97316",
          verypoor: "#ef4444",
          severe: "#881337"
        }
      }
    },
  },
  plugins: [],
}
