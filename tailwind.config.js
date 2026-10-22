module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './lib/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F5F5F5',
          elevated: '#FFFFFF',
          inverse: '#111111',
        },
        ink: {
          DEFAULT: '#171717',
          secondary: '#525252',
          tertiary: '#737373',
          inverse: '#FAFAFA',
        },
        line: {
          DEFAULT: '#E5E5E5',
          strong: '#D4D4D4',
        },
      },
      fontFamily: {
        sans: ['Geist_400Regular'],
        medium: ['Geist_500Medium'],
        semibold: ['Geist_600SemiBold'],
        bold: ['Geist_700Bold'],
      },
    },
  },
  plugins: [],
}
