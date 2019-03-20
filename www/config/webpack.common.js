const transformerFactory = require('ts-import-plugin')
const webpack = require('webpack');
const helpers = require('./helpers');
const paths = require('./paths.js');

const commonConfig = {
    entry: {
        admin: './www/static/src/App.tsx'
    },
    resolve: {
        extensions: ['*', '.ts', '.tsx', 'jsx', '.js', 'json'],
        alias: {
            '@ant-design/icons/lib/dist$': paths.iconsWorkaroundPath,
        },
    },
    output: {
        path: paths.distSrc,
        filename: '[name].js',
        chunkFilename: '[name].js',
        publicPath: '/static/js/',
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: [helpers.root('node_modules')],
                enforce: 'pre',
                loader: 'tslint-loader'
            },
            {
                test: /\.(js|jsx|mjs)$/,
                loader: require.resolve('babel-loader'),
                options: {
                  compact: true,
                },
            },
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader',
                options: {
                    // disable type checker
                    transpileOnly: true,
                    // ts import plugin
                    getCustomTransformers: () => ({
                        before: [
                            transformerFactory({ style: true }),
                            transformerFactory([
                                {
                                  libraryDirectory: '../_esm5/internal/operators',
                                  libraryName: 'rxjs/operators',
                                  camel2DashComponentName: false,
                                  transformToDefaultImport: false
                                },
                                {
                                  libraryDirectory: '../_esm5/internal/observable',
                                  libraryName: 'rxjs',
                                  camel2DashComponentName: false,
                                  transformToDefaultImport: false,
                                }
                            ]),
                            transformerFactory({
                                style: false,
                                libraryName: 'lodash',
                                libraryDirectory: null,
                                camel2DashComponentName: false
                            })
                        ]
                    }),
                    compilerOptions: {
                        module: 'es2015'
                    }
                },
                exclude: /node_modules/
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
                test: /\.less$/,
                use: [
                    { loader: 'style-loader' },
                    { loader: 'css-loader' },
                    { loader: 'less-loader', options: { javascriptEnabled: true } }
                ]
            }
        ]
    },
    optimization: {
        splitChunks: {
            name: true,
            minSize: 200000,
            cacheGroups: {
                common: {
                    name: 'common',
                    chunks: 'async',
                    minChunks: 2,
                    priority: 30,
                },
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendor',
                    chunks: 'initial',
                    minSize: 0,
                    minChunks: 1,
                    priority: 20,
                },
                appearance: {
                    name: 'appearance',
                    minChunks: 1,
                    chunks: 'async',
                    priority: 0,
                },
                app: {
                    name: 'app',
                    minChunks: 1,
                    chunks: (chunk => {
                        return chunk.name !== 'appearance' && chunk.name !== 'admin';
                    }),
                    priority: 10,
                }
            }
        }
    },
    plugins: [
        new webpack.ContextReplacementPlugin(
            // eslint-disable-next-line no-useless-escape
            /moment[\\\/]locale$/,
            /^\.\/(zh-cn)$/
        ),
    ]
}

module.exports = commonConfig;
