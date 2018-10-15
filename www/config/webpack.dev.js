const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');
const paths = require('./paths.js');

module.exports = webpackMerge(commonConfig, {

    mode: 'development',

    devtool: 'cheap-module-eval-source-map',

    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                }
            }
        },
        minimize: false
    },

    output: {
        path: paths.distSrc,
        filename: '[name].js',
        chunkFilename: '[name].js',
        publicPath: '../static/js/',
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                url: JSON.stringify('http://www.apitest.com/'),
                environment: JSON.stringify('dev'),
                basename: JSON.stringify('/admin'),
            },
        })
    ],

});
