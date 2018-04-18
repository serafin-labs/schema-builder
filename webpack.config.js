const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin')
const nodeExternals = require('webpack-node-externals');
const WebpackShellPlugin = require('webpack-shell-plugin');

// detect production/development mode
console.log(`Building for ${process.env.NODE_ENV}`);
const isProduction = process.env.NODE_ENV === "production"


var configuration = {
    entry: {
        index: "./src/index.ts",
        test: "./src/test/SchemaBuilderTests.ts"
    },
    target: "node",
    externals: [nodeExternals()],
    devtool: 'nosources-source-map',
    watch: !isProduction,
    watchOptions: {
        poll: 1000,
        ignored: /node_modules|lib/
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    optimization: {
        minimize: false
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: '[name].js',
        libraryTarget: 'commonjs',
        devtoolModuleFilenameTemplate: info => info.resourcePath.startsWith('./src') ? `.${info.resourcePath}` : info.absoluteResourcePath,
        path: path.resolve(__dirname, 'lib')
    },
    plugins: [
        new CleanWebpackPlugin(["lib/*.js", "lib/*.js.map", "lib/coverage/*"]),
        ...(isProduction ? [] : [new WebpackShellPlugin({ onBuildExit: ['npm test'] })])
    ]
};

module.exports = configuration
