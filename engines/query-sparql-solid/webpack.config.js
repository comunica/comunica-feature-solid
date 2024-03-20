// Copied from: https://github.com/comunica/comunica/blob/master/packages/actor-init-sparql/webpack.config.js
const path = require('node:path');
const ProgressPlugin = require('webpack').ProgressPlugin;

module.exports = {
  entry: [ path.resolve(__dirname, 'lib/index-browser.js') ],
  output: {
    filename: 'comunica-browser.js',
    path: __dirname,
    libraryTarget: 'var',
    library: 'Comunica',
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.js$/u,
        loader: 'babel-loader',
        exclude: /node_modules/u,
      },
    ],
  },
  plugins: [
    new ProgressPlugin(),
  ],
};
