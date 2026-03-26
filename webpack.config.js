const path = require('path');

const serverRoot = path.join(__dirname, 'server');
const clientRoot = path.join(__dirname, 'client');
const tsconfigPath = path.join(__dirname, 'tsconfig.json');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const createTsRule = () => ({
  test: /\.ts$/,
  exclude: /node_modules/,
  use: [
    {
      loader: 'ts-loader',
      options: {
        configFile: tsconfigPath,
      },
    },
  ],
});

const createCommonConfig = (context, entry, output) => ({
  context,
  mode: 'none',
  target: 'node',
  entry,
  output,
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [createTsRule()],
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  devtool: 'source-map',
});

/** @type WebpackConfig */
const clientConfig = createCommonConfig(clientRoot, './src/main.ts', {
  filename: 'main.js',
  path: path.join(clientRoot, 'out'),
  libraryTarget: 'commonjs2',
});

/** @type WebpackConfig */
const serverConfig = createCommonConfig(serverRoot, './src/main.ts', {
  path: path.resolve(serverRoot, 'out'),
  filename: 'main.js',
  libraryTarget: 'commonjs2',
});

module.exports = [serverConfig, clientConfig];
