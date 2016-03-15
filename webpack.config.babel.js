import path from 'path';
import webpack from 'webpack';

var base = path.join(__dirname, 'www/static');
export default {
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
    filename: '[name].bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {
      admin: `${base}/src/admin`,
      common: `${base}/src/common`,
      base: `${base}/src/common/component/base`
    }
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        loader: 'babel',
        cacheDirectory: true,
        query: {
          presets: ['react', 'es2015-loose', 'stage-0'],
          plugins: ['transform-runtime', 'transform-decorators-legacy']
        },
        exclude: /node_modules/
      },
      {
        test: /\.css?$/,
        loader: 'style!css'
      }
    ]
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin({name: 'vendor', filename: 'common.js'}),
    new webpack.optimize.UglifyJsPlugin({compress: {warnings: false}})
  ]
};
