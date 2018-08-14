const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const paths = require('./paths.js');

module.exports = webpackMerge(commonConfig, {
    mode: 'production',
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                }
            }
        },
        minimize: true
    },
    output: {
        path: paths.distSrc,
        filename: '[name].js',
        chunkFilename: 'vendor.chunk.js',
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                url: JSON.stringify('http://www.api.com/'),
                environment: JSON.stringify('prod'),
                basename: JSON.stringify('/admin'),
            }
        })
    ]
});
