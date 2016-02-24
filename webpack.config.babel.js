import path from 'path';

var base = path.join(__dirname, 'www/static');
export default {
  devtool: 'inline-source-map',
  entry: {
    admin: `${base}/src/admin/app.jsx`
  },
  output: {
    path: `${base}/dist`,
    filename: '[name].bundle.js'
  },
  resolve: {
    extensions: ['', '.js', '.jsx'],
    alias: {}
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
      }
    ]
  }
};
