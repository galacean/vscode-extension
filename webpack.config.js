const path = require('path');

const serverRoot = path.join(__dirname, 'server');
const clientRoot = path.join(__dirname, 'client');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const clientConfig = {
  context: clientRoot,
  mode: 'production',
  mode: 'none',
  target: 'node',
  entry: './src/main.ts',
  output: {
    filename: '[name].js',
    path: path.join(clientRoot, 'out'),
    libraryTarget: 'commonjs',
  },
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'],
    alias: {},
    fallback: {
      path: require.resolve('path-browserify'),
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  devtool: 'source-map',
};

/** @type WebpackConfig */
const serverConfig = {
  context: serverRoot,
  mode: 'none',
  target: 'node',
  entry: './src/main.ts',
  output: {
    path: path.resolve(serverRoot, 'out'),
    filename: 'main.js',
    libraryTarget: 'var',
    library: 'serverExportVar',
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
};

module.exports = [serverConfig, clientConfig];
