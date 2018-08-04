// import { appSrc } from './paths';
const HtmlWebpackPlugin = require('html-webpack-plugin');
const helpers = require('./helpers');
const paths = require('./paths');

const commonConfig = {
    entry: {
        admin: './www/static/src/index.tsx',
        vendor: [
            // 'md5',
            'react',
            // 'moment',
            'react-dom',
            'classnames',
            'react-router',
            // 'qrcode-react',
        ]
    },
    optimization: {
        splitChunks: {
            cacheGroups: {
                commons: {
                    test: /[\\/]node_modules[\\/]/,
                    chunks: 'all',
                    name: 'vendor'
                }
            }
        },
        minimize: true
    },
    resolve: {
        extensions: ['*', '.ts', '.tsx', 'jsx', '.js', 'json']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [helpers.root('node_modules'), helpers.root('src', 'main.ts')],
                enforce: 'pre',
                loader: 'tslint-loader'
            },
            {
                test: /\.(js|jsx|mjs)$/,
                // include: paths.appSrc,
                loader: require.resolve('babel-loader'),
                options: {
                  
                  compact: true,
                },
            },
            // Compile .tsx?
            {
                test: /\.(ts|tsx)$/,
                // include: paths.appSrc,
                use: [
                    {
                        loader: require.resolve('ts-loader'),
                        options: {
                        // disable type checker
                        transpileOnly: true,
                        },
                    },
                ],
            },
            {
                test: /\.(png|jpe?g|gif|svg|woff|woff2|ttf|eot|ico)$/,
                loader: 'file-loader?name=assets/[name].[hash].[ext]'
            },
            {
                test: [/\.bmp$/, /\.gif$/, /\.jpe?g$/, /\.png$/],
                loader: require.resolve('url-loader'),
                options: {
                    limit: 10000,
                    name: 'assets/[name].[hash:8].[ext]',
                },
            },
            {
                test: /\.css$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' }
                ]
            },
            {
                test: /\.(scss|sass)$/,
                exclude: helpers.root('node_modules'),
                loader: 'raw-loader!sass-loader'
            },
        ]
    },
    plugins: [
    ]
}

module.exports = commonConfig;
