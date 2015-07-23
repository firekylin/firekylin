import webpack from 'webpack';
import minimist from 'minimist';

const argv = minimist(process.argv.slice(2));
const DEBUG = !argv.release;

const config = {
	entry: {
		admin: './www/static/src/admin/app.jsx',
		web: './www/static/src/web/app.jsx'
	},
	output: {
		path: `${__dirname}/www/static/dist/`,
		filename: '[name].bundle.js'
	},
	resolve: {
		extensions: ['', '.js', '.jsx'],
		alias: {
		}
	},
	module: {
		loaders: [
			{ test: /\.jsx?$/, loader: 'babel?stage=0', exclude: /node_modules/ }
		]
	},
	plugins: [],
	devtool: DEBUG ? 'source-map' : false,
	plugin: DEBUG ? [] : [new webpack.optimize.UglifyJsPlugin()],
	cache: DEBUG
};

export default config;