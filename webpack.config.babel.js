import path from 'path';

var base = path.join(__dirname, 'www/static');
export default {
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
        query: {
          presets: ['react', 'es2015-loose', 'stage-1'],
          plugins: ['transform-runtime']
        },
        exclude: /node_modules/
      }
    ]
  }
};
