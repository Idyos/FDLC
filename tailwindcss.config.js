module.exports = {
    content: [
      "./src/**/*.{html,js,jsx,ts,tsx}", // O donde tengas tus archivos de tu proyecto
    ],
    theme: {
      extend: {
        backgroundImage: {
          'custom-gradient': 'linear-gradient(97deg, rgba(0, 0, 0, 0), #ffeb00 16%)',
        },
      },
    },
    plugins: [],
  }