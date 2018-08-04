const path = require('path');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const commonConfig = require('./webpack.common.js');
const helpers = require('./helpers');
const paths = require('./paths.js');

if (process.env.NODE_ENV === 'analyzer') {
    commonConfig.plugins.push(
        new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            analyzerHost: '127.0.0.1',
            analyzerPort: 8888,
            reportFilename: 'report.html',
            defaultSizes: 'parsed',
            openAnalyzer: true,
            generateStatsFile: false,
            statsFilename: 'stats.json',
            statsOptions: null,
            logLevel: 'info'
        })
    )
}

module.exports = webpackMerge(commonConfig, {

    mode: 'development',

    devtool: 'cheap-module-eval-source-map',

    output: {
        path: helpers.root('static/js/'),
        filename: '[name].js',
        chunkFilename: '[id].chunk.js',
        publicPath: helpers.root('static/js/'),
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                url: JSON.stringify('http://www.apitest.com/'),
                environment: JSON.stringify('dev')
            }
        })
    ],

});
