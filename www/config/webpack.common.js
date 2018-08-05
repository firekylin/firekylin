const tsImportPluginFactory = require('ts-import-plugin');
const helpers = require('./helpers');

const commonConfig = {
    entry: {
        admin: './www/static/src/app.tsx'
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
                        before: [ tsImportPluginFactory({
                            libraryName: 'antd',
                            libraryDirectory: 'lib',
                            style: true
                        }) ]
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
                    {loader: 'style-loader'},
                    {loader: 'css-loader'},
                    {loader: 'less-loader'}
                ]
            }
        ]
    },
    plugins: [
    ]
}

module.exports = commonConfig;
