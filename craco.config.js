const webpack = require('webpack');
const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Handling source maps
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      // Add resolve extensions
      webpackConfig.resolve.extensions = [...webpackConfig.resolve.extensions, '.ts', '.js'];
      
      // Update module rules for ESM
      webpackConfig.module.rules.push({
        test: /\.m?js$/,
        resolve: {
          fullySpecified: false,
        },
      });

      // Add specific resolution for raydium-sdk
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        '@raydium-io/raydium-sdk': path.resolve(__dirname, 'node_modules/@raydium-io/raydium-sdk/lib/esm/index.js'),
      };

      // Fallbacks for node modules
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "assert": require.resolve("assert/"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "os": require.resolve("os-browserify/browser"),
        "url": require.resolve("url/"),
        "buffer": require.resolve("buffer/"),
        "zlib": require.resolve("browserify-zlib"),
        "path": require.resolve("path-browserify"),
        "process": require.resolve("process/browser"),
      };

      // Resolve modules
      webpackConfig.resolve.modules = [
        ...(webpackConfig.resolve.modules || []),
        "node_modules"
      ];

      // Add plugins
      webpackConfig.plugins = [
        ...webpackConfig.plugins,
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
          process: 'process/browser',
        }),
        new webpack.DefinePlugin({
          'process.env': JSON.stringify({}),
          'process.browser': true,
          'process.version': JSON.stringify(process.version),
        }),
      ];

      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      "@babel/plugin-proposal-class-properties",
      "@babel/plugin-proposal-private-methods",
      "@babel/plugin-proposal-private-property-in-object",
    ],
  },
};