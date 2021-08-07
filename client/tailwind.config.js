module.exports = {
  purge: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {
      minHeight: {
        '60': '15rem'
      }
    },
  },
  variants: {
    extend: {
      margin: ['first'],
      cursor: ['hover'],
    },
  },
  plugins: [],
}
