const path = require('path');
const webpack = require('webpack');

var base = path.join(__dirname, 'www/static');
module.exports = {
  devtool: 'source-map',
  entry: {
    admin: `${base}/src/admin/app.jsx`,
    vendor: [
      'md5',
      'react',
      'moment',
      'react-dom',
      'classnames',
      'react-router',
      'qrcode-react',
      'react-bootstrap',
      'react-bootstrap-validation'
    ]
  },
  output: {
    path: `${base}/js`,
    filename: '[name].js',
    publicPath: '/static/js/',
    chunkFilename: '[name].js'
  },
  resolve: {
    extensions: ['.js', '.jsx'],
    alias: {
      admin: `${base}/src/admin`,
      common: `${base}/src/common`,
      base: `${base}/src/common/component/base`
    }
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        loader: 'babel-loader',
        options: {
          cacheDirectory: true,
          presets: ['react', ['es2015', {loose: true, module: false}], 'stage-0'],
          plugins: ['transform-runtime', 'transform-decorators-legacy']
        },
        exclude: /node_modules/
      },
      {
        test: /\.css?$/,
        use: [
          'style-loader',
          'css-loader'
        ]
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({name: 'vendor', filename: 'common.js'})
  ]
};
