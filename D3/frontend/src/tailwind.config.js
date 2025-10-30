module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx,html}"],
    theme: {
      extend: {
        fontFamily: {
          montserrat: ["Montserrat", "sans-serif"],
          goldman: ["Goldman", "sans-serif"],
          superfunky: ["SuperFunky", "cursive"],
        },
        colors: {
          merge: {
            black: "#000000",
            white: "#ffffff",
            indigo: "#7c7cc1",
            pink: "#ef95f4",
            lightblue: "#a8d8ff",
          },
        },
      },
    },
    plugins: [],
  };
  