export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Instrument Serif'", "serif"],
        body: ["'Barlow'", "sans-serif"],
      },
      colors: {
        'landing-bg': "hsl(var(--landing-bg))",
        'landing-fg': "hsl(var(--landing-fg))",
        'landing-primary': "hsl(var(--landing-primary))",
        'landing-primary-fg': "hsl(var(--landing-primary-fg))",
        'landing-border': "hsl(var(--landing-border))",
      },
      borderRadius: {
        lg: "var(--landing-radius)",
        md: "calc(var(--landing-radius) - 2px)",
        sm: "calc(var(--landing-radius) - 4px)",
      },
    },
  },
  plugins: [],
}
