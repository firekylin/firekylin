const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const helpers = require('./helpers');

module.exports = webpackMerge(commonConfig, {
    mode: 'production',
    output: {
        path: helpers.root('dist'),
        filename: '[name].[chunkhash].js',
        chunkFilename: '[id].[chunkhash].chunk.js'
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                url: JSON.stringify('http://www.api.com/'),
                environment: JSON.stringify('prod')
            }
        })
    ]
});
