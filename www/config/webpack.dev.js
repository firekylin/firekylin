const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const commonConfig = require('./webpack.common.js');

module.exports = webpackMerge(commonConfig, {

    mode: 'development',

    devtool: 'cheap-module-eval-source-map',

    optimization: {
        minimize: false
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
