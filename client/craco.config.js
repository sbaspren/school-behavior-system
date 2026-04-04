module.exports = {
  webpack: {
    alias: {
      '@': require('path').resolve(__dirname, 'src'),
    },
  },
  style: {
    postcss: {
      plugins: [require('tailwindcss'), require('autoprefixer')],
    },
  },
};
