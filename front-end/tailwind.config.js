/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    colors:{
      primary: '#212751',
      primary_light: "#43a3c7",
      light: "#daedf4",
      white: '#ffffff',
      white_light:'#FAF9F6',
      background: '#F2F2F6',
      warning: '#FF3333',
      success: '#2E7D32',
      card: '#146EB4',
      cardSecondary: '#0E4F82',
      gray: '#CCCCCC',
      gray_light: '#F2F2F2',
      gray_dark: '#A9A9A9',
      gray_dark_light: '#E0E0E0',
      gray_darkest: '#B0B0B0',
      link: '#26A0F8',
      orange: '#FF7E54',
      amber: '#FFBF00',
      yellow: '#FFFF00'
    },
    fontSize: {
      xxs: '0.6rem',
      xs: '0.75rem',
      sm: '0.8rem',
      base: '1rem',
      xl: '1.25rem',
    '2xl': '1.563rem',
    '3xl': '1.953rem',
    '4xl': '2.441rem',
    '5xl': '3.052rem',
    }

  },
  plugins: [],

}
