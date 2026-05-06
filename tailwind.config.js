/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // PLACEHOLDER — finalise brand colours before first store submission
        primary: {
          DEFAULT: '#6C47FF',
          50:  '#EDEAFF',
          100: '#D6D0FF',
          200: '#ADA0FF',
          300: '#8470FF',
          400: '#6C47FF',
          500: '#5535DB',
          600: '#3E25B7',
          700: '#2A1893',
          800: '#190E6F',
          900: '#0A064B',
        },
        accent: {
          DEFAULT: '#FF6B35',
          50:  '#FFF0EB',
          100: '#FFD8C8',
          200: '#FFB095',
          300: '#FF8C61',
          400: '#FF6B35',
          500: '#DB4E1F',
          600: '#B7340C',
          700: '#931E00',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error:   '#EF4444',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
