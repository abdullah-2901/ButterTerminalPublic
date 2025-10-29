module.exports = {
    module: {
      rules: [
        {
          test: /\.m?js$/,
          enforce: "pre",
          use: ["source-map-loader"],
          exclude: [
            /node_modules\/superstruct/, // Exclude the problematic module
            /node_modules\/@reown/,      // Exclude all @reown packages
          ],
        },
      ],
    },
    resolve: {
      fallback: {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "zlib": require.resolve("browserify-zlib"),
        "process": require.resolve("process/browser"),
      },
    },
    plugins: [
      new webpack.ProvidePlugin({
        process: "process/browser",
        Buffer: ["buffer", "Buffer"],
      }),
    ],
  };
  